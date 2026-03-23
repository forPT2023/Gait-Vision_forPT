export function renderStatusBadge(status) {
  const color = status.tone === 'good'
    ? '#10b981'
    : status.tone === 'warn'
      ? '#f59e0b'
      : '#ef4444';
  return `<span style="color: ${color};">${status.label}</span>`;
}

export function renderNotComputedBadge() {
  return '<span style="color: #64748b;">⚪ 未計算</span>';
}

export function renderMetricCard({ label, available, value, status }) {
  const displayValue = available ? value : '未計算';
  const displayBadge = available ? renderStatusBadge(status) : renderNotComputedBadge();
  return `
    <div class="report-metric-card">
      <div class="report-metric-label">${label}</div>
      <div class="report-metric-value">${displayValue}</div>
      <div class="report-metric-eval">${displayBadge}</div>
    </div>
  `;
}
