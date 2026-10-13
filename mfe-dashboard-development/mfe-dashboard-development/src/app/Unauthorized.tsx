import React from "react";
import { getRuntimeConfig } from "../lib/runtimeConfig";

/**
 * Shown when the MFE is opened directly (e.g. http://localhost:3001) without a
 * valid shell session. The MFE is meant to run inside the shell; a direct hit
 * without authentication is not allowed.
 */
export default function Unauthorized() {
  // Shell URL comes from the runtime config (populated by the BFF before this
  // standalone page renders), not a build-time constant.
  const { shellUrl } = getRuntimeConfig();
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        background: "#f7f7f9",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 440,
          width: "100%",
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: "40px 32px",
          textAlign: "center",
          boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "#fee2e2",
            color: "#ef4444",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            fontSize: 26,
          }}
        >
          <i className="pi pi-lock" />
        </div>
        <h1 style={{ margin: "0 0 8px", fontSize: 20, color: "#111827" }}>
          401 — Unauthorized
        </h1>
        <p style={{ margin: "0 0 20px", color: "#6b7280", fontSize: 14 }}>
          Aplikasi ini hanya dapat diakses melalui portal. Silakan masuk lewat
          shell terlebih dahulu.
        </p>
        <a
          href={shellUrl}
          style={{
            display: "inline-block",
            background: "#4f46e5",
            color: "#fff",
            textDecoration: "none",
            padding: "10px 20px",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          Buka Portal
        </a>
      </div>
    </div>
  );
}
