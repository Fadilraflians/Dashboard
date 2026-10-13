import React, { ReactNode } from "react";
import { SidebarProvider } from "./SidebarContext";
import { ToastProvider } from "./ToastContext";

/**
 * MFE-local providers (no next-auth). Authentication/session is owned by the
 * shell; this MFE only consumes the `mfe_context` cookie.
 */
export default function ContextProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <SidebarProvider>
      <ToastProvider>{children}</ToastProvider>
    </SidebarProvider>
  );
}
