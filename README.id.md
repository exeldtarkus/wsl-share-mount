<p align="center"><img src="images/icon.png" width="96" alt="Logo WSL Share Mount"></p>

<h1 align="center">WSL Share Mount</h1>

<p align="center">Mount share SMB Windows ke WSL dari VS Code, dengan status mount tampil di status bar.</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=exeltarkus.wsl-share-mount">VS Code Marketplace</a> ·
  <a href="https://open-vsx.org/extension/exeltarkus/wsl-share-mount">Open VSX</a> ·
  <code>ext install exeltarkus.wsl-share-mount</code>
</p>

[English](README.md) | Bahasa Indonesia

## Screenshot

![Panel Share Manager dengan tiga share](images/screenshots/panel.png)

*Share Manager: tiap share menampilkan badge **Linked** / **Disconnected** dengan tombol **Mount** / **Unmount**. **Edit** dan **Remove** disembunyikan selama share ter-mount ("Unmount to edit or remove").*

![Panel Share Manager tanpa share](images/screenshots/panel-empty.png)

*Tampilan kosong sebelum ada share yang ditambahkan.*

## Instalasi

- **VS Code Marketplace**: [exeltarkus.wsl-share-mount](https://marketplace.visualstudio.com/items?itemName=exeltarkus.wsl-share-mount)
- **Open VSX** (VSCodium, dll.): [exeltarkus/wsl-share-mount](https://open-vsx.org/extension/exeltarkus/wsl-share-mount)
- **Quick Open** (`Ctrl+P`): `ext install exeltarkus.wsl-share-mount`
- **Dari file `.vsix`**: view Extensions → `...` → **Install from VSIX...**

Install di window WSL (extension berjalan di extension host WSL).

## Kebutuhan

- Extension hanya berjalan di **extension host WSL** (`extensionKind: workspace`). Buka folder lewat **`WSL: Connect to WSL`**. Di luar WSL (dideteksi lewat `/proc/version`) extension diam (idle).
- `sudo` di dalam WSL (dibutuhkan untuk `mount` / `umount`).
- Untuk share `auth: "credentials"`: `cifs-utils` (`sudo apt install cifs-utils`).

## Memulai

1. Klik **WSL Share** di status bar untuk membuka panel **Share Manager**, lalu klik **+ Add share**.
2. Isi form (Esc di langkah mana pun membatalkan tanpa menyimpan):
   1. **(1/4) Nama tampilan**, mis. `UAT`.
   2. **(2/4) Path share Windows (UNC)**, mis. `\\server\share\UAT`. Garis miring biasa seperti `//server/share/UAT` diterima dan dikonversi; garis miring di akhir dihapus.
   3. **(3/4) Mount point** di WSL. Default `/mnt/<nama>` (nama huruf kecil, karakter lain jadi `-`). Harus path absolut dan belum dipakai share lain.
   4. **(4/4) Login**: **Current Windows login** (`windows`) atau **Username + password** (`credentials`). Untuk yang kedua bisa diisi username seperti `CORP\user`; kosongkan agar ditanyakan setiap mount.
3. Klik **Mount** di baris share tersebut (dan **Unmount** nanti).

## Panel Share Manager

- Header: ringkasan `linked/total`, **Mount all** (tampil bila lebih dari satu share disconnected), **+ Add share**, dan **Refresh**.
- Tiap baris: badge **Linked** / **Disconnected**, nama, jenis login, mount point dan path UNC, plus tombol **Mount** atau **Unmount**.
- **Edit** / **Remove** hanya muncul selama share tidak ter-mount. Hapus meminta konfirmasi.
- Panel diperbarui otomatis setelah tiap aksi dan setiap kali status mount di-refresh.

## Fitur

- **Dua mode autentikasi**:
  - `windows` (default): `mount -t drvfs` dengan `uid`/`gid`/`metadata`, memakai login Windows yang sedang aktif. Tidak perlu password.
  - `credentials`: `mount -t cifs //server/share/...` dengan username dan password. Username diambil dari setting atau ditanyakan; password **selalu ditanyakan dan tidak pernah disimpan**. Password dikirim lewat file credentials sementara (`0600`) di `$XDG_RUNTIME_DIR` yang langsung dihapus setelah mount, sehingga tidak terlihat di `ps`. `DOMAIN\user` dipecah menjadi domain + username; `user@domain` dikirim apa adanya.
- **sudo hanya bila perlu**: mencoba `sudo -n` dulu dan hanya menanyakan password sudo bila memang dibutuhkan. Password dikirim lewat stdin dan tidak disimpan.
- **Ditanya sekali per batch**: saat me-mount beberapa share sekaligus (**Mount all** atau multi-select), password sudo dan password tiap share (per username) cukup ditanyakan sekali.
- **Aman untuk batch**: satu share gagal tidak menghentikan share lain. Membatalkan prompt password akan membatalkan sisa batch.
- **Cek folder tidak kosong**: me-mount ke folder yang tidak kosong meminta konfirmasi. Isi lokal hanya tertutup (tidak terhapus) selama share ter-mount.
- **Sambung ulang setelah WSL restart**: mount tidak permanen (tidak ditulis ke `/etc/fstab`), jadi `wsl --shutdown` memutus semuanya. Saat start berikutnya, share yang sebelumnya ter-mount dilaporkan disconnected dengan tombol **Mount again**.
- **Status bar**: `WSL Share: none`, `WSL Share: 0/N mounted`, nama share bila tepat satu yang ter-mount, atau `X/N mounted`. Hijau bila semua share ter-mount, kuning bila baru sebagian. Tooltip menampilkan tiap share sebagai MOUNTED / NOT MOUNTED (atau "No shares configured. Click to add one."). Klik untuk membuka Share Manager. Diperbarui saat setting berubah dan saat window kembali fokus (mis. setelah mount dari terminal).

## Command

| Command | Keterangan |
| --- | --- |
| `WSL Share Mount: Open Share Manager` | Buka panel Share Manager (sama dengan klik status bar) |
| `WSL Share Mount: Mount Share` | Mount share yang belum ter-mount (picker multi-select bila lebih dari satu) |
| `WSL Share Mount: Unmount Share` | Unmount share yang ter-mount (picker multi-select bila lebih dari satu) |
| `WSL Share Mount: Show Status` | `MOUNTED` / `NOT MOUNTED` per mount point, dengan sumber sebenarnya dari `findmnt` (membuka **Add Share** bila belum ada share) |
| `WSL Share Mount: Add Share` | Form langkah demi langkah untuk menambah share |
| `WSL Share Mount: Edit Share` | Pilih share lalu ubah lewat form yang sama (ditolak selama ter-mount: "Unmount it first") |
| `WSL Share Mount: Remove Share` | Pilih share lalu hapus setelah konfirmasi (ditolak selama ter-mount) |
| `WSL Share Mount: Open Settings (JSON)` | Opsional/lanjutan: buka `settings.json` di `wslShareMount.shares` |

## Setting

Share disimpan di `wslShareMount.shares` (scope machine). Form Add / Edit / Remove menulisnya ke setting **user** dan tidak mengubah entry lain (termasuk yang tidak valid). Setting ini berupa array berisi:

| Field | Wajib | Keterangan |
| --- | --- | --- |
| `name` | ya | Label yang tampil di panel dan picker |
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

- Password share yang salah tetap dipakai untuk sisa batch tersebut; jalankan ulang aksinya untuk mencoba lagi.
- Mount tidak bertahan setelah WSL restart (lihat **Sambung ulang setelah WSL restart**).
- Teks UI hanya dalam bahasa Inggris.

## Development

```bash
npm install
npm test              # compile + unit test (node --test)
npm run package       # build .vsix (vsce)
npm run install:local # build + install ke VS Code lokal (tambah -- --force untuk install ulang versi yang sama)
npm run screenshots   # buat ulang images/icon.png dan images/screenshots/*.png
```

Tekan `F5` di VS Code (**Run Extension**) untuk menjalankan Extension Development Host.

## Lisensi

MIT
