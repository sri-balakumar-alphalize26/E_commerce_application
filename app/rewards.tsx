import { useQueryClient } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { api } from '../src/api/endpoints';
import { ApiError, Coupon, Rewards, ScratchCard } from '../src/api/types';
import { useRewards } from '../src/hooks/queries';
import { money } from '../src/lib/format';
import { useCart } from '../src/store/cart';
import { useSession } from '../src/store/session';
import { toast } from '../src/store/toast';
import { neutral, PAD, useTheme } from '../src/theme/tokens';
import { Loading, Screen, SubHeader } from '../src/ui/chrome';
import { Icon } from '../src/ui/Icon';
import { T } from '../src/ui/T';

function CouponRow({ coupon, won, last }: { coupon: Coupon; won: boolean; last: boolean }) {
  const t = useTheme();
  const router = useRouter();
  const applied = useCart((s) => s.coupon === coupon.code);
  const setCoupon = useCart((s) => s.setCoupon);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: PAD,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: neutral.ln,
      }}>
      <Icon name="tag" color={t.acc} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <T w={600} s={12.5}>
          {coupon.code}
          {won ? (
            <T w={500} s={11} c={neutral.green}>
              {'  '}Won
            </T>
          ) : null}
        </T>
        <T s={12}>{coupon.title}</T>
        {coupon.note ? (
          <T s={11} c={neutral.mut}>
            {coupon.note}
          </T>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={applied ? `Remove ${coupon.code}` : `Use ${coupon.code} on my cart`}
        onPress={() => {
          setCoupon(applied ? null : coupon.code);
          if (!applied) {
            toast(`${coupon.code} will be tried on your cart`);
            router.push('/cart');
          }
        }}
        style={{ borderWidth: 1, borderColor: t.accLn, borderRadius: 7, paddingVertical: 5, paddingHorizontal: 10 }}>
        <T w={600} s={11.5} c={t.accInk}>
          {applied ? 'Remove' : 'Use'}
        </T>
      </Pressable>
    </View>
  );
}

function Scratch({ card }: { card: ScratchCard }) {
  const t = useTheme();
  const queryClient = useQueryClient();
  const restore = useSession((s) => s.restore);
  const [busy, setBusy] = useState(false);

  const reveal = async () => {
    if (card.scratched || busy) return;
    setBusy(true);
    try {
      const opened = await api.scratch(card.id);
      queryClient.setQueryData<Rewards>(['rewards'], (old) =>
        old ? { ...old, cards: old.cards.map((c) => (c.id === opened.id ? opened : c)) } : old
      );
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      if (opened.reward.type === 'cash') {
        // Cash goes straight into the wallet.
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
        restore();
      }
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not open the card. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const prize =
    card.reward.type === 'cash' && card.reward.amount
      ? `${money(card.reward.amount)} in your wallet`
      : card.reward.code
        ? `${card.reward.code}${card.reward.title ? ` · ${card.reward.title}` : ''}`
        : 'Better luck next time';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={card.scratched ? `Scratch card: ${prize}` : 'Scratch card, tap to open'}
      disabled={card.scratched}
      onPress={reveal}
      style={{
        width: '48.6%',
        minHeight: 104,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: card.scratched ? neutral.ln : t.accLn,
        backgroundColor: card.scratched ? neutral.sur : t.accSoft,
        padding: 12,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
      }}>
      <Icon name={card.scratched ? 'check' : 'gift'} size={24} color={card.scratched ? neutral.green : t.accInk} />
      <T w={600} s={12.5} c={card.scratched ? neutral.ink : t.accInk} style={{ textAlign: 'center' }}>
        {card.scratched ? prize : busy ? 'Opening…' : 'Tap to scratch'}
      </T>
      {card.from ? (
        <T s={10.5} c={neutral.mut} style={{ textAlign: 'center' }} numberOfLines={1}>
          {card.from}
        </T>
      ) : null}
    </Pressable>
  );
}

/** Coupons the shop is running, and the customer's scratch cards. */
export default function RewardsPage() {
  const customer = useSession((s) => s.customer);
  const { data, error, refetch } = useRewards();
  if (!customer) return <Redirect href="/login?next=/rewards" />;

  return (
    <Screen>
      <SubHeader title="Coupons & rewards" />
      {!data ? (
        <Loading error={error ? 'Could not load your rewards.' : undefined} onRetry={refetch} />
      ) : (
        <ScrollView contentContainerStyle={{ gap: 8, paddingBottom: 16 }}>
          <View style={{ backgroundColor: neutral.sur, padding: PAD, gap: 10 }}>
            <T w={600} s={13}>
              Scratch cards
            </T>
            {data.cards.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: '2.8%', rowGap: 8 }}>
                {data.cards.map((card) => (
                  <Scratch key={card.id} card={card} />
                ))}
              </View>
            ) : (
              <T c={neutral.mut}>Cards arrive with your orders. None waiting right now.</T>
            )}
          </View>

          <View style={{ backgroundColor: neutral.sur }}>
            <T w={600} s={13} style={{ padding: PAD, paddingBottom: 4 }}>
              Coupons
            </T>
            {data.coupons.length ? (
              data.coupons.map((c, i) => (
                <CouponRow key={c.code} coupon={c} won={data.won.includes(c.code)} last={i === data.coupons.length - 1} />
              ))
            ) : (
              <T c={neutral.mut} style={{ paddingHorizontal: PAD, paddingBottom: PAD }}>
                No coupons running right now.
              </T>
            )}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}
