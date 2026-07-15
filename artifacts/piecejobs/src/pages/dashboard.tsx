import { useState, useEffect } from "react";
import { type Job, type Application } from "@/lib/supabase";
import { openWhatsAppMessage } from "@/lib/whatsapp";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Users, Clock, CheckCircle2, XCircle, PlusCircle, Star } from "lucide-react";
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

type JobWithApps = Job & { applications: Application[] };

type RateModal = {
  jobId: string;
  jobTitle: string;
  workerId: string;
  workerName: string;
} | null;

export default function Dashboard({ setModalState }: { setModalState: React.Dispatch<React.SetStateAction<ModalState>> }) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [jobs, setJobs]         = useState<JobWithApps[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<JobWithApps | null>(null);
  const [rateModal, setRateModal] = useState<RateModal>(null);

  useEffect(() => {
    if (!user) return;
    fetchJobs();
  }, [user]);

  async function fetchJobs() {
    setLoading(true);
    const r = await sbFetch(`jobs?posted_by=eq.${user!.id}&select=*,applications(*)&order=created_at.desc`);
    setJobs(r.ok ? await r.json() : []);
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

  async function acceptApplication(app: Application) {
    await Promise.all([
      sbFetch(`applications?id=eq.${app.id}`, {
        method: "PATCH",
        headers: { "Prefer": "return=minimal" },
        body: JSON.stringify({ status: "accepted" }),
      }),
      sbFetch(`jobs?id=eq.${selected!.id}`, {
        method: "PATCH",
        headers: { "Prefer": "return=minimal" },
        body: JSON.stringify({ status: "hired" }),
      }),
    ]);
    patchAppLocally(app.id, { status: "accepted" });
    patchJobLocally(selected!.id, { status: "hired" });
    openWhatsAppMessage(
      app.worker_phone,
      `Hi! Your application for "${selected!.title}" on PieceJobs ZA has been accepted. The homeowner will contact you shortly. Congratulations!`
    );
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
    await sbFetch(`jobs?id=eq.${job.id}`, {
      method: "PATCH",
      headers: { "Prefer": "return=minimal" },
      body: JSON.stringify({ status: "completed" }),
    });
    patchJobLocally(job.id, { status: "completed" });

    const accepted = job.applications.find(a => a.status === "accepted");
    if (accepted?.applicant_id) {
      const r = await sbFetch(`workers?user_id=eq.${accepted.applicant_id}&select=id,first_name,last_name`);
      if (r.ok) {
        const [worker] = await r.json() as { id: string; first_name: string; last_name: string }[];
        if (worker) {
          setRateModal({ jobId: job.id, jobTitle: job.title, workerId: worker.id, workerName: `${worker.first_name} ${worker.last_name}` });
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
        job_id: rateModal.jobId,
        worker_id: rateModal.workerId,
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
    toast({ title: "Review submitted! Thank you." });
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
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white font-bold" onClick={() => acceptApplication(app)}>
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

function RateWorkerModal({ modal, onSubmit, onClose }: {
  modal: RateModal;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  onClose: () => void;
}) {
  const [rating, setRating]   = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
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
