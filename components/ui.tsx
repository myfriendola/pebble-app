import Link from "next/link";
import type { ReactNode } from "react";

// A screen header: an optional small label above an 18px/500 serif-adjacent
// title, with generous space beneath. Titles use the clean sans (UI voice).
export function ScreenHeader({
  title,
  label,
  children,
}: {
  title: string;
  label?: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-8 animate-fade-in">
      {label ? <div className="label mb-2">{label}</div> : null}
      <h1 className="font-sans text-[18px] font-medium tracking-tight text-ink">{title}</h1>
      {children}
    </header>
  );
}

// A quiet section label with a hairline running to the right.
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="label whitespace-nowrap">{children}</span>
      <span className="h-px flex-1 bg-hairline" />
    </div>
  );
}

export function Tag({ kind, children }: { kind: "work" | "life" | "theme"; children: ReactNode }) {
  const cls = kind === "work" ? "tag tag-work" : kind === "life" ? "tag tag-life" : "tag tag-theme";
  return <span className={cls}>{children}</span>;
}

// A soft empty state — never a jarring "nothing here".
export function Whisper({ children }: { children: ReactNode }) {
  return <p className="prose-question text-ink-muted py-6">{children}</p>;
}

export function OpenAsPageLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 font-sans text-[12px] text-ink-muted transition-colors hover:text-sage"
    >
      Open as its own page <span aria-hidden>↗</span>
    </Link>
  );
}
