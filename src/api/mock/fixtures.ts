import { Address, Banner, CategoryNode, Customer, Mode, Product, ProductDetail } from '../types';

/**
 * Demo data: the catalogue drawn in the Storefront design.
 *
 * Names and prices follow the 369 Mart parts demo; MRPs, ratings, the address
 * and the customer are placeholders. The live adapter replaces all of it.
 */

const IMG = {
  k2: require('../../../assets/products/k2.jpg'),
  g102: require('../../../assets/products/g102.jpg'),
  ddr4: require('../../../assets/products/ddr4.jpg'),
  ssd: require('../../../assets/products/ssd.jpg'),
  i5: require('../../../assets/products/i5.jpg'),
  gpu: require('../../../assets/products/gpu.jpg'),
  lap: require('../../../assets/products/laptop.jpg'),
} as const;

export const QUICK_ETA = '13 mins';
export const STORE = 'Panampilly Nagar store';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const LONG_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Thu, 8 Oct" (or "Thursday, 8 Oct"), `ahead` days after `from`. */
export function dayText(ahead: number, long = false, from = Date.now()): string {
  const d = new Date(from + ahead * 86400000);
  return `${(long ? LONG_DAYS : DAYS)[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** Express arrives three days out; Priority, the day after tomorrow's eve. */
export const EXPRESS_DAYS = 3;
export const PRIORITY_DAYS = 1;

function p(
  id: keyof typeof IMG,
  name: string,
  brand: string,
  price: number,
  mrp: number,
  rating: number,
  ratingCount: number,
  mode: Mode,
  category: string,
  extra: Partial<Product> = {}
): Product {
  return {
    id,
    name,
    brand,
    price,
    mrp,
    rating,
    ratingCount,
    images: [IMG[id]],
    mode,
    category,
    delivery: mode === 'express' ? `${dayText(EXPRESS_DAYS)} · Free` : QUICK_ETA,
    ...extra,
  };
}

export const PRODUCTS: Record<string, Product> = {
  k2: p('k2', 'Keychron K2 Pro 75% Wireless Mechanical Keyboard, Gateron Brown', 'Keychron', 8900, 10500, 4.6, 312, 'quick', 'keyboards', { low: 3, badge: 'Bestseller' }),
  g102: p('g102', 'Logitech G102 Lightsync Wired Gaming Mouse, 8000 DPI', 'Logitech', 1450, 1995, 4.4, 2108, 'quick', 'mice'),
  ddr4: p('ddr4', 'Crucial 16GB DDR4-3200 Desktop Memory, CL22', 'Crucial', 3100, 3650, 4.5, 864, 'quick', 'memory'),
  ssd: p('ssd', 'Samsung 980 PRO 1TB PCIe 4.0 NVMe M.2 SSD', 'Samsung', 9499, 12999, 4.7, 1930, 'quick', 'storage'),
  i5: p('i5', 'Intel Core i5-14400F Desktop Processor, 10 cores, LGA1700', 'Intel', 16500, 18900, 4.7, 541, 'express', 'processors'),
  gpu: p('gpu', 'RTX 4070 SUPER 12GB Aero OC Graphics Card', 'Gigabyte', 56900, 62500, 4.8, 97, 'express', 'graphics-cards', { low: 2 }),
  lap: p('lap', 'Aspire Lite 14 Laptop, Core i3, 8GB RAM, 512GB SSD', 'Acer', 31900, 36900, 4.3, 228, 'express', 'laptops'),
};

export const RAILS: Record<Mode, string[]> = {
  quick: ['k2', 'g102', 'ddr4', 'ssd'],
  express: ['gpu', 'i5', 'lap', 'ssd'],
};
export const BUY_AGAIN = ['g102', 'ddr4', 'ssd'];
export const BRANDS = ['Intel', 'AMD', 'NVIDIA', 'Logitech', 'Samsung', 'Keychron', 'ASUS', 'MSI'];

function leaf(slug: string, name: string, img: keyof typeof IMG): CategoryNode {
  return { slug, name, image: IMG[img], subs: [] };
}

export const CATEGORIES: CategoryNode[] = [
  {
    slug: 'components',
    name: 'Components',
    image: IMG.i5,
    subs: [
      leaf('processors', 'Processors', 'i5'),
      leaf('graphics-cards', 'Graphics cards', 'gpu'),
      leaf('memory', 'Memory', 'ddr4'),
      leaf('storage', 'Storage', 'ssd'),
    ],
  },
  {
    slug: 'peripherals',
    name: 'Peripherals',
    image: IMG.k2,
    subs: [leaf('keyboards', 'Keyboards', 'k2'), leaf('mice', 'Mice', 'g102')],
  },
  { slug: 'laptops', name: 'Laptops', image: IMG.lap, subs: [] },
];

export const BANNERS: Record<Mode, Banner[]> = {
  quick: [
    { id: 'desk', title: 'Desk upgrade week', note: 'Keyboards & mice in minutes', tone: 'amber', image: IMG.k2, pill: 'Quick', href: 'peripherals' },
    { id: 'mice', title: 'Mice from ₹1,450', note: 'Logitech, Razer, Zebronics', tone: 'violet', image: IMG.g102, pill: 'Quick', href: 'peripherals/mice' },
    { id: 'ddr4', title: 'DDR4 kits', note: '16GB from ₹3,100', tone: 'green', image: IMG.ddr4, href: 'components/memory' },
  ],
  express: [
    { id: 'gpu', title: 'Up to 10% off graphics cards', note: 'Pick your parts, we ship the lot', tone: 'blue', image: IMG.gpu, pill: 'Express', href: 'components/graphics-cards' },
    { id: 'intel', title: '14th-gen Intel', note: 'i5 from ₹16,500', tone: 'violet', image: IMG.i5, pill: 'Express', href: 'components/processors' },
    { id: 'campus', title: 'Back to campus', note: 'From ₹31,900 · no-cost EMI', tone: 'green', image: IMG.lap, href: 'laptops' },
  ],
};

export const DEMO_CUSTOMER: Customer = {
  name: 'Bala Kumar',
  email: 'bala@alphalize.com',
  phone: '+91 70920 90133',
  walletBalance: 250,
};

export const DEMO_ADDRESS: Address = {
  id: 'a1',
  label: 'Home',
  name: 'Bala',
  line: '12 MG Road',
  area: 'Ernakulam',
  city: 'Kochi',
  zip: '682016',
  phone: '+91 70920 90133',
  isDefault: true,
};

type Extra = Omit<ProductDetail, 'product' | 'together' | 'quickNote' | 'expressNote'> & { together?: string[] };

const NO_EXTRA: Extra = { variants: [], offers: [], highlights: [], specs: [], reviews: [] };

const OFFERS = [
  { tag: 'Bank', text: '10% instant discount up to ₹750 on HDFC credit cards' },
  { tag: 'Coupon', text: 'WELCOME50 · ₹50 off your first order' },
  { tag: 'Wallet', text: 'Pay with 369 Wallet and get 2% back' },
];

export const DETAILS: Record<string, Extra> = {
  k2: {
    trail: 'Keyboards · Mechanical',
    variants: [
      { name: 'Switch', options: [{ label: 'Brown · tactile', selected: true }, { label: 'Red · linear' }, { label: 'Blue · clicky' }] },
      { name: 'Colour', options: [{ label: 'Carbon black', selected: true }, { label: 'Retro grey' }] },
    ],
    offers: OFFERS,
    highlights: [
      '75% layout with 84 keys and a rotary knob',
      'Gateron G Pro Brown hot-swappable switches',
      'Bluetooth 5.1 and USB-C, pairs with three devices',
      '4,000 mAh battery, up to 300 hours without backlight',
    ],
    specs: [
      ['Layout', '75%, 84 keys'],
      ['Switch', 'Gateron G Pro Brown'],
      ['Keycaps', 'PBT double-shot'],
      ['Connection', 'Bluetooth 5.1 · USB-C'],
      ['Battery', '4,000 mAh'],
      ['Weight', '960 g'],
      ['Warranty', '1 year, manufacturer'],
    ],
    ratingBars: [72, 18, 6, 2, 2],
    reviews: [
      {
        stars: 5,
        who: 'Rahul M',
        where: 'Kochi · verified purchase',
        text: 'Solid build, the knob is handy for volume. Brown switches are quiet enough for office calls. Quick delivery arrived in 15 minutes.',
      },
    ],
    together: ['g102', 'ssd'],
    comboSaving: 500,
  },
  g102: {
    trail: 'Mice · Gaming',
    variants: [],
    offers: OFFERS,
    highlights: ['8,000 DPI gaming-grade sensor', 'Six programmable buttons', 'Lightsync RGB, 16.8 million colours'],
    specs: [
      ['Sensor', 'Optical, 200–8,000 DPI'],
      ['Buttons', '6, programmable'],
      ['Connection', 'USB, 2.1 m cable'],
      ['Weight', '85 g'],
      ['Warranty', '1 year, manufacturer'],
    ],
    reviews: [],
    together: ['k2'],
  },
  ddr4: {
    trail: 'Components · Memory',
    variants: [],
    offers: OFFERS,
    highlights: ['16GB single module', 'DDR4-3200, CL22', 'Works with Intel and AMD desktop boards'],
    specs: [
      ['Capacity', '16GB (1 × 16GB)'],
      ['Speed', 'DDR4-3200'],
      ['Latency', 'CL22'],
      ['Form factor', 'UDIMM, 288-pin'],
      ['Voltage', '1.2 V'],
    ],
    reviews: [],
    together: ['ssd'],
  },
  ssd: {
    trail: 'Components · Storage',
    variants: [],
    offers: OFFERS,
    highlights: ['PCIe 4.0 NVMe, M.2 2280', 'Sequential read up to 7,000 MB/s', '1TB, for desktops, laptops and PS5'],
    specs: [
      ['Capacity', '1TB'],
      ['Interface', 'PCIe 4.0 ×4, NVMe 1.3c'],
      ['Form factor', 'M.2 2280'],
      ['Read / write', 'Up to 7,000 / 5,000 MB/s'],
      ['Warranty', '5 years, limited'],
    ],
    reviews: [],
    together: ['ddr4'],
  },
  i5: {
    trail: 'Components · Processors',
    variants: [],
    offers: OFFERS,
    highlights: ['10 cores (6 performance + 4 efficient), 16 threads', 'Up to 4.7 GHz', 'Needs a graphics card: no built-in graphics'],
    specs: [
      ['Cores / threads', '10 / 16'],
      ['Max turbo', '4.7 GHz'],
      ['Socket', 'LGA1700'],
      ['Base power', '65 W'],
      ['In the box', 'Processor and cooler'],
    ],
    reviews: [],
    together: ['ddr4', 'ssd'],
  },
  gpu: {
    trail: 'Components · Graphics cards',
    variants: [],
    offers: OFFERS,
    highlights: ['12GB GDDR6', 'Triple-fan Windforce cooling', 'DLSS 3 and ray tracing'],
    specs: [
      ['Memory', '12GB GDDR6'],
      ['Outputs', '3 × DisplayPort, 1 × HDMI'],
      ['Power', '16-pin, 700 W supply recommended'],
      ['Length', '300 mm'],
      ['Warranty', '3 years'],
    ],
    reviews: [],
    together: ['i5'],
  },
  lap: {
    trail: 'Laptops · Everyday',
    variants: [],
    offers: OFFERS,
    highlights: ['14-inch Full HD display', 'Intel Core i3, 8GB RAM, 512GB SSD', 'Thin metal body, about 1.5 kg'],
    specs: [
      ['Display', '14-inch, 1920 × 1200'],
      ['Processor', 'Intel Core i3'],
      ['Memory', '8GB'],
      ['Storage', '512GB SSD'],
      ['Warranty', '1 year'],
    ],
    reviews: [],
    together: ['g102'],
  },
};

export function detailExtra(id: string): Extra {
  return DETAILS[id] ?? NO_EXTRA;
}
