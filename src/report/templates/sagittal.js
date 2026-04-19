import { renderMetricCard } from '../metricCard.js';
import { evaluateDifferenceStatus, evaluateMetricStatus } from '../summary.js';

/**
 * ピーク値の評価バッジを返す（KneePeakTracker の出力用）
 * ピーク値が null（ストライド未確定）の場合は null を返す
 */
function renderPeakStatus(value, threshold) {
  if (value === null || value === undefined) return null;
  return evaluateMetricStatus(value, threshold);
}

/**
 * 矢状面レポートの主要指標セクションを描画する。
 *
 * 表示構成:
 *  1) 膝関節ピーク指標（遊脚期最大屈曲・立脚終期最小伸展）
 *     ← KneePeakTracker が有効（ストライド≥2）の場合のみ表示
 *  2) 膝関節平均指標（全フレーム平均・左右差）
 *     ← 常に表示（平均は比較の基準として残す）
 *  3) 骨盤傾斜 + 速度・ケイデンス参考値
 *  4) 正常範囲ガイドテーブル
 */
export function renderSagittalPrimaryMetrics(summary) {
  const kp = summary.kneePeaks;
  const hasPeaks = kp &&
    (kp.leftStrideCount >= 2 || kp.rightStrideCount >= 2);

  // ─── ① ピーク値セクション ─────────────────────────────────────────────────
  let peakSection = '';
  if (hasPeaks) {
    const thr = summary.thresholds;

    // 遊脚期最大屈曲ピーク（中央値）
    const leftSwing  = kp.leftSwingPeakMedian;
    const rightSwing = kp.rightSwingPeakMedian;
    const leftSwingAvail  = leftSwing  !== null;
    const rightSwingAvail = rightSwing !== null;
    const leftSwingStatus  = leftSwingAvail  ? renderPeakStatus(leftSwing,  thr.kneeSwingPeak) : null;
    const rightSwingStatus = rightSwingAvail ? renderPeakStatus(rightSwing, thr.kneeSwingPeak) : null;

    // 遊脚期ピーク左右差
    const swingPeakDiff = (leftSwingAvail && rightSwingAvail)
      ? Math.abs(leftSwing - rightSwing)
      : null;
    const swingDiffAvail = swingPeakDiff !== null;
    const swingDiffStatus = swingDiffAvail
      ? evaluateDifferenceStatus(swingPeakDiff, thr.kneeSwingPeakDiff?.threshold ?? 10)
      : null;

    // 立脚終期最大伸展ピーク（最小角度・中央値）
    const leftExt  = kp.leftStanceMinMedian;
    const rightExt = kp.rightStanceMinMedian;
    const leftExtAvail  = leftExt  !== null;
    const rightExtAvail = rightExt !== null;
    const leftExtStatus  = leftExtAvail  ? evaluateMetricStatus(leftExt,  thr.kneeStanceExt) : null;
    const rightExtStatus = rightExtAvail ? evaluateMetricStatus(rightExt, thr.kneeStanceExt) : null;

    peakSection = `
      <h2>🦵 膝関節ピーク角度
        <small style="font-size:0.75rem;color:#64748b;font-weight:normal;">
          ストライド中央値（左:${kp.leftStrideCount}歩・右:${kp.rightStrideCount}歩）
        </small>
      </h2>
      <div class="report-metrics">
        ${renderMetricCard({
          label: '遊脚期最大屈曲（左）',
          available: leftSwingAvail,
          value: `${leftSwing !== null ? leftSwing.toFixed(1) : '--'}°`,
          status: leftSwingStatus || { tone: 'warn', label: '⚪ 未計算' }
        })}
        ${renderMetricCard({
          label: '遊脚期最大屈曲（右）',
          available: rightSwingAvail,
          value: `${rightSwing !== null ? rightSwing.toFixed(1) : '--'}°`,
          status: rightSwingStatus || { tone: 'warn', label: '⚪ 未計算' }
        })}
        ${renderMetricCard({
          label: '遊脚ピーク左右差',
          available: swingDiffAvail,
          value: swingPeakDiff !== null ? `${swingPeakDiff.toFixed(1)}°` : '--',
          status: swingDiffStatus || { tone: 'warn', label: '⚪ 未計算' }
        })}
      </div>
      <div class="report-metrics">
        ${renderMetricCard({
          label: '立脚伸展最小（左）',
          available: leftExtAvail,
          value: `${leftExt !== null ? leftExt.toFixed(1) : '--'}°`,
          status: leftExtStatus || { tone: 'warn', label: '⚪ 未計算' }
        })}
        ${renderMetricCard({
          label: '立脚伸展最小（右）',
          available: rightExtAvail,
          value: `${rightExt !== null ? rightExt.toFixed(1) : '--'}°`,
          status: rightExtStatus || { tone: 'warn', label: '⚪ 未計算' }
        })}
      </div>
      <p style="font-size:0.72rem;color:#64748b;margin:0.25rem 0 0.75rem 0;">
        💡 <strong>遊脚期最大屈曲</strong>: 正常 55〜70°（50°未満は要注意）。低下は足趾クリアランス不足・蹴り出し弱化の指標。
        <strong>立脚最小伸展</strong>: 正常 5〜15°（20°超はCrouch歩行の可能性）。エネルギー効率低下・大腿四頭筋疲労増大。
        左右差が大きい場合は片側の代償・筋力非対称を示す。
        <em>※ピーク値はヒールストライク間のストライド単位で集計した中央値です。</em>
      </p>
    `;
  }

  // ─── ② 膝関節平均値セクション ──────────────────────────────────────────────
  const avgSection = `
    <h2>📊 膝関節平均角度
      <small style="font-size:0.75rem;color:#64748b;font-weight:normal;">※全歩行フレームの平均値（立脚・遊脚相が混在）</small>
    </h2>
    <div class="report-metrics">
      ${renderMetricCard({
        label: '平均角度（左）',
        available: summary.metricAvailability.leftKnee,
        value: `${summary.avgLeftKnee.toFixed(1)}°`,
        status: evaluateMetricStatus(summary.avgLeftKnee, summary.thresholds.leftKnee)
      })}
      ${renderMetricCard({
        label: '平均角度（右）',
        available: summary.metricAvailability.rightKnee,
        value: `${summary.avgRightKnee.toFixed(1)}°`,
        status: evaluateMetricStatus(summary.avgRightKnee, summary.thresholds.rightKnee)
      })}
      ${renderMetricCard({
        label: '平均左右差',
        available: summary.metricAvailability.leftKnee && summary.metricAvailability.rightKnee,
        value: `${summary.kneeDiff.toFixed(1)}°`,
        status: evaluateDifferenceStatus(summary.kneeDiff, summary.thresholds.kneeDiff.threshold)
      })}
    </div>
    <p style="font-size:0.72rem;color:#64748b;margin:0.25rem 0 0.75rem 0;">
      💡 平均角度は立脚・遊脚相を含む全フレームの平均のため、絶対値より<strong>左右差の比較</strong>および<strong>同一人物での経時変化</strong>に活用してください。
    </p>
  `;

  // ─── ③ 骨盤傾斜 + 速度・ケイデンス参考値 ──────────────────────────────────
  const pelvisAvail  = summary.metricAvailability.pelvis;
  const speedAvail   = summary.metricAvailability.speed;
  const cadAvail     = summary.metricAvailability.cadence;

  const pelvisStatus = evaluateMetricStatus(summary.avgPelvis, summary.thresholds.pelvis);
  const speedStatus  = evaluateMetricStatus(summary.avgSpeed,   summary.thresholds.speed);
  const cadStatus    = evaluateMetricStatus(summary.avgCadence, summary.thresholds.cadence);

  const subMetricsSection = `
    <h2>🔍 補助指標
      <small style="font-size:0.75rem;color:#64748b;font-weight:normal;">骨盤傾斜・速度・ケイデンス（矢状面撮影の参考値）</small>
    </h2>
    <div class="report-metrics">
      ${renderMetricCard({
        label: '骨盤傾斜',
        available: pelvisAvail,
        value: `${summary.avgPelvis.toFixed(1)}°`,
        status: pelvisStatus
      })}
      ${renderMetricCard({
        label: '歩行速度 ⚠参考',
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
    </div>
    <p style="font-size:0.72rem;color:#64748b;margin:0.25rem 0 0.75rem 0;">
      💡 <strong>骨盤傾斜</strong>: 矢状面での前後傾。10°超は過度な前傾（腰椎前弯増大）または後傾（歩行効率低下）のサインです。
      同一人物の変化で疼痛・疲労による代償的な骨盤前傾の増大を追跡できます。<br>
      ⚠️ <strong>歩行速度・ケイデンス</strong>は矢状面撮影では誤差が大きく、前額面撮影より信頼性が低い参考値です。
      ケイデンスは比較的信頼性が高く、経時変化の追跡に活用できます。
    </p>
  `;

  // ─── ④ 正常範囲ガイドテーブル ──────────────────────────────────────────────
  const guideTable = `
    <h2>📋 指標の正常範囲ガイド</h2>
    <table style="width:100%;border-collapse:collapse;font-size:0.71rem;color:#475569;margin:0 0 0.75rem 0;">
      <thead>
        <tr style="background:#f1f5f9;">
          <th style="padding:3px 6px;text-align:left;border:1px solid #e2e8f0;">指標</th>
          <th style="padding:3px 6px;text-align:center;border:1px solid #e2e8f0;">正常範囲</th>
          <th style="padding:3px 6px;text-align:left;border:1px solid #e2e8f0;">同一人物での変化が示すこと</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:3px 6px;border:1px solid #e2e8f0;white-space:nowrap;">遊脚期最大屈曲</td>
          <td style="padding:3px 6px;text-align:center;border:1px solid #e2e8f0;">55〜70°</td>
          <td style="padding:3px 6px;border:1px solid #e2e8f0;">増加→筋力/可動域改善。低下→クリアランス不足・転倒リスク上昇。</td>
        </tr>
        <tr style="background:#f8fafc;">
          <td style="padding:3px 6px;border:1px solid #e2e8f0;white-space:nowrap;">立脚最小伸展</td>
          <td style="padding:3px 6px;text-align:center;border:1px solid #e2e8f0;">5〜15°</td>
          <td style="padding:3px 6px;border:1px solid #e2e8f0;">減少→伸展改善（疼痛・痙縮軽減）。増加→Crouch 悪化（大腿四頭筋疲労増大）。</td>
        </tr>
        <tr>
          <td style="padding:3px 6px;border:1px solid #e2e8f0;white-space:nowrap;">膝角度左右差</td>
          <td style="padding:3px 6px;text-align:center;border:1px solid #e2e8f0;">〜10°</td>
          <td style="padding:3px 6px;border:1px solid #e2e8f0;">縮小→対称性改善（片側疼痛/筋力差の回復）。拡大→代償の増大。</td>
        </tr>
        <tr style="background:#f8fafc;">
          <td style="padding:3px 6px;border:1px solid #e2e8f0;white-space:nowrap;">骨盤傾斜</td>
          <td style="padding:3px 6px;text-align:center;border:1px solid #e2e8f0;">〜10°</td>
          <td style="padding:3px 6px;border:1px solid #e2e8f0;">減少→体幹・骨盤安定性改善。増加→腰椎代償・疼痛逃避パターンの可能性。</td>
        </tr>
        <tr>
          <td style="padding:3px 6px;border:1px solid #e2e8f0;white-space:nowrap;">ケイデンス</td>
          <td style="padding:3px 6px;text-align:center;border:1px solid #e2e8f0;">100〜130 spm</td>
          <td style="padding:3px 6px;border:1px solid #e2e8f0;">増加→全般的歩行機能改善・疼痛軽減。低下→疲労蓄積・機能低下のサイン。</td>
        </tr>
        <tr style="background:#f8fafc;">
          <td style="padding:3px 6px;border:1px solid #e2e8f0;white-space:nowrap;">股関節参考値</td>
          <td style="padding:3px 6px;text-align:center;border:1px solid #e2e8f0;">左右差 〜10°</td>
          <td style="padding:3px 6px;border:1px solid #e2e8f0;">⚠️ 「肩-股関節-膝」角度のため絶対値は参考のみ。<strong>左右差の変化</strong>で骨盤代償を追跡。</td>
        </tr>
      </tbody>
    </table>
  `;

  return peakSection + avgSection + subMetricsSection + guideTable;
}
