// The frontend uses only the public anon key, which is safe to expose:
// Postgres RLS (db/schema.sql) allows anyone to `select` from
// channels/videos, and the one writable table (saved_videos, Phase 4) is
// scoped to the signed-in user's own rows by auth.uid(). The service_role
// key (full write access) lives only in worker/.env and GitHub Actions
// secrets - it must never appear here. This same client carries Supabase
// Auth (Google sign-in) with its default localStorage session.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Both dev and CI may run without a configured Supabase project (this is a
// requirement, not an oversight - see web/.env.example). Every caller in
// lib/data.ts checks `supabase` for null before querying, so pages fall
// back to their empty/skeleton states instead of crashing the build.
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;
