/**
 * Email + SMS notification helpers — proxied through the PieceJobs API server.
 * All functions are fire-and-forget (they log errors but never throw).
 */

const SB_URL = "https://vnrvwfialfvduvetoewa.supabase.co";
const SB_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZucnZ3ZmlhbGZ2ZHV2ZXRvZXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NTUzMjYsImV4cCI6MjA5ODMzMTMyNn0.5mfElVG_tuhBLLP4BKdQ7v5zXLIi51LpMbZUmKZ8A9w";

const API_BASE = "https://piece-jobs-za.replit.app";

function sbHeaders(extra?: Record<string, string>) {
  return {
    apikey: SB_KEY,
    Authorization: `Bearer ${SB_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

/** Fetch the email address for a user from user_profiles. */
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

/** Fetch the phone number for a user from user_profiles. */
async function getProfilePhone(userId: string): Promise<string | null> {
  try {
    const r = await fetch(
      `${SB_URL}/rest/v1/user_profiles?id=eq.${userId}&select=phone`,
      { headers: sbHeaders() }
    );
    if (!r.ok) return null;
    const [row] = (await r.json()) as { phone?: string }[];
    return row?.phone ?? null;
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

/** Send transactional email via the API server → Resend. */
const sendEmail = async (to: string, subject: string, htmlBody: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE}/api/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, html: htmlBody }),
    });
    const result = await response.json();
    console.log("[notify] email result:", result);
    return result.success;
  } catch (error) {
    console.error("[notify] email send error:", error);
    return false;
  }
};

/** Send SMS via the API server → BulkSMS. */
const sendSMS = async (phone: string, message: string): Promise<boolean> => {
  try {
    console.log("Sending SMS to:", phone, "message:", message);
    const response = await fetch(`${API_BASE}/api/send-sms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message }),
    });
    const result = await response.json();
    console.log("SMS result:", result);
    return result.success;
  } catch (error) {
    console.error("[notify] SMS send error:", error);
    return false;
  }
};

// ─── Event 1: Worker applies → email + SMS to homeowner ──────────────────────

export async function notifyHomeownerNewApplication(opts: {
  homeownerUserId: string;
  homeownerName: string;
  workerName: string;
  jobTitle: string;
}) {
  const [email, phone] = await Promise.all([
    getProfileEmail(opts.homeownerUserId),
    getProfilePhone(opts.homeownerUserId),
  ]);

  const htmlBody = `<h2>Hi ${opts.homeownerName}!</h2>
     <p><strong>${opts.workerName}</strong> has applied for your job <strong>'${opts.jobTitle}'</strong>.</p>
     <p>Log in to review their application and accept or decline.</p>
     <a href="https://piecejobsza.co.za/#/dashboard" style="background:#2D7DD2;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:10px;">View Application</a>`;

  await Promise.all([
    email ? sendEmail(email, `New application for: ${opts.jobTitle}`, wrapHtml(htmlBody)) : Promise.resolve(),
    phone ? sendSMS(phone, `PieceJobs ZA: New application for '${opts.jobTitle}' from ${opts.workerName}. Login: piecejobsza.co.za`) : Promise.resolve(),
  ]);
}

// ─── Event 2: Application accepted → email + SMS to worker ───────────────────

export async function notifyWorkerAccepted(opts: {
  workerUserId: string;
  workerName: string;
  jobTitle: string;
  suburb: string;
  city: string;
}) {
  const [email, phone] = await Promise.all([
    getProfileEmail(opts.workerUserId),
    getProfilePhone(opts.workerUserId),
  ]);

  const htmlBody = `<h2>Congratulations ${opts.workerName}!</h2>
     <p>Your application for <strong>'${opts.jobTitle}'</strong> in ${opts.suburb}, ${opts.city} has been accepted.</p>
     <p>Log in to chat with the homeowner and confirm the details.</p>
     <a href="https://piecejobsza.co.za/#/worker-dashboard" style="background:#2D7DD2;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:10px;">View Job</a>`;

  await Promise.all([
    email ? sendEmail(email, "🎉 Your application was accepted!", wrapHtml(htmlBody)) : Promise.resolve(),
    phone ? sendSMS(phone, `PieceJobs ZA: Your application for '${opts.jobTitle}' was ACCEPTED! Login to chat: piecejobsza.co.za`) : Promise.resolve(),
  ]);
}

// ─── Event 3: Payment released → email + SMS to worker ───────────────────────

export async function notifyWorkerPaymentReleased(opts: {
  workerUserId: string;
  workerName: string;
  jobTitle: string;
  amount: number;
}) {
  const [email, phone] = await Promise.all([
    getProfileEmail(opts.workerUserId),
    getProfilePhone(opts.workerUserId),
  ]);

  const htmlBody = `<h2>Payment received, ${opts.workerName}!</h2>
     <p>Your payment of <strong>R${opts.amount}</strong> for '<strong>${opts.jobTitle}</strong>' has been released.</p>
     <a href="https://piecejobsza.co.za/#/worker-dashboard" style="background:#F5A623;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:10px;">View Earnings</a>`;

  await Promise.all([
    email ? sendEmail(email, `💰 Payment released: R${opts.amount}`, wrapHtml(htmlBody)) : Promise.resolve(),
    phone ? sendSMS(phone, `PieceJobs ZA: R${opts.amount} payment released for '${opts.jobTitle}'. Check your earnings: piecejobsza.co.za`) : Promise.resolve(),
  ]);
}

// ─── Event 4: New job posted → email + SMS to verified workers in city ────────

export async function notifyWorkersNewJob(opts: {
  jobId: string;
  categories: string[];
  suburb: string;
  city: string;
  budget: number;
}) {
  try {
    const r = await fetch(
      `${SB_URL}/rest/v1/workers?city=eq.${encodeURIComponent(opts.city)}&is_verified=eq.true&select=id,first_name,last_name,user_id,phone&limit=20`,
      { headers: sbHeaders() }
    );
    if (!r.ok) return;
    const workers = (await r.json()) as {
      id: string;
      first_name: string;
      last_name: string;
      user_id?: string;
      phone?: string;
    }[];

    const categoryLabel =
      opts.categories.length === 1
        ? opts.categories[0]
        : opts.categories.slice(0, 2).join(" & ") +
          (opts.categories.length > 2 ? ` +${opts.categories.length - 2}` : "");

    const smsText = `PieceJobs ZA: New ${categoryLabel} job in ${opts.suburb} for R${opts.budget}. Apply: piecejobsza.co.za`;

    await Promise.all(
      workers.map(async (w) => {
        const name = `${w.first_name} ${w.last_name}`.trim();
        const htmlBody = `<h2>New job available, ${name}!</h2>
           <p>A new <strong>${categoryLabel}</strong> job has been posted in <strong>${opts.suburb}, ${opts.city}</strong> with a budget of <strong>R${opts.budget}</strong>.</p>
           <a href="https://piecejobsza.co.za/#/jobs" style="background:#2D7DD2;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:10px;">Apply Now</a>`;

        const emailPromise = w.user_id
          ? getProfileEmail(w.user_id).then((email) =>
              email ? sendEmail(email, `New ${categoryLabel} job near you in ${opts.city}`, wrapHtml(htmlBody)) : null
            )
          : Promise.resolve();

        // Use phone from workers table directly (already fetched), fallback to profile
        const phonePromise = w.phone
          ? sendSMS(w.phone, smsText)
          : w.user_id
          ? getProfilePhone(w.user_id).then((phone) => (phone ? sendSMS(phone, smsText) : null))
          : Promise.resolve();

        await Promise.all([emailPromise, phonePromise]);
      })
    );
  } catch (err) {
    console.error("[notify] notifyWorkersNewJob error:", err);
  }
}

// ─── Event 5: Worker account verified → email worker (admin-triggered) ────────

const ADMIN_EMAIL_ENDPOINT = `${API_BASE}/api/admin/send-email`;

export async function notifyWorkerVerified(opts: {
  workerUserId: string;
  workerName: string;
  adminToken: string;
}) {
  try {
    const html = wrapHtml(`
      <h2 style="color:#1B2E4B;margin:0 0 16px 0;">Great news, ${opts.workerName}! 🎉</h2>
      <p style="color:#374151;line-height:1.6;">Your PieceJobs account has been <strong>verified</strong> by our team. You're all set to start applying for jobs in your area.</p>
      <p style="color:#374151;line-height:1.6;">Browse available jobs now and submit your application — homeowners are looking for skilled workers like you!</p>
      <a href="https://piecejobsza.co.za/#/jobs"
         style="background:#10B981;color:white;padding:12px 28px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:16px;font-weight:bold;font-size:15px;">
        Browse Jobs &amp; Apply Now
      </a>
      <p style="color:#6B7280;font-size:13px;margin-top:24px;">Good luck out there — the PieceJobs ZA team is rooting for you.</p>
    `);
    const response = await fetch(ADMIN_EMAIL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${opts.adminToken}`,
      },
      body: JSON.stringify({
        targetUserId: opts.workerUserId,
        subject: "✅ Your PieceJobs account is verified — start applying!",
        html,
      }),
    });
    const result = await response.json();
    console.log("[notify] verifyWorker email result:", result);
  } catch (err) {
    console.error("[notify] notifyWorkerVerified error:", err);
  }
}
