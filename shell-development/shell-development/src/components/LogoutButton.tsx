"use client";

import { useRouter } from "next/navigation";
import { Button } from "primereact/button";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <Button
      label="Keluar"
      icon="pi pi-sign-out"
      severity="secondary"
      text
      size="small"
      loading={loading}
      onClick={handleLogout}
    />
  );
}
