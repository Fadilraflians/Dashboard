# Penanganan Error (rnd-template-*)

Prinsip utama: **semua error WAJIB ter-handle. User TIDAK boleh melihat detail
teknis. Detail lengkap (stack, pesan asli, URL, status) HANYA ke log.**

## Aturan inti

1. **Jangan ada error yang tak tertangani.** Tiap pemanggilan async (fetch,
   import remote, parse) harus punya `try/catch` atau `.catch()`. UI harus punya
   error boundary.
2. **User lihat pesan ramah, bukan detail teknis.** Tampilkan pesan singkat yang
   bisa dimengerti (mis. "Gagal memuat data, coba lagi") atau fallback UI. JANGAN
   tampilkan stack trace, pesan exception mentah, nama file, path, atau detail
   backend ke user.
3. **Detail error → log.** Pesan asli, status, URL, dan konteks dikirim ke log
   (server winston 9-bracket, atau `clientLog()` dari browser). Log inilah
   tempat debugging, bukan layar user.
4. **Degradasi anggun.** Kegagalan satu bagian tidak menjatuhkan seluruh
   halaman. Komponen gagal → fallback lokal; sisanya tetap jalan.
5. **Logging tidak boleh bikin error.** `clientLog`/logger harus fire-and-forget;
   kalau sink log gagal, app tetap jalan.

## Pola yang sudah dipakai (ikuti ini)

- **Fetch (MFE `useApiService`)**: tangkap network error / status 404·501 →
  fallback ke mock (jika ada) atau set `error` state + log alasannya. Toast ke
  user hanya pesan ringkas (bukan detail), dan tidak untuk 401.
- **Remote card (`remoteCard` + boundary)**: jika `sharedUi` down, card
  menampilkan fallback "komponen tidak tersedia", `clientLog` kategori
  `LOAD_SHARED` event `SHARED_CARD_FAIL` dengan alasan teknis. Promise remote
  me-RESOLVE stub (tak pernah reject) → tak ada unhandled rejection.
- **Load MFE (`LazyMFE`)**: gagal load/mount → UI fallback ringkas untuk user +
  `clientLog` kategori `LOAD_MFE` dengan pesan error asli. (Catatan: komentar di
  kode menyebut menampilkan pesan asli untuk diagnosa deploy — untuk PRODUKSI,
  utamakan pesan ramah di UI dan simpan detail asli ke log; tampilkan detail di
  layar hanya di mode non-produksi bila perlu.)
- **BFF route**: bungkus handler; error → response generik (`{ success:false,
  message:"..." }`) + status sesuai, TANPA stack/detail internal. Log detail
  lengkap via winston.

## Error boundary

- Shell: `ErrorBoundary` membungkus area aplikasi.
- MFE: `MfeErrorBoundary` membungkus render MFE; crash komponen → fallback, tidak
  menjatuhkan shell.
- Setiap kartu remote dibungkus boundary per-item.

## Pesan untuk user (contoh)

- Baik: "Gagal memuat data. Silakan coba lagi." / "Komponen tidak tersedia."
- Buruk (JANGAN): menampilkan `TypeError: Cannot read properties of undefined`,
  URL internal, atau isi response backend.

## Checklist saat menambah fitur

- [ ] Semua async dibungkus try/catch atau `.catch()`.
- [ ] User hanya melihat pesan ramah / fallback.
- [ ] Detail error (asli) dikirim ke log dengan kategori yang tepat.
- [ ] Kegagalan terisolasi (tidak menjatuhkan halaman lain).
- [ ] Tidak ada `console.log` detail sensitif di produksi.
