import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateCanvasLayout, getDefaultVideoAspectRatio, resolveDisplaySourceDimensions, syncCanvasDisplaySize } from '../src/video/display.js';

test('getDefaultVideoAspectRatio uses portrait-friendly fallback on tall viewports', () => {
  assert.equal(getDefaultVideoAspectRatio({ isPortraitViewport: true }), 9 / 16);
  assert.equal(getDefaultVideoAspectRatio({ isPortraitViewport: false }), 16 / 9);
});

test('calculateCanvasLayout fits portrait video inside portrait container without distortion', () => {
  const layout = calculateCanvasLayout({
    containerWidth: 390,
    containerHeight: 560,
    sourceWidth: 1080,
    sourceHeight: 1920,
    devicePixelRatio: 3
  });

  assert.equal(layout.cssWidth, 315);
  assert.equal(layout.cssHeight, 560);
  assert.equal(layout.pixelWidth, 630);
  assert.equal(layout.pixelHeight, 1120);
  assert.equal(layout.scale, 2);
});

test('resolveDisplaySourceDimensions swaps live camera dimensions when viewport orientation disagrees', () => {
  assert.deepEqual(
    resolveDisplaySourceDimensions({
      sourceWidth: 1920,
      sourceHeight: 1080,
      isPortraitViewport: true,
      preferViewportOrientation: true
    }),
    { width: 1080, height: 1920, wasSwapped: true }
  );
});

test('calculateCanvasLayout preserves exact video aspect ratio at non-integer DPR values', () => {
  // Portrait video (1080×1920, ratio 9:16) inside a landscape container at DPR 1.5.
  // Naive rounding of both dimensions independently gives 608×1080 (AR 0.5630),
  // which differs from the true 9:16 ratio (0.5625) and causes landmark misalignment.
  // The GCD-based algorithm must produce exact integer multiples of the ratio unit.
  const layout = calculateCanvasLayout({
    containerWidth: 1280,
    containerHeight: 720,
    sourceWidth: 1080,
    sourceHeight: 1920,
    devicePixelRatio: 1.5
  });

  // Both pixel dimensions must be exact multiples of the GCD units (9 and 16).
  assert.equal(layout.pixelWidth  % 9,  0, 'pixelWidth must be a multiple of 9');
  assert.equal(layout.pixelHeight % 16, 0, 'pixelHeight must be a multiple of 16');
  // Exact ratio check: pixelWidth / pixelHeight === 9 / 16
  assert.equal(layout.pixelWidth * 16, layout.pixelHeight * 9,
    'pixelWidth/pixelHeight must equal exactly 9/16');
});

test('calculateCanvasLayout preserves exact ratio for landscape video at DPR 1.75', () => {
  // Landscape video 1920×1080 (16:9) at DPR 1.75.
  const layout = calculateCanvasLayout({
    containerWidth: 1280,
    containerHeight: 720,
    sourceWidth: 1920,
    sourceHeight: 1080,
    devicePixelRatio: 1.75
  });

  assert.equal(layout.pixelWidth  % 16, 0, 'pixelWidth must be a multiple of 16');
  assert.equal(layout.pixelHeight % 9,  0, 'pixelHeight must be a multiple of 9');
  assert.equal(layout.pixelWidth * 9, layout.pixelHeight * 16,
    'pixelWidth/pixelHeight must equal exactly 16/9');
});

test('syncCanvasDisplaySize keeps css and backing-store sizes in sync', () => {
  const canvasElement = {
    width: 0,
    height: 0,
    style: {}
  };

  syncCanvasDisplaySize({
    canvasElement,
    cssWidth: 315,
    cssHeight: 560,
    pixelWidth: 630,
    pixelHeight: 1120
  });

  assert.equal(canvasElement.width, 630);
  assert.equal(canvasElement.height, 1120);
  assert.equal(canvasElement.style.width, '315px');
  assert.equal(canvasElement.style.height, '560px');
});
