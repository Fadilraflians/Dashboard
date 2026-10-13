/**
 * Shell navigation registry.
 *
 * Two levels:
 *  - APPLICATIONS (SHELL_APPS): what the landing page lists as cards. The user
 *    picks an application to enter its work layout (header + sidebar).
 *  - MENUS (SHELL_MENUS): the sidebar inside the app layout. Each MFE menu maps
 *    to ONE micro-frontend by `appKey` and is hosted at `/app/<slug>`; the host
 *    route loads the matching remote (appKey -> MfeDescriptor from /api/config).
 *
 * Current setup: ONE application ("Dashboard BOK") whose sidebar has two MFE
 * menus — Dashboard (mfe-a) and Role (mfe-b).
 *
 * To add an MFE menu: add an entry to SHELL_MENUS with kind "mfe", add the
 * matching MFE_<APPKEY>_* env vars + the descriptor in /api/config, and run
 * that remote. No route files change.
 */

export interface ShellApp {
  /** Stable key / logical app id. */
  key: string;
  /** Card title on the landing page. */
  label: string;
  /** PrimeIcons class. */
  icon: string;
  /** Short description shown on the landing card. */
  description: string;
  /** Entry route when the card is clicked (first menu of the app). */
  href: string;
}

/** Applications listed on the landing page. */
export const SHELL_APPS: ShellApp[] = [
  {
    key: "dashboardBok",
    label: "Dashboard BOK",
    icon: "pi pi-th-large",
    description:
      "Portal monitoring & manajemen BOK. Berisi menu Dashboard dan Role, dimuat runtime via Module Federation.",
    href: "/app/dashboard",
  },
];

export interface ShellMenu {
  /** Stable key for React lists. */
  key: string;
  /** Sidebar label. */
  label: string;
  /** PrimeIcons class. */
  icon: string;
  /** Full href this menu navigates to. */
  href: string;
  /** "shell" = plain shell page; "mfe" = micro-frontend host. */
  kind: "shell" | "mfe";
  /** MFE app key (= scope = config descriptor key). Only for kind "mfe". */
  appKey?: string;
}

/** Sidebar menus inside the app work layout (/app/*). */
export const SHELL_MENUS: ShellMenu[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: "pi pi-th-large",
    href: "/app/dashboard",
    kind: "mfe",
    appKey: "dashboardBok",
  },
  {
    key: "role",
    label: "Role",
    icon: "pi pi-users",
    href: "/app/role",
    kind: "mfe",
    appKey: "roleMgmt",
  },
  {
    key: "aigovtech",
    label: "Aigovtech",
    icon: "pi pi-spark",
    href: "/app/ai",
    kind: "shell",
  },
];

export const DEFAULT_LANDING_HREF = "/landing";

/** Resolve an MFE menu by its /app/<slug> slug. */
export function getMenuBySlug(slug: string): ShellMenu | undefined {
  return SHELL_MENUS.find((m) => m.kind === "mfe" && m.href === `/app/${slug}`);
}
