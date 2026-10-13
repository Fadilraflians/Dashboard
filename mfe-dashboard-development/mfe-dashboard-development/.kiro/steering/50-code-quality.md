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
  komponen/renderer sebagai arrow inline di dalam render (mis. `body={(row) =>
  <Tag/>}`). Ekstrak ke fungsi di MODULE SCOPE lalu referensikan
  (`body={roleStatusBody}`). Mencegah re-create tiap render.
- **Variable shadowing.** Jangan menamai parameter/variabel sama dengan import
  atau variabel luar (mis. param `path` yang menutupi import `node:path`). Beri
  nama lain (`reqPath`).

## Prinsip umum

- **Zero warning build.** Build webpack/Next harus "compiled successfully"
  tanpa warning. Jika ada advisory ukuran asset vendor, atur `performance`
  budget yang realistis (bukan menyembunyikan masalah nyata).
- **Tidak ada `any` yang tidak perlu, tidak ada unused var/import.**
- **Tidak ada `console.log`** sisa debugging di kode produksi. Pakai logger /
  `clientLog` sesuai `00-system-architecture.md`.
- **Fungsi kecil & fokus.** Hindari duplikasi; ekstrak util bila berulang.
- **Nama jelas**, konsisten dengan konvensi file sekitarnya.
- **Komentar menjelaskan ALASAN (why), bukan menarasikan kode.**

## Unit test & coverage (WAJIB)

Setiap project pakai **Jest** untuk unit test. SonarQube membaca coverage, jadi
test bukan opsional — fitur/bugfix idealnya disertai test.

- **Framework**: Jest. Shell pakai `next/jest`; mfe-a/mfe-b/shared pakai
  `ts-jest` preset ESM + `jsdom`. (Detail setup di steering `60-testing.md`.)
- **Lokasi file**: `*.test.ts` / `*.test.tsx` di sebelah file yang dites.
- **Perintah**:
  - `pnpm test` — jalankan semua test (harus HIJAU).
  - `pnpm test:coverage` — hasilkan laporan + `coverage/lcov.info` untuk
    SonarQube.
- **Coverage**:
  - Target praktis: minimal **80%** untuk kode baru/yang diubah (sesuaikan
    dengan Quality Gate SonarQube; "coverage on new code" biasanya 80%).
  - `coverage/` WAJIB di-gitignore (jangan commit laporan).
  - Di CI: jalankan `pnpm test:coverage` lalu sertakan
    `sonar.javascript.lcov.reportPaths=coverage/lcov.info` saat scan SonarQube.
- **Yang dites**: utamakan fungsi murni & logika (format, resolver URL, menu,
  guard env) + render komponen presentasional dengan props. Untuk kode yang
  memanggil jaringan, MOCK `fetch`/dependensi — jangan hit backend sungguhan.
- **Jangan** menulis test yang bergantung pada backend/remote nyata; test harus
  deterministik dan cepat.

## Checklist sebelum selesai

- [ ] `pnpm build` exit 0 TANPA warning.
- [ ] `pnpm test` HIJAU; coverage kode baru memenuhi Quality Gate (±80%).
- [ ] BFF `.mjs` yang diubah: `node --check` lolos.
- [ ] Tidak menambah issue SonarQube baru (node: protocol, named function, no
      floating promise, no nested component, no shadowing).
- [ ] Tidak ada unused import/var, tidak ada `console.log` sisa.
- [ ] Error ditangani sesuai `40-error-handling.md`.
- [ ] `coverage/` ter-gitignore.
