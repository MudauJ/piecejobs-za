import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { supabase, type Job } from "@/lib/supabase";
import { ShieldCheck, Star, CreditCard, MapPin, ArrowRight, Search, Flame } from "lucide-react";
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

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function Landing({ setModalState }: { setModalState: React.Dispatch<React.SetStateAction<ModalState>> }) {
  const [liveJobs, setLiveJobs] = useState<Job[]>([]);
  const [jobsLoaded, setJobsLoaded] = useState(false);
  const [jobCounts, setJobCounts] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchData() {
      // Fetch preview jobs (top 4) and all job counts in parallel
      const [previewRes, countsRes] = await Promise.all([
        supabase
          .from("jobs")
          .select("*")
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(4),
        supabase
          .from("jobs")
          .select("category")
          .eq("status", "open"),
      ]);

      setLiveJobs(previewRes.data ?? []);
      setJobsLoaded(true);

      if (countsRes.data) {
        const allCounts: Record<string, number> = {};
        countsRes.data.forEach((j: { category: string }) => {
          allCounts[j.category] = (allCounts[j.category] || 0) + 1;
        });
        setJobCounts(allCounts);
      }
    }
    fetchData();
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/jobs?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      setLocation("/jobs");
    }
  }

  const totalJobs = Object.values(jobCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="w-full">

      {/* ── HERO ── */}
      <section style={{ background: "linear-gradient(160deg, #FFFFFF 0%, #F7F9FC 100%)" }} className="pt-16 pb-0 border-b border-border">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-10 items-start">

            {/* Left: headline + search + category pills */}
            <div className="pb-16 pt-4 space-y-8">

              {totalJobs > 0 && (
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-primary bg-primary/8 border border-primary/15 rounded-full px-4 py-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  {totalJobs} jobs open right now
                </div>
              )}

              <div>
                <h1 className="font-serif text-5xl lg:text-6xl font-extrabold leading-[1.08] tracking-tight" style={{ color: "#1B2E4B" }}>
                  Find{" "}
                  <span className="relative inline-block">
                    trusted
                    <span
                      className="absolute left-0 -bottom-1 w-full h-[4px] rounded-full"
                      style={{ background: "#F5A623" }}
                      aria-hidden="true"
                    />
                  </span>
                  {" "}help<br />for any home job
                </h1>
                <p className="mt-6 text-lg leading-relaxed" style={{ color: "#64748b" }}>
                  Connect with verified local workers in your suburb for cleaning, gardening, plumbing, ironing and more.
                </p>
              </div>

              {/* Search bar */}
              <form onSubmit={handleSearch} className="relative flex items-center w-full">
                <Search className="absolute left-5 h-5 w-5 text-muted-foreground pointer-events-none shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="What do you need help with? e.g. garden, cleaning, plumbing..."
                  data-testid="input-hero-search"
                  className="w-full pl-13 pr-40 py-4 rounded-full border-2 border-border bg-white text-foreground placeholder:text-muted-foreground text-base shadow-sm focus:outline-none focus:border-primary transition-colors"
                  style={{ paddingLeft: "3.25rem" }}
                />
                <button
                  type="submit"
                  data-testid="button-hero-search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-6 py-2.5 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
                  style={{ background: "#2D7DD2" }}
                >
                  Search
                </button>
              </form>

              {/* Category quick-links */}
              <div className="flex flex-wrap gap-2">
                {DISPLAY_CATEGORIES.map(cat => (
                  <Link
                    key={cat}
                    href={`/jobs?category=${encodeURIComponent(cat)}`}
                    data-testid={`pill-cat-${cat}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium border border-border bg-white text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all cursor-pointer"
                  >
                    <span>{CATEGORY_META[cat].emoji}</span>
                    {cat}
                  </Link>
                ))}
              </div>

            </div>

            {/* Right: floating live-jobs card */}
            <div className="hidden lg:flex items-end justify-center pb-0 pt-6">
              <div className="w-full max-w-sm bg-white rounded-t-2xl shadow-xl border border-border overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <div>
                    <p className="font-serif font-bold text-foreground">Live jobs near you</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Updated in real time</p>
                  </div>
                  <Link href="/jobs" className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5">
                    View all <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                <div className="divide-y divide-border">
                  {!jobsLoaded ? (
                    // Skeleton — only while the first fetch is in-flight
                    [...Array(3)].map((_, i) => (
                      <div key={i} className="px-5 py-4 flex items-center gap-3 animate-pulse">
                        <div className="w-10 h-10 rounded-xl bg-muted shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-muted rounded w-3/4" />
                          <div className="h-2.5 bg-muted rounded w-1/2" />
                        </div>
                        <div className="h-4 bg-muted rounded w-10" />
                      </div>
                    ))
                  ) : liveJobs.length === 0 ? (
                    // Fetch completed but table is empty (or tables not yet created)
                    <div className="px-5 py-8 text-center">
                      <p className="text-2xl mb-2">📋</p>
                      <p className="text-sm font-medium text-foreground">No open jobs yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Be the first to post one!</p>
                    </div>
                  ) : (
                    // Real data
                    liveJobs.map(job => (
                      <div key={job.id} className="px-5 py-4 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                        <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center text-xl shrink-0">
                          {CATEGORY_META[job.category]?.emoji ?? "📋"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground text-sm truncate">{job.title}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {job.suburb}, {job.city}
                            <span className="mx-1">·</span>
                            {timeAgo(job.created_at)}
                          </div>
                        </div>
                        <div className="text-right shrink-0 space-y-1">
                          <p className="font-bold text-sm" style={{ color: "#F5A623" }}>R{job.budget}</p>
                          {job.is_urgent && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-red-50 text-red-600 border border-red-200 rounded px-1.5 py-0.5">
                              <Flame className="h-2.5 w-2.5" />Urgent
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="px-5 py-3 bg-muted/30 border-t border-border">
                  <Button
                    onClick={() => setModalState(prev => ({ ...prev, postJob: true }))}
                    className="w-full h-9 text-sm font-bold text-white"
                    style={{ background: "#F5A623", color: "#1B2E4B" }}
                    data-testid="button-card-post-job"
                  >
                    + Post your job
                  </Button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Trust badges ── */}
      <section className="bg-white border-b border-border py-5">
        <div className="container mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10">
            <div className="flex items-center gap-2.5 text-sm font-medium text-foreground">
              <span className="text-xl">🪪</span>
              <span>ID Verified Workers</span>
            </div>
            <div className="hidden sm:block w-px h-5 bg-border" />
            <div className="flex items-center gap-2.5 text-sm font-medium text-foreground">
              <span className="text-xl">⭐</span>
              <span>Community Rated</span>
            </div>
            <div className="hidden sm:block w-px h-5 bg-border" />
            <div className="flex items-center gap-2.5 text-sm font-medium text-foreground">
              <span className="text-xl">💳</span>
              <span>Pay Workers Directly</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Categories ── */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-serif text-4xl font-bold mb-3" style={{ color: "#1B2E4B" }}>What do you need help with?</h2>
            <p className="text-muted-foreground text-lg">Click a category to browse matching jobs in your area.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {DISPLAY_CATEGORIES.map((cat) => {
              const count = jobCounts[cat] || 0;
              return (
                <Link
                  key={cat}
                  href={`/jobs?category=${encodeURIComponent(cat)}`}
                  data-testid={`card-category-${cat}`}
                  className="bg-white border border-border rounded-2xl p-6 flex flex-col items-center gap-3 cursor-pointer group transition-all duration-200 hover:border-t-primary hover:shadow-lg hover:-translate-y-0.5 text-center"
                  style={{ borderTopWidth: "3px", borderTopColor: "transparent" }}
                  onMouseEnter={e => (e.currentTarget.style.borderTopColor = "#2D7DD2")}
                  onMouseLeave={e => (e.currentTarget.style.borderTopColor = "transparent")}
                >
                  <span className="text-4xl">{CATEGORY_META[cat].emoji}</span>
                  <span className="font-bold text-sm leading-tight group-hover:text-primary transition-colors" style={{ color: "#1B2E4B" }}>{cat}</span>
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
      <section className="py-24 bg-background">
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
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { Icon: ShieldCheck, title: "SA ID Verification", desc: "All worker profiles require a valid South African ID number for community safety." },
              { Icon: Star, title: "Community Ratings", desc: "Read real reviews from homeowners in your area before you hire anyone." },
              { Icon: CreditCard, title: "Direct Payments", desc: "No platform fees. You pay the worker directly when the job is done." },
            ].map(({ Icon, title, desc }) => (
              <div key={title} className="flex flex-col items-center gap-5 text-center p-8 rounded-2xl bg-white/5 border border-white/10">
                <Icon className="w-14 h-14 text-white" strokeWidth={1.5} />
                <div>
                  <h3 className="font-serif text-xl font-bold mb-2">{title}</h3>
                  <p className="text-white/55 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
