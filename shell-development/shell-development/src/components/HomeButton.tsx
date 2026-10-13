"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import "./home-button.css";

/**
 * Header "back to landing" button. Shown only when inside an application
 * (/app/*), hidden on the landing page itself.
 */
export default function HomeButton() {
  const pathname = usePathname();
  const onLanding = pathname === "/landing" || pathname.startsWith("/landing/");

  if (onLanding) return null;

  return (
    <Link href="/landing" className="homeButton" aria-label="Kembali ke daftar aplikasi">
      <i className="pi pi-th-large" />
      <span>Daftar Aplikasi</span>
    </Link>
  );
}
