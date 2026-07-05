"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "./app-shell";

export function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/sign-in" || pathname === "/sign-up" || pathname === "/forgot-password" || pathname === "/reset-password") {
    return <div className="min-h-svh">{children}</div>;
  }

  return <AppShell>{children}</AppShell>;
}
