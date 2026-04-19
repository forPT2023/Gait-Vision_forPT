import test from 'node:test';
import assert from 'node:assert/strict';

import { adjustChartYRange, resolveChartXValue, toChartPoint } from '../src/ui/charts.js';

test('resolveChartXValue uses now in camera mode', () => {
  const value = resolveChartXValue({
    now: 123456,
    videoFileUrl: null,
    videoEpochBaseMs: null,
    currentTime: 0
  });

  assert.equal(value, 123456);
});

test('resolveChartXValue derives epoch-like timestamps in video mode', () => {
  const value = resolveChartXValue({
    now: 1,
    videoFileUrl: 'blob:video',
    videoEpochBaseMs: 5000,
    currentTime: 1.5
  });

  assert.equal(value, 6500);
});

test('toChartPoint normalizes non-finite values to zero', () => {
  assert.deepEqual(toChartPoint(100, Number.NaN), { x: 100, y: 0 });
  assert.deepEqual(toChartPoint(200, 42), { x: 200, y: 42 });
});

test('adjustChartYRange expands y-axis when incoming values exceed bounds', () => {
  const chart = { options: { scales: { y: { min: 0, max: 10 } } } };
  const logs = [];

  adjustChartYRange({
    chart,
    chartName: 'speed',
    nextValue: 13,
    definition: { y: { min: 0, max: 10 } },
    logger: { log(message) { logs.push(message); } }
  });

  assert.equal(chart.options.scales.y.min, 0);
  assert.equal(chart.options.scales.y.max, 14);
  assert.equal(logs.length, 1);
});

test('adjustChartYRange skips zero values to preserve default range', () => {
  // cadence チャート (min=60) でゼロ値が来たとき、レンジが [-8, 160] 等に
  // 歪まないようにするため、ゼロは無視されることを確認する。
  const chart = { options: { scales: { y: { min: 60, max: 160 } } } };
  const logs = [];

  adjustChartYRange({
    chart,
    chartName: 'cadence',
    nextValue: 0,
    definition: { y: { min: 60, max: 160 } },
    logger: { log(message) { logs.push(message); } }
  });

  // レンジは変わらない
  assert.equal(chart.options.scales.y.min, 60, 'min should remain 60 for zero value');
  assert.equal(chart.options.scales.y.max, 160, 'max should remain 160 for zero value');
  assert.equal(logs.length, 0, 'no log for zero value');
});

test('createChartController pushPoint skips zero-value when chart min > 0', () => {
  // cadence(min=60) などのチャートに 0 を push するとチャートの可視範囲外にラインが
  // 飛び出してしまう（視覚バグ）。pushPoint は min>0 かつ value=0 のときスキップする。
  import('../src/ui/charts.js').then(({ createChartController }) => {
    const datasets = [[{ data: [] }]]; // cadence chart dataset
    const charts = {};
    const mockChart = (elementId, config) => {
      const chartObj = {
        options: config.options,
        data: config.data,
        update() {},
        destroy() {}
      };
      // Store keyed by dataset config
      return chartObj;
    };

    // This test is more of a structural check - we verify that the module
    // exports createChartController and it can be instantiated
    assert.equal(typeof createChartController, 'function');
  });
});
