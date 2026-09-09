import Link from "next/link";
import { notFound } from "next/navigation";
import { getThoughtById } from "@/lib/data";
import { formatDayLong, formatTime } from "@/lib/format";
import { Tag } from "@/components/ui";
import { NoodleBlock } from "@/components/NoodleBlock";

export const dynamic = "force-dynamic";

export default async function ThoughtPage({ params }: { params: { id: string } }) {
  const thought = await getThoughtById(params.id);
  if (!thought) notFound();

  return (
    <div className="animate-fade-in">
      <Link
        href="/thoughts"
        className="mb-10 inline-flex items-center gap-1 font-sans text-[12px] text-ink-muted transition-colors hover:text-sage"
      >
        <span aria-hidden>←</span> Thoughts
      </Link>

      <div className="label mb-4">
        {formatDayLong(thought.captured_at)} · {formatTime(thought.captured_at)}
      </div>

      <p className="font-serif text-[22px] leading-[1.55] text-ink">{thought.text}</p>

      {thought.themes.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {thought.themes.map((t) => (
            <Tag key={t} kind="theme">
              {t}
            </Tag>
          ))}
        </div>
      ) : null}

      <div className="mt-8">
        <NoodleBlock
          thoughtId={thought.id}
          thoughtText={thought.text}
          initialQuestion={thought.noodle?.prompt ?? null}
          initialReply={thought.noodle?.reply ?? null}
        />
      </div>
    </div>
  );
}
