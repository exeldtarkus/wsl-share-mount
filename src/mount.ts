import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

export interface Share {
  name: string;
  share: string;
  mountPoint: string;
  /** windows = drvfs dengan login Windows aktif; credentials = cifs dengan username/password. */
  auth?: 'windows' | 'credentials';
  username?: string;
}

export interface Result {
  code: number;
  stdout: string;
  stderr: string;
}

export class Cancelled extends Error {}

/** Jalankan command tanpa shell; exit code != 0 di-resolve, hanya gagal spawn yang reject. */
export function run(cmd: string, args: string[], input?: string): Promise<Result> {
  return new Promise((resolve, reject) => {
    const child = execFile(cmd, args, (err, stdout, stderr) => {
      if (err && typeof err.code !== 'number') {
        return reject(err);
      }
      resolve({ code: err ? (err.code as number) : 0, stdout: stdout.trim(), stderr: stderr.trim() });
    });
    // Sengaja diabaikan: EPIPE muncul bila proses keluar/gagal spawn sebelum membaca stdin,
    // dan hasil sebenarnya (exit code / error spawn) tetap dilaporkan lewat callback di atas.
    child.stdin?.on('error', () => undefined);
    child.stdin?.end(input);
  });
}

export function isValidShare(s: Partial<Share>): s is Share {
  return !!s.name && /^\\\\[^\\]+\\/.test(s.share ?? '') && (s.mountPoint ?? '').startsWith('/');
}

export async function isMounted(mountPoint: string): Promise<boolean> {
  return (await run('mountpoint', ['-q', mountPoint])).code === 0;
}

export async function mountSource(mountPoint: string): Promise<string> {
  return (await run('findmnt', ['-no', 'SOURCE', mountPoint])).stdout;
}

export async function isNonEmptyDir(path: string): Promise<boolean> {
  try {
    return (await fs.readdir(path)).length > 0;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw e;
  }
}

export function mountArgs(s: Share, uid: number, gid: number, credentialsFile?: string): string[] {
  if (s.auth === 'credentials') {
    // cifs butuh //server/share/sub, bukan UNC Windows.
    const unc = s.share.replace(/\\/g, '/');
    return ['mount', '-t', 'cifs', unc, s.mountPoint, '-o', `credentials=${credentialsFile},uid=${uid},gid=${gid}`];
  }
  return ['mount', '-t', 'drvfs', s.share, s.mountPoint, '-o', `uid=${uid},gid=${gid},metadata`];
}

/** Isi credentials file mount.cifs; `DOMAIN\\user` dipecah jadi domain + username. */
export function credentialsContent(username: string, password: string): string {
  if (/[\r\n]/.test(username + password)) {
    throw new Error('Username/password must not contain line breaks');
  }
  const m = /^([^\\]+)\\(.+)$/.exec(username);
  return `${m ? `domain=${m[1]}\nusername=${m[2]}` : `username=${username}`}\npassword=${password}\n`;
}

/** Password lewat file 0600 (bukan argumen mount) supaya tidak terlihat di `ps`; file dihapus setelah dipakai. */
export async function withCredentialsFile<T>(content: string, fn: (path: string) => PromiseLike<T>): Promise<T> {
  const dir = await fs.mkdtemp(join(process.env.XDG_RUNTIME_DIR || tmpdir(), 'wsl-share-mount-'));
  try {
    const file = join(dir, 'credentials');
    await fs.writeFile(file, content, { mode: 0o600 });
    return await fn(file);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

/**
 * Jalankan beberapa command lewat sudo. Coba `sudo -n` dulu (NOPASSWD / ticket masih aktif);
 * password hanya diminta bila perlu, dikirim lewat stdin dan tidak disimpan.
 */
export async function sudo(commands: string[][], askPassword: () => Thenable<string | undefined>): Promise<void> {
  let password: string | undefined;
  const withPassword = (args: string[]) => run('sudo', ['-S', '-p', '', ...args], `${password}\n`);
  for (const args of commands) {
    let r = password === undefined ? await run('sudo', ['-n', ...args]) : await withPassword(args);
    if (password === undefined && r.code !== 0 && /password is required/i.test(r.stderr)) {
      password = await askPassword();
      if (password === undefined) {
        throw new Cancelled('sudo password not provided');
      }
      r = await withPassword(args);
    }
    if (r.code !== 0) {
      const hint = /helper program/.test(r.stderr) ? ' (install cifs-utils: sudo apt install cifs-utils)' : '';
      throw new Error((r.stderr || `sudo ${args.join(' ')} exited with code ${r.code}`) + hint);
    }
  }
}
