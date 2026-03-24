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

  return {
    cssWidth,
    cssHeight,
    pixelWidth: Math.max(1, Math.round(cssWidth * scale)),
    pixelHeight: Math.max(1, Math.round(cssHeight * scale)),
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
