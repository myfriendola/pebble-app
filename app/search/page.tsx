import { search } from "@/lib/search";
import { ScreenHeader, Whisper } from "@/components/ui";
import { SearchInput } from "@/components/SearchInput";
import { SearchResults } from "@/components/SearchResults";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  const { semantic, hits } = q ? await search(q) : { semantic: false, hits: [] };

  return (
    <div>
      <ScreenHeader title="Search">
        <p className="mt-2 font-serif text-[16px] italic leading-[1.6] text-ink-muted">
          Find your way back to something — a worry, a spark, a word you keep returning to.
        </p>
      </ScreenHeader>

      <SearchInput initial={q} />

      {q ? (
        <SearchResults q={q} hits={hits} semantic={semantic} />
      ) : (
        <Whisper>Search by keyword, or just describe what&rsquo;s on your mind.</Whisper>
      )}
    </div>
  );
}
