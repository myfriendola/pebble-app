import { getTasks } from "@/lib/data";
import { ScreenHeader } from "@/components/ui";
import { TaskList } from "@/components/TaskList";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const { work, life } = await getTasks();

  return (
    <div>
      <ScreenHeader title="Tasks">
        <p className="mt-2 font-serif text-[16px] italic leading-[1.6] text-ink-muted">
          What to do, with the words you said kept underneath.
        </p>
      </ScreenHeader>
      <TaskList work={work} life={life} />
    </div>
  );
}
