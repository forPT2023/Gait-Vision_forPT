import test from 'node:test';
import assert from 'node:assert/strict';

import { applyViewportHeightVar, getViewportHeight } from '../src/ui/viewport.js';

test('getViewportHeight prefers visual viewport height', () => {
  assert.equal(getViewportHeight({
    windowRef: {
      visualViewport: { height: 612 },
      innerHeight: 700
    }
  }), 612);
});

test('applyViewportHeightVar writes CSS variable when height is available', () => {
  const calls = [];
  const viewportHeight = applyViewportHeightVar({
    documentRef: {
      documentElement: {
        style: {
          setProperty(name, value) {
            calls.push([name, value]);
          }
        }
      }
    },
    windowRef: {
      innerHeight: 844
    }
  });

  assert.equal(viewportHeight, 844);
  assert.deepEqual(calls, [['--app-height', '844px']]);
});
