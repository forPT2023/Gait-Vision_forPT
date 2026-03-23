export function showPatientScreen({ documentRef = document }) {
  documentRef.getElementById('consent-screen')?.classList.add('hidden');
  documentRef.getElementById('patient-screen')?.classList.remove('hidden');
}

export function showMainApp({ documentRef = document, fpsDisplay }) {
  documentRef.getElementById('patient-screen')?.classList.add('hidden');
  documentRef.getElementById('main-app')?.classList.remove('hidden');
  if (fpsDisplay) {
    fpsDisplay.style.color = '#10b981';
  }
}

export function restoreScreenState({ documentRef = document, hasConsented }) {
  if (hasConsented) {
    showPatientScreen({ documentRef });
  }
}
