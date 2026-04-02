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

    // Largest integer multiplier that fits inside the target pixel box
    const n = Math.max(1, Math.min(
      Math.floor(targetPixelWidth  / wUnit),
      Math.floor(targetPixelHeight / hUnit)
    ));

    pixelWidth  = n * wUnit;
    pixelHeight = n * hUnit;
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
