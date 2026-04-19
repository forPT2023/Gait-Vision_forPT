import { renderMetricCard } from '../metricCard.js';
import { evaluateMetricStatus } from '../summary.js';

export function renderFrontalPrimaryMetrics(summary) {
  const speedAvail  = summary.metricAvailability.speed;
  const cadAvail    = summary.metricAvailability.cadence;
  const symAvail    = summary.metricAvailability.symmetry;
  const trunkAvail  = summary.metricAvailability.trunk;

  const speedStatus   = evaluateMetricStatus(summary.avgSpeed,    summary.thresholds.speed);
  const cadStatus     = evaluateMetricStatus(summary.avgCadence,  summary.thresholds.cadence);
  const symStatus     = evaluateMetricStatus(summary.avgSymmetry, summary.thresholds.symmetry);
  const trunkStatus   = evaluateMetricStatus(summary.avgTrunk,    summary.thresholds.trunk);

  // 対称性は歩行イベント未検出のとき「参考値」注記を付ける
  const symNote = !symAvail
    ? '<span style="color:#f59e0b;font-size:0.70rem;">⚠ 歩行イベント未検出のため参考値</span>'
    : '';

  return `
    <h2>📊 主要指標</h2>
    <div class="report-metrics">
      ${renderMetricCard({
        label: '歩行速度',
        available: speedAvail,
        value: `${summary.avgSpeed.toFixed(2)} m/s`,
        status: speedStatus
      })}
      ${renderMetricCard({
        label: 'ケイデンス',
        available: cadAvail,
        value: `${summary.avgCadence.toFixed(0)} spm`,
        status: cadStatus
      })}
      ${renderMetricCard({
        label: '対称性',
        available: true,
        value: `${summary.avgSymmetry.toFixed(1)} %`,
        status: symAvail ? symStatus : { tone: 'warn', label: '🟡 参考値' }
      })}
      ${renderMetricCard({
        label: '体幹側方傾斜',
        available: trunkAvail,
        value: `${summary.avgTrunk.toFixed(1)}°`,
        status: trunkStatus
      })}
    </div>

    <!-- 正常範囲ガイド -->
    <table style="width:100%;border-collapse:collapse;font-size:0.72rem;color:#475569;margin:0.3rem 0 0.5rem 0;">
      <thead>
        <tr style="background:#f1f5f9;">
          <th style="padding:3px 6px;text-align:left;border:1px solid #e2e8f0;">指標</th>
          <th style="padding:3px 6px;text-align:center;border:1px solid #e2e8f0;">正常範囲</th>
          <th style="padding:3px 6px;text-align:left;border:1px solid #e2e8f0;">臨床的意義（同一人物での変化）</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:3px 6px;border:1px solid #e2e8f0;white-space:nowrap;">歩行速度</td>
          <td style="padding:3px 6px;text-align:center;border:1px solid #e2e8f0;">0.8〜1.4 m/s</td>
          <td style="padding:3px 6px;border:1px solid #e2e8f0;">低下は全身機能・疲労・疼痛を反映。推定値（股関節変位スケール）のため左右比較・経時変化に活用。</td>
        </tr>
        <tr style="background:#f8fafc;">
          <td style="padding:3px 6px;border:1px solid #e2e8f0;white-space:nowrap;">ケイデンス</td>
          <td style="padding:3px 6px;text-align:center;border:1px solid #e2e8f0;">100〜130 spm</td>
          <td style="padding:3px 6px;border:1px solid #e2e8f0;">最も信頼性が高い指標。低下は疲労・疼痛・神経学的問題を示唆。同一人物で増加すれば改善の客観的指標。</td>
        </tr>
        <tr>
          <td style="padding:3px 6px;border:1px solid #e2e8f0;white-space:nowrap;">対称性</td>
          <td style="padding:3px 6px;text-align:center;border:1px solid #e2e8f0;">90〜100 %</td>
          <td style="padding:3px 6px;border:1px solid #e2e8f0;">85%未満は病的非対称の目安。歩行イベント検出時のみ信頼度高。片麻痺・疼痛跛行の定量化に有用。</td>
        </tr>
        <tr style="background:#f8fafc;">
          <td style="padding:3px 6px;border:1px solid #e2e8f0;white-space:nowrap;">体幹側方傾斜</td>
          <td style="padding:3px 6px;text-align:center;border:1px solid #e2e8f0;">〜10°</td>
          <td style="padding:3px 6px;border:1px solid #e2e8f0;">中殿筋弱化・疼痛回避による Trendelenburg 様代償を反映。介入後に減少すれば筋力・疼痛改善の指標。</td>
        </tr>
      </tbody>
    </table>
    ${symNote ? `<p style="margin:0.2rem 0 0.5rem 0;">${symNote}</p>` : ''}
  `;
}
