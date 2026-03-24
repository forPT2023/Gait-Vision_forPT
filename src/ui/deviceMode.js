export function detectDeviceMode({
  windowWidth,
  userAgent = '',
  maxTouchPoints = 0,
  platform = '',
  isStandalone = false
} = {}) {
  const width = Number(windowWidth) || 0;
  const ua = String(userAgent);
  const isiPhone = /iPhone|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isAndroidPhone = isAndroid && /Mobile/i.test(ua);
  const isiPad = /iPad/i.test(ua) || (platform === 'MacIntel' && maxTouchPoints > 1);
  const isTouchDevice = maxTouchPoints > 0;

  if (isiPhone || isAndroidPhone) {
    return 'phone';
  }

  if (isiPad) {
    return 'tablet';
  }

  if (isAndroid) {
    return width >= 768 ? 'tablet' : 'phone';
  }

  if (isTouchDevice && width > 0) {
    if (width <= 767) {
      return 'phone';
    }
    if (width <= 1180 || isStandalone) {
      return 'tablet';
    }
  }

  return 'desktop';
}

export function getDeviceModeLabel(deviceMode) {
  switch (deviceMode) {
    case 'phone':
      return 'スマホ版';
    case 'tablet':
      return 'タブレット版';
    default:
      return 'デスクトップ版';
  }
}

export function getChartsPanelState({
  deviceMode,
  chartsVisibleOnPhone = false
} = {}) {
  const showToggle = deviceMode === 'phone';
  const chartsVisible = showToggle ? chartsVisibleOnPhone : true;

  return {
    showToggle,
    chartsVisible,
    toggleLabel: chartsVisible ? '📈 グラフを隠す' : '📈 グラフを表示'
  };
}

export function applyDeviceModeUi({
  documentRef = document,
  deviceMode,
  chartsVisibleOnPhone = false
} = {}) {
  const body = documentRef.body;
  const mainApp = documentRef.getElementById('main-app');
  const badge = documentRef.getElementById('device-mode-badge');
  const chartsContainer = documentRef.getElementById('charts-container');
  const toggleButton = documentRef.getElementById('btn-toggle-charts');
  const panelState = getChartsPanelState({ deviceMode, chartsVisibleOnPhone });

  body?.setAttribute('data-device-mode', deviceMode);
  mainApp?.setAttribute('data-device-mode', deviceMode);

  if (badge) {
    badge.textContent = getDeviceModeLabel(deviceMode);
    badge.dataset.mode = deviceMode;
  }

  if (chartsContainer) {
    chartsContainer.classList.toggle('hidden-panel', !panelState.chartsVisible);
  }

  if (toggleButton) {
    toggleButton.style.display = panelState.showToggle ? 'inline-flex' : 'none';
    toggleButton.textContent = panelState.toggleLabel;
  }

  return panelState;
}
