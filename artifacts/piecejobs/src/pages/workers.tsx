import { useState, useEffect } from "react";
import { supabase, type Worker, CATEGORIES, CITIES, getBadgeInfo } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, MapPin, ShieldCheck, X, Calendar } from "lucide-react";
import type { ModalState } from "@/App";

const SB_URL = "https://vnrvwfialfvduvetoewa.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZucnZ3ZmlhbGZ2ZHV2ZXRvZXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NTUzMjYsImV4cCI6MjA5ODMzMTMyNn0.5mfElVG_tuhBLLP4BKdQ7v5zXLIi51LpMbZUmKZ8A9w";
const SB_HEADERS = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };

const AVATAR_COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-orange-500",
  "bg-pink-500", "bg-teal-500", "bg-amber-500", "bg-indigo-500",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function BadgePill({ count, showLabel = true }: { count: number; showLabel?: boolean }) {
  if (count === 0) return null;
  const info = getBadgeInfo(count);
  if (info.level === "new") return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 shrink-0">
      {info.emoji}{showLabel ? ` ${info.label}` : ""}
    </span>
  );
}

type Review = {
  id: string;
  worker_id: string;
  reviewer_name?: string;
  rating: number;
  comment: string;
  created_at: string;
};

function StarRow({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const cls = size === "md" ? "h-5 w-5" : "h-4 w-4";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`${cls} ${i <= full ? "fill-amber-400 text-amber-400" : i === full + 1 && half ? "fill-amber-200 text-amber-400" : "fill-muted text-muted-foreground/20"}`} />
      ))}
    </div>
  );
}

function WorkerProfileModal({ worker, completedCount, onClose }: { worker: Worker; completedCount: number; onClose: () => void }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  const fullName = `${worker.first_name} ${worker.last_name}`;
  const avatarColor = getAvatarColor(fullName);
  const initials = `${worker.first_name[0]}${worker.last_name[0]}`.toUpperCase();
  const rating = Number(worker.rating);
  const badgeInfo = getBadgeInfo(completedCount);
  const showBadge = completedCount >= 1;

  useEffect(() => {
    fetch(`${SB_URL}/rest/v1/reviews?worker_id=eq.${worker.id}&order=created_at.desc`, { headers: SB_HEADERS })
      .then(r => r.ok ? r.json() : [])
      .then(data => setReviews(data || []))
      .finally(() => setReviewsLoading(false));
  }, [worker.id]);

  const progressPct = badgeInfo.next ? Math.min(100, Math.round((completedCount / badgeInfo.next) * 100)) : 100;
  const nextEmoji = badgeInfo.nextLabel === "Bronze" ? "🥉" : badgeInfo.nextLabel === "Silver" ? "🥈" : badgeInfo.nextLabel === "Gold" ? "🥇" : "💎";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="font-serif font-bold text-xl" style={{ color: "#1B2E4B" }}>Worker Profile</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Avatar + name row */}
          <div className="flex items-center gap-5">
            <div className={`w-20 h-20 rounded-2xl ${avatarColor} flex items-center justify-center text-white font-extrabold text-2xl shrink-0 shadow-md`}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <h3 className="font-serif font-bold text-2xl" style={{ color: "#1B2E4B" }}>{fullName}</h3>
                {worker.is_verified && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 shrink-0">
                    <ShieldCheck className="h-3 w-3" /> Verified
                  </span>
                )}
              </div>
              {showBadge && (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800">
                  {badgeInfo.emoji} {badgeInfo.label} · {completedCount} job{completedCount !== 1 ? "s" : ""} completed
                </span>
              )}
              <div className="flex items-center gap-1 mt-2 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="text-sm">{worker.suburb}, {worker.city}</span>
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-xl bg-muted/50">
              <div className="font-extrabold text-xl" style={{ color: "#1B2E4B" }}>R{worker.hourly_rate}</div>
              <div className="text-xs text-muted-foreground mt-0.5">per hour</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted/50">
              <div className="font-extrabold text-xl" style={{ color: "#1B2E4B" }}>{rating.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{worker.review_count} review{worker.review_count !== 1 ? "s" : ""}</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted/50">
              <div className="font-extrabold text-xl" style={{ color: "#1B2E4B" }}>{completedCount}</div>
              <div className="text-xs text-muted-foreground mt-0.5">jobs done</div>
            </div>
          </div>

          {/* Skills */}
          <div>
            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-2">Skills</h4>
            <div className="flex flex-wrap gap-2">
              {(worker.skills || []).map(skill => (
                <span key={skill} className="text-sm font-medium px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Rating */}
          <div>
            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-2">Rating</h4>
            <div className="flex items-center gap-2.5">
              <StarRow rating={rating} size="md" />
              <span className="font-bold text-foreground text-lg">{rating.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">({worker.review_count} reviews)</span>
            </div>
          </div>

          {/* Member since */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Member since {new Date(worker.created_at).toLocaleDateString("en-ZA", { month: "long", year: "numeric" })}</span>
          </div>

          {/* Badge progress */}
          <div>
            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-2">Badge Progress</h4>
            <div className="bg-muted/50 rounded-xl p-4">
              {showBadge && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{badgeInfo.emoji}</span>
                  <span className="font-bold text-foreground">{badgeInfo.label} Worker</span>
                </div>
              )}
              {badgeInfo.next !== null ? (
                <>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>{completedCount} completed</span>
                    <span>{badgeInfo.next} for {badgeInfo.nextLabel} {nextEmoji}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${progressPct}%` }} />
                  </div>
                </>
              ) : (
                <p className="text-sm font-semibold text-amber-700">💎 Diamond — highest badge level!</p>
              )}
              {completedCount === 0 && (
                <p className="text-sm text-muted-foreground">Complete your first job to earn the 🥉 Bronze badge.</p>
              )}
            </div>
          </div>

          {/* Reviews */}
          <div>
            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-3">Reviews from Homeowners</h4>
            {reviewsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-8 bg-muted/30 rounded-xl">
                <p className="text-3xl mb-2">💬</p>
                <p className="text-sm text-muted-foreground">No reviews yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map(review => (
                  <div key={review.id} className="bg-muted/40 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-sm text-foreground">{review.reviewer_name || "Homeowner"}</span>
                      <StarRow rating={review.rating} />
                    </div>
                    <p className="text-sm text-muted-foreground">{review.comment}</p>
                    <p className="text-xs text-muted-foreground/60 mt-2">{new Date(review.created_at).toLocaleDateString("en-ZA")}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Contact note */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
            <span className="text-xl mt-0.5">💼</span>
            <div>
              <p className="font-semibold text-blue-800 text-sm">Want to hire {worker.first_name}?</p>
              <p className="text-blue-700 text-sm mt-0.5">Post a job and {worker.first_name} can apply — all work is handled securely through PieceJobs ZA.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const SKILL_CATEGORIES = CATEGORIES.filter(c => c !== "Other");

export default function Workers({ setModalState }: { setModalState: React.Dispatch<React.SetStateAction<ModalState>> }) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState("all");
  const [skillFilter, setSkillFilter] = useState("all");
  const [completedCounts, setCompletedCounts] = useState<Record<string, number>>({});
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const [workersRes, paymentsRes] = await Promise.all([
        supabase.from("workers").select("*").order("rating", { ascending: false }),
        fetch(`${SB_URL}/rest/v1/payments?status=eq.released&select=worker_id`, { headers: SB_HEADERS }),
      ]);

      if (!workersRes.error && workersRes.data) setWorkers(workersRes.data);

      if (paymentsRes.ok) {
        const payments: { worker_id: string | null }[] = await paymentsRes.json();
        const counts: Record<string, number> = {};
        for (const p of payments) {
          if (p.worker_id) counts[p.worker_id] = (counts[p.worker_id] || 0) + 1;
        }
        setCompletedCounts(counts);
      }

      setLoading(false);
    }
    fetchData();
  }, []);

  const filteredWorkers = workers.filter(w => {
    if (cityFilter !== "all" && w.city !== cityFilter) return false;
    if (skillFilter !== "all" && !(w.skills || []).includes(skillFilter)) return false;
    return true;
  });

  return (
    <div className="bg-background min-h-screen">
      {selectedWorker && (
        <WorkerProfileModal
          worker={selectedWorker}
          completedCount={completedCounts[selectedWorker.id] ?? 0}
          onClose={() => setSelectedWorker(null)}
        />
      )}

      {/* Page header */}
      <div className="bg-white border-b border-border">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="font-serif text-4xl font-bold text-foreground">Find Workers</h1>
              <p className="text-muted-foreground mt-1 text-base">
                {workers.length > 0 ? `${workers.length} verified workers across South Africa` : "Browse verified local workers ready to help."}
              </p>
            </div>
            <Button
              onClick={() => setModalState(prev => ({ ...prev, workerReg: true }))}
              className="font-bold text-base px-6 h-11"
              data-testid="button-join-as-worker"
            >
              Join as Worker
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="w-full sm:w-52 h-11 bg-white" data-testid="select-workers-city">
              <SelectValue placeholder="All Cities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={skillFilter} onValueChange={setSkillFilter}>
            <SelectTrigger className="w-full sm:w-52 h-11 bg-white" data-testid="select-workers-skill">
              <SelectValue placeholder="All Skills" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Skills</SelectItem>
              {SKILL_CATEGORIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

          {(cityFilter !== "all" || skillFilter !== "all") && (
            <Button variant="ghost" className="text-muted-foreground" onClick={() => { setCityFilter("all"); setSkillFilter("all"); }}>
              Clear filters
            </Button>
          )}
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-72 w-full rounded-2xl" />)}
          </div>
        ) : filteredWorkers.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-border">
            <p className="text-5xl mb-4">👷</p>
            <p className="font-semibold text-foreground mb-2">No workers found</p>
            <p className="text-muted-foreground text-sm mb-6">Try adjusting your filters, or be the first to register.</p>
            <Button variant="outline" onClick={() => { setCityFilter("all"); setSkillFilter("all"); }}>Clear Filters</Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredWorkers.map(worker => {
              const initials = `${worker.first_name[0]}${worker.last_name[0]}`.toUpperCase();
              const fullName = `${worker.first_name} ${worker.last_name}`;
              const avatarColor = getAvatarColor(fullName);
              const primarySkill = worker.skills?.[0] ?? "General";
              const rating = Number(worker.rating);
              const fullStars = Math.floor(rating);
              const hasHalf = rating - fullStars >= 0.5;
              const count = completedCounts[worker.id] ?? 0;

              return (
                <div
                  key={worker.id}
                  data-testid={`card-worker-${worker.id}`}
                  className="bg-white border border-border rounded-2xl p-6 hover:shadow-xl hover:border-primary/30 transition-all duration-200 flex flex-col gap-5"
                >
                  {/* Avatar + name */}
                  <div className="flex items-start gap-4">
                    <div className={`w-16 h-16 rounded-2xl ${avatarColor} flex items-center justify-center text-white font-extrabold text-xl shrink-0 shadow-sm`}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-serif font-bold text-lg text-foreground truncate">{fullName}</h3>
                        {worker.is_verified && (
                          <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                        )}
                        <BadgePill count={count} />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">{primarySkill}</p>
                      <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-xs">{worker.suburb}, {worker.city}</span>
                      </div>
                    </div>
                  </div>

                  {/* Star rating */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star key={i} className={`h-4 w-4 ${i <= fullStars ? "fill-amber-400 text-amber-400" : i === fullStars + 1 && hasHalf ? "fill-amber-200 text-amber-400" : "fill-muted text-muted-foreground/20"}`} />
                        ))}
                      </div>
                      <span className="font-bold text-foreground text-sm">{rating.toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground">({worker.review_count})</span>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-foreground text-lg">R{worker.hourly_rate}</span>
                      <span className="text-xs text-muted-foreground">/hr</span>
                    </div>
                  </div>

                  {/* Skill tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {(worker.skills || []).map(skill => (
                      <span key={skill} className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                        {skill}
                      </span>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    className="w-full mt-auto font-semibold h-10 hover:border-primary hover:text-primary transition-colors"
                    data-testid={`button-view-profile-${worker.id}`}
                    onClick={() => setSelectedWorker(worker)}
                  >
                    View Profile
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
