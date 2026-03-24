import test from 'node:test';
import assert from 'node:assert/strict';

import { applyDeviceModeUi, detectDeviceMode, getChartsPanelState, getDeviceModeLabel } from '../src/ui/deviceMode.js';

test('detectDeviceMode identifies phones and tablets from touch devices and user agents', () => {
  assert.equal(detectDeviceMode({
    windowWidth: 390,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    maxTouchPoints: 5
  }), 'phone');

  assert.equal(detectDeviceMode({
    windowWidth: 1024,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)',
    maxTouchPoints: 5
  }), 'tablet');
});

test('getDeviceModeLabel returns the expected Japanese labels', () => {
  assert.equal(getDeviceModeLabel('phone'), 'スマホ版');
  assert.equal(getDeviceModeLabel('tablet'), 'タブレット版');
  assert.equal(getDeviceModeLabel('desktop'), 'デスクトップ版');
});

test('getChartsPanelState keeps charts visible off-phone and toggle-controlled on phone', () => {
  assert.deepEqual(getChartsPanelState({
    deviceMode: 'tablet',
    chartsVisibleOnPhone: false
  }), {
    showToggle: false,
    chartsVisible: true,
    toggleLabel: '📈 グラフを隠す'
  });

  assert.deepEqual(getChartsPanelState({
    deviceMode: 'phone',
    chartsVisibleOnPhone: false
  }), {
    showToggle: true,
    chartsVisible: false,
    toggleLabel: '📈 グラフを表示'
  });
});

test('applyDeviceModeUi writes mode badge and hides charts for phone mode', () => {
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
  const badge = {
    textContent: '',
    dataset: {}
  };
  const chartsContainer = {
    classList: {
      toggled: [],
      toggle(name, state) {
        this.toggled.push([name, state]);
      }
    }
  };
  const toggleButton = {
    style: {},
    textContent: ''
  };

  const panelState = applyDeviceModeUi({
    documentRef: {
      body,
      getElementById(id) {
        if (id === 'main-app') return mainApp;
        if (id === 'device-mode-badge') return badge;
        if (id === 'charts-container') return chartsContainer;
        if (id === 'btn-toggle-charts') return toggleButton;
        return null;
      }
    },
    deviceMode: 'phone',
    chartsVisibleOnPhone: false
  });

  assert.equal(body.attributes['data-device-mode'], 'phone');
  assert.equal(mainApp.attributes['data-device-mode'], 'phone');
  assert.equal(badge.textContent, 'スマホ版');
  assert.equal(toggleButton.style.display, 'inline-flex');
  assert.equal(toggleButton.textContent, '📈 グラフを表示');
  assert.deepEqual(chartsContainer.classList.toggled, [['hidden-panel', true]]);
  assert.equal(panelState.chartsVisible, false);
});
