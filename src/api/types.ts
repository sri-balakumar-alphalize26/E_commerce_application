/**
 * What the app knows about the shop.
 *
 * These are the app's own shapes. The demo adapter builds them from fixtures
 * and the live adapter builds them from the website's `/369mart/*` answers, so
 * no screen ever reads a server field directly.
 */

/** Quick = from a nearby branch in minutes. Express = shipped in days (`all` on the wire). */
export type Mode = 'quick' | 'express';

/** A bundled photo (`require`) in demo data, an address on the live server. */
export type Img = number | string | { uri: string; width?: number; height?: number };

export interface Product {
  id: string;
  name: string;
  brand?: string;
  /** Pack size or unit, when the shop gives one. */
  unit?: string;
  price: number;
  mrp?: number;
  rating?: number;
  ratingCount?: number;
  images: Img[];
  /** Which way this product is delivered by default. */
  mode: Mode;
  /** When it arrives, as the shop words it: "13 mins", "Thu, 8 Oct · Free". */
  delivery?: string;
  /** Units left, sent only when few are. */
  low?: number;
  soldOut?: boolean;
  badge?: string;
  /** Has a choice to make, so Add opens the product instead of adding. */
  hasVariants?: boolean;
  category?: string;
}

export interface VariantGroup {
  name: string;
  options: { label: string; selected?: boolean; productId?: string }[];
}

export interface Review {
  stars: number;
  who: string;
  where?: string;
  text: string;
}

export interface ProductDetail {
  product: Product;
  /** "Keyboards · Mechanical" under the brand in the header. */
  trail?: string;
  variants: VariantGroup[];
  offers: { tag: string; text: string }[];
  highlights: string[];
  specs: [string, string][];
  /** Share of ratings, in percent, for 5, 4, 3, 2, 1 stars. */
  ratingBars?: [number, number, number, number, number];
  reviews: Review[];
  together: Product[];
  comboSaving?: number;
  /** Where Quick stock comes from, and what the fee rule is. */
  quickNote?: string;
  expressNote?: string;
}

/** The banner's colour family, as the shop names it. Unknown names fall back to navy. */
export type BannerTone = string;

export interface Banner {
  id: string;
  title: string;
  note: string;
  tone: BannerTone;
  image?: Img;
  /** Shown as a pill on the banner: which mode the offer belongs to. */
  pill?: string;
  href?: string;
}

export interface CategoryNode {
  slug: string;
  name: string;
  image?: Img;
  subs: CategoryNode[];
}

export interface HomeTab {
  key: string;
  label: string;
  icon: string;
  /** A category slug, or one of the app's own places: `home`, `offers`, `orders`. */
  target: string;
}

export interface HomeSection {
  key: string;
  title: string;
  subtitle?: string;
  items: Product[];
  /** Category slug behind "See all". */
  route?: string;
  /** A strip of banners between the product rows, instead of products. */
  banners?: Banner[];
}

export interface HomeFeed {
  eta: string;
  tabs: HomeTab[];
  banners: Banner[];
  tiles: CategoryNode[];
  moreCategories: number;
  /** The strip that leads to Offers. A countdown only when the shop gives an end. */
  deal?: { text: string; endsAt?: number };
  sections: HomeSection[];
  brands: string[];
  searchHint: string;
}

export interface Browse {
  category: CategoryNode;
  sub: CategoryNode | null;
  items: Product[];
}

export interface Address {
  id: string;
  /** Home, Work… */
  label: string;
  name: string;
  /** House number, building or apartment. */
  line: string;
  /** Road, area or colony. */
  area: string;
  city: string;
  zip: string;
  phone: string;
  isDefault: boolean;
  /** The shop's own ids for state and country, when it keeps them. */
  stateId?: number;
  countryId?: number;
}

export type AddressInput = Omit<Address, 'id'>;

export interface FeeLine {
  /** What is charged now. */
  fee: number;
  /** The fee before it was waived, to strike through. */
  was: number;
  freeAbove: number;
}

export interface BillRequest {
  items: Record<string, number>;
  coupon?: string | null;
  addressId?: string | null;
  slotFee?: number;
}

export interface Bill {
  /** How each basket line will be delivered to this address. */
  modes: Record<string, Mode>;
  count: number;
  mrp: number;
  items: number;
  /** Present only when that mode has lines in the basket. */
  fees: Partial<Record<Mode, FeeLine>>;
  /** One delivery figure, when the shop does not split it by mode. */
  deliveryFee?: number;
  slotFee: number;
  coupon: string | null;
  couponOff: number;
  /** A coupon the shopper could apply, to advertise on the cart. */
  couponHint?: { code: string; saves: number };
  total: number;
  saved: number;
  /** Set when the order cannot be placed as it stands, in the shop's words. */
  blocked?: string;
}

export interface Slot {
  key: string;
  mode: Mode;
  title: string;
  note: string;
  fee: number;
  tag?: string;
  /** The slot in the shop's own words, as it is written on the order. */
  label?: string;
}

export type PayCode = 'upi' | 'wallet' | 'card' | 'netbanking' | 'cod';

export interface PayMethod {
  code: PayCode;
  title: string;
  note: string;
  /** The small box beside it: UPI, VISA, ₹… */
  mark: string;
  enabled: boolean;
}

export type OrderStatus = 'placed' | 'packed' | 'shipped' | 'out' | 'delivered' | 'cancelled';

export interface TimelineStep {
  label: string;
  time: string;
  state: 'done' | 'cur' | 'todo';
}

export interface OrderLine {
  id: string;
  name: string;
  qty: number;
  price: number;
  image?: Img;
  mode: Mode;
}

export interface Rider {
  name: string;
  note: string;
  phone?: string;
}

export interface Order {
  ref: string;
  /** When it was placed, epoch ms. */
  at: number;
  placedText: string;
  mode: Mode;
  status: OrderStatus;
  /** "Arriving in 8 mins", "Arriving Monday, 6 Oct", "Delivered". */
  headline: string;
  statusLine: string;
  eta: string;
  lines: OrderLine[];
  total: number;
  payNote: string;
  address: Address | null;
  slot: string;
  timeline: TimelineStep[];
  /** The code the customer tells the rider at the door. Empty once used. */
  otp: string;
  /** Only when the server says who is bringing it. */
  rider?: Rider;
  canCancel: boolean;
}

export interface DraftRequest {
  items: Record<string, number>;
  addressId: string;
  slotKey: string;
  coupon?: string | null;
  /** The reference of the draft being re-priced, so it stays one order. */
  ref?: string;
}

/** An order the shop has written down and priced, waiting to be paid for. */
export interface Draft {
  ref: string;
  total: number;
  methods: PayMethod[];
}

export interface PinLookup {
  town: string;
  state: string;
  stateId?: number;
}

export interface Customer {
  name: string;
  email: string;
  phone: string;
  walletBalance?: number;
}

export type ApiErrorCode = 'network' | 'unauthorized' | 'not_found' | 'invalid' | 'unknown';

export class ApiError extends Error {
  code: ApiErrorCode;
  /** The form field the server blames, when it names one. */
  field?: string;
  constructor(code: ApiErrorCode, message: string, field?: string) {
    super(message);
    this.code = code;
    this.field = field;
  }
}

export interface ApiAdapter {
  home(mode: Mode): Promise<HomeFeed>;
  catalog(): Promise<CategoryNode[]>;
  browse(slug: string, sub?: string): Promise<Browse>;
  search(q: string): Promise<Product[]>;
  suggest(q: string): Promise<Product[]>;
  trending(): Promise<string[]>;
  /** Everything with money off, biggest saving first. */
  offers(): Promise<Product[]>;
  product(id: string): Promise<ProductDetail>;
  /** Cards for ids the phone is holding: the basket, the wishlist. */
  products(ids: string[]): Promise<Product[]>;
  bill(req: BillRequest): Promise<Bill>;
  slots(): Promise<Slot[]>;

  me(): Promise<Customer | null>;
  login(login: string, password: string): Promise<Customer>;
  signup(input: { name: string; email: string; password: string; phone?: string }): Promise<Customer>;
  logout(): Promise<void>;

  addresses(): Promise<Address[]>;
  saveAddress(input: AddressInput, id?: string): Promise<Address>;
  deleteAddress(id: string): Promise<void>;

  /** What a PIN code belongs to, to fill the address form. Null when unknown. */
  lookupPin(pin: string): Promise<PinLookup | null>;

  /**
   * Checkout in two steps, as the shop does it: write the order down (which
   * prices it and says how it can be paid), then pay. Drafting again with the
   * same reference re-prices the same order.
   */
  draftOrder(req: DraftRequest): Promise<Draft>;
  payOrder(ref: string, pay: PayCode): Promise<Order>;
  cancelOrder(ref: string, reason: string): Promise<Order>;
  orders(): Promise<Order[]>;
  order(ref: string): Promise<Order>;
}

export interface ServerConfig {
  url: string;
  db: string;
  /** Demo data instead of a server. */
  useMock: boolean;
}
