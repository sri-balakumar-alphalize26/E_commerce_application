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
  /** The choices made on a product that has them: "Lenovo · Core i7 · 16GB". */
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
  /** The map pin. The shop measures from it to decide whether Quick reaches this address. */
  lat?: number;
  lng?: number;
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
  /** Pay part of the bill with points. */
  usePoints?: boolean;
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
  /** Points the customer could spend on this bill, when the shop lets them. */
  points?: { usable: number; value: number; applied: boolean; off: number };
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

/** A refund or replacement the customer asked for on a delivered order. */
export interface OrderReturn {
  id: string;
  kind: 'refund' | 'replace';
  /** requested, pickup, picked, done, refused. */
  state: string;
  reason: string;
  detail: string;
  amount: number;
  /** What has actually gone back to the wallet. */
  refunded: number;
  photos: number;
  at: number | null;
}

/** The shop offering something else for an item that ran out. */
export interface Substitute {
  id: string;
  /** offered (waiting for the customer), accepted, declined, expired, withdrawn. */
  state: string;
  /** What was ordered. */
  was: string;
  qty: number;
  wasPrice: number;
  options: { id: string; name: string; image?: Img; price: number; youPay: number }[];
  chosen?: string;
  /** When the offer lapses and the item is refunded instead. */
  deadline: number | null;
  refund: number;
}

/** The customer's own review of a product. */
export interface MyReview {
  stars: number;
  title: string;
  text: string;
  at: number | null;
  /** published, or held back by the shop. */
  state: string;
  heldReason: string;
  photos: number;
  verified: boolean;
}

/** A photo off the phone, ready to send. */
export interface PhotoUpload {
  name: string;
  mime: string;
  /** Base64, no data: prefix. */
  data: string;
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
  returns: OrderReturn[];
  substitutes: Substitute[];
  /** Which door the order came in by. A WhatsApp order is managed in the chat. */
  channel?: 'website' | 'whatsapp';
}

export interface DraftRequest {
  items: Record<string, number>;
  addressId: string;
  slotKey: string;
  coupon?: string | null;
  /** The reference of the draft being re-priced, so it stays one order. */
  ref?: string;
  usePoints?: boolean;
  /** Send order updates on WhatsApp. */
  whatsapp?: boolean;
  /** A note for the rider: "Ring the bell twice". */
  instructions?: string;
}

/** An order the shop has written down and priced, waiting to be paid for. */
export interface Draft {
  ref: string;
  total: number;
  methods: PayMethod[];
}

/** What the shop makes of a map position: the address around it. */
export interface Place {
  line: string;
  area: string;
  city: string;
  zip: string;
  stateId?: number;
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
  /** The number was proven with a WhatsApp code. */
  phoneVerified?: boolean;
  /** No proven number yet (an older email account): "Add your mobile number" comes first. */
  needPhone?: boolean;
}

/** A country the number picker offers. `dial` is "+91". */
export interface Country {
  code: string;
  name: string;
  dial: string;
}

/** The number picker's data, before anyone is signed in. The default country is the shop's. */
export interface PhoneForm {
  country: Country;
  countries: Country[];
  /** Digits in a mobile number for the default country, and an example of one. */
  hint?: { length: number; example: string };
}

/** signin: number + code. signup: name + number + code. add: a signed-in account proving its number. */
export type PhonePurpose = 'signin' | 'signup' | 'add';

export interface PhoneStartInput {
  phone: string;
  /** ISO code from the picker, "IN". */
  country: string;
  purpose: PhonePurpose;
  name?: string;
}

export interface PhoneVerifyInput extends PhoneStartInput {
  code: string;
  referral?: string;
  /** Only for an account whose number was saved but never proven, once. */
  password?: string;
}

export interface PhoneVerifyResult {
  customer: Customer;
  /** True when this sign-in made the account. */
  created: boolean;
  /** What the account now holds from WhatsApp. */
  joined: { orders: number; addresses: number };
}

/** One line of the wallet's history. `amount` is always positive; the kind says which way it went. */
export interface WalletEntry {
  id: string;
  /** add, spend, refund, reward. */
  kind: string;
  amount: number;
  title: string;
  sub: string;
  at: number;
}

export interface Wallet {
  balance: number;
  /** The most the wallet may hold. */
  limit: number;
  minTopup: number;
  ledger: WalletEntry[];
}

export interface Coupon {
  code: string;
  title: string;
  note: string;
}

export interface ScratchCard {
  id: string;
  /** Where it came from: "Order 369M-…". */
  from: string;
  scratched: boolean;
  /** What is under the foil: cash into the wallet, or a coupon. */
  reward: { type: string; amount?: number; code?: string; title?: string };
}

export interface Rewards {
  coupons: Coupon[];
  cards: ScratchCard[];
  /** Coupon codes won from scratch cards. */
  won: string[];
}

export interface Referrals {
  code: string;
  link: string;
  /** What one friend's first order earns. */
  reward: number;
  earned: number;
  pending: number;
  joined: number;
  ordered: number;
  friends: { id: string; name: string; status: string; at: number | null }[];
}

export interface PointsEntry {
  id: string;
  title: string;
  sub: string;
  points: number;
  credit: boolean;
  at: number | null;
  orderRef?: string;
}

export interface Points {
  /** False when the shop runs no points scheme. */
  enabled: boolean;
  points: number;
  /** What those points are worth in money. */
  value: number;
  cardNumber: string;
  rule: { spend: number; earn: number; minRedeem: number } | null;
  /** When points for an order arrive: "delivered". */
  earnOn: string;
  history: PointsEntry[];
}

export interface Notice {
  id: string;
  /** order, wallet, offer… */
  type: string;
  title: string;
  text: string;
  at: number;
  read: boolean;
  /** Where tapping it leads, as the shop names places: ["track", ref], ["account", "wallet"]. */
  go?: string[];
}

export interface SavedUpi {
  id: string;
  vpa: string;
  app: string;
  isDefault: boolean;
}

/** One line of the support chat. */
export interface ChatMessage {
  from: 'me' | 'bot' | 'agent';
  text: string;
  at?: number | null;
  /** Quick answers to tap, under a bot message. */
  chips?: string[];
  /** Places a bot message can take the customer: ["track", ref]. */
  actions?: { label: string; go: string[] }[];
}

export type ApiErrorCode = 'network' | 'unauthorized' | 'not_found' | 'invalid' | 'unknown';

export class ApiError extends Error {
  code: ApiErrorCode;
  /** The form field the server blames, when it names one. */
  field?: string;
  /** Anything else the shop said with the refusal: { signup: true }, { needPassword: true }. */
  info: Record<string, unknown>;
  constructor(code: ApiErrorCode, message: string, field?: string, info: Record<string, unknown> = {}) {
    super(message);
    this.code = code;
    this.field = field;
    this.info = info;
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

  /** Default country (the shop's) and every country, for the number picker. */
  phoneForm(): Promise<PhoneForm>;
  /** Send a 6-digit code to the number's WhatsApp. Says why not, in words, when it can't. */
  phoneStart(input: PhoneStartInput): Promise<{ message: string; resendIn: number }>;
  /** The code (and once, maybe, a password) signs in, signs up or proves the number. */
  phoneVerify(input: PhoneVerifyInput): Promise<PhoneVerifyResult>;

  addresses(): Promise<Address[]>;
  saveAddress(input: AddressInput, id?: string): Promise<Address>;
  deleteAddress(id: string): Promise<void>;

  /** What a PIN code belongs to, to fill the address form. Null when unknown. */
  lookupPin(pin: string): Promise<PinLookup | null>;
  /** The address around a map position, to fill the form. Null when the shop cannot place it. */
  locate(lat: number, lng: number): Promise<Place | null>;

  /**
   * Checkout in two steps, as the shop does it: write the order down (which
   * prices it and says how it can be paid), then pay. Drafting again with the
   * same reference re-prices the same order.
   */
  draftOrder(req: DraftRequest): Promise<Draft>;
  payOrder(ref: string, pay: PayCode): Promise<Order>;
  cancelOrder(ref: string, reason: string): Promise<Order>;

  /** Ask for a refund or a replacement on a delivered order. */
  requestReturn(ref: string, input: { kind: 'refund' | 'replace'; reason: string; detail: string; photos: PhotoUpload[] }): Promise<Order>;
  /** Take or turn down what the shop offered for an item that ran out. */
  answerSubstitute(ref: string, offerId: string, accept: boolean, productId?: string): Promise<Order>;
  rateOrder(ref: string, input: { stars: number; comment: string }): Promise<void>;
  /**
   * Fetch the order's invoice. Resolves with the PDF as base64 and a file
   * name; rejects with the shop's words when there is no invoice yet.
   */
  invoice(ref: string): Promise<{ name: string; base64: string }>;

  /** The customer's reviews, by product id. */
  myReviews(): Promise<Record<string, MyReview>>;
  writeReview(productId: string, input: { stars: number; title: string; text: string }): Promise<MyReview>;
  deleteReview(productId: string): Promise<void>;
  /** Add a photo to a review already written. It shows to others once the shop approves it. */
  addReviewPhoto(productId: string, photo: PhotoUpload): Promise<MyReview>;

  /** Open the support chat: the greeting, or the conversation with a person already under way. */
  supportStart(): Promise<{ greeting: ChatMessage; withAgent: boolean; history: ChatMessage[] }>;
  /** Ask the bot. `toAgent` in the answer means it is handing over to a person. */
  supportAsk(text: string): Promise<{ reply: ChatMessage; toAgent: boolean }>;
  /** Ask for a person. Opens a ticket the shop's staff see. */
  supportAgent(text: string): Promise<{ reply: string; history: ChatMessage[] }>;
  supportSay(text: string): Promise<{ reply: string }>;
  /** The conversation with staff as it now stands, or null when none is open. */
  supportTicket(): Promise<ChatMessage[] | null>;

  /** Product ids on My list, newest first. Adding and removing answer with the list as it now stands. */
  wishlist(): Promise<string[]>;
  addWish(id: string): Promise<string[]>;
  removeWish(id: string): Promise<string[]>;

  wallet(): Promise<Wallet>;
  /** Add money. Resolves with the wallet once the payment is confirmed; rejects when it is not. */
  topUp(amount: number): Promise<Wallet>;

  rewards(): Promise<Rewards>;
  scratch(id: string): Promise<ScratchCard>;
  referrals(): Promise<Referrals>;
  points(): Promise<Points>;

  notifications(): Promise<Notice[]>;
  /** Mark these read, or all of them. */
  markRead(ids: string[] | 'all'): Promise<void>;
  dismissNotice(id: string): Promise<void>;

  /** Name, and an optional email. The number changes only through a WhatsApp code (phoneStart 'add'). */
  saveProfile(input: { name: string; email?: string }): Promise<Customer>;

  savedUpis(): Promise<SavedUpi[]>;
  addUpi(vpa: string): Promise<SavedUpi[]>;
  removeUpi(id: string): Promise<SavedUpi[]>;

  recentSearches(): Promise<string[]>;
  addRecentSearch(q: string): Promise<string[]>;
  clearRecentSearches(): Promise<string[]>;
  orders(): Promise<Order[]>;
  order(ref: string): Promise<Order>;
}

export interface ServerConfig {
  url: string;
  db: string;
  /** Demo data instead of a server. */
  useMock: boolean;
}
