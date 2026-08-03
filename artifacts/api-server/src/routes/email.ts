import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

const SB_URL = "https://vnrvwfialfvduvetoewa.supabase.co";
const SB_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZucnZ3ZmlhbGZ2ZHV2ZXRvZXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NTUzMjYsImV4cCI6MjA5ODMzMTMyNn0.5mfElVG_tuhBLLP4BKdQ7v5zXLIi51LpMbZUmKZ8A9w";

const FROM = "PieceJobs ZA <notifications@piecejobsza.co.za>";

/**
 * Verify the Supabase JWT sent in the Authorization header.
 * Returns the user row on success, or null if unauthenticated/invalid.
 */
async function getAuthUser(req: Request): Promise<{ id: string; role?: string } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const res = await fetch(`${SB_URL}/auth/v1/user`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const user = (await res.json()) as { id: string };
    return user;
  } catch {
    return null;
  }
}

// ─── POST /api/send-email ─────────────────────────────────────────────────────

router.post("/send-email", async (req: Request, res: Response) => {
  const { to, subject, html } = req.body as {
    to?: string;
    subject?: string;
    html?: string;
  };

  if (!to || !subject || !html) {
    res.status(400).json({ success: false, error: "Missing to, subject, or html" });
    return;
  }

  const apiKey = process.env.VITE_RESEND_API_KEY;
  if (!apiKey) {
    console.error("[email] VITE_RESEND_API_KEY not set");
    res.status(500).json({ success: false, error: "Email service not configured" });
    return;
  }

  let sentOk = false;
  let resendResult: unknown;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    });
    resendResult = await response.json();
    sentOk = response.ok;
    console.log("[email] Resend response:", response.status, JSON.stringify(resendResult));
  } catch (err) {
    console.error("[email] Resend fetch error:", err);
    res.status(500).json({ success: false, error: String(err) });
    return;
  }

  // Log to email_notifications table (best-effort)
  try {
    await fetch(`${SB_URL}/rest/v1/email_notifications`, {
      method: "POST",
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${SB_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        to_email: to,
        subject,
        body: html,
        status: sentOk ? "sent" : "failed",
      }),
    });
  } catch (err) {
    console.error("[email] email_notifications log error:", err);
  }

  res.json({ success: sentOk, result: resendResult });
});

// ─── POST /api/send-sms ───────────────────────────────────────────────────────

router.post("/send-sms", async (req: Request, res: Response) => {
  const { phone, message } = req.body as { phone?: string; message?: string };

  if (!phone || !message) {
    res.status(400).json({ success: false, error: "Missing phone or message" });
    return;
  }

  const tokenId = process.env.VITE_BULKSMS_TOKEN_ID;
  const tokenSecret = process.env.VITE_BULKSMS_TOKEN_SECRET;
  if (!tokenId || !tokenSecret) {
    console.error("[sms] VITE_BULKSMS_TOKEN_ID or VITE_BULKSMS_TOKEN_SECRET not set");
    res.status(500).json({ success: false, error: "SMS service not configured" });
    return;
  }

  const formatted = phone.replace(/\s/g, "").replace(/^0/, "+27");
  const basicAuth = Buffer.from(`${tokenId}:${tokenSecret}`).toString("base64");

  try {
    const response = await fetch("https://api.bulksms.com/v1/messages", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{ to: formatted, body: message }]),
    });
    const result = await response.json();
    console.log("[sms] BulkSMS response:", response.status, JSON.stringify(result));
    res.json({ success: response.status === 201, result });
  } catch (err) {
    console.error("[sms] BulkSMS fetch error:", err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ─── POST /api/admin/send-email ───────────────────────────────────────────────

router.post("/admin/send-email", async (req: Request, res: Response) => {
  // 1. Authenticate the admin caller
  const adminUser = await getAuthUser(req);
  if (!adminUser) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  // 2. Verify the caller has the super_admin role
  let callerRole: string | null = null;
  try {
    const profileRes = await fetch(
      `${SB_URL}/rest/v1/user_profiles?id=eq.${adminUser.id}&select=role`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
    );
    if (profileRes.ok) {
      const [row] = (await profileRes.json()) as { role?: string }[];
      callerRole = row?.role ?? null;
    }
  } catch {
    // fall through — role stays null → 403 below
  }

  if (callerRole !== "super_admin") {
    res.status(403).json({ success: false, error: "Forbidden: super_admin only" });
    return;
  }

  const { targetUserId, subject, html } = req.body as {
    targetUserId?: string;
    subject?: string;
    html?: string;
  };

  if (!targetUserId || !subject || !html) {
    res.status(400).json({ success: false, error: "Missing targetUserId, subject, or html" });
    return;
  }

  // 3. Resolve the target worker's email server-side
  let to: string | null = null;
  try {
    const profileRes = await fetch(
      `${SB_URL}/rest/v1/user_profiles?id=eq.${targetUserId}&select=email`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
    );
    if (profileRes.ok) {
      const [row] = (await profileRes.json()) as { email?: string }[];
      to = row?.email ?? null;
    }
  } catch {
    // fall through
  }

  if (!to) {
    res.status(400).json({ success: false, error: "No email address on file for target user" });
    return;
  }

  const apiKey = process.env.VITE_RESEND_API_KEY;
  if (!apiKey) {
    res.status(500).json({ success: false, error: "Email service not configured" });
    return;
  }

  // 4. Send via Resend
  let sentOk = false;
  let resendResult: unknown;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    });
    resendResult = await response.json();
    sentOk = response.ok;
    console.log("[admin-email] Resend response:", JSON.stringify(resendResult));
  } catch (err) {
    console.error("[admin-email] Resend fetch error:", err);
  }

  // 5. Log to email_notifications (best-effort)
  try {
    await fetch(`${SB_URL}/rest/v1/email_notifications`, {
      method: "POST",
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${SB_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        to_email: to,
        subject,
        body: html,
        status: sentOk ? "sent" : "failed",
      }),
    });
  } catch (err) {
    console.error("[admin-email] email_notifications log error:", err);
  }

  res.json({ success: sentOk, result: resendResult });
});

export default router;
