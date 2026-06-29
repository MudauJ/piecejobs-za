import { useState, useEffect } from "react";
import { supabase, type Worker, CATEGORIES, CITIES } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, ShieldCheck } from "lucide-react";

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

export default function Workers() {
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

  const SKILL_CATEGORIES = CATEGORIES.filter(c => c !== "Other");

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-foreground">Find Workers</h1>
        <p className="text-muted-foreground mt-1">Browse verified local workers ready to help in your area.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="w-full sm:w-52" data-testid="select-workers-city">
            <SelectValue placeholder="All Cities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cities</SelectItem>
            {CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={skillFilter} onValueChange={setSkillFilter}>
          <SelectTrigger className="w-full sm:w-52" data-testid="select-workers-skill">
            <SelectValue placeholder="All Skills" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Skills</SelectItem>
            {SKILL_CATEGORIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        {(cityFilter !== "all" || skillFilter !== "all") && (
          <Button variant="ghost" onClick={() => { setCityFilter("all"); setSkillFilter("all"); }}>
            Clear filters
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-64 w-full rounded-2xl" />)}
        </div>
      ) : filteredWorkers.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-border">
          <p className="text-muted-foreground mb-4">No workers found matching your criteria.</p>
          <Button variant="outline" onClick={() => { setCityFilter("all"); setSkillFilter("all"); }}>Clear Filters</Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWorkers.map(worker => {
            const initials = `${worker.first_name[0]}${worker.last_name[0]}`.toUpperCase();
            const fullName = `${worker.first_name} ${worker.last_name}`;
            const avatarColor = getAvatarColor(fullName);
            const primarySkill = worker.skills?.[0] ?? "General";

            return (
              <div
                key={worker.id}
                data-testid={`card-worker-${worker.id}`}
                className="bg-white border border-border rounded-2xl p-6 hover:border-primary/50 hover:shadow-md transition-all flex flex-col gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl ${avatarColor} flex items-center justify-center text-white font-bold text-lg shrink-0`}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-serif font-bold text-lg text-foreground truncate">{fullName}</h3>
                      {worker.is_verified && (
                        <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{primarySkill}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{worker.suburb}, {worker.city}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-bold text-foreground">{Number(worker.rating).toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground">({worker.review_count} reviews)</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-foreground">R{worker.hourly_rate}</span>
                    <span className="text-xs text-muted-foreground">/hr</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(worker.skills || []).map(skill => (
                    <Badge key={skill} variant="secondary" className="text-xs bg-primary/10 text-primary hover:bg-primary/20">
                      {skill}
                    </Badge>
                  ))}
                </div>

                <Button variant="outline" className="w-full mt-auto font-semibold" data-testid={`button-view-profile-${worker.id}`}>
                  View Profile
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
