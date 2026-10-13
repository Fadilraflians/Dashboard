"use client";

import { useEffect, useState } from "react";
import { LazyMFE } from "@/components/LazyMFE";
import DashboardWidgetGrid from "@/components/DashboardWidgetGrid";
import { loadConfig } from "@/lib/config";
import { clientLog } from "@/lib/clientLog";
import type { MfeDescriptor } from "@/types";

interface MenuMfeHostProps {
  appKey: string;
  title: string;
}

export default function MenuMfeHost({ appKey, title }: MenuMfeHostProps) {
  const [remote, setRemote]       = useState<MfeDescriptor | null>(null);
  const [sharedUrl, setSharedUrl] = useState<string | undefined>(undefined);
  const [error, setError]         = useState<string | null>(null);

  const isDashboard = appKey === "dashboardBok";

  useEffect(() => {
    let active = true;
    setRemote(null);
    setError(null);

    async function run() {
      try {
        await fetch("/api/mfe/select", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ app: appKey }),
        }).catch(() => {});

        const cfg = await loadConfig();
        const descriptor = cfg.mfe[appKey];
        if (!active) return;
        if (!descriptor?.url) {
          clientLog({ level: "error", category: "LOAD_MFE", event: "MFE_CONFIG_MISSING", service: `MFE:${appKey}`, app: appKey, message: `Descriptor/URL untuk "${appKey}" tidak ada.` });
          setError(`Konfigurasi MFE "${appKey}" belum tersedia.`);
          return;
        }
        setSharedUrl(cfg.sharedUrl || undefined);
        setRemote(descriptor);
      } catch (err) {
        if (active) {
          clientLog({ level: "error", category: "SHELL", event: "CONFIG_FAIL", service: "SHELL", app: appKey, message: `Gagal /api/config: ${err instanceof Error ? err.message : String(err)}` });
          setError("Gagal memuat konfigurasi aplikasi.");
        }
      }
    }

    run();
    return () => { active = false; };
  }, [appKey]);

  if (error) {
    return (
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 16 }}>
        <p style={{ color: "#ef4444", margin: 0 }}>{error}</p>
      </div>
    );
  }

  if (!remote) {
    return (
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 16, minHeight: 320, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <i className="pi pi-spin pi-spinner" style={{ fontSize: 28, color: "#4f46e5" }} />
      </div>
    );
  }

  // ── Dashboard: MFE renders a single free-form canvas with AI widgets ────────
  if (isDashboard) {
    return (
      <LazyMFE
        key={appKey}
        scope={remote.scope}
        module={remote.module}
        url={remote.url}
        sharedUrl={sharedUrl}
      />
    );
  }

  // ── Other MFEs: simple card wrapper ─────────────────────────────────────────
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>{title}</h1>
      </div>
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 16, minHeight: 320 }}>
        <LazyMFE key={appKey} scope={remote.scope} module={remote.module} url={remote.url} sharedUrl={sharedUrl} />
      </div>
    </div>
  );
}
