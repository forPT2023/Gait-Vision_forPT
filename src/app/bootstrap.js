export function hasStoredConsent({ localStorageRef = localStorage }) {
  return localStorageRef.getItem('hasConsented') === 'true';
}

export function persistConsent({ localStorageRef = localStorage }) {
  localStorageRef.setItem('hasConsented', 'true');
}

export function getStoredPatientId({ localStorageRef = localStorage }) {
  return localStorageRef.getItem('lastPatientId') || '';
}

export function buildStoredPatientIdState({ localStorageRef = localStorage, validatePatientId }) {
  const value = getStoredPatientId({ localStorageRef });
  if (!value) {
    return { value: '', submitDisabled: true };
  }

  const validation = validatePatientId(value);
  return {
    value,
    submitDisabled: !validation.valid
  };
}

export function persistPatientId({ localStorageRef = localStorage, patientId }) {
  localStorageRef.setItem('lastPatientId', patientId);
}
