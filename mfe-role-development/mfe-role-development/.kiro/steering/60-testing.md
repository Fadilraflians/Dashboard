# Unit Testing (rnd-template-*)

Semua project pakai **Jest**. Tujuan: perilaku penting terkunci, regresi
tertangkap, dan coverage terbaca SonarQube. Disalin ke tiap repo; sinkronkan
jika berubah.

## Setup per project

- **rnd-template-shell** (Next.js): `next/jest` (otomatis mengurus transform TS,
  CSS-module, alias `@/*`, env). Config: `jest.config.mjs`, setup
  `jest.setup.ts` (import `@testing-library/jest-dom`). Environment `jsdom`.
- **rnd-template-mfe-a / mfe-b / shared** (webpack + ESM + TS): `ts-jest` preset
  `ts-jest/presets/default-esm` + `jsdom`. `moduleNameMapper` memetakan `@/*`,
  CSS → `identity-obj-proxy`, aset statis → `jest/fileMock.cjs`. Jalankan dengan
  `NODE_OPTIONS=--experimental-vm-modules` (sudah di script `test`).
  - MFE: `__APP_KEY__` (konstanta DefinePlugin build) di-set di `jest.setup.ts`
    via `globalThis.__APP_KEY__` supaya `getApiUrl` jalan di test.

## Perintah

- `pnpm test` — semua test (harus hijau).
- `pnpm test:watch` — mode watch saat ngoding.
- `pnpm test:coverage` — laporan + `coverage/lcov.info` (dibaca SonarQube).

> Catatan Windows/PowerShell: Jest menulis sebagian output ke stderr; PowerShell
> menampilkannya merah meski test LULUS. Patokan sebenarnya: exit code 0 dan
> ringkasan `Tests: N passed`.

## Konvensi menulis test

- File: `NamaFile.test.ts(x)` di sebelah file sumbernya.
- Struktur **AAA**: Arrange (siapkan) → Act (jalankan) → Assert (`expect`).
- Satu `it`/`test` = satu perilaku. Nama jelas dalam bahasa yang konsisten.
- **Deterministik**: tidak bergantung jaringan/remote/waktu nyata. MOCK `fetch`,
  Redis, modul eksternal. Untuk nilai env, stub `process.env` lalu kembalikan di
  `afterEach`.
- Komponen: pakai `@testing-library/react` (`render`, `screen`), uji dari sudut
  pandang user (teks/role), bukan detail implementasi.

## Apa yang diprioritaskan untuk dites

- Fungsi murni & logika: resolver URL (`getApiUrl`, `generateServerUrl`),
  registry menu (`getMenuBySlug`), util format, guard env.
- Komponen presentasional (shared cards) dengan berbagai props (loading, delta
  +/‑, nilai).
- Jalur error/fallback: pastikan kegagalan ditangani (mock gagal → fallback),
  sesuai `40-error-handling.md`.

## Contoh (pola)

```ts
import { getApiUrl } from "./index";

describe("getApiUrl", () => {
  it("membangun path same-origin /mfe-api/<APP_KEY>/<path>", () => {
    expect(getApiUrl("roleList")).toBe("/mfe-api/roleMgmt/roles/list");
  });
});
```

## CI / SonarQube

- Jalankan `pnpm test:coverage` di pipeline sebelum scan.
- Set `sonar.javascript.lcov.reportPaths=coverage/lcov.info`.
- Patuhi Quality Gate (coverage on new code ±80%). `coverage/` di-gitignore.
