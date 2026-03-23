import test from 'node:test';
import assert from 'node:assert/strict';

import { closeReportModal, openReportModal, setReportHtml } from '../src/ui/reportModal.js';

test('setReportHtml writes the same html into preview and modal content', () => {
  const preview = { innerHTML: '' };
  const content = { innerHTML: '' };

  setReportHtml({
    documentRef: {
      getElementById(id) {
        if (id === 'report-preview') return preview;
        if (id === 'report-content') return content;
        return null;
      }
    },
    reportHTML: '<div>report</div>'
  });

  assert.equal(preview.innerHTML, '<div>report</div>');
  assert.equal(content.innerHTML, '<div>report</div>');
});

test('openReportModal and closeReportModal toggle the modal show class', () => {
  const calls = [];
  const modal = {
    classList: {
      add(value) { calls.push(['add', value]); },
      remove(value) { calls.push(['remove', value]); }
    }
  };

  const documentRef = {
    getElementById(id) {
      assert.equal(id, 'report-modal');
      return modal;
    }
  };

  openReportModal({ documentRef });
  closeReportModal({ documentRef });

  assert.deepEqual(calls, [['add', 'show'], ['remove', 'show']]);
});
