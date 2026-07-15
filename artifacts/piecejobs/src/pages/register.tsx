import { useState } from "react";
import { Link, useLocation } from "wouter";
import { supabase, CATEGORIES, CITIES } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Loader2, Home, HardHat, Eye, EyeOff } from "lucide-react";

type Role = "homeowner" | "worker";

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
  const [, setLocation]             = useLocation();
  const { toast }                   = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const userId = data.user?.id;
    if (!userId) {
      toast({ title: "Please check your email to confirm your account." });
      setLoading(false);
      return;
    }

    const { error: profileErr } = await supabase.from("user_profiles").insert([{
      id:        userId,
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

      await supabase.from("workers").insert([{
        first_name,
        last_name,
        skills:      [],
        suburb,
        city,
        phone,
        id_number:   "",
        hourly_rate: Number(hourlyRate) || 0,
        is_verified: false,
        rating:      0,
        review_count: 0,
        user_id:     userId,
      }]);
    }

    toast({ title: "Account created!", description: "Welcome to PieceJobs ZA." });

    if (data.session) {
      if (role === "worker") setLocation("/worker-dashboard");
      else                   setLocation("/dashboard");
    } else {
      toast({ title: "Check your email", description: "Confirm your account then sign in." });
      setLocation("/login");
    }
    setLoading(false);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(160deg,#FFFFFF 0%,#F7F9FC 100%)" }}
    >
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 hover:opacity-80 mb-6">
            <MapPin className="h-7 w-7" style={{ color: "#2D7DD2" }} />
            <span className="font-serif font-bold text-2xl" style={{ color: "#1B2E4B" }}>
              PieceJobs ZA
            </span>
          </Link>
          <h1 className="font-serif text-3xl font-bold" style={{ color: "#1B2E4B" }}>
            Create your account
          </h1>
          <p className="text-muted-foreground mt-2">Join thousands using PieceJobs ZA</p>
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-sm p-8">
          {/* Role picker */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => setRole("homeowner")}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                role === "homeowner"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <Home className={`h-6 w-6 ${role === "homeowner" ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-sm font-bold ${role === "homeowner" ? "text-primary" : "text-foreground"}`}>
                I need help
              </span>
              <span className="text-xs text-muted-foreground">Homeowner</span>
            </button>
            <button
              type="button"
              onClick={() => setRole("worker")}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                role === "worker"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <HardHat className={`h-6 w-6 ${role === "worker" ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-sm font-bold ${role === "worker" ? "text-primary" : "text-foreground"}`}>
                I want to work
              </span>
              <span className="text-xs text-muted-foreground">Worker</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Full Name</label>
              <Input
                placeholder="e.g. Thabo Dlamini"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Email</label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Phone</label>
              <Input
                placeholder="e.g. 082 123 4567"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">City</label>
                <Select value={city} onValueChange={setCity} required>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    {CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Suburb</label>
                <Input
                  placeholder="e.g. Sandton"
                  value={suburb}
                  onChange={e => setSuburb(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
            </div>

            {role === "worker" && (
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Hourly Rate (ZAR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">R</span>
                  <Input
                    type="number"
                    className="pl-7 h-11"
                    placeholder="80"
                    value={hourlyRate}
                    onChange={e => setHourlyRate(e.target.value)}
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 font-bold text-base text-white mt-2"
              style={{ background: "#2D7DD2" }}
              disabled={loading || !city}
            >
              {loading
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account...</>
                : "Create account"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold hover:underline" style={{ color: "#2D7DD2" }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
