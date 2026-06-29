import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { supabase, type Job } from "@/lib/supabase";
import { ShieldCheck, Star, CreditCard, MapPin, ArrowRight } from "lucide-react";
import type { ModalState } from "@/App";

const CATEGORY_META: Record<string, { emoji: string }> = {
  "Cleaning":      { emoji: "🧹" },
  "Garden":        { emoji: "🌿" },
  "Laundry":       { emoji: "👕" },
  "Plumbing":      { emoji: "🔧" },
  "Painting":      { emoji: "🖌️" },
  "Grass cutting": { emoji: "✂️" },
  "Dishwashing":   { emoji: "🍽️" },
  "Moving":        { emoji: "📦" },
};

const DISPLAY_CATEGORIES = Object.keys(CATEGORY_META);

const SAMPLE_JOBS = [
  { emoji: "🌿", title: "Full garden cleanup", suburb: "Sandton, JHB", budget: 450, urgent: true },
  { emoji: "🧹", title: "3-bedroom deep clean", suburb: "Umhlanga, DBN", budget: 650, urgent: true },
  { emoji: "🔧", title: "Fix leaking kitchen tap", suburb: "Hatfield, PTA", budget: 400, urgent: false },
  { emoji: "📦", title: "Help moving furniture", suburb: "Morningside, DBN", budget: 500, urgent: false },
];

export default function Landing({ setModalState }: { setModalState: React.Dispatch<React.SetStateAction<ModalState>> }) {
  const [jobCounts, setJobCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    async function fetchCounts() {
      const { data } = await supabase.from("jobs").select("category").eq("status", "open");
      if (data) {
        const counts: Record<string, number> = {};
        data.forEach(j => { counts[j.category] = (counts[j.category] || 0) + 1; });
        setJobCounts(counts);
      }
    }
    fetchCounts();
  }, []);

  return (
    <div className="w-full">
      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden text-white"
        style={{ background: "linear-gradient(135deg, #1B2E4B 0%, #243d60 60%, #1e3555 100%)" }}
      >
        <div className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #2D7DD2 0%, transparent 60%), radial-gradient(circle at 80% 20%, #F5A623 0%, transparent 50%)" }}
        />
        <div className="container mx-auto px-6 py-20 lg:py-28 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left column */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-medium text-white/90">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                {Object.values(jobCounts).reduce((a, b) => a + b, 0) || "8"} jobs open right now
              </div>
              <h1 className="font-serif text-5xl md:text-6xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
                Local work,<br />done by{" "}
                <span style={{ color: "#F5A623" }}>local people</span>.
              </h1>
              <p className="text-lg text-white/75 leading-relaxed max-w-lg">
                The trusted community notice board for South African household piece jobs. Find a reliable worker today, or earn money helping your neighbours.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="font-bold text-base h-13 px-8 shadow-lg"
                  style={{ background: "#F5A623", color: "#1B2E4B" }}
                  onClick={() => setModalState(prev => ({ ...prev, postJob: true }))}
                  data-testid="button-hero-post-job"
                >
                  Post a Job
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="font-semibold text-base h-13 px-8 bg-transparent border-white/25 text-white hover:bg-white/10"
                  onClick={() => setModalState(prev => ({ ...prev, workerReg: true }))}
                  data-testid="button-hero-join-worker"
                >
                  Offer Your Skills
                </Button>
              </div>
              <div className="flex items-center gap-6 text-sm text-white/60 pt-2">
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-green-400" /> ID Verified Workers</span>
                <span className="flex items-center gap-1.5"><Star className="h-4 w-4 text-amber-400" /> Community Rated</span>
              </div>
            </div>

            {/* Right column — live job preview */}
            <div className="hidden lg:block">
              <div className="bg-white/8 backdrop-blur-sm border border-white/15 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-white/80 uppercase tracking-wider">Latest Jobs</span>
                  <Link href="/jobs" className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors">
                    View all <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                {SAMPLE_JOBS.map((job, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-white/8 hover:bg-white/12 rounded-xl px-4 py-3 transition-colors cursor-pointer"
                    onClick={() => setModalState(prev => ({ ...prev, postJob: false }))}
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl shrink-0">
                      {job.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{job.title}</p>
                      <p className="text-white/55 text-xs flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" />{job.suburb}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-amber-400 text-sm">R{job.budget}</p>
                      {job.urgent && (
                        <span className="text-xs bg-red-500/20 text-red-300 rounded px-1.5 py-0.5">Urgent</span>
                      )}
                    </div>
                  </div>
                ))}
                <Link href="/jobs">
                  <Button className="w-full mt-2 bg-white/10 hover:bg-white/20 text-white border-0 font-semibold text-sm h-10">
                    Browse all jobs →
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Categories ── */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="font-serif text-4xl font-bold text-foreground mb-3">What do you need help with?</h2>
            <p className="text-muted-foreground text-lg">Click a category to browse matching jobs in your area.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {DISPLAY_CATEGORIES.map((cat) => {
              const meta = CATEGORY_META[cat];
              const count = jobCounts[cat] || 0;
              return (
                <Link
                  key={cat}
                  href={`/jobs?category=${encodeURIComponent(cat)}`}
                  data-testid={`card-category-${cat}`}
                  className="bg-white border-t-4 border-t-transparent border border-border rounded-2xl p-5 flex flex-col items-center gap-3 cursor-pointer group transition-all duration-200 hover:border-t-primary hover:shadow-lg hover:-translate-y-0.5 text-center"
                >
                  <span className="text-4xl">{meta.emoji}</span>
                  <span className="font-bold text-foreground group-hover:text-primary transition-colors text-sm leading-tight">{cat}</span>
                  <span className="text-xs text-muted-foreground font-medium">
                    {count > 0 ? `${count} job${count !== 1 ? "s" : ""}` : "Post first"}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl font-bold text-foreground mb-3">How PieceJobs Works</h2>
            <p className="text-muted-foreground text-lg">Simple for homeowners. Powerful for workers.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-16 max-w-5xl mx-auto">
            <div className="space-y-8">
              <h3 className="font-serif text-2xl font-bold text-primary border-b-2 border-primary/20 pb-4">For Homeowners</h3>
              {[
                { n: "1", title: "Post your job", desc: "Describe what needs doing, where, and your budget. Takes 2 minutes." },
                { n: "2", title: "Review applications", desc: "Verified local workers apply. Read their profiles and ratings." },
                { n: "3", title: "Get it done", desc: "Choose your worker, agree on the time, and pay them directly." },
              ].map(s => (
                <div key={s.n} className="flex gap-5">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-lg shrink-0" style={{ background: "rgba(245,166,35,0.15)", color: "#F5A623" }}>{s.n}</div>
                  <div>
                    <h4 className="font-bold text-lg text-foreground">{s.title}</h4>
                    <p className="text-muted-foreground mt-1">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-8">
              <h3 className="font-serif text-2xl font-bold text-foreground border-b-2 border-border pb-4">For Workers</h3>
              {[
                { n: "1", title: "Create a profile", desc: "List your skills, set your rate, and verify your SA ID." },
                { n: "2", title: "Find local jobs", desc: "Browse piece jobs in your suburb and apply with a message." },
                { n: "3", title: "Build your reputation", desc: "Do great work, earn ratings, and get more jobs over time." },
              ].map(s => (
                <div key={s.n} className="flex gap-5">
                  <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0">{s.n}</div>
                  <div>
                    <h4 className="font-bold text-lg text-foreground">{s.title}</h4>
                    <p className="text-muted-foreground mt-1">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust Section ── */}
      <section className="py-24 text-white" style={{ background: "#1B2E4B" }}>
        <div className="container mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="font-serif text-4xl font-bold mb-3">
              Built on <span style={{ color: "#F5A623" }}>trust</span>
            </h2>
            <p className="text-white/60 text-lg">Safety and community are at the heart of everything we do.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="flex flex-col items-center gap-5 text-center p-8 rounded-2xl bg-white/5 border border-white/10">
              <ShieldCheck className="w-14 h-14 text-white" strokeWidth={1.5} />
              <div>
                <h3 className="font-serif text-xl font-bold mb-2">SA ID Verification</h3>
                <p className="text-white/55 text-sm leading-relaxed">All worker profiles require a valid South African ID number for community safety.</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-5 text-center p-8 rounded-2xl bg-white/5 border border-white/10">
              <Star className="w-14 h-14 text-white" strokeWidth={1.5} />
              <div>
                <h3 className="font-serif text-xl font-bold mb-2">Community Ratings</h3>
                <p className="text-white/55 text-sm leading-relaxed">Read real reviews from homeowners in your area before you hire anyone.</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-5 text-center p-8 rounded-2xl bg-white/5 border border-white/10">
              <CreditCard className="w-14 h-14 text-white" strokeWidth={1.5} />
              <div>
                <h3 className="font-serif text-xl font-bold mb-2">Direct Payments</h3>
                <p className="text-white/55 text-sm leading-relaxed">No platform fees. You pay the worker directly when the job is done to your satisfaction.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
