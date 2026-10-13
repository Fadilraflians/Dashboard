# rnd-template-mfe-a — Panduan Project (MFE "Dashboard")

MFE remote (webpack Module Federation) + Express BFF. Mengisi KONTEN satu menu
(Dashboard) di dalam layout shell. Scope MF: `dashboardBok`. BFF port 3101,
dev client 3001.

> mfe-b identik polanya; bedanya scope `roleMgmt`, BFF 3102, client 3002,
> domain "Role".

## Struktur folder (src/)

- `index.tsx` → `bootstrap.tsx` (async boundary; standalone dev entry).
- `app/` — konten + `mount.tsx` (API `mount(el, props)/unmount(el)` yang
  di-`exposes` sebagai `./mount`), `dashboard/`, `Unauthorized.tsx`,
  `MfeErrorBoundary`.
- `services/` — registry service sisi klien (per domain) → path BFF.
- `clientServices/` — `useApiService` (hook fetch) + `index.ts`.
- `lib/` — `runtimeConfig.ts`, `clientLog.ts`, `mfeContext.ts`.
- `api/` — Express BFF: `index.mjs`, `loader.mjs` (file-based routing),
  `log.mjs`, `routes/<domain>/<action>/route.mjs`, `lib/` (env, gateway, redis).

## Dua mode jalan

- **Di dalam shell** (produksi normal): shell memanggil `./mount(el, props)`.
  MFE render React root SENDIRI ke node yang disediakan shell. Header/sidebar
  milik shell — JANGAN tambahkan di MFE.
- **Standalone** (dev, port sendiri): `bootstrap.tsx` cek `/api/session`;
  kalau tak ada sesi valid → render `Unauthorized`.

## Cara hit API (MFE → BFF → gateway shell)

JANGAN fetch backend langsung dari browser. Pola wajib:

1. Definisikan domain di `src/services/<domain>/index.ts` (mapping key →
   path BFF, tipe request/response, mock opsional). Daftarkan di
   `src/services/index.ts`.
2. Komponen pakai `useApiService("<serviceKey>")` → `callApi(body?)`. Hook:
   - URL via `getApiUrl()` = `/mfe-api/<APP_KEY>/<path>` (SAME-ORIGIN dengan
     shell, agar cookie HttpOnly ikut). `__APP_KEY__` di-hardcode saat build.
   - GET jika tanpa body, POST jika ada body; `credentials: "include"`.
   - Status 404/501 atau network error → fallback ke MOCK (jika domain punya),
     agar UI tetap hidup saat standalone/belum ada backend.
3. BFF route (`api/routes/<domain>/<action>/route.mjs`) tipis: `proxyToGateway`
   ke gateway shell (`lib/gateway.mjs`), token Bearer diambil dari Redis
   (read-only). BFF-lah yang bicara ke backend, bukan browser.

Menambah endpoint: buat `services/<domain>/` (klien) + `api/routes/<domain>/
<action>/route.mjs` (BFF). Loader auto-mount route; tidak perlu daftar manual.

## Komponen & shared

- Butuh card/komponen baru? IKUTI steering `shared-components-policy`
  (`10-shared-components.md`). Cek shared dulu; default bikin di MFE; promosikan
  ke shared hanya jika lintas-MFE.
- Card dari shared di-import via `import("sharedUi/X")` lewat `remoteCard()`
  yang toleran gagal + `RemoteCardBoundary` per card. Nilai data diambil MFE
  via API lalu dikirim sebagai prop ke card shared.

## Env & runtime config

- STATIS hardcode: `APP_KEY` (`dashboardBok`), `SHARED_SCOPE` (`sharedUi`) di
  webpack + `api/lib/env.mjs`. `publicPath: "auto"`.
- RUNTIME (BFF, dari OCP): `API_PORT`, `SHELL_GATEWAY_URL` (forward + CORS
  allowlist), `SHARED_URL`, `AUTH_COOKIE_NAME`, `REDIS_*`.
- `SHARED_URL` & shell URL di-resolve RUNTIME lewat `window.__MFE_RUNTIME__`
  (diisi shell saat embed, atau BFF `/api/runtime-config` saat standalone).
  Lihat `src/lib/runtimeConfig.ts`. Jangan bake URL ini saat build.

## Log

- BFF: winston 9-bracket (`api/log.mjs`). Rotasi harian ke `./logs/`.
- Browser: `clientLog()` → sink shell `/api/client-log`. Kategori:
  `FETCH_API | LOAD_MFE | LOAD_SHARED`. Fire-and-forget; jangan bikin app error.

## Verifikasi

`pnpm build` exit 0; `node --check` untuk `.mjs` yang diubah; cek scope
`dashboardBok` ada di `dist/remoteEntry.js`.
