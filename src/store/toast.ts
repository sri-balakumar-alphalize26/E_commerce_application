import { create } from 'zustand';

interface ToastState {
  text: string;
  /** Changes with every toast, so the same words twice still show twice. */
  seq: number;
  show: (text: string) => void;
}

export const useToast = create<ToastState>((set) => ({
  text: '',
  seq: 0,
  show: (text) => set((s) => ({ text, seq: s.seq + 1 })),
}));

/** A line at the bottom of the screen for a moment. */
export function toast(text: string): void {
  useToast.getState().show(text);
}
