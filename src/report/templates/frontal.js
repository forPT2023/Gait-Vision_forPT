import { renderMetricCard } from '../metricCard.js';
import { evaluateMetricStatus } from '../summary.js';

export function renderFrontalPrimaryMetrics(summary) {
  return `
    <h2>📊 主要指標</h2>
    <div class="report-metrics">
      ${renderMetricCard({ label: '歩行速度', available: summary.metricAvailability.speed, value: `${summary.avgSpeed.toFixed(2)} m/s`, status: evaluateMetricStatus(summary.avgSpeed, summary.thresholds.speed) })}
      ${renderMetricCard({ label: 'ケイデンス', available: summary.metricAvailability.cadence, value: `${summary.avgCadence.toFixed(0)} spm`, status: evaluateMetricStatus(summary.avgCadence, summary.thresholds.cadence) })}
      ${renderMetricCard({ label: '対称性', available: summary.metricAvailability.symmetry, value: `${summary.avgSymmetry.toFixed(1)} %`, status: evaluateMetricStatus(summary.avgSymmetry, summary.thresholds.symmetry) })}
      ${renderMetricCard({ label: '体幹傾斜', available: summary.metricAvailability.trunk, value: `${summary.avgTrunk.toFixed(1)}°`, status: evaluateMetricStatus(summary.avgTrunk, summary.thresholds.trunk) })}
    </div>
  `;
}
