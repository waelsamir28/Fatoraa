import { Window } from "@/components/win/Window";
import { IconSupport } from "@/components/icons/AppIcons";
import { HealthView } from "@/components/win/HealthView";

export const dynamic = "force-dynamic";

export default function HealthPage() {
  return (
    <Window title="صحة البرنامج" icon={<IconSupport className="h-9 w-9" />}>
      <HealthView />
    </Window>
  );
}
