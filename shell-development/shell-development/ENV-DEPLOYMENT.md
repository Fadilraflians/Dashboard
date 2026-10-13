# Environment Variables: Build-time vs Runtime (Deployment)

Panduan deploy di OCP (build di CI/CD, secret di-attach saat RUNTIME pod).

## Konsep inti

- **BUILD-TIME** = dibaca saat `pnpm build` (webpack / Next build) dan "ter-cap"
  ke dalam bundle. Harus di-set saat BUILD (CI pipeline), bukan di secret OCP
  runtime — karena saat build di CI, secret OCP belum ada.
- **RUNTIME** = dibaca saat proses jalan (`node server.js` /
  `node src/api/index.mjs`). Dari secret OCP (envFrom di Deployment). Bisa
  diganti tanpa rebuild.

> **Status final: TIDAK ADA env build-time di seluruh sistem.**
> Semua nilai per-environment dibaca saat RUNTIME dari secret OCP. Nilai yang
> statis (nama container MF, nama scope, nama app) di-hardcode di kode. Jadi
> build di CI tanpa `.env` tetap menghasilkan bundle yang benar.

---

## rnd-template-shell (Next.js — custom server.js)

Next.js server membaca `process.env` saat RUNTIME. Satu-satunya yang akan
ter-inline saat build adalah `NEXT_PUBLIC_*` — dan kita **tidak memakainya**
(nama app di-hardcode `"Portal MFE"`). Jadi shell 100% runtime.

| Variabel | Fase | Catatan |
|---|---|---|
| `SERVER_PORT` | RUNTIME | Port server.js. |
| `AUTH_COOKIE_NAME` | RUNTIME | |
| `SESSION_TTL` | RUNTIME | |
| `COOKIE_SECURE` | RUNTIME | `false` utk HTTP, `true` utk HTTPS. |
| `API_BASE_URL` | RUNTIME | Backend KSEI (login/verify-otp). |
| `BACKEND_URL` | RUNTIME | Default backend gateway. |
| `LOG_LEVEL` | RUNTIME | |
| `REDIS_HOST/PORT/USERNAME/PASSWORD/KEY_PREFIX` | RUNTIME | Session store. |
| `MFE_DASHBOARDBOK_SCOPE/MODULE/URL/BACKEND_URL/BFF_URL` | RUNTIME | Dibaca `/api/config` + relay routes saat request. |
| `MFE_ROLEMGMT_SCOPE/MODULE/URL/BACKEND_URL/BFF_URL` | RUNTIME | sda. |
| `SHARED_URL` | RUNTIME | URL remoteEntry shared. Dibaca `/api/config`, diteruskan ke MFE via `mount(props)`. |

> `NEXT_PUBLIC_APP_NAME` SUDAH DIHAPUS → nama app di-hardcode di kode.

---

## rnd-template-mfe-a / rnd-template-mfe-b (webpack + Express BFF)

Webpack **tidak lagi** membaca env per-environment saat build. Nilai statis
di-hardcode; nilai per-env di-resolve saat RUNTIME di browser lewat global
`window.__MFE_RUNTIME__` (diisi BFF `/api/runtime-config` saat standalone, atau
oleh shell lewat `mount(props)` saat di dalam shell).

### BUILD-TIME
**Tidak ada.** Semua yang dulu build-time sudah dipindah:

| Dulu | Sekarang |
|---|---|
| `APP_KEY` | hardcode di webpack + `env.mjs` (`dashboardBok`/`roleMgmt`) |
| `SHARED_SCOPE` | hardcode di webpack (`sharedUi`) |
| `PUBLIC_PATH` | hardcode `publicPath: "auto"` (browser deteksi origin saat runtime) |
| `SHARED_URL` | RUNTIME via BFF `/api/runtime-config` + `window.__MFE_RUNTIME__` |
| `SHELL_URL`/`__SHELL_URL__` | RUNTIME via `window.__MFE_RUNTIME__` (DefinePlugin dibuang) |

### RUNTIME (secret OCP, dibaca BFF saat `start:api`)
| Variabel | Catatan |
|---|---|
| `API_PORT` | Port BFF. |
| `SHELL_GATEWAY_URL` | BFF forward ke gateway shell + allowlist CORS untuk remoteEntry. |
| `SHARED_URL` | Disajikan ke browser via `/api/runtime-config` (dan ke shell). Ganti tanpa rebuild. |
| `AUTH_COOKIE_NAME` | Baca cookie session. |
| `REDIS_HOST/PORT/USERNAME/PASSWORD/KEY_PREFIX` | Baca token (read-only). |

### DEV-ONLY (tidak dipakai di prod build)
`MFE_PORT`, `API_TARGET` — hanya webpack-dev-server (blok `devServer`,
diabaikan saat `pnpm build`).

---

## rnd-template-shared (webpack — UI remote)

### BUILD-TIME
**Tidak ada.** `SHARED_SCOPE` hardcode (`sharedUi`), `publicPath: "auto"`.

### DEV-ONLY
`SHARED_PORT` — hanya webpack-dev-server.

---

## Ringkas aksi untuk CI (GitLab)

**Build stage:** TIDAK perlu env apa pun untuk build. `pnpm install
--frozen-lockfile && pnpm build` menghasilkan bundle yang benar tanpa `.env`.

**Secret OCP runtime (Deployment envFrom):**

```yaml
# shell
SERVER_PORT, AUTH_COOKIE_NAME, SESSION_TTL, COOKIE_SECURE,
API_BASE_URL, BACKEND_URL, LOG_LEVEL,
REDIS_HOST, REDIS_PORT, REDIS_USERNAME, REDIS_PASSWORD, REDIS_KEY_PREFIX,
MFE_DASHBOARDBOK_SCOPE, MFE_DASHBOARDBOK_MODULE, MFE_DASHBOARDBOK_URL,
MFE_DASHBOARDBOK_BACKEND_URL, MFE_DASHBOARDBOK_BFF_URL,
MFE_ROLEMGMT_SCOPE, MFE_ROLEMGMT_MODULE, MFE_ROLEMGMT_URL,
MFE_ROLEMGMT_BACKEND_URL, MFE_ROLEMGMT_BFF_URL,
SHARED_URL

# mfe-a / mfe-b
API_PORT, SHELL_GATEWAY_URL, SHARED_URL, AUTH_COOKIE_NAME,
REDIS_HOST, REDIS_PORT, REDIS_USERNAME, REDIS_PASSWORD, REDIS_KEY_PREFIX
```

> Nilai statis (`dashboardBok`, `roleMgmt`, `sharedUi`, nama app) sudah di kode,
> tidak perlu di-set di mana pun.
