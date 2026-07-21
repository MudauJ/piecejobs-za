import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Loader2, Upload, CheckCircle2, AlertCircle, FileText } from "lucide-react";

const SB_URL = "https://vnrvwfialfvduvetoewa.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZucnZ3ZmlhbGZ2ZHV2ZXRvZXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NTUzMjYsImV4cCI6MjA5ODMzMTMyNn0.5mfElVG_tuhBLLP4BKdQ7v5zXLIi51LpMbZUmKZ8A9w";

type DocStatus = "idle" | "uploading" | "done" | "error";
type DocSlot   = { file: File | null; previewUrl: string; status: DocStatus; fileUrl: string; error: string };
const emptySlot = (): DocSlot => ({ file: null, previewUrl: "", status: "idle", fileUrl: "", error: "" });

export default function WorkerDocuments() {
  const { user }        = useAuth();
  const [, setLocation] = useHashLocation();
  const { toast }       = useToast();

  const [workerId, setWorkerId] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);

  const [idDoc,    setIdDoc]    = useState<DocSlot>(emptySlot());
  const [proofDoc, setProofDoc] = useState<DocSlot>(emptySlot());
  const [photoDoc, setPhotoDoc] = useState<DocSlot>(emptySlot());

  const idRef    = useRef<HTMLInputElement>(null);
  const proofRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const res = await fetch(
        `${SB_URL}/rest/v1/workers?user_id=eq.${user.id}&select=id&limit=1`,
        { headers: { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` } },
      );
      if (res.ok) {
        const rows = await res.json() as { id: string }[];
        setWorkerId(rows[0]?.id ?? null);
      }
      setFetching(false);
    })();
  }, [user]);

  async function uploadDoc(
    docType: string,
    slot: DocSlot,
    setSlot: React.Dispatch<React.SetStateAction<DocSlot>>,
    file: File,
  ) {
    if (!user || !workerId) return;
    const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : "";
    setSlot({ file, previewUrl: preview, status: "uploading", fileUrl: "", error: "" });

    try {
      const ext  = file.name.split(".").pop() ?? "bin";
      const path = `${user.id}/${docType}/${Date.now()}.${ext}`;

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
        throw new Error(`Storage error (${storageRes.status}): ${await storageRes.text()}`);
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
          worker_id:     workerId,
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
    toast({ title: "Documents saved!", description: "We'll review them and verify your profile soon." });
    setLocation("/worker-dashboard");
  }

  const canComplete  = idDoc.status === "done" && proofDoc.status === "done";
  const anyUploading = [idDoc, proofDoc, photoDoc].some(s => s.status === "uploading");

  if (!user) return null;

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!workerId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <p className="font-semibold text-foreground">Worker profile not found</p>
          <p className="text-sm text-muted-foreground">Register as a worker first to upload documents.</p>
          <Button onClick={() => setLocation("/register")} style={{ background: "#2D7DD2", color: "white" }}>Register as Worker</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(160deg,#FFFFFF 0%,#F7F9FC 100%)" }}>
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 hover:opacity-80 mb-6">
            <MapPin className="h-7 w-7" style={{ color: "#2D7DD2" }} />
            <span className="font-serif font-bold text-2xl" style={{ color: "#1B2E4B" }}>PieceJobs ZA</span>
          </Link>
          <h1 className="font-serif text-3xl font-bold" style={{ color: "#1B2E4B" }}>Upload Your Documents</h1>
          <p className="text-muted-foreground mt-2">Get verified faster by uploading your ID and proof of residence</p>
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-sm p-8 space-y-6">
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
            <Button variant="outline" className="flex-1" onClick={() => setLocation("/worker-dashboard")} disabled={anyUploading}>
              Back to Dashboard
            </Button>
            <Button
              className="flex-1 font-bold text-white"
              style={{ background: "#2D7DD2" }}
              disabled={!canComplete || anyUploading}
              onClick={finish}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />Save Documents
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Upload your SA ID and proof of residence to enable "Save Documents".
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Reusable upload slot ─────────────────────────────────────────── */

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
          <span className="text-sm font-semibold">Uploading…</span>
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
