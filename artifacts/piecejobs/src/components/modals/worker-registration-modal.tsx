import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase, CATEGORIES, CITIES } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock } from "lucide-react";

const SKILL_CATEGORIES = CATEGORIES.filter(c => c !== "Other");

const schema = z.object({
  first_name: z.string().min(2, "First name required"),
  last_name: z.string().min(2, "Last name required"),
  skills: z.array(z.string()).min(1, "Please select at least one skill"),
  suburb: z.string().min(2, "Please enter your suburb"),
  city: z.string().min(1, "Please select your city"),
  id_number: z.string().min(13, "Please enter a valid 13-digit SA ID number").max(13),
  phone: z.string().min(10, "Please enter a valid phone number"),
  hourly_rate: z.coerce.number().min(30, "Minimum hourly rate is R30"),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function WorkerRegistrationModal({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: "",
      last_name: "",
      skills: [],
      suburb: "",
      city: "",
      id_number: "",
      phone: "",
      hourly_rate: undefined as unknown as number,
    },
  });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const { error } = await supabase.from("workers").insert([{
      ...values,
      is_verified: false,
      rating: 0,
      review_count: 0,
    }]);
    setSubmitting(false);
    if (error) {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile created!", description: "Welcome to PieceJobs ZA. You can now apply for jobs in your area." });
      form.reset();
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="modal-worker-reg">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-bold text-foreground">Join as a Worker</DialogTitle>
          <DialogDescription>Create your profile and start finding piece jobs in your area.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="first_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl><Input placeholder="Thabo" data-testid="input-first-name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="last_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl><Input placeholder="Mokoena" data-testid="input-last-name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
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
                            onCheckedChange={(checked) => {
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
                <FormItem>
                  <FormLabel>Suburb</FormLabel>
                  <FormControl><Input placeholder="e.g. Soweto" data-testid="input-worker-suburb" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-worker-city">
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

            <FormField control={form.control} name="id_number" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  SA ID Number <Lock className="h-3 w-3 text-muted-foreground" />
                </FormLabel>
                <FormControl><Input placeholder="13-digit ID number" maxLength={13} data-testid="input-id-number" {...field} /></FormControl>
                <p className="text-xs text-muted-foreground mt-1">Used for verification only. Never shared publicly.</p>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl><Input placeholder="082 123 4567" data-testid="input-worker-phone" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
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
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating profile...</> : "Create Profile"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
