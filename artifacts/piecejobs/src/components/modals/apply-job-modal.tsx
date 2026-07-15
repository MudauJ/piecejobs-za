import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase, type Job } from "@/lib/supabase";
import { openWhatsAppMessage } from "@/lib/whatsapp";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MapPin, Banknote, MessageCircle } from "lucide-react";

const schema = z.object({
  worker_name: z.string().min(2, "Your name is required"),
  worker_phone: z.string().min(10, "Please enter a valid phone number"),
  message: z.string().min(10, "Please write a short message to the homeowner"),
  proposed_rate: z.coerce.number().min(1, "Please enter your proposed rate"),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  jobId: string | null;
  onOpenChange: (open: boolean) => void;
}

export default function ApplyJobModal({ jobId, onOpenChange }: Props) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [job, setJob] = useState<Job | null>(null);

  useEffect(() => {
    if (!jobId) { setJob(null); return; }
    supabase.from("jobs").select("*").eq("id", jobId).single().then(({ data }) => setJob(data));
  }, [jobId]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      worker_name: "",
      worker_phone: "",
      message: "",
      proposed_rate: undefined as unknown as number,
    },
  });

  async function onSubmit(values: FormValues) {
    if (!jobId || !job) return;
    setSubmitting(true);
    const { error } = await supabase.from("applications").insert([{
      ...values,
      job_id: jobId,
      status: "pending",
    }]);
    setSubmitting(false);
    if (error) {
      toast({ title: "Application failed", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Application sent!",
        description: "Opening WhatsApp so you can message the homeowner directly.",
      });
      form.reset();
      onOpenChange(false);
      if (job.contact_number) {
        const msg = `Hi! I applied for your job "${job.title}" on PieceJobs ZA. Please check your dashboard to review my application.`;
        openWhatsAppMessage(job.contact_number, msg);
      }
    }
  }

  return (
    <Dialog open={!!jobId} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="max-w-lg" data-testid="modal-apply-job">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-bold text-foreground">Apply for this Job</DialogTitle>
          <DialogDescription>Send your application to the homeowner.</DialogDescription>
        </DialogHeader>

        {job && (
          <div className="bg-muted rounded-lg p-4 border border-border space-y-1">
            <p className="font-bold text-foreground text-base">{job.title}</p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.suburb}, {job.city}</span>
              <span className="flex items-center gap-1"><Banknote className="h-3.5 w-3.5" />Budget: <strong className="text-foreground">R{job.budget}</strong></span>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="worker_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Name</FormLabel>
                  <FormControl><Input placeholder="Full name" data-testid="input-applicant-name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="worker_phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl><Input placeholder="082 123 4567" data-testid="input-applicant-phone" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="message" render={({ field }) => (
              <FormItem>
                <FormLabel>Message to Homeowner</FormLabel>
                <FormControl><Textarea placeholder="Introduce yourself — mention your experience, availability, and why you're a good fit..." rows={3} data-testid="textarea-application-message" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="proposed_rate" render={({ field }) => (
              <FormItem>
                <FormLabel>Your Proposed Rate (ZAR total)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">R</span>
                    <Input type="number" className="pl-7" placeholder="350" data-testid="input-proposed-rate" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex items-start gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2.5 text-xs text-green-800">
              <MessageCircle className="h-4 w-4 shrink-0 mt-0.5 text-green-600" />
              <span>After submitting, WhatsApp will open so you can message the homeowner directly — no account needed.</span>
            </div>

            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" className="flex-1 font-bold" disabled={submitting} data-testid="button-apply-submit">
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : "Send Application"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
