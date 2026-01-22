/**
 * Toast Notification Composable
 * 精美的悬浮卡片通知，淡入淡出动画
 */

import { ref, readonly } from 'vue';

interface ToastConfig {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ToastItem extends ToastConfig {
  id: number;
}

const toasts = ref<ToastItem[]>([]);
let toastId = 0;

export function useToast() {
  const show = (config: ToastConfig | string) => {
    const toast: ToastItem = {
      id: ++toastId,
      message: typeof config === 'string' ? config : config.message,
      type: typeof config === 'string' ? 'info' : (config.type || 'info'),
      duration: typeof config === 'string' ? 3000 : (config.duration || 3000),
    };

    toasts.value.push(toast);

    if ((toast.duration ?? 0) > 0) {
      setTimeout(() => {
        remove(toast.id);
      }, toast.duration ?? 3000);
    }

    return toast.id;
  };

  const success = (message: string, duration?: number) => {
    return show({ message, type: 'success', duration });
  };

  const error = (message: string, duration?: number) => {
    return show({ message, type: 'error', duration: duration || 4000 });
  };

  const warning = (message: string, duration?: number) => {
    return show({ message, type: 'warning', duration });
  };

  const info = (message: string, duration?: number) => {
    return show({ message, type: 'info', duration });
  };

  const remove = (id: number) => {
    const index = toasts.value.findIndex(t => t.id === id);
    if (index > -1) {
      toasts.value.splice(index, 1);
    }
  };

  const clear = () => {
    toasts.value = [];
  };

  return {
    toasts: readonly(toasts),
    show,
    success,
    error,
    warning,
    info,
    remove,
    clear,
  };
}

// Global toast instance for easy access
export const toast = {
  show: (message: string | { message: string; type?: string }, duration?: number) => {
    const config = typeof message === 'string' 
      ? { message, type: 'info' as const } 
      : { message: message.message, type: (message.type as any) || 'info' as const };
    return useToast().show({ ...config, duration });
  },
  success: (message: string, duration?: number) => useToast().success(message, duration),
  error: (message: string, duration?: number) => useToast().error(message, duration),
  warning: (message: string, duration?: number) => useToast().warning(message, duration),
  info: (message: string, duration?: number) => useToast().info(message, duration),
};
