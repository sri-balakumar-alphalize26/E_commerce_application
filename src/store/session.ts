import { create } from 'zustand';
import { api } from '../api/endpoints';
import { setSignedOutHandler } from '../api/rest/client';
import { Customer } from '../api/types';

interface SessionState {
  /** False until the first "who am I" has come back, so nothing flashes signed-out. */
  ready: boolean;
  customer: Customer | null;
  restore: () => Promise<void>;
  login: (login: string, password: string) => Promise<void>;
  signup: (input: { name: string; email: string; password: string; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
}

export const useSession = create<SessionState>((set) => ({
  ready: false,
  customer: null,
  restore: async () => {
    try {
      set({ customer: await api.me(), ready: true });
    } catch {
      // No signal at launch: browse signed out, and ask again at checkout.
      set({ customer: null, ready: true });
    }
  },
  login: async (login, password) => {
    set({ customer: await api.login(login, password) });
  },
  signup: async (input) => {
    set({ customer: await api.signup(input) });
  },
  logout: async () => {
    await api.logout().catch(() => {});
    set({ customer: null });
  },
}));

// The shop stopped recognising the session (it expired, or was ended elsewhere):
// show the customer as signed out instead of failing every screen.
setSignedOutHandler(() => useSession.setState({ customer: null }));
