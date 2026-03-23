import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateCanvasLayout, getDefaultVideoAspectRatio, syncCanvasDisplaySize } from '../src/video/display.js';

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
