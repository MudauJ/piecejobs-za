import { useState, useEffect } from "react";
import { useHashLocation } from "wouter/use-hash-location";
import { supabase, type Job, CATEGORIES, CITIES } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Users, Search, Flame } from "lucide-react";
import type { ModalState } from "@/App";

const CATEGORY_EMOJI: Record<string, string> = {
  "Cleaning":      "🧹",
  "Garden":        "🌿",
  "Laundry":       "👕",
  "Plumbing":      "🔧",
  "Painting":      "🖌️",
  "Grass cutting": "✂️",
  "Dishwashing":   "🍽️",
  "Moving":        "📦",
  "Other":         "📋",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Jobs({ setModalState }: { setModalState: React.Dispatch<React.SetStateAction<ModalState>> }) {
  const { user, role } = useAuth();
  const [, setLocation] = useHashLocation();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [tab, setTab] = useState<"all" | "today" | "urgent">("all");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    async function fetchJobs() {
      setLoading(true);
      const { data, error } = await supabase
        .from("jobs")
        .select("*, applications(count)")
        .order("created_at", { ascending: false });
      if (!error && data) {
        setJobs(data.map((j: Job & { applications?: { count: number }[] }) => ({
          ...j,
          application_count: j.applications?.[0]?.count ?? 0,
        })));
      }
      setLoading(false);
    }
    fetchJobs();
  }, []);

  const now = Date.now();
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

  const openJobs = jobs.filter(j => j.status === "open");

  const filteredJobs = jobs.filter(job => {
    if (!showAll && job.status !== "open") return false;
    if (cityFilter !== "all" && job.city !== cityFilter) return false;
    if (categoryFilter !== "all" && job.category !== categoryFilter) return false;
    if (search && !job.title.toLowerCase().includes(search.toLowerCase()) && !(job.description ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    if (tab === "today" && new Date(job.created_at) < todayStart) return false;
    if (tab === "urgent" && !job.is_urgent) return false;
    return true;
  });

  const baseJobs = showAll ? jobs : openJobs;
  const urgentCount = baseJobs.filter(j => j.is_urgent).length;
  const todayCount  = baseJobs.filter(j => new Date(j.created_at) >= todayStart).length;

  return (
    <div className="bg-background min-h-screen">
      {/* Page header */}
      <div className="bg-white border-b border-border">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="font-serif text-4xl font-bold text-foreground">Available Jobs</h1>
              <p className="text-muted-foreground mt-1 text-base">
                {openJobs.length > 0 ? `${openJobs.length} open piece job${openJobs.length !== 1 ? "s" : ""} across South Africa` : "Find piece jobs in your area"}
              </p>
            </div>
            {role !== "worker" && (
              <Button
                onClick={() => {
                  if (!user || role !== "homeowner") { setLocation("/register"); return; }
                  setModalState(prev => ({ ...prev, postJob: true }));
                }}
                className="font-bold shadow-sm text-base px-6 h-11"
                style={{ background: "#F5A623", color: "#1B2E4B" }}
                data-testid="button-post-job"
              >
                + Post a Job
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Filters row */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search jobs by title or description..."
              className="pl-9 h-11 bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-jobs"
            />
          </div>
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="w-full md:w-48 h-11 bg-white" data-testid="select-city-filter">
              <SelectValue placeholder="All Cities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6" style={{ scrollbarWidth: "none" }}>
          <button
            onClick={() => setCategoryFilter("all")}
            data-testid="chip-category-all"
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold border transition-all ${categoryFilter === "all" ? "bg-primary text-white border-primary" : "bg-white text-foreground border-border hover:border-primary hover:text-primary"}`}
          >
            All Categories
          </button>
          {CATEGORIES.filter(c => c !== "Other").map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              data-testid={`chip-category-${cat}`}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold border transition-all flex items-center gap-1.5 ${categoryFilter === cat ? "bg-primary text-white border-primary" : "bg-white text-foreground border-border hover:border-primary hover:text-primary"}`}
            >
              <span>{CATEGORY_EMOJI[cat]}</span>{cat}
            </button>
          ))}
        </div>

        {/* Tabs + Show all toggle */}
        <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div className="flex gap-1 bg-white rounded-xl p-1 border border-border w-fit">
            {([
              { key: "all",    label: `All (${baseJobs.length})` },
              { key: "today",  label: `Posted Today (${todayCount})` },
              { key: "urgent", label: `Urgent (${urgentCount})` },
            ] as const).map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                data-testid={`tab-${t.key}`}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t.key ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAll(v => !v)}
            className={`text-sm font-semibold px-4 py-2 rounded-lg border transition-all ${
              showAll ? "bg-primary text-white border-primary" : "bg-white text-foreground border-border hover:border-primary"
            }`}
          >
            {showAll ? "Showing all jobs" : "Show all jobs"}
          </button>
        </div>

        {/* Results */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-44 w-full rounded-2xl" />)}
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-border">
            <p className="text-5xl mb-4">🔍</p>
            <p className="font-semibold text-foreground mb-2">No jobs found</p>
            <p className="text-muted-foreground text-sm mb-6">Try adjusting your filters or be the first to post one!</p>
            <Button variant="outline" onClick={() => { setSearch(""); setCityFilter("all"); setCategoryFilter("all"); setTab("all"); }}>
              Clear all filters
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredJobs.map(job => {
              const emoji = CATEGORY_EMOJI[job.category] ?? "📋";
              const initials = (job.poster_name ?? "?").charAt(0).toUpperCase();
              return (
                <div
                  key={job.id}
                  data-testid={`card-job-${job.id}`}
                  className="bg-white border border-border rounded-2xl p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-200 cursor-default"
                >
                  <div className="flex flex-col md:flex-row gap-5">
                    {/* Left: info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-primary/10 text-primary">
                          <span>{emoji}</span>{job.category}
                        </span>
                        {job.is_urgent && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-200">
                            <Flame className="h-3 w-3" />Urgent
                          </span>
                        )}
                        {job.status === "hired" && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Hired
                          </span>
                        )}
                        {job.status === "completed" && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground">
                            Completed
                          </span>
                        )}
                      </div>

                      <h3 className="font-serif text-xl font-bold text-foreground leading-snug">{job.title}</h3>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 shrink-0" />
                          {job.suburb}, {job.city}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4 shrink-0" />
                          {timeAgo(job.created_at)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Users className="h-4 w-4 shrink-0" />
                          {job.application_count ?? 0} application{(job.application_count ?? 0) !== 1 ? "s" : ""}
                        </span>
                        {(job.scheduled_date || job.scheduled_time) && (
                          <span className="flex items-center gap-1.5 font-medium" style={{ color: "#2D7DD2" }}>
                            📅 {job.scheduled_date && new Date(job.scheduled_date + "T00:00:00").toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })}
                            {job.scheduled_time && ` · 🕐 ${job.scheduled_time.slice(0, 5)}`}
                          </span>
                        )}
                      </div>

                      <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">{job.description}</p>

                      {/* Poster */}
                      <div className="flex items-center gap-2 pt-1">
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">{initials}</div>
                        <span className="text-sm text-muted-foreground">Posted by <span className="font-medium text-foreground">{job.poster_name}</span></span>
                      </div>
                    </div>

                    {/* Right: budget + CTA */}
                    <div className="flex md:flex-col items-center md:items-end justify-between md:justify-between border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6 md:min-w-[140px]">
                      <div className="md:mb-6">
                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Budget</p>
                        <p className="font-serif text-3xl font-extrabold" style={{ color: "#1B2E4B" }}>R{job.budget}</p>
                      </div>
                      {job.status === "open" && role !== "homeowner" ? (
                        <Button
                          onClick={() => {
                            if (!user || role !== "worker") { setLocation("/register"); return; }
                            setModalState(prev => ({ ...prev, applyJob: job.id }));
                          }}
                          className="font-bold shadow-sm px-6 h-11 bg-primary hover:bg-primary/90 text-white"
                          data-testid={`button-apply-${job.id}`}
                        >
                          Apply Now
                        </Button>
                      ) : job.status !== "open" ? (
                        <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                          job.status === "hired" ? "bg-amber-50 text-amber-700" : "bg-muted text-muted-foreground"
                        }`}>
                          {job.status === "hired" ? "Position Filled" : "Completed"}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
