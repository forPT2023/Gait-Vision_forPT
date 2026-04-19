import { CHART_DEFINITIONS, CHART_STREAMING_CONFIG } from '../config/charts.js';

export function resolveChartXValue({ now, videoFileUrl, videoEpochBaseMs, currentTime }) {
  const videoTimeMs = (videoFileUrl && Number.isFinite(currentTime)) ? (currentTime * 1000) : 0;
  return (videoFileUrl && videoEpochBaseMs != null)
    ? (videoEpochBaseMs + videoTimeMs)
    : now;
}

export function toChartPoint(xValue, value) {
  const safeValue = (typeof value === 'number' && Number.isFinite(value)) ? value : 0;
  return { x: xValue, y: safeValue };
}

export function adjustChartYRange({ chart, chartName, nextValue, definition, logger = console }) {
  if (!chart?.options?.scales?.y || !definition?.y || !Number.isFinite(nextValue)) return;

  // ゼロ値はチャートのデフォルトレンジを歪めないようにスキップする。
  // cadence (min=60) などのチャートでは 0 は「未検出」を意味し、
  // レンジを [−8, 160] 等に拡大すると視覚的にノイズになる。
  if (nextValue === 0) return;

  const yAxis = chart.options.scales.y;
  const currentMin = Number.isFinite(yAxis.min) ? yAxis.min : definition.y.min;
  const currentMax = Number.isFinite(yAxis.max) ? yAxis.max : definition.y.max;
  const span = Math.max(1, currentMax - currentMin);
  const padding = Math.max(1, span * 0.08);

  let nextMin = currentMin;
  let nextMax = currentMax;

  if (nextValue < currentMin) nextMin = Math.floor(nextValue - padding);
  if (nextValue > currentMax) nextMax = Math.ceil(nextValue + padding);

  if (nextMin !== currentMin || nextMax !== currentMax) {
    yAxis.min = nextMin;
    yAxis.max = nextMax;
    logger.log(`[Chart] Expanded ${chartName} y-range -> [${nextMin}, ${nextMax}] for value: ${nextValue}`);
  }
}

export function createChartController({ ChartCtor, document, getVideoContext, notifyReset = () => {}, logger = console }) {
  const charts = {};
  let lastChartUpdateTime = 0;

  function createBaseConfig() {
    return {
      type: 'line',
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
          x: {
            type: 'realtime',
            realtime: {
              duration: CHART_STREAMING_CONFIG.duration,
              refresh: CHART_STREAMING_CONFIG.refresh,
              delay: CHART_STREAMING_CONFIG.delay,
              frameRate: CHART_STREAMING_CONFIG.frameRate,
              pause: CHART_STREAMING_CONFIG.pause
            },
            ticks: { color: '#94a3b8' },
            grid: { color: '#334155' }
          },
          y: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } }
        },
        plugins: {
          legend: { labels: { color: '#cbd5e1' } },
          streaming: { frameRate: CHART_STREAMING_CONFIG.frameRate }
        },
        elements: {
          point: { radius: 0 },
          line: { borderWidth: 3, tension: 0.4 }
        }
      }
    };
  }

  function initCharts() {
    const baseConfig = createBaseConfig();

    Object.entries(CHART_DEFINITIONS).forEach(([key, definition]) => {
      if (charts[key]) {
        charts[key].destroy();
      }

      charts[key] = new ChartCtor(document.getElementById(definition.elementId), {
        ...baseConfig,
        data: {
          datasets: definition.datasets.map((dataset) => ({
            ...dataset,
            data: []
          }))
        },
        options: {
          ...baseConfig.options,
          scales: {
            ...baseConfig.options.scales,
            y: {
              ...baseConfig.options.scales.y,
              ...definition.y
            }
          }
        }
      });
    });

    logger.log('Charts initialized');
  }

  function setPauseState(paused) {
    Object.values(charts).forEach((chart) => {
      if (chart.options.scales.x.realtime) {
        chart.options.scales.x.realtime.pause = paused;
        chart.update('none');
      }
    });
  }

  function startCharts() {
    setPauseState(false);
  }

  function pauseCharts() {
    setPauseState(true);
  }

  function resetCharts() {
    Object.entries(charts).forEach(([key, chart]) => {
      chart.data.datasets.forEach((dataset) => {
        dataset.data = [];
      });
      const definition = CHART_DEFINITIONS[key];
      if (definition?.y) {
        chart.options.scales.y.min = definition.y.min;
        chart.options.scales.y.max = definition.y.max;
      }
      chart.update('none');
    });

    pauseCharts();
    notifyReset();
  }

  function updateCharts(dataPoint) {
    const now = Date.now();
    if (now - lastChartUpdateTime < CHART_STREAMING_CONFIG.updateIntervalMs) {
      return;
    }
    lastChartUpdateTime = now;

    if (!dataPoint || typeof dataPoint !== 'object') {
      logger.warn('[Chart] Invalid dataPoint:', dataPoint);
      return;
    }

    const videoContext = getVideoContext();
    const xValue = resolveChartXValue({ now, ...videoContext });

    const pushPoint = (chartName, datasetIndex, value) => {
      const chart = charts[chartName];
      if (chart?.data?.datasets?.[datasetIndex]) {
        const safeValue = (typeof value === 'number' && Number.isFinite(value)) ? value : 0;

        // ゼロ値かつチャートの最小値がゼロより大きい場合（例: cadence chart min=60）は
        // データポイントをスキップする。ゼロ値をプッシュすると見えない範囲（0付近）に
        // 線が飛び出して、チャートが視覚的にノイズになってしまう。
        // 「データなし」として gap（空白）を作る方が正確な表現になる。
        const definition = CHART_DEFINITIONS[chartName];
        const chartMin = definition?.y?.min ?? 0;
        if (safeValue === 0 && chartMin > 0) {
          return;
        }

        adjustChartYRange({
          chart,
          chartName,
          nextValue: safeValue,
          definition,
          logger
        });
        chart.data.datasets[datasetIndex].data.push(toChartPoint(xValue, safeValue));
      }
    };

    pushPoint('speed', 0, dataPoint.speed);
    pushPoint('cadence', 0, dataPoint.cadence);
    pushPoint('symmetry', 0, dataPoint.symmetry);
    pushPoint('trunk', 0, dataPoint.trunk);
    pushPoint('pelvis', 0, dataPoint.pelvis);
    pushPoint('knee', 0, dataPoint.leftKnee);
    pushPoint('knee', 1, dataPoint.rightKnee);
    pushPoint('hip', 0, dataPoint.leftHip);
    pushPoint('hip', 1, dataPoint.rightHip);
    pushPoint('ankle', 0, dataPoint.leftAnkle);
    pushPoint('ankle', 1, dataPoint.rightAnkle);

    Object.values(charts).forEach((chart) => {
      try {
        chart.update('quiet');
      } catch (error) {
        logger.warn('[Chart] Update error:', error);
      }
    });
  }

  return {
    initCharts,
    startCharts,
    pauseCharts,
    resetCharts,
    updateCharts
  };
}
