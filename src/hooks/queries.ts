import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '../api/endpoints';
import { Mode } from '../api/types';
import { useCart } from '../store/cart';
import { useSession } from '../store/session';

/** Every read the screens make, in one place so the cache keys cannot drift apart. */

export function useHome(mode: Mode) {
  return useQuery({ queryKey: ['home', mode], queryFn: () => api.home(mode) });
}

export function useCatalog() {
  return useQuery({ queryKey: ['catalog'], queryFn: () => api.catalog() });
}

export function useBrowse(slug: string, sub?: string) {
  return useQuery({
    queryKey: ['browse', slug, sub ?? ''],
    queryFn: () => api.browse(slug, sub),
    placeholderData: keepPreviousData,
  });
}

export function useOffers() {
  return useQuery({ queryKey: ['offers'], queryFn: () => api.offers() });
}

export function useProduct(id: string) {
  return useQuery({ queryKey: ['product', id], queryFn: () => api.product(id) });
}

/** The cards for what is in the basket. */
export function useCartProducts() {
  const items = useCart((s) => s.items);
  const ids = Object.keys(items).sort();
  return useQuery({
    queryKey: ['products', ids.join(',')],
    queryFn: () => api.products(ids),
    enabled: ids.length > 0,
    placeholderData: keepPreviousData,
  });
}

/** The basket, priced by the shop. `slotFee` and `addressId` matter only at checkout. */
export function useBill(opts: { slotFee?: number; addressId?: string | null; usePoints?: boolean } = {}) {
  const items = useCart((s) => s.items);
  const coupon = useCart((s) => s.coupon);
  const key = Object.keys(items)
    .sort()
    .map((id) => `${id}:${items[id]}`)
    .join(',');
  return useQuery({
    queryKey: ['bill', key, coupon, opts.slotFee ?? 0, opts.addressId ?? '', !!opts.usePoints],
    queryFn: () => api.bill({ items, coupon, slotFee: opts.slotFee, addressId: opts.addressId, usePoints: opts.usePoints }),
    enabled: key.length > 0,
    placeholderData: keepPreviousData,
  });
}

export function useSlots() {
  return useQuery({ queryKey: ['slots'], queryFn: () => api.slots() });
}

export function useAddresses() {
  const signedIn = useSession((s) => !!s.customer);
  return useQuery({ queryKey: ['addresses'], queryFn: () => api.addresses(), enabled: signedIn });
}

export function useOrders() {
  const signedIn = useSession((s) => !!s.customer);
  return useQuery({ queryKey: ['orders'], queryFn: () => api.orders(), enabled: signedIn });
}

/** One order, asked for again every few seconds while it is still on its way. */
export function useOrder(ref: string) {
  return useQuery({
    queryKey: ['order', ref],
    queryFn: () => api.order(ref),
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      return status === 'delivered' || status === 'cancelled' ? false : 5000;
    },
  });
}

/** The pages behind Account. Each waits for a signed-in customer. */
function useMine<T>(key: string, load: () => Promise<T>) {
  const signedIn = useSession((s) => !!s.customer);
  return useQuery({ queryKey: [key], queryFn: load, enabled: signedIn });
}

export const useWallet = () => useMine('wallet', () => api.wallet());
export const useRewards = () => useMine('rewards', () => api.rewards());
export const useReferrals = () => useMine('referrals', () => api.referrals());
export const usePoints = () => useMine('points', () => api.points());
export const useNotifications = () => useMine('notifications', () => api.notifications());
export const useSavedUpis = () => useMine('upis', () => api.savedUpis());

/** The cards for what is on My list. */
export function useWishProducts() {
  const wish = useCart((s) => s.wish);
  const ids = Object.keys(wish).sort();
  return useQuery({
    queryKey: ['products', ids.join(',')],
    queryFn: () => api.products(ids),
    enabled: ids.length > 0,
    placeholderData: keepPreviousData,
  });
}

/** The customer's own reviews, by product id. */
export const useMyReviews = () => useMine('myReviews', () => api.myReviews());
