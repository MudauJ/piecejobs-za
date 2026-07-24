import { Link } from "wouter";
import { MapPin, ArrowLeft } from "lucide-react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-serif text-xl font-bold" style={{ color: "#1B2E4B" }}>{title}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

function RefundRow({ emoji, type, badge, badgeColor, desc }: {
  emoji: string;
  type: string;
  badge: string;
  badgeColor: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl border border-border bg-muted/30">
      <span className="text-2xl mt-0.5 shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-bold text-sm" style={{ color: "#1B2E4B" }}>{type}</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

export default function RefundPolicy() {
  return (
    <div className="min-h-screen" style={{ background: "#F7F9FC" }}>
      <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur">
        <div className="container mx-auto px-6 h-16 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80">
            <MapPin className="h-5 w-5" style={{ color: "#2D7DD2" }} />
            <span className="font-serif font-bold text-lg" style={{ color: "#1B2E4B" }}>PieceJobs ZA</span>
          </Link>
          <Link href="/" className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />Back
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-12 max-w-3xl">
        <div className="bg-white rounded-2xl border border-border p-8 md:p-12 shadow-sm space-y-8">

          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-full mb-4" style={{ background: "#E8F4FD", color: "#1D6FA4" }}>
              💳 Policy Document
            </div>
            <h1 className="font-serif text-3xl font-bold mb-2" style={{ color: "#1B2E4B" }}>Refund Policy</h1>
            <p className="text-sm text-muted-foreground">Effective date: 1 January 2025 · Governing law: Republic of South Africa</p>
          </div>

          <Section title="Overview">
            <p>PieceJobs ZA holds all payments in escrow until a job is completed and confirmed. This protects both homeowners and workers. Our refund policy sets out exactly when and how refunds are issued.</p>
          </Section>

          <Section title="Refund Eligibility">
            <div className="space-y-3">
              <RefundRow
                emoji="✅"
                type="Full Refund"
                badge="100% back"
                badgeColor="bg-green-50 text-green-700"
                desc="A full refund is issued when: (1) the worker is a no-show and does not arrive within 30 minutes of the agreed start time without prior notice; (2) the worker cancels the job at any stage; or (3) the job was not completed through no fault of the homeowner. In these cases the full escrowed amount is returned to the original payment method."
              />
              <RefundRow
                emoji="⚖️"
                type="Partial Refund"
                badge="Amount decided by admin"
                badgeColor="bg-amber-50 text-amber-700"
                desc="A partial refund may be issued when a job is only partially completed. The homeowner must raise a dispute within 24 hours of the scheduled completion time. PieceJobs ZA admin will review the case — including any chat history, photos, and worker/homeowner statements — and determine a fair split. The admin decision is final."
              />
              <RefundRow
                emoji="🚫"
                type="No Refund"
                badge="Not eligible"
                badgeColor="bg-red-50 text-red-700"
                desc="No refund is issued if the job has been completed and the homeowner has confirmed completion (or the 24-hour dispute window has expired without a dispute being raised). Once payment is released to the worker, it cannot be reversed. Homeowners are encouraged to inspect the work before confirming completion."
              />
            </div>
          </Section>

          <Section title="Dispute Window">
            <div className="rounded-xl border-2 p-5 space-y-2" style={{ borderColor: "#F5A623", background: "#FFFBF0" }}>
              <p className="font-bold text-sm" style={{ color: "#92400E" }}>⏰ Important: 24-Hour Dispute Window</p>
              <p>After a job is marked as complete, the homeowner has <strong>24 hours</strong> to raise a dispute before payment is <strong>automatically released</strong> to the worker. After 24 hours, the payment is considered final and no refund can be processed.</p>
              <p>To raise a dispute, go to <strong>My Dashboard → My Jobs</strong> and click <strong>Raise Dispute</strong> on the completed job, or contact <a href="mailto:info@piecejobsza.co.za" className="text-primary hover:underline font-medium">info@piecejobsza.co.za</a> immediately.</p>
            </div>
          </Section>

          <Section title="Refund Processing Time">
            <p>Approved refunds are processed within <strong>3–5 business days</strong> back to the original payment method used:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Credit/Debit Card:</strong> 3–5 business days (depending on your bank)</li>
              <li><strong>EFT/Bank Transfer:</strong> 2–3 business days</li>
              <li><strong>PayFast Wallet:</strong> 1–2 business days</li>
            </ul>
            <p className="mt-2">PieceJobs ZA does not charge any fee to process refunds. You will receive an email confirmation once the refund has been initiated.</p>
          </Section>

          <Section title="How to Request a Refund">
            <ol className="list-decimal pl-5 space-y-2">
              <li>Log in to your PieceJobs ZA account and go to <strong>My Dashboard</strong>.</li>
              <li>Find the relevant job and click <strong>Raise Dispute</strong> (available within 24 hours of completion).</li>
              <li>Describe the issue clearly and attach any supporting evidence (photos, messages, etc.).</li>
              <li>PieceJobs ZA admin will review and respond within <strong>1–2 business days</strong>.</li>
              <li>Once approved, the refund is processed to your original payment method within 3–5 business days.</li>
            </ol>
          </Section>

          <Section title="Contact Us">
            <p>For refund queries or to escalate a dispute:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Email: <a href="mailto:info@piecejobsza.co.za" className="text-primary hover:underline font-medium">info@piecejobsza.co.za</a></li>
              <li>Response time: 1–2 business days</li>
            </ul>
          </Section>

          <div className="border-t border-border pt-6 text-xs text-muted-foreground">
            This refund policy forms part of the PieceJobs ZA Terms of Service. PieceJobs ZA reserves the right to amend this policy at any time. Continued use of the platform after changes constitutes acceptance of the updated policy.
          </div>
        </div>

        <div className="flex gap-4 mt-6 text-sm text-muted-foreground justify-center flex-wrap">
          <Link href="/cancellation-policy" className="hover:text-foreground transition-colors">Cancellation Policy →</Link>
          <Link href="/service-policy" className="hover:text-foreground transition-colors">Service Delivery Policy →</Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service →</Link>
        </div>
      </div>
    </div>
  );
}
