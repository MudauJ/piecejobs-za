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

function PolicyCard({ emoji, label, badge, badgeColor, children }: {
  emoji: string;
  label: string;
  badge: string;
  badgeColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-5">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{emoji}</span>
        <div>
          <p className="font-bold text-sm" style={{ color: "#1B2E4B" }}>{label}</p>
          <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full mt-0.5 ${badgeColor}`}>{badge}</span>
        </div>
      </div>
      <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}

export default function CancellationPolicy() {
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
            <div className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-full mb-4" style={{ background: "#FFF4E0", color: "#B45309" }}>
              📋 Policy Document
            </div>
            <h1 className="font-serif text-3xl font-bold mb-2" style={{ color: "#1B2E4B" }}>Cancellation Policy</h1>
            <p className="text-sm text-muted-foreground">Effective date: 1 January 2025 · Governing law: Republic of South Africa</p>
          </div>

          <Section title="Overview">
            <p>PieceJobs ZA's cancellation policy is designed to be fair to both homeowners and workers. The outcome of a cancellation depends on <strong>when</strong> it happens and <strong>who</strong> initiates it.</p>
          </Section>

          <Section title="Homeowner Cancellations">
            <div className="space-y-3">
              <PolicyCard
                emoji="✅"
                label="Before worker accepts the job"
                badge="Full Refund"
                badgeColor="bg-green-50 text-green-700"
              >
                If you cancel a job <strong>before a worker has accepted it</strong>, you receive a full refund of any amount paid. No cancellation fee applies. The job listing is removed from the platform immediately.
              </PolicyCard>

              <PolicyCard
                emoji="⚠️"
                label="After worker accepted — before the job date"
                badge="50% Refund"
                badgeColor="bg-amber-50 text-amber-700"
              >
                If you cancel <strong>after a worker has accepted</strong> the job but before the scheduled date, a <strong>50% cancellation fee</strong> is charged. The remaining 50% is paid directly to the worker to compensate for their time and preparation. This fee is non-negotiable.
              </PolicyCard>

              <PolicyCard
                emoji="🚫"
                label="On the day of the job"
                badge="No Refund"
                badgeColor="bg-red-50 text-red-700"
              >
                If you cancel on the <strong>scheduled day of the job</strong>, no refund is issued. The full payment amount is released to the worker. This policy exists because same-day cancellations cause significant disruption to workers who have reserved that time and may have turned down other opportunities.
              </PolicyCard>
            </div>
          </Section>

          <Section title="Worker Cancellations">
            <PolicyCard
              emoji="🔄"
              label="Worker cancels any job"
              badge="Full Refund to Homeowner"
              badgeColor="bg-blue-50 text-blue-700"
            >
              <p>If a worker cancels a job at any stage, the homeowner receives a <strong>full refund</strong> of all amounts paid — no deductions apply.</p>
              <p className="mt-2">Additionally, <strong>the worker's account is flagged</strong>. Repeated cancellations by a worker may result in temporary suspension or permanent removal from the PieceJobs ZA platform. Workers are expected to only accept jobs they are able and committed to completing.</p>
            </PolicyCard>
          </Section>

          <Section title="How to Cancel a Job">
            <p>Jobs can be cancelled directly from your <strong>Homeowner Dashboard</strong>:</p>
            <ol className="list-decimal pl-5 space-y-1 mt-2">
              <li>Log in to your PieceJobs ZA account.</li>
              <li>Go to <strong>My Dashboard → My Jobs</strong>.</li>
              <li>Find the job you wish to cancel and click <strong>Cancel Job</strong>.</li>
              <li>Confirm the cancellation. Refund timelines depend on when you cancel (see above).</li>
            </ol>
            <p className="mt-3">Cancellations cannot be undone once confirmed. If you made a cancellation in error, contact us immediately at <a href="mailto:info@piecejobsza.co.za" className="text-primary hover:underline font-medium">info@piecejobsza.co.za</a>.</p>
          </Section>

          <Section title="Exceptional Circumstances">
            <p>In cases of genuine emergency (medical, family crisis, natural disaster), PieceJobs ZA may at its sole discretion waive or reduce cancellation fees. Submit a request to <a href="mailto:info@piecejobsza.co.za" className="text-primary hover:underline font-medium">info@piecejobsza.co.za</a> within 24 hours of the cancellation with supporting documentation.</p>
          </Section>

          <Section title="Contact Us">
            <p>For questions about this policy or to request a cancellation review:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Email: <a href="mailto:info@piecejobsza.co.za" className="text-primary hover:underline font-medium">info@piecejobsza.co.za</a></li>
              <li>Response time: 1–2 business days</li>
            </ul>
          </Section>

          <div className="border-t border-border pt-6 text-xs text-muted-foreground">
            This policy forms part of the PieceJobs ZA Terms of Service. By using the platform, you agree to be bound by this policy. PieceJobs ZA reserves the right to amend this policy at any time with reasonable notice.
          </div>
        </div>

        <div className="flex gap-4 mt-6 text-sm text-muted-foreground justify-center flex-wrap">
          <Link href="/refund-policy" className="hover:text-foreground transition-colors">Refund Policy →</Link>
          <Link href="/service-policy" className="hover:text-foreground transition-colors">Service Delivery Policy →</Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service →</Link>
        </div>
      </div>
    </div>
  );
}
