/**
 * Email notification helpers — proxied through the PieceJobs API server.
 * All functions are fire-and-forget (they log errors but never throw).
 *
 * The API server at /api/send-email handles the Resend call server-side
 * to avoid browser CORS restrictions.
 */

const SB_URL = "https://vnrvwfialfvduvetoewa.supabase.co";
const SB_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZucnZ3ZmlhbGZ2ZHV2ZXRvZXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NTUzMjYsImV4cCI6MjA5ODMzMTMyNn0.5mfElVG_tuhBLLP4BKdQ7v5zXLIi51LpMbZUmKZ8A9w";

const EMAIL_ENDPOINT = "https://piece-jobs-za.replit.app/api/send-email";

function sbHeaders(extra?: Record<string, string>) {
  return {
    apikey: SB_KEY,
    Authorization: `Bearer ${SB_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

/** Fetch the email address for a Supabase auth user from the user_profiles table. */
async function getProfileEmail(userId: string): Promise<string | null> {
  try {
    const r = await fetch(
      `${SB_URL}/rest/v1/user_profiles?id=eq.${userId}&select=email`,
      { headers: sbHeaders() }
    );
    if (!r.ok) return null;
    const [row] = (await r.json()) as { email?: string }[];
    return row?.email ?? null;
  } catch {
    return null;
  }
}

/** Branded email wrapper applied to every outgoing message. */
function wrapHtml(body: string): string {
  return `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: #1B2E4B; padding: 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">📍 PieceJobs ZA</h1>
      <p style="color: #F5A623; margin: 5px 0 0 0; font-size: 14px;">Local work, done by local people</p>
    </div>
    <div style="padding: 30px; background: #ffffff;">${body}</div>
    <div style="background: #1B2E4B; padding: 15px; text-align: center;">
      <p style="color: rgba(255,255,255,0.6); margin: 0; font-size: 12px;">© 2026 PieceJobs ZA | <a href="https://piecejobsza.co.za" style="color: #F5A623;">piecejobsza.co.za</a></p>
    </div>
  </div>`;
}

/**
 * Core send function — POSTs to the API server which calls Resend server-side.
 */
const sendEmail = async (to: string, subject: string, htmlBody: string): Promise<boolean> => {
  try {
    console.log("Sending email to:", to, "subject:", subject);
    const response = await fetch("https://piece-jobs-za.replit.app/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, html: htmlBody }),
    });
    const result = await response.json();
    console.log("Email result:", result);
    return result.success;
  } catch (error) {
    console.error("[notify] email send error:", error);
    return false;
  }
};

// ─── Event 1: Worker applies → email homeowner ───────────────────────────────

export async function notifyHomeownerNewApplication(opts: {
  homeownerUserId: string;
  homeownerName: string;
  workerName: string;
  jobTitle: string;
}) {
  const email = await getProfileEmail(opts.homeownerUserId);
  if (!email) return;
  await sendEmail(
    email,
    `New application for: ${opts.jobTitle}`,
    `<h2>Hi ${opts.homeownerName}!</h2>
     <p><strong>${opts.workerName}</strong> has applied for your job <strong>'${opts.jobTitle}'</strong>.</p>
     <p>Log in to review their application and accept or decline.</p>
     <a href="https://piecejobsza.co.za/#/dashboard" style="background:#2D7DD2;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:10px;">View Application</a>`
  );
}

// ─── Event 2: Application accepted → email worker ────────────────────────────

export async function notifyWorkerAccepted(opts: {
  workerUserId: string;
  workerName: string;
  jobTitle: string;
  suburb: string;
  city: string;
}) {
  const email = await getProfileEmail(opts.workerUserId);
  if (!email) return;
  await sendEmail(
    email,
    "🎉 Your application was accepted!",
    `<h2>Congratulations ${opts.workerName}!</h2>
     <p>Your application for <strong>'${opts.jobTitle}'</strong> in ${opts.suburb}, ${opts.city} has been accepted.</p>
     <p>Log in to chat with the homeowner and confirm the details.</p>
     <a href="https://piecejobsza.co.za/#/worker-dashboard" style="background:#2D7DD2;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:10px;">View Job</a>`
  );
}

// ─── Event 3: Payment released → email worker ────────────────────────────────

export async function notifyWorkerPaymentReleased(opts: {
  workerUserId: string;
  workerName: string;
  jobTitle: string;
  amount: number;
}) {
  const email = await getProfileEmail(opts.workerUserId);
  if (!email) return;
  await sendEmail(
    email,
    `💰 Payment released: R${opts.amount}`,
    `<h2>Payment received, ${opts.workerName}!</h2>
     <p>Your payment of <strong>R${opts.amount}</strong> for '<strong>${opts.jobTitle}</strong>' has been released.</p>
     <a href="https://piecejobsza.co.za/#/worker-dashboard" style="background:#F5A623;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:10px;">View Earnings</a>`
  );
}

// ─── Event 4: New job posted → email verified workers in city ─────────────────

export async function notifyWorkersNewJob(opts: {
  jobId: string;
  categories: string[];
  suburb: string;
  city: string;
  budget: number;
}) {
  try {
    const r = await fetch(
      `${SB_URL}/rest/v1/workers?city=eq.${encodeURIComponent(opts.city)}&is_verified=eq.true&select=id,first_name,last_name,user_id`,
      { headers: sbHeaders() }
    );
    if (!r.ok) return;
    const workers = (await r.json()) as {
      id: string;
      first_name: string;
      last_name: string;
      user_id?: string;
    }[];

    const categoryLabel =
      opts.categories.length === 1
        ? opts.categories[0]
        : opts.categories.slice(0, 2).join(" & ") +
          (opts.categories.length > 2 ? ` +${opts.categories.length - 2}` : "");

    await Promise.all(
      workers.map(async (w) => {
        if (!w.user_id) return;
        const email = await getProfileEmail(w.user_id);
        if (!email) return;
        const name = `${w.first_name} ${w.last_name}`.trim();
        await sendEmail(
          email,
          `New ${categoryLabel} job near you in ${opts.city}`,
          `<h2>New job available, ${name}!</h2>
           <p>A new <strong>${categoryLabel}</strong> job has been posted in <strong>${opts.suburb}, ${opts.city}</strong> with a budget of <strong>R${opts.budget}</strong>.</p>
           <a href="https://piecejobsza.co.za/#/jobs" style="background:#2D7DD2;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:10px;">Apply Now</a>`
        );
      })
    );
  } catch (err) {
    console.error("[notify] notifyWorkersNewJob error:", err);
  }
}
