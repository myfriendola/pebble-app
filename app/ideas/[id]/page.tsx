import Link from "next/link";
import { notFound } from "next/navigation";
import { getIdeaById } from "@/lib/data";
import { formatDayLong, formatTime } from "@/lib/format";
import { Tag } from "@/components/ui";
import { NoodleBlock } from "@/components/NoodleBlock";

export const dynamic = "force-dynamic";

export default async function IdeaPage({ params }: { params: { id: string } }) {
  const idea = await getIdeaById(params.id);
  if (!idea) notFound();

  return (
    <div className="animate-fade-in">
      <Link
        href="/ideas"
        className="mb-10 inline-flex items-center gap-1 font-sans text-[12px] text-ink-muted transition-colors hover:text-sage"
      >
        <span aria-hidden>←</span> Ideas
      </Link>

      <div className="label mb-4">
        {formatDayLong(idea.captured_at)} · {formatTime(idea.captured_at)}
      </div>

      <p className="font-serif text-[22px] leading-[1.55] text-ink">{idea.text}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {idea.domain ? <Tag kind={idea.domain}>{idea.domain}</Tag> : null}
        {idea.themes.map((t) => (
          <Tag key={t} kind="theme">
            {t}
          </Tag>
        ))}
      </div>

      <div className="mt-8">
        <NoodleBlock
          targetKind="idea"
          targetId={idea.id}
          text={idea.text}
          initialQuestion={idea.noodle?.prompt ?? null}
          initialReply={idea.noodle?.reply ?? null}
        />
      </div>
    </div>
  );
}
