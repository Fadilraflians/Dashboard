import { NextResponse } from "next/server";
import type { AppConfig } from "@/types";

export const dynamic = "force-dynamic";

/**
 * App config endpoint (BFF). Exposes the MFE remote URLs to the client so the
 * runtime loader knows where to fetch each `remoteEntry.js`. URLs come from
 * server-side env vars, keeping them out of the client bundle.
 */
export async function GET() {
  const config: AppConfig = {
    appName: "Portal MFE",
    // Shared UI remote URL (runtime env). Passed to each MFE via mount() props
    // so the MFE resolves the shared remoteEntry at runtime, not build time.
    sharedUrl: process.env.SHARED_URL || "",
    mfe: {
      dashboardBok: {
        scope: process.env.MFE_DASHBOARDBOK_SCOPE || "dashboardBok",
        module: process.env.MFE_DASHBOARDBOK_MODULE || "./mount",
        url: process.env.MFE_DASHBOARDBOK_URL || "",
      },
      roleMgmt: {
        scope: process.env.MFE_ROLEMGMT_SCOPE || "roleMgmt",
        module: process.env.MFE_ROLEMGMT_MODULE || "./mount",
        url: process.env.MFE_ROLEMGMT_URL || "",
      },
    },
  };

  return NextResponse.json(config);
}
