import { useState, useEffect } from "react";
import { supabase, type Worker, CATEGORIES, CITIES } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, MapPin, ShieldCheck } from "lucide-react";
import type { ModalState } from "@/App";

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-amber-500",
  "bg-indigo-500",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const SKILL_CATEGORIES = CATEGORIES.filter(c => c !== "Other");

export default function Workers({ setModalState }: { setModalState: React.Dispatch<React.SetStateAction<ModalState>> }) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState("all");
  const [skillFilter, setSkillFilter] = useState("all");

  useEffect(() => {
    async function fetchWorkers() {
      setLoading(true);
      const { data, error } = await supabase.from("workers").select("*").order("rating", { ascending: false });
      if (!error && data) setWorkers(data);
      setLoading(false);
    }
    fetchWorkers();
  }, []);

  const filteredWorkers = workers.filter(w => {
    if (cityFilter !== "all" && w.city !== cityFilter) return false;
    if (skillFilter !== "all" && !(w.skills || []).includes(skillFilter)) return false;
    return true;
  });

  return (
    <div className="bg-background min-h-screen">
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
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif font-bold text-lg text-foreground truncate">{fullName}</h3>
                        {worker.is_verified && (
                          <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                        )}
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
                          <Star
                            key={i}
                            className={`h-4 w-4 ${i <= fullStars ? "fill-amber-400 text-amber-400" : i === fullStars + 1 && hasHalf ? "fill-amber-200 text-amber-400" : "fill-muted text-muted-foreground/20"}`}
                          />
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
                      <span
                        key={skill}
                        className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    className="w-full mt-auto font-semibold h-10 hover:border-primary hover:text-primary transition-colors"
                    data-testid={`button-view-profile-${worker.id}`}
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
