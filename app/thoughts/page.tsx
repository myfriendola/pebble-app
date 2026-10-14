import { getAllThoughts, getThemeGroupMap } from "@/lib/data";
import { ScreenHeader } from "@/components/ui";
import { ThoughtsView } from "@/components/ThoughtsView";

export const dynamic = "force-dynamic";

const PAGE = 120;

export default async function ThoughtsPage({
  searchParams,
}: {
  searchParams: { take?: string };
}) {
  const take = Math.min(2000, Math.max(PAGE, parseInt(searchParams.take ?? "", 10) || PAGE));
  const [thoughts, groupMap] = await Promise.all([getAllThoughts(take), getThemeGroupMap()]);
  const moreHref = thoughts.length >= take ? `/thoughts?take=${take + PAGE}` : undefined;

  return (
    <div>
      <ScreenHeader title="Thoughts">
        <p className="mt-2 font-serif text-[16px] italic leading-[1.6] text-ink-muted">
          A stream of what you&rsquo;ve said to yourself. Follow a thread to see it recur.
        </p>
      </ScreenHeader>
      <ThoughtsView thoughts={thoughts} groupMap={groupMap} moreHref={moreHref} />
    </div>
  );
}
