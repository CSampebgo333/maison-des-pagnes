import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createInstallController, type InstallPromptEvent } from '../src/lib/install-app.ts';

test('Installation captures early events without suppressing browser UI, prompts once and hides after acceptance', async () => {
  const target = new EventTarget();
  const controller = createInstallController(target, () => false);
  let calls = 0;
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: async () => { calls++; }, userChoice: Promise.resolve({ outcome: 'accepted' as const }),
  }) as InstallPromptEvent;
  target.dispatchEvent(event);
  assert.equal(event.defaultPrevented, false);
  assert.equal(controller.getSnapshot().available, true);
  assert.equal(await controller.prompt(), true);
  assert.equal(await controller.prompt(), false);
  assert.equal(calls, 1);
  assert.equal(controller.getSnapshot().installed, true);
  controller.dispose();
});

test('Unsupported, dismissed and failed prompts remain usable; external installation and standalone hide the action', async () => {
  const target = new EventTarget();
  const controller = createInstallController(target, () => false);
  assert.equal(await controller.prompt(), false);
  target.dispatchEvent(Object.assign(new Event('beforeinstallprompt'), {
    prompt: async () => {}, userChoice: Promise.resolve({ outcome: 'dismissed' as const }),
  }));
  await controller.prompt();
  assert.deepEqual(controller.getSnapshot(), { available: false, installed: false });
  target.dispatchEvent(Object.assign(new Event('beforeinstallprompt'), {
    prompt: async () => { throw Error('Unavailable'); }, userChoice: Promise.resolve({ outcome: 'dismissed' as const }),
  }));
  assert.equal(await controller.prompt(), false);
  target.dispatchEvent(new Event('appinstalled'));
  assert.equal(controller.getSnapshot().installed, true);
  assert.equal(createInstallController(new EventTarget(), () => true).getSnapshot().installed, true);
  controller.dispose();
});

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
