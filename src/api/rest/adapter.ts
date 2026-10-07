import { money, setCurrency } from '../../lib/format';
import {
  Address,
  ApiAdapter,
  ApiError,
  Banner,
  Bill,
  CategoryNode,
  ChatMessage,
  Country,
  Customer,
  FeeLine,
  HomeSection,
  HomeTab,
  Mode,
  MyReview,
  Order,
  OrderStatus,
  PayCode,
  PayMethod,
  Product,
  ProductDetail,
  SavedUpi,
  ScratchCard,
  Slot,
  TimelineStep,
  VariantGroup,
  Wallet,
} from '../types';
import { absolute, download, request } from './client';

/**
 * The live shop: the website's own `/369mart/*` routes, turned into the
 * shapes the screens draw. Nothing here invents data. What the shop does not
 * send (a rider's position, a photo) is simply absent from what comes out.
 *
 * On the wire Express is `all`.
 */

type WireMode = 'quick' | 'all';

interface Card {
  id: string;
  images?: string[];
  name: string;
  unit?: string;
  price: number;
  mrp?: number;
  brand?: string;
  rating?: number;
  ratingCount?: number;
  /** Present only on a product that ships Express. */
  delivery?: string;
  /** 0 when sold out; absent otherwise. */
  stock?: number;
  low?: number;
  tag?: string;
  hasVariants?: boolean;
  description?: string;
  specs?: Record<string, string>;
  /** On a variant: its choices in words, "Lenovo · Core i7 · 16GB". */
  size?: string;
  /** On a variant: which value it is for each question, by attribute id. */
  combo?: Record<string, number>;
}

interface WireCategory {
  slug: string;
  name: string;
  image?: string;
  subs?: WireCategory[];
}

interface WireRule {
  eta: string;
  minOrder: number;
  freeAbove: number;
  fee: number;
}

interface WireCoupon {
  code: string;
  title: string;
  note?: string;
}

interface ShopInfo {
  rules: Record<WireMode, WireRule>;
  coupons: WireCoupon[];
  /** "13 mins" and "2-3 days": the rules' wording without "Delivery in". */
  eta: Record<Mode, string>;
}

interface WireAddress {
  id: number;
  label: string;
  name: string;
  phone: string;
  line: string;
  area: string;
  town: string;
  pin: string;
  state_id: number | false;
  country_id: number | false;
  default: boolean;
  lat?: number;
  lng?: number;
}

interface WireOrder {
  id: string;
  at: number;
  mode: WireMode;
  placed: string;
  status: string;
  eta: string;
  items: [string, number][];
  snap: Record<string, { name: string; price: number }>;
  total: number;
  currency?: Parameters<typeof setCurrency>[0];
  pay: string;
  payNote: string;
  address: WireAddress | null;
  slot: string;
  timeline: { state: string; at: number; note: string }[];
  canCancel: boolean;
  otp: string;
  channel?: string;
  returns?: {
    id: string;
    kind: string;
    state: string;
    reason: string;
    detail: string;
    amount: number;
    refunded: number;
    photos: number;
    at: number | null;
  }[];
  substitutes?: {
    id: number;
    state: string;
    was: string;
    qty: number;
    wasPrice: number;
    options: { id: number; name: string; image: string; price: number; youPay: number }[];
    chosen: number | false;
    deadline: number | null;
    refund: number;
  }[];
}

interface WireReview {
  stars: number;
  title: string;
  text: string;
  at: number | null;
  state: string;
  heldReason: string;
  photos: number;
  verified: boolean;
  media?: unknown[];
}

function toMyReview(r: WireReview): MyReview {
  return {
    stars: r.stars,
    title: r.title ?? '',
    text: r.text ?? '',
    at: r.at,
    state: r.state || 'published',
    heldReason: r.heldReason ?? '',
    photos: Math.max(r.photos ?? 0, r.media?.length ?? 0),
    verified: !!r.verified,
  };
}

const wire = (mode: Mode): WireMode => (mode === 'express' ? 'all' : 'quick');
const unwire = (mode: string): Mode => (mode === 'all' ? 'express' : 'quick');

/** Answers that change rarely are asked for once and kept for a few minutes. */
function remember<T>(load: () => Promise<T>, ms = 5 * 60 * 1000): () => Promise<T> {
  let held: Promise<T> | null = null;
  let at = 0;
  return () => {
    if (!held || Date.now() - at > ms) {
      at = Date.now();
      held = load().catch((err) => {
        held = null;
        throw err;
      });
    }
    return held;
  };
}

const shopInfo = remember<ShopInfo>(async () => {
  // The catalogue says which money the shop quotes in, and every price drawn
  // waits on this, so no screen can format an amount before that is known.
  const [r] = await Promise.all([
    request<{ rules: Record<WireMode, WireRule>; coupons?: WireCoupon[] }>('/369mart/cart/rules'),
    catalogTree().catch(() => null),
  ]);
  const eta = (rule?: WireRule) => (rule?.eta ?? '').replace(/^delivery in\s+/i, '');
  return { rules: r.rules, coupons: r.coupons ?? [], eta: { quick: eta(r.rules.quick), express: eta(r.rules.all) } };
});

const catalogTree = remember(async () => {
  const r = await request<{ categories: WireCategory[]; currency?: Parameters<typeof setCurrency>[0] }>('/369mart/catalog');
  setCurrency(r.currency);
  return r.categories.map(toCategory);
});

const trendingTerms = remember(async () => (await request<{ trending: string[] }>('/369mart/search/trending')).trending ?? []);

const offerCards = remember(async () => (await request<{ deals: Card[] }>('/369mart/offers')).deals ?? [], 60 * 1000);

const defaultCountry = remember(
  async () => (await request<{ country?: { id: number } }>('/369mart/addresses/form')).country?.id
);

function toCategory(c: WireCategory): CategoryNode {
  return { slug: c.slug, name: c.name, image: absolute(c.image), subs: (c.subs ?? []).map(toCategory) };
}

/**
 * One product card. On a mode's own page (Home) every card speaks for that
 * mode; anywhere else a product says for itself, and it is Express exactly
 * when the shop gave it a delivery time.
 */
function toProduct(card: Card, info: ShopInfo, pageMode?: Mode): Product {
  const mode: Mode = pageMode ?? (card.delivery ? 'express' : 'quick');
  return {
    id: String(card.id),
    name: card.name,
    brand: card.brand,
    unit: card.size,
    price: card.price,
    mrp: card.mrp && card.mrp > card.price ? card.mrp : undefined,
    rating: card.rating,
    ratingCount: card.ratingCount,
    images: (card.images ?? []).map((u) => absolute(u)).filter((u): u is string => !!u),
    mode,
    delivery: card.delivery ?? info.eta[mode],
    low: card.low,
    soldOut: card.stock === 0,
    badge: card.tag,
    hasVariants: card.hasVariants,
  };
}

/** The shop's icon names, as the app's. */
const TAB_ICONS: Record<string, string> = {
  bag: 'home',
  keyboard: 'kb',
  ticket: 'pct',
  cpu: 'cpu',
  grid: 'grid',
  plug: 'plug',
  wifi: 'wifi',
  laptop: 'laptop',
  monitor: 'monitor',
};

function toAddress(a: WireAddress): Address {
  return {
    id: String(a.id),
    label: a.label,
    name: a.name,
    line: a.line,
    area: a.area,
    city: a.town,
    zip: a.pin,
    phone: a.phone,
    isDefault: !!a.default,
    stateId: a.state_id || undefined,
    countryId: a.country_id || undefined,
    // The shop sends 0, 0 for an address nobody has pinned.
    lat: a.lat || undefined,
    lng: a.lng || undefined,
  };
}

const FLOW: Record<Mode, OrderStatus[]> = {
  quick: ['placed', 'packed', 'out', 'delivered'],
  express: ['placed', 'shipped', 'out', 'delivered'],
};

const STEP_LABEL: Record<string, string> = {
  placed: 'Order confirmed',
  packed: 'Packed at the store',
  shipped: 'Shipped',
  out: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

function clock(at: number): string {
  const d = new Date(at);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * "Placed today, 5:42 pm", on the phone's own clock. The shop also sends this
 * as words, but in the server's time zone, which is not the customer's.
 */
function placedText(at: number): string {
  const d = new Date(at);
  const h = d.getHours();
  const time = `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400000);
  const day =
    d.toDateString() === today.toDateString()
      ? 'today'
      : d.toDateString() === yesterday.toDateString()
        ? 'yesterday'
        : `${d.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]}`;
  return `Placed ${day}, ${time}`;
}

function toOrder(o: WireOrder, photos: Record<string, string | undefined>): Order {
  const mode = unwire(o.mode);
  const known: OrderStatus[] = ['placed', 'packed', 'shipped', 'out', 'delivered', 'cancelled'];
  const status: OrderStatus = known.includes(o.status as OrderStatus) ? (o.status as OrderStatus) : 'placed';
  const stamps = new Map(o.timeline.map((s) => [s.state, s]));

  let timeline: TimelineStep[];
  if (status === 'cancelled') {
    // A cancelled order shows what actually happened, and no steps it will never take.
    timeline = o.timeline.map((s) => ({ label: STEP_LABEL[s.state] ?? s.state, time: clock(s.at), state: 'done' }));
    if (!stamps.has('cancelled')) timeline.push({ label: 'Cancelled', time: '', state: 'done' });
  } else {
    const flow = FLOW[mode];
    const reached = Math.max(0, flow.indexOf(status));
    timeline = flow.map((step, i) => {
      const stamp = stamps.get(step);
      const time = stamp ? clock(stamp.at) : '—';
      if (i < reached || status === 'delivered') return { label: STEP_LABEL[step], time, state: 'done' };
      if (i === reached) return { label: STEP_LABEL[step], time: stamp ? time : 'now', state: 'cur' };
      return { label: STEP_LABEL[step], time: '—', state: 'todo' };
    });
  }

  const note = o.timeline[o.timeline.length - 1]?.note;
  return {
    ref: o.id,
    at: o.at,
    placedText: placedText(o.at),
    mode,
    status,
    headline: status === 'delivered' ? 'Delivered' : status === 'cancelled' ? 'Cancelled' : o.eta || STEP_LABEL[status],
    statusLine: note ? `${STEP_LABEL[status]} · ${note}` : STEP_LABEL[status],
    eta: o.eta,
    lines: o.items.map(([id, qty]) => ({
      id,
      // "[SPX-PER-010] Logitech MX Master" -> the name without the stock code.
      name: (o.snap[id]?.name ?? 'Item').replace(/^\[[^\]]+\]\s*/, ''),
      qty,
      price: o.snap[id]?.price ?? 0,
      image: photos[id],
      mode,
    })),
    total: o.total,
    payNote: o.payNote || o.pay || '',
    address: o.address ? toAddress(o.address) : null,
    slot: o.slot,
    timeline,
    otp: status === 'delivered' || status === 'cancelled' ? '' : o.otp,
    canCancel: !!o.canCancel,
    channel: o.channel === 'whatsapp' ? 'whatsapp' : 'website',
    returns: (o.returns ?? []).map((r) => ({ ...r, kind: r.kind === 'replace' ? 'replace' : 'refund' })),
    substitutes: (o.substitutes ?? []).map((s) => ({
      id: String(s.id),
      state: s.state,
      was: s.was,
      qty: s.qty,
      wasPrice: s.wasPrice,
      options: s.options.map((opt) => ({
        id: String(opt.id),
        name: opt.name,
        image: absolute(opt.image),
        price: opt.price,
        youPay: opt.youPay,
      })),
      chosen: s.chosen ? String(s.chosen) : undefined,
      deadline: s.deadline,
      refund: s.refund,
    })),
  };
}

/** First photo of each product on these orders, in one request. */
async function photosFor(orders: WireOrder[]): Promise<Record<string, string | undefined>> {
  const ids = [...new Set(orders.flatMap((o) => o.items.map(([id]) => id)))];
  if (!ids.length) return {};
  try {
    const r = await request<{ items: Card[] }>(`/369mart/products?ids=${ids.map(encodeURIComponent).join(',')}`);
    return Object.fromEntries(r.items.map((c) => [String(c.id), absolute(c.images?.[0])]));
  } catch {
    // An order is still an order without its thumbnails.
    return {};
  }
}

/** 369M-2610051751: the app names the order, so a second tap settles the same one. */
function newRef(mode: WireMode): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp = `${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}`;
  return `${mode === 'all' ? '369E' : '369M'}-${stamp}${Math.floor(Math.random() * 90 + 10)}`;
}

const PAY_TEXT: Record<PayCode, { title: string; note: string; mark: string }> = {
  upi: { title: 'UPI', note: 'GPay, PhonePe, Paytm', mark: 'UPI' },
  wallet: { title: '369 Wallet', note: '', mark: '369' },
  card: { title: 'Credit or debit card', note: 'Visa, Mastercard, RuPay', mark: 'CARD' },
  netbanking: { title: 'Net banking', note: 'All major banks', mark: 'NB' },
  cod: { title: 'Cash on delivery', note: 'Pay when it arrives', mark: 'COD' },
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getBill(req: { items: Record<string, number>; coupon?: string | null; addressId?: string | null; slotFee?: number; usePoints?: boolean }) {
  return request<{
    mrp: number;
    items: number;
    sub: Record<WireMode, number>;
    fees: number;
    coupons?: { code: string; off: number; need: number }[];
    couponValid: boolean;
    couponOff: number;
    total: number;
    saved: number;
    count: number;
    blocked: boolean | string;
    modes: Record<string, WireMode>;
    points?: { usable: number; usableValue: number; applied: boolean; off: number } | null;
  }>('/369mart/cart/bill', {
    method: 'POST',
    body: {
      items: req.items,
      coupon: req.coupon ?? '',
      slotFee: req.slotFee ?? 0,
      usePoints: !!req.usePoints,
      ...(req.addressId ? { addressId: Number(req.addressId) } : {}),
    },
  });
}

async function me(): Promise<Customer | null> {
  let profile: { name: string; email: string; phone: string; phoneVerified?: boolean; needPhone?: boolean };
  try {
    profile = await request('/369mart/auth/me', { signingIn: true });
  } catch (err) {
    // "Nobody is signed in" is an answer, not a failure.
    if (err instanceof ApiError && (err.code === 'invalid' || err.code === 'unauthorized')) return null;
    throw err;
  }
  // The wallet is an amount: know the shop's money before it is drawn.
  const [wallet] = await Promise.all([
    request<{ balance: number }>('/369mart/wallet').catch(() => null),
    shopInfo().catch(() => null),
  ]);
  return {
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    walletBalance: wallet?.balance,
    phoneVerified: !!profile.phoneVerified,
    needPhone: !!profile.needPhone,
  };
}

interface WireTicket {
  messages?: { from: string; text: string; at: number | null }[];
}

/** A ticket's messages as chat lines: the customer's, and the staff's. */
function toTranscript(ticket: WireTicket | undefined | null): ChatMessage[] {
  return (ticket?.messages ?? []).map((m) => ({ from: m.from === 'me' ? 'me' : 'agent', text: m.text, at: m.at }));
}

interface WireScratch {
  id: string;
  from: string;
  scratched: boolean;
  reward: { type: string; amount?: number; code?: string; title?: string };
}

interface WireUpi {
  id: string;
  vpa: string;
  app: string;
  default: boolean;
}

function toScratch(c: WireScratch): ScratchCard {
  return { id: String(c.id), from: c.from, scratched: !!c.scratched, reward: c.reward ?? { type: '' } };
}

function toUpis(r: { upis?: WireUpi[] }): SavedUpi[] {
  return (r.upis ?? []).map((u) => ({ id: String(u.id), vpa: u.vpa, app: u.app, isDefault: !!u.default }));
}

async function getWallet(): Promise<Wallet> {
  const [r] = await Promise.all([
    request<{ balance: number; limit: number; min_topup: number; ledger: Wallet['ledger'] }>('/369mart/wallet'),
    shopInfo().catch(() => null),
  ]);
  return { balance: r.balance, limit: r.limit, minTopup: r.min_topup, ledger: r.ledger ?? [] };
}

export const restAdapter: ApiAdapter = {
  async home(mode) {
    const [feed, info, tree, offers, trending] = await Promise.all([
      request<Record<WireMode, WireHome> & { currency?: Parameters<typeof setCurrency>[0] }>('/369mart/home'),
      shopInfo(),
      catalogTree(),
      offerCards().catch(() => [] as Card[]),
      trendingTerms().catch(() => [] as string[]),
    ]);
    setCurrency(feed.currency);
    const m = feed[wire(mode)];
    const slugs = new Set(tree.map((c) => c.slug));

    // The shop's shortcut row, keeping the ones that lead somewhere in the app.
    const tabs: HomeTab[] = m.tabs
      .filter((t) => t.key === 'home' || t.key === 'offers' || slugs.has(t.key))
      .map((t) => ({
        key: t.key,
        label: t.key === 'home' ? 'Home' : t.label,
        icon: TAB_ICONS[t.icon] ?? 'grid',
        target: t.key,
      }));
    tabs.push({ key: 'orders', label: 'Orders', icon: 'orders', target: 'orders' });

    const banners = new Map<string, Banner>(
      m.banners.map((b) => [
        b.id,
        { id: b.id, title: b.title, note: b.note, tone: b.tone, image: absolute(b.image), pill: b.kicker || undefined, href: slugOf(b.href) },
      ])
    );
    const inRows = new Set(m.sections.flatMap((s) => s.banner ?? []));
    const top = [...banners.values()].filter((b) => !inRows.has(b.id));

    const sections: HomeSection[] = m.sections.map((s, i) =>
      s.banner
        ? { key: `banners-${i}`, title: '', items: [], banners: s.banner.map((id) => banners.get(id)).filter((b): b is Banner => !!b) }
        : {
            key: s.key ?? `row-${i}`,
            title: s.title ?? '',
            subtitle: s.subtitle || undefined,
            items: (s.items ?? []).map((c) => toProduct(c, info, mode)),
            route: slugOf(s.route),
          }
    );

    const biggest = Math.max(0, ...offers.map((c) => (c.mrp && c.mrp > c.price ? Math.round((1 - c.price / c.mrp) * 100) : 0)));
    const brands = [...new Set(sections.flatMap((s) => s.items.map((p) => p.brand)).filter((b): b is string => !!b))];

    return {
      eta: info.eta[mode],
      tabs,
      banners: top.length ? top : [...banners.values()],
      tiles: m.categories.map((c) => ({ slug: c.route || c.key, name: c.label, image: absolute(c.image), subs: [] })),
      moreCategories: 0,
      deal: biggest ? { text: `up to ${biggest}% off` } : undefined,
      sections,
      brands: brands.slice(0, 10),
      searchHint: trending[0] ?? '',
    };
  },

  catalog: () => catalogTree(),

  async browse(slug, sub) {
    const path = `/369mart/browse/${encodeURIComponent(slug)}${sub ? `/${encodeURIComponent(sub)}` : ''}`;
    const [r, info] = await Promise.all([
      request<{ category: WireCategory; sub: WireCategory | null; items: Card[] }>(path),
      shopInfo(),
    ]);
    return {
      category: toCategory(r.category),
      sub: r.sub ? toCategory(r.sub) : null,
      items: r.items.map((c) => toProduct(c, info)),
    };
  },

  async search(q) {
    if (!q.trim()) return [];
    const [r, info] = await Promise.all([
      request<{ items: Card[] }>(`/369mart/search?q=${encodeURIComponent(q.trim())}`),
      shopInfo(),
    ]);
    return r.items.map((c) => toProduct(c, info));
  },

  async suggest(q) {
    if (!q.trim()) return [];
    const [r, info] = await Promise.all([
      request<{ items: Card[] }>(`/369mart/search/suggest?q=${encodeURIComponent(q.trim())}`),
      shopInfo(),
    ]);
    return r.items.map((c) => toProduct(c, info));
  },

  trending: () => trendingTerms(),

  async offers() {
    const [cards, info] = await Promise.all([offerCards(), shopInfo()]);
    return cards.map((c) => toProduct(c, info));
  },

  async product(id) {
    const [r, info] = await Promise.all([
      request<{
        p: Card;
        d?: { category?: string; dist?: number[]; reviews?: { name: string; stars: number; when?: string; title?: string; text?: string }[] };
        variants?: Card[];
        attrs?: { id: number; name: string; values: { id: number; name: string }[] }[];
        bundle?: Card[];
      }>(`/369mart/product/${encodeURIComponent(id)}`),
      shopInfo(),
    ]);
    const p = r.p;
    const combo = p.combo ?? {};

    // Each question, and for each answer the variant it would lead to.
    const variants: VariantGroup[] = (r.attrs ?? []).map((attr) => ({
      name: attr.name,
      options: attr.values.map((v) => {
        const wanted = { ...combo, [String(attr.id)]: v.id };
        const match = (r.variants ?? []).find((c) =>
          Object.entries(wanted).every(([k, val]) => c.combo?.[k] === val)
        );
        return { label: v.name, selected: combo[String(attr.id)] === v.id, productId: match ? String(match.id) : undefined };
      }),
    }));

    const fee = (rule: WireRule | undefined) =>
      !rule ? undefined : rule.fee ? `${money(rule.fee)} delivery, free above ${money(rule.freeAbove)}` : 'Free delivery';
    const dist = r.d?.dist;

    const detail: ProductDetail = {
      product: toProduct(p, info),
      trail: r.d?.category,
      variants,
      offers: info.coupons.map((c) => ({ tag: 'Coupon', text: `${c.code} · ${c.title}${c.note ? ` · ${c.note}` : ''}` })),
      highlights: (p.description ?? '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
      specs: Object.entries(p.specs ?? {}),
      ratingBars: dist && dist.length === 5 ? [dist[0], dist[1], dist[2], dist[3], dist[4]] : undefined,
      reviews: (r.d?.reviews ?? []).map((rv) => ({
        stars: rv.stars,
        who: rv.name,
        where: rv.when,
        text: [rv.title, rv.text].filter(Boolean).join(' — '),
      })),
      together: (r.bundle ?? []).map((c) => toProduct(c, info)),
      quickNote: fee(info.rules.quick),
      expressNote: fee(info.rules.all),
    };
    return detail;
  },

  async products(ids) {
    if (!ids.length) return [];
    const [r, info] = await Promise.all([
      request<{ items: Card[] }>(`/369mart/products?ids=${ids.map(encodeURIComponent).join(',')}`),
      shopInfo(),
    ]);
    return r.items.map((c) => toProduct(c, info));
  },

  async bill(req) {
    const [b, info] = await Promise.all([getBill(req), shopInfo()]);
    const slotFee = req.slotFee ?? 0;

    // The shop sends one delivery figure. Split it by mode with its own rules
    // when the two agree; when they do not (a coupon waived it), show its figure.
    const lines: Partial<Record<Mode, FeeLine>> = {};
    let derived = 0;
    for (const mode of ['quick', 'express'] as Mode[]) {
      const sub = b.sub[wire(mode)] ?? 0;
      const rule = info.rules[wire(mode)];
      if (sub <= 0 || !rule) continue;
      const fee = sub >= rule.freeAbove ? 0 : rule.fee;
      lines[mode] = { fee, was: rule.fee, freeAbove: rule.freeAbove };
      derived += fee;
    }
    const near = (a: number, c: number) => Math.abs(a - c) < 0.005;
    const split = near(derived, b.fees) || near(derived + slotFee, b.fees);

    const applied = b.couponValid && !!req.coupon;
    const best = applied
      ? undefined
      : (b.coupons ?? []).filter((c) => c.need === 0 && c.off > 0).sort((x, y) => y.off - x.off)[0];

    const bill: Bill = {
      modes: Object.fromEntries(Object.entries(b.modes).map(([id, m]) => [id, unwire(m)])),
      count: b.count,
      mrp: b.mrp,
      items: b.items,
      fees: split ? lines : {},
      deliveryFee: split ? undefined : b.fees,
      slotFee: split ? slotFee : 0,
      coupon: applied ? (req.coupon ?? null) : null,
      couponOff: b.couponOff,
      couponHint: best ? { code: best.code, saves: best.off } : undefined,
      total: b.total,
      saved: b.saved,
      points:
        b.points && (b.points.usable > 0 || b.points.applied)
          ? { usable: b.points.usable, value: b.points.usableValue, applied: !!b.points.applied, off: b.points.off }
          : undefined,
      blocked: !b.blocked
        ? undefined
        : typeof b.blocked === 'string'
          ? b.blocked
          : `Quick orders start at ${money(info.rules.quick.minOrder)}. Add a little more to your cart.`,
    };
    return bill;
  },

  async slots() {
    const r = await request<Record<WireMode, { key: string; top: string; sub: string; label: string; fee?: number }[]>>('/369mart/slots');
    const list = (mode: Mode): Slot[] =>
      (r[wire(mode)] ?? []).map((s, i) => ({
        key: s.key,
        mode,
        title: s.top,
        note: s.sub,
        fee: s.fee ?? 0,
        tag: s.key === 'now' ? 'Fastest' : s.fee && i > 0 ? 'Faster' : undefined,
        label: s.label,
      }));
    return [...list('quick'), ...list('express')];
  },

  me,

  async login(login, password) {
    await request('/369mart/auth/login', { method: 'POST', body: { login, password }, signingIn: true });
    const customer = await me();
    if (!customer) throw new ApiError('unknown', 'Signed in, but the shop did not keep the session. Try again.');
    return customer;
  },

  async signup(input) {
    await request('/369mart/auth/signup', { method: 'POST', body: { ...input }, signingIn: true });
    const customer = await me();
    if (!customer) throw new ApiError('unknown', 'Account created, but the shop did not keep the session. Sign in.');
    return customer;
  },

  async logout() {
    await request('/369mart/auth/logout', { method: 'POST', body: {}, signingIn: true });
  },

  async phoneForm() {
    const r = await request<{
      country: Country;
      countries: Country[];
      phone?: { length: number; example: string };
    }>('/369mart/auth/phone-form', { signingIn: true });
    return { country: r.country, countries: r.countries, hint: r.phone };
  },

  async phoneStart(input) {
    // Adding a number is for the signed-in account; the other two are public.
    const path = input.purpose === 'add' ? '/369mart/auth/phone/add-start' : '/369mart/auth/phone/start';
    const r = await request<{ message: string; resendIn: number }>(path, {
      method: 'POST',
      body: { ...input },
      signingIn: input.purpose !== 'add',
    });
    return { message: r.message, resendIn: r.resendIn || 60 };
  },

  async phoneVerify(input) {
    const path = input.purpose === 'add' ? '/369mart/auth/phone/add-verify' : '/369mart/auth/phone/verify';
    const r = await request<{ created?: boolean; joined?: { orders: number; addresses: number } }>(path, {
      method: 'POST',
      body: { ...input },
      signingIn: input.purpose !== 'add',
    });
    const customer = await me();
    if (!customer) throw new ApiError('unknown', 'Signed in, but the shop did not keep the session. Try again.');
    return { customer, created: !!r.created, joined: r.joined ?? { orders: 0, addresses: 0 } };
  },

  async addresses() {
    const r = await request<{ addresses: WireAddress[] }>('/369mart/addresses');
    return r.addresses.map(toAddress);
  },

  async saveAddress(input, id) {
    // The shop needs the state; a PIN code names it.
    const stateId = input.stateId ?? (await restAdapter.lookupPin(input.zip))?.stateId;
    const countryId = input.countryId ?? (await defaultCountry().catch(() => undefined));
    const body: Record<string, unknown> = {
      label: input.label,
      name: input.name,
      phone: input.phone,
      line: input.line,
      area: input.area,
      town: input.city,
      pin: input.zip,
      ...(stateId ? { state_id: stateId } : {}),
      ...(countryId ? { country_id: countryId } : {}),
      ...(input.lat && input.lng ? { lat: input.lat, lng: input.lng } : {}),
    };
    const r = id
      ? await request<{ address: WireAddress }>(`/369mart/addresses/${id}`, { method: 'PATCH', body })
      : await request<{ address: WireAddress }>('/369mart/addresses', { method: 'POST', body });
    let saved = r.address;
    if (input.isDefault && !saved.default) {
      await request(`/369mart/addresses/${saved.id}/default`, { method: 'POST', body: {} });
      saved = { ...saved, default: true };
    }
    return toAddress(saved);
  },

  async deleteAddress(id) {
    await request(`/369mart/addresses/${id}`, { method: 'DELETE' });
  },

  async locate(lat, lng) {
    try {
      const r = await request<{ line?: string; area?: string; city?: string; zip?: string; state_id?: number }>('/369mart/geocode/reverse', {
        method: 'POST',
        body: { lat, lng },
      });
      return { line: r.line ?? '', area: r.area ?? '', city: r.city ?? '', zip: r.zip ?? '', stateId: r.state_id || undefined };
    } catch {
      return null;
    }
  },

  async lookupPin(pin) {
    try {
      const r = await request<{ town?: string; state?: string; state_id?: number }>(`/369mart/pincode/${encodeURIComponent(pin)}`);
      return { town: r.town ?? '', state: r.state ?? '', stateId: r.state_id || undefined };
    } catch {
      return null;
    }
  },

  async draftOrder(req) {
    const [b, slots] = await Promise.all([getBill(req), restAdapter.slots()]);
    const mode: WireMode = Object.values(b.modes).includes('quick') ? 'quick' : 'all';
    const slot = slots.find((s) => s.key === req.slotKey);
    const label = slot?.label ?? slot?.title ?? '';
    const ref = req.ref ?? newRef(mode);

    const draft = await request<{ ref: string; total: number }>('/369mart/orders', {
      method: 'POST',
      body: {
        ref,
        items: req.items,
        address_id: Number(req.addressId),
        coupon: req.coupon ?? '',
        usePoints: !!req.usePoints,
        mode,
        slot_key: req.slotKey,
        slot: label,
        eta: label,
        instructions: (req.instructions ?? '').trim(),
        whatsapp: !!req.whatsapp,
      },
    });

    const options = await request<{ methods: string[]; codLimit?: number; walletBalance?: number }>(
      `/369mart/payment/options?amount=${draft.total}&order_ref=${encodeURIComponent(draft.ref)}`
    );
    const offered = options.methods.filter((m): m is PayCode => m in PAY_TEXT);
    const methods: PayMethod[] = offered.map((code) => ({
      code,
      ...PAY_TEXT[code],
      note: code === 'wallet' ? `Balance ${money(options.walletBalance ?? 0)}` : PAY_TEXT[code].note,
      enabled: true,
    }));
    // Cash refused for the size of the order: say so, rather than leave it out unexplained.
    if (!offered.includes('cod') && options.codLimit && draft.total > options.codLimit) {
      methods.push({ code: 'cod', ...PAY_TEXT.cod, note: `Not available above ${money(options.codLimit)}`, enabled: false });
    }
    return { ref: draft.ref, total: draft.total, methods };
  },

  async payOrder(ref, pay) {
    const started = await request<{ reference: string; state: string }>('/369mart/payment/pay', {
      method: 'POST',
      body: { order_ref: ref, method: pay, wallet_use: pay === 'wallet' },
    });

    // The shop settles the payment in the background; ask until it says.
    const SETTLED = ['accepted', 'done', 'paid', 'authorized'];
    let state = started.state;
    for (let i = 0; i < 15 && !SETTLED.includes(state); i += 1) {
      if (state !== 'pending') throw new ApiError('invalid', 'The payment did not go through. Try another way to pay.');
      await sleep(2000);
      state = (await request<{ state: string }>(`/369mart/payment/status/${encodeURIComponent(started.reference)}`)).state;
    }
    if (!SETTLED.includes(state)) {
      throw new ApiError('invalid', 'The payment has not been confirmed yet. Check My orders in a moment before trying again.');
    }
    return restAdapter.order(ref);
  },

  async cancelOrder(ref, reason) {
    await request(`/369mart/orders/${encodeURIComponent(ref)}/cancel`, { method: 'POST', body: { reason } });
    return restAdapter.order(ref);
  },

  async requestReturn(ref, input) {
    await request(`/369mart/orders/${encodeURIComponent(ref)}/return`, {
      method: 'POST',
      body: { kind: input.kind, reason: input.reason, detail: input.detail, photos: input.photos.map((p) => p.data) },
      // Photos make this the one slow call the app has.
      timeoutMs: 60000,
    });
    return restAdapter.order(ref);
  },

  async answerSubstitute(ref, offerId, accept, productId) {
    await request(`/369mart/orders/${encodeURIComponent(ref)}/substitute/${encodeURIComponent(offerId)}`, {
      method: 'POST',
      body: { accept, ...(productId ? { product_id: Number(productId) } : {}) },
    });
    return restAdapter.order(ref);
  },

  async rateOrder(ref, input) {
    await request(`/369mart/orders/${encodeURIComponent(ref)}/rate`, {
      method: 'POST',
      body: { stars: input.stars, comment: input.comment, tags: [] },
    });
  },

  async invoice(ref) {
    return { name: `369mart-${ref}.pdf`, base64: await download(`/369mart/orders/${encodeURIComponent(ref)}/invoice`) };
  },

  async myReviews() {
    const r = await request<{ reviews: Record<string, WireReview> }>('/369mart/reviews');
    return Object.fromEntries(Object.entries(r.reviews ?? {}).map(([id, row]) => [id, toMyReview(row)]));
  },

  async writeReview(productId, input) {
    const r = await request<{ review: WireReview }>(`/369mart/reviews/${encodeURIComponent(productId)}`, {
      method: 'POST',
      body: { stars: input.stars, title: input.title, text: input.text, tags: [] },
    });
    return toMyReview(r.review);
  },

  async deleteReview(productId) {
    await request(`/369mart/reviews/${encodeURIComponent(productId)}`, { method: 'DELETE' });
  },

  async addReviewPhoto(productId, photo) {
    const r = await request<{ review: WireReview }>(`/369mart/reviews/${encodeURIComponent(productId)}/media`, {
      method: 'POST',
      body: { name: photo.name, mime: photo.mime, data: photo.data },
      timeoutMs: 60000,
    });
    return toMyReview(r.review);
  },

  async supportStart() {
    const r = await request<{ text: string; chips?: string[]; agent?: boolean; ticket?: WireTicket }>('/369mart/support/greeting');
    return {
      greeting: { from: 'bot', text: r.text, chips: r.chips },
      withAgent: !!r.agent,
      history: toTranscript(r.ticket),
    };
  },

  async supportAsk(text) {
    const r = await request<{ text: string; chips?: string[]; actions?: { label: string; go: string[] }[]; agent?: boolean }>(
      '/369mart/support/chat',
      { method: 'POST', body: { text } }
    );
    return { reply: { from: 'bot', text: r.text, chips: r.chips, actions: r.actions }, toAgent: !!r.agent };
  },

  async supportAgent(text) {
    const r = await request<{ reply: string; ticket?: WireTicket }>('/369mart/support/agent', { method: 'POST', body: { text } });
    return { reply: r.reply, history: toTranscript(r.ticket) };
  },

  async supportSay(text) {
    const r = await request<{ reply: string }>('/369mart/support/agent/say', { method: 'POST', body: { text } });
    return { reply: typeof r.reply === 'string' ? r.reply : '' };
  },

  async supportTicket() {
    const r = await request<{ ticket: WireTicket | null }>('/369mart/support/ticket');
    return r.ticket ? toTranscript(r.ticket) : null;
  },

  async wishlist() {
    return (await request<{ ids: string[] }>('/369mart/wishlist')).ids.map(String);
  },

  async addWish(id) {
    return (await request<{ ids: string[] }>('/369mart/wishlist', { method: 'POST', body: { id: Number(id) } })).ids.map(String);
  },

  async removeWish(id) {
    return (await request<{ ids: string[] }>(`/369mart/wishlist/${encodeURIComponent(id)}`, { method: 'DELETE' })).ids.map(String);
  },

  wallet: getWallet,

  async topUp(amount) {
    const started = await request<{ reference: string; state: string }>('/369mart/wallet/topup', {
      method: 'POST',
      body: { amount, method: 'upi' },
    });
    // Nothing is credited until the payment company confirms; ask a few times.
    let state = started.state;
    for (let i = 0; i < 8 && state !== 'done'; i += 1) {
      if (state === 'cancel' || state === 'error') {
        throw new ApiError('invalid', 'The payment did not go through. No money was added.');
      }
      await sleep(2000);
      state = (await request<{ state: string }>(`/369mart/wallet/topup/${encodeURIComponent(started.reference)}`)).state;
    }
    if (state !== 'done') {
      throw new ApiError('invalid', 'The payment has not been confirmed, so no money was added yet.');
    }
    return getWallet();
  },

  async rewards() {
    const [r] = await Promise.all([
      request<{ scratch: WireScratch[]; won: string[]; coupons: WireCoupon[] }>('/369mart/rewards'),
      shopInfo().catch(() => null),
    ]);
    return {
      coupons: r.coupons.map((c) => ({ code: c.code, title: c.title, note: c.note ?? '' })),
      cards: r.scratch.map(toScratch),
      won: r.won ?? [],
    };
  },

  async scratch(id) {
    const r = await request<{ card: WireScratch }>(`/369mart/rewards/${encodeURIComponent(id)}/scratch`, { method: 'POST', body: {} });
    return toScratch(r.card);
  },

  async referrals() {
    const [r] = await Promise.all([
      request<{
        code: string;
        link: string;
        reward: number;
        earned: number;
        pending: number;
        joined: number;
        ordered: number;
        referrals: { id: string; name: string; status: string; at: number | null }[];
      }>('/369mart/referrals'),
      shopInfo().catch(() => null),
    ]);
    return {
      code: r.code,
      link: r.link,
      reward: r.reward,
      earned: r.earned,
      pending: r.pending,
      joined: r.joined,
      ordered: r.ordered,
      friends: r.referrals ?? [],
    };
  },

  async points() {
    const [r] = await Promise.all([
      request<{
        enabled: boolean;
        earnOn: string;
        card: { number: string; points: number; value: number } | null;
        rule: { spend: number; earn: number; minRedeem: number } | null;
        history: { id: number; title: string; sub: string; points: number; credit: boolean; at: number | null; orderRef?: string }[];
      }>('/369mart/loyalty'),
      shopInfo().catch(() => null),
    ]);
    return {
      enabled: !!r.enabled,
      points: r.card?.points ?? 0,
      value: r.card?.value ?? 0,
      cardNumber: r.card?.number ?? '',
      rule: r.rule ? { spend: r.rule.spend, earn: r.rule.earn, minRedeem: r.rule.minRedeem } : null,
      earnOn: r.earnOn,
      history: (r.history ?? []).map((h) => ({ ...h, id: String(h.id) })),
    };
  },

  async notifications() {
    const r = await request<{ notifications: { id: string; type: string; title: string; text: string; at: number; read: boolean; go?: string[] }[] }>(
      '/369mart/notifications'
    );
    return r.notifications ?? [];
  },

  async markRead(ids) {
    await request('/369mart/notifications/read', { method: 'POST', body: ids === 'all' ? { all: true } : { ids } });
  },

  async dismissNotice(id) {
    await request('/369mart/notifications/dismiss', { method: 'POST', body: { ids: [id] } });
  },

  async saveProfile(input) {
    const body: Record<string, string> = { name: input.name };
    if (input.email) body.email = input.email;
    await request('/369mart/profile', { method: 'PATCH', body });
    const customer = await me();
    if (!customer) throw new ApiError('unauthorized', 'Sign in to continue.');
    return customer;
  },

  async savedUpis() {
    return toUpis(await request<{ upis: WireUpi[] }>('/369mart/payment/methods'));
  },

  async addUpi(vpa) {
    return toUpis(await request<{ upis: WireUpi[] }>('/369mart/payment/methods/upi', { method: 'POST', body: { vpa } }));
  },

  async removeUpi(id) {
    return toUpis(await request<{ upis: WireUpi[] }>(`/369mart/payment/methods/${encodeURIComponent(id)}`, { method: 'DELETE' }));
  },

  async recentSearches() {
    return (await request<{ recent: string[] }>('/369mart/search/recent')).recent ?? [];
  },

  async addRecentSearch(q) {
    return (await request<{ recent: string[] }>('/369mart/search/recent', { method: 'POST', body: { q } })).recent ?? [];
  },

  async clearRecentSearches() {
    return (await request<{ recent: string[] }>('/369mart/search/recent', { method: 'DELETE' })).recent ?? [];
  },

  async orders() {
    const [r] = await Promise.all([
      request<{ orders: WireOrder[] }>('/369mart/orders?limit=30'),
      shopInfo().catch(() => null),
    ]);
    // A draft is a checkout that was never paid for, not an order.
    const real = r.orders.filter((o) => o.status !== 'draft');
    const photos = await photosFor(real);
    return real.map((o) => toOrder(o, photos));
  },

  async order(ref) {
    const [r] = await Promise.all([
      request<{ order: WireOrder }>(`/369mart/orders/${encodeURIComponent(ref)}`),
      shopInfo().catch(() => null),
    ]);
    // An order keeps the money it was charged in.
    setCurrency(r.order.currency);
    return toOrder(r.order, await photosFor([r.order]));
  },
};

interface WireHome {
  tabs: { key: string; label: string; icon: string }[];
  banners: { id: string; kicker?: string; title: string; note: string; tone: string; image?: string; href?: string }[];
  categories: { key: string; label: string; image?: string; route?: string }[];
  sections: { key?: string; title?: string; subtitle?: string; route?: string; items?: Card[]; banner?: string[] }[];
}

/** A link the shop wrote for its website, as a category address: "peripherals/keyboards". */
function slugOf(href: string | undefined): string | undefined {
  if (!href || /^https?:/i.test(href)) return undefined;
  const path = href.replace(/^\/+/, '').replace(/^(c|category|browse)\//, '');
  return /^[a-z0-9-]+(\/[a-z0-9-]+)?$/i.test(path) ? path : undefined;
}
