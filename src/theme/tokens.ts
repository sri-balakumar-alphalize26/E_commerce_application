import { Mode } from '../api/types';
import { useMode } from '../store/mode';

/**
 * The 369 Mart Storefront design, as numbers.
 *
 * Lifted value for value from `design/369mart-storefront.html`. The design is
 * drawn on a 360-wide phone in CSS pixels, and those are used here as dp
 * unchanged.
 */

export const neutral = {
  ink: '#1b2630',
  mut: '#6b7684',
  ln: '#e7eaee',
  soft: '#f3f4f6',
  sur: '#ffffff',
  green: '#1e8e3e',
  greenSoft: '#eef8f0',
  red: '#d13b2f',
  amber: '#b45309',
  radio: '#b8c0c8',
} as const;

interface Accent {
  acc: string;
  accD: string;
  accInk: string;
  accSoft: string;
  accLn: string;
  /**
   * Accent-coloured text on white: Add, outlined buttons, the lit tab. Quick
   * uses the dark ink because orange text on white is too faint to read;
   * Express blue is dark enough to use as it is.
   */
  accText: string;
}

const accents: Record<Mode, Accent> = {
  quick: {
    acc: '#f0801f',
    accD: '#d96f12',
    accInk: '#a8520a',
    accSoft: '#fff4e8',
    accLn: '#f8cfa6',
    accText: '#a8520a',
  },
  express: {
    acc: '#0a78ab',
    accD: '#08658f',
    accInk: '#0b4a6e',
    accSoft: '#e9f3f9',
    accLn: '#b9d8ea',
    accText: '#0a78ab',
  },
};

export type Theme = typeof neutral & Accent & { mode: Mode };

export function themeFor(mode: Mode): Theme {
  return { ...neutral, ...accents[mode], mode };
}

/** The colours for the mode the shopper is in. */
export function useTheme(): Theme {
  const mode = useMode((s) => s.mode);
  return themeFor(mode);
}

export type Weight = 400 | 500 | 600 | 700;

const FAMILY: Record<Weight, string> = {
  400: 'Inter_400Regular',
  500: 'Inter_500Medium',
  600: 'Inter_600SemiBold',
  700: 'Inter_700Bold',
};

/** Inter at a weight. A custom font is one family per weight, never `fontWeight`. */
export function font(weight: Weight = 400): { fontFamily: string } {
  return { fontFamily: FAMILY[weight] };
}

export const PAD = 12;
