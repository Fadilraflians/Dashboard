# Kualitas Kode (rnd-template-*)

Kode WAJIB lolos lint/analisis statis TANPA warning — termasuk aturan SonarQube.
Target: `pnpm build` bersih (0 warning/error) DAN tidak ada issue SonarQube baru.
Disalin ke tiap repo; sinkronkan jika diubah.

## Aturan SonarQube yang sering muncul (patuhi dari awal)

- **S7772 — gunakan protokol `node:`.** Import modul builtin Node dengan prefix
  `node:`. Contoh: `require("node:path")`, bukan `require("path")`.
- **S7726 — arrow function tidak boleh anonim di posisi yang butuh nama.**
  Hindari `module.exports = () => ({...})`. Pakai named function:
  `const buildConfig = function buildConfig() { return {...}; };
  module.exports = buildConfig;`
- **S9383 — jangan ada floating promise.** Setiap Promise harus di-`await`,
  diberi `.then/.catch`, atau sengaja di-void: `void doThing().catch(() => {})`.
  (Error tetap wajib ditangani — lihat `40-error-handling.md`.)
- **S6478 — jangan definisikan komponen di dalam komponen lain.** Jangan bikin
  komponen/renderer sebagai arrow inline di dalam render. Ekstrak ke fungsi di
  MODULE SCOPE lalu referensikan. Mencegah re-create tiap render.
- **Variable shadowing.** Jangan menamai parameter/variabel sama dengan import
  atau variabel luar. Beri nama lain.

## Prinsip umum

- **Zero warning build.** Build webpack harus "compiled successfully" tanpa
  warning. Jika ada advisory ukuran asset vendor, atur `performance` budget yang
  realistis (bukan menyembunyikan masalah nyata).
- **Tidak ada `any` yang tidak perlu, tidak ada unused var/import.**
- **Tidak ada `console.log`** sisa debugging di kode produksi.
- **Fungsi kecil & fokus.** Hindari duplikasi; ekstrak util bila berulang.
- **Nama jelas**, konsisten dengan konvensi file sekitarnya.
- **Komentar menjelaskan ALASAN (why), bukan menarasikan kode.**
- Komponen shared presentasional murni (lihat `20-shared.md` &
  `10-shared-components.md`).

## Unit test & coverage (WAJIB)

Project pakai **Jest** (`ts-jest` preset ESM + `jsdom`). SonarQube membaca
coverage, jadi test bukan opsional. (Detail setup di `60-testing.md`.)

- **Lokasi file**: `*.test.tsx` di sebelah komponennya.
- **Perintah**: `pnpm test` (harus HIJAU), `pnpm test:coverage` (hasilkan
  `coverage/lcov.info` untuk SonarQube).
- **Coverage**: target ±80% untuk kode baru (ikut Quality Gate). `coverage/`
  WAJIB di-gitignore. CI: `sonar.javascript.lcov.reportPaths=coverage/lcov.info`.
- **Yang dites**: render komponen presentasional dengan berbagai props (loading,
  delta +/‑, nilai) via `@testing-library/react`. Deterministik, tanpa jaringan.

## Checklist sebelum selesai

- [ ] `pnpm build` exit 0 TANPA warning.
- [ ] `pnpm test` HIJAU; coverage kode baru memenuhi Quality Gate (±80%).
- [ ] Tidak menambah issue SonarQube baru (node: protocol, named function, no
      floating promise, no nested component, no shadowing).
- [ ] Tidak ada unused import/var, tidak ada `console.log` sisa.
- [ ] Error ditangani sesuai `40-error-handling.md`.
- [ ] `coverage/` ter-gitignore.
