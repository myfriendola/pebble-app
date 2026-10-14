import { getAllIdeas, getThemeGroupMap } from "@/lib/data";
import { ScreenHeader } from "@/components/ui";
import { IdeasView } from "@/components/IdeasView";

export const dynamic = "force-dynamic";

const PAGE = 120;

export default async function IdeasPage({
  searchParams,
}: {
  searchParams: { take?: string };
}) {
  const take = Math.min(2000, Math.max(PAGE, parseInt(searchParams.take ?? "", 10) || PAGE));
  const [ideas, groupMap] = await Promise.all([getAllIdeas(take), getThemeGroupMap()]);
  const moreHref = ideas.length >= take ? `/ideas?take=${take + PAGE}` : undefined;

  return (
    <div>
      <ScreenHeader title="Ideas">
        <p className="mt-2 font-serif text-[16px] italic leading-[1.6] text-ink-muted">
          Sparks worth keeping — the things you might make, try, or explore.
        </p>
      </ScreenHeader>
      <IdeasView ideas={ideas} groupMap={groupMap} moreHref={moreHref} />
    </div>
  );
}
