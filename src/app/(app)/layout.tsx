import type { ReactNode } from "react";
import { DesktopProvider } from "@/components/win/DesktopProvider";
import { UiPrefsProvider } from "@/components/win/UiPrefs";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { AuthGate } from "@/components/auth/AuthGate";
import { ErrorBoundary } from "@/components/win/ErrorBoundary";
import { BackgroundTasks } from "@/components/win/BackgroundTasks";
import { LockScreen } from "@/components/win/LockScreen";
import { GlobalShortcuts } from "@/components/win/GlobalShortcuts";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <UiPrefsProvider>
      <AuthProvider>
        <DesktopProvider>
          <ErrorBoundary>
            <AuthGate>
              <BackgroundTasks />
              {children}
              <GlobalShortcuts />
              <LockScreen />
            </AuthGate>
          </ErrorBoundary>
        </DesktopProvider>
      </AuthProvider>
    </UiPrefsProvider>
  );
}
