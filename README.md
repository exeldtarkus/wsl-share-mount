# WSL Share Mount

🇬🇧 English | 🇮🇩 [Bahasa Indonesia](README.id.md)

A VS Code extension for mounting Windows SMB shares into WSL, with the mount state shown in the status bar.

## Requirements

- The extension runs in the **WSL extension host only** (`extensionKind: workspace`). Open your folder with **`WSL: Connect to WSL`**. Outside WSL (detected via `/proc/version`) it stays idle.
- `sudo` inside WSL (needed for `mount` / `umount`).
- For `auth: "credentials"` shares: `cifs-utils` (`sudo apt install cifs-utils`).

## Features

- **Two auth modes**:
  - `windows` (default): `mount -t drvfs` with `uid`/`gid`/`metadata`, using your current Windows login. No password needed.
  - `credentials`: `mount -t cifs //server/share/...` with a username and password. The username comes from the setting or is asked; the password is **always asked and never stored**. It is passed through a temporary `0600` credentials file in `$XDG_RUNTIME_DIR` that is deleted right after mounting, so it never shows up in `ps`. `DOMAIN\user` is split into domain + username; `user@domain` is passed as-is.
- **sudo only when needed**: tries `sudo -n` first and only asks for the sudo password if it is required. The password is sent via stdin and not stored.
- **Ask once per batch**: when mounting several shares at once, the sudo password and each share password (per username) are asked only once.
- **Batch-safe**: one share failing does not stop the others. Cancelling a password prompt cancels the rest of the batch.
- **Non-empty folder check**: mounting onto a non-empty folder asks for confirmation. The local contents are hidden (not deleted) while the share is mounted.
- **Status bar**: shows `mounted/total`; the tooltip lists each share with ● (mounted) or ○ (not mounted). Click it to open the menu. It refreshes when the settings change and when the window regains focus (e.g. after mounting from the terminal).

## Commands

| Command | Description |
| --- | --- |
| `WSL Share Mount: Mount / Unmount Share` | Menu with all shares; multi-select, each picked share is toggled |
| `WSL Share Mount: Mount Share` | Pick share(s) that are not mounted yet and mount them |
| `WSL Share Mount: Unmount Share` | Pick mounted share(s) and unmount them (multi-select) |
| `WSL Share Mount: Show Status` | `MOUNTED` / `NOT MOUNTED` per mount point, with the real source from `findmnt` |
| `WSL Share Mount: Open Settings` | Open `settings.json` at `wslShareMount.shares` |

## Settings

`wslShareMount.shares` (machine scope) is an array of:

| Field | Required | Description |
| --- | --- | --- |
| `name` | yes | Label shown in the picker |
| `share` | yes | UNC path, e.g. `\\server\share\folder` (backslashes doubled in JSON) |
| `mountPoint` | yes | Absolute WSL path, must be unique, e.g. `/mnt/share` |
| `auth` | no | `"windows"` (default) or `"credentials"` |
| `username` | no | Only for `auth: "credentials"`, e.g. `DOMAIN\user`. Asked on mount when empty |

Invalid entries and duplicate `mountPoint`s are ignored, with a warning in the **WSL Share Mount** output channel.

Example:

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
