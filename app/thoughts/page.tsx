import { getAllThoughts, getThemeGroupMap } from "@/lib/data";
import { ScreenHeader } from "@/components/ui";
import { ThoughtsView } from "@/components/ThoughtsView";

export const dynamic = "force-dynamic";

export default async function ThoughtsPage() {
  const [thoughts, groupMap] = await Promise.all([getAllThoughts(), getThemeGroupMap()]);

  return (
    <div>
      <ScreenHeader title="Thoughts">
        <p className="mt-2 font-serif text-[16px] italic leading-[1.6] text-ink-muted">
          A stream of what you&rsquo;ve said to yourself. Follow a thread to see it recur.
        </p>
      </ScreenHeader>
      <ThoughtsView thoughts={thoughts} groupMap={groupMap} />
    </div>
  );
}
