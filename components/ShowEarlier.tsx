import Link from "next/link";

// A quiet way to reach further back in the archive. Pages load a recent window
// by default; this grows it by one page (a plain link, so it works without JS).
export function ShowEarlier({ href }: { href: string }) {
  return (
    <div className="mt-10 flex justify-center">
      <Link
        href={href}
        scroll={false}
        className="font-sans text-[12px] uppercase tracking-label text-ink-muted transition-colors hover:text-sage"
      >
        Show earlier
      </Link>
    </div>
  );
}
