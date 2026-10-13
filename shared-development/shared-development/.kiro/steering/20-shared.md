# rnd-template-shared — Panduan Project (Remote UI Bersama)

Remote Module Federation (scope `sharedUi`) yang mengekspos komponen UI
presentasional + token theme. TIDAK ada BFF/backend/API di sini. Dev port 9000.

## Struktur folder (src/)

- `index.tsx` → `bootstrap.tsx` (galeri demo standalone; konsumen tidak
  menjalankan ini).
- `components/<NamaCard>/<NamaCard>.tsx` — komponen presentasional, satu folder
  per komponen. Saat ini: `TotalPendapatanCard`, `TransaksiCard`.
- `styles/theme.css` — token tema (light + dark) sebagai CSS variable.
- `types/` — tipe prop komponen.

## Prinsip (WAJIB)

- Presentasional MURNI: terima data lewat props, TIDAK fetch API, TIDAK tahu
  backend, TIDAK baca cookie/session. Nilai (mis. angka rupiah) diisi konsumen
  (MFE) dari API-nya, lalu dikirim sebagai prop.
- Self-contained: komponen bawa ikon/warna/format/label default sendiri.
- Styling via token CSS dari `theme.css`, bukan warna hardcode (agar seragam
  light/dark di semua konsumen).
- React singleton: react/react-dom di-`shared` singleton; konsumen menyediakan
  instance React yang sama. Jangan bundle React kedua.

## Sebelum menambah komponen baru

Ikuti steering `shared-components-policy` (`10-shared-components.md`). Ringkas:
komponen masuk shared HANYA jika dipakai (atau akan dipakai) >1 MFE dan
presentasional murni. Kalau cuma 1 MFE → biarkan di MFE itu. Cek dulu komponen
yang sudah ada sebelum bikin baru.

## Menambah komponen (jika lolos kriteria)

1. Buat `src/components/<NamaCard>/<NamaCard>.tsx`.
2. Tambah ke `exposes` di `webpack.config.cjs`:
   `"./<NamaCard>": "./src/components/<NamaCard>/<NamaCard>.tsx"`.
3. Beri tahu konsumen untuk menambah `declare module "sharedUi/<NamaCard>"` di
   `src/types/remotes.d.ts` masing-masing MFE.
4. `pnpm build` → pastikan `dist/remoteEntry.js` memuat scope `sharedUi`.
5. Redeploy shared. MFE TIDAK perlu rebuild (URL shared RUNTIME).

## Env

- STATIS hardcode: scope `sharedUi`, `publicPath: "auto"`. Tidak dibaca dari env.
- `SHARED_PORT` hanya dev (webpack devServer). Tidak dipakai di prod build.
- Prod: `dist/` disajikan sebagai static (NGINX / server static) dengan CORS
  mengizinkan origin shell + MFE, cache: `remoteEntry.js` `no-cache`, chunk
  ber-hash `immutable`.

## Ketahanan

Konsumen WAJIB menangani kasus shared DOWN (card fallback per-item), jadi
perubahan di shared tidak boleh mengasumsikan konsumen pasti berhasil memuat.
Jaga nama `exposes` stabil — mengganti nama = breaking change bagi konsumen.
