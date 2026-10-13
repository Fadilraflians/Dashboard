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

## Perintah

- `pnpm test` — semua test (harus hijau).
- `pnpm test:watch` — mode watch saat ngoding.
- `pnpm test:coverage` — laporan + `coverage/lcov.info` (dibaca SonarQube).

> Catatan Windows/PowerShell: Jest menulis sebagian output ke stderr; PowerShell
> menampilkannya merah meski test LULUS. Patokan sebenarnya: exit code 0 dan
> ringkasan `Tests: N passed`.

## Konvensi menulis test

- File: `NamaFile.test.tsx` di sebelah komponennya.
- Struktur **AAA**: Arrange → Act → Assert.
- Satu `it` = satu perilaku. Deterministik, tanpa jaringan.
- Komponen: pakai `@testing-library/react` (`render`, `screen`), uji dari sudut
  pandang user (teks/role), bukan detail implementasi.

## Apa yang diprioritaskan (shared = komponen presentasional)

- Render tiap card dengan berbagai props: `value`, `delta` (positif/negatif/
  tidak ada), `loading`. Pastikan label, nilai terformat, dan indikator delta
  benar; saat loading nilai disembunyikan.

## Contoh (pola)

```tsx
import { render, screen } from "@testing-library/react";
import TotalPendapatanCard from "./TotalPendapatanCard";

it("menampilkan label dan nilai terformat", () => {
  render(<TotalPendapatanCard value={10000} />);
  expect(screen.getByText("Total Pendapatan")).toBeInTheDocument();
  expect(screen.getByText(/Rp.*10\.000/)).toBeInTheDocument();
});
```

## CI / SonarQube

- Jalankan `pnpm test:coverage` di pipeline sebelum scan.
- Set `sonar.javascript.lcov.reportPaths=coverage/lcov.info`.
- Patuhi Quality Gate (coverage on new code ±80%). `coverage/` di-gitignore.
