import { renderMetricCard } from '../metricCard.js';
import { evaluateDifferenceStatus, evaluateMetricStatus } from '../summary.js';

export function renderSagittalPrimaryMetrics(summary) {
  return `
    <h2>📊 主要指標</h2>
    <div class="report-metrics">
      ${renderMetricCard({ label: '左膝', available: summary.metricAvailability.leftKnee, value: `${summary.avgLeftKnee.toFixed(1)}°`, status: evaluateMetricStatus(summary.avgLeftKnee, summary.thresholds.leftKnee) })}
      ${renderMetricCard({ label: '右膝', available: summary.metricAvailability.rightKnee, value: `${summary.avgRightKnee.toFixed(1)}°`, status: evaluateMetricStatus(summary.avgRightKnee, summary.thresholds.rightKnee) })}
      ${renderMetricCard({ label: '骨盤傾斜', available: summary.metricAvailability.pelvis, value: `${summary.avgPelvis.toFixed(1)}°`, status: evaluateMetricStatus(summary.avgPelvis, summary.thresholds.pelvis) })}
      ${renderMetricCard({ label: '左右膝差', available: summary.metricAvailability.leftKnee && summary.metricAvailability.rightKnee, value: `${summary.kneeDiff.toFixed(1)}°`, status: evaluateDifferenceStatus(summary.kneeDiff, summary.thresholds.kneeDiff.threshold) })}
    </div>
  `;
}
