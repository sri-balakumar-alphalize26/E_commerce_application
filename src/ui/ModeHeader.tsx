import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { HomeTab, Mode } from '../api/types';
import { useAddresses } from '../hooks/queries';
import { categoryHref } from '../lib/links';
import { useCartCount } from '../store/cart';
import { useMode } from '../store/mode';
import { useSession } from '../store/session';
import { neutral, PAD, useTheme } from '../theme/tokens';
import { Icon, IconName, isIconName } from './Icon';
import { T } from './T';

const MODES: { mode: Mode; label: string; icon: IconName }[] = [
  { mode: 'quick', label: 'Quick', icon: 'bolt' },
  { mode: 'express', label: 'Express', icon: 'truck' },
];

interface Props {
  eta?: string;
  tabs: HomeTab[];
  searchHint?: string;
}

/**
 * Home's header, in the mode's colour: the Quick / Express tabs, when it
 * arrives, where to, search, and the shortcut row. The mode the shopper is in
 * is the white pill; the other is bold white text on the colour.
 */
export function ModeHeader({ eta, tabs, searchHint }: Props) {
  const t = useTheme();
  const router = useRouter();
  const setMode = useMode((s) => s.setMode);
  const n = useCartCount();
  const customer = useSession((s) => s.customer);
  const { data: addresses } = useAddresses();
  const home = addresses?.find((a) => a.isDefault) ?? addresses?.[0];

  const openTab = (target: string) => {
    if (target === 'home') return;
    if (target === 'orders') router.navigate('/orders');
    else if (target === 'offers') router.push('/offers');
    else router.push(categoryHref(target));
  };

  return (
    <LinearGradient colors={[t.accD, t.acc]} style={{ paddingHorizontal: PAD, paddingBottom: 10, gap: 9 }}>
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 8, paddingTop: 6 }}>
        {MODES.map((m) => {
          const on = m.mode === t.mode;
          return (
            <Pressable
              key={m.mode}
              accessibilityRole="tab"
              accessibilityLabel={`${m.label} delivery`}
              accessibilityState={{ selected: on }}
              onPress={() => setMode(m.mode)}
              style={{
                flex: 1,
                height: 46,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                backgroundColor: on ? neutral.sur : 'transparent',
                boxShadow: on ? '0 1px 2px rgba(0,0,0,0.12)' : undefined,
              }}>
              <Icon name={m.icon} size={18} stroke={2} color={on ? neutral.ink : '#fff'} />
              <T w={on ? 600 : 700} s={15} c={on ? neutral.ink : '#fff'}>
                {m.label}
              </T>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 2 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Account"
          hitSlop={6}
          onPress={() => router.navigate('/account')}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: 'rgba(255,255,255,0.2)',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Icon name="user" size={18} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <T s={11} c="rgba(255,255,255,0.85)">
            Delivery in
          </T>
          <T w={700} s={19} c="#fff" style={{ lineHeight: 21, letterSpacing: -0.2 }}>
            {eta ?? ' '}
          </T>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Cart, ${n} items`}
          hitSlop={6}
          onPress={() => router.push('/cart')}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: 'rgba(255,255,255,0.16)',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Icon name="cart" color="#fff" />
          {n ? (
            <View
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                minWidth: 16,
                height: 16,
                borderRadius: 8,
                paddingHorizontal: 4,
                backgroundColor: '#fff',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <T w={700} s={10} c={t.accInk} style={{ lineHeight: 13 }}>
                {n}
              </T>
            </View>
          ) : null}
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Delivery address"
        hitSlop={6}
        onPress={() => router.push(customer ? '/addresses' : '/login')}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Icon name="pin" size={13} color="#fff" />
        {home ? (
          <T s={11.5} c="#fff" numberOfLines={1} style={{ flexShrink: 1 }}>
            {home.label} ·{' '}
            <T w={600} s={11.5} c="#fff">
              {[home.line, home.area].filter(Boolean).join(', ')}, {home.city} {home.zip}
            </T>
          </T>
        ) : (
          <T w={600} s={11.5} c="#fff">
            {customer ? 'Add a delivery address' : 'Sign in to set your address'}
          </T>
        )}
        <Icon name="down" size={13} color="#fff" />
      </Pressable>

      <Pressable
        accessibilityRole="search"
        accessibilityLabel="Search products"
        onPress={() => router.push('/search')}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: neutral.sur,
          borderRadius: 8,
          paddingHorizontal: 10,
          height: 38,
        }}>
        <Icon name="search" color={neutral.mut} />
        <T c={neutral.mut} numberOfLines={1} style={{ flex: 1 }}>
          {searchHint ? `Search "${searchHint}"` : 'Search'}
        </T>
        <Icon name="mic" color={neutral.ink} />
      </Pressable>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -PAD, marginBottom: -10, flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: 4, flexGrow: 1 }}>
        {tabs.map((tab, i) => {
          const on = i === 0;
          const color = on ? '#fff' : 'rgba(255,255,255,0.85)';
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="link"
              accessibilityLabel={tab.label}
              onPress={() => openTab(tab.target)}
              style={{
                flex: 1,
                // Five fit across; more than that and the row slides.
                minWidth: 68,
                alignItems: 'center',
                gap: 3,
                paddingTop: 6,
                paddingBottom: 7,
                minHeight: 44,
                borderBottomWidth: 2.5,
                borderBottomColor: on ? '#fff' : 'transparent',
              }}>
              <Icon name={isIconName(tab.icon) ? tab.icon : 'grid'} color={color} />
              <T w={on ? 600 : 500} s={10} c={color} numberOfLines={1}>
                {tab.label}
              </T>
            </Pressable>
          );
        })}
      </ScrollView>
    </LinearGradient>
  );
}
