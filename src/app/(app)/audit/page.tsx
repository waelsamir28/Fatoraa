import { Window } from "@/components/win/Window";
import { IconBackup } from "@/components/icons/AppIcons";
import { AuditLogView } from "@/components/admin/AuditLogView";

export const dynamic = "force-dynamic";

export default function AuditPage() {
  return (
    <Window title="سجل المراجعة" icon={<IconBackup className="h-9 w-9" />}>
      <AuditLogView />
    </Window>
  );
}
