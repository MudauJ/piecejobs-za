import { useState } from "react";
import { Link } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { Button } from "@/components/ui/button";
import { MapPin, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import type { ModalState } from "@/App";

export default function Navbar({ setModalState }: { setModalState: React.Dispatch<React.SetStateAction<ModalState>> }) {
  const { user, role, signOut } = useAuth();
  const [, setLocation] = useHashLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    setLocation("/");
    setMobileOpen(false);
  }

  const mobileLinks = !user ? [
    { href: "/jobs",    label: "Browse Jobs" },
    { href: "/workers", label: "Find Workers" },
  ] : role === "homeowner" ? [
    { href: "/jobs",       label: "Browse Jobs" },
    { href: "/workers",    label: "Find Workers" },
    { href: "/dashboard",  label: "My Jobs" },
  ] : role === "worker" ? [
    { href: "/jobs",              label: "Browse Jobs" },
    { href: "/worker-dashboard",  label: "My Applications" },
  ] : role === "super_admin" ? [
    { href: "/jobs",  label: "Browse Jobs" },
    { href: "/admin", label: "Admin Dashboard" },
  ] : [];

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-foreground hover:opacity-80 transition-opacity">
          <MapPin className="h-6 w-6 text-primary" />
          <span className="font-serif font-bold text-xl tracking-tight text-foreground">PieceJobs ZA</span>
        </Link>

        {/* Desktop nav links */}
        {!user && (
          <div className="hidden md:flex items-center gap-6">
            <Link href="/jobs" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Browse Jobs</Link>
            <Link href="/workers" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Find Workers</Link>
          </div>
        )}
        {user && role === "homeowner" && (
          <div className="hidden md:flex items-center gap-6">
            <Link href="/jobs" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Browse Jobs</Link>
            <Link href="/workers" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Find Workers</Link>
            <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">My Jobs</Link>
          </div>
        )}
        {user && role === "worker" && (
          <div className="hidden md:flex items-center gap-6">
            <Link href="/jobs" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Browse Jobs</Link>
            <Link href="/worker-dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">My Applications</Link>
          </div>
        )}
        {user && role === "super_admin" && (
          <div className="hidden md:flex items-center gap-6">
            <Link href="/jobs" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Browse Jobs</Link>
          </div>
        )}

        {/* Desktop action buttons */}
        <div className="hidden md:flex items-center gap-2">
          {!user && (
            <>
              <Link href="/login"><Button variant="outline" className="font-semibold">Sign In</Button></Link>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold shadow-sm" onClick={() => setLocation("/register")}>
                Post a Job
              </Button>
            </>
          )}
          {user && role === "homeowner" && (
            <>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold shadow-sm" onClick={() => setModalState(prev => ({ ...prev, postJob: true }))}>
                Post a Job
              </Button>
              <Button variant="ghost" size="sm" className="font-semibold text-muted-foreground" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-1.5" />Sign Out
              </Button>
            </>
          )}
          {user && role === "worker" && (
            <Button variant="ghost" size="sm" className="font-semibold text-muted-foreground" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-1.5" />Sign Out
            </Button>
          )}
          {user && role === "super_admin" && (
            <>
              <Link href="/admin"><Button variant="outline" size="sm" className="font-semibold">Admin Dashboard</Button></Link>
              <Button variant="ghost" size="sm" className="font-semibold text-muted-foreground" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-1.5" />Sign Out
              </Button>
            </>
          )}
        </div>

        {/* Mobile right side */}
        <div className="flex md:hidden items-center gap-2">
          {!user && (
            <Button size="sm" className="bg-accent text-accent-foreground font-bold text-xs px-3 h-8" onClick={() => setLocation("/register")}>
              Post a Job
            </Button>
          )}
          {user && role === "homeowner" && (
            <Button size="sm" className="bg-accent text-accent-foreground font-bold text-xs px-3 h-8" onClick={() => { setModalState(prev => ({ ...prev, postJob: true })); setMobileOpen(false); }}>
              Post a Job
            </Button>
          )}
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="p-2 rounded-lg border border-border bg-white text-foreground"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-white shadow-lg">
          <div className="container mx-auto px-4 py-3 space-y-1">
            {mobileLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-3 rounded-lg text-sm font-semibold text-foreground hover:bg-muted transition-colors"
              >
                {link.label}
              </Link>
            ))}
            {!user && (
              <Link href="/login" onClick={() => setMobileOpen(false)} className="block px-4 py-3 rounded-lg text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                Sign In
              </Link>
            )}
            {user && (
              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-3 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />Sign Out
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
