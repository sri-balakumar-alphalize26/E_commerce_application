import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** The most of one item a basket takes, as on the website. */
export const MAX_QTY = 12;

interface CartState {
  /** Product id -> quantity. Kept on the phone; the server only prices it. */
  items: Record<string, number>;
  coupon: string | null;
  /** Hearted products. On the phone for now; the wishlist proper comes later. */
  wish: Record<string, true>;
  add: (id: string) => void;
  dec: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  setCoupon: (code: string | null) => void;
  toggleWish: (id: string) => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: {},
      coupon: null,
      wish: {},
      add: (id) =>
        set((s) => ({ items: { ...s.items, [id]: Math.min(MAX_QTY, (s.items[id] ?? 0) + 1) } })),
      dec: (id) =>
        set((s) => {
          const next = { ...s.items };
          if ((next[id] ?? 0) <= 1) delete next[id];
          else next[id] -= 1;
          return { items: next };
        }),
      remove: (id) =>
        set((s) => {
          const next = { ...s.items };
          delete next[id];
          return { items: next };
        }),
      clear: () => set({ items: {}, coupon: null }),
      setCoupon: (coupon) => set({ coupon }),
      toggleWish: (id) =>
        set((s) => {
          const next = { ...s.wish };
          if (next[id]) delete next[id];
          else next[id] = true;
          return { wish: next };
        }),
    }),
    { name: 'm369.cart', storage: createJSONStorage(() => AsyncStorage) }
  )
);

/** How many different products are in the basket: the number on the cart badge. */
export function useCartCount(): number {
  return useCart((s) => Object.keys(s.items).length);
}
