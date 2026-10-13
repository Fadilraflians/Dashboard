# Keamanan (rnd-template-*)

Aturan keamanan WAJIB untuk semua project. Disalin ke tiap repo; sinkronkan
jika diubah.

## Secret & environment

- **Membaca `process.env` / `.env` itu AMAN dan benar.** Yang dilarang bukan
  "membaca env", tapi:
  - `.env` TIDAK boleh ter-commit (hanya `.env.example` tanpa nilai asli).
  - Nilai sensitif di produksi datang dari **OCP Secret** (`process.env`), bukan
    file `.env`. `.env` hanya untuk dev lokal.
  - `process.env` SELALU menang atas `.env` (jangan `dotenv override:true`).
- Pisahkan **Secret** vs **ConfigMap** di OCP:
  - Secret: `REDIS_PASSWORD`, token, kredensial apa pun.
  - ConfigMap: `*_URL`, `*_PORT`, `LOG_LEVEL`, `AUTH_COOKIE_NAME`, dll.
- JANGAN menaruh secret di `NEXT_PUBLIC_*`, webpack `DefinePlugin`, atau nilai
  apa pun yang masuk ke bundle browser. Apa pun di client bisa dibaca user.

## Catatan khusus shared

- `rnd-template-shared` TIDAK punya backend/BFF dan TIDAK boleh menyentuh token,
  cookie, atau secret. Komponennya presentasional murni. Kalaupun ada env, hanya
  non-secret (mis. `SHARED_PORT` dev).

## Token & sesi (berlaku untuk konsumen)

- Token backend HANYA ada di sisi server (BFF/shell) + Redis. Browser TIDAK
  pernah memegang token. Shared tidak boleh meminta/menyimpan token.
- Cookie sesi wajib: `HttpOnly`, `SameSite` (minimal `Lax`), dan `Secure` saat
  HTTPS.

## Jangan bocorkan informasi

- JANGAN pernah log nilai secret. Response error ke browser TIDAK boleh memuat
  stack trace / path internal. Detail hanya ke log server. (Lihat
  `40-error-handling.md`.)

## Jaringan & remote (Module Federation)

- CORS di prod pakai **allowlist origin** (shell + MFE), BUKAN `*`. Wildcard `*`
  hanya untuk dev. Shared di prod disajikan static (NGINX) dengan allowlist.
- `remoteEntry.js` dimuat runtime lintas origin → prod WAJIB HTTPS supaya remote
  tidak bisa di-MITM / di-swap.

## Dependency

- Install dengan `pnpm install --frozen-lockfile`. Jalankan `pnpm audit` di CI.
  Pin versi; hindari paket tak dikenal / typosquat.

## Guard commit

- Pastikan `.env`, `logs/`, `dist/` ter-gitignore. Jika `.env` sempat ter-track,
  lepas dengan `git rm --cached .env`.
