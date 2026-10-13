import { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AuthLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  // Already authenticated users shouldn't see the login page.
  const cookieStore = await cookies();
  const session = await getSession(cookieStore.get(AUTH_COOKIE_NAME)?.value);
  if (session) {
    redirect("/landing");
  }

  return <>{children}</>;
}
