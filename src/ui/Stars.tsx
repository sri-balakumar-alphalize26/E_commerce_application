import { Pressable, View } from 'react-native';
import { neutral } from '../theme/tokens';
import { Star } from './Icon';

const WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

/** What a rating means in a word, for the label under the stars. */
export function starWord(n: number): string {
  return WORDS[n] ?? '';
}

/** Five stars to tap. */
export function StarPicker({ value, onChange, size = 34 }: { value: number; onChange: (n: number) => void; size?: number }) {
  return (
    <View accessibilityRole="adjustable" accessibilityLabel={`Rating: ${value} of 5`} style={{ flexDirection: 'row', gap: 6 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          accessibilityRole="button"
          accessibilityLabel={`${n} star${n === 1 ? '' : 's'}`}
          hitSlop={4}
          onPress={() => onChange(n)}
          style={{ width: size + 8, height: size + 8, alignItems: 'center', justifyContent: 'center' }}>
          <Star size={size} color={n <= value ? '#f0a51f' : neutral.ln} />
        </Pressable>
      ))}
    </View>
  );
}
