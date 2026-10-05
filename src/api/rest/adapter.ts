import { money, setCurrency } from '../../lib/format';
import {
  Address,
  ApiAdapter,
  ApiError,
  Banner,
  Bill,
  CategoryNode,
  Customer,
  FeeLine,
  HomeSection,
  HomeTab,
  Mode,
  Order,
  OrderStatus,
  PayCode,
  PayMethod,
  Product,
  ProductDetail,
  Slot,
  TimelineStep,
  VariantGroup,
} from '../types';
import { absolute, request } from './client';

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

async function getBill(req: { items: Record<string, number>; coupon?: string | null; addressId?: string | null; slotFee?: number }) {
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
  }>('/369mart/cart/bill', {
    method: 'POST',
    body: {
      items: req.items,
      coupon: req.coupon ?? '',
      slotFee: req.slotFee ?? 0,
      ...(req.addressId ? { addressId: Number(req.addressId) } : {}),
    },
  });
}

async function me(): Promise<Customer | null> {
  let profile: { name: string; email: string; phone: string };
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
  return { name: profile.name, email: profile.email, phone: profile.phone, walletBalance: wallet?.balance };
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
        usePoints: false,
        mode,
        slot_key: req.slotKey,
        slot: label,
        eta: label,
        instructions: '',
        whatsapp: false,
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
