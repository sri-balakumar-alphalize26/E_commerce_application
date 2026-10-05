import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { api } from '../api/endpoints';
import { ApiError, Order, OrderReturn, Substitute } from '../api/types';
import { openFile } from '../lib/files';
import { money } from '../lib/format';
import { toast } from '../store/toast';
import { neutral, PAD, useTheme } from '../theme/tokens';
import { Btn, whenText } from './chrome';
import { Icon, IconName } from './Icon';
import { Photo } from './product';
import { T } from './T';

const RETURN_STATE: Record<string, string> = {
  requested: 'Request received. The shop is looking at it',
  pickup: 'Pickup scheduled',
  picked: 'Picked up',
  done: 'Refund issued',
  refused: 'Refused by the shop',
};

function ReturnRow({ row }: { row: OrderReturn }) {
  const done = row.state === 'done';
  const refused = row.state === 'refused';
  return (
    <View style={{ paddingVertical: 10, paddingHorizontal: PAD, borderTopWidth: 1, borderTopColor: neutral.ln, gap: 2 }}>
      <T w={600} s={12.5}>
        {row.kind === 'replace' ? 'Replacement' : 'Refund'} · {row.reason}
      </T>
      <T s={12} c={refused ? neutral.red : done ? neutral.green : neutral.mut}>
        {RETURN_STATE[row.state] ?? row.state}
        {done && row.refunded ? ` · ${money(row.refunded)} to your wallet` : ''}
      </T>
      <T s={10.5} c={neutral.mut}>
        {[whenText(row.at), row.photos ? `${row.photos} photo${row.photos === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ')}
      </T>
    </View>
  );
}

/** The shop ran out of something and offers another: take one, or have that item refunded. */
function Offer({ order, offer }: { order: Order; offer: Substitute }) {
  const t = useTheme();
  const queryClient = useQueryClient();
  const [picked, setPicked] = useState(offer.options[0]?.id);
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null);

  const answer = async (accept: boolean) => {
    setBusy(accept ? 'accept' : 'decline');
    try {
      const after = await api.answerSubstitute(order.ref, offer.id, accept, accept ? picked : undefined);
      queryClient.setQueryData(['order', order.ref], after);
      toast(accept ? 'Replacement accepted' : 'Item removed. Any money paid for it goes to your wallet');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not send your answer. Try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ backgroundColor: t.accSoft, borderTopWidth: 1, borderBottomWidth: 1, borderColor: t.accLn, padding: PAD, gap: 8 }}>
      <T w={600} s={12.5} c={t.accInk}>
        Out of stock: {offer.was}
      </T>
      <T s={12}>
        The shop can send {offer.options.length > 1 ? 'one of these' : 'this'} instead
        {offer.deadline ? `. Answer by ${whenText(offer.deadline).toLowerCase()}` : ''}.
      </T>
      {offer.options.map((opt) => {
        const on = picked === opt.id;
        return (
          <Pressable
            key={opt.id}
            accessibilityRole="radio"
            accessibilityLabel={`${opt.name}, you pay ${money(opt.youPay)}`}
            accessibilityState={{ selected: on }}
            onPress={() => setPicked(opt.id)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              backgroundColor: neutral.sur,
              borderRadius: 9,
              borderWidth: on ? 1.5 : 1,
              borderColor: on ? t.acc : neutral.ln,
              padding: 8,
            }}>
            <Photo source={opt.image} style={{ width: 44, height: 44 }} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <T s={12} numberOfLines={2}>
                {opt.name}
              </T>
              <T w={600} s={12} tabular>
                {money(opt.youPay)}
                {opt.price > opt.youPay ? (
                  <T s={11} c={neutral.green}>
                    {'  '}the shop covers {money(opt.price - opt.youPay)}
                  </T>
                ) : null}
              </T>
            </View>
          </Pressable>
        );
      })}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Btn label="No, refund it" kind="ghost" height={38} busy={busy === 'decline'} disabled={!!busy} style={{ flex: 1 }} onPress={() => answer(false)} />
        <Btn label="Accept" kind="pri" height={38} busy={busy === 'accept'} disabled={!!busy} style={{ flex: 1 }} onPress={() => answer(true)} />
      </View>
    </View>
  );
}

function Action({ icon, label, onPress, busy }: { icon: IconName; label: string; onPress: () => void; busy?: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={busy}
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 58,
        borderWidth: 1,
        borderColor: neutral.ln,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 8,
        opacity: busy ? 0.5 : 1,
      }}>
      <Icon name={icon} size={18} color={t.accInk} />
      <T w={500} s={10.5} style={{ textAlign: 'center' }}>
        {label}
      </T>
    </Pressable>
  );
}

/** What can be done with an order beyond watching it arrive. */
export function OrderExtras({ order }: { order: Order }) {
  const router = useRouter();
  const [fetching, setFetching] = useState(false);
  const delivered = order.status === 'delivered';
  const offers = order.substitutes.filter((s) => s.state === 'offered');

  const invoice = async () => {
    setFetching(true);
    try {
      const file = await api.invoice(order.ref);
      await openFile(file.name, file.base64, 'application/pdf');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not open the invoice.');
    } finally {
      setFetching(false);
    }
  };

  return (
    <>
      {offers.map((offer) => (
        <Offer key={offer.id} order={order} offer={offer} />
      ))}

      {order.status !== 'cancelled' ? (
        <View style={{ backgroundColor: neutral.sur }}>
          <View style={{ flexDirection: 'row', gap: 8, padding: PAD }}>
            {delivered ? <Action icon="edit" label="Rate order" onPress={() => router.push(`/order/rate/${order.ref}`)} /> : null}
            {delivered ? <Action icon="replace" label="Return or replace" onPress={() => router.push(`/order/return/${order.ref}`)} /> : null}
            <Action icon="orders" label={fetching ? 'Fetching…' : 'Invoice'} busy={fetching} onPress={invoice} />
          </View>
          {order.returns.map((row) => (
            <ReturnRow key={row.id} row={row} />
          ))}
        </View>
      ) : null}
    </>
  );
}
