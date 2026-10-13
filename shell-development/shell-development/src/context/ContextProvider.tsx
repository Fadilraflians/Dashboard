"use client";

import React, { ReactNode } from "react";
import { SidebarProvider } from "./SidebarContext";
import { ToastProvider } from "./ToastContext";
import { WidgetProvider } from "./WidgetContext";

interface ContextProviderProps {
  children: ReactNode;
}

export default function ContextProvider({
  children,
}: Readonly<ContextProviderProps>) {
  return (
    <SidebarProvider>
      <WidgetProvider>
        <ToastProvider>{children}</ToastProvider>
      </WidgetProvider>
    </SidebarProvider>
  );
}
