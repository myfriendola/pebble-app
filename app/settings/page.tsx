import { getLastCapture } from "@/lib/data";
import { ScreenHeader } from "@/components/ui";
import { CaptureHealth } from "@/components/CaptureHealth";
import { NotificationsToggle } from "@/components/NotificationsToggle";
import { CalendarSubscribe } from "@/components/CalendarSubscribe";
import { ExportLinks } from "@/components/ExportLinks";
import { ProcessNowButton } from "@/components/ProcessNowButton";

export const dynamic = "force-dynamic";

function Section({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="label mb-2">{label}</div>
      {description ? (
        <p className="mb-3 font-sans text-[12px] leading-[1.6] text-ink-muted">{description}</p>
      ) : null}
      {children}
    </section>
  );
}

export default async function SettingsPage() {
  const lastCapture = await getLastCapture();

  return (
    <div>
      <ScreenHeader title="Settings">
        <p className="mt-2 font-serif text-[16px] italic leading-[1.6] text-ink-muted">
          The quiet machinery — notifications, your calendar, and keeping a copy of it all.
        </p>
      </ScreenHeader>

      <div className="space-y-10 border-t border-hairline pt-8">
        <Section label="Capture" description="When your ring last reached Pebble.">
          <CaptureHealth last={lastCapture} />
        </Section>

        <Section
          label="Notifications"
          description="A gentle count of what's due each morning, a quiet receipt as each note lands, and a nudge when the day's reflection settles."
        >
          <NotificationsToggle />
        </Section>

        <Section label="Calendar" description="Send your dated to-dos to your calendar.">
          <CalendarSubscribe />
        </Section>

        <Section label="Backup">
          <ExportLinks />
        </Section>

        <Section label="Reflection" description="Run the end-of-day pass now, instead of waiting for tonight.">
          <ProcessNowButton />
        </Section>
      </div>
    </div>
  );
}
