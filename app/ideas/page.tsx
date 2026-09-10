import { getAllIdeas, collectThemes } from "@/lib/data";
import { ScreenHeader } from "@/components/ui";
import { IdeasView } from "@/components/IdeasView";

export const dynamic = "force-dynamic";

export default async function IdeasPage() {
  const ideas = await getAllIdeas();
  const themes = collectThemes(ideas);

  return (
    <div>
      <ScreenHeader title="Ideas">
        <p className="mt-2 font-serif text-[16px] italic leading-[1.6] text-ink-muted">
          Sparks worth keeping — the things you might make, try, or explore.
        </p>
      </ScreenHeader>
      <IdeasView ideas={ideas} themes={themes} />
    </div>
  );
}
