# WSL Share Mount

🇬🇧 [English](README.md) | 🇮🇩 Bahasa Indonesia

Extension VS Code untuk me-mount share SMB Windows ke WSL, dengan status mount tampil di status bar.

## Kebutuhan

- Extension hanya berjalan di **extension host WSL** (`extensionKind: workspace`). Buka folder lewat **`WSL: Connect to WSL`**. Di luar WSL (dideteksi lewat `/proc/version`) extension diam (idle).
- `sudo` di dalam WSL (dibutuhkan untuk `mount` / `umount`).
- Untuk share `auth: "credentials"`: `cifs-utils` (`sudo apt install cifs-utils`).

## Fitur

- **Dua mode autentikasi**:
  - `windows` (default): `mount -t drvfs` dengan `uid`/`gid`/`metadata`, memakai login Windows yang sedang aktif. Tidak perlu password.
  - `credentials`: `mount -t cifs //server/share/...` dengan username dan password. Username diambil dari setting atau ditanyakan; password **selalu ditanyakan dan tidak pernah disimpan**. Password dikirim lewat file credentials sementara (`0600`) di `$XDG_RUNTIME_DIR` yang langsung dihapus setelah mount, sehingga tidak terlihat di `ps`. `DOMAIN\user` dipecah menjadi domain + username; `user@domain` dikirim apa adanya.
- **sudo hanya bila perlu**: mencoba `sudo -n` dulu dan hanya menanyakan password sudo bila memang dibutuhkan. Password dikirim lewat stdin dan tidak disimpan.
- **Ditanya sekali per batch**: saat me-mount beberapa share sekaligus, password sudo dan password tiap share (per username) cukup ditanyakan sekali.
- **Aman untuk batch**: satu share gagal tidak menghentikan share lain. Membatalkan prompt password akan membatalkan sisa batch.
- **Cek folder tidak kosong**: me-mount ke folder yang tidak kosong meminta konfirmasi. Isi lokal hanya tertutup (tidak terhapus) selama share ter-mount.
- **Status bar**: menampilkan `ter-mount/total`; tooltip menampilkan tiap share dengan ● (ter-mount) atau ○ (tidak ter-mount). Klik untuk membuka menu. Diperbarui saat setting berubah dan saat window kembali fokus (mis. setelah mount dari terminal).

## Command

| Command | Keterangan |
| --- | --- |
| `WSL Share Mount: Mount / Unmount Share` | Menu semua share; multi-select, tiap share yang dipilih di-toggle |
| `WSL Share Mount: Mount Share` | Pilih share yang belum ter-mount lalu mount |
| `WSL Share Mount: Unmount Share` | Pilih share yang ter-mount lalu unmount (multi-select) |
| `WSL Share Mount: Show Status` | `MOUNTED` / `NOT MOUNTED` per mount point, dengan sumber sebenarnya dari `findmnt` |
| `WSL Share Mount: Open Settings` | Buka `settings.json` di `wslShareMount.shares` |

## Setting

`wslShareMount.shares` (scope machine) berupa array berisi:

| Field | Wajib | Keterangan |
| --- | --- | --- |
| `name` | ya | Label yang tampil di picker |
| `share` | ya | Path UNC, mis. `\\server\share\folder` (backslash ditulis dobel di JSON) |
| `mountPoint` | ya | Path WSL absolut, harus unik, mis. `/mnt/share` |
| `auth` | tidak | `"windows"` (default) atau `"credentials"` |
| `username` | tidak | Hanya untuk `auth: "credentials"`, mis. `DOMAIN\user`. Ditanyakan saat mount bila kosong |

Entry yang tidak valid dan `mountPoint` duplikat diabaikan, dengan peringatan di output channel **WSL Share Mount**.

Contoh:

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
