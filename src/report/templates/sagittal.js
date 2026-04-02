import { renderMetricCard } from '../metricCard.js';
import { evaluateDifferenceStatus, evaluateMetricStatus } from '../summary.js';

export function renderSagittalPrimaryMetrics(summary) {
  return `
    <h2>📊 主要指標 <small style="font-size:0.75rem;color:#64748b;font-weight:normal;">※全歩行フレームの平均値。立脚・遊脚相が混在しているため、ピーク角度は含まれません。</small></h2>
    <div class="report-metrics">
      ${renderMetricCard({ label: '膝関節角度（左）', available: summary.metricAvailability.leftKnee, value: `${summary.avgLeftKnee.toFixed(1)}°`, status: evaluateMetricStatus(summary.avgLeftKnee, summary.thresholds.leftKnee) })}
      ${renderMetricCard({ label: '膝関節角度（右）', available: summary.metricAvailability.rightKnee, value: `${summary.avgRightKnee.toFixed(1)}°`, status: evaluateMetricStatus(summary.avgRightKnee, summary.thresholds.rightKnee) })}
      ${renderMetricCard({ label: '膝角度左右差', available: summary.metricAvailability.leftKnee && summary.metricAvailability.rightKnee, value: `${summary.kneeDiff.toFixed(1)}°`, status: evaluateDifferenceStatus(summary.kneeDiff, summary.thresholds.kneeDiff.threshold) })}
    </div>
    <p style="font-size:0.72rem;color:#64748b;margin:0.25rem 0 0.75rem 0;">
      💡 膝関節の平均角度は歩行相全体の平均です。左右差（膝角度左右差）が大きい場合は、片側への代償や非対称な動作パターンの可能性があります。
    </p>
  `;
}
