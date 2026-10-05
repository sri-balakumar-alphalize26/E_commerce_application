import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { isMock } from '../../src/api/endpoints';
import { money } from '../../src/lib/format';
import { useNotifications } from '../../src/hooks/queries';
import { useCart } from '../../src/store/cart';
import { useSession } from '../../src/store/session';
import { toast } from '../../src/store/toast';
import { neutral, PAD, useTheme } from '../../src/theme/tokens';
import { Btn, Screen } from '../../src/ui/chrome';
import { Icon, IconName } from '../../src/ui/Icon';
import { T } from '../../src/ui/T';

function Shortcut({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 62,
        backgroundColor: neutral.sur,
        borderWidth: 1,
        borderColor: neutral.ln,
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 4,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
      }}>
      <Icon name={icon} color={t.accInk} />
      <T w={500} s={10.5}>
        {label}
      </T>
    </Pressable>
  );
}

interface RowProps {
  icon: IconName;
  title: string;
  note?: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
}

function Row({ icon, title, note, onPress, danger, last }: RowProps) {
  const color = danger ? neutral.red : neutral.mut;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 11,
        paddingHorizontal: PAD,
        minHeight: 46,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: neutral.ln,
      }}>
      <Icon name={icon} color={color} />
      <View style={{ flex: 1 }}>
        <T c={danger ? neutral.red : neutral.ink}>{title}</T>
        {note ? (
          <T s={11} c={neutral.mut}>
            {note}
          </T>
        ) : null}
      </View>
      {danger ? null : <Icon name="right" size={16} color={neutral.mut} />}
    </Pressable>
  );
}

export default function Account() {
  const t = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const customer = useSession((s) => s.customer);
  const logout = useSession((s) => s.logout);
  const { data: notices } = useNotifications();
  const unread = (notices ?? []).filter((n) => !n.read).length;

  if (!customer) {
    return (
      <Screen accent>
        <LinearGradient colors={[t.accD, t.acc]} style={{ padding: PAD, paddingBottom: 16, gap: 4 }}>
          <T w={600} s={15} c="#fff">
            Welcome to 369 Mart
          </T>
          <T s={11.5} c="rgba(255,255,255,0.9)">
            Sign in to order, track deliveries and keep your addresses.
          </T>
        </LinearGradient>
        <View style={{ padding: PAD, gap: 8 }}>
          <Btn label="Sign in" kind="pri" onPress={() => router.push('/login')} />
          <Btn label="Create an account" onPress={() => router.push('/signup')} />
        </View>
      </Screen>
    );
  }

  const initial = customer.name.trim().charAt(0).toUpperCase() || '?';

  return (
    <Screen accent>
      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 16 }}>
        <LinearGradient
          colors={[t.accD, t.acc]}
          style={{ paddingHorizontal: PAD, paddingTop: 14, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: 'rgba(255,255,255,0.22)',
              borderWidth: 1.5,
              borderColor: 'rgba(255,255,255,0.5)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <T w={600} s={17} c="#fff">
              {initial}
            </T>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T w={600} s={15} c="#fff" numberOfLines={1}>
              {customer.name}
            </T>
            <T s={11.5} c="rgba(255,255,255,0.9)" numberOfLines={1}>
              {[customer.phone, customer.email].filter(Boolean).join(' · ')}
            </T>
          </View>
          <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
          hitSlop={8}
          onPress={() => router.push('/profile')}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: 'rgba(255,255,255,0.16)',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Icon name="edit" size={16} color="#fff" />
        </Pressable>
        {isMock() ? (
            <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
              <T w={600} s={10} c="#fff">
                Demo
              </T>
            </View>
          ) : null}
        </LinearGradient>
        {customer.walletBalance !== undefined ? (
          <View
            style={{
              marginTop: -22,
              marginHorizontal: PAD,
              backgroundColor: neutral.sur,
              borderWidth: 1,
              borderColor: neutral.ln,
              borderRadius: 12,
              paddingVertical: 10,
              paddingHorizontal: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: t.accSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="wallet" color={t.accInk} />
            </View>
            <View style={{ flex: 1 }}>
              <T w={600} s={14} tabular>
                {money(customer.walletBalance)}
              </T>
              <T s={11} c={neutral.mut}>
                369 Wallet balance
              </T>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/wallet')}
              style={{ borderWidth: 1, borderColor: t.accLn, borderRadius: 7, paddingVertical: 5, paddingHorizontal: 10 }}>
              <T w={600} s={11.5} c={t.accInk}>
                Add money
              </T>
            </Pressable>
          </View>
        ) : (
          <View style={{ height: 0 }} />
        )}

        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: PAD }}>
          <Shortcut icon="orders" label="Orders" onPress={() => router.navigate('/orders')} />
          <Shortcut icon="heart" label="My list" onPress={() => router.push('/list')} />
          <Shortcut icon="pin" label="Addresses" onPress={() => router.push('/addresses')} />
          <Shortcut icon="card" label="Payments" onPress={() => router.push('/payments')} />
        </View>

        <View style={{ backgroundColor: neutral.sur }}>
          <Row icon="gift" title="Refer & earn" onPress={() => router.push('/refer')} />
          <Row icon="tag" title="Coupons & rewards" onPress={() => router.push('/rewards')} />
          <Row icon="trend" title="Points" onPress={() => router.push('/points')} />
          <Row
            icon="bell"
            title="Notifications"
            note={unread ? `${unread} new` : undefined}
            onPress={() => router.push('/notifications')}
          />
          <Row icon="replace" title="Returns & replacements" note="Start from a delivered order" onPress={() => router.navigate('/orders')} />
          <Row icon="edit" title="My reviews" onPress={() => router.push('/reviews')} />
          <Row icon="help" title="Help & support" onPress={() => router.push('/support')} />
          <Row icon="info" title="About 369 Mart" note="Version 1.0" onPress={() => toast('369 Mart · version 1.0')} />
          <Row
            danger
            last
            icon="out"
            title="Log out"
            onPress={async () => {
              await logout();
              // The next person to sign in on this phone starts with their own list.
              useCart.getState().setWish([]);
              queryClient.removeQueries({ queryKey: ['wallet'] });
              queryClient.removeQueries({ queryKey: ['notifications'] });
              queryClient.removeQueries({ queryKey: ['orders'] });
              queryClient.removeQueries({ queryKey: ['addresses'] });
              queryClient.removeQueries({ queryKey: ['order'] });
            }}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
