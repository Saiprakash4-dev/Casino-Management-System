export type ToastTone = 'info' | 'success' | 'error';

export type ToastItem = {
  id: string;
  title: string;
  message: string;
  tone: ToastTone;
};

type ToastCenterProps = {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
};

export function ToastCenter({ toasts, onDismiss }: ToastCenterProps) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <aside className="toast-center" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast-item ${toast.tone}`}>
          <div className="toast-copy">
            <p className="toast-title">{toast.title}</p>
            <p className="toast-message">{toast.message}</p>
          </div>
          <button className="toast-close" type="button" onClick={() => onDismiss(toast.id)} aria-label="Dismiss notification">
            x
          </button>
        </div>
      ))}
    </aside>
  );
}
