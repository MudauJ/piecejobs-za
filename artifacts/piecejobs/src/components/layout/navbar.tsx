import { Link } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { Button } from "@/components/ui/button";
import { MapPin, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import type { ModalState } from "@/App";

export default function Navbar({ setModalState }: { setModalState: React.Dispatch<React.SetStateAction<ModalState>> }) {
  const { user, role, signOut } = useAuth();
  const [, setLocation] = useHashLocation();

  async function handleSignOut() {
    await signOut();
    setLocation("/");
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-foreground hover:opacity-80 transition-opacity">
          <MapPin className="h-6 w-6 text-primary" />
          <span className="font-serif font-bold text-xl tracking-tight text-foreground">PieceJobs ZA</span>
        </Link>

        {/* ── Logged out ── */}
        {!user && (
          <>
            <div className="hidden md:flex items-center gap-6">
              <Link href="/jobs" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Browse Jobs
              </Link>
              <Link href="/workers" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Find Workers
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="outline" className="font-semibold">Sign In</Button>
              </Link>
              <Button
                className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold shadow-sm"
                onClick={() => setModalState(prev => ({ ...prev, postJob: true }))}
              >
                Post a Job
              </Button>
            </div>
          </>
        )}

        {/* ── Homeowner ── */}
        {user && role === "homeowner" && (
          <>
            <div className="hidden md:flex items-center gap-6">
              <Link href="/jobs" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Browse Jobs
              </Link>
              <Link href="/workers" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Find Workers
              </Link>
              <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                My Jobs
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Button
                className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold shadow-sm"
                onClick={() => setModalState(prev => ({ ...prev, postJob: true }))}
              >
                Post a Job
              </Button>
              <Button variant="ghost" size="sm" className="font-semibold text-muted-foreground" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-1.5" />Sign Out
              </Button>
            </div>
          </>
        )}

        {/* ── Worker ── */}
        {user && role === "worker" && (
          <>
            <div className="hidden md:flex items-center gap-6">
              <Link href="/jobs" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Browse Jobs
              </Link>
              <Link href="/workers" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Find Workers
              </Link>
              <Link href="/worker-dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                My Applications
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="font-semibold text-muted-foreground" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-1.5" />Sign Out
              </Button>
            </div>
          </>
        )}

        {/* ── Super admin ── */}
        {user && role === "super_admin" && (
          <>
            <div className="hidden md:flex items-center gap-6">
              <Link href="/jobs" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Browse Jobs
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/admin">
                <Button variant="outline" size="sm" className="font-semibold">Admin Dashboard</Button>
              </Link>
              <Button variant="ghost" size="sm" className="font-semibold text-muted-foreground" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-1.5" />Sign Out
              </Button>
            </div>
          </>
        )}

      </div>
    </nav>
  );
}
