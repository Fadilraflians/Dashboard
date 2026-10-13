# Penanganan Error (rnd-template-*)

Prinsip utama: **semua error WAJIB ter-handle. User TIDAK boleh melihat detail
teknis. Detail lengkap (stack, pesan asli, URL, status) HANYA ke log.**

## Aturan inti

1. **Jangan ada error yang tak tertangani.** Tiap pemanggilan async (fetch,
   import remote, parse) harus punya `try/catch` atau `.catch()`. UI harus punya
   error boundary.
2. **User lihat pesan ramah, bukan detail teknis.** Tampilkan pesan singkat atau
   fallback UI. JANGAN tampilkan stack trace, pesan exception mentah, path, atau
   detail backend ke user.
3. **Detail error → log.** Pesan asli, status, URL, konteks dikirim ke log
   (server winston 9-bracket, atau `clientLog()` dari browser).
4. **Degradasi anggun.** Kegagalan satu bagian tidak menjatuhkan seluruh halaman.
5. **Logging tidak boleh bikin error.** Fire-and-forget.

## Catatan khusus shared

- Komponen shared harus RENDER AMAN meski prop kurang/aneh: beri default,
  jangan `throw` saat prop tak lengkap. Konsumen yang menangani kegagalan LOAD
  shared (lihat di bawah), tapi komponen sendiri jangan jadi sumber crash.
- Jaga nama `exposes` stabil; mengganti nama = breaking change bagi konsumen.

## Pola di konsumen (MFE/shell) terhadap shared

- **Remote card (`remoteCard` + boundary)**: jika `sharedUi` down, card
  menampilkan fallback "komponen tidak tersedia", `clientLog` kategori
  `LOAD_SHARED` event `SHARED_CARD_FAIL`. Promise remote me-RESOLVE stub (tak
  pernah reject) → tak ada unhandled rejection. Hanya card itu yang fallback;
  sisanya tetap jalan.

## Pesan untuk user (contoh)

- Baik: "Komponen tidak tersedia." / "Gagal memuat data. Coba lagi."
- Buruk (JANGAN): menampilkan error mentah, URL internal, atau isi response.

## Checklist

- [ ] Komponen shared tidak throw karena prop kurang (ada default).
- [ ] User hanya melihat pesan ramah / fallback.
- [ ] Detail error dikirim ke log.
- [ ] Kegagalan terisolasi per komponen.
