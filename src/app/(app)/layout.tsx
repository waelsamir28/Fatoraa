import type { ReactNode } from "react";
import { DesktopProvider } from "@/components/win/DesktopProvider";
import { UiPrefsProvider } from "@/components/win/UiPrefs";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { AuthGate } from "@/components/auth/AuthGate";
import { PageGuard } from "@/components/auth/PageGuard";
import { ErrorBoundary } from "@/components/win/ErrorBoundary";
import { BackgroundTasks } from "@/components/win/BackgroundTasks";
import { LockScreen } from "@/components/win/LockScreen";
import { GlobalShortcuts } from "@/components/win/GlobalShortcuts";
import { ScreenTransition } from "@/components/win/ScreenTransition";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <UiPrefsProvider>
      <AuthProvider>
        <DesktopProvider>
          <ErrorBoundary>
            <AuthGate>
              <PageGuard>
                <BackgroundTasks />
                <ScreenTransition>{children}</ScreenTransition>
                <GlobalShortcuts />
                <LockScreen />
              </PageGuard>
            </AuthGate>
          </ErrorBoundary>
        </DesktopProvider>
      </AuthProvider>
    </UiPrefsProvider>
  );
}
