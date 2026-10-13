# Sistem Micro-Frontend (rnd-template-*) — Arsitektur & Aturan Umum

Steering ini berlaku untuk SEMUA project `rnd-template-*`. Setiap project
menyimpan salinannya sendiri (tiap repo berdiri sendiri). Jika aturan di sini
diubah, sinkronkan ke keempat repo.

## Peta project

| Project | Peran | Teknologi | Port dev | MF scope |
|---|---|---|---|---|
| `rnd-template-shell` | Host / portal (login, landing, layout: header+sidebar+footer) | Next.js + custom server | 3000 | — (bukan MF host) |
| `rnd-template-mfe-a` | MFE "Dashboard" (isi 1 menu) | webpack MF remote + Express BFF | 3001 (BFF 3101) | `dashboardBok` |
| `rnd-template-mfe-b` | MFE "Role" (isi 1 menu) | webpack MF remote + Express BFF | 3002 (BFF 3102) | `roleMgmt` |
| `rnd-template-shared` | Remote UI bersama (card, theme) | webpack MF remote (static) | 9000 | `sharedUi` |

## Pembagian tanggung jawab

- **Shell** memiliki login, landing (daftar aplikasi), dan LAYOUT aplikasi
  (header, sidebar, footer). Shell TIDAK berisi konten bisnis per-menu.
- **MFE (a/b)** mengisi KONTEN satu menu di dalam body layout shell. Satu MFE =
  satu domain menu. Jangan menaruh header/sidebar/footer di MFE — itu milik shell.
- **Shared** hanya building block UI murni (komponen presentasional + token
  theme). TIDAK ada BFF/backend, TIDAK ada panggilan API di shared.

## Module Federation: cara remote dikenali

- `SHARED_URL` = ALAMAT download `remoteEntry.js` (per-environment, RUNTIME).
- Scope (`dashboardBok` / `roleMgmt` / `sharedUi`) = NAMA container global
  (`window[scope]`) setelah remoteEntry di-load. STATIS, HARDCODE di kode.
- Keduanya beda peran dan dua-duanya wajib. Scope di consumer HARUS identik
  dengan `name` di webpack project remote-nya.

## Aturan environment (WAJIB)

1. Build di CI berjalan TANPA `.env` / secret. Jadi:
   - Nilai STATIS (nama scope, nama app, APP_KEY) → HARDCODE di kode.
   - Nilai per-environment → RUNTIME (dibaca `process.env` saat proses jalan,
     dari secret OCP). JANGAN andalkan nilai per-env saat build.
2. `process.env` SELALU menang atas `.env`. Jangan pakai `dotenv` dengan
   `override: true`.
3. Jangan menambah env build-time baru. Kalau butuh nilai per-env di browser,
   alirkan lewat RUNTIME (BFF `/api/runtime-config` atau shell `/api/config` →
   `mount(props)` → `window.__MFE_RUNTIME__`). Lihat `runtimeConfig.ts` di MFE.
4. `publicPath` webpack = `"auto"` (jangan di-hardcode URL).
5. `.env` TIDAK boleh ter-commit (hanya `.env.example`). Folder `logs/` dan
   `dist/` di-gitignore.

## Format log standar (9-bracket) — WAJIB sama di semua project

Server (BFF/shell winston) menulis TEPAT 9 bracket:

```
[timestamp] [LEVEL] [user] [flow] [method] [service] [status] [message] [duration]
```

- `flow`: request | response | incoming | outgoing | internal-req |
  internal-res | transform | process. Boleh pakai simbol: `>>`=request,
  `<<`=response, `=>`=incoming, `<=`=outgoing, `--`=process, dst.
- `method`: POST|GET|PUT|DELETE|PATCH.
- `service`: nama service/endpoint logis (identifier).
- `status`: kode HTTP 3 digit.
- `duration`: `<angka>ms`.
- User di-tag inline di pesan: `@username` (terautentikasi) / `?username`
  (percobaan). Parser log otomatis mengangkatnya ke bracket `[user]`.

Contoh:
```
logger.info("[=>] [GET] [dashboardSummary] [200] berhasil @budi [142ms]");
```

Log sisi browser (MFE/shell) pakai helper `clientLog()` dengan kategori baku:
`FETCH_API | SHELL | LOAD_MFE | LOAD_SHARED`, lalu dikirim ke sink shell
`/api/client-log` dan ditulis dalam format 9-bracket yang sama. Logging harus
fire-and-forget — TIDAK boleh membuat app error jika gagal.

## Aturan membuat komponen di shared (PENTING)

Lihat steering `10-shared-components.md`. Ringkas: JANGAN langsung bikin
komponen baru di `rnd-template-shared`. Cek dulu apakah sudah ada & bisa
dipakai; promosikan ke shared hanya jika benar-benar dipakai >1 MFE.

## Verifikasi sebelum selesai

- `pnpm build` tiap project yang disentuh harus exit 0.
- BFF `.mjs` yang diubah: `node --check <file>`.
- Setelah ubah MF scope / remote: pastikan nama container ada di
  `dist/remoteEntry.js`.
