
type ToastType = 'success' | 'error' | 'info';

export function toast(message: string, type: ToastType = 'success', timeout = 2600) {
  let root = document.querySelector('.toast-container') as HTMLDivElement | null;
  if (!root) {
    root = document.createElement('div');
    root.className = 'toast-container';
    document.body.appendChild(root);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  root.appendChild(el);

  const t = setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(-6px) scale(0.98)';
    setTimeout(() => el.remove(), 220);
  }, timeout);

  // allow manual close on click
  el.addEventListener('click', () => {
    clearTimeout(t);
    el.remove();
  });
}

export const showSuccess = (message: string) => toast(message, 'success');
export const showError = (message: string) => toast(message, 'error');
export const showInfo = (message: string) => toast(message, 'info');

