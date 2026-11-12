import { timeAgo } from "@/lib/format";

// A quiet line so a silently broken ring/webhook is noticeable — if notes stop
// arriving, "Last note 3 days ago" will stand out without ever nagging.
//
// When the ring's payload carries its own timestamp, the gap between when you
// spoke and when the note reached Pebble is shown too. That stretch happens
// on the ring and phone (Bluetooth sync + transcription), before this app is
// involved, so it tells you where any wait is coming from.
export function CaptureHealth({
  last,
}: {
  last: { captured_at: string; created_at: string } | null;
}) {
  if (!last) {
    return <p className="font-sans text-[12px] text-ink-muted">No notes captured yet</p>;
  }

  const travelSecs = Math.round(
    (new Date(last.created_at).getTime() - new Date(last.captured_at).getTime()) / 1000,
  );
  // Under a few seconds is indistinguishable from "the ring sent no timestamp";
  // over a day is a clock that can't be trusted. Say nothing in either case.
  const showTravel = travelSecs >= 5 && travelSecs < 86_400;

  return (
    <p className="font-sans text-[12px] leading-[1.6] text-ink-muted">
      Last note received {timeAgo(last.created_at)}
      {showTravel ? (
        <>
          {" "}
          &middot; it reached Pebble {formatSpan(travelSecs)} after you spoke
        </>
      ) : null}
    </p>
  );
}

function formatSpan(secs: number): string {
  if (secs < 90) return `${secs}s`;
  const mins = Math.round(secs / 60);
  if (mins < 90) return `${mins} min`;
  return `${Math.round(mins / 60)}h`;
}
