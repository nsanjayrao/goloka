// The frontend is read-only: it only ever uses the public anon key, which is
// safe to expose to the browser because Postgres RLS (db/schema.sql) allows
// anyone to `select` from channels/videos and nobody to write. The
// service_role key (write access) lives only in worker/.env and GitHub
// Actions secrets - it must never appear here.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Both dev and CI may run without a configured Supabase project (this is a
// requirement, not an oversight - see web/.env.example). Every caller in
// lib/data.ts checks `supabase` for null before querying, so pages fall
// back to their empty/skeleton states instead of crashing the build.
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;
