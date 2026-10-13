import { notFound } from "next/navigation";
import { getMenuBySlug } from "@/lib/menu";
import MenuMfeHost from "./MenuMfeHost";

export const dynamic = "force-dynamic";

/**
 * Per-menu MFE host route: /app/<slug>.
 *
 * The slug selects a menu from the shell registry; the menu's appKey picks
 * which remote (MfeDescriptor) to load. The client host fetches /api/config,
 * sets the MFE context cookie for that app, and mounts the remote via LazyMFE.
 */
export default async function AppMenuPage({
  params,
}: {
  params: Promise<{ menu: string }>;
}) {
  const { menu: slug } = await params;
  const menu = getMenuBySlug(slug);
  if (!menu || !menu.appKey) {
    notFound();
  }

  return <MenuMfeHost appKey={menu.appKey} title={menu.label} />;
}
