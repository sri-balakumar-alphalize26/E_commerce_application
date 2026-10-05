import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ReactNode, RefObject, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBill, useCartProducts } from '../hooks/queries';
import { money } from '../lib/format';
import { useCartCount } from '../store/cart';
import { useToast } from '../store/toast';
import { neutral, PAD, useTheme } from '../theme/tokens';
import { useCartTarget } from './fly';
import { Icon, IconName } from './Icon';
import { Photo } from './product';
import { T } from './T';

/**
 * A screen's outer frame: the band behind the status bar, then the screen.
 * `accent` paints the band in the mode's colour (Home, Account); otherwise it
 * is white with dark clock and battery.
 */
export function Screen({ children, accent, bg = neutral.soft }: { children: ReactNode; accent?: boolean; bg?: string }) {
  const insets = useSafeAreaInsets();
  const t = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <StatusBar style={accent ? 'light' : 'dark'} />
      <View style={{ height: insets.top, backgroundColor: accent ? t.accD : neutral.sur }} />
      {children}
    </View>
  );
}

interface IconBtnProps {
  name: IconName;
  label: string;
  onPress?: () => void;
  badge?: number;
  color?: string;
  innerRef?: RefObject<View | null>;
}

/** A 40dp icon button in a white header. */
export function IconBtn({ name, label, onPress, badge, color = neutral.ink, innerRef }: IconBtnProps) {
  const t = useTheme();
  return (
    <Pressable
      ref={innerRef}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>
      <Icon name={name} color={color} />
      {badge ? (
        <View
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            minWidth: 15,
            height: 15,
            borderRadius: 8,
            paddingHorizontal: 3,
            backgroundColor: t.acc,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <T w={700} s={9.5} c="#fff" style={{ lineHeight: 12 }}>
            {badge}
          </T>
        </View>
      ) : null}
    </Pressable>
  );
}

export function CartBtn() {
  const router = useRouter();
  const n = useCartCount();
  const mark = useCartTarget();
  return <IconBtn innerRef={mark} name="cart" label={`Cart, ${n} items`} badge={n} onPress={() => router.push('/cart')} />;
}

interface SubHeaderProps {
  title?: string;
  sub?: string;
  /** Hide the back arrow: a screen with nowhere to go back to. */
  noBack?: boolean;
  /** Replaces the title: the search box on a category page. */
  middle?: ReactNode;
  right?: ReactNode;
}

/** The white header of every screen below Home. */
export function SubHeader({ title, sub, noBack, middle, right }: SubHeaderProps) {
  const router = useRouter();
  return (
    <View
      style={{
        backgroundColor: neutral.sur,
        borderBottomWidth: 1,
        borderBottomColor: neutral.ln,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 6,
        paddingVertical: 4,
        minHeight: 50,
      }}>
      {noBack ? (
        <View style={{ width: 8 }} />
      ) : (
        <IconBtn name="back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      )}
      {middle ?? (
        <View style={{ flex: 1, minWidth: 0 }}>
          <T w={600} s={15} numberOfLines={1}>
            {title}
          </T>
          {sub ? (
            <T s={11} c={neutral.mut} numberOfLines={1}>
              {sub}
            </T>
          ) : null}
        </View>
      )}
      {right}
    </View>
  );
}

interface BtnProps {
  label: string;
  onPress?: () => void;
  /** `pri` filled in the mode colour, `ghost` grey outline, default accent outline. */
  kind?: 'pri' | 'ghost' | 'outline';
  icon?: IconName;
  busy?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  height?: number;
}

export function Btn({ label, onPress, kind = 'outline', icon, busy, disabled, style, height = 42 }: BtnProps) {
  const t = useTheme();
  const off = disabled || busy;
  const fg = kind === 'pri' ? '#fff' : kind === 'ghost' ? neutral.ink : t.accText;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        {
          height,
          borderRadius: 9,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          borderWidth: 1,
          borderColor: kind === 'ghost' ? neutral.ln : t.acc,
          backgroundColor: kind === 'pri' ? (pressed ? t.accD : t.acc) : pressed ? neutral.soft : '#fff',
          opacity: off ? 0.55 : 1,
        },
        style,
      ]}>
      {busy ? <ActivityIndicator size="small" color={fg} /> : icon ? <Icon name={icon} size={16} color={fg} /> : null}
      <T w={600} s={height < 40 ? 12 : 13} c={fg}>
        {label}
      </T>
    </Pressable>
  );
}

/** The bar pinned under a screen: a total and a button, or two buttons. */
export function Footer({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        backgroundColor: neutral.sur,
        borderTopWidth: 1,
        borderTopColor: neutral.ln,
        paddingHorizontal: PAD,
        paddingTop: 8,
        paddingBottom: 8 + insets.bottom,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}>
      {children}
    </View>
  );
}

export function FooterTotal({ label, amount }: { label: string; amount: number }) {
  return (
    <View style={{ flex: 1 }}>
      <T s={10.5} c={neutral.mut}>
        {label}
      </T>
      <T w={600} s={16} tabular>
        {money(amount)}
      </T>
    </View>
  );
}

/** "Shop by category        See all ›" */
export function SectionTitle({ title, note, action, onAction }: { title: string; note?: string; action?: string; onAction?: () => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
      <T w={600} s={14} numberOfLines={1} style={{ flexShrink: 1 }}>
        {title}
        {note ? (
          <T s={11} c={neutral.mut}>
            {'  '}
            {note}
          </T>
        ) : null}
      </T>
      {action ? (
        <Pressable accessibilityRole="link" hitSlop={10} onPress={onAction} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <T w={500} s={12} c={t.accText}>
            {action}
          </T>
          <Icon name="right" size={14} color={t.accText} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** The basket, floating over Home: thumbnails, count, total, View cart. */
export function CartBar() {
  const t = useTheme();
  const router = useRouter();
  const n = useCartCount();
  const { data: products } = useCartProducts();
  const { data: bill } = useBill();
  if (!n) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View cart, ${n} items`}
      onPress={() => router.push('/cart')}
      style={{
        marginHorizontal: PAD,
        marginBottom: 8,
        backgroundColor: t.acc,
        borderRadius: 12,
        paddingVertical: 9,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        boxShadow: '0 8px 20px rgba(0,0,0,0.16)',
      }}>
      <View style={{ flexDirection: 'row', paddingRight: 8 }}>
        {(products ?? []).slice(0, 3).map((p) => (
          <Photo
            key={p.id}
            source={p.images[0]}
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              borderWidth: 1.5,
              borderColor: t.acc,
              backgroundColor: '#fff',
              marginRight: -8,
              overflow: 'hidden',
            }}
          />
        ))}
      </View>
      <T w={500} c="#fff">
        {n} item{n === 1 ? '' : 's'}
      </T>
      {bill ? (
        <T w={600} c="#fff" tabular>
          · {money(bill.items)}
        </T>
      ) : null}
      <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 2 }}>
        <T w={600} c="#fff">
          View cart
        </T>
        <Icon name="right" size={16} color="#fff" />
      </View>
    </Pressable>
  );
}

const TABS: { route: string; label: string; icon: IconName }[] = [
  { route: 'index', label: 'Home', icon: 'home' },
  { route: 'categories', label: 'Categories', icon: 'grid' },
  { route: 'cart', label: 'Cart', icon: 'cart' },
  { route: 'orders', label: 'Orders', icon: 'orders' },
  { route: 'account', label: 'Account', icon: 'user' },
];

/** The five tabs along the bottom. Cart is not a tab: it opens the cart over them. */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const n = useCartCount();
  const current = state.routes[state.index]?.name;
  const cartMark = useCartTarget();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: neutral.sur,
        borderTopWidth: 1,
        borderTopColor: neutral.ln,
        paddingTop: 6,
        paddingHorizontal: 4,
        paddingBottom: Math.max(10, insets.bottom),
      }}>
      {TABS.map((tab) => {
        const on = tab.route === current;
        const color = on ? t.accText : neutral.mut;
        return (
          <Pressable
            key={tab.route}
            ref={tab.route === 'cart' ? cartMark : undefined}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: on }}
            onPress={() => (tab.route === 'cart' ? router.push('/cart') : navigation.navigate(tab.route))}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 44 }}>
            {on ? (
              <View
                style={{
                  position: 'absolute',
                  top: -6,
                  width: 28,
                  height: 3,
                  borderBottomLeftRadius: 3,
                  borderBottomRightRadius: 3,
                  backgroundColor: t.acc,
                }}
              />
            ) : null}
            <Icon name={tab.icon} size={22} color={color} stroke={on ? 2.2 : 1.6} />
            <T w={on ? 600 : 500} s={10} c={color}>
              {tab.label}
            </T>
            {tab.route === 'cart' && n ? (
              <View
                style={{
                  position: 'absolute',
                  top: 2,
                  left: '50%',
                  marginLeft: 4,
                  minWidth: 14,
                  height: 14,
                  borderRadius: 7,
                  paddingHorizontal: 3,
                  backgroundColor: t.acc,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <T w={700} s={9} c="#fff" style={{ lineHeight: 11 }}>
                  {n}
                </T>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Shows the latest toast for a moment, above whatever is on screen. */
export function ToastHost() {
  const text = useToast((s) => s.text);
  const seq = useToast((s) => s.seq);
  const insets = useSafeAreaInsets();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!seq) return;
    setShown(true);
    const timer = setTimeout(() => setShown(false), 2200);
    return () => clearTimeout(timer);
  }, [seq]);

  if (!shown) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 84, alignItems: 'center' }}>
      <View
        accessibilityLiveRegion="polite"
        style={{ backgroundColor: neutral.ink, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, maxWidth: '86%' }}>
        <T w={500} s={12} c="#fff" style={{ textAlign: 'center' }}>
          {text}
        </T>
      </View>
    </View>
  );
}

/** A screen-sized wait or failure, in the same place as the content it stands in for. */
export function Loading({ error, onRetry }: { error?: string; onRetry?: () => void }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
      {error ? (
        <>
          <T c={neutral.mut} style={{ textAlign: 'center' }}>
            {error}
          </T>
          {onRetry ? <Btn label="Try again" onPress={onRetry} height={36} /> : null}
        </>
      ) : (
        <ActivityIndicator color={t.acc} />
      )}
    </View>
  );
}

/** A page with nothing on it yet: what it is for, and the way to fill it. */
export function Empty({ icon, title, text, action, onAction }: { icon: IconName; title: string; text?: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 }}>
      <Icon name={icon} size={40} color={neutral.mut} />
      <T w={600} s={15} style={{ textAlign: 'center' }}>
        {title}
      </T>
      {text ? (
        <T c={neutral.mut} style={{ textAlign: 'center' }}>
          {text}
        </T>
      ) : null}
      {action ? <Btn label={action} kind="pri" onPress={onAction} style={{ marginTop: 4 }} /> : null}
    </View>
  );
}

/** "Today, 5:42 pm", "3 Oct, 11:05 am": when something happened, on the phone's clock. */
export function whenText(at: number | null | undefined): string {
  if (!at) return '';
  const d = new Date(at);
  const h = d.getHours();
  const time = `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
  const today = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day =
    d.toDateString() === today.toDateString()
      ? 'Today'
      : d.toDateString() === new Date(today.getTime() - 86400000).toDateString()
        ? 'Yesterday'
        : `${d.getDate()} ${months[d.getMonth()]}${d.getFullYear() === today.getFullYear() ? '' : ` ${d.getFullYear()}`}`;
  return `${day}, ${time}`;
}
