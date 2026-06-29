import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import type { ModalState } from "@/App";

export default function Navbar({ setModalState }: { setModalState: React.Dispatch<React.SetStateAction<ModalState>> }) {
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-foreground hover:opacity-80 transition-opacity">
          <MapPin className="h-6 w-6 text-primary" />
          <span className="font-serif font-bold text-xl tracking-tight text-foreground">PieceJobs ZA</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-6">
          <Link href="/jobs" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Browse Jobs
          </Link>
          <Link href="/workers" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Find Workers
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" className="hidden sm:inline-flex font-semibold" onClick={() => setModalState(prev => ({ ...prev, workerReg: true }))}>
            Join as Worker
          </Button>
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold shadow-sm" onClick={() => setModalState(prev => ({ ...prev, postJob: true }))}>
            Post a Job
          </Button>
        </div>
      </div>
    </nav>
  );
}
