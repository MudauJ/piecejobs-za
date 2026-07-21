import { Link } from "wouter";
import { MapPin, ArrowLeft } from "lucide-react";

export default function WorkerAgreement() {
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
            <h1 className="font-serif text-3xl font-bold mb-2" style={{ color: "#1B2E4B" }}>Worker Agreement</h1>
            <p className="text-sm text-muted-foreground">Effective date: 1 January 2025 · Governing law: Republic of South Africa</p>
          </div>

          <Section title="1. Independent Contractor Status">
            <p>You are an <strong>independent contractor</strong> and not an employee, agent, partner, or joint-venture partner of PieceJobs ZA or any homeowner who engages your services through the Platform. You retain full control over how, when, and where you perform services, subject to the agreed scope of each job.</p>
            <p className="mt-2">PieceJobs ZA does not provide tools, equipment, or materials unless expressly stated in a job listing. You are responsible for your own tools and materials required to perform the services.</p>
          </Section>

          <Section title="2. Platform Fee">
            <p>PieceJobs ZA charges a <strong>platform fee of 15%</strong> on all payments processed through the Platform. This fee is deducted automatically before your payout is released. The platform fee covers payment processing, verification services, dispute resolution, and platform maintenance.</p>
            <p className="mt-2">Example: If a homeowner pays R500 for a job, your payout will be R425 (R500 minus R75 platform fee).</p>
          </Section>

          <Section title="3. Payment Terms">
            <ul className="list-disc pl-5 space-y-1">
              <li>Payment is held in escrow by PieceJobs ZA until the job is marked as completed.</li>
              <li>Payouts are released within <strong>24 hours</strong> of job completion confirmation.</li>
              <li>Payouts are made via bank transfer (EFT) or Flash (cell-phone banking).</li>
              <li>You must provide accurate and current banking details. PieceJobs ZA is not liable for failed payouts due to incorrect banking information.</li>
              <li>PieceJobs ZA reserves the right to withhold payment pending resolution of a dispute.</li>
            </ul>
          </Section>

          <Section title="4. Identity Verification">
            <p>You must upload a valid South African ID document (green barcoded ID card or Smart Card ID) or passport, and a proof of residence not older than 3 months. Your account will be flagged as "Unverified" until these documents are reviewed and approved by the PieceJobs ZA team.</p>
            <p className="mt-2">Providing false, forged, or misleading documentation is a criminal offence under South African law and will result in immediate account termination and referral to law enforcement.</p>
          </Section>

          <Section title="5. Code of Conduct">
            <p>You agree to uphold the following standards on every job:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Punctuality:</strong> Arrive at the agreed time. If you will be late, notify the homeowner promptly via the PieceJobs ZA chat.</li>
              <li><strong>Professionalism:</strong> Treat all homeowners, their property, and other persons at the work site with respect and courtesy at all times.</li>
              <li><strong>No Harassment:</strong> Any form of verbal, physical, or sexual harassment will result in immediate account suspension and potential criminal charges.</li>
              <li><strong>Honesty:</strong> Do not misrepresent your skills, experience, or qualifications in your profile or during any job.</li>
              <li><strong>Safety:</strong> Comply with all applicable health and safety requirements. Do not undertake work you are not qualified or licensed to perform.</li>
            </ul>
          </Section>

          <Section title="6. Prohibited Conduct">
            <ul className="list-disc pl-5 space-y-1">
              <li>Soliciting homeowners to pay for services outside the Platform to avoid fees.</li>
              <li>Creating multiple accounts or impersonating another worker.</li>
              <li>Accepting payment without completing the agreed services.</li>
              <li>Accessing, damaging, or stealing any property of the homeowner.</li>
              <li>Sharing homeowner contact information with third parties.</li>
            </ul>
          </Section>

          <Section title="7. Dispute Resolution">
            <p>If a dispute arises between you and a homeowner:</p>
            <ol className="list-decimal pl-5 mt-2 space-y-1">
              <li>Either party may raise a dispute via the PieceJobs ZA platform within <strong>48 hours</strong> of the scheduled job completion.</li>
              <li>PieceJobs ZA will review evidence (photos, chat logs, completion confirmation) and make a binding determination within 5 business days.</li>
              <li>Payment will remain in escrow until the dispute is resolved.</li>
              <li>PieceJobs ZA's decision is final. You may appeal within 7 days by emailing support@piecejobsza.co.za with additional evidence.</li>
            </ol>
          </Section>

          <Section title="8. Account Termination">
            <p>PieceJobs ZA may suspend or terminate your account without notice if you:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Violate any provision of this Agreement.</li>
              <li>Receive three or more complaints within a 90-day period.</li>
              <li>Receive a rating below 2.0 stars after 10 or more reviews.</li>
              <li>Are found to have provided false documentation.</li>
              <li>Engage in any fraudulent, abusive, or illegal conduct.</li>
            </ul>
          </Section>

          <Section title="9. POPIA Compliance">
            <p>PieceJobs ZA processes your personal information in accordance with the Protection of Personal Information Act 4 of 2013 (POPIA). Your information is used solely to facilitate job matching, payment processing, and platform operations. You may request access to, correction of, or deletion of your personal information by contacting privacy@piecejobsza.co.za.</p>
          </Section>

          <Section title="10. Limitation of Liability">
            <p>PieceJobs ZA is a marketplace platform and is not liable for any injury, loss, or damage arising from services performed by workers. Each worker is solely responsible for the quality and safety of their work. PieceJobs ZA's total liability to you shall not exceed the platform fees earned in the 30 days preceding any claim.</p>
          </Section>

          <Section title="11. Governing Law">
            <p>This Agreement is governed by and construed in accordance with the laws of the Republic of South Africa. Any disputes arising from this Agreement shall be subject to the jurisdiction of the South African courts.</p>
          </Section>

          <div className="border-t border-border pt-6 text-sm text-muted-foreground">
            <p>By registering as a worker on PieceJobs ZA, you confirm that you have read, understood, and agree to be bound by this Worker Agreement.</p>
            <p className="mt-2">Questions? Contact us at <strong>support@piecejobsza.co.za</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="font-serif text-lg font-bold" style={{ color: "#1B2E4B" }}>{title}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}
