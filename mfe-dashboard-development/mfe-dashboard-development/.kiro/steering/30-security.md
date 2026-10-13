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

## Token & sesi (jaga pola ini)

- Token backend HANYA ada di sisi server (BFF/shell) + Redis. Browser TIDAK
  pernah memegang token.
- Browser hanya pegang cookie sesi **opaque** (`shell_session`, `HttpOnly`) dan
  `mfe_context` (non-HttpOnly, isinya hanya info display, TANPA token).
- Cookie sesi wajib: `HttpOnly`, `SameSite` (minimal `Lax`), dan `Secure` saat
  dilayani lewat HTTPS (`COOKIE_SECURE=true`). HTTP dev boleh `Secure=false`.
- Redis dipakai read-only untuk resolve token; jangan menulis token ke tempat
  lain (log, response, localStorage).

## Jangan bocorkan informasi

- JANGAN pernah log nilai secret (password, token, header `Authorization`).
  Cukup nama key atau `[REDACTED]`.
- Response error ke browser TIDAK boleh memuat stack trace, path internal,
  query, atau detail backend. Detail lengkap hanya ke log server. (Lihat
  steering `40-error-handling.md`.)

## Jaringan & remote (Module Federation)

- CORS di prod pakai **allowlist origin** (shell + MFE), BUKAN `*`. Wildcard `*`
  hanya untuk dev. BFF MFE menurunkan allowlist dari `SHELL_GATEWAY_URL`.
- `remoteEntry.js` dimuat runtime lintas origin → prod WAJIB HTTPS supaya remote
  tidak bisa di-MITM / di-swap. Hindari HTTP di produksi.
- Validasi `app`/scope sebelum resolve backend/BFF (sudah: hanya key yang
  terdaftar di env yang diizinkan — cegah key palsu menjangkau host sembarang).

## Input & dependency

- Validasi/sanitasi input yang masuk ke query/fetch (hindari injection). Pakai
  parameterisasi, jangan string-concat untuk membangun request sensitif.
- Install dengan `pnpm install --frozen-lockfile`. Jalankan `pnpm audit` di CI.
  Supply-chain MFE rawan karena remote dimuat runtime — pin versi, hindari paket
  tak dikenal / typosquat.

## Guard commit

- Pastikan `.env`, `logs/`, `dist/` ter-gitignore di tiap repo. Jika `.env`
  sempat ter-track, lepas dengan `git rm --cached .env`.
- Pertimbangkan hook pre-commit / cek CI untuk menolak commit yang menambahkan
  `.env` atau nilai yang terlihat seperti secret.
