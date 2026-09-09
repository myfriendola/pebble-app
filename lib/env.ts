// Central, typed access to configuration. Everything comes from process.env —
// values are set in Vercel, never hardcoded. Nothing here is exposed to the
// browser; these are only read in server code (routes, server components,
// server actions).

export const env = {
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  captureSecret: process.env.CAPTURE_SECRET ?? "",
  cronSecret: process.env.CRON_SECRET ?? "",
};

// True only when both Supabase values are present. When false, the app falls
// back to in-memory sample data so the screens still look alive (e.g. on a
// fresh Vercel deploy before the env vars are set).
export const hasSupabase = Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);

export const hasOpenAI = Boolean(env.openaiApiKey);
