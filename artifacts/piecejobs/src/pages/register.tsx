import { useState, useRef } from "react";
import { Link } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { supabase, CATEGORIES, CITIES } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Loader2, Home, HardHat, Eye, EyeOff, Upload, CheckCircle2, AlertCircle, FileText, ChevronLeft } from "lucide-react";

const SB_URL = "https://vnrvwfialfvduvetoewa.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZucnZ3ZmlhbGZ2ZHV2ZXRvZXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NTUzMjYsImV4cCI6MjA5ODMzMTMyNn0.5mfElVG_tuhBLLP4BKdQ7v5zXLIi51LpMbZUmKZ8A9w";

type Role = "homeowner" | "worker";
type DocStatus = "idle" | "uploading" | "done" | "error";
type DocSlot = { file: File | null; previewUrl: string; status: DocStatus; fileUrl: string; error: string };

const emptySlot = (): DocSlot => ({ file: null, previewUrl: "", status: "idle", fileUrl: "", error: "" });

export default function Register() {
  const [role, setRole]             = useState<Role>("homeowner");
  const [fullName, setFullName]     = useState("");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone]           = useState("");
  const [city, setCity]             = useState("");
  const [suburb, setSuburb]         = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [loading, setLoading]       = useState(false);
  const [, setLocation]             = useHashLocation();
  const { toast }                   = useToast();

  const [step, setStep]         = useState<1 | 2>(1);
  const [userId, setUserId]     = useState<string | null>(null);
  const [workerId, setWorkerId] = useState<string | null>(null);

  const [idDoc,    setIdDoc]    = useState<DocSlot>(emptySlot());
  const [proofDoc, setProofDoc] = useState<DocSlot>(emptySlot());
  const [photoDoc, setPhotoDoc] = useState<DocSlot>(emptySlot());

  const idRef    = useRef<HTMLInputElement>(null);
  const proofRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const uid = data.user?.id;
    if (!uid) {
      toast({ title: "Please check your email to confirm your account." });
      setLoading(false);
      return;
    }

    const { error: profileErr } = await supabase.from("user_profiles").insert([{
      id:        uid,
      role,
      full_name: fullName,
      phone,
      city,
      suburb,
    }]);
    if (profileErr) {
      toast({ title: "Profile error", description: profileErr.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    if (role === "worker") {
      const nameParts  = fullName.trim().split(" ");
      const first_name = nameParts[0] ?? fullName;
      const last_name  = nameParts.slice(1).join(" ") || "-";

      const { data: wData } = await supabase.from("workers").insert([{
        first_name,
        last_name,
        skills:       [],
        suburb,
        city,
        phone,
        id_number:    "",
        hourly_rate:  Number(hourlyRate) || 0,
        is_verified:  false,
        rating:       0,
        review_count: 0,
        user_id:      uid,
      }]).select("id").single();

      setUserId(uid);
      setWorkerId(wData?.id ?? null);
      setLoading(false);
      setStep(2);
      return;
    }

    toast({ title: "Account created!", description: "Welcome to PieceJobs ZA." });
    if (data.session) setLocation("/dashboard");
    else {
      toast({ title: "Check your email", description: "Confirm your account then sign in." });
      setLocation("/login");
    }
    setLoading(false);
  }

  async function uploadDoc(
    docType: string,
    slot: DocSlot,
    setSlot: React.Dispatch<React.SetStateAction<DocSlot>>,
    file: File,
  ) {
    if (!userId) return;

    // Resolve the workers-table UUID — the Supabase client insert may not return it
    // if RLS or client config blocks the select, so we fall back to a direct fetch.
    let resolvedWorkerId = workerId;
    if (!resolvedWorkerId) {
      const wRes = await fetch(
        `${SB_URL}/rest/v1/workers?user_id=eq.${userId}&select=id&limit=1`,
        { headers: { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` } },
      );
      if (wRes.ok) {
        const rows = await wRes.json() as { id: string }[];
        resolvedWorkerId = rows[0]?.id ?? null;
        if (resolvedWorkerId) setWorkerId(resolvedWorkerId);
      }
    }

    if (!resolvedWorkerId) {
      setSlot(prev => ({ ...prev, status: "error", error: "Worker profile not found — please refresh and try again." }));
      return;
    }

    const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : "";
    setSlot({ file, previewUrl: preview, status: "uploading", fileUrl: "", error: "" });

    try {
      const ext  = file.name.split(".").pop() ?? "bin";
      const path = `${userId}/${docType}/${Date.now()}.${ext}`;

      const storageRes = await fetch(
        `${SB_URL}/storage/v1/object/worker-documents/${path}`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${SB_KEY}`,
            "Content-Type": file.type,
            "x-upsert": "true",
          },
          body: file,
        },
      );

      if (!storageRes.ok) {
        const msg = await storageRes.text();
        throw new Error(`Storage error (${storageRes.status}): ${msg}`);
      }

      const publicUrl = `${SB_URL}/storage/v1/object/public/worker-documents/${path}`;

      const saveDoc = await fetch(`${SB_URL}/rest/v1/worker_documents`, {
        method: "POST",
        headers: {
          "apikey": SB_KEY,
          "Authorization": `Bearer ${SB_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({
          worker_id:     resolvedWorkerId,
          document_type: docType,
          file_url:      publicUrl,
          file_name:     file.name,
          status:        "pending",
        }),
      });
      console.log("Document record save status:", saveDoc.status);
      const saveDocText = await saveDoc.text();
      console.log("Document record save response:", saveDocText);

      if (!saveDoc.ok) {
        throw new Error(`DB save failed (${saveDoc.status}): ${saveDocText}`);
      }

      setSlot(prev => ({ ...prev, status: "done", fileUrl: publicUrl }));
    } catch (err) {
      setSlot(prev => ({ ...prev, status: "error", error: String(err) }));
    }
  }

  function handleFile(
    e: React.ChangeEvent<HTMLInputElement>,
    docType: string,
    slot: DocSlot,
    setSlot: React.Dispatch<React.SetStateAction<DocSlot>>,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadDoc(docType, slot, setSlot, file);
    e.target.value = "";
  }

  function finish() {
    toast({ title: "Welcome to PieceJobs ZA! 🎉", description: "Your profile is live. Documents are under review." });
    setLocation("/worker-dashboard");
  }

  const canComplete = idDoc.status === "done" && proofDoc.status === "done";
  const anyUploading = [idDoc, proofDoc, photoDoc].some(s => s.status === "uploading");

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(160deg,#FFFFFF 0%,#F7F9FC 100%)" }}
    >
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 hover:opacity-80 mb-6">
            <MapPin className="h-7 w-7" style={{ color: "#2D7DD2" }} />
            <span className="font-serif font-bold text-2xl" style={{ color: "#1B2E4B" }}>PieceJobs ZA</span>
          </Link>
          <h1 className="font-serif text-3xl font-bold" style={{ color: "#1B2E4B" }}>
            {step === 1 ? "Create your account" : "Upload Your Documents"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {step === 1
              ? "Join thousands using PieceJobs ZA"
              : "Get verified faster by uploading your ID and proof of residence"}
          </p>
        </div>

        {/* Step indicator (worker only) */}
        {(step === 2 || role === "worker") && (
          <div className="flex items-center justify-center gap-3 mb-6">
            {[1, 2].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
                  step > s ? "bg-green-500 text-white" : step === s ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                }`}>
                  {step > s ? "✓" : s}
                </div>
                <span className={`text-sm font-semibold ${step >= s ? "text-foreground" : "text-muted-foreground"}`}>
                  {s === 1 ? "Basic Info" : "Documents"}
                </span>
                {s < 2 && <div className="h-px w-8 bg-border" />}
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-border shadow-sm p-8">

          {/* ── STEP 1 ─────────────────────────────────────── */}
          {step === 1 && (
            <>
              {/* Role picker */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button type="button" onClick={() => setRole("homeowner")}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${role === "homeowner" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                  <Home className={`h-6 w-6 ${role === "homeowner" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-sm font-bold ${role === "homeowner" ? "text-primary" : "text-foreground"}`}>I need help</span>
                  <span className="text-xs text-muted-foreground">Homeowner</span>
                </button>
                <button type="button" onClick={() => setRole("worker")}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${role === "worker" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                  <HardHat className={`h-6 w-6 ${role === "worker" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-sm font-bold ${role === "worker" ? "text-primary" : "text-foreground"}`}>I want to work</span>
                  <span className="text-xs text-muted-foreground">Worker</span>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Full Name</label>
                  <Input placeholder="e.g. Thabo Dlamini" value={fullName} onChange={e => setFullName(e.target.value)} required className="h-11" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Email</label>
                  <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required className="h-11" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Password</label>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} placeholder="At least 6 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="h-11 pr-10" />
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Phone</label>
                  <Input placeholder="e.g. 082 123 4567" value={phone} onChange={e => setPhone(e.target.value)} required className="h-11" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">City</label>
                    <Select value={city} onValueChange={setCity} required>
                      <SelectTrigger className="h-11"><SelectValue placeholder="Select city" /></SelectTrigger>
                      <SelectContent>{CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">Suburb</label>
                    <Input placeholder="e.g. Sandton" value={suburb} onChange={e => setSuburb(e.target.value)} required className="h-11" />
                  </div>
                </div>

                {role === "worker" && (
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">Hourly Rate (ZAR)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">R</span>
                      <Input type="number" className="pl-7 h-11" placeholder="80" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} />
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full h-11 font-bold text-base text-white mt-2" style={{ background: "#2D7DD2" }}
                  disabled={loading || !city}>
                  {loading
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account...</>
                    : role === "worker" ? "Next: Upload Documents →" : "Create account"}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold hover:underline" style={{ color: "#2D7DD2" }}>Sign in</Link>
              </p>
            </>
          )}

          {/* ── STEP 2: Document Upload ─────────────────────── */}
          {step === 2 && (
            <div className="space-y-6">
              <DocUploadSlot
                label="SA ID Document or Passport"
                hint="JPG, PNG or PDF accepted"
                required
                accept="image/jpeg,image/png,application/pdf"
                slot={idDoc}
                inputRef={idRef}
                onFileChange={e => handleFile(e, "id_document", idDoc, setIdDoc)}
              />

              <DocUploadSlot
                label="Proof of Residence"
                hint="Utility bill, bank statement, or lease — not older than 3 months"
                required
                accept="image/jpeg,image/png,application/pdf"
                slot={proofDoc}
                inputRef={proofRef}
                onFileChange={e => handleFile(e, "proof_of_residence", proofDoc, setProofDoc)}
              />

              <DocUploadSlot
                label="Profile Photo (optional)"
                hint="JPG or PNG — helps homeowners recognise you"
                required={false}
                accept="image/jpeg,image/png"
                slot={photoDoc}
                inputRef={photoRef}
                onFileChange={e => handleFile(e, "profile_photo", photoDoc, setPhotoDoc)}
                circular
              />

              <div className="flex gap-3 pt-2 border-t border-border">
                <Button variant="outline" className="flex-1 text-muted-foreground" onClick={finish} disabled={anyUploading}>
                  Skip for now
                </Button>
                <Button
                  className="flex-1 font-bold text-white"
                  style={{ background: "#2D7DD2" }}
                  disabled={!canComplete || anyUploading}
                  onClick={finish}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />Complete Registration
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Upload your SA ID and proof of residence to unlock "Complete Registration".
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Upload Slot ─────────────────────────────────────────────────────── */

function DocUploadSlot({
  label, hint, required, accept, slot, inputRef, onFileChange, circular = false,
}: {
  label: string;
  hint: string;
  required: boolean;
  accept: string;
  slot: DocSlot;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  circular?: boolean;
}) {
  const isImage = slot.previewUrl && slot.file?.type.startsWith("image/");
  const isPdf   = slot.file?.type === "application/pdf";

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {hint && <p className="text-xs text-muted-foreground -mt-1">{hint}</p>}

      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={onFileChange} />

      {slot.status === "idle" && (
        <button type="button" onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-6 text-muted-foreground hover:border-primary hover:text-primary transition-colors bg-muted/20">
          <Upload className="h-6 w-6" />
          <span className="text-sm font-medium">Click to upload</span>
        </button>
      )}

      {slot.status === "uploading" && (
        <div className="flex items-center gap-3 border border-border rounded-xl px-4 py-3 bg-muted/20">
          <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
          <span className="text-sm font-semibold text-foreground">Uploading…</span>
        </div>
      )}

      {slot.status === "done" && (
        <div className="border border-green-200 bg-green-50 rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            <span className="text-sm font-semibold text-green-800">Uploaded successfully</span>
            <button type="button" className="ml-auto text-xs text-muted-foreground underline"
              onClick={() => inputRef.current?.click()}>Re-upload</button>
          </div>
          {isImage && (
            <div className={`overflow-hidden border border-green-200 ${circular ? "w-16 h-16 rounded-full mx-auto" : "w-full max-h-32 rounded-lg"}`}>
              <img src={slot.previewUrl} alt="preview" className="w-full h-full object-cover" />
            </div>
          )}
          {isPdf && (
            <div className="flex items-center gap-2 text-sm text-green-700">
              <FileText className="h-4 w-4" />{slot.file?.name}
            </div>
          )}
        </div>
      )}

      {slot.status === "error" && (
        <div className="border border-red-200 bg-red-50 rounded-xl px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
            <span className="text-sm font-semibold text-red-700">Upload failed</span>
          </div>
          <p className="text-xs text-red-600 break-all">{slot.error}</p>
          <button type="button" className="text-xs text-primary underline"
            onClick={() => inputRef.current?.click()}>Try again</button>
        </div>
      )}
    </div>
  );
}
