import { useState, useEffect } from "react";
import { type Job, type Application } from "@/lib/supabase";
import { openWhatsAppMessage } from "@/lib/whatsapp";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Users, Clock, CheckCircle2, XCircle, PlusCircle, Star, Lock } from "lucide-react";
import type { ModalState } from "@/App";

const SB_URL = "https://vnrvwfialfvduvetoewa.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZucnZ3ZmlhbGZ2ZHV2ZXRvZXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NTUzMjYsImV4cCI6MjA5ODMzMTMyNn0.5mfElVG_tuhBLLP4BKdQ7v5zXLIi51LpMbZUmKZ8A9w";

function sbFetch(path: string, init?: RequestInit) {
  return fetch(`${SB_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      "apikey": SB_KEY,
      "Authorization": `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      ...((init?.headers as Record<string, string>) ?? {}),
    },
  });
}

function submitPayFast(totalAmount: number, jobTitle: string) {
  const BASE = "https://piece-jobs-za.replit.app";
  const form = document.createElement("form");
  form.method = "POST";
  form.action = "https://www.payfast.co.za/eng/process";
  const fields: Record<string, string> = {
    merchant_id:  "36255333",
    merchant_key: "r1xwmkq8ihjbc",
    amount:       totalAmount.toFixed(2),
    item_name:    jobTitle.slice(0, 100),
    return_url:   `${BASE}/#/dashboard`,
    cancel_url:   `${BASE}/#/dashboard`,
    notify_url:   `${BASE}/api/payfast-notify`,
  };
  for (const [k, v] of Object.entries(fields)) {
    const inp = document.createElement("input");
    inp.type = "hidden"; inp.name = k; inp.value = v;
    form.appendChild(inp);
  }
  document.body.appendChild(form);
  form.submit();
}

type JobWithApps = Job & { applications: Application[] };

type PayModal = { app: Application; job: JobWithApps } | null;

type RateModal = {
  jobId: string;
  jobTitle: string;
  workerId: string;
  workerName: string;
  workerPhone: string;
  payoutAmount: number;
  payoutMethod: string;
  bankName: string;
  flashPhone: string;
} | null;

export default function Dashboard({ setModalState }: { setModalState: React.Dispatch<React.SetStateAction<ModalState>> }) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [jobs, setJobs]           = useState<JobWithApps[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<JobWithApps | null>(null);
  const [payModal, setPayModal]   = useState<PayModal>(null);
  const [rateModal, setRateModal] = useState<RateModal>(null);
  const [paying, setPaying]       = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchJobs();
  }, [user]);

  async function fetchJobs() {
    setLoading(true);
    const uid      = user!.id;
    const fullName = profile?.full_name ?? "";

    const [byId, byName] = await Promise.all([
      sbFetch(`jobs?posted_by=eq.${uid}&select=*,applications(*)&order=created_at.desc`),
      fullName
        ? sbFetch(`jobs?poster_name=eq.${encodeURIComponent(fullName)}&select=*,applications(*)&order=created_at.desc`)
        : Promise.resolve(null),
    ]);

    const fromId:   JobWithApps[] = byId.ok   ? await byId.json()   : [];
    const fromName: JobWithApps[] = byName?.ok ? await byName.json() : [];
    const seen = new Set(fromId.map(j => j.id));
    const merged = [...fromId, ...fromName.filter(j => !seen.has(j.id))];
    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setJobs(merged);
    setLoading(false);
  }

  function patchAppLocally(appId: string, patch: Partial<Application>) {
    const apply = (a: Application) => a.id === appId ? { ...a, ...patch } : a;
    setSelected(prev => prev ? { ...prev, applications: prev.applications.map(apply) } : null);
    setJobs(prev => prev.map(j =>
      j.id === selected?.id ? { ...j, applications: j.applications.map(apply) } : j
    ));
  }

  function patchJobLocally(jobId: string, patch: Partial<Job>) {
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...patch } : j));
    setSelected(prev => prev?.id === jobId ? { ...prev, ...patch } : prev);
  }

  function initiatePayment(app: Application) {
    if (!selected) return;
    setPayModal({ app, job: selected });
  }

  async function completePayment() {
    if (!payModal) return;
    setPaying(true);
    const { app, job } = payModal;
    const jobAmount = app.proposed_rate;
    const fee       = Math.round(jobAmount * 0.15);
    const total     = jobAmount + fee;

    let workerId: string | null = null;
    let payoutMethod = "bank";
    if (app.applicant_id) {
      const wr = await sbFetch(`workers?user_id=eq.${app.applicant_id}&select=id,payout_method`);
      if (wr.ok) {
        const [w] = await wr.json() as { id: string; payout_method?: string }[];
        if (w) { workerId = w.id; payoutMethod = w.payout_method ?? "bank"; }
      }
    }

    await sbFetch("payments", {
      method: "POST",
      headers: { "Prefer": "return=minimal" },
      body: JSON.stringify({
        job_id:          job.id,
        homeowner_email: profile?.full_name ?? "",
        worker_id:       workerId,
        amount:          total,
        platform_fee:    fee,
        worker_payout:   jobAmount,
        payout_method:   payoutMethod,
        status:          "held",
      }),
    });

    await Promise.all([
      sbFetch(`applications?id=eq.${app.id}`, {
        method: "PATCH",
        headers: { "Prefer": "return=minimal" },
        body: JSON.stringify({ status: "accepted" }),
      }),
      sbFetch(`jobs?id=eq.${job.id}`, {
        method: "PATCH",
        headers: { "Prefer": "return=minimal" },
        body: JSON.stringify({ status: "hired" }),
      }),
    ]);

    patchAppLocally(app.id, { status: "accepted" });
    patchJobLocally(job.id, { status: "hired" });

    openWhatsAppMessage(
      app.worker_phone,
      `Great news! Your application for "${job.title}" has been accepted and payment is secured. Please arrive at ${job.suburb} on the agreed time. Good luck!`
    );

    setPayModal(null);
    setPaying(false);
    submitPayFast(total, job.title);
  }

  async function declineApplication(appId: string) {
    await sbFetch(`applications?id=eq.${appId}`, {
      method: "PATCH",
      headers: { "Prefer": "return=minimal" },
      body: JSON.stringify({ status: "declined" }),
    });
    patchAppLocally(appId, { status: "declined" });
  }

  async function markComplete(job: JobWithApps) {
    await Promise.all([
      sbFetch(`jobs?id=eq.${job.id}`, {
        method: "PATCH",
        headers: { "Prefer": "return=minimal" },
        body: JSON.stringify({ status: "completed" }),
      }),
      sbFetch(`payments?job_id=eq.${job.id}`, {
        method: "PATCH",
        headers: { "Prefer": "return=minimal" },
        body: JSON.stringify({ status: "released" }),
      }),
    ]);
    patchJobLocally(job.id, { status: "completed" });

    const accepted = job.applications.find(a => a.status === "accepted");
    if (accepted?.applicant_id) {
      const r = await sbFetch(
        `workers?user_id=eq.${accepted.applicant_id}&select=id,first_name,last_name,payout_method,bank_name,flash_phone`
      );
      if (r.ok) {
        const [worker] = await r.json() as {
          id: string; first_name: string; last_name: string;
          payout_method?: string; bank_name?: string; flash_phone?: string;
        }[];
        if (worker) {
          setRateModal({
            jobId:        job.id,
            jobTitle:     job.title,
            workerId:     worker.id,
            workerName:   `${worker.first_name} ${worker.last_name}`,
            workerPhone:  accepted.worker_phone,
            payoutAmount: accepted.proposed_rate,
            payoutMethod: worker.payout_method ?? "bank",
            bankName:     worker.bank_name ?? "",
            flashPhone:   worker.flash_phone ?? "",
          });
          return;
        }
      }
    }
    toast({ title: "Job marked as complete!" });
  }

  async function submitReview(rating: number, comment: string) {
    if (!rateModal) return;
    await sbFetch("reviews", {
      method: "POST",
      headers: { "Prefer": "return=minimal" },
      body: JSON.stringify({
        job_id:         rateModal.jobId,
        worker_id:      rateModal.workerId,
        homeowner_name: profile?.full_name ?? "Homeowner",
        rating,
        comment,
      }),
    });
    const r = await sbFetch(`reviews?worker_id=eq.${rateModal.workerId}&select=rating`);
    if (r.ok) {
      const reviews = await r.json() as { rating: number }[];
      const avg = reviews.reduce((s, rv) => s + rv.rating, 0) / reviews.length;
      await sbFetch(`workers?id=eq.${rateModal.workerId}`, {
        method: "PATCH",
        headers: { "Prefer": "return=minimal" },
        body: JSON.stringify({ rating: Math.round(avg * 10) / 10, review_count: reviews.length }),
      });
    }

    if (rateModal.workerPhone) {
      const payMsg = rateModal.payoutMethod === "flash"
        ? `Great work on "${rateModal.jobTitle}"! A Flash voucher of R${rateModal.payoutAmount} has been sent to ${rateModal.flashPhone}. Collect your cash at any Kazang till. 🎉`
        : `Great work on "${rateModal.jobTitle}"! Your payment of R${rateModal.payoutAmount} will be transferred to ${rateModal.bankName || "your bank account"} within 24 hours. 🎉`;
      openWhatsAppMessage(rateModal.workerPhone, payMsg);
    }

    const payoutDesc = rateModal.payoutMethod === "flash"
      ? `A Flash voucher code has been sent to ${rateModal.flashPhone}. The worker can collect R${rateModal.payoutAmount} cash at any Kazang till.`
      : `Payment of R${rateModal.payoutAmount} will be transferred to ${rateModal.bankName || "worker's bank"} within 24 hours.`;

    toast({ title: "Review submitted! Thank you.", description: payoutDesc });
    setRateModal(null);
  }

  const statusBadge = (status: string) => {
    if (status === "open")      return "bg-green-50 text-green-700";
    if (status === "hired")     return "bg-amber-50 text-amber-700";
    if (status === "completed") return "bg-muted text-muted-foreground";
    return "bg-muted text-muted-foreground";
  };

  /* ── Detail view ─────────────────────────────────────────── */
  if (selected) {
    const isHired = selected.status === "hired" || selected.status === "completed";
    return (
      <div className="bg-background min-h-screen">
        <div className="bg-white border-b border-border">
          <div className="container mx-auto px-6 py-5">
            <button
              onClick={() => setSelected(null)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />Back to my jobs
            </button>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="font-serif text-3xl font-bold" style={{ color: "#1B2E4B" }}>{selected.title}</h1>
                  <span className={`text-xs font-bold rounded-full px-2.5 py-1 ${statusBadge(selected.status)}`}>{selected.status}</span>
                </div>
                <p className="text-muted-foreground">{selected.applications.length} application{selected.applications.length !== 1 ? "s" : ""}</p>
              </div>
              {selected.status === "hired" && (
                <Button
                  className="font-bold shrink-0"
                  style={{ background: "#F5A623", color: "#1B2E4B" }}
                  onClick={() => markComplete(selected)}
                >
                  ✓ Mark as Complete
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 py-8">
          {selected.applications.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-border">
              <p className="text-4xl mb-3">📭</p>
              <p className="font-semibold text-foreground">No applications yet</p>
              <p className="text-muted-foreground text-sm mt-1">Workers will apply soon.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {selected.applications.map(app => (
                <div key={app.id} className="bg-white border border-border rounded-2xl p-6">
                  <div className="flex flex-col md:flex-row md:items-start gap-4 justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary font-bold text-sm flex items-center justify-center">
                          {(app.worker_name ?? "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{app.worker_name}</p>
                          <p className="text-sm text-muted-foreground">{app.worker_phone}</p>
                        </div>
                        <span className={`inline-flex text-xs font-bold rounded-full px-2.5 py-1 ${
                          app.status === "accepted" ? "bg-green-50 text-green-700 border border-green-200" :
                          app.status === "declined" ? "bg-red-50 text-red-600 border border-red-200" :
                          "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>{app.status}</span>
                        <span className="text-xs text-muted-foreground">{new Date(app.created_at).toLocaleDateString("en-ZA")}</span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{app.message}</p>
                      <p className="font-bold text-sm" style={{ color: "#F5A623" }}>Proposed rate: R{app.proposed_rate}</p>
                    </div>
                    {app.status === "pending" && (
                      <div className="flex gap-2 shrink-0">
                        {!isHired && (
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white font-bold" onClick={() => initiatePayment(app)}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Accept
                          </Button>
                        )}
                        <Button size="sm" variant="destructive" className="font-bold" onClick={() => declineApplication(app.id)}>
                          <XCircle className="h-3.5 w-3.5 mr-1.5" />Decline
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <PaymentModal modal={payModal} onConfirm={completePayment} onCancel={() => setPayModal(null)} paying={paying} />
        <RateWorkerModal modal={rateModal} onSubmit={submitReview} onClose={() => setRateModal(null)} />
      </div>
    );
  }

  /* ── Jobs list ───────────────────────────────────────────── */
  return (
    <div className="bg-background min-h-screen">
      <div className="bg-white border-b border-border">
        <div className="container mx-auto px-6 py-8 flex items-start justify-between">
          <div>
            <h1 className="font-serif text-4xl font-bold" style={{ color: "#1B2E4B" }}>My Jobs</h1>
            <p className="text-muted-foreground mt-1">Welcome back, {profile?.full_name?.split(" ")[0] ?? "there"} 👋</p>
          </div>
          <Button
            className="font-bold text-base px-5 h-11"
            style={{ background: "#F5A623", color: "#1B2E4B" }}
            onClick={() => setModalState(prev => ({ ...prev, postJob: true }))}
          >
            <PlusCircle className="h-4 w-4 mr-2" />Post a Job
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {loading ? (
          <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}</div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-border">
            <p className="text-5xl mb-4">📋</p>
            <p className="font-semibold text-foreground mb-2">No jobs posted yet</p>
            <p className="text-muted-foreground text-sm mb-6">Post your first job and get applications from local workers.</p>
            <Button style={{ background: "#F5A623", color: "#1B2E4B" }} className="font-bold"
              onClick={() => setModalState(prev => ({ ...prev, postJob: true }))}>
              Post your first job
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {jobs.map(job => (
              <div
                key={job.id}
                className="bg-white border border-border rounded-2xl p-6 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
                onClick={() => setSelected(job)}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold bg-primary/10 text-primary rounded-full px-2.5 py-1">{job.category}</span>
                      <span className={`text-xs font-bold rounded-full px-2.5 py-1 ${statusBadge(job.status)}`}>{job.status}</span>
                    </div>
                    <h3 className="font-serif text-xl font-bold text-foreground">{job.title}</h3>
                    <p className="text-sm text-muted-foreground">{job.suburb}, {job.city}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 flex-wrap justify-end">
                    <div className="text-center">
                      <p className="font-serif text-2xl font-extrabold" style={{ color: "#1B2E4B" }}>R{job.budget}</p>
                      <p className="text-xs text-muted-foreground">Budget</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1.5 justify-center">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-bold text-xl text-foreground">{job.applications.length}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Applications</p>
                    </div>
                    <div className="text-center text-xs text-muted-foreground">
                      <Clock className="h-4 w-4 mx-auto mb-0.5" />
                      {new Date(job.created_at).toLocaleDateString("en-ZA")}
                    </div>
                    {job.status === "hired" && (
                      <Button
                        size="sm"
                        className="font-bold"
                        style={{ background: "#F5A623", color: "#1B2E4B" }}
                        onClick={e => { e.stopPropagation(); markComplete(job); }}
                      >
                        Mark Complete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <RateWorkerModal modal={rateModal} onSubmit={submitReview} onClose={() => setRateModal(null)} />
    </div>
  );
}

function PaymentModal({ modal, onConfirm, onCancel, paying }: {
  modal: PayModal;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  paying: boolean;
}) {
  if (!modal) return null;
  const jobAmount = modal.app.proposed_rate;
  const fee       = Math.round(jobAmount * 0.15);
  const total     = jobAmount + fee;

  return (
    <Dialog open={!!modal} onOpenChange={open => !open && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl font-bold">Confirm & Pay</DialogTitle>
          <DialogDescription>Review the payment breakdown before proceeding.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted rounded-lg p-4 space-y-1">
            <p className="font-bold text-foreground">{modal.job.title}</p>
            <p className="text-sm text-muted-foreground">Worker: <strong>{modal.app.worker_name}</strong></p>
          </div>
          <div className="space-y-2.5 border border-border rounded-lg p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Job Amount</span>
              <span className="font-semibold">R{jobAmount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Platform Fee (15%)</span>
              <span className="font-semibold">R{fee}</span>
            </div>
            <div className="border-t border-border pt-2.5 flex justify-between font-bold text-base">
              <span>Total to Pay</span>
              <span style={{ color: "#1B2E4B" }}>R{total}</span>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5 text-xs text-blue-800">
            <Lock className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
            <span>Your payment is held securely until the job is complete. The worker is only paid after you confirm completion.</span>
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={onCancel} disabled={paying}>Cancel</Button>
            <Button
              className="flex-1 font-bold bg-green-600 hover:bg-green-700 text-white"
              onClick={onConfirm}
              disabled={paying}
            >
              {paying ? "Processing…" : "Pay & Confirm Job"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RateWorkerModal({ modal, onSubmit, onClose }: {
  modal: RateModal;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  onClose: () => void;
}) {
  const [rating, setRating]         = useState(0);
  const [hovered, setHovered]       = useState(0);
  const [comment, setComment]       = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!modal) { setRating(0); setHovered(0); setComment(""); setSubmitting(false); }
  }, [modal]);

  async function handleSubmit() {
    if (rating === 0) return;
    setSubmitting(true);
    await onSubmit(rating, comment);
    setSubmitting(false);
  }

  const labels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

  return (
    <Dialog open={!!modal} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl font-bold">Rate {modal?.workerName}</DialogTitle>
          <DialogDescription>How was your experience for "{modal?.jobTitle}"?</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="flex gap-1 justify-center py-2">
            {[1,2,3,4,5].map(star => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                className="focus:outline-none"
              >
                <Star className={`h-9 w-9 transition-colors ${
                  star <= (hovered || rating) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"
                }`} />
              </button>
            ))}
          </div>
          {(hovered || rating) > 0 && (
            <p className="text-center text-sm font-semibold text-muted-foreground -mt-2">{labels[hovered || rating]}</p>
          )}
          <Textarea
            placeholder="Leave a comment (optional)..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
          />
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>Skip</Button>
            <Button
              className="flex-1 font-bold"
              style={{ background: "#2D7DD2" }}
              onClick={handleSubmit}
              disabled={rating === 0 || submitting}
            >
              {submitting ? "Submitting…" : "Submit Review"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
