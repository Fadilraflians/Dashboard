import type { Metadata } from "next";
import { PrimeReactProvider } from "primereact/api";
import "./globals.css";
import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "primeflex/primeflex.css";
import { ContextProvider } from "@/context";
import { ReactNode } from "react";

export const dynamic = "force-dynamic";
export const revalidate = false;

// Static display label (hardcoded). Not config — just the app name shown in
// the UI. Hardcoded because it never changes per environment, and because
// NEXT_PUBLIC_* is build-time inlined (would fall back to a wrong default when
// the CI build has no env).
const appName = "Portal MFE";

export const metadata: Metadata = {
  title: appName,
  icons: {
    icon: "/favicon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <title>{appName}</title>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('rnd-theme');if(!t){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(t==='dark'){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="bodyContainer">
        <PrimeReactProvider>
          <ContextProvider>{children}</ContextProvider>
        </PrimeReactProvider>
      </body>
    </html>
  );
}
