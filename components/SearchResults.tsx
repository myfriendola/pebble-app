import Link from "next/link";
import type { SearchHit } from "@/lib/search";
import { relativeDay } from "@/lib/format";
import { Tag, Whisper } from "./ui";

const KIND_LABEL: Record<SearchHit["kind"], string> = {
  thought: "Thought",
  idea: "Idea",
  task: "To-do",
};

function hrefFor(hit: SearchHit): string | null {
  if (hit.kind === "thought") return `/thoughts/${hit.id}`;
  if (hit.kind === "idea") return `/ideas/${hit.id}`;
  return null; // tasks have no detail page
}

function Row({ hit }: { hit: SearchHit }) {
  const href = hrefFor(hit);
  const body = (
    <>
      <div className="mb-1 flex items-center gap-2">
        <span className="font-sans text-[11px] uppercase tracking-label text-sage">
          {KIND_LABEL[hit.kind]}
        </span>
        <span className="font-sans text-[11px] text-ink-muted">
          {hit.captured_at ? relativeDay(hit.captured_at) : null}
        </span>
      </div>
      <p className="font-serif text-[17px] leading-[1.5] text-ink">{hit.text}</p>
      {hit.themes && hit.themes.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {hit.themes.map((t) => (
            <Tag key={t} kind="theme">
              {t}
            </Tag>
          ))}
        </div>
      ) : null}
    </>
  );

  return (
    <div className="py-5">
      {href ? (
        <Link href={href} className="block transition-opacity hover:opacity-80">
          {body}
        </Link>
      ) : (
        body
      )}
    </div>
  );
}

export function SearchResults({
  q,
  hits,
  semantic,
}: {
  q: string;
  hits: SearchHit[];
  semantic: boolean;
}) {
  if (hits.length === 0) {
    return <Whisper>Nothing surfaced for &ldquo;{q}&rdquo; yet.</Whisper>;
  }

  return (
    <div>
      <p className="mb-6 font-sans text-[12px] text-ink-muted">
        {hits.length} {hits.length === 1 ? "echo" : "echoes"}
        {semantic ? " · by meaning" : ""}
      </p>
      <div className="divide-y divide-hairline">
        {hits.map((hit) => (
          <Row key={`${hit.kind}:${hit.id}`} hit={hit} />
        ))}
      </div>
    </div>
  );
}
