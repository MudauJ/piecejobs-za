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
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

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
type PaymentRow = Payment & { job_title?: string; job_city?: string };

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

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [jobsData, wkData, appsRaw, paysRaw] = await Promise.all([
      sbGet<Job>("jobs?select=*&order=created_at.desc"),
      sbGet<Worker>("workers?select=*&order=created_at.desc"),
      sbGet<Application & { jobs?: { title: string } }>("applications?select=*,jobs(title)&order=created_at.desc"),
      sbGet<Payment & { jobs?: { title: string; city: string } }>("payments?select=*,jobs(title,city)&order=created_at.desc"),
    ]);

    const appsData  = appsRaw.map(a => ({ ...a, job_title: a.jobs?.title ?? "—" }));
    const paysData  = paysRaw.map(p => ({ ...p, job_title: p.jobs?.title ?? "—", job_city: p.jobs?.city ?? "" }));
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

  const NAV: { key: Section; label: string; icon: React.ReactNode }[] = [
    { key: "overview",     label: "Overview",     icon: <LayoutDashboard className="h-4 w-4" /> },
    { key: "workers",      label: "Workers",      icon: <Users            className="h-4 w-4" /> },
    { key: "jobs",         label: "Jobs",         icon: <Briefcase        className="h-4 w-4" /> },
    { key: "applications", label: "Applications", icon: <FileText         className="h-4 w-4" /> },
    { key: "payments",     label: "Payments",     icon: <CreditCard       className="h-4 w-4" /> },
  ];

  return (
    <div className="flex min-h-screen" style={{ background: "#F1F5F9" }}>
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
              {section === "payments"     && <PaymentsSection payments={payments} />}
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

function PaymentsSection({ payments }: { payments: PaymentRow[] }) {
  const now        = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart  = new Date(now.getFullYear(), 0, 1);
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter,   setCityFilter]   = useState("all");
  const [dateFrom,     setDateFrom]     = useState("");
  const [dateTo,       setDateTo]       = useState("");

  const released = payments.filter(p => p.status === "released");

  const totalProcessed    = payments.reduce((s, p) => s + p.amount, 0);
  const inEscrow          = payments.filter(p => p.status === "held").reduce((s, p) => s + p.amount, 0);
  const releasedToWorkers = released.reduce((s, p) => s + p.worker_payout, 0);
  const platformEarnings  = released.reduce((s, p) => s + p.platform_fee, 0);
  const thisMonthRevenue  = released.filter(p => new Date(p.created_at) >= monthStart).reduce((s, p) => s + p.platform_fee, 0);
  const thisYearRevenue   = released.filter(p => new Date(p.created_at) >= yearStart).reduce((s, p) => s + p.platform_fee, 0);

  const revenueChart = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const revenue = released
      .filter(p => {
        const pd = new Date(p.created_at);
        return pd.getFullYear() === d.getFullYear() && pd.getMonth() === d.getMonth();
      })
      .reduce((s, p) => s + p.platform_fee, 0);
    return { month: monthNames[d.getMonth()], revenue };
  });

  const workerMap = new Map<string, { name: string; total: number }>();
  released.forEach(p => {
    const key = p.worker_id ?? "unknown";
    const existing = workerMap.get(key);
    workerMap.set(key, { name: key, total: (existing?.total ?? 0) + p.worker_payout });
  });
  const topWorkers = Array.from(workerMap.entries())
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const homeownerMap = new Map<string, number>();
  payments.forEach(p => {
    const k = p.homeowner_email ?? "Unknown";
    homeownerMap.set(k, (homeownerMap.get(k) ?? 0) + p.amount);
  });
  const topHomeowners = Array.from(homeownerMap.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const cities = Array.from(new Set(payments.map(p => p.job_city).filter(Boolean)));

  const filtered = payments.filter(p => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (cityFilter   !== "all" && p.job_city !== cityFilter) return false;
    if (dateFrom && new Date(p.created_at) < new Date(dateFrom)) return false;
    if (dateTo   && new Date(p.created_at) > new Date(dateTo + "T23:59:59")) return false;
    return true;
  });

  const statusStyle = (s: string) => {
    if (s === "held")     return "bg-amber-50 text-amber-700 border border-amber-200";
    if (s === "released") return "bg-green-50 text-green-700 border border-green-200";
    if (s === "disputed") return "bg-red-50 text-red-600 border border-red-200";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[
          { label: "Total Processed",      value: totalProcessed,    color: "#1B2E4B" },
          { label: "In Escrow (Held)",     value: inEscrow,          color: "#F5A623" },
          { label: "Released to Workers",  value: releasedToWorkers, color: "#10B981" },
          { label: "Platform Earnings",    value: platformEarnings,  color: "#7C3AED" },
          { label: "This Month's Revenue", value: thisMonthRevenue,  color: "#2D7DD2" },
          { label: "This Year's Revenue",  value: thisYearRevenue,   color: "#EF4444" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-border p-6">
            <p className="text-sm font-semibold text-muted-foreground">{s.label}</p>
            <p className="font-serif text-3xl font-extrabold mt-1" style={{ color: s.color }}>R{s.value.toLocaleString("en-ZA")}</p>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-2xl border border-border p-6">
        <h3 className="font-serif font-bold text-lg mb-5" style={{ color: "#1B2E4B" }}>Platform Revenue — Last 12 Months</h3>
        {revenueChart.every(d => d.revenue === 0) ? (
          <p className="text-sm text-muted-foreground text-center py-10">No revenue data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={revenueChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `R${v}`} tick={{ fontSize: 11 }} width={65} />
              <Tooltip formatter={(v: number) => [`R${v.toLocaleString("en-ZA")}`, "Revenue"]} />
              <Line type="monotone" dataKey="revenue" stroke="#7C3AED" strokeWidth={2.5} dot={{ r: 4, fill: "#7C3AED" }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top workers & homeowners */}
      <div className="grid md:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="font-serif font-bold text-base" style={{ color: "#1B2E4B" }}>Top 5 Workers by Earnings</h3>
          </div>
          {topWorkers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No data yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {topWorkers.map((w, i) => (
                <div key={w.id} className="flex items-center justify-between px-6 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="text-sm font-semibold text-muted-foreground truncate max-w-[180px]">{w.name}</span>
                  </div>
                  <span className="font-bold text-sm" style={{ color: "#2D7DD2" }}>R{w.total.toLocaleString("en-ZA")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="font-serif font-bold text-base" style={{ color: "#1B2E4B" }}>Top 5 Homeowners by Spend</h3>
          </div>
          {topHomeowners.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No data yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {topHomeowners.map((h, i) => (
                <div key={h.name} className="flex items-center justify-between px-6 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="text-sm font-semibold text-muted-foreground truncate max-w-[180px]">{h.name}</span>
                  </div>
                  <span className="font-bold text-sm" style={{ color: "#F5A623" }}>R{h.total.toLocaleString("en-ZA")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transactions table with filters */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border space-y-3">
          <h3 className="font-serif font-bold text-lg" style={{ color: "#1B2E4B" }}>
            Transactions ({filtered.length}{filtered.length !== payments.length ? ` of ${payments.length}` : ""})
          </h3>
          <div className="flex flex-wrap gap-3 items-center">
            {/* Status filter */}
            <div className="flex gap-1.5">
              {["all","held","released","disputed"].map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all capitalize ${
                    statusFilter === f ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border hover:border-primary"
                  }`}
                >{f}</button>
              ))}
            </div>
            {/* City filter */}
            {cities.length > 0 && (
              <select
                value={cityFilter}
                onChange={e => setCityFilter(e.target.value)}
                className="text-xs font-semibold border border-border rounded-lg px-3 py-1.5 bg-white text-foreground focus:outline-none focus:border-primary"
              >
                <option value="all">All Cities</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            {/* Date range */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="border border-border rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-primary" />
              <span>–</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="border border-border rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-primary" />
            </div>
            {(statusFilter !== "all" || cityFilter !== "all" || dateFrom || dateTo) && (
              <button
                onClick={() => { setStatusFilter("all"); setCityFilter("all"); setDateFrom(""); setDateTo(""); }}
                className="text-xs text-muted-foreground underline hover:text-foreground"
              >Clear filters</button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Job</th>
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground">City</th>
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
              {filtered.map(p => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-5 py-3 font-semibold text-foreground max-w-[160px] truncate">{p.job_title}</td>
                  <td className="px-5 py-3 text-muted-foreground">{p.job_city || "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground max-w-[120px] truncate">{p.homeowner_email ?? "—"}</td>
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
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center text-muted-foreground py-12">No payments match the selected filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
