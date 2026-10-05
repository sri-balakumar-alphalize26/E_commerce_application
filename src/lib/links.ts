/**
 * Where a category address leads. `components` is a category page;
 * `components/memory` is the same page opened on one of its sub-categories.
 */
export function categoryHref(path: string): string {
  const [slug, sub] = path.split('/');
  return sub ? `/category/${slug}?sub=${sub}` : `/category/${slug}`;
}

/**
 * Where a place the shop names leads: ["track", ref], ["account", "wallet"].
 * Notifications and the support chat both carry these. Null when the app has
 * no such place.
 */
export function placeHref(go: string[] | undefined): string | null {
  if (!go?.length) return null;
  const [where, what] = go;
  if (where === 'track' && what) return `/order/${what}`;
  if (where === 'product' && what) return `/product/${what}`;
  if (where === 'offers') return '/offers';
  if (where === 'cart') return '/cart';
  if (where === 'orders') return '/orders';
  if (where === 'account') {
    const pages: Record<string, string> = {
      wallet: '/wallet',
      rewards: '/rewards',
      refer: '/refer',
      referrals: '/refer',
      orders: '/orders',
      list: '/list',
      addresses: '/addresses',
      points: '/points',
    };
    return pages[what ?? ''] ?? '/account';
  }
  return null;
}
