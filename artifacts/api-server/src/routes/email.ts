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
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;
    const user = (await res.json()) as { id: string };
    return user;
  } catch {
    return null;
  }
}

/**
 * POST /api/send-email
 *
 * Sends a transactional email via Resend.
 * Requires a valid Supabase session JWT in the Authorization header.
 * The recipient is derived server-side from the authenticated user's
 * profile — callers cannot specify arbitrary recipients, preventing
 * open-relay abuse.
 *
 * Body: { subject: string; html: string }
 */
router.post("/send-email", async (req: Request, res: Response) => {
  // Require a valid Supabase session
  const authUser = await getAuthUser(req);
  if (!authUser) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  const { subject, html } = req.body as {
    subject?: string;
    html?: string;
  };

  if (!subject || !html) {
    res.status(400).json({ success: false, error: "Missing subject or html" });
    return;
  }

  // Resolve the recipient from the authenticated user's own profile
  let to: string | null = null;
  try {
    const profileRes = await fetch(
      `${SB_URL}/rest/v1/user_profiles?id=eq.${authUser.id}&select=email`,
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
    res.status(400).json({ success: false, error: "No email address on file for this account" });
    return;
  }

  const apiKey = process.env.VITE_RESEND_API_KEY;
  if (!apiKey) {
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
    console.log("[email] Resend response:", JSON.stringify(resendResult));
  } catch (err) {
    console.error("[email] Resend fetch error:", err);
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

export default router;
