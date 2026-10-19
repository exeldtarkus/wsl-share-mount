# WSL Share Mount

🇬🇧 [English](README.md) | 🇮🇩 Bahasa Indonesia

Extension VS Code untuk me-mount share SMB Windows ke WSL, dengan status mount tampil di status bar.

## Kebutuhan

- Extension hanya berjalan di **extension host WSL** (`extensionKind: workspace`). Buka folder lewat **`WSL: Connect to WSL`**. Di luar WSL (dideteksi lewat `/proc/version`) extension diam (idle).
- `sudo` di dalam WSL (dibutuhkan untuk `mount` / `umount`).
- Untuk share `auth: "credentials"`: `cifs-utils` (`sudo apt install cifs-utils`).

## Memulai

1. Klik ikon server dengan `ter-mount/total` (mis. `0/0`) di status bar. Bila belum ada share yang dikonfigurasi, form **Add share** langsung terbuka.
2. Isi form (Esc di langkah mana pun membatalkan tanpa menyimpan):
   1. **(1/4) Nama tampilan**, mis. `UAT`.
   2. **(2/4) Path share Windows (UNC)**, mis. `\\server\share\UAT`. Garis miring biasa seperti `//server/share/UAT` diterima dan dikonversi; garis miring di akhir dihapus.
   3. **(3/4) Mount point** di WSL. Default `/mnt/<nama>` (nama huruf kecil, karakter lain jadi `-`). Harus path absolut dan belum dipakai share lain.
   4. **(4/4) Login**: **Current Windows login** (`windows`) atau **Username + password** (`credentials`). Untuk yang kedua bisa diisi username seperti `CORP\user`; kosongkan agar ditanyakan setiap mount.
3. Klik status bar lagi dan pilih share tersebut untuk me-mount (pilih lagi nanti untuk unmount).

Title bar menu punya tombol **Add share**, **Edit share**, **Remove share**, dan **Show status**. Aksi yang sama juga tersedia sebagai command (lihat di bawah). Edit atau hapus share ditolak selama share tersebut ter-mount ("Unmount it first"); hapus meminta konfirmasi.

## Fitur

- **Dua mode autentikasi**:
  - `windows` (default): `mount -t drvfs` dengan `uid`/`gid`/`metadata`, memakai login Windows yang sedang aktif. Tidak perlu password.
  - `credentials`: `mount -t cifs //server/share/...` dengan username dan password. Username diambil dari setting atau ditanyakan; password **selalu ditanyakan dan tidak pernah disimpan**. Password dikirim lewat file credentials sementara (`0600`) di `$XDG_RUNTIME_DIR` yang langsung dihapus setelah mount, sehingga tidak terlihat di `ps`. `DOMAIN\user` dipecah menjadi domain + username; `user@domain` dikirim apa adanya.
- **sudo hanya bila perlu**: mencoba `sudo -n` dulu dan hanya menanyakan password sudo bila memang dibutuhkan. Password dikirim lewat stdin dan tidak disimpan.
- **Ditanya sekali per batch**: saat me-mount beberapa share sekaligus, password sudo dan password tiap share (per username) cukup ditanyakan sekali.
- **Aman untuk batch**: satu share gagal tidak menghentikan share lain. Membatalkan prompt password akan membatalkan sisa batch.
- **Cek folder tidak kosong**: me-mount ke folder yang tidak kosong meminta konfirmasi. Isi lokal hanya tertutup (tidak terhapus) selama share ter-mount.
- **Status bar**: menampilkan `ter-mount/total`; tooltip menampilkan tiap share dengan ● (ter-mount) atau ○ (tidak ter-mount). Klik untuk membuka menu (atau form **Add share** bila belum ada share; tooltip-nya lalu berbunyi "No shares configured. Click to add one."). Diperbarui saat setting berubah dan saat window kembali fokus (mis. setelah mount dari terminal).

## Command

| Command | Keterangan |
| --- | --- |
| `WSL Share Mount: Mount / Unmount Share` | Menu semua share; multi-select, tiap share yang dipilih di-toggle |
| `WSL Share Mount: Mount Share` | Pilih share yang belum ter-mount lalu mount |
| `WSL Share Mount: Unmount Share` | Pilih share yang ter-mount lalu unmount (multi-select) |
| `WSL Share Mount: Show Status` | `MOUNTED` / `NOT MOUNTED` per mount point, dengan sumber sebenarnya dari `findmnt` (membuka **Add Share** bila belum ada share) |
| `WSL Share Mount: Add Share` | Form langkah demi langkah untuk menambah share |
| `WSL Share Mount: Edit Share` | Pilih share lalu ubah lewat form yang sama (ditolak selama ter-mount) |
| `WSL Share Mount: Remove Share` | Pilih share lalu hapus setelah konfirmasi (ditolak selama ter-mount) |
| `WSL Share Mount: Open Settings (JSON)` | Opsional/lanjutan: buka `settings.json` di `wslShareMount.shares` |

## Setting

Share disimpan di `wslShareMount.shares` (scope machine). Form Add / Edit / Remove menulisnya ke setting **user** dan tidak mengubah entry lain (termasuk yang tidak valid). Setting ini berupa array berisi:

| Field | Wajib | Keterangan |
| --- | --- | --- |
| `name` | ya | Label yang tampil di picker |
| `share` | ya | Path UNC, mis. `\\server\share\folder` (backslash ditulis dobel di JSON) |
| `mountPoint` | ya | Path WSL absolut, harus unik, mis. `/mnt/share` |
| `auth` | tidak | `"windows"` (default) atau `"credentials"` |
| `username` | tidak | Hanya untuk `auth: "credentials"`, mis. `DOMAIN\user`. Ditanyakan saat mount bila kosong |

Entry yang tidak valid dan `mountPoint` duplikat diabaikan, dengan peringatan di output channel **WSL Share Mount**.

### Lanjutan: edit JSON langsung

Setting tetap bisa diedit manual (**Open Settings (JSON)**). Contoh:

```json
"wslShareMount.shares": [
  { "name": "UAT", "share": "\\\\server\\share\\UAT", "mountPoint": "/mnt/uat" },
  {
    "name": "Reports",
    "share": "\\\\fileserver\\reports",
    "mountPoint": "/mnt/reports",
    "auth": "credentials",
    "username": "CORP\\user"
  }
]
```

## Batasan yang diketahui

- Password share yang salah tetap dipakai untuk sisa batch tersebut; jalankan ulang command untuk mencoba lagi.
- Tidak ada command "mount all" (pakai menu multi-select).
- Teks UI hanya dalam bahasa Inggris.

## Development

```bash
npm install
npm test              # compile + unit test (node --test)
npm run package       # build .vsix (vsce)
npm run install:local # build + install ke VS Code lokal (tambah -- --force untuk install ulang versi yang sama)
```

Tekan `F5` di VS Code (**Run Extension**) untuk menjalankan Extension Development Host.

## Lisensi

MIT
