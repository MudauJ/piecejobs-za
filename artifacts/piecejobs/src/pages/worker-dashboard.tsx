import { useState, useEffect } from "react";
import { supabase, type Worker, type Job, type Application, CATEGORIES, CITIES } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Pencil, Save, X, Briefcase, CheckCircle2, Clock, XCircle } from "lucide-react";
import type { ModalState } from "@/App";

type Tab = "profile" | "applications" | "jobs";
type AppWithJob = Application & { job_title?: string; job_suburb?: string; job_city?: string };

export default function WorkerDashboard({ setModalState }: { setModalState: React.Dispatch<React.SetStateAction<ModalState>> }) {
  const { user, profile }       = useAuth();
  const [tab, setTab]           = useState<Tab>("profile");
  const [worker, setWorker]     = useState<Worker | null>(null);
  const [applications, setApplications] = useState<AppWithJob[]>([]);
  const [matchingJobs, setMatchingJobs] = useState<Job[]>([]);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState(false);
  const [saving, setSaving]     = useState(false);

  const [editSuburb, setEditSuburb] = useState("");
  const [editCity, setEditCity]     = useState("");
  const [editRate, setEditRate]     = useState("");
  const [editSkills, setEditSkills] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchAll();
  }, [user]);

  async function fetchAll() {
    setLoading(true);
    const [wRes, appRes] = await Promise.all([
      supabase.from("workers").select("*").eq("user_id", user!.id).single(),
      supabase.from("applications")
        .select("*, jobs(title,suburb,city)")
        .eq("applicant_id", user!.id)
        .order("created_at", { ascending: false }),
    ]);

    const w = wRes.data as Worker | null;
    setWorker(w);

    const apps = (appRes.data ?? []).map((a: Application & { jobs?: { title: string; suburb: string; city: string } }) => ({
      ...a,
      job_title:  a.jobs?.title  ?? "Unknown job",
      job_suburb: a.jobs?.suburb ?? "",
      job_city:   a.jobs?.city   ?? "",
    }));
    setApplications(apps);

    const query = supabase.from("jobs").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(20);
    const { data: jData } = w?.skills?.length
      ? await query.in("category", w.skills)
      : await query;
    setMatchingJobs(jData ?? []);

    setLoading(false);
  }

  function startEdit() {
    if (!worker) return;
    setEditSuburb(worker.suburb);
    setEditCity(worker.city);
    setEditRate(String(worker.hourly_rate));
    setEditSkills([...(worker.skills ?? [])]);
    setEditing(true);
  }

  async function saveEdit() {
    if (!worker) return;
    setSaving(true);
    const { data } = await supabase
      .from("workers")
      .update({ suburb: editSuburb, city: editCity, hourly_rate: Number(editRate) || 0, skills: editSkills })
      .eq("id", worker.id)
      .select()
      .single();
    if (data) setWorker(data);
    setSaving(false);
    setEditing(false);
  }

  function toggleSkill(skill: string) {
    setEditSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
  }

  const SKILL_CATS = CATEGORIES.filter(c => c !== "Other");

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "profile",      label: "My Profile",      icon: <MapPin       className="h-4 w-4" /> },
    { key: "applications", label: "My Applications", icon: <Briefcase    className="h-4 w-4" /> },
    { key: "jobs",         label: "Available Jobs",  icon: <CheckCircle2 className="h-4 w-4" /> },
  ];

  return (
    <div className="bg-background min-h-screen">
      <div className="bg-white border-b border-border">
        <div className="container mx-auto px-6 py-8">
          <h1 className="font-serif text-4xl font-bold" style={{ color: "#1B2E4B" }}>Worker Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome, {profile?.full_name?.split(" ")[0] ?? "there"} 👋</p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-white rounded-xl p-1 border border-border w-fit">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t.key ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}</div>
        ) : (
          <>
            {/* PROFILE TAB */}
            {tab === "profile" && (
              <div className="max-w-2xl">
                {!worker ? (
                  <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-border">
                    <p className="text-4xl mb-3">👷</p>
                    <p className="font-semibold text-foreground mb-1">Profile not set up yet</p>
                    <p className="text-muted-foreground text-sm">Your worker profile will appear here after setup.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-border p-8 space-y-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary font-extrabold text-xl flex items-center justify-center">
                          {worker.first_name[0]}{worker.last_name[0]}
                        </div>
                        <div>
                          <h2 className="font-serif font-bold text-2xl" style={{ color: "#1B2E4B" }}>
                            {worker.first_name} {worker.last_name}
                          </h2>
                          <p className="text-sm text-muted-foreground">{worker.phone}</p>
                          {worker.is_verified && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 rounded-full px-2.5 py-0.5 mt-1">
                              ✓ Verified
                            </span>
                          )}
                        </div>
                      </div>
                      {!editing && (
                        <Button size="sm" variant="outline" onClick={startEdit}>
                          <Pencil className="h-3.5 w-3.5 mr-1.5" />Edit
                        </Button>
                      )}
                    </div>

                    {editing ? (
                      <div className="space-y-5 border-t border-border pt-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold mb-1.5">City</label>
                            <Select value={editCity} onValueChange={setEditCity}>
                              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                              <SelectContent>{CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold mb-1.5">Suburb</label>
                            <Input className="h-10" value={editSuburb} onChange={e => setEditSuburb(e.target.value)} />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold mb-1.5">Hourly Rate (ZAR)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R</span>
                            <Input className="h-10 pl-7" type="number" value={editRate} onChange={e => setEditRate(e.target.value)} />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold mb-2">Skills (select all that apply)</label>
                          <div className="flex flex-wrap gap-2">
                            {SKILL_CATS.map(s => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => toggleSkill(s)}
                                className={`text-sm font-medium px-3 py-1.5 rounded-full border transition-all ${
                                  editSkills.includes(s)
                                    ? "bg-primary text-white border-primary"
                                    : "bg-white text-foreground border-border hover:border-primary"
                                }`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                          <Button onClick={saveEdit} disabled={saving} className="font-bold" style={{ background: "#2D7DD2" }}>
                            <Save className="h-3.5 w-3.5 mr-1.5" />{saving ? "Saving..." : "Save changes"}
                          </Button>
                          <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                            <X className="h-3.5 w-3.5 mr-1.5" />Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-5 border-t border-border pt-6">
                        <div>
                          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Location</p>
                          <p className="font-semibold mt-1">{worker.suburb}, {worker.city}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Hourly Rate</p>
                          <p className="font-bold text-lg mt-1" style={{ color: "#F5A623" }}>R{worker.hourly_rate}/hr</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-2">Skills</p>
                          {(worker.skills ?? []).length === 0 ? (
                            <p className="text-sm text-muted-foreground">No skills added yet. Click Edit to add your skills.</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {worker.skills.map(s => (
                                <span key={s} className="text-sm font-medium px-3 py-1 rounded-full bg-primary/10 text-primary">{s}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* APPLICATIONS TAB */}
            {tab === "applications" && (
              <div className="space-y-4">
                {applications.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-border">
                    <p className="text-4xl mb-3">📝</p>
                    <p className="font-semibold text-foreground mb-1">No applications yet</p>
                    <p className="text-muted-foreground text-sm">Browse available jobs and apply to get started.</p>
                    <Button className="mt-5 font-bold" style={{ background: "#2D7DD2" }} onClick={() => setTab("jobs")}>
                      Browse jobs
                    </Button>
                  </div>
                ) : applications.map(app => (
                  <div key={app.id} className="bg-white border border-border rounded-2xl p-6 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                      <div className="space-y-1.5">
                        <h3 className="font-serif font-bold text-lg text-foreground">{app.job_title}</h3>
                        {(app.job_suburb || app.job_city) && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            {[app.job_suburb, app.job_city].filter(Boolean).join(", ")}
                          </p>
                        )}
                        <p className="text-sm font-bold" style={{ color: "#F5A623" }}>Your rate: R{app.proposed_rate}</p>
                        <p className="text-xs text-muted-foreground">Applied {new Date(app.created_at).toLocaleDateString("en-ZA")}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 text-sm font-bold rounded-full px-3 py-1.5 shrink-0 ${
                        app.status === "accepted" ? "bg-green-50 text-green-700 border border-green-200" :
                        app.status === "declined" ? "bg-red-50 text-red-600 border border-red-200" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {app.status === "accepted" ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                         app.status === "declined" ? <XCircle      className="h-3.5 w-3.5" /> :
                         <Clock className="h-3.5 w-3.5" />}
                        {app.status === "accepted" ? "Accepted" : app.status === "declined" ? "Declined" : "Pending"}
                      </span>
                    </div>

                    {app.status === "accepted" && (
                      <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm font-semibold text-green-800">
                        🎉 You got the job! Contact the homeowner to confirm details.
                      </div>
                    )}
                    {app.status === "declined" && (
                      <p className="text-sm text-muted-foreground italic">Keep applying — other jobs are waiting!</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* JOBS TAB */}
            {tab === "jobs" && (
              <div className="space-y-4">
                {worker?.skills?.length ? (
                  <p className="text-sm text-muted-foreground mb-2">
                    Showing jobs matching your skills: <strong>{worker.skills.join(", ")}</strong>
                  </p>
                ) : null}
                {matchingJobs.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-border">
                    <p className="text-4xl mb-3">🔍</p>
                    <p className="font-semibold text-foreground mb-1">No matching jobs right now</p>
                    <p className="text-muted-foreground text-sm">Check back soon — new jobs are posted regularly.</p>
                  </div>
                ) : matchingJobs.map(job => (
                  <div key={job.id} className="bg-white border border-border rounded-2xl p-6 hover:shadow-md hover:border-primary/30 transition-all">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <span className="inline-flex text-xs font-bold bg-primary/10 text-primary rounded-full px-2.5 py-1">{job.category}</span>
                        <h3 className="font-serif font-bold text-xl text-foreground">{job.title}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />{job.suburb}, {job.city}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
                      </div>
                      <div className="flex md:flex-col items-center md:items-end justify-between md:justify-between border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6 md:min-w-[130px]">
                        <p className="font-serif text-3xl font-extrabold" style={{ color: "#1B2E4B" }}>R{job.budget}</p>
                        <Button
                          size="sm"
                          className="mt-3 font-bold bg-primary hover:bg-primary/90 text-white"
                          onClick={() => setModalState(prev => ({ ...prev, applyJob: job.id }))}
                        >
                          Apply Now
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
