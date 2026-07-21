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

export const CATEGORIES = [
  "Cleaning",
  "Garden",
  "Laundry",
  "Plumbing",
  "Painting",
  "Grass cutting",
  "Dishwashing",
  "Moving",
  "Other",
];

export const CITIES = [
  "Johannesburg",
  "Cape Town",
  "Durban",
  "Pretoria",
  "Port Elizabeth",
  "East London",
  "Bloemfontein",
];
