import { getToday, getOpenNoodle, getLastCaptureAt } from "@/lib/data";
import { formatDayLong } from "@/lib/format";
import { SectionLabel } from "@/components/ui";
import { ThoughtStream } from "@/components/ThoughtStream";
import { IdeaRow } from "@/components/IdeaRow";
import { TodoList } from "@/components/TodoList";
import { TodayReflection } from "@/components/TodayReflection";
import { DailyPrompt } from "@/components/DailyPrompt";
import { CaptureHealth } from "@/components/CaptureHealth";
import { ProcessNowButton } from "@/components/ProcessNowButton";
import { NotificationsToggle } from "@/components/NotificationsToggle";
import { ExportLinks } from "@/components/ExportLinks";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const [today, openNoodle, lastCaptureAt] = await Promise.all([
    getToday(),
    getOpenNoodle(),
    getLastCaptureAt(),
  ]);

  // The top zone blooms into the full reflection once the day's reflection
  // exists (written nightly / by "Process now"); until then it holds one
  // evolving serif sentence.
  const bloomed = Boolean(today.dailyDigest);

  return (
    <div className="space-y-12">
      <div>
        <div className="label mb-4 animate-fade-in">{formatDayLong(today.date)}</div>

        {bloomed && today.dailyDigest ? (
          <TodayReflection
            digest={today.dailyDigest}
            reviewCount={today.reviewCount}
            reviewItems={today.reviewItems}
          />
        ) : (
          <p className="animate-fade-in-slow font-serif text-[22px] leading-[1.5] text-ink">
            {today.dayLine}
          </p>
        )}
      </div>

      <section className="animate-fade-in">
        <SectionLabel>Thoughts today</SectionLabel>
        <ThoughtStream
          thoughts={today.thoughtsToday}
          showThemes
          empty="Nothing spoken yet today. When a thought surfaces, it will rest here."
        />
      </section>

      {today.ideasToday.length > 0 ? (
        <section className="animate-fade-in">
          <SectionLabel>Sparks today</SectionLabel>
          <div className="divide-y divide-hairline">
            {today.ideasToday.map((idea) => (
              <IdeaRow key={idea.id} idea={idea} showThemes showDomain />
            ))}
          </div>
        </section>
      ) : null}

      <section className="animate-fade-in">
        <SectionLabel>To do</SectionLabel>
        <TodoList tasks={today.tasksToday} />
      </section>

      {openNoodle ? <DailyPrompt {...openNoodle} /> : null}

      {/* Quiet footer: settings, backup, and a capture-health line. */}
      <footer className="space-y-6 border-t border-hairline pt-5">
        <div>
          <div className="label mb-2">Capture</div>
          <CaptureHealth iso={lastCaptureAt} />
        </div>
        <div>
          <div className="label mb-2">Notifications</div>
          <NotificationsToggle />
        </div>
        <div>
          <div className="label mb-2">Backup</div>
          <ExportLinks />
        </div>
        <div>
          <div className="label mb-2">Dev</div>
          <ProcessNowButton />
        </div>
      </footer>
    </div>
  );
}
