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
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      console.log("[login] profile fetch:", {
        userId: data.user.id,
        email: data.user.email,
        role: profile?.role ?? null,
        error: profileError?.message ?? null,
        errorCode: profileError?.code ?? null,
      });

      const role = profile?.role;

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
