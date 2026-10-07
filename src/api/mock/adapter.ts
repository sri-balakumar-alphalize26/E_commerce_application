import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Address,
  ApiAdapter,
  ApiError,
  Bill,
  CategoryNode,
  ChatMessage,
  Customer,
  DraftRequest,
  FeeLine,
  HomeFeed,
  Mode,
  Order,
  MyReview,
  Notice,
  OrderLine,
  OrderReturn,
  OrderStatus,
  PayMethod,
  Product,
  SavedUpi,
  ScratchCard,
  Slot,
  TimelineStep,
  WalletEntry,
} from '../types';
import {
  BANNERS,
  BRANDS,
  BUY_AGAIN,
  CATEGORIES,
  DEMO_ADDRESS,
  DEMO_CUSTOMER,
  EXPRESS_DAYS,
  PRIORITY_DAYS,
  PRODUCTS,
  QUICK_ETA,
  RAILS,
  STORE,
  dayText,
  detailExtra,
} from './fixtures';

/**
 * The shop, played from fixtures on the phone.
 *
 * What a fresh install shows until it is pointed at a server, and what the
 * design is checked against. The rules here are the mockup's: Quick delivery
 * ₹30, free above ₹499; Express ₹49, free above ₹999; WELCOME50 takes ₹50 off.
 * Orders move through their steps on a clock so tracking has something to show.
 */

const KEY = 'm369.demo';
const LATENCY_MS = 180;

interface DemoOrder {
  ref: string;
  cancelled?: boolean;
  at: number;
  mode: Mode;
  lines: OrderLine[];
  total: number;
  payNote: string;
  address: Address;
  slot: string;
  otp: string;
  returns?: OrderReturn[];
}

interface DemoState {
  customer: Customer | null;
  addresses: Address[];
  orders: DemoOrder[];
  wish: string[];
  ledger: WalletEntry[];
  cards: ScratchCard[];
  notices: Notice[];
  upis: SavedUpi[];
  recent: string[];
  reviews: Record<string, MyReview>;
}

/** What the account pages hold on a fresh demo. Times are set when the demo first opens. */
function freshExtras(): Pick<DemoState, 'wish' | 'ledger' | 'cards' | 'notices' | 'upis' | 'recent' | 'reviews'> {
  const now = Date.now();
  const day = 86400000;
  return {
    wish: ['ssd'],
    ledger: [
      { id: 'w2', kind: 'reward', amount: 50, title: 'Scratch card reward', sub: 'From your first order', at: now - 2 * day },
      { id: 'w1', kind: 'add', amount: 200, title: 'Money added', sub: 'UPI', at: now - 6 * day },
    ],
    cards: [
      { id: 's1', from: 'Welcome gift', scratched: false, reward: { type: 'cash', amount: 25 } },
      { id: 's2', from: 'Your first order', scratched: true, reward: { type: 'coupon', code: 'WELCOME50', title: 'Flat ₹50 off' } },
    ],
    notices: [
      { id: 'n2', type: 'offer', title: 'Desk upgrade week', text: 'Keyboards and mice at up to 27% off.', at: now - day, read: false, go: ['offers'] },
      { id: 'n1', type: 'wallet', title: 'Scratch card waiting', text: 'You have a card to scratch in Coupons & rewards.', at: now - 2 * day, read: false, go: ['account', 'rewards'] },
    ],
    upis: [{ id: 'u1', vpa: 'bala@okaxis', app: 'gpay', isDefault: true }],
    recent: [],
    reviews: {},
  };
}

const SUPPORT_CHIPS = ['Track my order', 'Refund status', 'Cancel an order', 'Payment issue', 'Delivery charges', 'Talk to an agent'];
/** The demo's conversation with a person. Starts again each time the app does. */
let demoChat: ChatMessage[] = [];

const DEMO_POINTS = 120;
/** Ten points are worth one rupee. */
const POINTS_PER_RUPEE = 10;
const WALLET_LIMIT = 10000;
const MIN_TOPUP = 10;

let state: DemoState | null = null;

/** Orders written down at checkout and not yet paid for. Gone when the app closes, as a draft should be. */
const drafts: Record<string, { req: DraftRequest; address: Address; slot?: Slot; bill: Bill }> = {};

async function load(): Promise<DemoState> {
  if (state) return state;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      // A demo saved before the account pages existed has none of their data.
      state = { ...freshExtras(), ...(JSON.parse(raw) as DemoState) };
      return state;
    }
  } catch {
    // Unreadable: start the demo again rather than fail.
  }
  // The demo opens signed in, so every screen has something on it.
  state = { customer: DEMO_CUSTOMER, addresses: [DEMO_ADDRESS], orders: [], ...freshExtras() };
  return state;
}

async function save(): Promise<void> {
  if (state) await AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
}

function wait<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));
}

/** A card as one mode's pages show it: an Express page quotes a day for everything on it. */
function shownIn(mode: Mode, id: string): Product {
  const base = PRODUCTS[id];
  if (mode === 'express') return { ...base, mode, delivery: `${dayText(EXPRESS_DAYS)} · Free` };
  return { ...base, mode, delivery: QUICK_ETA };
}

function all(): Product[] {
  return Object.values(PRODUCTS);
}

function matching(q: string): Product[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  return all().filter((x) => `${x.name} ${x.brand} ${x.category}`.toLowerCase().includes(needle));
}

function findCategory(slug: string): CategoryNode | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

function inCategory(node: CategoryNode): Product[] {
  const slugs = node.subs.length ? node.subs.map((s) => s.slug) : [node.slug];
  return all().filter((x) => x.category && slugs.includes(x.category));
}

const FEE: Record<Mode, { fee: number; freeAbove: number }> = {
  quick: { fee: 30, freeAbove: 499 },
  express: { fee: 49, freeAbove: 999 },
};
const COUPON = { code: 'WELCOME50', off: 50 };
const COD_LIMIT = 5000;

function clock(at: number): string {
  const d = new Date(at);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function placedText(at: number): string {
  const d = new Date(at);
  const h = d.getHours();
  const time = `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
  const today = new Date().toDateString() === d.toDateString();
  return `Placed ${today ? 'today' : dayText(0, false, at)}, ${time}`;
}

/** Seconds after placing at which each Quick step begins: packed, picked up, on the way, delivered. */
const QUICK_STEPS = [15, 30, 45, 90];
/** What the customer is told the trip takes; the demo squeezes it into `QUICK_STEPS[3]` seconds. */
const QUICK_MINUTES = 13;
const EXPRESS_STEPS = [30, 60];

function present(o: DemoOrder): Order {
  if (o.cancelled) {
    return {
      ref: o.ref,
      at: o.at,
      placedText: placedText(o.at),
      mode: o.mode,
      status: 'cancelled',
      headline: 'Cancelled',
      statusLine: 'Cancelled · nothing was charged',
      eta: '',
      lines: o.lines,
      total: o.total,
      payNote: o.payNote,
      address: o.address,
      slot: o.slot,
      timeline: [
        { label: 'Order confirmed', time: clock(o.at), state: 'done' },
        { label: 'Cancelled', time: '', state: 'done' },
      ],
      otp: '',
      canCancel: false,
      returns: [],
      substitutes: [],
    };
  }
  const elapsed = (Date.now() - o.at) / 1000;
  const marks = o.mode === 'quick' ? QUICK_STEPS : EXPRESS_STEPS;
  const stage = marks.filter((s) => elapsed >= s).length;

  const labels =
    o.mode === 'quick'
      ? ['Order confirmed', `Packed at ${STORE}`, 'Picked up by rider', 'On the way', 'Delivered']
      : ['Order confirmed', 'Shipped from Bengaluru hub', 'In transit to Kochi hub', 'Out for delivery', 'Delivered'];
  const last = labels.length - 1;
  const delivered = stage >= last;

  const timeline: TimelineStep[] = labels.map((label, i) => {
    const began = i === 0 ? o.at : o.at + marks[i - 1] * 1000;
    if (i < stage || delivered) return { label, time: clock(began), state: 'done' };
    if (i === stage) return { label, time: 'now', state: 'cur' };
    return { label, time: o.mode === 'express' && i === last - 1 ? dayText(EXPRESS_DAYS, false, o.at).slice(0, 3) : '—', state: 'todo' };
  });

  let status: OrderStatus;
  let headline: string;
  let statusLine: string;
  if (o.mode === 'quick') {
    status = delivered ? 'delivered' : stage >= 2 ? 'out' : stage === 1 ? 'packed' : 'placed';
    const left = Math.max(1, Math.ceil(((QUICK_STEPS[3] - elapsed) / QUICK_STEPS[3]) * QUICK_MINUTES));
    headline = delivered ? 'Delivered' : `Arriving in ${left} min${left === 1 ? '' : 's'}`;
    statusLine = delivered
      ? `Handed over at ${clock(o.at + QUICK_STEPS[3] * 1000)}`
      : stage >= 3
        ? `On the way · picked up from ${STORE} at ${clock(o.at + QUICK_STEPS[1] * 1000)}`
        : stage === 2
          ? `Picked up · leaving ${STORE}`
          : stage === 1
          ? `Packed · waiting for the rider at ${STORE}`
          : `Confirmed · being packed at ${STORE}`;
  } else {
    status = stage >= 1 ? 'shipped' : 'placed';
    headline = `Arriving ${dayText(EXPRESS_DAYS, true, o.at)}`;
    statusLine = stage >= 1 ? 'Shipped · left the Bengaluru hub' : 'Confirmed · dispatches within 24 hours';
  }

  return {
    ref: o.ref,
    at: o.at,
    placedText: placedText(o.at),
    mode: o.mode,
    status,
    headline,
    statusLine,
    eta: o.mode === 'quick' ? QUICK_ETA : dayText(EXPRESS_DAYS, false, o.at),
    lines: o.lines,
    total: o.total,
    payNote: o.payNote,
    address: o.address,
    slot: o.slot,
    timeline,
    otp: delivered ? '' : o.otp,
    rider:
      o.mode === 'quick' && stage >= 2 && !delivered
        ? { name: 'Arun R', note: 'KL 07 BX 4521 · 4.9 rating · 1,240 deliveries' }
        : undefined,
    canCancel: stage === 0,
    returns: o.returns ?? [],
    substitutes: [],
  };
}

function computeBill(items: Record<string, number>, coupon?: string | null, slotFee = 0, usePoints = false): Bill {
  const modes: Record<string, Mode> = {};
  const sub: Record<Mode, number> = { quick: 0, express: 0 };
  let mrp = 0;
  let count = 0;
  for (const [id, qty] of Object.entries(items)) {
    const prod = PRODUCTS[id];
    if (!prod || qty <= 0) continue;
    modes[id] = prod.mode;
    sub[prod.mode] += prod.price * qty;
    mrp += (prod.mrp ?? prod.price) * qty;
    count += 1;
  }
  const itemsTotal = sub.quick + sub.express;

  const fees: Partial<Record<Mode, FeeLine>> = {};
  let feeTotal = 0;
  for (const mode of ['quick', 'express'] as Mode[]) {
    if (!Object.values(modes).includes(mode)) continue;
    const rule = FEE[mode];
    const fee = sub[mode] >= rule.freeAbove ? 0 : rule.fee;
    fees[mode] = { fee, was: rule.fee, freeAbove: rule.freeAbove };
    feeTotal += fee;
  }

  const pointsValue = DEMO_POINTS / POINTS_PER_RUPEE;
  const pointsOff = usePoints && count ? pointsValue : 0;
  const applied = coupon === COUPON.code && itemsTotal > COUPON.off;
  const couponOff = applied ? COUPON.off : 0;

  return {
    modes,
    count,
    mrp,
    items: itemsTotal,
    fees,
    slotFee,
    coupon: applied ? COUPON.code : null,
    couponOff,
    couponHint: applied || !count ? undefined : { code: COUPON.code, saves: COUPON.off },
    total: itemsTotal + feeTotal + slotFee - couponOff - pointsOff,
    saved: mrp - itemsTotal + couponOff,
    points: count ? { usable: DEMO_POINTS, value: pointsValue, applied: usePoints, off: pointsOff } : undefined,
  };
}

function slotList(): Slot[] {
  return [
    { key: 'now', mode: 'quick', title: 'Now', note: `Arrives in about ${QUICK_ETA}`, fee: 0, tag: 'Fastest' },
    { key: 'evening', mode: 'quick', title: 'Schedule', note: 'Today, 6:00–8:00 pm', fee: 0 },
    { key: 'std', mode: 'express', title: 'Standard', note: dayText(EXPRESS_DAYS, true), fee: 0 },
    { key: 'priority', mode: 'express', title: 'Priority', note: dayText(PRIORITY_DAYS, true), fee: 49, tag: 'Faster' },
  ];
}

const PAY_NAMES: Record<string, string> = {
  upi: 'UPI',
  wallet: '369 Wallet',
  card: 'card',
  netbanking: 'net banking',
  cod: 'cash on delivery',
};

async function signedIn(): Promise<DemoState & { customer: Customer }> {
  const s = await load();
  if (!s.customer) throw new ApiError('unauthorized', 'Sign in to continue.');
  return s as DemoState & { customer: Customer };
}

export const mockAdapter: ApiAdapter = {
  async home(mode) {
    const feed: HomeFeed = {
      eta: mode === 'quick' ? QUICK_ETA : '2–5 days',
      tabs: [
        { key: 'home', label: 'Home', icon: 'home', target: 'home' },
        { key: 'components', label: 'Components', icon: 'cpu', target: 'components' },
        { key: 'peripherals', label: 'Peripherals', icon: 'kb', target: 'peripherals' },
        { key: 'offers', label: 'Offers', icon: 'pct', target: 'offers' },
        { key: 'orders', label: 'Orders', icon: 'orders', target: 'orders' },
      ],
      banners: BANNERS[mode],
      tiles: CATEGORIES.flatMap((c) => (c.subs.length ? c.subs.map((s) => ({ ...s, slug: `${c.slug}/${s.slug}` })) : [c])),
      moreCategories: 22,
      deal: { text: 'up to 27% off', endsAt: new Date().setHours(23, 59, 59, 0) },
      sections: [
        mode === 'quick'
          ? { key: 'desk', title: 'Desk essentials', subtitle: `at your door in ${QUICK_ETA}`, items: RAILS.quick.map((id) => shownIn(mode, id)), route: 'peripherals' }
          : { key: 'build', title: 'Build your PC', subtitle: 'ships in 2–5 days', items: RAILS.express.map((id) => shownIn(mode, id)), route: 'components' },
        { key: 'again', title: 'Buy again', items: BUY_AGAIN.map((id) => shownIn(mode, id)) },
      ],
      brands: BRANDS,
      searchHint: mode === 'quick' ? 'mechanical keyboard' : 'rtx 4070',
    };
    return wait(feed);
  },

  async catalog() {
    return wait(CATEGORIES);
  },

  async browse(slug, sub) {
    const category = findCategory(slug);
    if (!category) throw new ApiError('not_found', 'That category is no longer here.');
    const shown = sub ? category.subs.find((s) => s.slug === sub) : category;
    if (!shown) throw new ApiError('not_found', 'That category is no longer here.');
    return wait({ category, sub: sub ? shown : null, items: inCategory(shown) });
  },

  async search(q) {
    return wait(matching(q));
  },

  async suggest(q) {
    return wait(matching(q).slice(0, 8));
  },

  async trending() {
    return wait(['mechanical keyboard', 'rtx 4070', 'ddr4 16gb', 'nvme ssd', 'gaming mouse', 'core i5']);
  },

  async offers() {
    const saving = (x: Product) => 1 - x.price / (x.mrp ?? x.price);
    return wait(all().filter((x) => saving(x) > 0).sort((x, y) => saving(y) - saving(x)));
  },

  async product(id) {
    const product = PRODUCTS[id];
    if (!product) throw new ApiError('not_found', 'That product is no longer sold.');
    const { together, ...extra } = detailExtra(id);
    return wait({
      product,
      ...extra,
      together: (together ?? []).map((t) => PRODUCTS[t]).filter(Boolean),
      quickNote: `From ${STORE} · ₹30 fee waived above ₹499`,
      expressNote: 'Ships from the Kochi hub · free delivery above ₹999',
    });
  },

  async products(ids) {
    return wait(ids.map((id) => PRODUCTS[id]).filter(Boolean));
  },

  async bill(req) {
    return wait(computeBill(req.items, req.coupon, req.slotFee, req.usePoints));
  },

  async slots() {
    return wait(slotList());
  },

  async locate() {
    return wait({ line: '', area: 'MG Road, Ernakulam', city: 'Kochi', zip: '682016' });
  },

  async lookupPin(pin) {
    return wait(pin.startsWith('682') ? { town: 'Kochi', state: 'Kerala' } : null);
  },

  async draftOrder(req) {
    const s = await signedIn();
    const address = s.addresses.find((a) => a.id === req.addressId);
    if (!address) throw new ApiError('invalid', 'Choose a delivery address.', 'address');
    const slot = slotList().find((x) => x.key === req.slotKey);
    const bill = computeBill(req.items, req.coupon, slot?.fee ?? 0, req.usePoints);
    if (!bill.count) throw new ApiError('invalid', 'Your cart is empty.');
    let ref = req.ref ?? '';
    while (!ref || (ref !== req.ref && s.orders.some((o) => o.ref === ref) && s.orders.length < 90)) {
      ref = `369${String(Math.floor(Math.random() * 90) + 10)}`;
    }
    drafts[ref] = { req, address, slot, bill };

    const amount = bill.total;
    const wallet = s.customer.walletBalance ?? 0;
    const methods: PayMethod[] = [
      { code: 'upi', title: 'UPI', note: 'GPay, PhonePe, Paytm', mark: 'UPI', enabled: true },
      { code: 'wallet', title: '369 Wallet', note: `Balance ₹${wallet}`, mark: '369', enabled: wallet >= amount },
      { code: 'card', title: 'Credit or debit card', note: 'Visa, Mastercard, RuPay', mark: 'VISA', enabled: true },
      { code: 'netbanking', title: 'Net banking', note: 'All major banks', mark: 'NB', enabled: true },
      {
        code: 'cod',
        title: 'Cash on delivery',
        note: amount > COD_LIMIT ? 'Not available above ₹5,000' : 'Pay the rider in cash or by UPI',
        mark: '₹',
        enabled: amount <= COD_LIMIT,
      },
    ];
    return wait({ ref, total: amount, methods });
  },

  async me() {
    return (await load()).customer;
  },

  async login(login) {
    const s = await load();
    if (!login.trim()) throw new ApiError('invalid', 'Enter your email.', 'login');
    s.customer = { ...DEMO_CUSTOMER, email: login.includes('@') ? login.trim() : DEMO_CUSTOMER.email };
    if (!s.addresses.length) s.addresses = [DEMO_ADDRESS];
    await save();
    return wait(s.customer);
  },

  async signup(input) {
    const s = await load();
    s.customer = { name: input.name.trim(), email: input.email.trim(), phone: input.phone?.trim() ?? '', walletBalance: 0 };
    s.addresses = [];
    Object.assign(s, freshExtras(), { wish: [], ledger: [], cards: [], upis: [] });
    s.orders = [];
    await save();
    return wait(s.customer);
  },

  async logout() {
    const s = await load();
    s.customer = null;
    await save();
  },

  async phoneForm() {
    const countries = [
      { code: 'IN', name: 'India', dial: '+91' },
      { code: 'OM', name: 'Oman', dial: '+968' },
      { code: 'AE', name: 'United Arab Emirates', dial: '+971' },
    ];
    return wait({ country: countries[0], countries, hint: { length: 10, example: '9876543210' } });
  },

  async phoneStart(input) {
    if (input.phone.replace(/\D/g, '').length < 8) {
      throw new ApiError('invalid', 'Enter a valid mobile number.', 'phone');
    }
    if (input.purpose === 'signup' && (input.name ?? '').trim().length < 2) {
      throw new ApiError('invalid', 'Enter your name as it should appear on deliveries.', 'name');
    }
    return wait({ message: 'Demo mode: the code is 123456.', resendIn: 60 });
  },

  async phoneVerify(input) {
    if (input.code !== '123456') throw new ApiError('invalid', 'That code is not right.', 'code');
    const s = await load();
    const dial = (await mockAdapter.phoneForm()).countries.find((c) => c.code === input.country)?.dial ?? '';
    const phone = `${dial}${input.phone.replace(/\D/g, '')}`;
    if (input.purpose === 'add' && s.customer) {
      s.customer = { ...s.customer, phone, phoneVerified: true, needPhone: false };
    } else {
      const name = input.purpose === 'signup' ? (input.name ?? '').trim() : DEMO_CUSTOMER.name;
      s.customer = { ...DEMO_CUSTOMER, name, email: '', phone, phoneVerified: true, needPhone: false };
      if (!s.addresses.length) s.addresses = [DEMO_ADDRESS];
    }
    await save();
    return wait({ customer: s.customer, created: input.purpose === 'signup', joined: { orders: 0, addresses: s.addresses.length } });
  },

  async addresses() {
    return wait([...(await signedIn()).addresses]);
  },

  async saveAddress(input, id) {
    const s = await signedIn();
    const address: Address = { ...input, id: id ?? `a${Date.now()}` };
    if (address.isDefault || !s.addresses.length) {
      address.isDefault = true;
      s.addresses = s.addresses.map((a) => ({ ...a, isDefault: false }));
    }
    s.addresses = id ? s.addresses.map((a) => (a.id === id ? address : a)) : [...s.addresses, address];
    await save();
    return wait(address);
  },

  async deleteAddress(id) {
    const s = await signedIn();
    s.addresses = s.addresses.filter((a) => a.id !== id);
    if (s.addresses.length && !s.addresses.some((a) => a.isDefault)) s.addresses[0].isDefault = true;
    await save();
  },

  async payOrder(ref, pay) {
    const s = await signedIn();
    const draft = drafts[ref];
    if (!draft) throw new ApiError('not_found', 'That order has expired. Go back and try again.');
    const { req, address, slot, bill } = draft;
    delete drafts[ref];

    const lines: OrderLine[] = Object.entries(req.items)
      .filter(([id, qty]) => PRODUCTS[id] && qty > 0)
      .map(([id, qty]) => ({
        id,
        name: PRODUCTS[id].name,
        qty,
        price: PRODUCTS[id].price,
        image: PRODUCTS[id].images[0],
        mode: bill.modes[id],
      }));

    const order: DemoOrder = {
      ref,
      at: Date.now(),
      // One Quick line makes it a Quick order, as the shop does it.
      mode: lines.some((l) => l.mode === 'quick') ? 'quick' : 'express',
      lines,
      total: bill.total,
      payNote: pay === 'cod' ? 'Pay on delivery' : `Paid by ${PAY_NAMES[pay]}`,
      address,
      slot: slot ? `${slot.title} · ${slot.note}` : '',
      otp: String(Math.floor(Math.random() * 9000) + 1000),
    };
    s.orders = [order, ...s.orders];
    if (pay === 'wallet' && s.customer.walletBalance !== undefined) {
      s.customer = { ...s.customer, walletBalance: Math.max(0, s.customer.walletBalance - bill.total) };
    }
    await save();
    return wait(present(order));
  },

  async cancelOrder(ref) {
    const s = await signedIn();
    const found = s.orders.find((o) => o.ref === ref);
    if (!found) throw new ApiError('not_found', 'That order is not on this account.');
    found.cancelled = true;
    await save();
    return wait(present(found));
  },

  async requestReturn(ref, input) {
    const s = await signedIn();
    const found = s.orders.find((o) => o.ref === ref);
    if (!found) throw new ApiError('not_found', 'That order is not on this account.');
    if (present(found).status !== 'delivered') {
      throw new ApiError('invalid', 'You can ask for a return once the order has been delivered.');
    }
    if (!input.reason.trim()) throw new ApiError('invalid', 'Tell us what went wrong.', 'reason');
    found.returns = [
      ...(found.returns ?? []),
      {
        id: `ret${Date.now()}`,
        kind: input.kind,
        state: 'requested',
        reason: input.reason,
        detail: input.detail,
        amount: found.total,
        refunded: 0,
        photos: input.photos.length,
        at: Date.now(),
      },
    ];
    await save();
    return wait(present(found));
  },

  async answerSubstitute() {
    // The demo shop never runs out of anything.
    throw new ApiError('not_found', 'No such replacement.');
  },

  async rateOrder(ref, input) {
    const s = await signedIn();
    if (!s.orders.some((o) => o.ref === ref)) throw new ApiError('not_found', 'That order is not on this account.');
    if (!(input.stars >= 1 && input.stars <= 5)) throw new ApiError('invalid', 'Choose a rating first.', 'stars');
    await wait(null);
  },

  async invoice() {
    throw new ApiError('not_found', 'The demo has no invoices. They come from the real shop.');
  },

  async myReviews() {
    return wait({ ...(await signedIn()).reviews });
  },

  async writeReview(productId, input) {
    const s = await signedIn();
    if (!(input.stars >= 1 && input.stars <= 5)) throw new ApiError('invalid', 'Choose a rating first.', 'stars');
    const review: MyReview = {
      stars: input.stars,
      title: input.title.trim(),
      text: input.text.trim(),
      at: Date.now(),
      state: 'published',
      heldReason: '',
      photos: s.reviews[productId]?.photos ?? 0,
      verified: s.orders.some((o) => o.lines.some((l) => l.id === productId)),
    };
    s.reviews = { ...s.reviews, [productId]: review };
    await save();
    return wait(review);
  },

  async deleteReview(productId) {
    const s = await signedIn();
    const next = { ...s.reviews };
    delete next[productId];
    s.reviews = next;
    await save();
  },

  async addReviewPhoto(productId) {
    const s = await signedIn();
    const review = s.reviews[productId];
    if (!review) throw new ApiError('not_found', 'Write the review first, then add photos.');
    const next = { ...review, photos: review.photos + 1 };
    s.reviews = { ...s.reviews, [productId]: next };
    await save();
    return wait(next);
  },

  async supportStart() {
    await signedIn();
    return wait({
      greeting: { from: 'bot' as const, text: 'Hello! How can I help you today?', chips: SUPPORT_CHIPS },
      withAgent: demoChat.length > 0,
      history: [...demoChat],
    });
  },

  async supportAsk(text) {
    const s = await signedIn();
    const said = text.toLowerCase();
    if (said.includes('agent') || said.includes('person') || said.includes('human')) {
      return wait({ reply: { from: 'bot' as const, text: 'Connecting you to a support agent…' }, toAgent: true });
    }
    let reply: ChatMessage;
    if (said.includes('track') || said.includes('where')) {
      const latest = s.orders[0];
      reply = latest
        ? {
            from: 'bot',
            text: `Order #${latest.ref}: ${present(latest).headline.toLowerCase()}.`,
            actions: [{ label: `Track #${latest.ref}`, go: ['track', latest.ref] }],
          }
        : { from: 'bot', text: 'You have no orders on the way right now.', chips: SUPPORT_CHIPS };
    } else if (said.includes('deliver') || said.includes('charge') || said.includes('fee')) {
      reply = { from: 'bot', text: 'Quick: ₹30 delivery, free above ₹499. Express: ₹49 delivery, free above ₹999.' };
    } else if (said.includes('refund')) {
      reply = { from: 'bot', text: 'Refunds go to your 369 Wallet as soon as the shop approves them.', actions: [{ label: 'Open wallet', go: ['account', 'wallet'] }] };
    } else if (said.includes('cancel')) {
      reply = { from: 'bot', text: 'You can cancel an order from its page until it is packed.', actions: [{ label: 'My orders', go: ['orders'] }] };
    } else if (said.includes('pay')) {
      reply = { from: 'bot', text: 'If money left your account but the order did not go through, it comes back within 5 working days.' };
    } else {
      reply = { from: 'bot', text: "I'm not sure I got that. Pick a topic below, or I can connect you to a person.", chips: SUPPORT_CHIPS };
    }
    return wait({ reply, toAgent: false });
  },

  async supportAgent(text) {
    await signedIn();
    demoChat = [{ from: 'me', text, at: Date.now() }];
    return wait({
      reply: "Hi, I'm Anjali from 369 Mart support. I can see your recent orders - tell me what went wrong.",
      history: [...demoChat],
    });
  },

  async supportSay(text) {
    await signedIn();
    demoChat = [...demoChat, { from: 'me', text, at: Date.now() }];
    return wait({ reply: "Thanks for the details. I've noted this and will get back to you here shortly." });
  },

  async supportTicket() {
    await signedIn();
    return wait(demoChat.length ? [...demoChat] : null);
  },

  async wishlist() {
    return wait([...(await signedIn()).wish]);
  },

  async addWish(id) {
    const s = await signedIn();
    s.wish = [id, ...s.wish.filter((x) => x !== id)];
    await save();
    return wait([...s.wish]);
  },

  async removeWish(id) {
    const s = await signedIn();
    s.wish = s.wish.filter((x) => x !== id);
    await save();
    return wait([...s.wish]);
  },

  async wallet() {
    const s = await signedIn();
    return wait({ balance: s.customer.walletBalance ?? 0, limit: WALLET_LIMIT, minTopup: MIN_TOPUP, ledger: [...s.ledger] });
  },

  async topUp(amount) {
    const s = await signedIn();
    const balance = s.customer.walletBalance ?? 0;
    if (!(amount >= MIN_TOPUP)) throw new ApiError('invalid', `Add at least ₹${MIN_TOPUP}.`, 'amount');
    if (balance + amount > WALLET_LIMIT) throw new ApiError('invalid', `The wallet holds up to ₹${WALLET_LIMIT}.`, 'amount');
    s.customer = { ...s.customer, walletBalance: balance + amount };
    s.ledger = [{ id: `w${Date.now()}`, kind: 'add', amount, title: 'Money added', sub: 'UPI', at: Date.now() }, ...s.ledger];
    await save();
    return wait({ balance: balance + amount, limit: WALLET_LIMIT, minTopup: MIN_TOPUP, ledger: [...s.ledger] });
  },

  async rewards() {
    const s = await signedIn();
    return wait({
      coupons: [{ code: COUPON.code, title: 'Flat ₹50 off', note: 'On any order above ₹50' }],
      cards: [...s.cards],
      won: s.cards.filter((c) => c.scratched && c.reward.code).map((c) => c.reward.code as string),
    });
  },

  async scratch(id) {
    const s = await signedIn();
    const card = s.cards.find((c) => c.id === id);
    if (!card) throw new ApiError('not_found', 'That card is not on this account.');
    if (!card.scratched) {
      card.scratched = true;
      if (card.reward.type === 'cash' && card.reward.amount) {
        const amount = card.reward.amount;
        s.customer = { ...s.customer, walletBalance: (s.customer.walletBalance ?? 0) + amount };
        s.ledger = [{ id: `w${Date.now()}`, kind: 'reward', amount, title: 'Scratch card reward', sub: card.from, at: Date.now() }, ...s.ledger];
      }
      await save();
    }
    return wait({ ...card });
  },

  async referrals() {
    await signedIn();
    return wait({
      code: 'BALA369',
      link: 'https://369mart.in/r/BALA369',
      reward: 500,
      earned: 500,
      pending: 500,
      joined: 2,
      ordered: 1,
      friends: [
        { id: 'r2', name: 'Anjali', status: 'joined', at: Date.now() - 3 * 86400000 },
        { id: 'r1', name: 'Rahul', status: 'ordered', at: Date.now() - 9 * 86400000 },
      ],
    });
  },

  async points() {
    await signedIn();
    return wait({
      enabled: true,
      points: DEMO_POINTS,
      value: DEMO_POINTS / POINTS_PER_RUPEE,
      cardNumber: '3690 0412 7731',
      rule: { spend: 100, earn: 10, minRedeem: 100 },
      earnOn: 'delivered',
      history: [
        { id: 'p2', title: 'Points earned', sub: 'Order #36918', points: 90, credit: true, at: Date.now() - 4 * 86400000 },
        { id: 'p1', title: 'Welcome points', sub: '', points: 30, credit: true, at: Date.now() - 12 * 86400000 },
      ],
    });
  },

  async notifications() {
    return wait([...(await signedIn()).notices]);
  },

  async markRead(ids) {
    const s = await signedIn();
    s.notices = s.notices.map((n) => (ids === 'all' || ids.includes(n.id) ? { ...n, read: true } : n));
    await save();
  },

  async dismissNotice(id) {
    const s = await signedIn();
    s.notices = s.notices.filter((n) => n.id !== id);
    await save();
  },

  async saveProfile(input) {
    const s = await signedIn();
    if (!input.name.trim()) throw new ApiError('invalid', 'Enter your name.', 'name');
    if (input.email && !/^\S+@\S+\.\S+$/.test(input.email.trim())) {
      throw new ApiError('invalid', 'Enter a valid email address.', 'email');
    }
    s.customer = { ...s.customer, name: input.name.trim(), email: input.email?.trim() || s.customer.email };
    await save();
    return wait(s.customer);
  },

  async savedUpis() {
    return wait([...(await signedIn()).upis]);
  },

  async addUpi(vpa) {
    const s = await signedIn();
    const clean = vpa.trim().toLowerCase();
    if (!/^[a-z0-9._-]{2,}@[a-z]{2,}$/.test(clean)) throw new ApiError('invalid', 'Enter a UPI ID like name@bank.', 'vpa');
    if (s.upis.some((u) => u.vpa === clean)) throw new ApiError('invalid', 'This UPI ID is already saved.', 'vpa');
    s.upis = [...s.upis, { id: `u${Date.now()}`, vpa: clean, app: 'upi', isDefault: !s.upis.length }];
    await save();
    return wait([...s.upis]);
  },

  async removeUpi(id) {
    const s = await signedIn();
    s.upis = s.upis.filter((u) => u.id !== id);
    if (s.upis.length && !s.upis.some((u) => u.isDefault)) s.upis[0] = { ...s.upis[0], isDefault: true };
    await save();
    return wait([...s.upis]);
  },

  async recentSearches() {
    return wait([...(await load()).recent]);
  },

  async addRecentSearch(q) {
    const s = await load();
    const term = q.trim().toLowerCase();
    if (term) s.recent = [term, ...s.recent.filter((x) => x !== term)].slice(0, 8);
    await save();
    return wait([...s.recent]);
  },

  async clearRecentSearches() {
    const s = await load();
    s.recent = [];
    await save();
    return wait([]);
  },

  async orders() {
    return wait((await signedIn()).orders.map(present));
  },

  async order(ref) {
    const found = (await signedIn()).orders.find((o) => o.ref === ref);
    if (!found) throw new ApiError('not_found', 'That order is not on this account.');
    return wait(present(found));
  },
};
