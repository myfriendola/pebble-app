// Download your whole archive — a complete JSON backup, or a readable Markdown
// version. Plain links; the routes set Content-Disposition so they save to disk.

export function ExportLinks() {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <a
          href="/api/export"
          download
          className="rounded-full border border-hairline px-4 py-1.5 font-sans text-[12px] text-ink-secondary transition-colors hover:border-sage-ring hover:text-sage"
        >
          Download backup
        </a>
        <a
          href="/api/export?format=md"
          download
          className="font-sans text-[12px] text-ink-muted transition-colors hover:text-ink-secondary"
        >
          Readable archive
        </a>
      </div>
      <p className="font-sans text-[12px] leading-[1.6] text-ink-muted">
        A full copy of everything you&rsquo;ve captured, saved to your device — yours to keep.
      </p>
    </div>
  );
}
