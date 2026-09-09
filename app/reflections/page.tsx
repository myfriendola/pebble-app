import { getDigests } from "@/lib/data";
import { ScreenHeader } from "@/components/ui";
import { ReflectionsView } from "@/components/ReflectionsView";

export const dynamic = "force-dynamic";

export default async function ReflectionsPage() {
  const digests = await getDigests();

  return (
    <div>
      <ScreenHeader title="Reflections">
        <p className="mt-2 font-serif text-[16px] italic leading-[1.6] text-ink-muted">
          The days, weeks, and months read back to you.
        </p>
      </ScreenHeader>
      <ReflectionsView digests={digests} />
    </div>
  );
}
