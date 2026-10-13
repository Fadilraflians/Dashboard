import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, getSession } from "@/lib/session";
import { SHELL_APPS } from "@/lib/menu";
import AppCard from "./AppCard";
import styles from "./landing.module.css";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const cookieStore = await cookies();
  const session = await getSession(cookieStore.get(AUTH_COOKIE_NAME)?.value);

  return (
    <div className={styles.page}>
      {/* Welcome banner */}
      <div className={styles.banner}>
        <div className={styles.bannerIcon}>
          <i className="pi pi-home" />
        </div>
        <div>
          <h1 className={styles.title}>
            Selamat datang{session?.name ? `, ${session.name}` : ""}
          </h1>
          <p className={styles.subtitle}>
            Pilih aplikasi untuk mulai bekerja. Setiap aplikasi akan membuka
            layout kerja dengan menu di sidebar.
          </p>
        </div>
      </div>

      {/* App cards grid */}
      <h2 className={styles.sectionTitle}>Daftar Aplikasi</h2>
      <div className={styles.grid}>
        {SHELL_APPS.map((app) => (
          <AppCard
            key={app.key}
            appKey={app.key}
            title={app.label}
            description={app.description}
            icon={app.icon}
            href={app.href}
          />
        ))}
      </div>
    </div>
  );
}
