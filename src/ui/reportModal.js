const UNSAFE_TAG_NAMES = new Set([
  'script',
  'iframe',
  'object',
  'embed',
  'link',
  'meta',
  'base',
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'option',
  'frame',
  'frameset',
  'applet'
]);

const UNSAFE_URL_ATTRIBUTE_NAMES = new Set(['href', 'src', 'xlink:href', 'formaction']);

function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function stripUnsafeNodes(root) {
  const nodes = Array.from(root.querySelectorAll('*'));

  nodes.forEach((node) => {
    const tagName = node.tagName?.toLowerCase?.();
    if (tagName && UNSAFE_TAG_NAMES.has(tagName)) {
      node.remove();
      return;
    }

    Array.from(node.attributes || []).forEach((attr) => {
      const attributeName = attr.name.toLowerCase();
      const attributeValue = attr.value.trim();

      if (attributeName.startsWith('on')) {
        node.removeAttribute(attr.name);
        return;
      }

      if (attributeName === 'style' && /expression\s*\(|javascript\s*:/i.test(attributeValue)) {
        node.removeAttribute(attr.name);
        return;
      }

      if (UNSAFE_URL_ATTRIBUTE_NAMES.has(attributeName) && /^javascript\s*:/i.test(attributeValue)) {
        node.removeAttribute(attr.name);
      }
    });
  });
}

export function sanitizeReportHtml(reportHTML, { documentRef = globalThis.document } = {}) {
  if (typeof reportHTML !== 'string') return '';

  // Non-DOM environments cannot safely parse HTML. Degrade to escaped text output.
  if (!documentRef?.createElement) return escapeHtml(reportHTML);

  const template = documentRef.createElement('template');
  template.innerHTML = reportHTML;
  stripUnsafeNodes(template.content);
  return template.innerHTML;
}

export function setReportHtml({ documentRef = document, reportHTML }) {
  const preview = documentRef.getElementById('report-preview');
  const content = documentRef.getElementById('report-content');
  const sanitizedHtml = sanitizeReportHtml(reportHTML, { documentRef });

  if (preview) preview.innerHTML = sanitizedHtml;
  if (content) content.innerHTML = sanitizedHtml;
}

export function openReportModal({ documentRef = document }) {
  const modal = documentRef.getElementById('report-modal');
  modal?.classList.add('show');
}

export function closeReportModal({ documentRef = document }) {
  const modal = documentRef.getElementById('report-modal');
  modal?.classList.remove('show');
}
