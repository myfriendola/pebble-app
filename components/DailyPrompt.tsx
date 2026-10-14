import Link from "next/link";
import { SectionLabel } from "./ui";

// A gentle on-ramp back into reflection: a question you began but left
// unanswered, waiting quietly on Today. Tapping it opens the thought or idea.
export function DailyPrompt({
  kind,
  id,
  text,
  prompt,
}: {
  kind: "thought" | "idea";
  id: string;
  text: string;
  prompt: string;
}) {
  const href = `/${kind === "idea" ? "ideas" : "thoughts"}/${id}`;
  const snippet = text.length > 120 ? `${text.slice(0, 117).trimEnd()}…` : text;

  return (
    <section className="animate-fade-in">
      <SectionLabel>Still open</SectionLabel>
      <Link href={href} className="block">
        <p className="font-serif text-[19px] leading-[1.5] text-ink">{prompt}</p>
        <p className="mt-2 font-sans text-[13px] leading-[1.6] text-ink-muted">
          on &ldquo;{snippet}&rdquo;
        </p>
      </Link>
    </section>
  );
}
