import test from 'node:test';
import assert from 'node:assert/strict';

import { getInstallButtonState } from '../src/pwa/install.js';

test('getInstallButtonState hides the install button in standalone mode', () => {
  assert.deepEqual(
    getInstallButtonState({ isStandalone: true, isIOS: false, hasDeferredPrompt: true }),
    { visible: false, label: '📲 インストール' }
  );
});

test('getInstallButtonState shows install prompt button when browser prompt is available', () => {
  assert.deepEqual(
    getInstallButtonState({ isStandalone: false, isIOS: false, hasDeferredPrompt: true }),
    { visible: true, label: '📲 インストール' }
  );
});

test('getInstallButtonState shows iOS guidance label when prompt is unavailable', () => {
  assert.deepEqual(
    getInstallButtonState({ isStandalone: false, isIOS: true, hasDeferredPrompt: false }),
    { visible: true, label: '📱 追加方法' }
  );
});
