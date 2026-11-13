import Link from "next/link";
import { notFound } from "next/navigation";
import { getThreadPage } from "@/lib/threads";
import { hasOpenAI } from "@/lib/env";
import { SectionLabel, Whisper } from "@/components/ui";
import { ThreadDelete, ThreadHeader, ThreadNoteRow } from "@/components/ThreadParts";
import { ThreadReadPanel } from "@/components/ThreadReadPanel";
import { countPhrase, formatDayShort } from "@/lib/format";

export const dynamic = "force-dynamic";
// Gathering and reading run as server actions from this page; give them room.
export const maxDuration = 60;

export default async function ThreadPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { new?: string };
}) {
  const page = await getThreadPage(params.id);
  if (!page) notFound();
  const { thread, notes, tasks, origin, itemCount } = page;

  const index: Record<string, string> = {};
  for (const n of [...notes, ...tasks]) index[`${n.kind}:${n.id}`] = n.captured_at;
  const openTasks = tasks.filter((t) => t.status !== "done");
  const doneTasks = tasks.filter((t) => t.status === "done");
  const counts = countPhrase([
    [notes.length, "note", "notes"],
    [tasks.length, "task", "tasks"],
  ]);
  const originText = origin ? (origin.quote && origin.kind.endsWith("_task") ? origin.quote : origin.text) : null;

  return (
    <div className="space-y-12">
      <div>
        <Link
          href="/threads"
          className="label mb-6 inline-block transition-colors hover:text-sage"
        >
          &larr; Threads
        </Link>
        <ThreadHeader id={thread.id} title={thread.title} description={thread.description} />
        <div className="label mt-3">
          {counts ? `${counts} · ` : ""}a thread since {formatDayShort(thread.created_at)}
        </div>
      </div>

      {origin && originText ? (
        <section className="animate-fade-in">
          <SectionLabel>Where it began</SectionLabel>
          <blockquote className="border-l-2 border-sage-ring pl-4 font-serif text-[18px] leading-[1.55] text-ink">
            &ldquo;{originText}&rdquo;
          </blockquote>
          <div className="label mt-2 pl-4">{formatDayShort(origin.captured_at)}</div>
        </section>
      ) : null}

      <ThreadReadPanel
        threadId={thread.id}
        title={thread.title}
        read={thread.read}
        readAt={thread.read_at}
        readItemCount={thread.read_item_count}
        itemCount={itemCount}
        index={index}
        canRead={hasOpenAI}
        fresh={searchParams.new === "1"}
      />

      <section className="animate-fade-in">
        <SectionLabel>Your words</SectionLabel>
        {notes.length === 0 ? (
          <Whisper>No thoughts or ideas here yet. New ones about {thread.title} will gather here.</Whisper>
        ) : (
          <div className="divide-y divide-hairline">
            {notes.map((n) => (
              <ThreadNoteRow key={`${n.kind}:${n.id}`} threadId={thread.id} note={n} />
            ))}
          </div>
        )}
      </section>

      {tasks.length > 0 ? (
        <section className="animate-fade-in">
          <SectionLabel>To do</SectionLabel>
          <div className="divide-y divide-hairline">
            {[...openTasks, ...doneTasks].map((t) => (
              <ThreadNoteRow key={`${t.kind}:${t.id}`} threadId={thread.id} note={t} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="border-t border-hairline pt-6">
        <ThreadDelete id={thread.id} title={thread.title} />
      </div>
    </div>
  );
}
