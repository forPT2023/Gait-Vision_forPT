import test from 'node:test';
import assert from 'node:assert/strict';

import { applyPhoneFlowUi, applyPhoneQuickActionState, getPhoneFlowState, getPhoneQuickActionDisabledState } from '../src/ui/phoneFlow.js';

test('getPhoneFlowState keeps non-phone modes hidden and charts visible', () => {
  assert.deepEqual(getPhoneFlowState({
    deviceMode: 'tablet',
    currentView: 'capture',
    hasAnalysisData: false,
    isAnalyzing: false,
    analysisPoints: 0,
    stepCount: 0
  }), {
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
  });
});

test('getPhoneFlowState exposes capture, analyzing, and results states for phone mode', () => {
  assert.deepEqual(getPhoneFlowState({
    deviceMode: 'phone',
    currentView: 'capture',
    hasAnalysisData: false,
    isAnalyzing: false,
    analysisPoints: 0,
    stepCount: 0
  }), {
    visible: true,
    view: 'capture',
    captureSurfaceVisible: true,
    stageLabel: '取得',
    metaLabel: '',
    showMeta: false,
    quickActionsVisible: false,
    chartsVisible: false,
    toggleEnabled: false,
    toggleLabel: '📈 結果待ち',
    message: '動画を撮影/選択して解析を開始してください。'
  });

  assert.deepEqual(getPhoneFlowState({
    deviceMode: 'phone',
    currentView: 'capture',
    hasAnalysisData: true,
    isAnalyzing: true,
    analysisPoints: 42,
    stepCount: 8
  }), {
    visible: true,
    view: 'analyzing',
    captureSurfaceVisible: false,
    stageLabel: '解析中',
    metaLabel: '点:42 歩:8',
    showMeta: true,
    quickActionsVisible: false,
    chartsVisible: false,
    toggleEnabled: false,
    toggleLabel: '解析中…',
    message: '解析中です…'
  });

  assert.deepEqual(getPhoneFlowState({
    deviceMode: 'phone',
    currentView: 'results',
    hasAnalysisData: true,
    isAnalyzing: false,
    analysisPoints: 108,
    stepCount: 23
  }), {
    visible: true,
    view: 'results',
    captureSurfaceVisible: false,
    stageLabel: '結果',
    metaLabel: '点:108 歩:23',
    showMeta: true,
    quickActionsVisible: true,
    chartsVisible: true,
    toggleEnabled: true,
    toggleLabel: '🎥 撮影に戻る',
    message: '結果を確認・出力できます。'
  });
});

test('applyPhoneFlowUi updates the banner and toggle button from state', () => {
  const body = {
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    }
  };
  const mainApp = {
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    }
  };
  const banner = {
    dataset: {},
    classList: {
      calls: [],
      toggle(name, state) {
        this.calls.push([name, state]);
      }
    }
  };
  const message = { textContent: '' };
  const stage = { textContent: '' };
  const meta = { textContent: '', style: {} };
  const quickActions = { style: {} };
  const toggleButton = {
    style: {},
    disabled: false,
    textContent: ''
  };

  applyPhoneFlowUi({
    documentRef: {
      body,
      getElementById(id) {
        if (id === 'main-app') return mainApp;
        if (id === 'phone-flow-banner') return banner;
        if (id === 'phone-flow-message') return message;
        if (id === 'phone-flow-meta') return meta;
        if (id === 'phone-flow-quick-actions') return quickActions;
        if (id === 'phone-flow-stage') return stage;
        if (id === 'btn-toggle-charts') return toggleButton;
        return null;
      }
    },
    state: {
      visible: true,
      view: 'results',
      captureSurfaceVisible: false,
      stageLabel: '結果',
      metaLabel: '点:108 歩:23',
      showMeta: true,
      quickActionsVisible: true,
      chartsVisible: true,
      toggleEnabled: true,
      toggleLabel: '🎥 撮影に戻る',
      message: '結果ステップです。'
    }
  });

  assert.equal(body.attributes['data-phone-flow-view'], 'results');
  assert.equal(body.attributes['data-phone-capture-surface'], 'hidden');
  assert.equal(mainApp.attributes['data-phone-flow-view'], 'results');
  assert.deepEqual(banner.classList.calls, [['hidden-panel', false]]);
  assert.equal(banner.dataset.view, 'results');
  assert.equal(stage.textContent, '結果');
  assert.equal(meta.textContent, '点:108 歩:23');
  assert.equal(meta.style.display, 'block');
  assert.equal(quickActions.style.display, 'flex');
  assert.equal(message.textContent, '結果ステップです。');
  assert.equal(toggleButton.style.display, 'inline-flex');
  assert.equal(toggleButton.disabled, false);
  assert.equal(toggleButton.textContent, '🎥 撮影に戻る');
});

test('applyPhoneFlowUi hides meta when showMeta is false', () => {
  const meta = { textContent: '', style: {} };
  const quickActions = { style: {} };
  const toggleButton = { style: {}, disabled: false, textContent: '' };
  applyPhoneFlowUi({
    documentRef: {
      body: { setAttribute() {} },
      getElementById(id) {
        if (id === 'main-app') return { setAttribute() {} };
        if (id === 'phone-flow-banner') return { classList: { toggle() {} }, dataset: {} };
        if (id === 'phone-flow-message') return { textContent: '' };
        if (id === 'phone-flow-stage') return { textContent: '' };
        if (id === 'phone-flow-meta') return meta;
        if (id === 'phone-flow-quick-actions') return quickActions;
        if (id === 'btn-toggle-charts') return toggleButton;
        return null;
      }
    },
    state: {
      visible: true,
      view: 'capture',
      captureSurfaceVisible: false,
      stageLabel: '取得',
      metaLabel: '',
      showMeta: false,
      quickActionsVisible: false,
      chartsVisible: false,
      toggleEnabled: false,
      toggleLabel: '📈 結果待ち',
      message: '動画を撮影/選択して解析を開始してください。'
    }
  });
  assert.equal(meta.style.display, 'none');
  assert.equal(quickActions.style.display, 'none');
  assert.equal(toggleButton.style.display, 'none');
});

test('getPhoneFlowState shows results view even when analysisData is empty (0 landmarks detected)', () => {
  // 解析データが0件でも currentView=results なら results ビューを表示する。
  // ランドマーク未検出（矢状面解析で人物が映っていない等）でも
  // capture ビューに戻らないことを確認する。
  const stateNoData = getPhoneFlowState({
    deviceMode: 'phone',
    currentView: 'results',
    hasAnalysisData: false,
    isAnalyzing: false,
    analysisPoints: 0,
    stepCount: 0
  });
  assert.equal(stateNoData.view, 'results', 'should stay on results view even with no data');
  assert.equal(stateNoData.showMeta, false, 'meta should be hidden when no data');
  assert.equal(stateNoData.quickActionsVisible, false, 'quick actions hidden when no data');
  assert.equal(stateNoData.chartsVisible, false, 'charts hidden when no data');
  assert.equal(stateNoData.toggleEnabled, true, 'toggle back button always enabled in results');
  assert.ok(stateNoData.message.includes('解析データが取得できませんでした'), 'should show error message when no data');
});

test('getPhoneFlowState hides canvas-container when video file is loaded (capture view)', () => {
  // 動画ファイルあり → captureSurfaceVisible=false（canvas-containerを非表示）
  const stateWithVideo = getPhoneFlowState({
    deviceMode: 'phone',
    currentView: 'capture',
    hasAnalysisData: false,
    isAnalyzing: false,
    analysisPoints: 0,
    stepCount: 0,
    hasVideoFile: true
  });
  assert.equal(stateWithVideo.captureSurfaceVisible, false, 'video file loaded: canvas-container should be hidden');

  // 動画ファイルなし → captureSurfaceVisible=true（canvas-containerを表示）
  const stateNoVideo = getPhoneFlowState({
    deviceMode: 'phone',
    currentView: 'capture',
    hasAnalysisData: false,
    isAnalyzing: false,
    analysisPoints: 0,
    stepCount: 0,
    hasVideoFile: false
  });
  assert.equal(stateNoVideo.captureSurfaceVisible, true, 'no video file: canvas-container should be visible');
});

test('getPhoneQuickActionDisabledState normalizes disabled flags', () => {
  assert.deepEqual(
    getPhoneQuickActionDisabledState({
      analyzedVideoDisabled: 0,
      reportDisabled: '',
      csvDisabled: 1
    }),
    {
      analyzedVideoDisabled: false,
      reportDisabled: false,
      csvDisabled: true
    }
  );
});

test('applyPhoneQuickActionState writes disabled states to phone quick action buttons', () => {
  const analyzedVideoButton = { disabled: false, style: {} };
  const reportButton = { disabled: false, style: {} };
  const csvButton = { disabled: false, style: {} };

  applyPhoneQuickActionState({
    documentRef: {
      getElementById(id) {
        if (id === 'btn-phone-analyzed-video') return analyzedVideoButton;
        if (id === 'btn-phone-report') return reportButton;
        if (id === 'btn-phone-csv') return csvButton;
        return null;
      }
    },
    state: {
      analyzedVideoDisabled: true,
      reportDisabled: false,
      csvDisabled: true
    }
  });

  assert.equal(analyzedVideoButton.disabled, true);
  assert.equal(analyzedVideoButton.style.display, 'none');
  assert.equal(reportButton.disabled, false);
  assert.equal(reportButton.style.display, 'inline-flex');
  assert.equal(csvButton.disabled, true);
  assert.equal(csvButton.style.display, 'none');
});
