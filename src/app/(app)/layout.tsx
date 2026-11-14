import type { ReactNode } from "react";
import { DesktopProvider } from "@/components/win/DesktopProvider";
import { UiPrefsProvider } from "@/components/win/UiPrefs";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { AuthGate } from "@/components/auth/AuthGate";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <UiPrefsProvider>
      <AuthProvider>
        <DesktopProvider>
          <AuthGate>{children}</AuthGate>
        </DesktopProvider>
      </AuthProvider>
    </UiPrefsProvider>
  );
}
