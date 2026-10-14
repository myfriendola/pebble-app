import { timeAgo } from "@/lib/format";

// A quiet line so a silently broken ring/webhook is noticeable — if notes stop
// arriving, "Last note 3 days ago" will stand out without ever nagging.
export function CaptureHealth({ iso }: { iso: string | null }) {
  return (
    <p className="font-sans text-[12px] text-ink-muted">
      {iso ? `Last note received ${timeAgo(iso)}` : "No notes captured yet"}
    </p>
  );
}
