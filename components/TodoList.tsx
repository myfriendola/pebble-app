import type { Task } from "@/lib/types";
import { Tag, Whisper } from "./ui";

// The hushed "To do" list at the bottom of Today — secondary to the thinking
// above. A sage dot for work, a gray dot for life; the action, a tiny tag.
export function TodoList({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return <Whisper>No to-dos waiting. The day is yours.</Whisper>;
  }

  return (
    <ul className="divide-y divide-hairline">
      {tasks.map((task) => (
        <li key={task.id} className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0">
          <span
            aria-hidden
            className={[
              "h-2 w-2 shrink-0 rounded-full",
              task.domain === "work" ? "bg-sage-ring2" : "bg-ink-muted/50",
            ].join(" ")}
          />
          <span className="min-w-0 flex-1 truncate font-sans text-[14px] text-ink-secondary">
            {task.action}
          </span>
          <Tag kind={task.domain}>{task.domain}</Tag>
        </li>
      ))}
    </ul>
  );
}
