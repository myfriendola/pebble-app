import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, hasSupabase } from "./env";

// Server-only Supabase client, authenticated with the service_role key.
// This bypasses row-level security, so it must never be imported into client
// components. Returns null when Supabase isn't configured, letting callers
// fall back to sample data.

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!hasSupabase) return null;
  if (cached) return cached;
  cached = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
