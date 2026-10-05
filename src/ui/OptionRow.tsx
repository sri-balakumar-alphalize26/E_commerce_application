import { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { neutral, PAD, useTheme } from '../theme/tokens';
import { T } from './T';

interface Props {
  title: string;
  note?: string;
  /** A small accent label after the title: Fastest, Faster. */
  tag?: string;
  selected: boolean;
  onPress?: () => void;
  disabled?: boolean;
  /** The small box before the title on a payment method: UPI, VISA, ₹. */
  mark?: string;
  /** What sits at the right edge: a fee, "Free". */
  right?: ReactNode;
  last?: boolean;
}

/** One choice in a list of them: an address, a slot, a way to pay. */
export function OptionRow({ title, note, tag, selected, onPress, disabled, mark, right, last }: Props) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={note ? `${title}. ${note}` : title}
      accessibilityState={{ selected, disabled: !!disabled }}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: PAD,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: neutral.ln,
        backgroundColor: neutral.sur,
        opacity: disabled ? 0.5 : 1,
      }}>
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          marginTop: 1,
          borderWidth: selected ? 5.5 : 1.5,
          borderColor: selected ? t.acc : neutral.radio,
        }}
      />
      {mark ? (
        <View
          style={{
            width: 28,
            height: 19,
            borderRadius: 3,
            borderWidth: 1,
            borderColor: neutral.ln,
            backgroundColor: '#fff',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 1,
          }}>
          <T w={700} s={8} style={{ lineHeight: 10 }}>
            {mark}
          </T>
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <T w={600} s={12}>
            {title}
          </T>
          {tag ? (
            <View style={{ backgroundColor: t.accSoft, borderWidth: 1, borderColor: t.accLn, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
              <T w={600} s={10} c={t.accInk} style={{ lineHeight: 12 }}>
                {tag}
              </T>
            </View>
          ) : null}
        </View>
        {note ? (
          <T s={11} c={neutral.mut}>
            {note}
          </T>
        ) : null}
      </View>
      {right}
    </Pressable>
  );
}

/** "Deliver to                Change" above a group of options. */
export function GroupTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: neutral.sur, paddingHorizontal: PAD, paddingTop: 10, paddingBottom: 4 }}>
      <T w={600} s={12.5} style={{ flex: 1 }}>
        {title}
      </T>
      {action ? (
        <Pressable accessibilityRole="button" hitSlop={10} onPress={onAction}>
          <T w={500} s={11.5} c={t.accInk}>
            {action}
          </T>
        </Pressable>
      ) : null}
    </View>
  );
}
