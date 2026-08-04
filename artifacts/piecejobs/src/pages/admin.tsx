import { useState, useEffect, useCallback } from "react";
import { useHashLocation } from "wouter/use-hash-location";
import { type Job, type Worker, type Application, type Payment, type EmailNotification, CATEGORY_EMOJI, getBadgeInfo, supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  LayoutDashboard, Users, Briefcase, FileText, LogOut,
  MapPin, ShieldCheck, ShieldOff, Trash2, CheckCircle2, CreditCard,
  AlertTriangle, Star, ChevronRight, PauseCircle, Send, Flag, RefreshCw,
  RotateCcw, Mail, BarChart2, MessageCircle, Bell,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { notifyWorkerVerified } from "@/lib/notify";

const SB_URL = "https://vnrvwfialfvduvetoewa.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZucnZ3ZmlhbGZ2ZHV2ZXRvZXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NTUzMjYsImV4cCI6MjA5ODMzMTMyNn0.5mfElVG_tuhBLLP4BKdQ7v5zXLIi51LpMbZUmKZ8A9w";

function sbHeaders(extra?: Record<string, string>) {
  return { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Content-Type": "application/json", ...extra };
}
async function sbGet<T>(path: string): Promise<T[]> {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: sbHeaders() });
  return r.ok ? r.json() : [];
}
async function sbPatch(table: string, id: string, body: Record<string, unknown>) {
  return fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: sbHeaders({ "Prefer": "return=minimal" }),
    body: JSON.stringify(body),
  });
}

type Section = "overview" | "workers" | "homeowners" | "jobs" | "applications" | "payments" | "messages" | "notifications" | "emails" | "analytics" | "users";
type Stats = { jobs: number; workers: number; applications: number; pending: number; platformEarnings: number };
type PaymentRow   = Payment & { job_title?: string; job_city?: string };
type WorkerFull   = Worker & { is_suspended?: boolean };
type JobFull      = Job    & { is_flagged?: boolean };
type Review       = { id: string; worker_id: string; job_id?: string; reviewer_name?: string; rating: number; comment?: string; created_at: string };
type WorkerDoc    = { id: string; worker_id: string; document_type: string; file_url: string; file_name?: string; status: string; uploaded_at: string };
type MessageRow   = { id: string; job_id: string; sender_id?: string; sender_name?: string; sender_role?: string; content: string; created_at: string; job_title?: string };
type NotifRow     = { id: string; worker_id: string; job_id?: string; message: string; status: string; created_at: string; worker_name?: string; job_title?: string };
type HomeownerProfile = {
  id: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  city?: string;
  suburb?: string;
  role: string;
  is_suspended?: boolean;
  created_at: string;
};

export default function Admin() {
  const { signOut } = useAuth();
  const [, setLocation] = useHashLocation();
  const [section, setSection]         = useState<Section>("overview");
  const [loading, setLoading]         = useState(true);
  const [stats, setStats]             = useState<Stats>({ jobs: 0, workers: 0, applications: 0, pending: 0, platformEarnings: 0 });
  const [workers, setWorkers]         = useState<WorkerFull[]>([]);
  const [jobs, setJobs]               = useState<JobFull[]>([]);
  const [applications, setApplications] = useState<(Application & { job_title?: string; job_poster?: string })[]>([]);
  const [payments, setPayments]       = useState<PaymentRow[]>([]);
  const [emailNotifications, setEmailNotifications] = useState<EmailNotification[]>([]);
  const [messages, setMessages]       = useState<MessageRow[]>([]);
  const [notifQueue, setNotifQueue]   = useState<NotifRow[]>([]);
  const [homeowners, setHomeowners]   = useState<HomeownerProfile[]>([]);

  const [pendingDocs, setPendingDocs]         = useState(0);
  const [selectedWorker, setSelectedWorker]   = useState<WorkerFull | null>(null);
  const [selectedJob, setSelectedJob]         = useState<JobFull | null>(null);
  const [selectedApp, setSelectedApp]         = useState<(Application & { job_title?: string; job_poster?: string }) | null>(null);
  const [selectedHomeowner, setSelectedHomeowner] = useState<HomeownerProfile | null>(null);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [jobsData, wkData, appsRaw, paysRaw] = await Promise.all([
      sbGet<JobFull>("jobs?select=*&order=created_at.desc"),
      sbGet<WorkerFull>("workers?select=*&order=created_at.desc"),
      sbGet<Application & { jobs?: { title: string; poster_name?: string } }>("applications?select=*,jobs(title,poster_name)&order=created_at.desc"),
      sbGet<Payment & { jobs?: { title: string; city: string } }>("payments?select=*,jobs(title,city)&order=created_at.desc"),
    ]);
    const appsData = appsRaw.map(a => ({ ...a, job_title: a.jobs?.title ?? "—", job_poster: a.jobs?.poster_name ?? "—" }));
    const paysData = paysRaw.map(p => ({ ...p, job_title: p.jobs?.title ?? "—", job_city: p.jobs?.city ?? "" }));
    const earnings = paysData.filter(p => p.status === "released").reduce((s, p) => s + p.platform_fee, 0);
    setJobs(jobsData);
    setWorkers(wkData);
    setApplications(appsData);
    setPayments(paysData);

    const [docsRaw, emailsData, msgsRaw, notifsRaw] = await Promise.all([
      sbGet<{ id: string }>("worker_documents?status=eq.pending&select=id"),
      sbGet<EmailNotification>("email_notifications?order=created_at.desc&limit=200"),
      sbGet<MessageRow>("messages?select=*,jobs(title)&order=created_at.desc&limit=500"),
      sbGet<NotifRow & { workers?: { first_name: string; last_name: string }; jobs?: { title: string } }>(
        "notifications_queue?select=*,workers(first_name,last_name),jobs(title)&order=created_at.desc&limit=300"
      ),
    ]);
    setPendingDocs(docsRaw.length);
    setEmailNotifications(emailsData);
    setMessages(msgsRaw.map((m: MessageRow & { jobs?: { title: string } }) => ({
      ...m, job_title: (m as MessageRow & { jobs?: { title: string } }).jobs?.title ?? "Unknown job",
    })));
    setNotifQueue(notifsRaw.map((n: NotifRow & { workers?: { first_name: string; last_name: string }; jobs?: { title: string } }) => ({
      ...n,
      worker_name: n.workers ? `${n.workers.first_name} ${n.workers.last_name}` : "Unknown",
      job_title:   n.jobs?.title ?? "—",
    })));
    const homeownersData = await sbGet<HomeownerProfile>("user_profiles?role=eq.homeowner&order=created_at.desc");
    setHomeowners(homeownersData);

    setStats({ jobs: jobsData.length, workers: wkData.length, applications: appsData.length, pending: wkData.filter(w => !w.is_verified).length, platformEarnings: earnings });
    setLoading(false);
  }

  async function verifyWorker(id: string) {
    const res = await sbPatch("workers", id, { is_verified: true });
    if (!res.ok) return;
    setWorkers(prev => prev.map(w => w.id === id ? { ...w, is_verified: true } : w));
    setStats(s => ({ ...s, pending: Math.max(0, s.pending - 1) }));
    const worker = workers.find(w => w.id === id);
    if (worker?.user_id) {
      const { data: sessionData } = await supabase.auth.getSession();
      const adminToken = sessionData?.session?.access_token;
      if (adminToken) {
        notifyWorkerVerified({
          workerUserId: worker.user_id,
          workerName: `${worker.first_name} ${worker.last_name}`.trim(),
          adminToken,
        });
      }
    }
  }
  async function suspendWorker(id: string, suspended: boolean) {
    await sbPatch("workers", id, { is_suspended: suspended });
    setWorkers(prev => prev.map(w => w.id === id ? { ...w, is_suspended: suspended } : w));
  }
  async function removeWorker(id: string) {
    if (!confirm("Remove this worker? This cannot be undone.")) return;
    await fetch(`${SB_URL}/rest/v1/workers?id=eq.${id}`, { method: "DELETE", headers: sbHeaders({ "Prefer": "return=minimal" }) });
    setWorkers(prev => prev.filter(w => w.id !== id));
    setSelectedWorker(null);
    setStats(s => ({ ...s, workers: s.workers - 1 }));
  }
  async function suspendHomeowner(id: string, suspended: boolean) {
    await sbPatch("user_profiles", id, { is_suspended: suspended });
    setHomeowners(prev => prev.map(h => h.id === id ? { ...h, is_suspended: suspended } : h));
    setSelectedHomeowner(prev => prev?.id === id ? { ...prev, is_suspended: suspended } : prev);
  }
  async function removeHomeowner(id: string) {
    if (!confirm("Remove this homeowner? This cannot be undone.")) return;
    await fetch(`${SB_URL}/rest/v1/user_profiles?id=eq.${id}`, { method: "DELETE", headers: sbHeaders({ "Prefer": "return=minimal" }) });
    setHomeowners(prev => prev.filter(h => h.id !== id));
    setSelectedHomeowner(null);
  }
  async function removeJob(id: string) {
    if (!confirm("Remove this job? This cannot be undone.")) return;
    await fetch(`${SB_URL}/rest/v1/jobs?id=eq.${id}`, { method: "DELETE", headers: sbHeaders({ "Prefer": "return=minimal" }) });
    setJobs(prev => prev.filter(j => j.id !== id));
    setSelectedJob(null);
    setStats(s => ({ ...s, jobs: s.jobs - 1 }));
  }
  async function flagJob(id: string, flagged: boolean) {
    await sbPatch("jobs", id, { is_flagged: flagged });
    setJobs(prev => prev.map(j => j.id === id ? { ...j, is_flagged: flagged } : j));
  }
  async function patchPayment(id: string, status: string) {
    await sbPatch("payments", id, { status });
    setPayments(prev => prev.map(p => p.id === id ? { ...p, status } : p));
  }
  async function markAllNotifsRead() {
    await fetch(`${SB_URL}/rest/v1/notifications_queue?status=eq.pending`, {
      method: "PATCH",
      headers: sbHeaders({ "Prefer": "return=minimal" }),
      body: JSON.stringify({ status: "read" }),
    });
    setNotifQueue(prev => prev.map(n => ({ ...n, status: "read" })));
  }
  async function resendEmail(id: string) {
    await sbPatch("email_notifications", id, { status: "pending" });
    setEmailNotifications(prev => prev.map(e => e.id === id ? { ...e, status: "pending" } : e));
  }

  async function handleSignOut() { await signOut(); setLocation("/login"); }

  const pendingNotifs = notifQueue.filter(n => n.status === "pending").length;
  const pendingEmails = emailNotifications.filter(e => e.status === "pending").length;

  const NAV: { key: Section; label: string; icon: React.ReactNode }[] = [
    { key: "overview",       label: "Overview",       icon: <LayoutDashboard className="h-4 w-4" /> },
    { key: "workers",        label: "Workers",        icon: <Users            className="h-4 w-4" /> },
    { key: "homeowners",     label: "Homeowners 🏠",  icon: <Users            className="h-4 w-4" /> },
    { key: "jobs",           label: "Jobs",           icon: <Briefcase        className="h-4 w-4" /> },
    { key: "applications",   label: "Applications",   icon: <FileText         className="h-4 w-4" /> },
    { key: "payments",       label: "Payments",       icon: <CreditCard       className="h-4 w-4" /> },
    { key: "messages",       label: "Messages",       icon: <MessageCircle    className="h-4 w-4" /> },
    { key: "notifications",  label: "Notifications",  icon: <Bell             className="h-4 w-4" /> },
    { key: "emails",         label: "Emails",         icon: <Mail             className="h-4 w-4" /> },
    { key: "analytics",      label: "Analytics",      icon: <BarChart2        className="h-4 w-4" /> },
    { key: "users",          label: "Users 👥",        icon: <Users            className="h-4 w-4" /> },
  ];

  const breadcrumb = (
    <div className="flex items-center gap-1.5 text-sm">
      <span className="font-semibold text-muted-foreground">Admin</span>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="font-bold" style={{ color: "#1B2E4B" }}>{NAV.find(n => n.key === section)?.label}</span>
    </div>
  );

  return (
    <div className="flex min-h-screen" style={{ background: "#F1F5F9" }}>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col" style={{ background: "#1B2E4B" }}>
        <div className="flex items-center gap-2 px-5 py-5 border-b border-white/10">
          <MapPin className="h-5 w-5 text-white/80" />
          <span className="font-serif font-bold text-white text-sm leading-tight">
            PieceJobs ZA<br /><span className="font-sans text-white/60 text-xs font-normal">Admin</span>
          </span>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-3">
          {NAV.map(n => (
            <button key={n.key} onClick={() => setSection(n.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${section === n.key ? "bg-white/15 text-white" : "text-white/60 hover:text-white hover:bg-white/8"}`}>
              {n.icon}{n.label}
              {n.key === "workers" && (stats.pending > 0 || pendingDocs > 0) && (
                <span className="ml-auto flex items-center gap-1">
                  {stats.pending > 0 && <span className="text-xs font-bold bg-amber-400 text-amber-900 rounded-full px-1.5 py-0.5">{stats.pending}</span>}
                  {pendingDocs > 0  && <span className="text-xs font-bold bg-blue-500 text-white rounded-full px-1.5 py-0.5">📄{pendingDocs}</span>}
                </span>
              )}
              {n.key === "payments" && payments.filter(p => p.status === "disputed").length > 0 && (
                <span className="ml-auto text-xs font-bold bg-red-500 text-white rounded-full px-1.5 py-0.5">{payments.filter(p => p.status === "disputed").length}</span>
              )}
              {n.key === "messages" && messages.length > 0 && (
                <span className="ml-auto text-xs font-bold bg-blue-400 text-white rounded-full px-1.5 py-0.5">{messages.length}</span>
              )}
              {n.key === "notifications" && pendingNotifs > 0 && (
                <span className="ml-auto text-xs font-bold bg-amber-400 text-amber-900 rounded-full px-1.5 py-0.5">{pendingNotifs}</span>
              )}
              {n.key === "emails" && pendingEmails > 0 && (
                <span className="ml-auto text-xs font-bold bg-purple-500 text-white rounded-full px-1.5 py-0.5">{pendingEmails}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-white/60 hover:text-white hover:bg-white/8 transition-colors">
            <LogOut className="h-4 w-4" />Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top nav */}
        <div className="md:hidden flex items-center gap-0 overflow-x-auto border-b border-border" style={{ background: "#1B2E4B" }}>
          {NAV.map(n => (
            <button key={n.key} onClick={() => setSection(n.key)}
              className={`flex flex-col items-center gap-1 px-3 py-2.5 text-[10px] font-bold shrink-0 transition-colors ${section === n.key ? "text-white border-b-2 border-amber-400" : "text-white/55"}`}>
              {n.icon}<span className="truncate max-w-[50px]">{n.label}</span>
            </button>
          ))}
          <button onClick={handleSignOut} className="flex flex-col items-center gap-1 px-3 py-2.5 text-[10px] font-bold shrink-0 text-white/55 ml-auto">
            <LogOut className="h-4 w-4" /><span>Out</span>
          </button>
        </div>

        <header className="hidden md:flex bg-white border-b border-border px-8 py-4 items-center justify-between">
          {breadcrumb}
          <Button variant="outline" size="sm" onClick={handleSignOut}><LogOut className="h-4 w-4 mr-1.5" />Logout</Button>
        </header>

        <main className="flex-1 p-8">
          {loading ? (
            <div className="space-y-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
          ) : (
            <>
              {section === "overview"      && <OverviewSection stats={stats} jobs={jobs} payments={payments} messages={messages} notifQueue={notifQueue} homeowners={homeowners} workers={workers} />}
              {section === "workers"       && <WorkersSection workers={workers} onSelect={setSelectedWorker} onVerify={verifyWorker} onSuspend={suspendWorker} onRemove={removeWorker} />}
              {section === "homeowners"    && <HomeownersSection homeowners={homeowners} payments={payments} jobs={jobs} onSelect={setSelectedHomeowner} onSuspend={suspendHomeowner} onRemove={removeHomeowner} />}
              {section === "jobs"          && <JobsSection jobs={jobs} onSelect={setSelectedJob} onRemove={removeJob} onFlag={flagJob} />}
              {section === "applications"  && <ApplicationsSection applications={applications} onSelect={setSelectedApp} />}
              {section === "payments"      && <PaymentsSection payments={payments} onPatch={patchPayment} />}
              {section === "messages"      && <MessagesSection messages={messages} />}
              {section === "notifications" && <NotificationsSection notifQueue={notifQueue} onMarkAllRead={markAllNotifsRead} onSetQueue={setNotifQueue} />}
              {section === "emails"        && <EmailsSection emails={emailNotifications} onResend={resendEmail} />}
              {section === "analytics"     && <AnalyticsSection jobs={jobs} workers={workers} payments={payments} applications={applications} />}
              {section === "users"         && <UsersSection homeowners={homeowners} workers={workers} payments={payments} onSuspendHomeowner={suspendHomeowner} onRemoveHomeowner={removeHomeowner} onSelectHomeowner={setSelectedHomeowner} />}
            </>
          )}
        </main>
      </div>

      {/* Modals */}
      {selectedWorker && (
        <WorkerProfileModal
          worker={selectedWorker}
          payments={payments}
          onVerify={verifyWorker}
          onSuspend={suspendWorker}
          onRemove={removeWorker}
          onClose={() => setSelectedWorker(null)}
        />
      )}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          payments={payments}
          messages={messages}
          onRemove={removeJob}
          onFlag={flagJob}
          onClose={() => setSelectedJob(null)}
        />
      )}
      {selectedApp && (
        <AppDetailModal
          app={selectedApp}
          payments={payments}
          onClose={() => setSelectedApp(null)}
        />
      )}
      {selectedHomeowner && (
        <HomeownerProfileModal
          homeowner={selectedHomeowner}
          payments={payments}
          jobs={jobs}
          onSuspend={suspendHomeowner}
          onRemove={removeHomeowner}
          onClose={() => setSelectedHomeowner(null)}
        />
      )}
    </div>
  );
}

/* ── Shared helpers ─────────────────────────────────────────────────────── */

function StatCard({ label, value, sub, color, prefix }: { label: string; value: number | string; sub?: string; color: string; prefix?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-border p-6">
      <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      <p className="font-serif text-4xl font-extrabold mt-1" style={{ color }}>{prefix}{typeof value === "number" ? value.toLocaleString("en-ZA") : value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`h-3.5 w-3.5 ${i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-border"}`} />
      ))}
    </span>
  );
}

function statusBadge(s: string) {
  if (s === "open")      return "bg-green-50 text-green-700 border border-green-200";
  if (s === "hired")     return "bg-amber-50 text-amber-700 border border-amber-200";
  if (s === "completed") return "bg-blue-50 text-blue-700 border border-blue-200";
  return "bg-muted text-muted-foreground";
}
function payStatusBadge(s: string) {
  if (s === "held")     return "bg-amber-50 text-amber-700 border border-amber-200";
  if (s === "released") return "bg-green-50 text-green-700 border border-green-200";
  if (s === "disputed") return "bg-red-50 text-red-600 border border-red-200";
  if (s === "refunded") return "bg-gray-50 text-gray-600 border border-gray-200";
  return "bg-muted text-muted-foreground";
}

function CatBadges({ job }: { job: JobFull }) {
  const cats = (job.categories && job.categories.length > 0) ? job.categories : [job.category];
  return (
    <div className="flex flex-wrap gap-1">
      {cats.slice(0, 2).map(c => (
        <span key={c} className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-primary/10 text-primary rounded-full px-2 py-0.5">
          {CATEGORY_EMOJI[c] ?? "📋"} {c}
        </span>
      ))}
      {cats.length > 2 && <span className="text-[10px] font-bold bg-primary/10 text-primary rounded-full px-2 py-0.5">+{cats.length - 2}</span>}
      {job.booking_type === "bundle" && <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">📦 Bundle</span>}
      {job.booking_type === "multi"  && <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5">👥 Multi</span>}
    </div>
  );
}

/* ── Overview ───────────────────────────────────────────────────────────── */

function OverviewSection({ stats, jobs, payments, messages, notifQueue, homeowners, workers }: {
  stats: Stats; jobs: JobFull[]; payments: PaymentRow[];
  messages: MessageRow[]; notifQueue: { status: string }[];
  homeowners: HomeownerProfile[]; workers: WorkerFull[];
}) {
  const now         = new Date();
  const sevenDays   = new Date(now.getTime() - 7 * 86400000);
  const threeDays   = new Date(now.getTime() - 3 * 86400000);

  const activeJobs  = jobs.filter(j => j.status === "open").length;
  const inEscrow    = payments.filter(p => p.status === "held").reduce((s, p) => s + p.amount, 0);
  const pendingNotifCount = notifQueue.filter(n => n.status === "pending").length;

  // Bundle vs single
  const bundleCount = jobs.filter(j => j.booking_type === "bundle").length;
  const multiCount  = jobs.filter(j => j.booking_type === "multi").length;
  const singleCount = jobs.filter(j => !j.booking_type || j.booking_type === "single").length;

  // Most popular category from categories[] array
  const catCounts: Record<string, number> = {};
  jobs.forEach(j => {
    const cats = (j.categories && j.categories.length > 0) ? j.categories : [j.category];
    cats.forEach(c => { catCounts[c] = (catCounts[c] ?? 0) + 1; });
  });
  const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];

  const staleJobs   = jobs.filter(j => j.status === "open" && new Date(j.created_at) < sevenDays);
  const stalePayments = payments.filter(p => p.status === "held" && new Date(p.created_at) < threeDays);
  const alerts      = [
    ...staleJobs.map(j => ({ type: "job",  msg: `"${j.title}" has been open for more than 7 days`, id: j.id })),
    ...stalePayments.map(p => ({ type: "pay", msg: `Payment for "${p.job_title}" has been held for more than 3 days`, id: p.id })),
  ];

  // Most active homeowner by jobs posted
  const homeownerJobCounts: Record<string, number> = {};
  jobs.forEach(j => { if (j.posted_by) homeownerJobCounts[j.posted_by] = (homeownerJobCounts[j.posted_by] ?? 0) + 1; });
  const topHomeownerId = Object.entries(homeownerJobCounts).sort((a,b) => b[1]-a[1])[0]?.[0];
  const topHomeowner = homeowners.find(h => h.id === topHomeownerId);
  const topHomeownerName = topHomeowner ? (topHomeowner.full_name || `${topHomeowner.first_name ?? ""} ${topHomeowner.last_name ?? ""}`.trim() || topHomeowner.email || "—") : "—";

  // Most active worker by completed jobs (payments released)
  const workerCompletedCounts: Record<string, number> = {};
  payments.filter(p => p.status === "released").forEach(p => {
    if (p.worker_id) workerCompletedCounts[p.worker_id] = (workerCompletedCounts[p.worker_id] ?? 0) + 1;
  });
  const topWorkerId = Object.entries(workerCompletedCounts).sort((a,b) => b[1]-a[1])[0]?.[0];
  const topWorker = workers.find(w => w.id === topWorkerId);
  const topWorkerName = topWorker ? `${topWorker.first_name} ${topWorker.last_name}`.trim() : "—";

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
        <StatCard label="Total Jobs Posted"     value={stats.jobs}             color="#2D7DD2" />
        <StatCard label="Workers Registered"    value={stats.workers}          color="#1B2E4B" />
        <StatCard label="Total Applications"    value={stats.applications}     color="#10B981" />
        <StatCard label="Pending Verifications" value={stats.pending}          color="#F5A623" sub="Workers awaiting verification" />
        <StatCard label="Platform Earnings"     value={stats.platformEarnings} color="#7C3AED" prefix="R" sub="From released payments" />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard label="Total Homeowners"    value={homeowners.length}           color="#2D7DD2" sub="Registered on platform" />
        <StatCard label="Total Workers"       value={workers.length}              color="#10B981" sub="Registered on platform" />
        <div className="bg-white rounded-2xl border border-border p-6">
          <p className="text-sm font-semibold text-muted-foreground">Most Active Homeowner</p>
          <p className="font-bold text-lg mt-1 truncate" style={{ color: "#1B2E4B" }}>{topHomeownerName}</p>
          {topHomeownerId && <p className="text-xs text-muted-foreground mt-0.5">{homeownerJobCounts[topHomeownerId]} job{homeownerJobCounts[topHomeownerId] !== 1 ? "s" : ""} posted</p>}
        </div>
        <div className="bg-white rounded-2xl border border-border p-6">
          <p className="text-sm font-semibold text-muted-foreground">Most Active Worker</p>
          <p className="font-bold text-lg mt-1 truncate" style={{ color: "#1B2E4B" }}>{topWorkerName}</p>
          {topWorkerId && <p className="text-xs text-muted-foreground mt-0.5">{workerCompletedCounts[topWorkerId]} job{workerCompletedCounts[topWorkerId] !== 1 ? "s" : ""} completed</p>}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard label="Active Jobs Right Now"  value={activeJobs}          color="#10B981" sub="Jobs with status = open" />
        <StatCard label="In Escrow Right Now"    value={inEscrow}            color="#F5A623" prefix="R" sub="Held payments pending release" />
        <StatCard label="Total Messages Sent"    value={messages.length}     color="#2D7DD2" sub="Secure Job Chat messages" />
        <StatCard label="Pending Notifications"  value={pendingNotifCount}   color="#EF4444" sub="Unread worker notifications" />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-border p-6">
          <p className="text-sm font-semibold text-muted-foreground mb-3">Booking Types</p>
          <div className="space-y-2">
            {[
              { label: "Single jobs",  count: singleCount, color: "#2D7DD2" },
              { label: "📦 Bundle",    count: bundleCount, color: "#F5A623" },
              { label: "👥 Multi-task",count: multiCount,  color: "#10B981" },
            ].map(b => (
              <div key={b.label} className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{b.label}</span>
                <span className="font-extrabold text-lg" style={{ color: b.color }}>{b.count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-border p-6">
          <p className="text-sm font-semibold text-muted-foreground mb-3">Most Popular Category</p>
          {topCat ? (
            <div className="flex flex-col gap-1">
              <p className="font-extrabold text-2xl" style={{ color: "#1B2E4B" }}>
                {CATEGORY_EMOJI[topCat[0]] ?? "📋"} {topCat[0]}
              </p>
              <p className="text-sm text-muted-foreground">{topCat[1]} job{topCat[1] !== 1 ? "s" : ""} posted</p>
              {Object.entries(catCounts).sort((a,b) => b[1]-a[1]).slice(1,4).map(([cat, cnt]) => (
                <p key={cat} className="text-xs text-muted-foreground">{CATEGORY_EMOJI[cat] ?? "📋"} {cat} — {cnt}</p>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground">No jobs yet.</p>}
        </div>
        <div className="bg-white rounded-2xl border border-border p-6">
          <p className="text-sm font-semibold text-muted-foreground mb-3">Platform Health</p>
          <div className="space-y-2">
            {[
              { label: "Jobs completed",    value: payments.filter(p=>p.status==="released").length, color:"#10B981" },
              { label: "Disputed payments", value: payments.filter(p=>p.status==="disputed").length, color:"#EF4444" },
              { label: "Flagged jobs",      value: jobs.filter(j=>j.is_flagged).length,              color:"#F5A623" },
            ].map(b => (
              <div key={b.label} className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{b.label}</span>
                <span className="font-extrabold text-lg" style={{ color: b.color }}>{b.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {alerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-serif font-bold text-lg flex items-center gap-2" style={{ color: "#1B2E4B" }}>
            <AlertTriangle className="h-5 w-5 text-amber-500" />Alerts ({alerts.length})
          </h3>
          {alerts.map((a, i) => (
            <div key={i} className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-amber-800">{a.msg}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Workers Section ────────────────────────────────────────────────────── */

function WorkersSection({ workers, onSelect, onVerify, onSuspend, onRemove }: {
  workers: WorkerFull[];
  onSelect: (w: WorkerFull) => void;
  onVerify: (id: string) => void;
  onSuspend: (id: string, v: boolean) => void;
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
              <tr key={w.id} className={`border-b border-border last:border-0 transition-colors ${!w.is_verified ? "bg-amber-50" : w.is_suspended ? "bg-red-50/40" : "hover:bg-muted/20"}`}>
                <td className="px-5 py-3">
                  <button onClick={() => onSelect(w)} className="font-semibold text-primary hover:underline text-left">
                    {w.first_name} {w.last_name}
                  </button>
                </td>
                <td className="px-5 py-3 text-muted-foreground max-w-[160px] truncate">{(w.skills ?? []).join(", ") || "—"}</td>
                <td className="px-5 py-3 text-muted-foreground">{w.city}</td>
                <td className="px-5 py-3 text-muted-foreground">{w.phone}</td>
                <td className="px-5 py-3 text-muted-foreground">{new Date(w.created_at).toLocaleDateString("en-ZA")}</td>
                <td className="px-5 py-3">
                  {w.is_suspended
                    ? <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1"><PauseCircle className="h-3 w-3" />Suspended</span>
                    : w.is_verified
                      ? <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1"><ShieldCheck className="h-3 w-3" />Verified</span>
                      : <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1"><ShieldOff className="h-3 w-3" />Pending</span>}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    {!w.is_verified && <Button size="sm" className="h-7 text-xs font-bold bg-green-600 hover:bg-green-700 text-white" onClick={() => onVerify(w.id)}><CheckCircle2 className="h-3 w-3 mr-1" />Verify</Button>}
                    {!w.is_suspended
                      ? <Button size="sm" className="h-7 text-xs font-bold" style={{ background: "#F5A623", color: "#1B2E4B" }} onClick={() => onSuspend(w.id, true)}><PauseCircle className="h-3 w-3 mr-1" />Suspend</Button>
                      : <Button size="sm" className="h-7 text-xs font-bold bg-green-600 hover:bg-green-700 text-white" onClick={() => onSuspend(w.id, false)}>Unsuspend</Button>}
                    <Button size="sm" variant="destructive" className="h-7 text-xs font-bold" onClick={() => onRemove(w.id)}><Trash2 className="h-3 w-3 mr-1" />Remove</Button>
                  </div>
                </td>
              </tr>
            ))}
            {workers.length === 0 && <tr><td colSpan={7} className="text-center text-muted-foreground py-12">No workers yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Worker Profile Modal ───────────────────────────────────────────────── */

function WorkerProfileModal({ worker, payments, onVerify, onSuspend, onRemove, onClose }: {
  worker: WorkerFull;
  payments: PaymentRow[];
  onVerify: (id: string) => void;
  onSuspend: (id: string, v: boolean) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}) {
  const [reviews, setReviews]             = useState<Review[]>([]);
  const [docs, setDocs]                   = useState<WorkerDoc[]>([]);
  const [referralCount, setReferralCount] = useState(0);
  const [notifCount, setNotifCount]       = useState(0);
  const [msgText, setMsgText]             = useState("");

  const fetchReviews = useCallback(async () => {
    const data = await sbGet<Review>(`reviews?worker_id=eq.${worker.id}&order=created_at.desc`);
    setReviews(data);
  }, [worker.id]);

  const fetchDocs = useCallback(async () => {
    const data = await sbGet<WorkerDoc>(`worker_documents?worker_id=eq.${worker.id}&order=uploaded_at.desc`);
    setDocs(data);
  }, [worker.id]);

  const fetchExtra = useCallback(async () => {
    const [refs, notifs] = await Promise.all([
      sbGet<{ id: string }>(`workers?referred_by=eq.${worker.referral_code ?? "NONE"}&select=id`),
      sbGet<{ id: string }>(`notifications_queue?worker_id=eq.${worker.id}&status=eq.pending&select=id`),
    ]);
    setReferralCount(refs.length);
    setNotifCount(notifs.length);
  }, [worker.id, worker.referral_code]);

  useEffect(() => { fetchReviews(); fetchDocs(); fetchExtra(); }, [fetchReviews, fetchDocs, fetchExtra]);

  async function approveDoc(id: string) {
    await sbPatch("worker_documents", id, { status: "approved", reviewed_at: new Date().toISOString() });
    setDocs(prev => prev.map(d => d.id === id ? { ...d, status: "approved" } : d));
  }
  async function rejectDoc(id: string) {
    await sbPatch("worker_documents", id, { status: "rejected", reviewed_at: new Date().toISOString() });
    setDocs(prev => prev.map(d => d.id === id ? { ...d, status: "rejected" } : d));
  }

  const workerPays  = payments.filter(p => p.worker_id === worker.id);
  const jobsDone    = workerPays.filter(p => p.status === "released").length;
  const totalEarned = workerPays.filter(p => p.status === "released").reduce((s, p) => s + p.worker_payout, 0);
  const initials    = `${worker.first_name[0]}${worker.last_name[0]}`.toUpperCase();
  const maskedId    = worker.id_number ? `${worker.id_number.slice(0, 6)}*****` : "Not provided";
  const badge       = getBadgeInfo(jobsDone);

  function sendWhatsApp() {
    if (!msgText.trim() || !worker.phone) return;
    const num = worker.phone.replace(/\D/g, "");
    window.open(`https://wa.me/27${num.replace(/^0/, "")}?text=${encodeURIComponent(msgText)}`, "_blank");
  }

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <span>Admin</span><ChevronRight className="h-3 w-3" /><span>Workers</span><ChevronRight className="h-3 w-3" />
            <span className="font-bold text-foreground">{worker.first_name} {worker.last_name}</span>
          </div>
          <DialogTitle className="font-serif text-2xl font-bold" style={{ color: "#1B2E4B" }}>Worker Profile</DialogTitle>
        </DialogHeader>

        {/* Avatar + name */}
        <div className="flex items-center gap-4 mt-2">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-extrabold shrink-0" style={{ background: "#2D7DD2" }}>{initials}</div>
          <div>
            <p className="font-bold text-xl text-foreground">{worker.first_name} {worker.last_name}</p>
            <p className="text-muted-foreground text-sm">{worker.phone}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {worker.is_suspended
                ? <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5"><PauseCircle className="h-3 w-3" />Suspended</span>
                : worker.is_verified
                  ? <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5"><ShieldCheck className="h-3 w-3" />Verified</span>
                  : <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5"><ShieldOff className="h-3 w-3" />Pending</span>}
              {/* Badge level */}
              <span className="inline-flex items-center gap-1 text-xs font-bold bg-muted rounded-full px-2 py-0.5 border border-border">
                {badge.emoji} {badge.label} badge
              </span>
              {worker.rating > 0 && <Stars rating={worker.rating} />}
              {worker.review_count > 0 && <span className="text-xs text-muted-foreground">({worker.review_count} reviews)</span>}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: "Jobs Completed", value: jobsDone,                                 color: "#10B981" },
            { label: "Total Earned",   value: `R${totalEarned.toLocaleString("en-ZA")}`, color: "#2D7DD2" },
            { label: "Hourly Rate",    value: `R${worker.hourly_rate ?? "—"}/hr`,         color: "#1B2E4B" },
          ].map(s => (
            <div key={s.label} className="bg-muted/40 rounded-xl p-4 text-center border border-border">
              <p className="text-xs text-muted-foreground font-semibold">{s.label}</p>
              <p className="font-bold text-lg mt-0.5" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Referral + notification row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
            <p className="text-xs text-amber-700 font-semibold">Referral Code</p>
            <p className="font-extrabold text-amber-800 text-base mt-0.5">{worker.referral_code ?? "—"}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
            <p className="text-xs text-amber-700 font-semibold">Referrals Made</p>
            <p className="font-extrabold text-amber-800 text-base mt-0.5">{referralCount}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
            <p className="text-xs text-amber-700 font-semibold">Referral Earnings</p>
            <p className="font-extrabold text-amber-800 text-base mt-0.5">R{(worker.referral_earnings ?? 0).toLocaleString("en-ZA")}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
            <p className="text-xs text-blue-700 font-semibold">Pending Notifs</p>
            <p className="font-extrabold text-blue-800 text-base mt-0.5">{notifCount}</p>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-4 text-sm">
          <Detail label="City"          value={worker.city} />
          <Detail label="Suburb"        value={worker.suburb} />
          <Detail label="Payout Method" value={worker.payout_method === "flash" ? "Flash/Kazang" : "Bank Transfer"} />
          {worker.payout_method !== "flash" && <Detail label="Bank Name"    value={worker.bank_name ?? "—"} />}
          {worker.payout_method !== "flash" && <Detail label="Bank Account" value={worker.bank_account ?? "—"} />}
          {worker.payout_method === "flash"  && <Detail label="Flash Phone" value={worker.flash_phone ?? "—"} />}
          <Detail label="SA ID"         value={maskedId} />
          <Detail label="Registered"    value={new Date(worker.created_at).toLocaleDateString("en-ZA")} />
          <Detail label="Referred By"   value={worker.referred_by ?? "—"} />
        </div>

        {/* Skills */}
        <div className="mt-3">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Skills</p>
          <div className="flex flex-wrap gap-1.5">
            {(worker.skills ?? []).length === 0
              ? <span className="text-sm text-muted-foreground">None listed</span>
              : worker.skills.map(s => <span key={s} className="text-xs font-semibold bg-primary/10 text-primary rounded-full px-2.5 py-1">{s}</span>)}
          </div>
        </div>

        {/* Documents */}
        <div className="mt-4 border-t border-border pt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-sm" style={{ color: "#1B2E4B" }}>Documents ({docs.length})</p>
            {docs.filter(d => d.status === "pending").length > 0 && (
              <span className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2.5 py-0.5">
                {docs.filter(d => d.status === "pending").length} pending review
              </span>
            )}
          </div>
          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {docs.map(d => (
                <div key={d.id} className="bg-muted/30 rounded-lg border border-border px-3 py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm capitalize">{d.document_type.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground">{d.file_name ?? "—"} · {new Date(d.uploaded_at).toLocaleDateString("en-ZA")}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-bold rounded-full px-2.5 py-0.5 capitalize ${
                      d.status === "approved" ? "bg-green-50 text-green-700 border border-green-200" :
                      d.status === "rejected" ? "bg-red-50 text-red-600 border border-red-200" :
                      "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}>{d.status}</span>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => window.open(d.file_url, "_blank")}>View</Button>
                    {d.status !== "approved" && (
                      <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white font-bold" onClick={() => approveDoc(d.id)}>Approve</Button>
                    )}
                    {d.status !== "rejected" && (
                      <Button size="sm" variant="destructive" className="h-7 text-xs font-bold" onClick={() => rejectDoc(d.id)}>Reject</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {docs.length > 0 && docs.every(d => d.status === "approved") && !worker.is_verified && (
            <Button size="sm" className="mt-3 bg-green-600 hover:bg-green-700 text-white font-bold" onClick={() => onVerify(worker.id)}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />All docs approved — Set as Verified
            </Button>
          )}
        </div>

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="font-bold text-sm mb-3" style={{ color: "#1B2E4B" }}>Reviews ({reviews.length})</p>
            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
              {reviews.map(r => (
                <div key={r.id} className="bg-muted/30 rounded-lg px-3 py-2.5 text-sm border border-border">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-foreground">{r.reviewer_name ?? "Anonymous"}</span>
                    <div className="flex items-center gap-2"><Stars rating={r.rating} /><span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-ZA")}</span></div>
                  </div>
                  {r.comment && <p className="text-muted-foreground leading-relaxed">{r.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Send Message */}
        <div className="mt-4 border-t border-border pt-4">
          <p className="font-bold text-sm mb-2" style={{ color: "#1B2E4B" }}>Send Message via WhatsApp</p>
          <Textarea rows={2} placeholder="Type your message..." value={msgText} onChange={e => setMsgText(e.target.value)} className="text-sm" />
          <Button size="sm" className="mt-2 font-bold text-white" style={{ background: "#2D7DD2" }} onClick={sendWhatsApp} disabled={!msgText.trim() || !worker.phone}>
            <Send className="h-3.5 w-3.5 mr-1.5" />Send via WhatsApp
          </Button>
        </div>

        {/* Action buttons */}
        <div className="mt-4 border-t border-border pt-4 flex gap-2 flex-wrap">
          {!worker.is_verified && <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white font-bold" onClick={() => onVerify(worker.id)}><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Verify</Button>}
          {!worker.is_suspended
            ? <Button size="sm" className="font-bold" style={{ background: "#F5A623", color: "#1B2E4B" }} onClick={() => { onSuspend(worker.id, true); onClose(); }}><PauseCircle className="h-3.5 w-3.5 mr-1.5" />Suspend</Button>
            : <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white font-bold" onClick={() => { onSuspend(worker.id, false); onClose(); }}>Unsuspend</Button>}
          <Button size="sm" variant="destructive" className="font-bold" onClick={() => onRemove(worker.id)}><Trash2 className="h-3.5 w-3.5 mr-1.5" />Remove Worker</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Jobs Section ───────────────────────────────────────────────────────── */

function JobsSection({ jobs, onSelect, onRemove, onFlag }: {
  jobs: JobFull[];
  onSelect: (j: JobFull) => void;
  onRemove: (id: string) => void;
  onFlag: (id: string, v: boolean) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="font-serif font-bold text-lg" style={{ color: "#1B2E4B" }}>All Jobs ({jobs.length})</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Title</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Categories</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">City</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Budget</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Posted by</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Scheduled</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map(j => (
              <tr key={j.id} className={`border-b border-border last:border-0 hover:bg-muted/20 ${j.is_flagged ? "bg-amber-50/60" : ""}`}>
                <td className="px-4 py-3 max-w-[180px]">
                  <button onClick={() => onSelect(j)} className="font-semibold text-primary hover:underline text-left truncate block max-w-[170px]">{j.title}</button>
                  {j.is_flagged && <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 rounded px-1.5 py-0.5 mt-0.5"><Flag className="h-2.5 w-2.5" />Flagged</span>}
                </td>
                <td className="px-4 py-3 max-w-[180px]"><CatBadges job={j} /></td>
                <td className="px-4 py-3 text-muted-foreground">{j.city}</td>
                <td className="px-4 py-3 font-bold" style={{ color: "#F5A623" }}>R{j.budget}</td>
                <td className="px-4 py-3 text-muted-foreground">{j.poster_name}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {j.scheduled_date ? (
                    <span>{new Date(j.scheduled_date + "T00:00:00").toLocaleDateString("en-ZA", { day:"2-digit", month:"short" })}{j.scheduled_time ? ` ${j.scheduled_time.slice(0,5)}` : ""}</span>
                  ) : "—"}
                </td>
                <td className="px-4 py-3"><span className={`inline-flex text-xs font-bold rounded-full px-2.5 py-1 capitalize ${statusBadge(j.status)}`}>{j.status}</span></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {!j.is_flagged
                      ? <Button size="sm" className="h-7 text-xs font-bold" style={{ background: "#F5A623", color: "#1B2E4B" }} onClick={() => onFlag(j.id, true)}><Flag className="h-3 w-3 mr-1" />Flag</Button>
                      : <Button size="sm" variant="outline" className="h-7 text-xs font-bold" onClick={() => onFlag(j.id, false)}>Unflag</Button>}
                    <Button size="sm" variant="destructive" className="h-7 text-xs font-bold" onClick={() => onRemove(j.id)}><Trash2 className="h-3 w-3 mr-1" />Remove</Button>
                  </div>
                </td>
              </tr>
            ))}
            {jobs.length === 0 && <tr><td colSpan={8} className="text-center text-muted-foreground py-12">No jobs yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Job Detail Modal ───────────────────────────────────────────────────── */

function JobDetailModal({ job, payments, messages, onRemove, onFlag, onClose }: {
  job: JobFull;
  payments: PaymentRow[];
  messages: MessageRow[];
  onRemove: (id: string) => void;
  onFlag: (id: string, v: boolean) => void;
  onClose: () => void;
}) {
  const [apps, setApps] = useState<Application[]>([]);

  const fetchApps = useCallback(async () => {
    const data = await sbGet<Application>(`applications?job_id=eq.${job.id}&order=created_at.desc`);
    setApps(data);
  }, [job.id]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  const pay      = payments.find(p => p.job_id === job.id);
  const jobMsgs  = messages.filter(m => m.job_id === job.id).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const cats     = (job.categories && job.categories.length > 0) ? job.categories : [job.category];

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <span>Admin</span><ChevronRight className="h-3 w-3" /><span>Jobs</span><ChevronRight className="h-3 w-3" />
            <span className="font-bold text-foreground truncate max-w-[200px]">{job.title}</span>
          </div>
          <DialogTitle className="font-serif text-xl font-bold" style={{ color: "#1B2E4B" }}>Job Detail</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Status + category badges */}
          <div className="flex flex-wrap gap-2 items-start">
            <span className={`text-xs font-bold rounded-full px-2.5 py-1 capitalize ${statusBadge(job.status)}`}>{job.status}</span>
            {cats.map(c => (
              <span key={c} className="inline-flex items-center gap-1 text-xs font-bold bg-primary/10 text-primary rounded-full px-2.5 py-1">
                {CATEGORY_EMOJI[c] ?? "📋"} {c}
              </span>
            ))}
            {job.booking_type === "bundle" && <span className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2.5 py-1">📦 Bundle booking</span>}
            {job.booking_type === "multi"  && <span className="text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-1">👥 Multi-worker booking</span>}
            {job.is_flagged && <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2.5 py-1"><Flag className="h-3 w-3" />Flagged</span>}
          </div>
          <h2 className="font-serif text-2xl font-bold text-foreground">{job.title}</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">{job.description}</p>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Detail label="Budget"         value={`R${job.budget}`} />
            <Detail label="Location"       value={`${job.suburb}, ${job.city}`} />
            <Detail label="Posted by"      value={job.poster_name} />
            <Detail label="Date Posted"    value={new Date(job.created_at).toLocaleDateString("en-ZA")} />
            <Detail label="Scheduled Date" value={job.scheduled_date ? new Date(job.scheduled_date + "T00:00:00").toLocaleDateString("en-ZA", { weekday:"long", day:"2-digit", month:"long", year:"numeric" }) : "—"} />
            <Detail label="Scheduled Time" value={job.scheduled_time ? job.scheduled_time.slice(0,5) : "—"} />
          </div>

          {/* Payment info */}
          {pay && (
            <div className="bg-muted/30 rounded-xl border border-border p-4">
              <p className="font-bold text-sm mb-2" style={{ color: "#1B2E4B" }}>Payment</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <Detail label="Amount"        value={`R${pay.amount}`} />
                <Detail label="Platform Fee"  value={`R${pay.platform_fee}`} />
                <Detail label="Worker Payout" value={`R${pay.worker_payout}`} />
                <Detail label="Method"        value={pay.payout_method === "flash" ? "Flash/Kazang" : "Bank Transfer"} />
                <Detail label="Status"        value={<span className={`inline-flex text-xs font-bold rounded-full px-2 py-0.5 capitalize ${payStatusBadge(pay.status)}`}>{pay.status}</span>} />
              </div>
            </div>
          )}

          {/* Applications */}
          <div>
            <p className="font-bold text-sm mb-2" style={{ color: "#1B2E4B" }}>Applications ({apps.length})</p>
            {apps.length === 0 ? (
              <p className="text-sm text-muted-foreground">No applications for this job.</p>
            ) : (
              <div className="space-y-2">
                {apps.map(a => (
                  <div key={a.id} className="bg-muted/30 rounded-lg border border-border px-3 py-2.5 text-sm">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <p className="font-semibold text-foreground">{a.worker_name} <span className="text-muted-foreground font-normal">{a.worker_phone}</span></p>
                        <p className="text-muted-foreground text-xs mt-0.5">{a.message}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold" style={{ color: "#F5A623" }}>R{a.proposed_rate}</p>
                        <span className={`inline-flex text-[10px] font-bold rounded-full px-2 py-0.5 capitalize ${a.status === "accepted" ? "bg-green-50 text-green-700 border border-green-200" : a.status === "declined" ? "bg-red-50 text-red-600 border border-red-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>{a.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Secure Job Chat */}
          <div>
            <p className="font-bold text-sm mb-2 flex items-center gap-2" style={{ color: "#1B2E4B" }}>
              <MessageCircle className="h-4 w-4" />Secure Job Chat ({jobMsgs.length} messages)
            </p>
            {jobMsgs.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No messages for this job.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {jobMsgs.map(m => (
                  <div key={m.id} className={`rounded-xl px-3 py-2 text-sm ${m.sender_role === "homeowner" ? "bg-primary/5 border border-primary/20 ml-4" : "bg-muted/40 border border-border mr-4"}`}>
                    <div className="flex items-center justify-between mb-0.5 gap-2">
                      <span className="font-semibold text-foreground text-xs">{m.sender_name ?? "Unknown"}</span>
                      <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${m.sender_role === "homeowner" ? "bg-primary/10 text-primary" : "bg-green-50 text-green-700"}`}>{m.sender_role ?? "user"}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">{new Date(m.created_at).toLocaleString("en-ZA", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}</span>
                    </div>
                    <p className="text-foreground leading-relaxed">{m.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 border-t border-border pt-4 flex gap-2 flex-wrap">
          {!job.is_flagged
            ? <Button size="sm" className="font-bold" style={{ background: "#F5A623", color: "#1B2E4B" }} onClick={() => { onFlag(job.id, true); onClose(); }}><Flag className="h-3.5 w-3.5 mr-1.5" />Flag as Inappropriate</Button>
            : <Button size="sm" variant="outline" className="font-bold" onClick={() => { onFlag(job.id, false); onClose(); }}>Remove Flag</Button>}
          <Button size="sm" variant="destructive" className="font-bold" onClick={() => onRemove(job.id)}><Trash2 className="h-3.5 w-3.5 mr-1.5" />Remove Job</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Applications Section ───────────────────────────────────────────────── */

function ApplicationsSection({ applications, onSelect }: {
  applications: (Application & { job_title?: string; job_poster?: string })[];
  onSelect: (a: Application & { job_title?: string; job_poster?: string }) => void;
}) {
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
              <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer" onClick={() => onSelect(a)}>
                <td className="px-5 py-3 font-semibold text-primary max-w-[180px] truncate hover:underline">{a.job_title}</td>
                <td className="px-5 py-3 text-muted-foreground">{a.worker_name}</td>
                <td className="px-5 py-3 text-muted-foreground">{a.worker_phone}</td>
                <td className="px-5 py-3 text-muted-foreground max-w-[200px] truncate">{a.message}</td>
                <td className="px-5 py-3 font-bold" style={{ color: "#F5A623" }}>R{a.proposed_rate}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex text-xs font-bold rounded-full px-2.5 py-1 capitalize ${a.status === "accepted" ? "bg-green-50 text-green-700 border border-green-200" : a.status === "declined" ? "bg-red-50 text-red-600 border border-red-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>{a.status}</span>
                </td>
                <td className="px-5 py-3 text-muted-foreground">{new Date(a.created_at).toLocaleDateString("en-ZA")}</td>
              </tr>
            ))}
            {applications.length === 0 && <tr><td colSpan={7} className="text-center text-muted-foreground py-12">No applications yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Application Detail Modal ───────────────────────────────────────────── */

function AppDetailModal({ app, payments, onClose }: {
  app: Application & { job_title?: string; job_poster?: string };
  payments: PaymentRow[];
  onClose: () => void;
}) {
  const pay = payments.find(p => p.job_id === app.job_id);
  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <span>Admin</span><ChevronRight className="h-3 w-3" /><span>Applications</span><ChevronRight className="h-3 w-3" />
            <span className="font-bold text-foreground">{app.worker_name}</span>
          </div>
          <DialogTitle className="font-serif text-xl font-bold" style={{ color: "#1B2E4B" }}>Application Detail</DialogTitle>
        </DialogHeader>
        <div className="mt-3 space-y-3 text-sm">
          <Detail label="Job"       value={app.job_title ?? "—"} />
          <Detail label="Posted by" value={app.job_poster ?? "—"} />
          <Detail label="Applicant" value={app.worker_name} />
          <Detail label="Phone"     value={app.worker_phone} />
          <Detail label="Rate"      value={`R${app.proposed_rate}`} />
          <Detail label="Applied"   value={new Date(app.created_at).toLocaleDateString("en-ZA")} />
          <Detail label="Status"    value={<span className={`inline-flex text-xs font-bold rounded-full px-2 py-0.5 capitalize ${app.status === "accepted" ? "bg-green-50 text-green-700 border border-green-200" : app.status === "declined" ? "bg-red-50 text-red-600 border border-red-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>{app.status}</span>} />
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">Message</p>
            <p className="text-foreground leading-relaxed bg-muted/30 rounded-lg px-3 py-2 border border-border">{app.message}</p>
          </div>
          {pay && (
            <div className="bg-muted/30 rounded-lg border border-border p-3">
              <p className="font-bold text-xs mb-2" style={{ color: "#1B2E4B" }}>Payment for this job</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Detail label="Amount" value={`R${pay.amount}`} />
                <Detail label="Status" value={<span className={`inline-flex text-xs font-bold rounded-full px-2 py-0.5 capitalize ${payStatusBadge(pay.status)}`}>{pay.status}</span>} />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Payments Section ───────────────────────────────────────────────────── */

function PaymentsSection({ payments, onPatch }: { payments: PaymentRow[]; onPatch: (id: string, status: string) => void }) {
  const now        = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart  = new Date(now.getFullYear(), 0, 1);
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter,   setCityFilter]   = useState("all");
  const [dateFrom,     setDateFrom]     = useState("");
  const [dateTo,       setDateTo]       = useState("");

  const released          = payments.filter(p => p.status === "released");
  const disputed          = payments.filter(p => p.status === "disputed");
  const totalProcessed    = payments.reduce((s, p) => s + p.amount, 0);
  const inEscrow          = payments.filter(p => p.status === "held").reduce((s, p) => s + p.amount, 0);
  const releasedToWorkers = released.reduce((s, p) => s + p.worker_payout, 0);
  const platformEarnings  = released.reduce((s, p) => s + p.platform_fee, 0);
  const thisMonthRevenue  = released.filter(p => new Date(p.created_at) >= monthStart).reduce((s, p) => s + p.platform_fee, 0);
  const thisYearRevenue   = released.filter(p => new Date(p.created_at) >= yearStart).reduce((s, p) => s + p.platform_fee, 0);

  const revenueChart = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const revenue = released.filter(p => { const pd = new Date(p.created_at); return pd.getFullYear() === d.getFullYear() && pd.getMonth() === d.getMonth(); }).reduce((s, p) => s + p.platform_fee, 0);
    return { month: monthNames[d.getMonth()], revenue };
  });

  const cities = Array.from(new Set(payments.map(p => p.job_city).filter(Boolean)));
  const filtered = payments.filter(p => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (cityFilter   !== "all" && p.job_city !== cityFilter) return false;
    if (dateFrom && new Date(p.created_at) < new Date(dateFrom)) return false;
    if (dateTo   && new Date(p.created_at) > new Date(dateTo + "T23:59:59")) return false;
    return true;
  });

  const workerMap = new Map<string, { name: string; total: number }>();
  released.forEach(p => { const k = p.worker_id ?? "unknown"; const e = workerMap.get(k); workerMap.set(k, { name: k, total: (e?.total ?? 0) + p.worker_payout }); });
  const topWorkers = Array.from(workerMap.entries()).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.total - a.total).slice(0, 5);
  const homeownerMap = new Map<string, number>();
  payments.forEach(p => { const k = p.homeowner_email ?? "Unknown"; homeownerMap.set(k, (homeownerMap.get(k) ?? 0) + p.amount); });
  const topHomeowners = Array.from(homeownerMap.entries()).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 5);

  return (
    <div className="space-y-6">
      {disputed.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-red-200 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h3 className="font-serif font-bold text-lg text-red-700">Disputed Payments ({disputed.length})</h3>
          </div>
          <div className="divide-y divide-red-100">
            {disputed.map(p => (
              <div key={p.id} className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-bold text-foreground">{p.job_title}</p>
                  <p className="text-sm text-muted-foreground">{p.homeowner_email ?? "—"} · R{p.amount} · {new Date(p.created_at).toLocaleDateString("en-ZA")}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="font-bold bg-green-600 hover:bg-green-700 text-white" onClick={() => onPatch(p.id, "released")}>Resolve — Pay Worker</Button>
                  <Button size="sm" variant="destructive" className="font-bold" onClick={() => onPatch(p.id, "refunded")}>Resolve — Refund Homeowner</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

      <div className="grid md:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border"><h3 className="font-serif font-bold text-base" style={{ color: "#1B2E4B" }}>Top 5 Workers by Earnings</h3></div>
          {topWorkers.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No data yet.</p> : (
            <div className="divide-y divide-border">{topWorkers.map((w, i) => (
              <div key={w.id} className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i+1}</span><span className="text-sm font-semibold text-muted-foreground truncate max-w-[180px]">{w.name}</span></div>
                <span className="font-bold text-sm" style={{ color: "#2D7DD2" }}>R{w.total.toLocaleString("en-ZA")}</span>
              </div>
            ))}</div>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border"><h3 className="font-serif font-bold text-base" style={{ color: "#1B2E4B" }}>Top 5 Homeowners by Spend</h3></div>
          {topHomeowners.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No data yet.</p> : (
            <div className="divide-y divide-border">{topHomeowners.map((h, i) => (
              <div key={h.name} className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">{i+1}</span><span className="text-sm font-semibold text-muted-foreground truncate max-w-[180px]">{h.name}</span></div>
                <span className="font-bold text-sm" style={{ color: "#F5A623" }}>R{h.total.toLocaleString("en-ZA")}</span>
              </div>
            ))}</div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border space-y-3">
          <h3 className="font-serif font-bold text-lg" style={{ color: "#1B2E4B" }}>Transactions ({filtered.length}{filtered.length !== payments.length ? ` of ${payments.length}` : ""})</h3>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex gap-1.5">
              {["all","held","released","disputed","refunded"].map(f => (
                <button key={f} onClick={() => setStatusFilter(f)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all capitalize ${statusFilter === f ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border hover:border-primary"}`}>{f}</button>
              ))}
            </div>
            {cities.length > 0 && (
              <select value={cityFilter} onChange={e => setCityFilter(e.target.value)}
                className="text-xs font-semibold border border-border rounded-lg px-3 py-1.5 bg-white text-foreground focus:outline-none focus:border-primary">
                <option value="all">All Cities</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border border-border rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-primary" />
              <span>–</span>
              <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   className="border border-border rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-primary" />
            </div>
            {(statusFilter !== "all" || cityFilter !== "all" || dateFrom || dateTo) && (
              <button onClick={() => { setStatusFilter("all"); setCityFilter("all"); setDateFrom(""); setDateTo(""); }} className="text-xs text-muted-foreground underline hover:text-foreground">Clear filters</button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Job</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">City</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Homeowner</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Amount</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Fee</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Payout</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Method</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className={`border-b border-border last:border-0 hover:bg-muted/20 ${p.status === "disputed" ? "bg-red-50/50" : ""}`}>
                  <td className="px-4 py-3 font-semibold text-foreground max-w-[140px] truncate">{p.job_title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.job_city || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[110px] truncate">{p.homeowner_email ?? "—"}</td>
                  <td className="px-4 py-3 font-bold" style={{ color: "#1B2E4B" }}>R{p.amount}</td>
                  <td className="px-4 py-3 font-semibold text-purple-700">R{p.platform_fee}</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: "#F5A623" }}>R{p.worker_payout}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize text-xs">{p.payout_method === "flash" ? "Flash" : "Bank"}</td>
                  <td className="px-4 py-3"><span className={`inline-flex text-xs font-bold rounded-full px-2 py-0.5 capitalize ${payStatusBadge(p.status)}`}>{p.status}</span></td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(p.created_at).toLocaleDateString("en-ZA")}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {p.status !== "released" && <Button size="sm" className="h-7 text-[11px] font-bold bg-green-600 hover:bg-green-700 text-white" onClick={() => onPatch(p.id, "released")}><RefreshCw className="h-3 w-3 mr-0.5" />Release</Button>}
                      {p.status !== "refunded" && <Button size="sm" variant="destructive" className="h-7 text-[11px] font-bold" onClick={() => { if (confirm("Refund this payment?")) onPatch(p.id, "refunded"); }}><RotateCcw className="h-3 w-3 mr-0.5" />Refund</Button>}
                      {p.status !== "disputed" && <Button size="sm" className="h-7 text-[11px] font-bold" style={{ background: "#F5A623", color: "#1B2E4B" }} onClick={() => onPatch(p.id, "disputed")}><Flag className="h-3 w-3 mr-0.5" />Dispute</Button>}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={10} className="text-center text-muted-foreground py-12">No payments match the selected filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── Messages Section ───────────────────────────────────────────────────── */

function MessagesSection({ messages }: { messages: MessageRow[] }) {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // Group by job
  const byJob = messages.reduce<Record<string, MessageRow[]>>((acc, m) => {
    if (!acc[m.job_id]) acc[m.job_id] = [];
    acc[m.job_id].push(m);
    return acc;
  }, {});

  const conversations = Object.entries(byJob).map(([jobId, msgs]) => {
    const sorted  = [...msgs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const last    = sorted[sorted.length - 1];
    const homeowner = sorted.find(m => m.sender_role === "homeowner")?.sender_name ?? "—";
    const worker    = sorted.find(m => m.sender_role === "worker")?.sender_name ?? "—";
    return { jobId, jobTitle: last.job_title ?? jobId.slice(0,8), homeowner, worker, lastMsg: last, count: msgs.length, msgs: sorted };
  }).sort((a, b) => new Date(b.lastMsg.created_at).getTime() - new Date(a.lastMsg.created_at).getTime());

  const thread = selectedJobId ? conversations.find(c => c.jobId === selectedJobId) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-serif text-2xl font-bold" style={{ color: "#1B2E4B" }}>Secure Job Chat 💬</h2>
          <p className="text-muted-foreground text-sm mt-0.5">{messages.length} total messages · {conversations.length} conversations · read-only</p>
        </div>
        {thread && <Button variant="outline" size="sm" onClick={() => setSelectedJobId(null)}>← All Conversations</Button>}
      </div>

      {!thread ? (
        conversations.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-border">
            <MessageCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold text-foreground">No messages yet</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Job</th>
                  <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Homeowner</th>
                  <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Worker</th>
                  <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Last Message</th>
                  <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Date</th>
                  <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Msgs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {conversations.map(c => (
                  <tr key={c.jobId} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setSelectedJobId(c.jobId)}>
                    <td className="px-5 py-3 font-semibold text-primary hover:underline truncate max-w-[160px]">{c.jobTitle}</td>
                    <td className="px-5 py-3 text-muted-foreground">{c.homeowner}</td>
                    <td className="px-5 py-3 text-muted-foreground">{c.worker}</td>
                    <td className="px-5 py-3 text-muted-foreground max-w-[200px] truncate">{c.lastMsg.content}</td>
                    <td className="px-5 py-3 text-muted-foreground text-xs">{new Date(c.lastMsg.created_at).toLocaleString("en-ZA", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}</td>
                    <td className="px-5 py-3"><span className="text-xs font-bold bg-primary/10 text-primary rounded-full px-2.5 py-0.5">{c.count}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <p className="font-bold text-foreground">{thread.jobTitle}</p>
            <p className="text-xs text-muted-foreground mt-0.5">👤 Homeowner: {thread.homeowner} · 🔧 Worker: {thread.worker} · {thread.count} messages</p>
          </div>
          <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
            {thread.msgs.map(m => (
              <div key={m.id} className={`max-w-[80%] ${m.sender_role === "homeowner" ? "ml-auto" : "mr-auto"}`}>
                <div className={`rounded-2xl px-4 py-3 ${m.sender_role === "homeowner" ? "bg-primary text-white rounded-br-sm" : "bg-muted border border-border rounded-bl-sm"}`}>
                  <p className={`text-[11px] font-bold mb-1 ${m.sender_role === "homeowner" ? "text-white/70" : "text-muted-foreground"}`}>{m.sender_name}</p>
                  <p className={`text-sm leading-relaxed ${m.sender_role === "homeowner" ? "text-white" : "text-foreground"}`}>{m.content}</p>
                </div>
                <p className={`text-[10px] text-muted-foreground mt-1 ${m.sender_role === "homeowner" ? "text-right" : ""}`}>
                  {new Date(m.created_at).toLocaleString("en-ZA", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Notifications Section ──────────────────────────────────────────────── */

function NotificationsSection({ notifQueue, onMarkAllRead, onSetQueue }: {
  notifQueue: NotifRow[];
  onMarkAllRead: () => void;
  onSetQueue: React.Dispatch<React.SetStateAction<NotifRow[]>>;
}) {
  const [filter, setFilter] = useState<"all" | "pending" | "read">("all");
  const filtered  = filter === "all" ? notifQueue : notifQueue.filter(n => n.status === filter);
  const pendingCount = notifQueue.filter(n => n.status === "pending").length;

  async function markOneRead(id: string) {
    await fetch(`${SB_URL}/rest/v1/notifications_queue?id=eq.${id}`, {
      method: "PATCH",
      headers: { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Content-Type": "application/json", "Prefer": "return=minimal" },
      body: JSON.stringify({ status: "read" }),
    });
    onSetQueue(prev => prev.map(n => n.id === id ? { ...n, status: "read" } : n));
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-serif text-2xl font-bold" style={{ color: "#1B2E4B" }}>Notifications Queue 🔔</h2>
          <p className="text-muted-foreground text-sm mt-0.5">{notifQueue.length} total · {pendingCount} pending</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all","pending","read"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize ${filter === f ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border hover:border-primary"}`}>
              {f} {f !== "all" ? `(${notifQueue.filter(n => n.status === f).length})` : ""}
            </button>
          ))}
          {pendingCount > 0 && (
            <Button size="sm" className="font-bold text-white" style={{ background: "#1B2E4B" }} onClick={onMarkAllRead}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Mark all as read
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-border">
          <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold text-foreground">No notifications match this filter</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Worker</th>
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Job</th>
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Message</th>
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Date</th>
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(n => (
                <tr key={n.id} className={`hover:bg-muted/20 transition-colors ${n.status === "pending" ? "bg-amber-50/40" : ""}`}>
                  <td className="px-5 py-3 font-medium text-foreground">{n.worker_name}</td>
                  <td className="px-5 py-3 text-muted-foreground max-w-[140px] truncate">{n.job_title}</td>
                  <td className="px-5 py-3 text-muted-foreground max-w-[240px] truncate">{n.message}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex text-xs font-bold rounded-full px-2.5 py-0.5 border capitalize ${n.status === "pending" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-muted text-muted-foreground border-border"}`}>
                      {n.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground text-xs">{new Date(n.created_at).toLocaleString("en-ZA", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}</td>
                  <td className="px-5 py-3">
                    {n.status === "pending" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs font-bold" onClick={() => markOneRead(n.id)}>Mark read</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Emails Section ─────────────────────────────────────────────────────── */

function EmailsSection({ emails, onResend }: { emails: EmailNotification[]; onResend: (id: string) => void }) {
  const [filter, setFilter] = useState<"all" | "pending" | "sent" | "failed">("all");
  const filtered = filter === "all" ? emails : emails.filter(e => e.status === filter);
  const emailStatusBadge = (s: string) =>
    s === "sent"    ? "bg-green-50 text-green-700 border-green-200" :
    s === "failed"  ? "bg-red-50 text-red-600 border-red-200" :
    s === "pending" ? "bg-amber-50 text-amber-700 border-amber-200" :
    "bg-muted text-muted-foreground";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-serif text-2xl font-bold" style={{ color: "#1B2E4B" }}>Email Notifications Queue 📧</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            {emails.length} total · {emails.filter(e => e.status === "pending").length} pending · {emails.filter(e => e.status === "failed").length} failed
          </p>
        </div>
        <div className="flex gap-2">
          {(["all", "pending", "sent", "failed"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize ${filter === f ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border hover:border-primary"}`}>
              {f} {f !== "all" && `(${emails.filter(e => e.status === f).length})`}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-border">
          <Mail className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold text-foreground">No emails match this filter</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">To</th>
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Subject</th>
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Date</th>
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(e => (
                <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3 font-medium text-foreground">{e.to_email}</td>
                  <td className="px-5 py-3 text-muted-foreground max-w-xs truncate">{e.subject}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex text-xs font-bold rounded-full px-2.5 py-0.5 border capitalize ${emailStatusBadge(e.status)}`}>{e.status}</span>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground text-xs">{new Date(e.created_at).toLocaleString("en-ZA")}</td>
                  <td className="px-5 py-3">
                    {e.status === "failed" && (
                      <Button size="sm" className="h-7 text-xs font-bold" style={{ background: "#2D7DD2", color: "white" }} onClick={() => onResend(e.id)}>
                        <RefreshCw className="h-3 w-3 mr-1" />Resend
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Detail helper ──────────────────────────────────────────────────────── */

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="font-semibold text-foreground mt-0.5">{value ?? "—"}</p>
    </div>
  );
}

/* ── Analytics ──────────────────────────────────────────────────────────── */

function groupByWeek(items: { created_at: string }[], countField = "count") {
  const weeks: Record<string, number> = {};
  const sorted = [...items].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  sorted.forEach(item => {
    const d = new Date(item.created_at);
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const key = monday.toLocaleDateString("en-ZA", { month: "short", day: "numeric" });
    weeks[key] = (weeks[key] || 0) + 1;
  });
  return Object.entries(weeks).slice(-8).map(([week, n]) => ({ week, [countField]: n }));
}

const CHART_COLORS = ["#2D7DD2", "#F5A623", "#10B981", "#7C3AED", "#EF4444", "#0EA5E9"];

function AnalyticsSection({
  jobs, workers, payments, applications,
}: {
  jobs: JobFull[];
  workers: WorkerFull[];
  payments: PaymentRow[];
  applications: (Application & { job_title?: string; job_poster?: string })[];
}) {
  const jobsByWeek    = groupByWeek(jobs, "jobs");
  const workersByWeek = groupByWeek(workers, "workers");
  const appsByWeek    = groupByWeek(applications, "applications");

  const earningsByWeek = (() => {
    const released = payments.filter(p => p.status === "released");
    const weeks: Record<string, number> = {};
    released.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    released.forEach(p => {
      const d = new Date(p.created_at);
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const key = monday.toLocaleDateString("en-ZA", { month: "short", day: "numeric" });
      weeks[key] = (weeks[key] || 0) + p.platform_fee;
    });
    return Object.entries(weeks).slice(-8).map(([week, earnings]) => ({ week, earnings: Math.round(earnings) }));
  })();

  const topCategories = (() => {
    const cats: Record<string, number> = {};
    jobs.forEach(j => {
      const jobCats = (j.categories && j.categories.length > 0) ? j.categories : [j.category];
      jobCats.forEach(c => { cats[c] = (cats[c] ?? 0) + 1; });
    });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }));
  })();

  const totalEarnings  = payments.filter(p => p.status === "released").reduce((s, p) => s + p.platform_fee, 0);
  const conversionRate = jobs.length > 0 ? Math.round((payments.filter(p => p.status === "released").length / jobs.length) * 100) : 0;
  const avgJobValue    = jobs.length > 0 ? Math.round(payments.reduce((s, p) => s + p.amount, 0) / Math.max(payments.length, 1)) : 0;

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-2xl font-bold" style={{ color: "#1B2E4B" }}>Platform Analytics</h2>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard label="Total Platform Earnings" value={totalEarnings} prefix="R" color="#7C3AED" sub="From released payments" />
        <StatCard label="Conversion Rate"         value={`${conversionRate}%`} color="#10B981" sub="Jobs completed vs posted" />
        <StatCard label="Avg Job Value"           value={avgJobValue} prefix="R" color="#2D7DD2" sub="Per escrow transaction" />
        <StatCard label="Total Applications"      value={applications.length} color="#F5A623" sub="Across all jobs" />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-border p-6">
          <p className="font-semibold text-foreground mb-4">Jobs Posted (by week)</p>
          {jobsByWeek.length === 0 ? <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data yet</div> : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={jobsByWeek}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="week" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} allowDecimals={false} /><Tooltip /><Line type="monotone" dataKey="jobs" stroke="#2D7DD2" strokeWidth={2} dot={{ r: 4 }} /></LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-border p-6">
          <p className="font-semibold text-foreground mb-4">Workers Registered (by week)</p>
          {workersByWeek.length === 0 ? <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data yet</div> : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={workersByWeek}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="week" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} allowDecimals={false} /><Tooltip /><Line type="monotone" dataKey="workers" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} /></LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-border p-6">
          <p className="font-semibold text-foreground mb-4">Platform Earnings (by week, R)</p>
          {earningsByWeek.length === 0 ? <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data yet</div> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={earningsByWeek}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="week" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(v: number) => [`R${v}`, "Earnings"]} /><Bar dataKey="earnings" fill="#7C3AED" radius={[4,4,0,0]} /></BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-border p-6">
          <p className="font-semibold text-foreground mb-4">Applications (by week)</p>
          {appsByWeek.length === 0 ? <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data yet</div> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={appsByWeek}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="week" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} allowDecimals={false} /><Tooltip /><Bar dataKey="applications" fill="#F5A623" radius={[4,4,0,0]} /></BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border p-6">
        <p className="font-semibold text-foreground mb-4">Top Job Categories (from categories[] array)</p>
        {topCategories.length === 0 ? <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data yet</div> : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={topCategories} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={130} />
              <Tooltip />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {topCategories.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

/* ── Homeowners Section ─────────────────────────────────────────────────── */

function HomeownersSection({ homeowners, payments, jobs, onSelect, onSuspend, onRemove }: {
  homeowners: HomeownerProfile[];
  payments: PaymentRow[];
  jobs: JobFull[];
  onSelect: (h: HomeownerProfile) => void;
  onSuspend: (id: string, suspended: boolean) => void;
  onRemove: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = homeowners.filter(h => {
    const name = h.full_name || `${h.first_name ?? ""} ${h.last_name ?? ""}`.trim();
    const q = search.toLowerCase();
    return !q || name.toLowerCase().includes(q) || (h.email ?? "").toLowerCase().includes(q) || (h.city ?? "").toLowerCase().includes(q);
  });

  function homeownerStats(h: HomeownerProfile) {
    const hPayments = payments.filter(p => h.email && p.homeowner_email === h.email);
    const totalSpent = hPayments.reduce((s, p) => s + p.amount, 0);
    const completed = hPayments.filter(p => p.status === "released").length;
    const posted = jobs.filter(j => j.posted_by === h.id).length;
    return { totalSpent, completed, posted };
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-serif font-bold text-2xl" style={{ color: "#1B2E4B" }}>Homeowners ({homeowners.length})</h2>
        <input
          className="border border-border rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="Search by name, email, city…"
          value={search} onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Name","Email","Phone","City/Suburb","Member Since","Jobs Posted","Total Spent","Completed","Status","Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-12 text-muted-foreground">No homeowners found.</td></tr>
              ) : filtered.map(h => {
                const name = h.full_name || `${h.first_name ?? ""} ${h.last_name ?? ""}`.trim() || "—";
                const { totalSpent, completed, posted } = homeownerStats(h);
                return (
                  <tr key={h.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <button onClick={() => onSelect(h)} className="font-semibold text-primary hover:underline text-left">{name}</button>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{h.email ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{h.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{[h.suburb, h.city].filter(Boolean).join(", ") || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{new Date(h.created_at).toLocaleDateString("en-ZA")}</td>
                    <td className="px-4 py-3 font-semibold text-center">{posted}</td>
                    <td className="px-4 py-3 font-semibold text-center">R{totalSpent.toLocaleString("en-ZA")}</td>
                    <td className="px-4 py-3 font-semibold text-center">{completed}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${h.is_suspended ? "bg-red-50 text-red-700 border-red-200" : "bg-green-50 text-green-700 border-green-200"}`}>
                        {h.is_suspended ? "Suspended" : "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => onSuspend(h.id, !h.is_suspended)}
                          className={`text-xs font-bold px-2 py-1 rounded-lg transition-colors ${h.is_suspended ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-amber-100 text-amber-700 hover:bg-amber-200"}`}>
                          {h.is_suspended ? "Restore" : "Suspend"}
                        </button>
                        <button onClick={() => onRemove(h.id)} className="text-xs font-bold px-2 py-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── Homeowner Profile Modal ────────────────────────────────────────────── */

function HomeownerProfileModal({ homeowner, payments, jobs, onSuspend, onRemove, onClose }: {
  homeowner: HomeownerProfile;
  payments: PaymentRow[];
  jobs: JobFull[];
  onSuspend: (id: string, suspended: boolean) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}) {
  const name = homeowner.full_name || `${homeowner.first_name ?? ""} ${homeowner.last_name ?? ""}`.trim() || "—";
  const hPayments = payments.filter(p => homeowner.email && p.homeowner_email === homeowner.email);
  const hJobs = jobs.filter(j => j.posted_by === homeowner.id);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const totalSpent = hPayments.reduce((s, p) => s + p.amount, 0);
  const monthSpent = hPayments.filter(p => new Date(p.created_at) >= monthStart).reduce((s, p) => s + p.amount, 0);
  const avgJobValue = hJobs.length > 0 ? Math.round(hJobs.reduce((s, j) => s + (j.budget ?? 0), 0) / hJobs.length) : 0;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl" style={{ color: "#1B2E4B" }}>🏠 {name}</DialogTitle>
        </DialogHeader>

        {/* Profile details */}
        <div className="grid sm:grid-cols-2 gap-4 py-2">
          {[
            { label: "Email",        value: homeowner.email ?? "—" },
            { label: "Phone",        value: homeowner.phone ?? "—" },
            { label: "City",         value: homeowner.city ?? "—" },
            { label: "Suburb",       value: homeowner.suburb ?? "—" },
            { label: "Member Since", value: new Date(homeowner.created_at).toLocaleDateString("en-ZA") },
            { label: "Status",       value: homeowner.is_suspended ? "Suspended" : "Active" },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{label}</span>
              <span className="text-sm font-semibold">{value}</span>
            </div>
          ))}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2">
          {[
            { label: "Jobs Posted",    value: hJobs.length,                    color: "#2D7DD2" },
            { label: "Total Spent",    value: `R${totalSpent.toLocaleString("en-ZA")}`, color: "#7C3AED" },
            { label: "This Month",     value: `R${monthSpent.toLocaleString("en-ZA")}`, color: "#F5A623" },
            { label: "Avg Job Value",  value: `R${avgJobValue.toLocaleString("en-ZA")}`, color: "#10B981" },
          ].map(s => (
            <div key={s.label} className="bg-muted/30 rounded-xl p-4 text-center">
              <p className="text-xs font-semibold text-muted-foreground">{s.label}</p>
              <p className="font-extrabold text-xl mt-1" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Jobs posted */}
        <div>
          <h3 className="font-bold text-base mb-3" style={{ color: "#1B2E4B" }}>Jobs Posted ({hJobs.length})</h3>
          {hJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No jobs posted yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead><tr className="bg-muted/30 border-b border-border">
                  {["Title","Status","Budget","Date"].map(h => <th key={h} className="text-left px-3 py-2 text-xs font-bold text-muted-foreground uppercase">{h}</th>)}
                </tr></thead>
                <tbody>
                  {hJobs.map(j => (
                    <tr key={j.id} className="border-b border-border/50">
                      <td className="px-3 py-2 font-semibold">{j.title}</td>
                      <td className="px-3 py-2"><span className={`text-xs font-bold rounded-full px-2 py-0.5 ${statusBadge(j.status)}`}>{j.status}</span></td>
                      <td className="px-3 py-2">R{(j.budget ?? 0).toLocaleString("en-ZA")}</td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{new Date(j.created_at).toLocaleDateString("en-ZA")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payment history */}
        <div>
          <h3 className="font-bold text-base mb-3" style={{ color: "#1B2E4B" }}>Payment History ({hPayments.length})</h3>
          {hPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead><tr className="bg-muted/30 border-b border-border">
                  {["Job","Amount","Platform Fee","Worker Payout","Status","Date"].map(h => <th key={h} className="text-left px-3 py-2 text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">{h}</th>)}
                </tr></thead>
                <tbody>
                  {hPayments.map(p => (
                    <tr key={p.id} className="border-b border-border/50">
                      <td className="px-3 py-2 font-semibold">{p.job_title ?? "—"}</td>
                      <td className="px-3 py-2">R{p.amount.toLocaleString("en-ZA")}</td>
                      <td className="px-3 py-2">R{p.platform_fee.toLocaleString("en-ZA")}</td>
                      <td className="px-3 py-2">R{(p.amount - p.platform_fee).toLocaleString("en-ZA")}</td>
                      <td className="px-3 py-2"><span className={`text-xs font-bold rounded-full px-2 py-0.5 ${payStatusBadge(p.status)}`}>{p.status}</span></td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{new Date(p.created_at).toLocaleDateString("en-ZA")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-2 border-t border-border">
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onSuspend(homeowner.id, !homeowner.is_suspended)}
              className={homeowner.is_suspended ? "border-green-300 text-green-700 hover:bg-green-50" : "border-amber-300 text-amber-700 hover:bg-amber-50"}>
              <PauseCircle className="h-4 w-4 mr-1.5" />{homeowner.is_suspended ? "Restore Account" : "Suspend Account"}
            </Button>
            <Button variant="destructive" onClick={() => { onRemove(homeowner.id); onClose(); }}>
              <Trash2 className="h-4 w-4 mr-1.5" />Remove Account
            </Button>
          </div>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Users Section ──────────────────────────────────────────────────────── */

function UsersSection({ homeowners, workers, payments, onSuspendHomeowner, onRemoveHomeowner, onSelectHomeowner }: {
  homeowners: HomeownerProfile[];
  workers: WorkerFull[];
  payments: PaymentRow[];
  onSuspendHomeowner: (id: string, suspended: boolean) => void;
  onRemoveHomeowner: (id: string) => void;
  onSelectHomeowner: (h: HomeownerProfile) => void;
}) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "homeowner" | "worker">("all");

  type UserRow = {
    id: string; name: string; email: string; role: "homeowner" | "worker";
    city: string; memberSince: string; totalTransacted: number;
    status: string; raw: HomeownerProfile | WorkerFull;
  };

  const allUsers: UserRow[] = [
    ...homeowners.map(h => ({
      id: h.id,
      name: h.full_name || `${h.first_name ?? ""} ${h.last_name ?? ""}`.trim() || h.email || "—",
      email: h.email ?? "—",
      role: "homeowner" as const,
      city: h.city ?? "—",
      memberSince: h.created_at,
      totalTransacted: payments.filter(p => h.email && p.homeowner_email === h.email).reduce((s, p) => s + p.amount, 0),
      status: h.is_suspended ? "Suspended" : "Active",
      raw: h,
    })),
    ...workers.map(w => ({
      id: w.id,
      name: `${w.first_name} ${w.last_name}`.trim(),
      email: "—",
      role: "worker" as const,
      city: w.city ?? "—",
      memberSince: w.created_at,
      totalTransacted: payments.filter(p => p.worker_id === w.id && p.status === "released").reduce((s, p) => s + (p.amount - p.platform_fee), 0),
      status: w.is_suspended ? "Suspended" : w.is_verified ? "Verified" : "Active",
      raw: w,
    })),
  ].sort((a, b) => new Date(b.memberSince).getTime() - new Date(a.memberSince).getTime());

  const filtered = allUsers.filter(u => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.city.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-serif font-bold text-2xl" style={{ color: "#1B2E4B" }}>All Users ({allUsers.length})</h2>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg overflow-hidden border border-border text-sm font-semibold">
            {(["all","homeowner","worker"] as const).map(r => (
              <button key={r} onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 transition-colors ${roleFilter === r ? "text-white" : "text-muted-foreground hover:bg-muted/50"}`}
                style={roleFilter === r ? { background: "#1B2E4B" } : {}}>
                {r === "all" ? "All" : r === "homeowner" ? "Homeowners 🏠" : "Workers 🔨"}
              </button>
            ))}
          </div>
          <input
            className="border border-border rounded-lg px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Search…"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Name","Email","Role","City","Member Since","Total Transacted","Status","Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">No users found.</td></tr>
              ) : filtered.map(u => (
                <tr key={`${u.role}-${u.id}`} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    {u.role === "homeowner" ? (
                      <button onClick={() => onSelectHomeowner(u.raw as HomeownerProfile)} className="font-semibold text-primary hover:underline">{u.name}</button>
                    ) : (
                      <span className="font-semibold">{u.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${u.role === "homeowner" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-purple-50 text-purple-700 border-purple-200"}`}>
                      {u.role === "homeowner" ? "🏠 Homeowner" : "🔨 Worker"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.city}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{new Date(u.memberSince).toLocaleDateString("en-ZA")}</td>
                  <td className="px-4 py-3 font-semibold">R{u.totalTransacted.toLocaleString("en-ZA")}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                      u.status === "Suspended" ? "bg-red-50 text-red-700 border-red-200" :
                      u.status === "Verified"  ? "bg-green-50 text-green-700 border-green-200" :
                      "bg-blue-50 text-blue-700 border-blue-200"
                    }`}>{u.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {u.role === "homeowner" && (
                        <>
                          <button onClick={() => onSelectHomeowner(u.raw as HomeownerProfile)} className="text-xs font-bold px-2 py-1 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors">View</button>
                          <button onClick={() => onSuspendHomeowner(u.id, u.status !== "Suspended")}
                            className={`text-xs font-bold px-2 py-1 rounded-lg transition-colors ${u.status === "Suspended" ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-amber-100 text-amber-700 hover:bg-amber-200"}`}>
                            {u.status === "Suspended" ? "Restore" : "Suspend"}
                          </button>
                          <button onClick={() => onRemoveHomeowner(u.id)} className="text-xs font-bold px-2 py-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
