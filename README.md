# WSL Share Mount

🇬🇧 English | 🇮🇩 [Bahasa Indonesia](README.id.md)

A VS Code extension for mounting Windows SMB shares into WSL, with the mount state shown in the status bar.

## Requirements

- The extension runs in the **WSL extension host only** (`extensionKind: workspace`). Open your folder with **`WSL: Connect to WSL`**. Outside WSL (detected via `/proc/version`) it stays idle.
- `sudo` inside WSL (needed for `mount` / `umount`).
- For `auth: "credentials"` shares: `cifs-utils` (`sudo apt install cifs-utils`).

## Getting started

1. Click the server icon with `mounted/total` (e.g. `0/0`) in the status bar. With no shares configured yet, the **Add share** form opens directly.
2. Fill in the form (Esc at any step cancels without saving):
   1. **(1/4) Display name**, e.g. `UAT`.
   2. **(2/4) Windows share path (UNC)**, e.g. `\\server\share\UAT`. Forward slashes like `//server/share/UAT` are accepted and converted; a trailing slash is removed.
   3. **(3/4) Mount point** in WSL. Defaults to `/mnt/<name>` (name lowercased, other characters turned into `-`). Must be an absolute path not used by another share.
   4. **(4/4) Login**: **Current Windows login** (`windows`) or **Username + password** (`credentials`). For the latter you can enter a username such as `CORP\user`; leave it empty to be asked on every mount.
3. Click the status bar again and pick the share to mount it (pick it again later to unmount).

The menu's title bar has buttons to **Add share**, **Edit share**, **Remove share** and **Show status**. The same actions are available as commands (see below). Editing or removing a share is refused while it is mounted ("Unmount it first"); removing asks for confirmation.

## Features

- **Two auth modes**:
  - `windows` (default): `mount -t drvfs` with `uid`/`gid`/`metadata`, using your current Windows login. No password needed.
  - `credentials`: `mount -t cifs //server/share/...` with a username and password. The username comes from the setting or is asked; the password is **always asked and never stored**. It is passed through a temporary `0600` credentials file in `$XDG_RUNTIME_DIR` that is deleted right after mounting, so it never shows up in `ps`. `DOMAIN\user` is split into domain + username; `user@domain` is passed as-is.
- **sudo only when needed**: tries `sudo -n` first and only asks for the sudo password if it is required. The password is sent via stdin and not stored.
- **Ask once per batch**: when mounting several shares at once, the sudo password and each share password (per username) are asked only once.
- **Batch-safe**: one share failing does not stop the others. Cancelling a password prompt cancels the rest of the batch.
- **Non-empty folder check**: mounting onto a non-empty folder asks for confirmation. The local contents are hidden (not deleted) while the share is mounted.
- **Status bar**: shows `mounted/total`; the tooltip lists each share with ● (mounted) or ○ (not mounted). Click it to open the menu (or the **Add share** form when no shares are configured; the tooltip then says "No shares configured. Click to add one."). It refreshes when the settings change and when the window regains focus (e.g. after mounting from the terminal).

## Commands

| Command | Description |
| --- | --- |
| `WSL Share Mount: Mount / Unmount Share` | Menu with all shares; multi-select, each picked share is toggled |
| `WSL Share Mount: Mount Share` | Pick share(s) that are not mounted yet and mount them |
| `WSL Share Mount: Unmount Share` | Pick mounted share(s) and unmount them (multi-select) |
| `WSL Share Mount: Show Status` | `MOUNTED` / `NOT MOUNTED` per mount point, with the real source from `findmnt` (opens **Add Share** when no shares are configured) |
| `WSL Share Mount: Add Share` | Step-by-step form to add a share |
| `WSL Share Mount: Edit Share` | Pick a share and edit it in the same form (refused while mounted) |
| `WSL Share Mount: Remove Share` | Pick a share and remove it after confirmation (refused while mounted) |
| `WSL Share Mount: Open Settings (JSON)` | Optional/advanced: open `settings.json` at `wslShareMount.shares` |

## Settings

Shares are stored in `wslShareMount.shares` (machine scope). The Add / Edit / Remove forms write it to your **user** settings and leave any other entries untouched (even invalid ones). It is an array of:

| Field | Required | Description |
| --- | --- | --- |
| `name` | yes | Label shown in the picker |
| `share` | yes | UNC path, e.g. `\\server\share\folder` (backslashes doubled in JSON) |
| `mountPoint` | yes | Absolute WSL path, must be unique, e.g. `/mnt/share` |
| `auth` | no | `"windows"` (default) or `"credentials"` |
| `username` | no | Only for `auth: "credentials"`, e.g. `DOMAIN\user`. Asked on mount when empty |

Invalid entries and duplicate `mountPoint`s are ignored, with a warning in the **WSL Share Mount** output channel.

### Advanced: edit JSON directly

You can still edit the setting by hand (**Open Settings (JSON)**). Example:

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

## Known limitations

- A wrong share password is reused for the rest of that batch; run the command again to retry.
- There is no "mount all" command (use the multi-select menu).
- UI text is English only.

## Development

```bash
npm install
npm test              # compile + unit tests (node --test)
npm run package       # build the .vsix (vsce)
npm run install:local # build + install into your local VS Code (add -- --force to reinstall the same version)
```

Press `F5` in VS Code (**Run Extension**) to launch the Extension Development Host.

## License

MIT
