import { Link } from "wouter";
import { MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer style={{ background: "#1B2E4B" }} className="text-white pt-14 pb-8">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-5">
              <MapPin className="h-6 w-6 text-white" />
              <span className="font-serif font-bold text-xl text-white">PieceJobs ZA</span>
            </Link>
            <p className="text-white/55 text-sm leading-relaxed max-w-sm">
              Connecting South African homeowners with verified local workers for household piece jobs. Building trust and opportunity in our communities.
            </p>
          </div>

          <div>
            <h4 className="font-serif font-bold text-white mb-5">Platform</h4>
            <ul className="space-y-3">
              <li><Link href="/jobs" className="text-sm text-white/55 hover:text-white transition-colors">Browse Jobs</Link></li>
              <li><Link href="/workers" className="text-sm text-white/55 hover:text-white transition-colors">Find Workers</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif font-bold text-white mb-5">Legal</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-sm text-white/55 hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="#" className="text-sm text-white/55 hover:text-white transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-white/40">
            © {new Date().getFullYear()} PieceJobs ZA. All rights reserved.
          </p>
          <p className="text-sm font-semibold text-white/70 flex items-center gap-1.5">
            Proudly South African 🇿🇦
          </p>
        </div>
      </div>
    </footer>
  );
}
