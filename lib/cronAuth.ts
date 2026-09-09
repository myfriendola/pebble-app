import { env } from "./env";

// Vercel Cron fires the path with `Authorization: Bearer ${CRON_SECRET}` when
// the CRON_SECRET env var is set. We require that header on every cron route.
export function cronAuthorized(req: Request): boolean {
  if (!env.cronSecret) return false;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${env.cronSecret}`;
}
