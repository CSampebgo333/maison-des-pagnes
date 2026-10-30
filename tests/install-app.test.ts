import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
test('Manifest launches the public home without admin or tracking credentials and supplies real PNG icons', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.id, '/');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.background_color, '#ffffff');
  for (const size of [192, 512]) assert.ok(manifest.icons.some((i: { sizes: string }) => i.sizes === `${size}x${size}`));
  for (const icon of manifest.icons) {
    const bytes = readFileSync(new URL('../public' + icon.src, import.meta.url));
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
    const [w, h] = icon.sizes.split('x').map(Number);
    assert.equal(bytes.readUInt32BE(16), w);
    assert.equal(bytes.readUInt32BE(20), h);
  }
});
