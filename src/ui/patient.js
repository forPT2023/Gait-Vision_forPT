export function validatePatientId(id) {
  const trimmedId = id.trim();

  if (trimmedId.length === 0) {
    return { valid: false, error: '対象者IDを入力してください' };
  }

  if (/[぀-ゟ゠-ヿ一-龯㐀-䶿]/.test(trimmedId)) {
    return { valid: false, error: '❌ 日本語（氏名）は使用できません。匿名コード（例: PT-00001）を使用してください。' };
  }

  if (/^[\d\-\(\)\s]+$/.test(trimmedId) && /\d{3,4}/.test(trimmedId)) {
    return { valid: false, error: '❌ 電話番号は使用できません。匿名コード（例: PT-00001）を使用してください。' };
  }

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedId)) {
    return { valid: false, error: '❌ メールアドレスは使用できません。匿名コード（例: PT-00001）を使用してください。' };
  }

  if (/^(https?:\/\/|www\.)/.test(trimmedId)) {
    return { valid: false, error: '❌ URLは使用できません。匿名コード（例: PT-00001）を使用してください。' };
  }

  return { valid: true, error: null };
}
