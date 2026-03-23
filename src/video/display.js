export function getDefaultVideoAspectRatio({
  isPortraitViewport = false
} = {}) {
  return isPortraitViewport ? 9 / 16 : 16 / 9;
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

