export interface SessionUser {
  id: string;
  name: string;
  role: string;
}

export interface MfeDescriptor {
  /** Module Federation container (scope) name, e.g. "internalDashboard". */
  scope: string;
  /** Exposed module path, e.g. "./DashboardApp". */
  module: string;
  /** URL to the remote's remoteEntry.js. */
  url: string;
}

export interface AppConfig {
  appName: string;
  /**
   * URL of the shared UI remoteEntry.js (sharedUi), resolved from the shell's
   * runtime env and passed down to each MFE's mount() so the MFE loads shared
   * cards from the right place without baking the URL at build time.
   */
  sharedUrl: string;
  mfe: {
    dashboardBok: MfeDescriptor;
    roleMgmt: MfeDescriptor;
    [key: string]: MfeDescriptor;
  };
}

/**
 * Shape of the non-HttpOnly `mfe_context` cookie that remotes can read.
 */
export interface MfeContextCookie {
  userId: string;
  name: string;
  role: string;
  app: string;
  ts: number;
}
