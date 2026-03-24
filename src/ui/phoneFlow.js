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
      stageLabel: '',
      metaLabel: '',
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
      stageLabel: 'Step 2/3 解析中',
      metaLabel: `解析点: ${Math.max(0, analysisPoints)} ・ 歩数: ${Math.max(0, stepCount)}`,
      chartsVisible: false,
      toggleEnabled: false,
      toggleLabel: '解析中…',
      message: 'スマホ版: 解析中です。撮影設定は一時的に非表示になります。'
    };
  }

  if (normalizedView === 'results') {
    return {
      visible: true,
      view: normalizedView,
      stageLabel: 'Step 3/3 結果確認',
      metaLabel: `解析点: ${Math.max(0, analysisPoints)} ・ 推定歩数: ${Math.max(0, stepCount)}`,
      chartsVisible: true,
      toggleEnabled: true,
      toggleLabel: '🎥 撮影に戻る',
      message: 'スマホ版: 結果ステップです。グラフ・レポート・CSVを確認できます。'
    };
  }

  return {
    visible: true,
    view: normalizedView,
    stageLabel: 'Step 1/3 撮影',
    metaLabel: hasAnalysisData
      ? `前回結果: 解析点 ${Math.max(0, analysisPoints)} ・ 推定歩数 ${Math.max(0, stepCount)}`
      : '前回結果: まだありません',
    chartsVisible: false,
    toggleEnabled: hasAnalysisData,
    toggleLabel: hasAnalysisData ? '📈 結果を見る' : '📈 結果待ち',
    message: hasAnalysisData
      ? 'スマホ版: 撮影ステップです。結果確認へ切り替えられます。'
      : 'スマホ版: 撮影ステップです。撮影または動画選択後に解析してください。'
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
  const toggleButton = documentRef.getElementById('btn-toggle-charts');
  const body = documentRef.body;
  const mainApp = documentRef.getElementById('main-app');

  body?.setAttribute('data-phone-flow-view', state.view);
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
  }

  if (toggleButton) {
    toggleButton.style.display = state.visible ? 'inline-flex' : 'none';
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
  }

  if (reportButton) {
    reportButton.disabled = state.reportDisabled;
  }

  if (csvButton) {
    csvButton.disabled = state.csvDisabled;
  }

  return state;
}
