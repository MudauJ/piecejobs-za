import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { CATEGORIES, CITIES } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

const SB_URL = "https://vnrvwfialfvduvetoewa.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZucnZ3ZmlhbGZ2ZHV2ZXRvZXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NTUzMjYsImV4cCI6MjA5ODMzMTMyNn0.5mfElVG_tuhBLLP4BKdQ7v5zXLIi51LpMbZUmKZ8A9w";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock } from "lucide-react";

const TIME_SLOTS: string[] = [];
for (let h = 7; h <= 18; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`);
  if (h < 18) TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`);
}

const schema = z.object({
  title:          z.string().min(3, "Title must be at least 3 characters"),
  category:       z.string().min(1, "Please select a category"),
  description:    z.string().min(10, "Description must be at least 10 characters"),
  budget:         z.coerce.number().min(50, "Budget must be at least R50"),
  suburb:         z.string().min(2, "Please enter a suburb"),
  city:           z.string().min(1, "Please select a city"),
  poster_name:    z.string().min(2, "Please enter your name"),
  contact_number: z.string().min(10, "Please enter a valid contact number"),
  scheduled_date: z.string().min(1, "Please select the date needed"),
  scheduled_time: z.string().min(1, "Please select the time needed"),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
}

function sbHeaders(extra?: Record<string, string>) {
  return { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Content-Type": "application/json", ...extra };
}

export default function PostJobModal({ open, onOpenChange, userId }: Props) {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useHashLocation();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "", category: "", description: "",
      budget: undefined as unknown as number,
      suburb: "", city: "", poster_name: "", contact_number: "",
      scheduled_date: "", scheduled_time: "",
    },
  });

  async function queueNotifications(jobId: string, city: string, jobTitle: string, suburb: string, budget: number) {
    try {
      const wRes = await fetch(
        `${SB_URL}/rest/v1/workers?city=eq.${encodeURIComponent(city)}&is_verified=eq.true&select=id`,
        { headers: sbHeaders() },
      );
      if (!wRes.ok) return;
      const workers = await wRes.json() as { id: string }[];
      await Promise.all(workers.map(w =>
        fetch(`${SB_URL}/rest/v1/notifications_queue`, {
          method: "POST",
          headers: sbHeaders({ "Prefer": "return=minimal" }),
          body: JSON.stringify({
            worker_id: w.id,
            job_id:    jobId,
            message:   `New job in ${city}: "${jobTitle}" at ${suburb} — Budget R${budget}. Open PieceJobs ZA to apply!`,
            status:    "pending",
          }),
        }),
      ));
    } catch {
      // notifications are best-effort
    }
  }

  async function queueEmail(toEmail: string, jobTitle: string, city: string, suburb: string, budget: number) {
    try {
      await fetch(`${SB_URL}/rest/v1/email_notifications`, {
        method: "POST",
        headers: sbHeaders({ "Prefer": "return=minimal" }),
        body: JSON.stringify({
          to_email: toEmail,
          subject:  `Your job "${jobTitle}" is now live on PieceJobs ZA!`,
          body:     `Hi! Your job "${jobTitle}" in ${suburb}, ${city} has been posted successfully. Budget: R${budget}. Verified workers in ${city} are being notified. You will receive applications shortly.`,
          status:   "pending",
        }),
      });
    } catch {
      // best-effort
    }
  }

  async function onSubmit(values: FormValues) {
    if (!user || role !== "homeowner") return;
    setSubmitting(true);

    const r = await fetch(`${SB_URL}/rest/v1/jobs`, {
      method: "POST",
      headers: sbHeaders({ "Prefer": "return=representation" }),
      body: JSON.stringify({
        title:          values.title,
        category:       values.category,
        description:    values.description,
        budget:         values.budget,
        suburb:         values.suburb,
        city:           values.city,
        poster_name:    values.poster_name,
        contact_number: values.contact_number,
        scheduled_date: values.scheduled_date,
        scheduled_time: values.scheduled_time,
        is_urgent:      false,
        status:         "open",
        posted_by:      userId ?? null,
      }),
    });

    setSubmitting(false);

    if (!r.ok) {
      const msg = await r.text();
      toast({ title: "Error posting job", description: msg, variant: "destructive" });
      return;
    }

    const created = await r.json() as { id: string }[];
    const jobId = created[0]?.id;

    toast({
      title: "Job posted!",
      description: `Verified workers in ${values.city} will be notified.`,
    });

    if (jobId) {
      queueNotifications(jobId, values.city, values.title, values.suburb, values.budget);
      if (user.email) {
        queueEmail(user.email, values.title, values.city, values.suburb, values.budget);
      }
    }

    form.reset();
    onOpenChange(false);
  }

  const isBlocked = !user || role !== "homeowner";
  const today = new Date().toISOString().split("T")[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="modal-post-job">
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
                <p className="text-muted-foreground text-sm max-w-xs">
                  Only homeowner accounts can post jobs — create one to continue.
                </p>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                  <Button
                    className="font-bold"
                    style={{ background: "#F5A623", color: "#1B2E4B" }}
                    onClick={() => { onOpenChange(false); setLocation("/register"); }}
                  >
                    Create Homeowner Account
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="font-bold text-foreground text-lg">Not available for workers</p>
                <p className="text-muted-foreground text-sm max-w-xs">
                  Only homeowner accounts can post jobs. Your account is registered as a worker.
                </p>
                <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              </>
            )}
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Title</FormLabel>
                  <FormControl><Input placeholder="e.g. Full house cleaning — 3 bedrooms" data-testid="input-job-title" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="budget" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget (ZAR)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">R</span>
                        <Input type="number" className="pl-7" placeholder="350" data-testid="input-budget" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="scheduled_date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date Needed <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input type="date" min={today} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="scheduled_time" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time Needed <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIME_SLOTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea placeholder="Describe the job in detail — what needs doing, any special requirements, how long it might take..." rows={4} data-testid="textarea-description" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="suburb" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Suburb</FormLabel>
                    <FormControl><Input placeholder="e.g. Sandton" data-testid="input-suburb" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-city">
                          <SelectValue placeholder="Select city" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="poster_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name</FormLabel>
                    <FormControl><Input placeholder="e.g. Michael" data-testid="input-poster-name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="contact_number" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Number</FormLabel>
                    <FormControl><Input placeholder="e.g. 082 123 4567" data-testid="input-contact-number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 font-bold" disabled={submitting} data-testid="button-post-job-submit">
                  {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Posting...</> : "Post Job"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
