export function setReportHtml({ documentRef = document, reportHTML }) {
  const preview = documentRef.getElementById('report-preview');
  const content = documentRef.getElementById('report-content');

  if (preview) preview.innerHTML = reportHTML;
  if (content) content.innerHTML = reportHTML;
}

export function openReportModal({ documentRef = document }) {
  const modal = documentRef.getElementById('report-modal');
  modal?.classList.add('show');
}

export function closeReportModal({ documentRef = document }) {
  const modal = documentRef.getElementById('report-modal');
  modal?.classList.remove('show');
}
