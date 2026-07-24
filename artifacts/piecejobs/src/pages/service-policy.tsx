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

function HighlightCard({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/40 border border-border">
      <span className="text-xl mt-0.5 shrink-0">{emoji}</span>
      <div>
        <p className="font-bold text-sm mb-1" style={{ color: "#1B2E4B" }}>{title}</p>
        <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

export default function ServicePolicy() {
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
            <div className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-full mb-4" style={{ background: "#E8F5E9", color: "#2E7D32" }}>
              🏠 Policy Document
            </div>
            <h1 className="font-serif text-3xl font-bold mb-2" style={{ color: "#1B2E4B" }}>Service Delivery Policy</h1>
            <p className="text-sm text-muted-foreground">Effective date: 1 January 2025 · Governing law: Republic of South Africa</p>
          </div>

          <Section title="What PieceJobs ZA Is">
            <p>PieceJobs ZA is a <strong>marketplace platform</strong> that connects South African homeowners with independent local workers for household piece jobs. We provide the technology, payment infrastructure, and trust layer — we do not directly employ workers or perform any services ourselves.</p>
          </Section>

          <Section title="Key Principles">
            <div className="space-y-3">
              <HighlightCard emoji="🤝" title="Independent Contractors">
                All workers on PieceJobs ZA are <strong>independent contractors</strong>, not employees, agents, or representatives of PieceJobs ZA. Workers set their own hours, rates, and availability. PieceJobs ZA does not control how workers perform their services, only that they meet our community standards.
              </HighlightCard>

              <HighlightCard emoji="🪪" title="ID-Verified Workers Only">
                Every worker on the platform must upload a valid South African ID document (green barcoded ID or Smart Card) or passport before being approved. PieceJobs ZA manually reviews all ID submissions. Workers display a <strong>Verified</strong> shield on their profile once approved.
              </HighlightCard>

              <HighlightCard emoji="📅" title="Scheduled Service Delivery">
                Jobs are booked with a specific <strong>date and time</strong> agreed between the homeowner and worker via the platform. Service delivery timelines are the responsibility of the homeowner and worker to agree upon. PieceJobs ZA does not guarantee that workers will arrive at a specific time, though late arrivals or no-shows should be reported immediately.
              </HighlightCard>

              <HighlightCard emoji="🔒" title="Escrow Payment Protection">
                All payments made through PieceJobs ZA are held in <strong>escrow</strong> (secure hold) until the job is marked as completed by the homeowner. Workers only receive their payout after the homeowner confirms the job is done. This protects homeowners against payment disputes and ensures workers get paid once the work is delivered.
              </HighlightCard>

              <HighlightCard emoji="⚖️" title="Limitation of Liability">
                PieceJobs ZA is <strong>not liable</strong> for the quality, safety, or outcome of work performed by independent workers. Homeowners engage workers at their own discretion. PieceJobs ZA provides the platform and dispute resolution process, but does not warranty or guarantee the standard of any specific service.
              </HighlightCard>
            </div>
          </Section>

          <Section title="Service Timelines">
            <p>Specific service timelines are agreed directly between the homeowner and worker. PieceJobs ZA's role in service delivery is limited to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Facilitating job posting and worker applications</li>
              <li>Providing in-app messaging for coordination</li>
              <li>Holding payment in escrow until completion</li>
              <li>Providing dispute resolution if parties cannot agree</li>
            </ul>
            <p className="mt-2">Delays or failures in service delivery caused by circumstances outside either party's control (load-shedding, weather, transport delays) should be communicated via the in-app chat. PieceJobs ZA encourages both parties to communicate proactively.</p>
          </Section>

          <Section title="Worker Standards">
            <p>All workers on the platform agree to the <Link href="/worker-agreement" className="text-primary hover:underline font-medium">Worker Agreement</Link>, which requires:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Arriving on time or providing advance notice of delays</li>
              <li>Treating homeowners and their property with respect</li>
              <li>Only accepting jobs within their skill set and competence</li>
              <li>Completing the agreed scope of work to a reasonable standard</li>
              <li>Complying with all applicable South African health and safety laws</li>
            </ul>
          </Section>

          <Section title="Homeowner Responsibilities">
            <p>Homeowners agree to the <Link href="/homeowner-agreement" className="text-primary hover:underline font-medium">Homeowner Agreement</Link> and are expected to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Provide accurate job descriptions and reasonable working conditions</li>
              <li>Be available or have a representative present at the agreed time</li>
              <li>Inspect work and confirm completion only when satisfied</li>
              <li>Raise disputes within 24 hours of job completion if dissatisfied</li>
              <li>Treat workers with dignity and respect at all times</li>
            </ul>
          </Section>

          <Section title="Dispute Resolution">
            <p>If a homeowner or worker is dissatisfied with service delivery, PieceJobs ZA provides a <strong>dispute resolution process</strong>:</p>
            <ol className="list-decimal pl-5 space-y-1 mt-2">
              <li>The homeowner raises a dispute within 24 hours of job completion via the dashboard.</li>
              <li>Both parties are invited to submit their version of events with supporting evidence.</li>
              <li>A PieceJobs ZA admin reviews all submissions and makes a binding decision.</li>
              <li>Decisions are typically communicated within 1–2 business days.</li>
            </ol>
            <p className="mt-2">For further escalation or if the dispute involves a legal matter, parties may refer to the applicable South African consumer protection legislation, including the Consumer Protection Act 68 of 2008.</p>
          </Section>

          <Section title="Contact Us">
            <p>For questions about service delivery or to report a service failure:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Email: <a href="mailto:info@piecejobsza.co.za" className="text-primary hover:underline font-medium">info@piecejobsza.co.za</a></li>
              <li>Response time: 1–2 business days</li>
            </ul>
          </Section>

          <div className="border-t border-border pt-6 text-xs text-muted-foreground">
            This service delivery policy forms part of the PieceJobs ZA Terms of Service and is governed by the laws of the Republic of South Africa. PieceJobs ZA reserves the right to update this policy at any time. Continued use of the platform constitutes acceptance of the current policy.
          </div>
        </div>

        <div className="flex gap-4 mt-6 text-sm text-muted-foreground justify-center flex-wrap">
          <Link href="/cancellation-policy" className="hover:text-foreground transition-colors">Cancellation Policy →</Link>
          <Link href="/refund-policy" className="hover:text-foreground transition-colors">Refund Policy →</Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service →</Link>
        </div>
      </div>
    </div>
  );
}
