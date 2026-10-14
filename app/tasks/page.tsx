import { getTasks } from "@/lib/data";
import { ScreenHeader } from "@/components/ui";
import { TaskList } from "@/components/TaskList";
import { CalendarSubscribe } from "@/components/CalendarSubscribe";

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

      <footer className="mt-12 border-t border-hairline pt-5">
        <div className="label mb-2">Calendar</div>
        <CalendarSubscribe />
      </footer>
    </div>
  );
}
