import type { ReactNode } from "react";
import { DesktopProvider } from "@/components/win/DesktopProvider";
import { UiPrefsProvider } from "@/components/win/UiPrefs";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <UiPrefsProvider>
      <DesktopProvider>{children}</DesktopProvider>
    </UiPrefsProvider>
  );
}
