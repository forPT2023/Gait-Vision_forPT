export function getDefaultVideoAspectRatio({
  isPortraitViewport = false
} = {}) {
  return isPortraitViewport ? 9 / 16 : 16 / 9;
}

export function resolveDisplaySourceDimensions({
  sourceWidth,
  sourceHeight,
  isPortraitViewport = false,
  preferViewportOrientation = false
} = {}) {
  const safeWidth = Number(sourceWidth) || 0;
  const safeHeight = Number(sourceHeight) || 0;

  if (!(safeWidth > 0 && safeHeight > 0)) {
    return {
      width: safeWidth,
      height: safeHeight,
      wasSwapped: false
    };
  }

  const sourceIsPortrait = safeHeight > safeWidth;
  const shouldSwap = preferViewportOrientation && sourceIsPortrait !== isPortraitViewport;

  if (!shouldSwap) {
    return {
      width: safeWidth,
      height: safeHeight,
      wasSwapped: false
    };
  }

  return {
    width: safeHeight,
    height: safeWidth,
    wasSwapped: true
  };
}

export function calculateCanvasLayout({
  containerWidth,
  containerHeight,
  sourceWidth,
  sourceHeight,
  devicePixelRatio = 1,
  maxDevicePixelRatio = 2,
  fallbackAspectRatio = 16 / 9
}) {
  const safeContainerWidth = Math.max(1, Number(containerWidth) || 0);
  const safeContainerHeight = Math.max(1, Number(containerHeight) || 0);
  const hasSourceDimensions = sourceWidth > 0 && sourceHeight > 0;
  const sourceAspectRatio = hasSourceDimensions
    ? sourceWidth / sourceHeight
    : fallbackAspectRatio;
  const containerAspectRatio = safeContainerWidth / safeContainerHeight;

  let cssWidth;
  let cssHeight;

  if (containerAspectRatio > sourceAspectRatio) {
    cssHeight = safeContainerHeight;
    cssWidth = safeContainerHeight * sourceAspectRatio;
  } else {
    cssWidth = safeContainerWidth;
    cssHeight = safeContainerWidth / sourceAspectRatio;
  }

  const scale = Math.min(
    Math.max(1, Number(devicePixelRatio) || 1),
    maxDevicePixelRatio
  );

  // When the source has known dimensions we must preserve the exact video
  // aspect ratio in pixel space.  Rounding cssWidth and cssHeight independently
  // can introduce a sub-pixel error (e.g. portrait 1080×1920 at DPR 1.5 gives
  // css 405×720 → naively rounded pixels 608×1080 which is AR 0.5630 vs the
  // true 0.5625).  That tiny stretch causes MediaPipe landmarks (normalised by
  // videoWidth/Height) to appear offset from the drawn video frame.
  //
  // Fix: reduce sourceWidth / sourceHeight by their GCD to get the simplest
  // integer ratio (w_unit : h_unit), then find the largest integer multiplier n
  // such that n*w_unit ≤ targetPixelWidth and n*h_unit ≤ targetPixelHeight.
  // This guarantees pixelWidth / pixelHeight === sourceWidth / sourceHeight exactly.
  let pixelWidth;
  let pixelHeight;

  if (hasSourceDimensions) {
    const targetPixelWidth  = Math.max(1, Math.round(cssWidth  * scale));
    const targetPixelHeight = Math.max(1, Math.round(cssHeight * scale));

    // Euclidean GCD
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    const g = gcd(sourceWidth, sourceHeight);
    const wUnit = sourceWidth  / g;  // e.g. 9 for 1080×1920
    const hUnit = sourceHeight / g;  // e.g. 16 for 1080×1920

    // Largest integer multiplier that fits inside the target pixel box.
    // When GCD=1 (e.g. 1470×923), wUnit/hUnit equal the full source size.
    // If the container is smaller than the source, n would be 0.
    // In that case fall back to scaling to fit the target box while preserving AR.
    const nW = Math.floor(targetPixelWidth  / wUnit);
    const nH = Math.floor(targetPixelHeight / hUnit);
    const n  = Math.min(nW, nH);

    if (n >= 1) {
      pixelWidth  = n * wUnit;
      pixelHeight = n * hUnit;
    } else {
      // Unit tile larger than target box — scale to fit while preserving AR.
      if (targetPixelWidth * hUnit <= targetPixelHeight * wUnit) {
        pixelWidth  = targetPixelWidth;
        pixelHeight = Math.max(1, Math.round(targetPixelWidth / sourceAspectRatio));
      } else {
        pixelHeight = targetPixelHeight;
        pixelWidth  = Math.max(1, Math.round(targetPixelHeight * sourceAspectRatio));
      }
    }
  } else {
    pixelWidth  = Math.max(1, Math.round(cssWidth  * scale));
    pixelHeight = Math.max(1, Math.round(cssHeight * scale));
  }

  return {
    cssWidth,
    cssHeight,
    pixelWidth,
    pixelHeight,
    scale,
    sourceAspectRatio
  };
}

export function syncCanvasDisplaySize({
  canvasElement,
  cssWidth,
  cssHeight,
  pixelWidth,
  pixelHeight
}) {
  canvasElement.width = pixelWidth;
  canvasElement.height = pixelHeight;
  canvasElement.style.width = `${cssWidth}px`;
  canvasElement.style.height = `${cssHeight}px`;
}

/**
 * Calculate the "object-fit: contain" draw rectangle for a video on a canvas.
 *
 * drawImage(video, rect.x, rect.y, rect.w, rect.h) + landmark scaling via
 *   px = rect.x + landmark.x * rect.w
 *   py = rect.y + landmark.y * rect.h
 * guarantees pixel-perfect alignment regardless of canvas vs video aspect ratio.
 *
 * When videoW or videoH is 0/unknown the full canvas is returned as fallback.
 *
 * @param {number} canvasW  Canvas pixel width
 * @param {number} canvasH  Canvas pixel height
 * @param {number} videoW   Video intrinsic width  (videoElement.videoWidth)
 * @param {number} videoH   Video intrinsic height (videoElement.videoHeight)
 * @returns {{ x: number, y: number, w: number, h: number }}
 */
export function calcVideoDrawRect(canvasW, canvasH, videoW, videoH) {
  if (!(videoW > 0 && videoH > 0)) {
    return { x: 0, y: 0, w: canvasW, h: canvasH };
  }
  const videoAR  = videoW  / videoH;
  const canvasAR = canvasW / canvasH;
  let drawW, drawH;
  if (canvasAR > videoAR) {
    // Canvas is wider than video → pillarbox (left/right black bars)
    drawH = canvasH;
    drawW = canvasH * videoAR;
  } else {
    // Canvas is taller than video (or exact match) → letterbox (top/bottom bars)
    drawW = canvasW;
    drawH = canvasW / videoAR;
  }
  return {
    x: (canvasW - drawW) / 2,
    y: (canvasH - drawH) / 2,
    w: drawW,
    h: drawH
  };
}
