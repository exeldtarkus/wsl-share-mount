import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { credentialsContent, isNonEmptyDir, isValidShare, mountArgs, run, withCredentialsFile } from '../mount';

const share = { name: 'UAT', share: '\\\\intra.example\\share\\Ops&IT\\UAT', mountPoint: '/mnt/share' };

test('isValidShare', () => {
  assert.ok(isValidShare(share));
  assert.ok(!isValidShare({ ...share, name: '' }));
  assert.ok(!isValidShare({ ...share, share: 'C:\\share' }));
  assert.ok(!isValidShare({ ...share, share: '\\\\server' }));
  assert.ok(!isValidShare({ ...share, mountPoint: 'mnt/share' }));
});

test('mountArgs passes UNC path as a single argument', () => {
  assert.deepEqual(mountArgs(share, 1000, 1001), [
    'mount', '-t', 'drvfs', share.share, '/mnt/share', '-o', 'uid=1000,gid=1001,metadata',
  ]);
});

test('mountArgs uses cifs with //server/path for auth=credentials', () => {
  assert.deepEqual(mountArgs({ ...share, auth: 'credentials' }, 1000, 1001, '/run/user/1000/x/credentials'), [
    'mount', '-t', 'cifs', '//intra.example/share/Ops&IT/UAT', '/mnt/share',
    '-o', 'credentials=/run/user/1000/x/credentials,uid=1000,gid=1001',
  ]);
});

test('credentialsContent splits DOMAIN\\user and rejects line breaks', () => {
  assert.equal(credentialsContent('CORP\\budi', 'p@ss,w=rd'), 'domain=CORP\nusername=budi\npassword=p@ss,w=rd\n');
  assert.equal(credentialsContent('budi@corp.local', 'x'), 'username=budi@corp.local\npassword=x\n');
  assert.throws(() => credentialsContent('budi', 'a\nb'));
});

test('withCredentialsFile writes a 0600 file and always removes it', async () => {
  let seen = '';
  await withCredentialsFile('password=x\n', async (file) => {
    seen = file;
    assert.equal(statSync(file).mode & 0o777, 0o600);
    assert.equal(readFileSync(file, 'utf8'), 'password=x\n');
  });
  assert.ok(!existsSync(seen));
  await assert.rejects(withCredentialsFile('x', async (file) => { seen = file; throw new Error('boom'); }));
  assert.ok(!existsSync(seen));
});

test('isNonEmptyDir', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'wsm-'));
  assert.equal(await isNonEmptyDir(join(dir, 'missing')), false);
  assert.equal(await isNonEmptyDir(dir), false);
  writeFileSync(join(dir, 'f'), '');
  assert.equal(await isNonEmptyDir(dir), true);
});

test('run resolves exit codes and feeds stdin', async () => {
  assert.equal((await run('sh', ['-c', 'exit 3'])).code, 3);
  assert.equal((await run('cat', [], 'hello\n')).stdout, 'hello');
  await assert.rejects(run('no-such-binary-xyz', []));
});
