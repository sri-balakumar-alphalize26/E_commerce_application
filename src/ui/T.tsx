import { Text, TextProps } from 'react-native';
import { font, neutral, Weight } from '../theme/tokens';

interface Props extends TextProps {
  /** Weight. */
  w?: Weight;
  /** Size in dp. The design's body text is 12.5. */
  s?: number;
  /** Colour. */
  c?: string;
  /** Digits that line up in columns: prices, clocks, counts. */
  tabular?: boolean;
}

/** All text in the app: Inter, in the design's ink, at the design's body size. */
export function T({ w = 400, s = 12.5, c = neutral.ink, tabular, style, ...rest }: Props) {
  return (
    <Text
      {...rest}
      style={[
        font(w),
        { fontSize: s, color: c, lineHeight: Math.round(s * 1.35) },
        tabular ? { fontVariant: ['tabular-nums'] } : null,
        style,
      ]}
    />
  );
}
