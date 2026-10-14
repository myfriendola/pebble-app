// A quiet affordance on Tasks: subscribe your calendar to Pebble's dated
// to-dos. Runs on the server so the token (server-only) is read from env and
// baked into a webcal:// link the authenticated user can tap once.

import { headers } from "next/headers";
import { env, hasCalendar } from "@/lib/env";
import { CalendarSubscribeLink } from "./CalendarSubscribeLink";

export function CalendarSubscribe() {
  if (!hasCalendar) {
    return (
      <p className="font-sans text-[12px] leading-[1.6] text-ink-muted">
        Calendar sync is off. Set a CALENDAR_TOKEN to let your dated to-dos flow into your calendar.
      </p>
    );
  }

  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const path = `/api/calendar/tasks.ics?token=${encodeURIComponent(env.calendarToken)}`;

  return (
    <CalendarSubscribeLink webcalUrl={`webcal://${host}${path}`} httpsUrl={`${proto}://${host}${path}`} />
  );
}
