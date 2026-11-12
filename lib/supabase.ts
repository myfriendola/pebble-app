import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, hasSupabase } from "./env";

// Server-only Supabase client, authenticated with the service_role key.
// This bypasses row-level security, so it must never be imported into client
// components. Returns null when Supabase isn't configured, letting callers
// fall back to sample data.

let cached: SupabaseClient | null = null;

// Every database read must be live. Next 14 patches fetch() and, despite
// `dynamic = "force-dynamic"` on our pages and routes, files GET requests in
// its Data Cache indefinitely ("auto cache"), so screens kept showing an old
// snapshot until something happened to call revalidatePath. A note from the
// ring could be in the database for hours before Today noticed. no-store opts
// each Supabase request out of that cache.
const liveFetch: typeof fetch = (input, init) => fetch(input, { ...init, cache: "no-store" });

export function getSupabase(): SupabaseClient | null {
  if (!hasSupabase) return null;
  if (cached) return cached;
  cached = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: liveFetch },
  });
  return cached;
}
