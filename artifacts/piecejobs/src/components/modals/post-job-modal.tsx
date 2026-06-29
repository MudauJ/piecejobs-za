import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase, CATEGORIES, CITIES } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const schema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  category: z.string().min(1, "Please select a category"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  budget: z.coerce.number().min(50, "Budget must be at least R50"),
  suburb: z.string().min(2, "Please enter a suburb"),
  city: z.string().min(1, "Please select a city"),
  poster_name: z.string().min(2, "Please enter your name"),
  contact_number: z.string().min(10, "Please enter a valid contact number"),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PostJobModal({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      category: "",
      description: "",
      budget: undefined as unknown as number,
      suburb: "",
      city: "",
      poster_name: "",
      contact_number: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const { error } = await supabase.from("jobs").insert([{
      ...values,
      is_urgent: false,
      status: "open",
    }]);
    setSubmitting(false);
    if (error) {
      toast({ title: "Error posting job", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Job posted!", description: "Your job is now live and workers can apply." });
      form.reset();
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="modal-post-job">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-bold text-foreground">Post a Job</DialogTitle>
          <DialogDescription>Describe what you need done and local workers will apply.</DialogDescription>
        </DialogHeader>

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
      </DialogContent>
    </Dialog>
  );
}
