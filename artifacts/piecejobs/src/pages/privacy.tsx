import { Link } from "wouter";
import { MapPin } from "lucide-react";

const LAST_UPDATED = "21 July 2026";

const sections = [
  {
    title: "1. Information We Collect",
    body: `When you use PieceJobs ZA, we collect the following categories of information:

Personal Identification: Full name, email address, phone number, city, and suburb.

Identity Documents (Workers only): South African ID document number, a scan or photo of your ID document or Passport, and proof of residence (utility bill, bank statement, or lease). These are collected solely for identity verification purposes.

Profile Information: For Workers — skills, hourly rates, work history, and ratings. For Homeowners — job listings and job history.

Usage Data: Pages visited, features used, search queries, and interaction patterns within the Platform.

Payment Information: We do not store full payment card details. Payment processing is handled by PayFast, which has its own privacy policy. We store job payment amounts, platform fees, and payout records.

Device Information: IP address, browser type, operating system, and device identifiers for security and fraud prevention.`,
  },
  {
    title: "2. How We Use Your Information",
    body: `We use your personal information to:

• Provide, operate, and maintain the PieceJobs ZA Platform
• Verify worker identities and process background checks
• Match Homeowners with suitable Workers in their area
• Process payments and payouts through our escrow system
• Send notifications about new jobs, applications, and platform updates
• Detect and prevent fraud, abuse, and illegal activity
• Resolve disputes between Homeowners and Workers
• Improve our Platform based on usage patterns
• Comply with South African legal and regulatory obligations
• Communicate with you about your account and service updates

We will never sell your personal information to third parties for their marketing purposes.`,
  },
  {
    title: "3. ID Document Storage",
    body: `Workers are required to submit identity documents for verification. We take the storage of these sensitive documents very seriously.

Storage: ID documents are stored in encrypted Supabase Storage (hosted in secure cloud infrastructure) with access restricted to authorised PieceJobs ZA administrators only.

Access: Only verified PieceJobs ZA admin staff may access identity documents, and only for the purpose of verification or fraud investigation.

Retention: Identity documents are retained for the lifetime of your account plus 3 years after account closure, as required by South African financial and anti-fraud regulations. You may request deletion of your documents upon account closure, subject to legal retention requirements.

Deletion: You may request deletion of your identity documents by contacting us at info@piecejobsza.co.za. We will process deletion requests within 30 days unless retention is legally required.

We do not share identity documents with any third party other than as required by South African law enforcement or regulatory authorities.`,
  },
  {
    title: "4. Payment Information",
    body: `PieceJobs ZA uses PayFast (Pty) Ltd as our payment processor. When you make a payment on our Platform:

• Your card or banking details are entered directly on PayFast's secure pages and are never transmitted to or stored on PieceJobs ZA servers.
• We receive only a payment reference number and confirmation of payment.
• PayFast processes all card data in compliance with PCI-DSS standards.
• We store: payout amounts, platform fee records, payment status, and worker payout method details (bank name, account number, or Flash phone number for payouts).

Bank account details provided for Worker payouts are encrypted at rest and are only used to process payouts to you.`,
  },
  {
    title: "5. WhatsApp Communications",
    body: `PieceJobs ZA may use WhatsApp to:

• Alert verified Workers to new job opportunities in their city
• Confirm job acceptance and payment notifications

When you provide your phone number, you consent to receiving WhatsApp messages from PieceJobs ZA related to your account and relevant job opportunities.

You can opt out of WhatsApp notifications at any time by:
• Replying "STOP" to any PieceJobs ZA WhatsApp message, or
• Updating your notification preferences in your account settings, or
• Contacting us at info@piecejobsza.co.za

We do not share your phone number with third parties for their own marketing purposes. Job contact numbers shared within the Platform are only used for coordinating the specific job you have applied for or posted.`,
  },
  {
    title: "6. Data Sharing",
    body: `We may share your information with:

Service Providers: Third-party companies that help us operate the Platform (e.g., Supabase for database hosting, PayFast for payments, WhatsApp Business API for notifications). These providers are contractually bound to use your data only as instructed by us.

Other Users: When you post a job or apply for one, your name and relevant profile information is visible to the counterparty (Homeowner sees Worker's profile; Worker sees job listing details).

Legal Requirements: We may disclose information where required by South African law, court order, or legitimate government authority.

Business Transfers: In the event of a merger, acquisition, or asset sale, user data may be transferred. We will notify affected users and honour existing privacy commitments.

We do not share your data with advertisers or data brokers.`,
  },
  {
    title: "7. Data Security",
    body: `PieceJobs ZA implements appropriate technical and organisational security measures to protect your personal information against unauthorised access, alteration, disclosure, or destruction.

Measures include:
• Encryption of data in transit (HTTPS/TLS) and at rest
• Row-level security on our database
• Access controls limiting staff access to minimum necessary data
• Regular security reviews and vulnerability assessments
• Secure storage of identity documents in restricted-access cloud storage

No method of transmission over the internet is 100% secure. If you discover a security vulnerability, please report it responsibly to info@piecejobsza.co.za.`,
  },
  {
    title: "8. Your Rights Under POPIA",
    body: `Under South Africa's Protection of Personal Information Act, 2013 (POPIA), you have the following rights:

Right of Access: You have the right to request confirmation of whether we hold personal information about you and to receive a copy of that information.

Right to Rectification: You have the right to correct inaccurate or incomplete personal information we hold about you.

Right to Erasure: Subject to legal retention requirements, you have the right to request deletion of your personal information.

Right to Object: You have the right to object to processing of your personal information in certain circumstances.

Right to Restriction: You have the right to request restriction of processing of your personal information.

Right to Data Portability: You have the right to receive your personal data in a structured, machine-readable format.

Right to Complain: If you believe we have processed your personal information in violation of POPIA, you have the right to lodge a complaint with the Information Regulator of South Africa at: https://www.justice.gov.za/inforeg/

To exercise any of these rights, contact us at info@piecejobsza.co.za. We will respond within 30 days.`,
  },
  {
    title: "9. Cookies and Tracking",
    body: `PieceJobs ZA uses essential cookies and similar technologies to:

• Maintain your logged-in session
• Remember your preferences
• Prevent fraud and ensure Platform security

We do not use advertising cookies or sell data to advertising networks. You can control cookie settings through your browser, but disabling essential cookies may affect Platform functionality.`,
  },
  {
    title: "10. Children's Privacy",
    body: `PieceJobs ZA is not directed at persons under the age of 18. We do not knowingly collect personal information from minors. If you are under 18, please do not use the Platform.

If we become aware that we have inadvertently collected personal information from a minor, we will take steps to delete that information promptly.`,
  },
  {
    title: "11. Contact Us",
    body: `For any privacy-related questions, requests to exercise your POPIA rights, or to report a concern:

Email: info@piecejobsza.co.za
Platform: piecejobsza.co.za
Information Officer: PieceJobs ZA (Pty) Ltd

We aim to respond to all privacy requests within 30 days as required by POPIA. For urgent matters, please mark your email "URGENT: Privacy Request".`,
  },
];

export default function Privacy() {
  return (
    <div className="min-h-screen" style={{ background: "#F7F9FC" }}>
      <header style={{ background: "#1B2E4B" }} className="py-6 px-6">
        <div className="container mx-auto flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80">
            <MapPin className="h-6 w-6 text-white" />
            <span className="font-serif font-bold text-white text-lg">PieceJobs ZA</span>
          </Link>
          <span className="text-white/40">/</span>
          <span className="text-white/70 text-sm font-medium">Privacy Policy</span>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-3xl">
        <div className="mb-10">
          <h1 className="font-serif text-4xl font-bold mb-3" style={{ color: "#1B2E4B" }}>Privacy Policy</h1>
          <p className="text-muted-foreground text-sm">Last updated: {LAST_UPDATED}</p>
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
            PieceJobs ZA is committed to protecting your personal information in accordance with South Africa's <strong>Protection of Personal Information Act (POPIA)</strong>.
          </div>
        </div>

        <div className="space-y-8">
          {sections.map(s => (
            <div key={s.title} className="bg-white rounded-2xl border border-border p-8">
              <h2 className="font-serif text-xl font-bold mb-4" style={{ color: "#1B2E4B" }}>{s.title}</h2>
              <div className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">{s.body}</div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center space-y-2">
          <p className="text-sm text-muted-foreground">This policy is compliant with POPIA (Protection of Personal Information Act 4 of 2013).</p>
          <Link href="/" className="text-sm font-semibold hover:underline" style={{ color: "#2D7DD2" }}>← Back to Home</Link>
        </div>
      </main>

      <footer style={{ background: "#1B2E4B" }} className="mt-16 py-6 text-center">
        <p className="text-white/50 text-sm">© {new Date().getFullYear()} PieceJobs ZA (Pty) Ltd · POPIA Compliant 🇿🇦</p>
      </footer>
    </div>
  );
}
