import { useState, useMemo } from "react";
import { useHashLocation } from "wouter/use-hash-location";
import { CATEGORIES, CITIES, CATEGORY_EMOJI, analyzeBooking } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react";

const SB_URL = "https://vnrvwfialfvduvetoewa.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZucnJ3ZmlhbGZ2ZHV2ZXRvZXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NTUzMjYsImV4cCI6MjA5ODMzMTMyNn0.5mfElVG_tuhBLLP4BKdQ7v5zXLIi51LpMbZUmKZ8A9w";

const TIME_SLOTS: string[] = [];
for (let h = 7; h <= 18; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`);
  if (h < 18) TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`);
}

function sbHeaders(extra?: Record<string, string>) {
  return {
    "apikey": SB_KEY,
    "Authorization": `Bearer ${SB_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

type GroupDetail = { description: string; budget: string };
type WizardStep = 1 | 2 | 3 | 4;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
}

function autoTitle(categories: string[]): string {
  if (categories.length === 1) return categories[0];
  if (categories.length === 2) return `${categories[0]} & ${categories[1]}`;
  return `${categories.slice(0, -1).join(", ")} & ${categories[categories.length - 1]}`;
}

const STEP_LABELS = ["Select Tasks", "Job Details", "Location & Schedule", "Review & Post"];

export default function PostJobModal({ open, onOpenChange, userId }: Props) {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useHashLocation();

  // Wizard state
  const [step, setStep] = useState<WizardStep>(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Task selection
  const [selected, setSelected] = useState<string[]>([]);

  // Step 2: Details per group key ("bundle" for single/bundle, group.name for multi)
  const [groupDetails, setGroupDetails] = useState<Record<string, GroupDetail>>({});

  // Step 3: Location & schedule
  const [suburb, setSuburb] = useState("");
  const [city, setCity] = useState("");
  const [posterName, setPosterName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  const analysis = useMemo(() => analyzeBooking(selected), [selected]);
  const today = new Date().toISOString().split("T")[0];

  function reset() {
    setStep(1);
    setSelected([]);
    setGroupDetails({});
    setSuburb(""); setCity(""); setPosterName(""); setContactNumber("");
    setScheduledDate(""); setScheduledTime("");
  }

  function handleClose(isOpen: boolean) {
    if (!isOpen) reset();
    onOpenChange(isOpen);
  }

  function toggleCategory(cat: string) {
    setSelected(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  }

  function getDetail(key: string): GroupDetail {
    return groupDetails[key] ?? { description: "", budget: "" };
  }

  function setDetail(key: string, field: keyof GroupDetail, value: string) {
    setGroupDetails(prev => ({ ...prev, [key]: { ...getDetail(key), [field]: value } }));
  }

  function step2Keys(): string[] {
    return analysis.isBundle ? ["bundle"] : analysis.groups.map(g => g.name);
  }

  function step2Valid(): boolean {
    return step2Keys().every(k => {
      const d = getDetail(k);
      return d.description.trim().length >= 10 && Number(d.budget) >= 50;
    });
  }

  function step3Valid(): boolean {
    return suburb.trim().length >= 2 && city.length > 0 &&
           posterName.trim().length >= 2 && contactNumber.trim().length >= 10 &&
           scheduledDate.length > 0 && scheduledTime.length > 0;
  }

  function totalBudget(): number {
    return step2Keys().reduce((s, k) => s + (Number(getDetail(k).budget) || 0), 0);
  }

  async function queueNotifications(jobId: string, label: string, budget: number) {
    try {
      const r = await fetch(
        `${SB_URL}/rest/v1/workers?city=eq.${encodeURIComponent(city)}&is_verified=eq.true&select=id`,
        { headers: sbHeaders() },
      );
      if (!r.ok) return;
      const workers = await r.json() as { id: string }[];
      await Promise.all(workers.map(w =>
        fetch(`${SB_URL}/rest/v1/notifications_queue`, {
          method: "POST",
          headers: sbHeaders({ "Prefer": "return=minimal" }),
          body: JSON.stringify({
            worker_id: w.id,
            job_id: jobId,
            message: `New ${label} job in ${suburb}, ${city} — R${budget}. Tap to view.`,
            status: "pending",
            channel: "bell",
          }),
        }),
      ));
    } catch { /* best-effort */ }
  }

  async function handlePost() {
    if (!user || role !== "homeowner") return;
    setSubmitting(true);
    try {
      const sharedFields = {
        suburb, city,
        poster_name: posterName,
        contact_number: contactNumber,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        is_urgent: false,
        status: "open",
        posted_by: userId ?? null,
      };

      if (analysis.isBundle) {
        const detail = getDetail("bundle");
        const title  = autoTitle(selected);
        const r = await fetch(`${SB_URL}/rest/v1/jobs`, {
          method: "POST",
          headers: sbHeaders({ "Prefer": "return=representation" }),
          body: JSON.stringify({
            ...sharedFields,
            title,
            category: selected[0],
            categories: selected,
            booking_type: selected.length === 1 ? "single" : "bundle",
            description: detail.description,
            budget: Number(detail.budget),
          }),
        });
        if (!r.ok) throw new Error(await r.text());
        const [created] = await r.json() as { id: string }[];
        if (created?.id) queueNotifications(created.id, title, Number(detail.budget));

        toast({
          title: selected.length > 1 ? "Bundle job posted! 📦" : "Job posted!",
          description: selected.length > 1
            ? `Workers who can handle ${selected.length} tasks will see this job.`
            : `Verified workers in ${city} have been notified.`,
        });
      } else {
        // Multi-worker: create one job per group
        const createdIds: string[] = [];
        for (const group of analysis.groups) {
          const detail = getDetail(group.name);
          const title  = autoTitle(group.categories);
          const r = await fetch(`${SB_URL}/rest/v1/jobs`, {
            method: "POST",
            headers: sbHeaders({ "Prefer": "return=representation" }),
            body: JSON.stringify({
              ...sharedFields,
              title,
              category: group.categories[0],
              categories: group.categories,
              booking_type: "multi",
              parent_job_id: createdIds[0] ?? null,
              description: detail.description,
              budget: Number(detail.budget),
            }),
          });
          if (!r.ok) throw new Error(await r.text());
          const [created] = await r.json() as { id: string }[];
          if (created?.id) {
            createdIds.push(created.id);
            queueNotifications(created.id, group.categories.join(" + "), Number(detail.budget));
          }
        }
        // Make the first job also reference the group root
        if (createdIds.length > 1 && createdIds[0]) {
          await fetch(`${SB_URL}/rest/v1/jobs?id=eq.${createdIds[0]}`, {
            method: "PATCH",
            headers: sbHeaders({ "Prefer": "return=minimal" }),
            body: JSON.stringify({ parent_job_id: createdIds[0] }),
          });
        }

        toast({
          title: `${analysis.groups.length} jobs created! 👥`,
          description: `Your multi-task booking is live. Specialists in ${city} will be notified.`,
        });
      }

      reset();
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Error posting job", description: String(err), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  const isBlocked = !user || role !== "homeowner";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="modal-post-job">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-bold text-foreground">Post a Job</DialogTitle>
          <DialogDescription>Describe what you need done and local workers will apply.</DialogDescription>
        </DialogHeader>

        {isBlocked ? (
          <div className="py-8 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
              <Lock className="h-6 w-6 text-amber-600" />
            </div>
            {!user ? (
              <>
                <p className="font-bold text-foreground text-lg">Homeowner account required</p>
                <p className="text-muted-foreground text-sm max-w-xs">Only homeowner accounts can post jobs — create one to continue.</p>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                  <Button className="font-bold" style={{ background: "#F5A623", color: "#1B2E4B" }}
                    onClick={() => { onOpenChange(false); setLocation("/register"); }}>
                    Create Homeowner Account
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="font-bold text-foreground text-lg">Not available for workers</p>
                <p className="text-muted-foreground text-sm max-w-xs">Only homeowner accounts can post jobs.</p>
                <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Step progress indicator */}
            <div className="flex items-center mb-6">
              {STEP_LABELS.map((label, i) => (
                <div key={i} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      i + 1 < step  ? "bg-green-500 text-white" :
                      i + 1 === step ? "bg-primary text-white" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {i + 1 < step ? "✓" : i + 1}
                    </div>
                    <span className={`hidden sm:block text-xs font-semibold ${i + 1 === step ? "text-primary" : "text-muted-foreground"}`}>{label}</span>
                  </div>
                  {i < STEP_LABELS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 mb-4 ${i + 1 < step ? "bg-green-400" : "bg-border"}`} />
                  )}
                </div>
              ))}
            </div>

            {/* ── Step 1: Select Tasks ── */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-foreground text-lg mb-0.5">Which tasks do you need?</h3>
                  <p className="text-sm text-muted-foreground">Select one or more — we'll match you with the right workers.</p>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {CATEGORIES.filter(c => c !== "Other").map(cat => {
                    const isOn = selected.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center relative ${
                          isOn ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-white hover:border-primary/40"
                        }`}
                      >
                        {isOn && <CheckCircle2 className="absolute top-1.5 right-1.5 h-3.5 w-3.5 text-primary" />}
                        <span className="text-2xl">{CATEGORY_EMOJI[cat] ?? "📋"}</span>
                        <span className={`text-xs font-semibold leading-tight ${isOn ? "text-primary" : "text-foreground"}`}>{cat}</span>
                      </button>
                    );
                  })}
                </div>

                {selected.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-sm font-semibold text-foreground">Selected:</span>
                      {selected.map(cat => (
                        <span key={cat} className="inline-flex items-center gap-1 text-xs font-semibold bg-primary/10 text-primary rounded-full px-2.5 py-0.5">
                          {CATEGORY_EMOJI[cat]} {cat}
                          <button type="button" onClick={() => toggleCategory(cat)} className="ml-0.5 hover:text-red-500 transition-colors">×</button>
                        </span>
                      ))}
                    </div>

                    <div className={`rounded-xl p-3 text-sm font-semibold flex items-start gap-2 ${
                      analysis.isBundle
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}>
                      {analysis.isBundle
                        ? "✅ One worker can handle all these tasks"
                        : `ℹ️ These tasks need different specialists. We'll create ${analysis.groups.length} separate job${analysis.groups.length > 1 ? "s" : ""} for each group.`}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => handleClose(false)}>Cancel</Button>
                  <Button
                    type="button"
                    className="flex-1 font-bold bg-primary hover:bg-primary/90 text-white"
                    disabled={selected.length === 0}
                    onClick={() => setStep(2)}
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── Step 2: Job Details ── */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-foreground text-lg mb-0.5">Job Details</h3>
                  <p className="text-sm text-muted-foreground">
                    {analysis.isBundle
                      ? "One worker can handle everything — fill in the details below."
                      : "Each task group needs its own description and budget."}
                  </p>
                </div>

                {analysis.isBundle ? (
                  <div className="space-y-4 bg-muted/30 rounded-xl p-4 border">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Job title (auto-generated)</p>
                      <p className="font-bold text-foreground">
                        {selected.map(c => `${CATEGORY_EMOJI[c] ?? ""} ${c}`).join(" · ")}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1.5">Description <span className="text-red-500">*</span></label>
                      <Textarea
                        placeholder="Describe what needs to be done in detail — requirements, access info, how long it might take..."
                        rows={3}
                        value={getDetail("bundle").description}
                        onChange={e => setDetail("bundle", "description", e.target.value)}
                      />
                      {getDetail("bundle").description.length > 0 && getDetail("bundle").description.length < 10 && (
                        <p className="text-xs text-red-500 mt-1">At least 10 characters required</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1.5">Budget (ZAR) <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">R</span>
                        <Input
                          type="number"
                          className="pl-7"
                          placeholder="350"
                          value={getDetail("bundle").budget}
                          onChange={e => setDetail("bundle", "budget", e.target.value)}
                        />
                      </div>
                      {Number(getDetail("bundle").budget) > 0 && Number(getDetail("bundle").budget) < 50 && (
                        <p className="text-xs text-red-500 mt-1">Minimum R50</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {analysis.groups.map((group, i) => (
                      <div key={group.name} className="bg-muted/30 rounded-xl p-4 border space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</div>
                          <div>
                            <p className="font-bold text-foreground text-sm">{group.name} tasks</p>
                            <p className="text-xs text-muted-foreground">
                              {group.categories.map(c => `${CATEGORY_EMOJI[c] ?? ""} ${c}`).join("  ·  ")}
                            </p>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold mb-1.5">Description <span className="text-red-500">*</span></label>
                          <Textarea
                            placeholder={`Describe the ${group.categories.join(" + ")} work needed...`}
                            rows={2}
                            value={getDetail(group.name).description}
                            onChange={e => setDetail(group.name, "description", e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold mb-1.5">Budget (ZAR) <span className="text-red-500">*</span></label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">R</span>
                            <Input
                              type="number"
                              className="pl-7"
                              placeholder="350"
                              value={getDetail(group.name).budget}
                              onChange={e => setDetail(group.name, "budget", e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {totalBudget() > 0 && (
                      <div className="flex justify-between items-center bg-primary/5 rounded-xl px-4 py-3 border border-primary/20">
                        <span className="font-semibold text-foreground">Total across all jobs</span>
                        <span className="font-extrabold text-xl" style={{ color: "#1B2E4B" }}>R{totalBudget()}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                    <ChevronLeft className="h-4 w-4 mr-1" />Back
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 font-bold bg-primary hover:bg-primary/90 text-white"
                    disabled={!step2Valid()}
                    onClick={() => setStep(3)}
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── Step 3: Location & Schedule ── */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-foreground text-lg mb-0.5">Location & Schedule</h3>
                  <p className="text-sm text-muted-foreground">When and where do you need this done?</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Suburb <span className="text-red-500">*</span></label>
                    <Input placeholder="e.g. Sandton" value={suburb} onChange={e => setSuburb(e.target.value)} data-testid="input-suburb" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">City <span className="text-red-500">*</span></label>
                    <Select value={city} onValueChange={setCity}>
                      <SelectTrigger data-testid="select-city"><SelectValue placeholder="Select city" /></SelectTrigger>
                      <SelectContent>{CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Date Needed <span className="text-red-500">*</span></label>
                    <Input type="date" min={today} value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Time Needed <span className="text-red-500">*</span></label>
                    <Select value={scheduledTime} onValueChange={setScheduledTime}>
                      <SelectTrigger><SelectValue placeholder="Select time" /></SelectTrigger>
                      <SelectContent>{TIME_SLOTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Your Name <span className="text-red-500">*</span></label>
                    <Input placeholder="e.g. Michael" value={posterName} onChange={e => setPosterName(e.target.value)} data-testid="input-poster-name" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Contact Number <span className="text-red-500">*</span></label>
                    <Input placeholder="e.g. 082 123 4567" value={contactNumber} onChange={e => setContactNumber(e.target.value)} data-testid="input-contact-number" />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(2)}>
                    <ChevronLeft className="h-4 w-4 mr-1" />Back
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 font-bold bg-primary hover:bg-primary/90 text-white"
                    disabled={!step3Valid()}
                    onClick={() => setStep(4)}
                  >
                    Review <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── Step 4: Review & Post ── */}
            {step === 4 && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-foreground text-lg mb-0.5">Review & Post</h3>
                  <p className="text-sm text-muted-foreground">Check everything looks right before going live.</p>
                </div>

                <div className="space-y-3">
                  {(analysis.isBundle
                    ? [{ name: "bundle", categories: selected }]
                    : analysis.groups
                  ).map(group => {
                    const key    = analysis.isBundle ? "bundle" : group.name;
                    const detail = getDetail(key);
                    return (
                      <div key={key} className="bg-muted/30 rounded-xl p-4 border space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-bold text-foreground">{autoTitle(group.categories)}</p>
                          <p className="font-extrabold shrink-0" style={{ color: "#1B2E4B" }}>R{detail.budget}</p>
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          {group.categories.map(c => (
                            <span key={c} className="text-xs bg-primary/10 text-primary rounded-full px-2.5 py-0.5 font-semibold">
                              {CATEGORY_EMOJI[c]} {c}
                            </span>
                          ))}
                          {!analysis.isBundle && (
                            <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded-full px-2.5 py-0.5 font-semibold">
                              👥 Separate specialist
                            </span>
                          )}
                          {analysis.isBundle && selected.length > 1 && (
                            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2.5 py-0.5 font-semibold">
                              📦 Bundle job
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{detail.description}</p>
                      </div>
                    );
                  })}

                  {!analysis.isBundle && (
                    <div className="flex justify-between items-center bg-primary/5 rounded-xl px-4 py-3 border border-primary/20">
                      <span className="font-semibold text-foreground">Total budget ({analysis.groups.length} jobs)</span>
                      <span className="font-extrabold text-xl" style={{ color: "#1B2E4B" }}>R{totalBudget()}</span>
                    </div>
                  )}

                  <div className="bg-white rounded-xl p-4 border text-sm space-y-1.5">
                    <div className="flex gap-3"><span className="text-muted-foreground w-20 shrink-0">📍 Location</span><span className="font-semibold">{suburb}, {city}</span></div>
                    <div className="flex gap-3"><span className="text-muted-foreground w-20 shrink-0">📅 Date</span><span className="font-semibold">{new Date(scheduledDate + "T00:00:00").toLocaleDateString("en-ZA", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</span></div>
                    <div className="flex gap-3"><span className="text-muted-foreground w-20 shrink-0">🕐 Time</span><span className="font-semibold">{scheduledTime}</span></div>
                    <div className="flex gap-3"><span className="text-muted-foreground w-20 shrink-0">👤 Posted by</span><span className="font-semibold">{posterName}</span></div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(3)}>
                    <ChevronLeft className="h-4 w-4 mr-1" />Back
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 font-bold text-white"
                    style={{ background: "#F5A623", color: "#1B2E4B" }}
                    disabled={submitting}
                    onClick={handlePost}
                    data-testid="button-post-job-submit"
                  >
                    {submitting
                      ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Posting...</>
                      : !analysis.isBundle
                        ? `Post ${analysis.groups.length} Jobs`
                        : "Post Job"}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
