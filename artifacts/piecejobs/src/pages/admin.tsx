import { useState, useEffect } from "react";
import { useHashLocation } from "wouter/use-hash-location";
import { type Job, type Worker, type Application, type Payment } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LayoutDashboard, Users, Briefcase, FileText, LogOut,
  MapPin, ShieldCheck, ShieldOff, Trash2, CheckCircle2, CreditCard,
} from "lucide-react";

const SB_URL = "https://vnrvwfialfvduvetoewa.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZucnZ3ZmlhbGZ2ZHV2ZXRvZXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NTUzMjYsImV4cCI6MjA5ODMzMTMyNn0.5mfElVG_tuhBLLP4BKdQ7v5zXLIi51LpMbZUmKZ8A9w";

function sbHeaders(extra?: Record<string, string>) {
  return {
    "apikey":        SB_KEY,
    "Authorization": `Bearer ${SB_KEY}`,
    "Content-Type":  "application/json",
    ...extra,
  };
}

async function sbGet<T>(path: string): Promise<T[]> {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: sbHeaders() });
  return r.ok ? r.json() : [];
}

type Section = "overview" | "workers" | "jobs" | "applications" | "payments";
type Stats = { jobs: number; workers: number; applications: number; pending: number; platformEarnings: number };

type PaymentRow = Payment & { job_title?: string };

export default function Admin() {
  const { signOut } = useAuth();
  const [, setLocation] = useHashLocation();
  const [section, setSection]     = useState<Section>("overview");
  const [loading, setLoading]     = useState(true);
  const [stats, setStats]         = useState<Stats>({ jobs: 0, workers: 0, applications: 0, pending: 0, platformEarnings: 0 });
  const [workers, setWorkers]     = useState<Worker[]>([]);
  const [jobs, setJobs]           = useState<Job[]>([]);
  const [applications, setApplications] = useState<(Application & { job_title?: string })[]>([]);
  const [payments, setPayments]   = useState<PaymentRow[]>([]);
  const [payFilter, setPayFilter] = useState<string>("all");

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [jobsData, wkData, appsRaw, paysRaw] = await Promise.all([
      sbGet<Job>("jobs?select=*&order=created_at.desc"),
      sbGet<Worker>("workers?select=*&order=created_at.desc"),
      sbGet<Application & { jobs?: { title: string } }>("applications?select=*,jobs(title)&order=created_at.desc"),
      sbGet<Payment & { jobs?: { title: string } }>("payments?select=*,jobs(title)&order=created_at.desc"),
    ]);

    const appsData  = appsRaw.map(a => ({ ...a, job_title: a.jobs?.title ?? "—" }));
    const paysData  = paysRaw.map(p => ({ ...p, job_title: p.jobs?.title ?? "—" }));
    const earnings  = paysData.filter(p => p.status === "released").reduce((s, p) => s + p.platform_fee, 0);

    setJobs(jobsData);
    setWorkers(wkData);
    setApplications(appsData);
    setPayments(paysData);
    setStats({
      jobs:             jobsData.length,
      workers:          wkData.length,
      applications:     appsData.length,
      pending:          wkData.filter(w => !w.is_verified).length,
      platformEarnings: earnings,
    });
    setLoading(false);
  }

  async function verifyWorker(id: string) {
    await fetch(`${SB_URL}/rest/v1/workers?id=eq.${id}`, {
      method: "PATCH",
      headers: sbHeaders({ "Prefer": "return=minimal" }),
      body: JSON.stringify({ is_verified: true }),
    });
    setWorkers(prev => prev.map(w => w.id === id ? { ...w, is_verified: true } : w));
    setStats(s => ({ ...s, pending: Math.max(0, s.pending - 1) }));
  }

  async function removeWorker(id: string) {
    if (!confirm("Remove this worker? This cannot be undone.")) return;
    await fetch(`${SB_URL}/rest/v1/workers?id=eq.${id}`, {
      method: "DELETE",
      headers: sbHeaders({ "Prefer": "return=minimal" }),
    });
    setWorkers(prev => prev.filter(w => w.id !== id));
    setStats(s => ({ ...s, workers: s.workers - 1 }));
  }

  async function removeJob(id: string) {
    if (!confirm("Remove this job? This cannot be undone.")) return;
    await fetch(`${SB_URL}/rest/v1/jobs?id=eq.${id}`, {
      method: "DELETE",
      headers: sbHeaders({ "Prefer": "return=minimal" }),
    });
    setJobs(prev => prev.filter(j => j.id !== id));
    setStats(s => ({ ...s, jobs: s.jobs - 1 }));
  }

  async function handleSignOut() {
    await signOut();
    setLocation("/login");
  }

  const filteredPayments = payFilter === "all"
    ? payments
    : payments.filter(p => p.status === payFilter);

  const NAV: { key: Section; label: string; icon: React.ReactNode }[] = [
    { key: "overview",     label: "Overview",     icon: <LayoutDashboard className="h-4 w-4" /> },
    { key: "workers",      label: "Workers",      icon: <Users            className="h-4 w-4" /> },
    { key: "jobs",         label: "Jobs",         icon: <Briefcase        className="h-4 w-4" /> },
    { key: "applications", label: "Applications", icon: <FileText         className="h-4 w-4" /> },
    { key: "payments",     label: "Payments",     icon: <CreditCard       className="h-4 w-4" /> },
  ];

  return (
    <div className="flex min-h-screen" style={{ background: "#F1F5F9" }}>
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col" style={{ background: "#1B2E4B" }}>
        <div className="flex items-center gap-2 px-5 py-5 border-b border-white/10">
          <MapPin className="h-5 w-5 text-white/80" />
          <span className="font-serif font-bold text-white text-sm leading-tight">
            PieceJobs ZA<br />
            <span className="font-sans text-white/60 text-xs font-normal">Admin</span>
          </span>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-3">
          {NAV.map(n => (
            <button
              key={n.key}
              onClick={() => setSection(n.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                section === n.key
                  ? "bg-white/15 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/8"
              }`}
            >
              {n.icon}{n.label}
              {n.key === "workers" && stats.pending > 0 && (
                <span className="ml-auto text-xs font-bold bg-amber-400 text-amber-900 rounded-full px-1.5 py-0.5">
                  {stats.pending}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-white/60 hover:text-white hover:bg-white/8 transition-colors"
          >
            <LogOut className="h-4 w-4" />Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-border px-8 py-4 flex items-center justify-between">
          <h1 className="font-serif font-bold text-xl" style={{ color: "#1B2E4B" }}>
            {NAV.find(n => n.key === section)?.label ?? "Admin"}
          </h1>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-1.5" />Logout
          </Button>
        </header>

        <main className="flex-1 p-8">
          {loading ? (
            <div className="space-y-4">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
            </div>
          ) : (
            <>
              {section === "overview"     && <OverviewSection stats={stats} />}
              {section === "workers"      && <WorkersSection  workers={workers}  onVerify={verifyWorker} onRemove={removeWorker} />}
              {section === "jobs"         && <JobsSection     jobs={jobs}        onRemove={removeJob} />}
              {section === "applications" && <ApplicationsSection applications={applications} />}
              {section === "payments"     && (
                <PaymentsSection
                  payments={filteredPayments}
                  allPayments={payments}
                  filter={payFilter}
                  onFilter={setPayFilter}
                  platformEarnings={stats.platformEarnings}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color, prefix }: { label: string; value: number | string; sub?: string; color: string; prefix?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-border p-6">
      <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      <p className="font-serif text-4xl font-extrabold mt-1" style={{ color }}>
        {prefix}{typeof value === "number" ? value.toLocaleString("en-ZA") : value}
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function OverviewSection({ stats }: { stats: Stats }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
      <StatCard label="Total Jobs Posted"     value={stats.jobs}         color="#2D7DD2" />
      <StatCard label="Workers Registered"    value={stats.workers}      color="#1B2E4B" />
      <StatCard label="Total Applications"    value={stats.applications} color="#10B981" />
      <StatCard label="Pending Verifications" value={stats.pending}      color="#F5A623" sub="Workers awaiting verification" />
      <StatCard label="Platform Earnings"     value={stats.platformEarnings} color="#7C3AED" prefix="R" sub="From released payments" />
    </div>
  );
}

function WorkersSection({ workers, onVerify, onRemove }: {
  workers: Worker[];
  onVerify: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="font-serif font-bold text-lg" style={{ color: "#1B2E4B" }}>All Workers ({workers.length})</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Name</th>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Skills</th>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground">City</th>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Phone</th>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Registered</th>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Status</th>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {workers.map(w => (
              <tr
                key={w.id}
                className={`border-b border-border last:border-0 transition-colors ${
                  !w.is_verified ? "bg-amber-50" : "hover:bg-muted/20"
                }`}
              >
                <td className="px-5 py-3 font-semibold text-foreground">{w.first_name} {w.last_name}</td>
                <td className="px-5 py-3 text-muted-foreground max-w-[160px] truncate">{(w.skills ?? []).join(", ") || "—"}</td>
                <td className="px-5 py-3 text-muted-foreground">{w.city}</td>
                <td className="px-5 py-3 text-muted-foreground">{w.phone}</td>
                <td className="px-5 py-3 text-muted-foreground">{new Date(w.created_at).toLocaleDateString("en-ZA")}</td>
                <td className="px-5 py-3">
                  {w.is_verified
                    ? <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1"><ShieldCheck className="h-3 w-3" />Verified</span>
                    : <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1"><ShieldOff className="h-3 w-3" />Pending</span>}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    {!w.is_verified && (
                      <Button size="sm" className="h-7 text-xs font-bold bg-green-600 hover:bg-green-700 text-white" onClick={() => onVerify(w.id)}>
                        <CheckCircle2 className="h-3 w-3 mr-1" />Verify
                      </Button>
                    )}
                    <Button size="sm" variant="destructive" className="h-7 text-xs font-bold" onClick={() => onRemove(w.id)}>
                      <Trash2 className="h-3 w-3 mr-1" />Remove
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {workers.length === 0 && (
              <tr><td colSpan={7} className="text-center text-muted-foreground py-12">No workers yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function JobsSection({ jobs, onRemove }: { jobs: Job[]; onRemove: (id: string) => void }) {
  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="font-serif font-bold text-lg" style={{ color: "#1B2E4B" }}>All Jobs ({jobs.length})</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Title</th>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Category</th>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground">City</th>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Budget</th>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Posted by</th>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Date</th>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Status</th>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Action</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map(j => (
              <tr key={j.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                <td className="px-5 py-3 font-semibold text-foreground max-w-[200px] truncate">{j.title}</td>
                <td className="px-5 py-3 text-muted-foreground">{j.category}</td>
                <td className="px-5 py-3 text-muted-foreground">{j.city}</td>
                <td className="px-5 py-3 font-bold" style={{ color: "#F5A623" }}>R{j.budget}</td>
                <td className="px-5 py-3 text-muted-foreground">{j.poster_name}</td>
                <td className="px-5 py-3 text-muted-foreground">{new Date(j.created_at).toLocaleDateString("en-ZA")}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex text-xs font-bold rounded-full px-2.5 py-1 ${j.status === "open" ? "bg-green-50 text-green-700 border border-green-200" : "bg-muted text-muted-foreground"}`}>
                    {j.status}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <Button size="sm" variant="destructive" className="h-7 text-xs font-bold" onClick={() => onRemove(j.id)}>
                    <Trash2 className="h-3 w-3 mr-1" />Remove
                  </Button>
                </td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr><td colSpan={8} className="text-center text-muted-foreground py-12">No jobs yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ApplicationsSection({ applications }: { applications: (Application & { job_title?: string })[] }) {
  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="font-serif font-bold text-lg" style={{ color: "#1B2E4B" }}>All Applications ({applications.length})</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Job</th>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Applicant</th>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Phone</th>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Message</th>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Rate</th>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Status</th>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Date</th>
            </tr>
          </thead>
          <tbody>
            {applications.map(a => (
              <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                <td className="px-5 py-3 font-semibold text-foreground max-w-[180px] truncate">{a.job_title}</td>
                <td className="px-5 py-3 text-muted-foreground">{a.worker_name}</td>
                <td className="px-5 py-3 text-muted-foreground">{a.worker_phone}</td>
                <td className="px-5 py-3 text-muted-foreground max-w-[200px] truncate">{a.message}</td>
                <td className="px-5 py-3 font-bold" style={{ color: "#F5A623" }}>R{a.proposed_rate}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex text-xs font-bold rounded-full px-2.5 py-1 ${
                    a.status === "accepted" ? "bg-green-50 text-green-700 border border-green-200" :
                    a.status === "declined" ? "bg-red-50 text-red-600 border border-red-200" :
                    "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}>{a.status}</span>
                </td>
                <td className="px-5 py-3 text-muted-foreground">{new Date(a.created_at).toLocaleDateString("en-ZA")}</td>
              </tr>
            ))}
            {applications.length === 0 && (
              <tr><td colSpan={7} className="text-center text-muted-foreground py-12">No applications yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PaymentsSection({ payments, allPayments, filter, onFilter, platformEarnings }: {
  payments: PaymentRow[];
  allPayments: PaymentRow[];
  filter: string;
  onFilter: (f: string) => void;
  platformEarnings: number;
}) {
  const total   = allPayments.reduce((s, p) => s + p.amount, 0);
  const held    = allPayments.filter(p => p.status === "held").reduce((s, p) => s + p.amount, 0);

  const statusStyle = (s: string) => {
    if (s === "held")     return "bg-amber-50 text-amber-700 border border-amber-200";
    if (s === "released") return "bg-green-50 text-green-700 border border-green-200";
    if (s === "disputed") return "bg-red-50 text-red-600 border border-red-200";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-border p-6">
          <p className="text-sm font-semibold text-muted-foreground">Total Processed</p>
          <p className="font-serif text-3xl font-extrabold mt-1" style={{ color: "#1B2E4B" }}>R{total.toLocaleString("en-ZA")}</p>
          <p className="text-xs text-muted-foreground mt-1">{allPayments.length} payment{allPayments.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border p-6">
          <p className="text-sm font-semibold text-muted-foreground">In Escrow (held)</p>
          <p className="font-serif text-3xl font-extrabold mt-1 text-amber-600">R{held.toLocaleString("en-ZA")}</p>
          <p className="text-xs text-muted-foreground mt-1">{allPayments.filter(p => p.status === "held").length} active jobs</p>
        </div>
        <div className="bg-white rounded-2xl border border-border p-6">
          <p className="text-sm font-semibold text-muted-foreground">Platform Earnings</p>
          <p className="font-serif text-3xl font-extrabold mt-1" style={{ color: "#7C3AED" }}>R{platformEarnings.toLocaleString("en-ZA")}</p>
          <p className="text-xs text-muted-foreground mt-1">From released payments</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4 flex-wrap">
          <h2 className="font-serif font-bold text-lg" style={{ color: "#1B2E4B" }}>
            Payments ({payments.length}{filter !== "all" ? ` — ${filter}` : ""})
          </h2>
          <div className="flex gap-2">
            {["all", "held", "released", "disputed"].map(f => (
              <button
                key={f}
                onClick={() => onFilter(f)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all capitalize ${
                  filter === f
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-muted-foreground border-border hover:border-primary"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Job</th>
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Homeowner</th>
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Amount</th>
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Platform Fee</th>
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Worker Payout</th>
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Payout Method</th>
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Status</th>
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-5 py-3 font-semibold text-foreground max-w-[180px] truncate">{p.job_title}</td>
                  <td className="px-5 py-3 text-muted-foreground max-w-[140px] truncate">{p.homeowner_email ?? "—"}</td>
                  <td className="px-5 py-3 font-bold" style={{ color: "#1B2E4B" }}>R{p.amount}</td>
                  <td className="px-5 py-3 font-semibold text-purple-700">R{p.platform_fee}</td>
                  <td className="px-5 py-3 font-semibold" style={{ color: "#F5A623" }}>R{p.worker_payout}</td>
                  <td className="px-5 py-3 text-muted-foreground capitalize">{p.payout_method === "flash" ? "Flash/Kazang" : "Bank Transfer"}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex text-xs font-bold rounded-full px-2.5 py-1 capitalize ${statusStyle(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{new Date(p.created_at).toLocaleDateString("en-ZA")}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={8} className="text-center text-muted-foreground py-12">No payments found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
