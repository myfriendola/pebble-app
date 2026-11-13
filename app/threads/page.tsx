import Link from "next/link";
import { getPendingSuggestion, getThreadSummaries } from "@/lib/threads";
import { ScreenHeader, Whisper } from "@/components/ui";
import { ThreadSuggestionCard } from "@/components/ThreadSuggestionCard";
import { LookForThreads } from "@/components/LookForThreads";
import { countPhrase, timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";
// "Look now" runs a full look over the last 30 days from this page.
export const maxDuration = 60;

export default async function ThreadsPage() {
  const [{ threads, missing }, suggestion] = await Promise.all([
    getThreadSummaries(),
    getPendingSuggestion(),
  ]);

  return (
    <div>
      <ScreenHeader title="Threads">
        <p className="mt-2 font-serif text-[16px] italic leading-[1.6] text-ink-muted">
          The things you keep coming back to, gathered in one place.
        </p>
      </ScreenHeader>

      {missing ? (
        <div className="rounded-card bg-panel px-6 py-5">
          <p className="font-serif text-[17px] text-ink">Threads needs one more step.</p>
          <p className="mt-2 font-sans text-[13px] leading-[1.6] text-ink-secondary">
            In Supabase, open the SQL Editor, paste the <b>Threads</b> section from the end of{" "}
            <code className="font-mono text-[12px]">migration.sql</code>, and run it. Then come back here.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {suggestion ? <ThreadSuggestionCard suggestion={suggestion} /> : null}

          {threads.length === 0 ? (
            suggestion ? null : (
              <Whisper>
                Nothing gathered yet. When you keep coming back to something, Pebble will ask before
                making it a thread.
              </Whisper>
            )
          ) : (
            <div className="divide-y divide-hairline border-t border-hairline">
              {threads.map((t) => {
                const counts = countPhrase([
                  [t.noteCount, "note", "notes"],
                  [t.taskCount, "task", "tasks"],
                ]);
                return (
                  <Link
                    key={t.id}
                    href={`/threads/${t.id}`}
                    className="group block animate-fade-in py-5"
                  >
                    <div className="font-serif text-[21px] leading-[1.3] text-ink transition-colors group-hover:text-sage">
                      {t.title}
                    </div>
                    {t.description ? (
                      <p className="mt-1 font-serif text-[15px] italic leading-[1.5] text-ink-secondary">
                        {t.description}
                      </p>
                    ) : null}
                    <div className="label mt-2">
                      {counts || "empty"}
                      {t.lastAddedAt ? ` · last added ${timeAgo(t.lastAddedAt)}` : ""}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* While Pebble is already asking, there's nothing more to look for. */}
          {suggestion ? null : <LookForThreads />}
        </div>
      )}
    </div>
  );
}
