import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase, CATEGORIES, CITIES } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, Upload, CheckCircle2, AlertCircle, FileText } from "lucide-react";

const SB_URL = "https://vnrvwfialfvduvetoewa.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZucnZ3ZmlhbGZ2ZHV2ZXRvZXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NTUzMjYsImV4cCI6MjA5ODMzMTMyNn0.5mfElVG_tuhBLLP4BKdQ7v5zXLIi51LpMbZUmKZ8A9w";

const SKILL_CATEGORIES = CATEGORIES.filter(c => c !== "Other");

const schema = z.object({
  first_name:  z.string().min(2, "First name required"),
  last_name:   z.string().min(2, "Last name required"),
  skills:      z.array(z.string()).min(1, "Please select at least one skill"),
  suburb:      z.string().min(2, "Please enter your suburb"),
  city:        z.string().min(1, "Please select your city"),
  id_number:   z.string().min(13, "Please enter a valid 13-digit SA ID number").max(13),
  phone:       z.string().min(10, "Please enter a valid phone number"),
  hourly_rate: z.coerce.number().min(30, "Minimum hourly rate is R30"),
});
type FormValues = z.infer<typeof schema>;

type DocStatus = "idle" | "uploading" | "done" | "error";
type DocSlot = { file: File | null; previewUrl: string; status: DocStatus; fileUrl: string; error: string };

const emptySlot = (): DocSlot => ({ file: null, previewUrl: "", status: "idle", fileUrl: "", error: "" });

interface Props { open: boolean; onOpenChange: (open: boolean) => void }

export default function WorkerRegistrationModal({ open, onOpenChange }: Props) {
  const { user }    = useAuth();
  const { toast }   = useToast();
  const [step, setStep]         = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [workerId, setWorkerId] = useState<string | null>(null);

  const [idDoc,    setIdDoc]    = useState<DocSlot>(emptySlot());
  const [proofDoc, setProofDoc] = useState<DocSlot>(emptySlot());
  const [photoDoc, setPhotoDoc] = useState<DocSlot>(emptySlot());

  const idRef    = useRef<HTMLInputElement>(null);
  const proofRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { first_name: "", last_name: "", skills: [], suburb: "", city: "", id_number: "", phone: "", hourly_rate: undefined as unknown as number },
  });

  function resetAll() {
    form.reset();
    setStep(1);
    setWorkerId(null);
    setIdDoc(emptySlot());
    setProofDoc(emptySlot());
    setPhotoDoc(emptySlot());
  }

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const { data, error } = await supabase
      .from("workers")
      .insert([{ ...values, user_id: user?.id ?? null, is_verified: false, rating: 0, review_count: 0 }])
      .select("id")
      .single();
    setSubmitting(false);

    if (error || !data) {
      toast({ title: "Registration failed", description: error?.message ?? "Unknown error", variant: "destructive" });
      return;
    }
    setWorkerId(data.id);
    setStep(2);
  }

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

      const storageRes = await fetch(`${SB_URL}/storage/v1/object/worker-documents/${path}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${SB_KEY}`, "Content-Type": file.type, "x-upsert": "true" },
        body: file,
      });
      if (!storageRes.ok) {
        const msg = await storageRes.text();
        throw new Error(msg);
      }

      const publicUrl = `${SB_URL}/storage/v1/object/public/worker-documents/${path}`;

      await fetch(`${SB_URL}/rest/v1/worker_documents`, {
        method: "POST",
        headers: { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Content-Type": "application/json", "Prefer": "return=minimal" },
        body: JSON.stringify({ worker_id: workerId, document_type: docType, file_url: publicUrl, file_name: file.name, status: "pending" }),
      });

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
    resetAll();
    onOpenChange(false);
  }

  function handleOpenChange(v: boolean) {
    if (!v) resetAll();
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="modal-worker-reg">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-bold text-foreground">
            {step === 1 ? "Join as a Worker" : "Upload Your Documents"}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Create your profile and start finding piece jobs in your area."
              : "Upload your ID and proof of residence to get verified faster. You can skip and do this later."}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 pt-1">
          {[1, 2].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${step >= s ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>{s}</div>
              <span className={`text-xs font-semibold ${step >= s ? "text-foreground" : "text-muted-foreground"}`}>{s === 1 ? "Basic Info" : "Documents"}</span>
              {s < 2 && <div className="h-px w-6 bg-border" />}
            </div>
          ))}
        </div>

        {/* ─── STEP 1 ─── */}
        {step === 1 && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="first_name" render={({ field }) => (
                  <FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="Thabo" data-testid="input-first-name" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="last_name" render={({ field }) => (
                  <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input placeholder="Mokoena" data-testid="input-last-name" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <FormField control={form.control} name="skills" render={() => (
                <FormItem>
                  <FormLabel>Skills (select all that apply)</FormLabel>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {SKILL_CATEGORIES.map(skill => (
                      <FormField key={skill} control={form.control} name="skills" render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              data-testid={`checkbox-skill-${skill}`}
                              checked={field.value?.includes(skill)}
                              onCheckedChange={checked => {
                                const current = field.value || [];
                                field.onChange(checked ? [...current, skill] : current.filter(s => s !== skill));
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">{skill}</FormLabel>
                        </FormItem>
                      )} />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="suburb" render={({ field }) => (
                  <FormItem><FormLabel>Suburb</FormLabel><FormControl><Input placeholder="e.g. Soweto" data-testid="input-worker-suburb" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger data-testid="select-worker-city"><SelectValue placeholder="Select city" /></SelectTrigger></FormControl>
                      <SelectContent>{CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="id_number" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">SA ID Number <Lock className="h-3 w-3 text-muted-foreground" /></FormLabel>
                  <FormControl><Input placeholder="13-digit ID number" maxLength={13} data-testid="input-id-number" {...field} /></FormControl>
                  <p className="text-xs text-muted-foreground mt-1">Used for verification only. Never shared publicly.</p>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="082 123 4567" data-testid="input-worker-phone" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="hourly_rate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hourly Rate (ZAR)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">R</span>
                        <Input type="number" className="pl-7" placeholder="80" data-testid="input-hourly-rate" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" className="flex-1 font-bold" disabled={submitting} data-testid="button-worker-reg-submit">
                  {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating profile...</> : "Next: Upload Documents"}
                </Button>
              </div>
            </form>
          </Form>
        )}

        {/* ─── STEP 2 ─── */}
        {step === 2 && (
          <div className="space-y-5 pt-2">
            {/* ID Document */}
            <DocUploadSlot
              label="ID Document or Passport"
              hint="JPG, PNG or PDF"
              required
              accept="image/jpeg,image/png,application/pdf"
              slot={idDoc}
              inputRef={idRef}
              onFileChange={e => handleFile(e, "id_document", idDoc, setIdDoc)}
            />

            {/* Proof of Residence */}
            <DocUploadSlot
              label="Proof of Residence"
              hint="Utility bill, bank statement, or lease agreement — not older than 3 months"
              required
              accept="image/jpeg,image/png,application/pdf"
              slot={proofDoc}
              inputRef={proofRef}
              onFileChange={e => handleFile(e, "proof_of_residence", proofDoc, setProofDoc)}
            />

            {/* Profile Photo */}
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
              <Button
                variant="outline"
                className="flex-1 text-muted-foreground"
                onClick={finish}
              >
                Skip for now
              </Button>
              <Button
                className="flex-1 font-bold"
                style={{ background: "#2D7DD2" }}
                disabled={idDoc.status !== "done" || proofDoc.status !== "done"}
                onClick={finish}
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />Complete Registration
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              ID and proof of residence required to unlock the "Complete Registration" button.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ── Upload Slot Component ─────────────────────────────────────────────── */

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
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-6 text-muted-foreground hover:border-primary hover:text-primary transition-colors bg-muted/20"
        >
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
            <button type="button" className="ml-auto text-xs text-muted-foreground underline" onClick={() => inputRef.current?.click()}>Re-upload</button>
          </div>
          {isImage && (
            <div className={`overflow-hidden border border-green-200 ${circular ? "w-16 h-16 rounded-full mx-auto" : "w-full max-h-32 rounded-lg object-cover"}`}>
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
          <p className="text-xs text-red-600">{slot.error}</p>
          <button type="button" className="text-xs text-primary underline" onClick={() => inputRef.current?.click()}>Try again</button>
        </div>
      )}
    </div>
  );
}
