"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * غلاف انتقال ناعم للشاشات عند التنقل بين المسارات.
 */
export function ScreenTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-screen-enter h-full w-full">
      {children}
    </div>
  );
}
