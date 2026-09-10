import { LockScreen } from "@/components/LockScreen";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pebble — locked",
};

export default function UnlockPage() {
  return <LockScreen />;
}
