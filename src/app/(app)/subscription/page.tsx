import { Window } from "@/components/win/Window";
import { IconSettings } from "@/components/icons/AppIcons";
import { SubscriptionView } from "@/components/license/SubscriptionView";

export const dynamic = "force-dynamic";

export default function SubscriptionPage() {
  return (
    <Window title="حالة اشتراكي" icon={<IconSettings className="h-9 w-9" />}>
      <SubscriptionView />
    </Window>
  );
}
