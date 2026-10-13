import { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, getSession } from "@/lib/session";
import LogoutButton from "@/components/LogoutButton";
import HomeButton from "@/components/HomeButton";
import ThemeToggle from "@/components/ThemeToggle";
import "./layout.css";

export const dynamic = "force-dynamic";

// Static display label (hardcoded) — app name shown in the header.
const appName = "Portal MFE";

/**
 * Protected layout — auth gate + header. No sidebar here; the sidebar is added
 * by the nested /app/ layout for MFE pages. Landing stays header-only.
 */
export default async function ProtectedLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const cookieStore = await cookies();
  const session = await getSession(cookieStore.get(AUTH_COOKIE_NAME)?.value);
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="shell">
      <header className="header">
        <div className="headerLeft">
          <div className="headerBrand">
            <span className="headerMark">MF</span>
            <span>{appName}</span>
          </div>
          <HomeButton />
        </div>
        <div className="headerUser">
          <span>
            <i className="pi pi-user" style={{ marginRight: 6 }} />
            {session.name}
          </span>
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>
      <div className="content">{children}</div>
    </div>
  );
}
