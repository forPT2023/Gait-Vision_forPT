import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateCanvasLayout, getDefaultVideoAspectRatio, resolveDisplaySourceDimensions, syncCanvasDisplaySize, calcVideoDrawRect } from '../src/video/display.js';

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

// ── calcVideoDrawRect tests ────────────────────────────────────────────────────

test('calcVideoDrawRect: exact aspect ratio match returns full canvas', () => {
  const rect = calcVideoDrawRect(1080, 1920, 1080, 1920);
  assert.equal(rect.x, 0);
  assert.equal(rect.y, 0);
  assert.equal(rect.w, 1080);
  assert.equal(rect.h, 1920);
});

test('calcVideoDrawRect: portrait video on portrait canvas – same AR gives no letterbox', () => {
  // 9:16 video, 9:16 canvas
  const rect = calcVideoDrawRect(405, 720, 1080, 1920);
  assert.equal(rect.x, 0);
  assert.equal(rect.y, 0);
  assert.equal(rect.w, 405);
  assert.equal(rect.h, 720);
});

test('calcVideoDrawRect: landscape video on portrait canvas gives letterbox (top/bottom bars)', () => {
  // 16:9 video (1920x1080) on a 400×600 canvas (portrait)
  // videoAR = 1.777, canvasAR = 0.667 → canvas taller → letterbox top/bottom
  const rect = calcVideoDrawRect(400, 600, 1920, 1080);
  assert.equal(rect.w, 400, 'drawW should fill canvas width');
  assert.ok(Math.abs(rect.h - 400 / (1920 / 1080)) < 1, 'drawH should be width / videoAR');
  assert.equal(rect.x, 0, 'no horizontal offset');
  assert.ok(rect.y > 0, 'should have top/bottom bars');
  // Verify landmark mapping: landmark at (0.5, 0.5) should land at center of drawn video
  const lmX = rect.x + 0.5 * rect.w;
  const lmY = rect.y + 0.5 * rect.h;
  assert.ok(Math.abs(lmX - 200) < 1, 'landmark x=0.5 should map to canvas center x');
  assert.ok(Math.abs(lmY - 300) < 1, 'landmark y=0.5 should map to canvas center y');
});

test('calcVideoDrawRect: portrait video on landscape canvas gives pillarbox (left/right bars)', () => {
  // 9:16 video (1080x1920) on a 800×600 canvas (landscape)
  // videoAR = 0.5625, canvasAR = 1.333 → canvas wider → pillarbox left/right
  const rect = calcVideoDrawRect(800, 600, 1080, 1920);
  assert.equal(rect.h, 600, 'drawH should fill canvas height');
  assert.ok(Math.abs(rect.w - 600 * (1080 / 1920)) < 1, 'drawW should be height * videoAR');
  assert.ok(rect.x > 0, 'should have left/right bars');
  assert.equal(rect.y, 0, 'no vertical offset');
});

test('calcVideoDrawRect: unknown video dimensions returns full canvas fallback', () => {
  const rect = calcVideoDrawRect(500, 500, 0, 0);
  assert.equal(rect.x, 0);
  assert.equal(rect.y, 0);
  assert.equal(rect.w, 500);
  assert.equal(rect.h, 500);
});

test('calcVideoDrawRect: drawW/drawH are centered within canvas', () => {
  // 16:9 video, portrait canvas 400×700
  const rect = calcVideoDrawRect(400, 700, 1920, 1080);
  // drawW = 400, drawH = 400 / (16/9) = 225
  assert.equal(rect.w, 400);
  assert.ok(Math.abs(rect.h - 225) < 1);
  // centered: y = (700 - 225) / 2 = 237.5
  assert.ok(Math.abs(rect.y - (700 - rect.h) / 2) < 0.01);
});

// ── GCD=1 edge case (e.g. 1470×923 source on small-screen device) ────────────

test('calculateCanvasLayout: GCD=1 source does NOT exceed target pixel size (mobile small container)', () => {
  // Source resolution 1470×923 has GCD=1, so wUnit=1470, hUnit=923.
  // On a mobile device with container=416px and DPR=3.53 (capped to 2),
  // targetPixelWidth=832 < wUnit=1470 → old code produced n=1 → pixelWidth=1470 (too large!).
  // Fixed code should fall back to targetPixelWidth-based sizing.
  const layout = calculateCanvasLayout({
    containerWidth: 416,
    containerHeight: 600,
    sourceWidth: 1470,
    sourceHeight: 923,
    devicePixelRatio: 3.53
  });

  // pixelWidth must fit within the target pixel box (≤ targetPixelWidth = round(416*2) = 832)
  assert.ok(layout.pixelWidth <= 832,
    `pixelWidth ${layout.pixelWidth} must be ≤ 832 (targetPixelWidth); got ${layout.pixelWidth}`);
  assert.ok(layout.pixelHeight <= 522,
    `pixelHeight ${layout.pixelHeight} must be ≤ 522 (targetPixelHeight); got ${layout.pixelHeight}`);

  // CSS size should match the container-derived size
  assert.ok(Math.abs(layout.cssWidth - 416) < 0.1,
    `cssWidth should be ~416, got ${layout.cssWidth}`);

  // Pixel AR should closely match source AR (1470/923 = 1.5926)
  const sourceAR = 1470 / 923;
  const pixelAR  = layout.pixelWidth / layout.pixelHeight;
  assert.ok(Math.abs(pixelAR - sourceAR) < 0.01,
    `pixelAR ${pixelAR.toFixed(4)} should be close to sourceAR ${sourceAR.toFixed(4)}`);
});

test('calculateCanvasLayout: GCD=1 source pixel size matches CSS size ratio (no invisible oversizing)', () => {
  // canvas.width >> canvas.style.width causes MediaPipe landmarks to appear offset
  // because the drawing scale is computed from canvas pixel size, not CSS size.
  const layout = calculateCanvasLayout({
    containerWidth: 416,
    containerHeight: 600,
    sourceWidth: 1470,
    sourceHeight: 923,
    devicePixelRatio: 3.53
  });

  const impliedDPRW = layout.pixelWidth  / layout.cssWidth;
  const impliedDPRH = layout.pixelHeight / layout.cssHeight;
  // Both implied DPR values must be ≤ maxDevicePixelRatio (default 2)
  assert.ok(impliedDPRW <= 2.05,
    `implied DPR (W) ${impliedDPRW.toFixed(3)} must be ≤ 2; pixelW=${layout.pixelWidth} cssW=${layout.cssWidth}`);
  assert.ok(impliedDPRH <= 2.05,
    `implied DPR (H) ${impliedDPRH.toFixed(3)} must be ≤ 2; pixelH=${layout.pixelHeight} cssH=${layout.cssHeight}`);
});
