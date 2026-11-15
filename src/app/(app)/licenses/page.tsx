import { Window } from "@/components/win/Window";
import { IconSettings } from "@/components/icons/AppIcons";
import { LicensesAdminView } from "@/components/license/LicensesAdminView";

export const dynamic = "force-dynamic";

export default function LicensesAdminPage() {
  return (
    <Window title="لوحة التراخيص" icon={<IconSettings className="h-9 w-9" />}>
      <LicensesAdminView />
    </Window>
  );
}
