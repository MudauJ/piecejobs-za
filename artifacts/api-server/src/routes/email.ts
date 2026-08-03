import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

const SB_URL = "https://vnrvwfialfvduvetoewa.supabase.co";
const SB_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZucnZ3ZmlhbGZ2ZHV2ZXRvZXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NTUzMjYsImV4cCI6MjA5ODMzMTMyNn0.5mfElVG_tuhBLLP4BKdQ7v5zXLIi51LpMbZUmKZ8A9w";

const FROM = "PieceJobs ZA <notifications@piecejobsza.co.za>";

/**
 * POST /api/send-email
 *
 * Sends a transactional email via Resend.
 * Body: { to: string; subject: string; html: string }
 */
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

export default router;
