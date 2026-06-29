import { Link } from "wouter";
import { MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t bg-white pt-12 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <MapPin className="h-6 w-6 text-primary" />
              <span className="font-serif font-bold text-xl text-foreground">PieceJobs ZA</span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-sm">
              Connecting South African homeowners with verified local workers for household piece jobs. Building trust and opportunity in our communities.
            </p>
          </div>
          
          <div>
            <h4 className="font-serif font-bold text-foreground mb-4">Platform</h4>
            <ul className="space-y-3">
              <li><Link href="/jobs" className="text-sm text-muted-foreground hover:text-primary transition-colors">Browse Jobs</Link></li>
              <li><Link href="/workers" className="text-sm text-muted-foreground hover:text-primary transition-colors">Find Workers</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-serif font-bold text-foreground mb-4">Legal</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Terms of Service</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} PieceJobs ZA. All rights reserved.
          </p>
          <div className="text-sm font-medium flex items-center gap-2">
            Proudly South African 🇿🇦
          </div>
        </div>
      </div>
    </footer>
  );
}
