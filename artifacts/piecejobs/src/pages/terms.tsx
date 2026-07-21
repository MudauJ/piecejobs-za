import { Link } from "wouter";
import { MapPin } from "lucide-react";

const LAST_UPDATED = "21 July 2026";

const sections = [
  {
    title: "1. Introduction",
    body: `Welcome to PieceJobs ZA (Pty) Ltd ("PieceJobs ZA", "we", "us", or "our"). These Terms of Service govern your use of our platform located at piecejobsza.co.za and related mobile applications (the "Platform"). By accessing or using PieceJobs ZA, you agree to be bound by these Terms. If you do not agree, please do not use the Platform.

PieceJobs ZA operates as a marketplace connecting South African homeowners ("Homeowners") with independent domestic workers ("Workers") for household piece jobs. We are not an employment agency and do not employ Workers.`,
  },
  {
    title: "2. User Accounts",
    body: `2.1 You must be at least 18 years old and a South African resident to create an account.

2.2 You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate.

2.3 You are responsible for maintaining the confidentiality of your account password and for all activities that occur under your account.

2.4 We reserve the right to suspend or terminate accounts that violate these Terms, engage in fraudulent activity, or post false or misleading information.

2.5 One account per person. Creating duplicate accounts to circumvent suspensions is prohibited.`,
  },
  {
    title: "3. For Homeowners",
    body: `3.1 Homeowners may post job listings describing work to be done, the location, and the budget.

3.2 All job listings must be lawful, accurate, and describe genuine household piece work.

3.3 Homeowners are responsible for ensuring their property is safe for Workers to enter and perform the described work.

3.4 Homeowners may not use Workers' contact details obtained through the Platform for purposes outside the agreed job.

3.5 Payment must be processed through the Platform's escrow system to ensure Worker protection. Direct payment arrangements that bypass the Platform are prohibited.

3.6 Homeowners must treat Workers with dignity and respect at all times.`,
  },
  {
    title: "4. For Workers",
    body: `4.1 Workers must complete identity verification (SA ID or Passport + proof of residence) before accepting paid jobs.

4.2 Workers are independent contractors, not employees of PieceJobs ZA. Workers are responsible for their own tax obligations, insurance, and compliance with applicable South African labour laws.

4.3 Workers must perform agreed services professionally, punctually, and to the standard described in the job listing.

4.4 Workers may not solicit additional work or personal contact details from Homeowners outside the Platform.

4.5 Workers must accurately represent their skills, experience, and qualifications on their profiles.

4.6 Failure to fulfil accepted jobs without reasonable notice may result in account suspension.`,
  },
  {
    title: "5. Payments and Escrow",
    body: `5.1 All payments are processed through our PayFast-powered escrow system. The Homeowner's payment is held securely until the job is marked as complete.

5.2 Upon job completion, funds are released to the Worker minus the Platform Fee (see Section 6).

5.3 Workers receive payouts via bank transfer (within 24 hours of release) or Flash/Kazang cash voucher, as selected in their profile.

5.4 In the event of a dispute, funds remain in escrow until the dispute is resolved per Section 9.

5.5 PieceJobs ZA uses PayFast as its payment processor. By using the Platform, you also agree to PayFast's terms of service.`,
  },
  {
    title: "6. Platform Fees",
    body: `PieceJobs ZA charges a platform fee of 15% on all successful job payments. This fee is deducted from the total job amount before the Worker's payout is calculated.

Example: A R1,000 job results in a R150 platform fee and a R850 Worker payout.

The platform fee covers background verification infrastructure, payment processing, dispute resolution services, customer support, and platform maintenance.

Platform fees are non-refundable once a job is marked as complete and both parties have confirmed satisfactory completion.`,
  },
  {
    title: "7. Prohibited Conduct",
    body: `You agree not to:

• Post false, misleading, or fraudulent job listings or worker profiles
• Harass, threaten, or discriminate against any user based on race, gender, religion, nationality, or any other characteristic
• Use the Platform to facilitate illegal activities
• Circumvent the Platform's payment system
• Scrape, copy, or redistribute Platform data without authorisation
• Impersonate another person or entity
• Post content that is defamatory, obscene, or infringes intellectual property rights
• Create fake reviews or ratings
• Share other users' personal information without consent`,
  },
  {
    title: "8. Dispute Resolution",
    body: `8.1 If a dispute arises between a Homeowner and Worker, either party may raise it with PieceJobs ZA support within 7 days of the job completion date.

8.2 PieceJobs ZA will review evidence from both parties and make a determination within 5 business days.

8.3 During dispute review, payment remains in escrow.

8.4 PieceJobs ZA's decision is final with respect to escrow release. Parties retain the right to pursue civil remedies independently.

8.5 For disputes that cannot be resolved internally, parties agree to attempt mediation before pursuing litigation.`,
  },
  {
    title: "9. Limitation of Liability",
    body: `To the maximum extent permitted by South African law, PieceJobs ZA shall not be liable for:

• Any indirect, incidental, special, or consequential damages
• Loss of earnings, data, goodwill, or business opportunities
• Actions or omissions of Workers or Homeowners
• Property damage occurring during or after job performance
• Technical failures, downtime, or data loss

PieceJobs ZA's maximum aggregate liability for any claims arising under these Terms shall not exceed the total platform fees paid by the claimant in the 12 months preceding the claim.`,
  },
  {
    title: "10. Governing Law",
    body: `These Terms are governed by the laws of the Republic of South Africa, including but not limited to the Electronic Communications and Transactions Act 25 of 2002, the Consumer Protection Act 68 of 2008, and the Protection of Personal Information Act 4 of 2013 (POPIA).

Any disputes arising from these Terms shall be subject to the jurisdiction of the courts of South Africa, with the Gauteng Division of the High Court having primary jurisdiction.`,
  },
  {
    title: "11. Contact Us",
    body: `If you have questions about these Terms of Service, please contact us:

Email: info@piecejobsza.co.za
Platform: piecejobsza.co.za
Registered in the Republic of South Africa

We aim to respond to all enquiries within 2 business days.`,
  },
];

export default function Terms() {
  return (
    <div className="min-h-screen" style={{ background: "#F7F9FC" }}>
      <header style={{ background: "#1B2E4B" }} className="py-6 px-6">
        <div className="container mx-auto flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80">
            <MapPin className="h-6 w-6 text-white" />
            <span className="font-serif font-bold text-white text-lg">PieceJobs ZA</span>
          </Link>
          <span className="text-white/40">/</span>
          <span className="text-white/70 text-sm font-medium">Terms of Service</span>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-3xl">
        <div className="mb-10">
          <h1 className="font-serif text-4xl font-bold mb-3" style={{ color: "#1B2E4B" }}>Terms of Service</h1>
          <p className="text-muted-foreground text-sm">Last updated: {LAST_UPDATED}</p>
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
            Please read these Terms carefully before using PieceJobs ZA. By using our platform, you agree to these terms.
          </div>
        </div>

        <div className="space-y-10">
          {sections.map(s => (
            <div key={s.title} className="bg-white rounded-2xl border border-border p-8">
              <h2 className="font-serif text-xl font-bold mb-4" style={{ color: "#1B2E4B" }}>{s.title}</h2>
              <div className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">{s.body}</div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center space-y-2">
          <p className="text-sm text-muted-foreground">By using PieceJobs ZA you confirm you have read and accept these Terms.</p>
          <Link href="/" className="text-sm font-semibold hover:underline" style={{ color: "#2D7DD2" }}>← Back to Home</Link>
        </div>
      </main>

      <footer style={{ background: "#1B2E4B" }} className="mt-16 py-6 text-center">
        <p className="text-white/50 text-sm">© {new Date().getFullYear()} PieceJobs ZA (Pty) Ltd · Proudly South African 🇿🇦</p>
      </footer>
    </div>
  );
}
