import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveChartXValue, toChartPoint } from '../src/ui/charts.js';

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
