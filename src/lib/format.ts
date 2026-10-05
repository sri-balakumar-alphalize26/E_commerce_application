/**
 * The money the shop prices in. It travels with the shop's answers (the same
 * shop sells in rupees in one country and rials in another), so nothing here
 * assumes a symbol.
 */
export interface Currency {
  code: string;
  symbol: string;
  position: 'before' | 'after';
  decimals: number;
  /** How the digits group: 1,89,000 in India, 189,000 elsewhere. */
  locale: string;
}

export const RUPEE: Currency = { code: 'INR', symbol: '₹', position: 'before', decimals: 0, locale: 'en-IN' };

let current: Currency = RUPEE;

/** Called by the API layer whenever the shop says which money it is quoting in. */
export function setCurrency(c: Partial<Currency> | null | undefined): void {
  if (!c || !c.symbol) return;
  current = {
    code: c.code ?? '',
    symbol: c.symbol,
    position: c.position === 'after' ? 'after' : 'before',
    decimals: typeof c.decimals === 'number' ? c.decimals : 2,
    locale: c.locale || 'en-US',
  };
}

// Invisible direction marks, built from their numbers so none hides in this file.
const LEFT_TO_RIGHT_MARK = String.fromCharCode(0x200e);
const ISOLATE_START = String.fromCharCode(0x2066);
const ISOLATE_END = String.fromCharCode(0x2069);

/** True for a symbol written right-to-left, such as the Omani rial's. */
function isRightToLeft(symbol: string): boolean {
  for (let i = 0; i < symbol.length; i += 1) {
    const code = symbol.charCodeAt(i);
    if (code >= 0x590 && code <= 0x8ff) return true;
  }
  return false;
}

/** ₹1,89,000, or 8.500 with the rial sign after it. Whole amounts drop the fraction. */
export function money(n: number, currency: Currency = current): string {
  const whole = Number.isInteger(n);
  let digits: string;
  try {
    digits = n.toLocaleString(currency.locale, {
      minimumFractionDigits: whole ? 0 : currency.decimals,
      maximumFractionDigits: currency.decimals,
    });
  } catch {
    digits = whole ? String(n) : n.toFixed(currency.decimals);
  }
  const text = currency.position === 'after' ? `${digits} ${currency.symbol}` : `${currency.symbol}${digits}`;
  // A right-to-left symbol would otherwise pull the words and figures around
  // it out of order; fence the amount off as one left-to-right unit.
  return isRightToLeft(currency.symbol) ? `${LEFT_TO_RIGHT_MARK}${ISOLATE_START}${text}${ISOLATE_END}` : text;
}

/** "15% off" between a price and its MRP, or '' when there is nothing off. */
export function percentOff(price: number, mrp?: number): string {
  if (!mrp || mrp <= price) return '';
  const pct = Math.round((1 - price / mrp) * 100);
  return pct > 0 ? `${pct}% off` : '';
}

/** 2108 -> "2,108" */
export function count(n: number): string {
  try {
    return n.toLocaleString(current.locale);
  } catch {
    return String(n);
  }
}
