// Toast Notification System
class ToastNotification {
  constructor() {
    this.container = this.createContainer();
    document.body.appendChild(this.container);
  }

  createContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 400px;
    `;
    return container;
  }

  show(message, type = 'success', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
      success: '✓',
      error: '✕',
      info: 'ℹ',
      warning: '⚠'
    };

    const colors = {
      success: { bg: 'rgba(57, 255, 20, 0.95)', border: '#39ff14' },
      error: { bg: 'rgba(255, 68, 68, 0.95)', border: '#ff4444' },
      info: { bg: 'rgba(0, 250, 255, 0.95)', border: '#00faff' },
      warning: { bg: 'rgba(255, 193, 7, 0.95)', border: '#ffc107' }
    };

    const color = colors[type] || colors.info;

    toast.style.cssText = `
      background: ${color.bg};
      color: #000;
      padding: 16px 20px;
      border-radius: 12px;
      border-left: 4px solid ${color.border};
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 300px;
      animation: slideIn 0.3s ease, fadeOut 0.3s ease ${duration - 300}ms forwards;
      font-family: 'Inter', sans-serif;
      font-weight: 600;
      font-size: 14px;
    `;

    toast.innerHTML = `
      <span style="font-size: 20px; font-weight: bold;">${icons[type]}</span>
      <span style="flex: 1;">${message}</span>
      <button onclick="this.parentElement.remove()" style="
        background: transparent;
        border: none;
        color: #000;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.7;
        transition: opacity 0.2s;
      " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">×</button>
    `;

    this.container.appendChild(toast);

    // Auto remove after duration
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, duration);

    return toast;
  }

  success(message, duration) {
    return this.show(message, 'success', duration);
  }

  error(message, duration) {
    return this.show(message, 'error', duration);
  }

  info(message, duration) {
    return this.show(message, 'info', duration);
  }

  warning(message, duration) {
    return this.show(message, 'warning', duration);
  }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes fadeOut {
    to {
      opacity: 0;
      transform: translateX(400px);
    }
  }

  @media (max-width: 768px) {
    #toast-container {
      left: 20px;
      right: 20px;
      max-width: none;
    }
  }
`;
document.head.appendChild(style);

// Create global toast instance
window.toast = new ToastNotification();

// Legacy alert override (optional - uncomment if you want to replace all alerts)
// window.alert = (msg) => toast.info(msg);