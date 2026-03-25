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
