"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import "./app-layout.css";

/**
 * App shell layout — adds the sidebar for MFE pages (/app/*).
 * The parent (protected) layout already handles auth + header.
 *
 * Sidebar always shows 3 menus: Dashboard, Role, Aigovtech.
 * When Aigovtech is active, the main area becomes a full chatbot
 * with a "Kembali ke Menu" button at the top.
 */
export default function AppShellLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <div className="appBody">
      <Sidebar />
      <main className="appMain">{children}</main>
    </div>
  );
}