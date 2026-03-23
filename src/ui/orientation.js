export function getOrientationWarningState({
  currentPlane,
  isPortrait,
  isMobile,
  isMainAppVisible
}) {
  if (!isMobile || !isMainAppVisible) {
    return { visible: false, message: '' };
  }

  const visible = (currentPlane === 'frontal' && !isPortrait) || (currentPlane === 'sagittal' && isPortrait);
  if (!visible) {
    return { visible: false, message: '' };
  }

  return {
    visible: true,
    message: currentPlane === 'frontal'
      ? '前額面分析には縦向き（ポートレート）が推奨されます'
      : '矢状面分析には横向き（ランドスケープ）が推奨されます'
  };
}

export function updateOrientationWarning({
  documentRef = document,
  windowRef = window,
  currentPlane,
  isMobile
}) {
  const warningEl = documentRef.getElementById('orientation-warning');
  const messageEl = documentRef.getElementById('orientation-message');
  const mainApp = documentRef.getElementById('main-app');
  const isMainAppVisible = !!mainApp && !mainApp.classList.contains('hidden');

  if (!warningEl || !messageEl) {
    return { visible: false, message: '' };
  }

  const state = getOrientationWarningState({
    currentPlane,
    isPortrait: windowRef.matchMedia('(orientation: portrait)').matches,
    isMobile,
    isMainAppVisible
  });

  if (!state.visible) {
    warningEl.classList.remove('show');
    return state;
  }

  messageEl.textContent = state.message;
  warningEl.classList.add('show');
  return state;
}
