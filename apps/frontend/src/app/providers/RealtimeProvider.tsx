import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ToastCenter, ToastItem, ToastTone } from '../../components/common/ToastCenter';

type NotifyPayload = {
  title: string;
  message: string;
  tone?: ToastTone;
  durationMs?: number;
};

type RealtimeContextValue = {
  notify: (payload: NotifyPayload) => void;
};

const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined);

const DEFAULT_TOAST_DURATION_MS = 6500;

export function RealtimeProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));

    const timeout = timersRef.current.get(id);
    if (timeout !== undefined) {
      window.clearTimeout(timeout);
      timersRef.current.delete(id);
    }
  }, []);

  const notify = useCallback(
    ({ title, message, tone = 'info', durationMs = DEFAULT_TOAST_DURATION_MS }: NotifyPayload) => {
      const id = `toast-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

      setToasts((current) => [{ id, title, message, tone }, ...current].slice(0, 5));

      const timeout = window.setTimeout(() => dismiss(id), Math.max(1000, durationMs));
      timersRef.current.set(id, timeout);
    },
    [dismiss],
  );

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timeout) => window.clearTimeout(timeout));
      timersRef.current.clear();
    };
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <RealtimeContext.Provider value={value}>
      {children}
      <ToastCenter toasts={toasts} onDismiss={dismiss} />
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used inside RealtimeProvider');
  }
  return context;
}
