import { api, isMock } from '../api/endpoints';
import { ApiError } from '../api/types';
import { useCart } from './cart';
import { useSession } from './session';
import { toast } from './toast';

/**
 * My list, kept in two places: on the phone so a heart answers at once and
 * works signed out, and on the account so the list follows the customer to the
 * website and to another phone.
 */

/** The shop's list holds products only; a chosen variant (`v123`) stays on the phone. */
function onAccount(id: string): boolean {
  return isMock() || /^\d+$/.test(id);
}

/** After signing in: send up what was hearted signed out, then take the account's list. */
export async function syncWish(): Promise<void> {
  if (!useSession.getState().customer) return;
  try {
    const local = Object.keys(useCart.getState().wish);
    let server = await api.wishlist();
    for (const id of local) {
      if (onAccount(id) && !server.includes(id)) server = await api.addWish(id).catch(() => server);
    }
    useCart.getState().setWish([...server, ...local.filter((id) => !onAccount(id))]);
  } catch {
    // No signal: the phone's own list stands until the next sign-in or launch.
  }
}

/** Heart or un-heart a product. */
export function toggleWish(id: string): void {
  const cart = useCart.getState();
  const adding = !cart.wish[id];
  cart.toggleWish(id);
  if (!useSession.getState().customer || !onAccount(id)) return;

  (adding ? api.addWish(id) : api.removeWish(id)).catch((err) => {
    // Already gone from the account is the outcome that was asked for.
    if (!adding && err instanceof ApiError && err.code === 'not_found') return;
    // Put the heart back the way the account still has it.
    const hearted = id in useCart.getState().wish;
    if (hearted === adding) useCart.getState().toggleWish(id);
    toast(err instanceof ApiError ? err.message : 'Could not update My list.');
  });
}
