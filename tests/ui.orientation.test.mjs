import test from 'node:test';
import assert from 'node:assert/strict';

import { getOrientationWarningState, updateOrientationWarning } from '../src/ui/orientation.js';

test('getOrientationWarningState hides warning when not mobile or app is hidden', () => {
  assert.deepEqual(
    getOrientationWarningState({ currentPlane: 'frontal', isPortrait: false, isMobile: false, isMainAppVisible: true }),
    { visible: false, message: '' }
  );
  assert.deepEqual(
    getOrientationWarningState({ currentPlane: 'frontal', isPortrait: false, isMobile: true, isMainAppVisible: false }),
    { visible: false, message: '' }
  );
});

test('getOrientationWarningState returns plane-specific messages', () => {
  assert.deepEqual(
    getOrientationWarningState({ currentPlane: 'frontal', isPortrait: false, isMobile: true, isMainAppVisible: true }),
    { visible: true, message: '前額面分析には縦向き（ポートレート）が推奨されます' }
  );
  assert.deepEqual(
    getOrientationWarningState({ currentPlane: 'sagittal', isPortrait: true, isMobile: true, isMainAppVisible: true }),
    { visible: true, message: '矢状面分析には横向き（ランドスケープ）が推奨されます' }
  );
});

test('updateOrientationWarning updates the DOM classes and message', () => {
  const warningEl = {
    classList: {
      added: [],
      removed: [],
      add(value) { this.added.push(value); },
      remove(value) { this.removed.push(value); }
    }
  };
  const messageEl = { textContent: '' };
  const mainApp = {
    classList: {
      contains() {
        return false;
      }
    }
  };

  const state = updateOrientationWarning({
    documentRef: {
      getElementById(id) {
        if (id === 'orientation-warning') return warningEl;
        if (id === 'orientation-message') return messageEl;
        if (id === 'main-app') return mainApp;
        return null;
      }
    },
    windowRef: {
      matchMedia() {
        return { matches: false };
      }
    },
    currentPlane: 'frontal',
    isMobile: true
  });

  assert.equal(state.visible, true);
  assert.equal(messageEl.textContent, '前額面分析には縦向き（ポートレート）が推奨されます');
  assert.deepEqual(warningEl.classList.added, ['show']);
});
