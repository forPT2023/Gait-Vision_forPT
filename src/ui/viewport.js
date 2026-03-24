export function getViewportHeight({
  windowRef = window
} = {}) {
  return Math.round(
    windowRef.visualViewport?.height ||
    windowRef.innerHeight ||
    0
  );
}

export function applyViewportHeightVar({
  documentRef = document,
  windowRef = window
} = {}) {
  const viewportHeight = getViewportHeight({ windowRef });
  if (viewportHeight > 0) {
    documentRef.documentElement?.style?.setProperty('--app-height', `${viewportHeight}px`);
  }
  return viewportHeight;
}
