// Central, typed access to configuration. Everything comes from process.env —
// values are set in Vercel, never hardcoded. Nothing here is exposed to the
// browser; these are only read in server code (routes, server components,
// server actions).

// Trim values: pasting into the Vercel dashboard often leaves a trailing
// newline or space, which would silently break an exact secret comparison.
const clean = (v: string | undefined) => (v ?? "").trim();

// Return the first non-empty candidate. Lets the app accept either its own
// variable names or the ones the Vercel–Supabase integration injects.
const firstFilled = (...vals: (string | undefined)[]) =>
  vals.map(clean).find((v) => v.length > 0) ?? "";

export const env = {
  openaiApiKey: clean(process.env.OPENAI_API_KEY),
  openaiModel: clean(process.env.OPENAI_MODEL) || "gpt-4o-mini",

  // URL: our own name, or the integration's NEXT_PUBLIC_SUPABASE_URL.
  supabaseUrl: firstFilled(process.env.SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_URL),

  // Server key (full access, bypasses RLS): the classic service_role key, or
  // the integration's new-style secret key (sb_secret_…). Never the anon /
  // publishable key — those can't be trusted for server-side writes.
  supabaseServiceRoleKey: firstFilled(
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_SECRET_KEY,
  ),

  captureSecret: clean(process.env.CAPTURE_SECRET),
  cronSecret: clean(process.env.CRON_SECRET),
};

// True only when both Supabase values are present. When false, the app falls
// back to in-memory sample data so the screens still look alive (e.g. on a
// fresh Vercel deploy before the env vars are set).
export const hasSupabase = Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);

export const hasOpenAI = Boolean(env.openaiApiKey);
