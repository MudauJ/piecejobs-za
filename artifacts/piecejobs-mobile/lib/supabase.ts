import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vnrvwfialfvduvetoewa.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZucnZ3ZmlhbGZ2ZHV2ZXRvZXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NTUzMjYsImV4cCI6MjA5ODMzMTMyNn0.5mfElVG_tuhBLLP4BKdQ7v5zXLIi51LpMbZUmKZ8A9w';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

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

export type UserProfile = {
  id: string;
  role: 'super_admin' | 'homeowner' | 'worker';
  full_name: string | null;
  phone: string | null;
  city: string | null;
  suburb: string | null;
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

export const CATEGORIES = [
  'Cleaning',
  'Garden',
  'Laundry',
  'Ironing',
  'Plumbing',
  'Painting',
  'Grass cutting',
  'Dishwashing',
  'Moving',
  'Braai Setup',
  'Car Wash',
  'Cooking',
  'Dog Walking',
  'Childcare',
  'Tutoring',
  'Pool Cleaning',
  'Tiling & Grouting',
  'Electrical (minor)',
  'Other',
];

export const CATEGORY_ICON: Record<string, { set: string; name: string }> = {
  Cleaning: { set: 'Feather', name: 'wind' },
  Garden: { set: 'Feather', name: 'sun' },
  Laundry: { set: 'MaterialCommunityIcons', name: 'washing-machine' },
  Ironing: { set: 'MaterialCommunityIcons', name: 'iron' },
  Plumbing: { set: 'Feather', name: 'droplet' },
  Painting: { set: 'Feather', name: 'edit-3' },
  'Grass cutting': { set: 'Feather', name: 'scissors' },
  Dishwashing: { set: 'Feather', name: 'coffee' },
  Moving: { set: 'Feather', name: 'package' },
  'Braai Setup': { set: 'Feather', name: 'zap' },
  'Car Wash': { set: 'Feather', name: 'truck' },
  Cooking: { set: 'Feather', name: 'home' },
  'Dog Walking': { set: 'Feather', name: 'navigation' },
  Childcare: { set: 'Feather', name: 'heart' },
  Tutoring: { set: 'Feather', name: 'book' },
  'Pool Cleaning': { set: 'Feather', name: 'droplet' },
  'Tiling & Grouting': { set: 'Feather', name: 'grid' },
  'Electrical (minor)': { set: 'Feather', name: 'zap' },
  Other: { set: 'Feather', name: 'tool' },
};

export const CITIES = [
  'Johannesburg',
  'Cape Town',
  'Durban',
  'Pretoria',
  'Port Elizabeth',
  'East London',
  'Bloemfontein',
];
