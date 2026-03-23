export function showNotification({
  documentRef = document,
  message,
  type = 'info',
  durationMs = 3000
}) {
  const notification = documentRef.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  documentRef.body.appendChild(notification);
  setTimeout(() => notification.remove(), durationMs);
  return notification;
}
