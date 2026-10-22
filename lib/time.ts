// Day boundaries in the app's own timezone, not the server's (which is UTC on
// Vercel). Without this, "today" flips at UTC midnight — 8pm US Eastern — so an
// evening reflection would summarise almost none of the day's notes. Defaults to
// US Eastern; override with APP_TIMEZONE (an IANA zone like "America/Chicago").

const TZ = (process.env.APP_TIMEZONE || "America/New_York").trim();

// The wall-clock parts of an instant, as seen in the app's timezone.
function tzParts(instant: Date) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const map: Record<string, string> = {};
  for (const p of dtf.formatToParts(instant)) if (p.type !== "literal") map[p.type] = p.value;
  let h = Number(map.hour);
  if (h === 24) h = 0; // some runtimes render midnight as 24
  return { y: Number(map.year), mo: Number(map.month), d: Number(map.day), h, mi: Number(map.minute), s: Number(map.second) };
}

// How far the app's timezone is ahead of UTC, in ms, at a given instant.
function tzOffsetMs(instant: Date): number {
  const p = tzParts(instant);
  const asUtc = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s);
  return asUtc - (instant.getTime() - instant.getMilliseconds());
}

// Local calendar date (YYYY-MM-DD) in the app's timezone.
export function appTodayStr(now: Date = new Date()): string {
  const p = tzParts(now);
  return `${p.y}-${String(p.mo).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

// The UTC instant of the most recent local midnight in the app's timezone.
export function startOfAppToday(now: Date = new Date()): Date {
  const p = tzParts(now);
  const localMidnightAsUtc = Date.UTC(p.y, p.mo - 1, p.d, 0, 0, 0);
  // Refine the offset at (approximately) that midnight so DST changes are honored.
  const approx = new Date(localMidnightAsUtc - tzOffsetMs(now));
  return new Date(localMidnightAsUtc - tzOffsetMs(approx));
}

export function startOfAppTodayIso(now: Date = new Date()): string {
  return startOfAppToday(now).toISOString();
}

export function isAppToday(iso: string): boolean {
  return new Date(iso).getTime() >= startOfAppToday().getTime();
}
