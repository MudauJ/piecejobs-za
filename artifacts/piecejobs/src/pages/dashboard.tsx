import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { supabase, type Job, type Application } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import PostJobModal from "@/components/modals/post-job-modal";
import { ArrowLeft, Briefcase, Users, Clock, CheckCircle2, XCircle, PlusCircle } from "lucide-react";
import type { ModalState } from "@/App";

type JobWithApps = Job & { applications: Application[] };

export default function Dashboard({ setModalState }: { setModalState: React.Dispatch<React.SetStateAction<ModalState>> }) {
  const { user, profile } = useAuth();
  const [, setLocation]    = useLocation();
  const [jobs, setJobs]    = useState<JobWithApps[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<JobWithApps | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchJobs();
  }, [user]);

  async function fetchJobs() {
    setLoading(true);
    const { data } = await supabase
      .from("jobs")
      .select("*, applications(*)")
      .eq("posted_by", user!.id)
      .order("created_at", { ascending: false });
    setJobs(data ?? []);
    setLoading(false);
  }

  async function setApplicationStatus(appId: string, status: "accepted" | "declined") {
    await supabase.from("applications").update({ status }).eq("id", appId);
    if (selected) {
      setSelected(prev => prev
        ? { ...prev, applications: prev.applications.map(a => a.id === appId ? { ...a, status } : a) }
        : null
      );
    }
    setJobs(prev => prev.map(j =>
      j.id === selected?.id
        ? { ...j, applications: j.applications.map(a => a.id === appId ? { ...a, status } : a) }
        : j
    ));
  }

  if (selected) {
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
            <h1 className="font-serif text-3xl font-bold" style={{ color: "#1B2E4B" }}>{selected.title}</h1>
            <p className="text-muted-foreground mt-1">{selected.applications.length} application{selected.applications.length !== 1 ? "s" : ""}</p>
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
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary font-bold text-sm flex items-center justify-center">
                          {(app.worker_name ?? "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{app.worker_name}</p>
                          <p className="text-sm text-muted-foreground">{app.worker_phone}</p>
                        </div>
                        <span className={`ml-2 inline-flex text-xs font-bold rounded-full px-2.5 py-1 ${
                          app.status === "accepted"  ? "bg-green-50 text-green-700 border border-green-200" :
                          app.status === "declined"  ? "bg-red-50 text-red-600 border border-red-200" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {app.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{app.message}</p>
                      <p className="font-bold text-sm" style={{ color: "#F5A623" }}>Proposed rate: R{app.proposed_rate}</p>
                    </div>
                    {app.status === "pending" && (
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white font-bold"
                          onClick={() => setApplicationStatus(app.id, "accepted")}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="font-bold"
                          onClick={() => setApplicationStatus(app.id, "declined")}
                        >
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
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="bg-white border-b border-border">
        <div className="container mx-auto px-6 py-8 flex items-start justify-between">
          <div>
            <h1 className="font-serif text-4xl font-bold" style={{ color: "#1B2E4B" }}>My Jobs</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, {profile?.full_name?.split(" ")[0] ?? "there"} 👋
            </p>
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
            <Button
              style={{ background: "#F5A623", color: "#1B2E4B" }}
              className="font-bold"
              onClick={() => setModalState(prev => ({ ...prev, postJob: true }))}
            >
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
                      <span className={`text-xs font-bold rounded-full px-2.5 py-1 ${
                        job.status === "open" ? "bg-green-50 text-green-700" : "bg-muted text-muted-foreground"
                      }`}>{job.status}</span>
                    </div>
                    <h3 className="font-serif text-xl font-bold text-foreground">{job.title}</h3>
                    <p className="text-sm text-muted-foreground">{job.suburb}, {job.city}</p>
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
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
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PostJobModal
        open={false}
        onOpenChange={() => {}}
      />
    </div>
  );
}
