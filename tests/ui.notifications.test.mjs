import test from 'node:test';
import assert from 'node:assert/strict';

import { showNotification } from '../src/ui/notifications.js';

test('showNotification appends a typed toast element to the document body', () => {
  const appended = [];
  const removed = [];
  const documentRef = {
    body: {
      appendChild(node) {
        appended.push(node);
      }
    },
    createElement(tag) {
      assert.equal(tag, 'div');
      return {
        className: '',
        textContent: '',
        remove() {
          removed.push(true);
        }
      };
    }
  };

  const originalSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (fn) => {
    fn();
    return 1;
  };

  try {
    const node = showNotification({
      documentRef,
      message: 'hello',
      type: 'success',
      durationMs: 10
    });

    assert.equal(appended.length, 1);
    assert.equal(node.className, 'notification success');
    assert.equal(node.textContent, 'hello');
    assert.equal(removed.length, 1);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
});
