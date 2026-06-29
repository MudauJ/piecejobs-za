import { useState, useEffect } from "react";
import { supabase, type Job, CATEGORIES, CITIES } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Users, Search } from "lucide-react";
import type { ModalState } from "@/App";

export default function Jobs({ setModalState }: { setModalState: React.Dispatch<React.SetStateAction<ModalState>> }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    async function fetchJobs() {
      setLoading(true);
      // Simplify fetch for mock/speed - ignore relations for now to ensure it works
      const { data, error } = await supabase.from('jobs').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        setJobs(data);
      }
      setLoading(false);
    }
    fetchJobs();
  }, []);

  const filteredJobs = jobs.filter(job => {
    if (cityFilter !== "all" && job.city !== cityFilter) return false;
    if (categoryFilter !== "all" && job.category !== categoryFilter) return false;
    if (search && !job.title.toLowerCase().includes(search.toLowerCase()) && !job.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">Available Jobs</h1>
          <p className="text-muted-foreground mt-1">Find piece jobs in your area.</p>
        </div>
        <Button onClick={() => setModalState(prev => ({ ...prev, postJob: true }))} className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold">
          Post a Job
        </Button>
      </div>

      <div className="grid md:grid-cols-12 gap-6 mb-8">
        <div className="md:col-span-5 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input 
            placeholder="Search jobs..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="md:col-span-3">
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Cities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-4 overflow-x-auto whitespace-nowrap pb-2 flex gap-2 hide-scrollbar">
           <Button 
              variant={categoryFilter === "all" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setCategoryFilter("all")}
              className="rounded-full shrink-0"
            >
              All
            </Button>
          {CATEGORIES.map(cat => (
            <Button 
              key={cat} 
              variant={categoryFilter === cat ? "default" : "outline"} 
              size="sm" 
              onClick={() => setCategoryFilter(cat)}
              className="rounded-full shrink-0"
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-border">
          <p className="text-muted-foreground mb-4">No jobs found matching your criteria.</p>
          <Button variant="outline" onClick={() => {setSearch(""); setCityFilter("all"); setCategoryFilter("all");}}>Clear Filters</Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredJobs.map(job => (
            <div key={job.id} className="bg-white border border-border rounded-xl p-5 md:p-6 hover:border-primary/50 transition-colors shadow-sm">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">{job.category}</Badge>
                    {job.is_urgent && <Badge variant="destructive">Urgent</Badge>}
                  </div>
                  <h3 className="font-serif text-xl font-bold text-foreground">{job.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {job.suburb}, {job.city}</span>
                    <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {new Date(job.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-foreground text-sm line-clamp-2 mt-2">{job.description}</p>
                </div>
                
                <div className="flex flex-col items-start md:items-end justify-between border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
                  <div className="mb-4 md:mb-0">
                    <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider mb-1">Budget</p>
                    <p className="font-serif text-2xl font-bold text-foreground">R{job.budget}</p>
                  </div>
                  <Button onClick={() => setModalState(prev => ({ ...prev, applyJob: job.id }))} className="w-full md:w-auto font-bold shadow-sm">
                    Apply Now
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
