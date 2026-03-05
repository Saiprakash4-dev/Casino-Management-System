import { create } from 'zustand';

export type Toast = { id: string; message: string; kind?: 'info' | 'error' | 'success' };

type UIState = {
  selectedBetAmount: number;
  setSelectedBetAmount: (amount: number) => void;
  toasts: Toast[];
  pushToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
};

export const useUIStore = create<UIState>((set) => ({
  selectedBetAmount: 10,
  setSelectedBetAmount: (amount) => set({ selectedBetAmount: amount }),
  toasts: [],
  pushToast: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id: crypto.randomUUID() }],
    })),
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
