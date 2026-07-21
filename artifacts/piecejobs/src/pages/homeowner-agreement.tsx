import { Link } from "wouter";
import { MapPin, ArrowLeft } from "lucide-react";

export default function HomeownerAgreement() {
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
            <h1 className="font-serif text-3xl font-bold mb-2" style={{ color: "#1B2E4B" }}>Homeowner Agreement</h1>
            <p className="text-sm text-muted-foreground">Effective date: 1 January 2025 · Governing law: Republic of South Africa</p>
          </div>

          <Section title="1. About PieceJobs ZA">
            <p>PieceJobs ZA is a marketplace platform that connects homeowners with independent workers for household piece jobs. PieceJobs ZA is not a party to the service agreement between you and any worker, and does not employ or control the workers listed on the Platform.</p>
          </Section>

          <Section title="2. Payment & Escrow">
            <ul className="list-disc pl-5 space-y-1">
              <li>All payments for services must be made through the PieceJobs ZA Platform. Paying workers outside the platform is a violation of this Agreement.</li>
              <li>Your payment is held in <strong>escrow</strong> by PieceJobs ZA until the job is completed to your satisfaction.</li>
              <li>You must confirm job completion within 24 hours of the scheduled end time. If no confirmation is received, the platform will auto-release payment to the worker.</li>
              <li>PieceJobs ZA charges a <strong>15% platform fee</strong> deducted from the worker's payout. There are no additional charges to homeowners beyond the agreed job budget.</li>
            </ul>
          </Section>

          <Section title="3. Refund Policy">
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Full refund:</strong> If the worker does not arrive and does not notify you within 2 hours of the scheduled start time, you are entitled to a full refund.</li>
              <li><strong>Partial refund:</strong> If the job is only partially completed and you raise a dispute, PieceJobs ZA will assess the situation and may issue a partial refund proportional to the work completed.</li>
              <li><strong>No refund:</strong> Once you confirm job completion, payment is released to the worker and no refund can be issued. Please only confirm completion when you are satisfied.</li>
              <li>Refund requests must be submitted within <strong>48 hours</strong> of the scheduled job completion.</li>
            </ul>
          </Section>

          <Section title="4. Your Responsibilities">
            <p>As a homeowner, you agree to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Safe working environment:</strong> Ensure the work site is safe and free of hazards before the worker arrives.</li>
              <li><strong>Accurate job description:</strong> Provide an honest and accurate description of the work required. Misleading descriptions may result in additional charges or cancellation.</li>
              <li><strong>Respectful conduct:</strong> Treat all workers with dignity and respect. Harassment, discrimination, or abuse of any kind will result in account suspension.</li>
              <li><strong>Timely access:</strong> Be available to provide access to the work site at the agreed time.</li>
              <li><strong>Honest reviews:</strong> Provide fair and honest ratings and reviews based on your genuine experience.</li>
            </ul>
          </Section>

          <Section title="5. Prohibited Conduct">
            <ul className="list-disc pl-5 space-y-1">
              <li>Arranging payment for services outside the Platform to avoid platform fees.</li>
              <li>Posting false, misleading, or illegal job listings.</li>
              <li>Discriminating against workers based on race, gender, religion, disability, or any other protected characteristic under South African law.</li>
              <li>Sharing worker personal information with third parties without consent.</li>
              <li>Requesting workers to perform services that are illegal or outside the agreed scope.</li>
            </ul>
          </Section>

          <Section title="6. Dispute Resolution">
            <p>If you are unsatisfied with the work performed:</p>
            <ol className="list-decimal pl-5 mt-2 space-y-1">
              <li>Do not confirm job completion. Instead, raise a dispute through the Platform within <strong>48 hours</strong> of the scheduled completion.</li>
              <li>Provide supporting evidence (photos, chat logs, description of issues).</li>
              <li>PieceJobs ZA will review all evidence and make a binding determination within 5 business days.</li>
              <li>Payment remains in escrow until the dispute is resolved.</li>
              <li>You may appeal PieceJobs ZA's determination within 7 days by emailing support@piecejobsza.co.za.</li>
            </ol>
          </Section>

          <Section title="7. Rating & Review Obligations">
            <p>After each completed job, you are encouraged to leave an honest rating and review. Reviews must be based on your genuine experience and must not contain defamatory, false, or malicious content. PieceJobs ZA reserves the right to remove reviews that violate these standards.</p>
          </Section>

          <Section title="8. Account Termination">
            <p>PieceJobs ZA may suspend or terminate your account if you:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Violate any provision of this Agreement.</li>
              <li>Attempt to pay workers outside the Platform.</li>
              <li>Post fraudulent or illegal job listings.</li>
              <li>Engage in harassment or abuse of workers.</li>
              <li>Abuse the dispute or refund process.</li>
            </ul>
          </Section>

          <Section title="9. POPIA Compliance">
            <p>PieceJobs ZA processes your personal information in accordance with the Protection of Personal Information Act 4 of 2013 (POPIA). Your information is used solely for platform operations, job matching, and payment processing. You may request access to, correction of, or deletion of your personal information by contacting privacy@piecejobsza.co.za.</p>
          </Section>

          <Section title="10. Limitation of Liability">
            <p>PieceJobs ZA is a marketplace platform and is not liable for any injury, loss, property damage, or theft arising from services performed by workers. Workers are independent contractors and PieceJobs ZA does not guarantee the quality of their work. PieceJobs ZA's total liability to you shall not exceed the amount paid for the disputed job.</p>
          </Section>

          <Section title="11. Governing Law">
            <p>This Agreement is governed by and construed in accordance with the laws of the Republic of South Africa. Any disputes arising from this Agreement shall be subject to the jurisdiction of the South African courts.</p>
          </Section>

          <div className="border-t border-border pt-6 text-sm text-muted-foreground">
            <p>By registering as a homeowner on PieceJobs ZA, you confirm that you have read, understood, and agree to be bound by this Homeowner Agreement.</p>
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
