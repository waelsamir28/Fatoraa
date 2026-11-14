import type { ReactNode } from "react";
import { DesktopProvider } from "@/components/win/DesktopProvider";
import { UiPrefsProvider } from "@/components/win/UiPrefs";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { AuthGate } from "@/components/auth/AuthGate";
import { ErrorBoundary } from "@/components/win/ErrorBoundary";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <UiPrefsProvider>
      <AuthProvider>
        <DesktopProvider>
          <ErrorBoundary>
            <AuthGate>{children}</AuthGate>
          </ErrorBoundary>
        </DesktopProvider>
      </AuthProvider>
    </UiPrefsProvider>
  );
}
