import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Mode } from '../api/types';

interface ModeState {
  mode: Mode;
  setMode: (mode: Mode) => void;
}

/** Quick or Express: the two tabs on top, and the colour of everything under them. */
export const useMode = create<ModeState>()(
  persist(
    (set) => ({
      mode: 'quick',
      setMode: (mode) => set({ mode }),
    }),
    { name: 'm369.mode', storage: createJSONStorage(() => AsyncStorage) }
  )
);
