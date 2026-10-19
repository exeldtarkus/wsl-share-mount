import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { render } from '../panelHtml';

const share = { name: '<img src=x onerror=alert(1)>', share: '\\\\server\\share\\Ops&IT', mountPoint: '/mnt/a"b' };

test('render escapes user values and shows status + matching button', () => {
  const off = render([{ share, mounted: false }], 'csp');
  assert.ok(!off.includes('<img src=x'));
  assert.ok(off.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(off.includes('Ops&amp;IT'));
  assert.ok(off.includes('data-mp="/mnt/a&quot;b"'));
  assert.ok(off.includes('Disconnected') && off.includes('data-cmd="mount"') && !off.includes('data-cmd="unmount"'));

  const on = render([{ share, mounted: true }], 'csp');
  assert.ok(on.includes('Linked') && on.includes('data-cmd="unmount"') && !on.includes('data-cmd="mount"'));
  assert.ok(!on.includes('data-cmd="edit"') && on.includes('Unmount to edit or remove'));
  assert.ok(off.includes('data-cmd="edit"') && off.includes('data-cmd="remove"'));
});

test('render shows empty state with add button', () => {
  const html = render([], 'csp');
  assert.ok(html.includes('No shares yet') && html.includes('data-cmd="add"'));
});
