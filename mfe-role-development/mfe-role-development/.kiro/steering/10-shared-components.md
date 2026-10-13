---
inclusion: auto
name: shared-components-policy
description: Aturan WAJIB sebelum membuat/menambah komponen UI di rnd-template-shared, dan sebelum sebuah MFE memakai atau membuat card/komponen baru. Pakai saat ada permintaan membuat card, komponen bersama, atau mengekspos sesuatu dari shared.
---

# Kebijakan Komponen Shared (rnd-template-shared)

`rnd-template-shared` adalah remote UI bersama (scope `sharedUi`) yang mengekspos
komponen presentasional murni + token theme. JANGAN asal menaruh komponen di
sini.

## Alur WAJIB sebelum membuat komponen baru

1. **CEK DULU di shared.** Lihat `rnd-template-shared/src/components/` dan daftar
   `exposes` di `rnd-template-shared/webpack.config.cjs`. Apakah sudah ada
   komponen yang cocok atau mirip?
2. **Bisa dipakai ulang?** Jika sudah ada komponen yang bisa memenuhi kebutuhan
   (mungkin dengan menambah prop opsional), PAKAI/EKSTEND yang ada — jangan buat
   duplikat.
3. **Baru dipakai di SATU MFE?** Jika komponen hanya relevan untuk satu MFE,
   BUAT DI MFE ITU (mis. `rnd-template-mfe-b/src/...`), BUKAN di shared. Shared
   hanya untuk yang benar-benar dipakai lintas MFE (>1 konsumen) atau memang
   dirancang sebagai design-system.
4. **Promosi ke shared** hanya jika: dipakai (atau akan dipakai) oleh >1 MFE,
   presentasional murni (tanpa fetch API / logika bisnis), dan API prop-nya
   stabil.

Jika ragu antara MFE vs shared, DEFAULT ke MFE dulu. Promosikan belakangan saat
kebutuhan lintas-MFE sudah nyata.

## Prinsip komponen shared

- **Presentasional murni.** Terima data lewat props. TIDAK memanggil API, TIDAK
  tahu backend, TIDAK membaca cookie/session. Nilai (mis. "cash in 10jt") diambil
  MFE lewat API-nya, lalu dikirim ke komponen shared sebagai prop.
- **Self-contained.** Bawa sendiri ikon, warna, format, label default.
- **React singleton.** react/react-dom di-`shared` sebagai singleton; konsumen
  (MFE) menyediakan instance React yang sama. Jangan bundle React kedua.
- **Tema via token.** Styling pakai CSS variable dari `./theme.css` (light+dark),
  bukan warna hardcode, supaya seragam di semua konsumen.

## Cara menambah komponen baru ke shared (jika memang lolos kriteria di atas)

1. Buat folder `src/components/<NamaCard>/<NamaCard>.tsx` (presentasional).
2. Tambah ke `exposes` di `webpack.config.cjs`:
   `"./<NamaCard>": "./src/components/<NamaCard>/<NamaCard>.tsx"`.
3. Tambah deklarasi tipe ambient di konsumen (`src/types/remotes.d.ts`):
   `declare module "sharedUi/<NamaCard>" { ... }`.
4. Pakai di MFE lewat loader yang TOLERAN GAGAL (lihat di bawah).
5. `pnpm build` shared → pastikan `dist/remoteEntry.js` memuat scope `sharedUi`.
6. Shared di-redeploy; MFE TIDAK perlu rebuild (URL shared RUNTIME).

## Ketahanan: shared boleh mati tanpa menjatuhkan halaman

Setiap card remote WAJIB diisolasi: jika `sharedUi` DOWN, hanya card itu yang
menampilkan fallback "komponen tidak tersedia" — card lain, chart, tabel tetap
jalan. Pola yang dipakai:

- Remote `sharedUi` di webpack MFE memakai promise-based remote yang me-RESOLVE
  stub (bukan reject) saat remote gagal, sehingga `import("sharedUi/X")` tak
  pernah melempar unhandled rejection.
- `remoteCard()` di MFE memeriksa hasil: kalau default bukan function (sentinel
  `__unavailable__`), tampilkan fallback card dan `clientLog` kategori
  `LOAD_SHARED` event `SHARED_CARD_FAIL`.
- Bungkus tiap card dengan boundary per-card (mis. `RemoteCardBoundary`).

JANGAN menghapus card lain saat shared mati. JANGAN mengganti kegagalan shared
menjadi error yang menjatuhkan seluruh halaman.
