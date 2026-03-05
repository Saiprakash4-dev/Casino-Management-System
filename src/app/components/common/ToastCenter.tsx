import { useEffect } from 'react';
import { useUIStore } from '../../../state/uiStore';

export const ToastCenter = () => {
  const toasts = useUIStore((s) => s.toasts);
  const remove = useUIStore((s) => s.removeToast);

  useEffect(() => {
    const timers = toasts.map((t) => setTimeout(() => remove(t.id), 3500));
    return () => timers.forEach(clearTimeout);
  }, [remove, toasts]);

  return (
    <div className="toast-wrap">
      {toasts.map((t) => (
        <div className="toast" key={t.id}>{t.message}</div>
      ))}
    </div>
  );
};
