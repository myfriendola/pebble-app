import { getLastCaptureAt } from "@/lib/data";
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
  const lastCaptureAt = await getLastCaptureAt();

  return (
    <div>
      <ScreenHeader title="Settings">
        <p className="mt-2 font-serif text-[16px] italic leading-[1.6] text-ink-muted">
          The quiet machinery — notifications, your calendar, and keeping a copy of it all.
        </p>
      </ScreenHeader>

      <div className="space-y-10 border-t border-hairline pt-8">
        <Section label="Capture" description="When your ring last reached Pebble.">
          <CaptureHealth iso={lastCaptureAt} />
        </Section>

        <Section
          label="Notifications"
          description="A nudge when the day's reflection settles, and a gentle morning count of what's due."
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
