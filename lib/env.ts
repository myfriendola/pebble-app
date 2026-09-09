// Central, typed access to configuration. Everything comes from process.env —
// values are set in Vercel, never hardcoded. Nothing here is exposed to the
// browser; these are only read in server code (routes, server components,
// server actions).

// Trim values: pasting into the Vercel dashboard often leaves a trailing
// newline or space, which would silently break an exact secret comparison.
const clean = (v: string | undefined) => (v ?? "").trim();

export const env = {
  openaiApiKey: clean(process.env.OPENAI_API_KEY),
  openaiModel: clean(process.env.OPENAI_MODEL) || "gpt-4o-mini",
  supabaseUrl: clean(process.env.SUPABASE_URL),
  supabaseServiceRoleKey: clean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  captureSecret: clean(process.env.CAPTURE_SECRET),
  cronSecret: clean(process.env.CRON_SECRET),
};

// True only when both Supabase values are present. When false, the app falls
// back to in-memory sample data so the screens still look alive (e.g. on a
// fresh Vercel deploy before the env vars are set).
export const hasSupabase = Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);

export const hasOpenAI = Boolean(env.openaiApiKey);
