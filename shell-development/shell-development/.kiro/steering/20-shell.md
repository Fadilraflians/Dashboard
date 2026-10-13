# rnd-template-shell — Panduan Project (Host / Portal)

Next.js (custom server) yang jadi host portal: login → landing → layout
aplikasi (header + sidebar + footer). Shell memuat MFE lewat Module Federation.

## Struktur folder (src/)

- `app/` — route Next (App Router). `(auth)/login`, `(protected)/` (landing +
  layout aplikasi), `(protected)/app/[menu]` (host MFE per menu), `api/*`
  (BFF Next: config, mfe/select, gateway, mfe-api proxy, client-log, auth).
- `components/` — UI shell (Sidebar, Layout, ErrorBoundary, `LazyMFE`).
- `serverServices/` — pemanggilan backend sisi server (lihat di bawah).
- `lib/` — `menu.ts` (registry), `session.ts`, `config.ts`, `clientLog.ts`.
- `types/` — tipe bersama (`AppConfig`, `MfeDescriptor`, dll).

## Cara hit API (shell → backend gateway)

Semua panggilan backend lewat sisi SERVER (route di `app/api/*`), bukan dari
browser langsung. Pola:

1. Daftarkan endpoint di `serverServices/ServerUrlMap.ts` (key → `{ urlEndpoint,
   method }`), relatif terhadap `API_BASE_URL`.
2. Resolusi URL lewat `generateServerUrl(key)` (`ServiceCommon.ts`) — base URL
   dari `process.env.API_BASE_URL` (RUNTIME).
3. Route handler meneruskan request + relay cookie HttpOnly session.
4. Token TIDAK pernah ada di browser. Browser hanya pegang cookie opaque
   (`shell_session`, HttpOnly) + `mfe_context` (non-HttpOnly, info display saja).

Proxy ke MFE: browser memanggil same-origin `/mfe-api/<app>/<path>`; route
`app/mfe-api/[app]/[...path]` meneruskan ke BFF MFE (`MFE_<APP>_BFF_URL`).
Gateway backend MFE: `app/api/gateway/[app]/[...path]` → `MFE_<APP>_BACKEND_URL`.

## Menambah menu / MFE baru

1. Tambah entry di `SHELL_MENUS` (`lib/menu.ts`), `kind: "mfe"`, `appKey` =
   scope MFE.
2. Tambah deskriptor di `app/api/config/route.ts` + env `MFE_<APPKEY>_*`
   (SCOPE/MODULE/URL/BACKEND_URL/BFF_URL) — SEMUA runtime.
3. Jalankan remote-nya. Tidak perlu ubah file route (route `[menu]` dinamis).
4. Sidebar otomatis menampilkan dari `SHELL_MENUS`.

Jangan buat menu `kind:"shell"` kecuali diminta eksplisit; default MFE.

## Memuat MFE (LazyMFE)

- `LazyMFE` memuat `remoteEntry.js` MFE, meng-`init` share scope kosong (shell
  bukan webpack host; MFE bawa React sendiri & root sendiri), lalu `mount(el)`.
- SEBELUM append script remoteEntry, shell mengisi `window.__MFE_RUNTIME__`
  (sharedUrl dari `/api/config`, shellUrl = origin) supaya promise remote shared
  di MFE membaca URL yang benar tepat waktu. Jangan hapus langkah ini.
- Error load MFE ditampilkan dengan pesan asli (untuk diagnosa deploy) +
  `clientLog` kategori `LOAD_MFE`.

## Env penting (semua RUNTIME)

`SERVER_PORT`, `AUTH_COOKIE_NAME`, `SESSION_TTL`, `COOKIE_SECURE` (false utk
HTTP), `API_BASE_URL`, `BACKEND_URL`, `LOG_LEVEL`, `REDIS_*`, `MFE_<APP>_*`,
`SHARED_URL`. Nama app di UI di-hardcode `"Portal MFE"` (bukan env).

## Log

Winston 9-bracket (lihat `00-system-architecture.md`). Sink browser:
`app/api/client-log/route.ts` menerima event dari shell & MFE, menulis dalam
format sama. Kategori: `FETCH_API | SHELL | LOAD_MFE | LOAD_SHARED`.
