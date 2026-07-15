import { useState } from "react";
import { Link, useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Loader2, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [, setLocation]                 = useLocation();
  const { toast }                       = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    if (data.user) {
      const SUPABASE_URL      = "https://vnrvwfialfvduvetoewa.supabase.co";
      const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZucnZ3ZmlhbGZ2ZHV2ZXRvZXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NTUzMjYsImV4cCI6MjA5ODMzMTMyNn0.5mfElVG_tuhBLLP4BKdQ7v5zXLIi51LpMbZUmKZ8A9w";

      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${data.user.id}&select=role`,
        {
          headers: {
            "apikey":        SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type":  "application/json",
          },
        }
      );
      const rows = await res.json();
      const role = rows[0]?.role as string | undefined;

      console.log("[login] profile fetch raw:", JSON.stringify(rows));
      console.log("[login] profile fetch:", {
        userId: data.user.id,
        email: data.user.email,
        role: role ?? null,
        status: res.status,
      });

      if (!role) {
        console.warn("[login] No role returned — check user_profiles RLS policies and that a row exists for this user.");
        toast({
          title: "Profile error",
          description: "Could not load your account role. Please contact support.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (role === "super_admin") {
        console.log("[login] redirecting to /admin");
        setLocation("/admin");
      } else if (role === "worker") {
        console.log("[login] redirecting to /worker-dashboard");
        setLocation("/worker-dashboard");
      } else {
        console.log("[login] redirecting to /dashboard");
        setLocation("/dashboard");
      }
    }
    setLoading(false);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(160deg,#FFFFFF 0%,#F7F9FC 100%)" }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 hover:opacity-80 mb-6">
            <MapPin className="h-7 w-7" style={{ color: "#2D7DD2" }} />
            <span className="font-serif font-bold text-2xl" style={{ color: "#1B2E4B" }}>
              PieceJobs ZA
            </span>
          </Link>
          <h1 className="font-serif text-3xl font-bold" style={{ color: "#1B2E4B" }}>
            Welcome back
          </h1>
          <p className="text-muted-foreground mt-2">Sign in to your account</p>
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Email address
              </label>
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
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
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

            <Button
              type="submit"
              className="w-full h-11 font-bold text-base text-white"
              style={{ background: "#2D7DD2" }}
              disabled={loading}
            >
              {loading
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</>
                : "Sign in"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link href="/register" className="font-semibold hover:underline" style={{ color: "#2D7DD2" }}>
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
