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
    captureSurfaceVisible: false,
    stageLabel: 'Step 1/3 撮影',
    metaLabel: '前回結果: まだありません',
    chartsVisible: false,
    toggleEnabled: false,
    toggleLabel: '📈 結果待ち',
    message: 'スマホ版: 撮影ステップです。撮影または動画選択後に解析してください。'
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
    stageLabel: 'Step 2/3 解析中',
    metaLabel: '解析点: 42 ・ 歩数: 8',
    chartsVisible: false,
    toggleEnabled: false,
    toggleLabel: '解析中…',
    message: 'スマホ版: 解析中です。撮影設定は一時的に非表示になります。'
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
    stageLabel: 'Step 3/3 結果確認',
    metaLabel: '解析点: 108 ・ 推定歩数: 23',
    chartsVisible: true,
    toggleEnabled: true,
    toggleLabel: '🎥 撮影に戻る',
    message: 'スマホ版: 結果ステップです。グラフ・レポート・CSVを確認できます。'
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
  const meta = { textContent: '' };
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
        if (id === 'phone-flow-stage') return stage;
        if (id === 'btn-toggle-charts') return toggleButton;
        return null;
      }
    },
    state: {
      visible: true,
      view: 'results',
      captureSurfaceVisible: false,
      stageLabel: 'Step 3/3 結果確認',
      metaLabel: '解析点: 108 ・ 推定歩数: 23',
      chartsVisible: true,
      toggleEnabled: true,
      toggleLabel: '🎥 撮影に戻る',
      message: 'スマホ版: 結果ステップです。'
    }
  });

  assert.equal(body.attributes['data-phone-flow-view'], 'results');
  assert.equal(body.attributes['data-phone-capture-surface'], 'hidden');
  assert.equal(mainApp.attributes['data-phone-flow-view'], 'results');
  assert.deepEqual(banner.classList.calls, [['hidden-panel', false]]);
  assert.equal(banner.dataset.view, 'results');
  assert.equal(stage.textContent, 'Step 3/3 結果確認');
  assert.equal(meta.textContent, '解析点: 108 ・ 推定歩数: 23');
  assert.equal(message.textContent, 'スマホ版: 結果ステップです。');
  assert.equal(toggleButton.style.display, 'inline-flex');
  assert.equal(toggleButton.disabled, false);
  assert.equal(toggleButton.textContent, '🎥 撮影に戻る');
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
  const analyzedVideoButton = { disabled: false };
  const reportButton = { disabled: false };
  const csvButton = { disabled: false };

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
  assert.equal(reportButton.disabled, false);
  assert.equal(csvButton.disabled, true);
});
