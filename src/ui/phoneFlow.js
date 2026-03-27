export function getPhoneFlowState({
  deviceMode,
  currentView = 'capture',
  hasAnalysisData = false,
  isAnalyzing = false,
  analysisPoints = 0,
  stepCount = 0
} = {}) {
  const visible = deviceMode === 'phone';
  const normalizedView = isAnalyzing
    ? 'analyzing'
    : (currentView === 'results' && hasAnalysisData ? 'results' : 'capture');
  const chartsVisible = visible ? normalizedView === 'results' : true;

  if (!visible) {
    return {
      visible: false,
      view: 'hidden',
      captureSurfaceVisible: true,
      stageLabel: '',
      metaLabel: '',
      showMeta: false,
      quickActionsVisible: false,
      chartsVisible: true,
      toggleEnabled: false,
      toggleLabel: '',
      message: ''
    };
  }

  if (normalizedView === 'analyzing') {
    return {
      visible: true,
      view: normalizedView,
      captureSurfaceVisible: false,
      stageLabel: '解析中',
      metaLabel: `点:${Math.max(0, analysisPoints)} 歩:${Math.max(0, stepCount)}`,
      showMeta: true,
      quickActionsVisible: false,
      chartsVisible: false,
      toggleEnabled: false,
      toggleLabel: '解析中…',
      message: '解析中です…'
    };
  }

  if (normalizedView === 'results') {
    return {
      visible: true,
      view: normalizedView,
      captureSurfaceVisible: false,
      stageLabel: '結果',
      metaLabel: `点:${Math.max(0, analysisPoints)} 歩:${Math.max(0, stepCount)}`,
      showMeta: true,
      quickActionsVisible: true,
      chartsVisible: true,
      toggleEnabled: true,
      toggleLabel: '🎥 撮影に戻る',
      message: '結果を確認・出力できます。'
    };
  }

  return {
    visible: true,
    view: normalizedView,
    captureSurfaceVisible: false,
    stageLabel: '取得',
    metaLabel: hasAnalysisData
      ? `前回 点:${Math.max(0, analysisPoints)} 歩:${Math.max(0, stepCount)}`
      : '',
    showMeta: hasAnalysisData,
    quickActionsVisible: false,
    chartsVisible: false,
    toggleEnabled: hasAnalysisData,
    toggleLabel: hasAnalysisData ? '📈 結果を見る' : '📈 結果待ち',
    message: hasAnalysisData
      ? '撮影を続けるか、結果を確認できます。'
      : '動画を撮影/選択して解析を開始してください。'
  };
}

export function applyPhoneFlowUi({
  documentRef = document,
  state
} = {}) {
  const banner = documentRef.getElementById('phone-flow-banner');
  const message = documentRef.getElementById('phone-flow-message');
  const stage = documentRef.getElementById('phone-flow-stage');
  const meta = documentRef.getElementById('phone-flow-meta');
  const quickActions = documentRef.getElementById('phone-flow-quick-actions');
  const toggleButton = documentRef.getElementById('btn-toggle-charts');
  const body = documentRef.body;
  const mainApp = documentRef.getElementById('main-app');

  body?.setAttribute('data-phone-flow-view', state.view);
  body?.setAttribute('data-phone-capture-surface', state.captureSurfaceVisible ? 'visible' : 'hidden');
  mainApp?.setAttribute('data-phone-flow-view', state.view);

  if (banner) {
    banner.classList.toggle('hidden-panel', !state.visible);
    banner.dataset.view = state.view;
  }

  if (message) {
    message.textContent = state.message;
  }

  if (stage) {
    stage.textContent = state.stageLabel;
  }

  if (meta) {
    meta.textContent = state.metaLabel;
    meta.style.display = state.showMeta ? 'block' : 'none';
  }

  if (quickActions) {
    quickActions.style.display = state.quickActionsVisible ? 'flex' : 'none';
  }

  if (toggleButton) {
    const showToggle = state.visible && state.view === 'results';
    toggleButton.style.display = showToggle ? 'inline-flex' : 'none';
    toggleButton.disabled = !state.toggleEnabled;
    toggleButton.textContent = state.toggleLabel;
  }

  return state;
}

export function getPhoneQuickActionDisabledState({
  reportDisabled = true,
  csvDisabled = true,
  analyzedVideoDisabled = true
} = {}) {
  return {
    reportDisabled: Boolean(reportDisabled),
    csvDisabled: Boolean(csvDisabled),
    analyzedVideoDisabled: Boolean(analyzedVideoDisabled)
  };
}

export function applyPhoneQuickActionState({
  documentRef = document,
  state
} = {}) {
  const analyzedVideoButton = documentRef.getElementById('btn-phone-analyzed-video');
  const reportButton = documentRef.getElementById('btn-phone-report');
  const csvButton = documentRef.getElementById('btn-phone-csv');

  if (analyzedVideoButton) {
    analyzedVideoButton.disabled = state.analyzedVideoDisabled;
    analyzedVideoButton.style.display = state.analyzedVideoDisabled ? 'none' : 'inline-flex';
  }

  if (reportButton) {
    reportButton.disabled = state.reportDisabled;
    reportButton.style.display = state.reportDisabled ? 'none' : 'inline-flex';
  }

  if (csvButton) {
    csvButton.disabled = state.csvDisabled;
    csvButton.style.display = state.csvDisabled ? 'none' : 'inline-flex';
  }

  return state;
}
