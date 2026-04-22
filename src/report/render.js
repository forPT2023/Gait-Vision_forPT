import { renderNotComputedBadge, renderStatusBadge } from './metricCard.js';
import { evaluateDifferenceStatus } from './summary.js';
import { renderFrontalPrimaryMetrics } from './templates/frontal.js';
import { renderSagittalPrimaryMetrics } from './templates/sagittal.js';

function renderMetricValueCell(value, available) {
  return available ? value.toFixed(1) : '未計算';
}

function renderPrimaryMetrics(summary) {
  return summary.reportPlane === 'frontal'
    ? renderFrontalPrimaryMetrics(summary)
    : renderSagittalPrimaryMetrics(summary);
}

function renderDetailRows(summary) {
  const kneeBadge = summary.metricAvailability.leftKnee && summary.metricAvailability.rightKnee
    ? renderStatusBadge(evaluateDifferenceStatus(summary.kneeDiff, summary.thresholds.kneeDiff?.threshold ?? 10))
    : renderNotComputedBadge();
  const hipBadge = summary.metricAvailability.leftHip && summary.metricAvailability.rightHip
    ? renderStatusBadge(evaluateDifferenceStatus(summary.hipDiff, summary.thresholds.hipDiff?.threshold ?? 10))
    : renderNotComputedBadge();
  const ankleBadge = summary.metricAvailability.leftAnkle && summary.metricAvailability.rightAnkle
    ? renderStatusBadge(evaluateDifferenceStatus(summary.ankleDiff, summary.thresholds.ankleDiff?.threshold ?? 5))
    : renderNotComputedBadge();

  return `
    <tr>
      <td>膝関節</td>
      <td>${renderMetricValueCell(summary.avgLeftKnee, summary.metricAvailability.leftKnee)}</td>
      <td>${renderMetricValueCell(summary.avgRightKnee, summary.metricAvailability.rightKnee)}</td>
      <td>${kneeBadge}</td>
    </tr>
    <tr>
      <td>股関節</td>
      <td>${renderMetricValueCell(summary.avgLeftHip, summary.metricAvailability.leftHip)}</td>
      <td>${renderMetricValueCell(summary.avgRightHip, summary.metricAvailability.rightHip)}</td>
      <td>${hipBadge}</td>
    </tr>
    <tr>
      <td>足首</td>
      <td>${renderMetricValueCell(summary.avgLeftAnkle, summary.metricAvailability.leftAnkle)}</td>
      <td>${renderMetricValueCell(summary.avgRightAnkle, summary.metricAvailability.rightAnkle)}</td>
      <td>${ankleBadge}</td>
    </tr>
  `;
}

export { renderStatusBadge } from './metricCard.js';

export function buildPdfImageLayout({
  canvasWidth,
  canvasHeight,
  pageWidth,
  pageHeight,
  margin = 10
}) {
  const numericValues = { canvasWidth, canvasHeight, pageWidth, pageHeight, margin };
  for (const [key, value] of Object.entries(numericValues)) {
    if (!Number.isFinite(value)) {
      throw new Error(`Invalid PDF layout input: ${key} must be a finite number.`);
    }
  }

  if (canvasWidth <= 0 || canvasHeight <= 0) {
    throw new Error('Invalid PDF layout input: canvas dimensions must be greater than zero.');
  }
  if (pageWidth <= 0 || pageHeight <= 0) {
    throw new Error('Invalid PDF layout input: page dimensions must be greater than zero.');
  }
  if (margin < 0) {
    throw new Error('Invalid PDF layout input: margin must be zero or greater.');
  }

  const imgWidth = pageWidth - (margin * 2);
  const printableHeight = pageHeight - (margin * 2);
  if (imgWidth <= 0 || printableHeight <= 0) {
    throw new Error('Invalid PDF layout input: margins leave no printable area.');
  }

  const imgHeight = (canvasHeight * imgWidth) / canvasWidth;
  const pages = [];

  let remainingHeight = imgHeight;
  let sourceOffset = 0;
  while (remainingHeight > 0) {
    pages.push({
      x: margin,
      y: margin - sourceOffset,
      width: imgWidth,
      height: imgHeight
    });
    remainingHeight -= printableHeight;
    sourceOffset += printableHeight;
  }

  return {
    imgWidth,
    imgHeight,
    printableHeight,
    pages
  };
}

export function applyPdfImageLayout({ pdf, imgData, layout, format = 'PNG' }) {
  layout.pages.forEach((page, index) => {
    if (index > 0) {
      pdf.addPage();
    }
    pdf.addImage(imgData, format, page.x, page.y, page.width, page.height);
  });
}

export function buildReportHtml(summary) {
  return `
    <div class="report-compact">
      <div class="report-info-grid">
        <div class="report-info-item">
          <div class="report-info-label">対象者ID</div>
          <div class="report-info-value">${summary.patientId}</div>
        </div>
        <div class="report-info-item">
          <div class="report-info-label">セッションID</div>
          <div class="report-info-value">${summary.sessionId}</div>
        </div>
        <div class="report-info-item">
          <div class="report-info-label">分析平面</div>
          <div class="report-info-value">${summary.reportPlane === 'frontal' ? '前額面' : '矢状面'}</div>
        </div>
        <div class="report-info-item">
          <div class="report-info-label">分析日時</div>
          <div class="report-info-value">${summary.sessionDateLabel}</div>
        </div>
        <div class="report-info-item">
          <div class="report-info-label">取得モード</div>
          <div class="report-info-value">${summary.captureMode === 'video' ? '動画ファイル' : 'カメラ'}</div>
        </div>
        <div class="report-info-item">
          <div class="report-info-label">レポート版</div>
          <div class="report-info-value">${summary.appVersion}</div>
        </div>
      </div>

      <div class="report-comments" style="margin-top: 0.75rem; background: #eff6ff; border-left-color: #2563eb; color: #1e3a8a;">
        📋 解析品質: ${summary.qualitySummary}
      </div>

      ${renderPrimaryMetrics(summary)}

      ${summary.reportPlane === 'sagittal' ? `
      <h2>📊 関節角度グラフ</h2>
      <div class="report-charts-row">
        <div class="report-chart-box">
          <canvas id="report-knee-chart" class="report-chart-mini"></canvas>
        </div>
        <div class="report-chart-box">
          <canvas id="report-hip-chart" class="report-chart-mini"></canvas>
        </div>
      </div>
      ` : ''}

      <h2>📈 時系列推移 <small style="font-size:0.72rem;color:#64748b;font-weight:normal;">${summary.reportPlane === 'sagittal' ? '※ 矢状面での歩行速度・対称性は参考値。信頼性は前額面より低い' : ''}</small></h2>
      <div class="report-chart-box">
        <canvas id="report-timeline-chart" class="report-chart-mini"></canvas>
      </div>
      ${summary.reportPlane === 'frontal' ? '' : '<p style="font-size:0.72rem;color:#94a3b8;margin:0.25rem 0 0.5rem 0;">歩行速度は股関節変位から推定。対称性は歩行イベント間隔から算出。いずれも計測誤差を含みます。</p>'}

      ${summary.reportPlane === 'sagittal' ? `
      <h2>🦺 関節角度詳細（全フレーム平均）</h2>
      <p style="font-size:0.72rem;color:#64748b;margin:0 0 0.5rem 0;">
        ※ 左右差の評価基準：膝 10°・足首 5° を超える差を「やや差あり」、その2倍超を「左右差大」としています。<br>
        全歩行フレームの平均値（立脚・遊脚混在）のため、絶対値より<strong>左右差の比較・経時変化</strong>に活用してください。<br>
        ⚠️ <strong>股関節角度は「肩−股関節−膝」の体幹-大腿角度（参考値）</strong>です。純粋な股関節屈伸角度ではなく、体幹前傾の影響を受けます。
      </p>
      <table class="report-table">
        <thead>
          <tr>
            <th>関節</th>
            <th>左 (°)</th>
            <th>右 (°)</th>
            <th>左右差評価</th>
          </tr>
        </thead>
        <tbody>
          ${renderDetailRows(summary)}
        </tbody>
      </table>
      ` : ''}

      <h2>💡 分析コメント</h2>
      <div class="report-comments">
        ${summary.comments.map((comment) => `• ${comment}`).join('<br>')}
      </div>

      <p style="text-align: center; font-size: 0.75rem; color: #475569; margin-top: 1rem;">
        データ数: ${summary.dataPoints}点 | 有効フレーム: ${summary.validFrames}/${summary.totalProcessedFrames} | 歩数: ${summary.stepCount}歩 | 時間: ${(summary.durationMs / 1000).toFixed(1)}秒
      </p>
    </div>
  `;
}
