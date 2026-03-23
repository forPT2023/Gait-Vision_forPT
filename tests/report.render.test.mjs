import test from 'node:test';
import assert from 'node:assert/strict';

import { applyPdfImageLayout, buildPdfImageLayout, buildReportHtml } from '../src/report/render.js';
import { renderStatusBadge } from '../src/report/metricCard.js';

test('renderStatusBadge renders the expected color for each tone', () => {
  assert.equal(renderStatusBadge({ tone: 'good', label: 'OK' }), '<span style="color: #10b981;">OK</span>');
  assert.equal(renderStatusBadge({ tone: 'warn', label: 'WARN' }), '<span style="color: #f59e0b;">WARN</span>');
  assert.equal(renderStatusBadge({ tone: 'alert', label: 'ALERT' }), '<span style="color: #ef4444;">ALERT</span>');
});

test('buildReportHtml renders common header and quality summary fields', () => {
  const html = buildReportHtml({
    patientId: 'PT-0001',
    sessionId: 'session-PT-0001-1',
    reportPlane: 'frontal',
    sessionDateLabel: '2026/1/2',
    captureMode: 'video',
    appVersion: 'test-version',
    qualitySummary: 'capture=video',
    avgSpeed: 1.1,
    avgCadence: 114,
    avgSymmetry: 95,
    avgTrunk: 9,
    avgLeftKnee: 40,
    avgRightKnee: 42,
    avgPelvis: 6,
    kneeDiff: 2,
    avgLeftHip: 25,
    avgRightHip: 26,
    hipDiff: 1,
    avgLeftAnkle: 95,
    avgRightAnkle: 97,
    ankleDiff: 2,
    comments: ['[frontal.overall.good] OK'],
    dataPoints: 3,
    validFrames: 3,
    totalProcessedFrames: 5,
    stepCount: 6,
    durationMs: 2000,
    metricAvailability: { speed: true, cadence: true, symmetry: true, trunk: true, leftKnee: true, rightKnee: true, leftHip: true, rightHip: true, pelvis: true, leftAnkle: true, rightAnkle: true },
    thresholds: {
      speed: { normalMin: 0.8, normalMax: 1.4 },
      cadence: { normalMin: 100, normalMax: 130 },
      symmetry: { normalMin: 90, normalMax: 100 },
      trunk: { normalMin: 0, normalMax: 10 },
      leftKnee: { normalMin: 0, normalMax: 80 },
      rightKnee: { normalMin: 0, normalMax: 80 },
      pelvis: { normalMin: 0, normalMax: 10 },
      kneeDiff: { threshold: 10 },
      hipDiff: { threshold: 10 },
      ankleDiff: { threshold: 5 }
    }
  });

  assert.ok(html.includes('セッションID'));
  assert.ok(html.includes('session-PT-0001-1'));
  assert.ok(html.includes('品質サマリー: capture=video'));
  assert.ok(html.includes('レポート版'));
  assert.ok(html.includes('test-version'));
  assert.ok(html.includes('歩行速度'));
});

test('buildReportHtml renders 未計算 for unavailable metrics', () => {
  const html = buildReportHtml({
    patientId: 'PT-0002',
    sessionId: 'session-PT-0002-1',
    reportPlane: 'sagittal',
    sessionDateLabel: '2026/1/2',
    captureMode: 'camera',
    appVersion: 'test-version',
    qualitySummary: 'capture=camera',
    avgSpeed: 0,
    avgCadence: 0,
    avgSymmetry: 0,
    avgTrunk: 0,
    avgLeftKnee: 0,
    avgRightKnee: 0,
    avgPelvis: 0,
    kneeDiff: 0,
    avgLeftHip: 0,
    avgRightHip: 0,
    hipDiff: 0,
    avgLeftAnkle: 0,
    avgRightAnkle: 0,
    ankleDiff: 0,
    comments: ['[sagittal.overall.good] OK'],
    dataPoints: 1,
    validFrames: 1,
    totalProcessedFrames: 1,
    stepCount: 0,
    durationMs: 0,
    metricAvailability: { speed: false, cadence: false, symmetry: false, trunk: false, leftKnee: false, rightKnee: false, leftHip: false, rightHip: false, pelvis: true, leftAnkle: false, rightAnkle: false },
    thresholds: {
      speed: { normalMin: 0.8, normalMax: 1.4 },
      cadence: { normalMin: 100, normalMax: 130 },
      symmetry: { normalMin: 90, normalMax: 100 },
      trunk: { normalMin: 0, normalMax: 10 },
      leftKnee: { normalMin: 0, normalMax: 80 },
      rightKnee: { normalMin: 0, normalMax: 80 },
      pelvis: { normalMin: 0, normalMax: 10 },
      kneeDiff: { threshold: 10 },
      hipDiff: { threshold: 10 },
      ankleDiff: { threshold: 5 }
    }
  });

  assert.ok(html.includes('未計算'));
  assert.ok(html.includes('⚪ 未計算'));
});

test('buildPdfImageLayout creates multipage placements for tall canvases', () => {
  const layout = buildPdfImageLayout({
    canvasWidth: 1000,
    canvasHeight: 3000,
    pageWidth: 210,
    pageHeight: 297,
    margin: 10
  });

  assert.equal(layout.imgWidth, 190);
  assert.equal(layout.imgHeight, 570);
  assert.equal(layout.printableHeight, 277);
  assert.deepEqual(layout.pages, [
    { x: 10, y: 10, width: 190, height: 570 },
    { x: 10, y: -267, width: 190, height: 570 },
    { x: 10, y: -544, width: 190, height: 570 }
  ]);
});

test('buildPdfImageLayout rejects invalid canvas and page sizes', () => {
  assert.throws(() => buildPdfImageLayout({
    canvasWidth: 0,
    canvasHeight: 3000,
    pageWidth: 210,
    pageHeight: 297,
    margin: 10
  }), /canvas dimensions must be greater than zero/);

  assert.throws(() => buildPdfImageLayout({
    canvasWidth: 1000,
    canvasHeight: 3000,
    pageWidth: 10,
    pageHeight: 20,
    margin: 10
  }), /margins leave no printable area/);
});

test('applyPdfImageLayout adds pages after the first image placement', () => {
  const calls = [];
  applyPdfImageLayout({
    pdf: {
      addPage() {
        calls.push(['addPage']);
      },
      addImage(...args) {
        calls.push(['addImage', ...args]);
      }
    },
    imgData: 'data:image/png;base64,abc',
    layout: {
      pages: [
        { x: 10, y: 10, width: 190, height: 570 },
        { x: 10, y: -267, width: 190, height: 570 }
      ]
    }
  });

  assert.deepEqual(calls, [
    ['addImage', 'data:image/png;base64,abc', 'PNG', 10, 10, 190, 570],
    ['addPage'],
    ['addImage', 'data:image/png;base64,abc', 'PNG', 10, -267, 190, 570]
  ]);
});
