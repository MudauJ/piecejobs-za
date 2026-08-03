import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Job = {
  id: string;
  title: string;
  category: string;
  categories?: string[];
  booking_type?: string;
  parent_job_id?: string;
  description: string;
  budget: number;
  suburb: string;
  city: string;
  poster_name: string;
  contact_number: string;
  is_urgent: boolean;
  status: string;
  created_at: string;
  posted_by?: string;
  application_count?: number;
  scheduled_date?: string;
  scheduled_time?: string;
};

export type Worker = {
  id: string;
  first_name: string;
  last_name: string;
  skills: string[];
  suburb: string;
  city: string;
  id_number: string;
  phone: string;
  hourly_rate: number;
  is_verified: boolean;
  rating: number;
  review_count: number;
  created_at: string;
  user_id?: string;
  payout_method?: string;
  bank_name?: string;
  bank_account?: string;
  flash_phone?: string;
  referral_code?: string;
  referred_by?: string;
  referral_earnings?: number;
  badge?: string;
};

export type Payment = {
  id: string;
  job_id: string;
  homeowner_email?: string;
  worker_id?: string;
  amount: number;
  platform_fee: number;
  worker_payout: number;
  payout_method: string;
  status: string;
  payfast_payment_id?: string;
  created_at: string;
};

export type Application = {
  id: string;
  job_id: string;
  worker_name: string;
  worker_phone: string;
  message: string;
  proposed_rate: number;
  status: string;
  created_at: string;
  applicant_id?: string;
};

export type UserProfile = {
  id: string;
  role: "super_admin" | "homeowner" | "worker";
  full_name: string | null;
  phone: string | null;
  city: string | null;
  suburb: string | null;
  created_at: string;
};

export type WorkerDocument = {
  id: string;
  worker_id: string;
  document_type: string;
  file_url: string;
  file_name?: string;
  status: string;
  uploaded_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
};

export type Notification = {
  id: string;
  worker_id: string;
  job_id: string;
  message: string;
  status: string;
  created_at: string;
};

export type EmailNotification = {
  id: string;
  to_email: string;
  subject: string;
  body: string;
  status: string;
  created_at: string;
};

export const CATEGORIES = [
  "Cleaning",
  "Garden",
  "Laundry",
  "Ironing",
  "Plumbing",
  "Painting",
  "Grass cutting",
  "Dishwashing",
  "Moving",
  "Braai Setup",
  "Car Wash",
  "Cooking",
  "Dog Walking",
  "Childcare",
  "Tutoring",
  "Pool Cleaning",
  "Tiling & Grouting",
  "Electrical (minor)",
  "Other",
];

export const CATEGORY_EMOJI: Record<string, string> = {
  "Cleaning":          "🧹",
  "Garden":            "🌿",
  "Laundry":           "👕",
  "Ironing":           "👔",
  "Plumbing":          "🔧",
  "Painting":          "🖌️",
  "Grass cutting":     "✂️",
  "Dishwashing":       "🍽️",
  "Moving":            "📦",
  "Braai Setup":       "🍖",
  "Car Wash":          "🚗",
  "Cooking":           "🍳",
  "Dog Walking":       "🐕",
  "Childcare":         "👶",
  "Tutoring":          "📚",
  "Pool Cleaning":     "🏊",
  "Tiling & Grouting": "🪟",
  "Electrical (minor)":"⚡",
  "Other":             "📋",
};

export const COMPATIBLE_GROUPS: { name: string; categories: string[] }[] = [
  { name: "Domestic",      categories: ["Cleaning", "Laundry", "Dishwashing", "Ironing"] },
  { name: "Outdoor",       categories: ["Garden", "Grass cutting", "Pool Cleaning"] },
  { name: "Skilled",       categories: ["Painting", "Tiling & Grouting"] },
  { name: "Care",          categories: ["Dog Walking", "Childcare"] },
  { name: "Other Services",categories: ["Braai Setup", "Car Wash", "Cooking", "Tutoring"] },
];

export const ALWAYS_SEPARATE = ["Plumbing", "Electrical (minor)", "Moving"];

export function analyzeBooking(selected: string[]): {
  isBundle: boolean;
  groups: { name: string; categories: string[] }[];
} {
  if (selected.length === 0) return { isBundle: false, groups: [] };

  const alwaysSep = selected.filter(c => ALWAYS_SEPARATE.includes(c));
  const rest      = selected.filter(c => !ALWAYS_SEPARATE.includes(c));

  const groupMap = new Map<string, string[]>();
  for (const cat of rest) {
    const group = COMPATIBLE_GROUPS.find(g => g.categories.includes(cat));
    const key   = group?.name ?? "Other Services";
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(cat);
  }

  const groups: { name: string; categories: string[] }[] = [];
  for (const [name, cats] of groupMap) groups.push({ name, categories: cats });
  for (const cat of alwaysSep)        groups.push({ name: cat, categories: [cat] });

  const isBundle = alwaysSep.length === 0 && groupMap.size <= 1;
  return { isBundle, groups };
}

export type BadgeLevel = "new" | "bronze" | "silver" | "gold" | "diamond";

export function getBadgeInfo(completedJobs: number): { level: BadgeLevel; emoji: string; label: string; next: number | null; nextLabel: string | null } {
  if (completedJobs >= 30) return { level: "diamond", emoji: "💎", label: "Diamond", next: null, nextLabel: null };
  if (completedJobs >= 15) return { level: "gold",    emoji: "🥇", label: "Gold",    next: 30, nextLabel: "Diamond" };
  if (completedJobs >= 5)  return { level: "silver",  emoji: "🥈", label: "Silver",  next: 15, nextLabel: "Gold" };
  if (completedJobs >= 1)  return { level: "bronze",  emoji: "🥉", label: "Bronze",  next: 5,  nextLabel: "Silver" };
  return { level: "new", emoji: "⭐", label: "New", next: 1, nextLabel: "Bronze" };
}

export const CITIES = [
  "Johannesburg",
  "Cape Town",
  "Durban",
  "Pretoria",
  "Port Elizabeth",
  "East London",
  "Bloemfontein",
];
