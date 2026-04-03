import test from 'node:test';
import assert from 'node:assert/strict';

import {
  closeReportModal,
  openReportModal,
  sanitizeReportHtml,
  setReportHtml
} from '../src/ui/reportModal.js';

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

  assert.equal(preview.innerHTML, '&lt;div&gt;report&lt;/div&gt;');
  assert.equal(content.innerHTML, '&lt;div&gt;report&lt;/div&gt;');
});

test('setReportHtml escapes raw html payloads in non-DOM environments', () => {
  const preview = { innerHTML: '' };

  setReportHtml({
    documentRef: {
      getElementById(id) {
        if (id === 'report-preview') return preview;
        return null;
      }
    },
    reportHTML:
      '<div onclick="evil()">safe</div><script>alert(1)</script><a href="javascript:evil()">link</a>'
  });

  assert.equal(preview.innerHTML.includes('<script'), false);
  assert.equal(preview.innerHTML.includes('&lt;script&gt;'), true);
  assert.equal(preview.innerHTML.includes('onclick='), true);
});

test('sanitizeReportHtml returns an empty string for non-string input', () => {
  assert.equal(sanitizeReportHtml(null), '');
  assert.equal(sanitizeReportHtml(undefined), '');
  assert.equal(sanitizeReportHtml(123), '');
});



test('sanitizeReportHtml escapes content in non-DOM fallback mode', () => {
  const sanitized = sanitizeReportHtml('<a href=\"javascript:alert(1)\" onclick=\"evil()\">x</a>', {
    documentRef: null
  });

  assert.equal(sanitized, '&lt;a href=&quot;javascript:alert(1)&quot; onclick=&quot;evil()&quot;&gt;x&lt;/a&gt;');
});

test('sanitizeReportHtml escapes iframe markup in non-DOM fallback mode', () => {
  const sanitized = sanitizeReportHtml('<div>safe</div><iframe src=\"https://example.com\"></iframe>', {
    documentRef: null
  });

  assert.equal(sanitized, '&lt;div&gt;safe&lt;/div&gt;&lt;iframe src=&quot;https://example.com&quot;&gt;&lt;/iframe&gt;');
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
