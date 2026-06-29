import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { CATEGORIES } from "@/lib/supabase";
import { ShieldCheck, Star, CreditCard } from "lucide-react";
import type { ModalState } from "@/App";

export default function Landing({ setModalState }: { setModalState: React.Dispatch<React.SetStateAction<ModalState>> }) {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="bg-foreground text-white py-20 lg:py-32 relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-tight">
              Local work, done by <span className="text-accent">local people</span>.
            </h1>
            <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
              The trusted community notice board for South African household piece jobs. Find a reliable worker today, or earn money helping your neighbours.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button size="lg" className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90 font-bold text-lg h-14 px-8" onClick={() => setModalState(prev => ({ ...prev, postJob: true }))}>
                Post a Job
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent border-white/20 text-white hover:bg-white/10 font-semibold text-lg h-14 px-8" onClick={() => setModalState(prev => ({ ...prev, workerReg: true }))}>
                Join as Worker
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="font-serif text-3xl font-bold text-center mb-12 text-foreground">What do you need help with?</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {CATEGORIES.filter(c => c !== "Other").map((cat) => (
              <Link key={cat} href={`/jobs?category=${encodeURIComponent(cat)}`} className="bg-white border border-border p-6 rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-primary hover:shadow-md transition-all group text-center cursor-pointer">
                <span className="text-center font-semibold text-foreground group-hover:text-primary transition-colors">{cat}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="font-serif text-3xl font-bold text-center mb-16 text-foreground">How PieceJobs Works</h2>
          <div className="grid md:grid-cols-2 gap-16 max-w-5xl mx-auto">
            <div className="space-y-8">
              <h3 className="font-serif text-2xl font-bold text-primary border-b pb-4">For Homeowners</h3>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold shrink-0">1</div>
                  <div>
                    <h4 className="font-bold text-lg text-foreground">Post your job</h4>
                    <p className="text-muted-foreground">Describe what needs doing, where, and your budget.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold shrink-0">2</div>
                  <div>
                    <h4 className="font-bold text-lg text-foreground">Review applications</h4>
                    <p className="text-muted-foreground">Get messages from verified local workers ready to help.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold shrink-0">3</div>
                  <div>
                    <h4 className="font-bold text-lg text-foreground">Get it done</h4>
                    <p className="text-muted-foreground">Choose your worker, agree on the time, and pay them directly.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-8">
              <h3 className="font-serif text-2xl font-bold text-foreground border-b pb-4">For Workers</h3>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">1</div>
                  <div>
                    <h4 className="font-bold text-lg text-foreground">Create a profile</h4>
                    <p className="text-muted-foreground">List your skills, location, and verify your ID.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">2</div>
                  <div>
                    <h4 className="font-bold text-lg text-foreground">Find local jobs</h4>
                    <p className="text-muted-foreground">Browse piece jobs in your suburb and apply directly.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">3</div>
                  <div>
                    <h4 className="font-bold text-lg text-foreground">Build your reputation</h4>
                    <p className="text-muted-foreground">Do great work, earn good ratings, and get more jobs.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="bg-foreground text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center max-w-5xl mx-auto">
            <div className="flex flex-col items-center gap-4">
              <ShieldCheck className="w-12 h-12 text-primary" />
              <h3 className="font-serif text-xl font-bold">SA ID Verification</h3>
              <p className="text-gray-400 text-sm">All worker profiles require a valid South African ID number for community safety.</p>
            </div>
            <div className="flex flex-col items-center gap-4">
              <Star className="w-12 h-12 text-accent" />
              <h3 className="font-serif text-xl font-bold">Community Ratings</h3>
              <p className="text-gray-400 text-sm">Read reviews from other homeowners in your area before hiring.</p>
            </div>
            <div className="flex flex-col items-center gap-4">
              <CreditCard className="w-12 h-12 text-green-400" />
              <h3 className="font-serif text-xl font-bold">Direct Payments</h3>
              <p className="text-gray-400 text-sm">No platform fees. You pay the worker directly when the job is done.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
