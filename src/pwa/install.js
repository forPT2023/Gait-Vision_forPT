export function isStandaloneMode({ windowRef = window, navigatorRef = navigator } = {}) {
  return windowRef.matchMedia('(display-mode: standalone)').matches || navigatorRef.standalone === true;
}

export function getInstallButtonState({ isStandalone, isIOS, hasDeferredPrompt }) {
  const shouldShowIOSHint = isIOS && !isStandalone;
  const visible = !isStandalone && (hasDeferredPrompt || shouldShowIOSHint);
  return {
    visible,
    label: hasDeferredPrompt ? '📲 インストール' : '📱 追加方法'
  };
}

export function setupInstallPrompt({ windowRef = window, navigatorRef = navigator, installButton, showNotification, logger = console }) {
  let deferredInstallPrompt = null;
  const isIOS = /iPad|iPhone|iPod/.test(navigatorRef.userAgent) || (navigatorRef.platform === 'MacIntel' && navigatorRef.maxTouchPoints > 1);

  function refreshButton() {
    if (!installButton) return;
    const state = getInstallButtonState({
      isStandalone: isStandaloneMode({ windowRef, navigatorRef }),
      isIOS,
      hasDeferredPrompt: !!deferredInstallPrompt
    });
    installButton.style.display = state.visible ? 'inline-flex' : 'none';
    installButton.textContent = state.label;
  }

  installButton?.addEventListener('click', async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const result = await deferredInstallPrompt.userChoice;
      if (result.outcome === 'accepted') {
        showNotification('アプリのインストールを開始しました', 'success');
      }
      deferredInstallPrompt = null;
      refreshButton();
      return;
    }

    if (isIOS && !isStandaloneMode({ windowRef, navigatorRef })) {
      showNotification('Safariの共有メニューから「ホーム画面に追加」を選択してください', 'info');
      return;
    }

    showNotification('この環境ではインストールプロンプトを表示できません', 'error');
  });

  windowRef.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    refreshButton();
    showNotification('アプリをインストールできます', 'success');
  });

  windowRef.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    refreshButton();
    showNotification('アプリのインストールが完了しました', 'success');
  });

  windowRef.matchMedia('(display-mode: standalone)').addEventListener?.('change', refreshButton);
  refreshButton();
  logger.log('[PWA] Install prompt controller initialized');

  return {
    refreshButton,
    isIOS
  };
}
