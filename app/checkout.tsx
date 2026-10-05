import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Switch, View } from 'react-native';
import { api } from '../src/api/endpoints';
import { ApiError, Mode, PayCode } from '../src/api/types';
import { useAddresses, useBill, useSlots } from '../src/hooks/queries';
import { count, money } from '../src/lib/format';
import { useCart } from '../src/store/cart';
import { useSession } from '../src/store/session';
import { toast } from '../src/store/toast';
import { neutral, PAD, useTheme } from '../src/theme/tokens';
import { Btn, Footer, FooterTotal, Loading, Screen, SubHeader } from '../src/ui/chrome';
import { Field } from '../src/ui/Field';
import { Icon } from '../src/ui/Icon';
import { GroupTitle, OptionRow } from '../src/ui/OptionRow';
import { T } from '../src/ui/T';

function Step({ n, label, state }: { n: number; label: string; state: 'done' | 'cur' | 'todo' }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          borderWidth: 1.5,
          borderColor: state === 'done' ? neutral.green : state === 'cur' ? t.acc : neutral.ln,
          backgroundColor: state === 'done' ? neutral.green : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {state === 'done' ? (
          <Icon name="check" size={10} color="#fff" stroke={3} />
        ) : (
          <T w={600} s={10} c={state === 'cur' ? t.accInk : neutral.mut} style={{ lineHeight: 12 }}>
            {n}
          </T>
        )}
      </View>
      <T w={500} s={11} c={state === 'todo' ? neutral.mut : neutral.ink}>
        {label}
      </T>
    </View>
  );
}

export default function Checkout() {
  const t = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const customer = useSession((s) => s.customer);
  const items = useCart((s) => s.items);
  const coupon = useCart((s) => s.coupon);
  const clear = useCart((s) => s.clear);

  const { data: addresses } = useAddresses();
  const { data: slots } = useSlots();
  const address = addresses?.find((a) => a.isDefault) ?? addresses?.[0];

  const [slotKey, setSlotKey] = useState<string | null>(null);
  const [pay, setPay] = useState<PayCode | null>(null);
  const [placing, setPlacing] = useState(false);
  const [usePoints, setUsePoints] = useState(false);
  const [whatsapp, setWhatsapp] = useState(false);
  const [instructions, setInstructions] = useState('');
  // The order's reference, kept across re-pricing so a changed slot is still the same order.
  const ref = useRef<string | undefined>(undefined);

  // Priced first without a slot to learn how the basket travels, then with the slot's fee.
  const { data: firstBill } = useBill({ addressId: address?.id });
  // One Quick line makes it a Quick order, as the shop does it.
  const orderMode: Mode | null = firstBill
    ? Object.values(firstBill.modes).includes('quick')
      ? 'quick'
      : 'express'
    : null;
  const mySlots = (slots ?? []).filter((s) => s.mode === orderMode);
  const slot = mySlots.find((s) => s.key === slotKey) ?? mySlots[0];
  const { data: bill, error, refetch } = useBill({ addressId: address?.id, slotFee: slot?.fee ?? 0, usePoints });

  // With an address and a slot the shop writes the order down. That prices it
  // for good and says how it can be paid; nothing is charged until Pay.
  const itemsKey = Object.keys(items)
    .sort()
    .map((id) => `${id}:${items[id]}`)
    .join(',');
  const canDraft = !!customer && !!address && !!slot && !!bill && !bill.blocked && !placing;
  const draft = useQuery({
    queryKey: ['draft', itemsKey, coupon, address?.id, slot?.key, usePoints],
    queryFn: async () => {
      const d = await api.draftOrder({ items, addressId: address!.id, slotKey: slot!.key, coupon, ref: ref.current, usePoints });
      ref.current = d.ref;
      return d;
    },
    enabled: canDraft,
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  });
  const methods = draft.data?.methods;
  const method = methods?.find((m) => m.code === pay && m.enabled) ?? methods?.find((m) => m.enabled);

  if (!customer) return <Redirect href="/login?next=/checkout" />;
  if (!itemsKey && !placing) return <Redirect href="/cart" />;

  if (!bill || !slots || !addresses) {
    return (
      <Screen>
        <SubHeader title="Checkout" />
        <Loading error={error ? 'Could not load checkout.' : undefined} onRetry={refetch} />
      </Screen>
    );
  }

  const total = draft.data?.total ?? bill.total;
  const ready = !!draft.data && !!method && !bill.blocked;

  const place = async () => {
    if (!draft.data || !method || !address || !slot) return;
    setPlacing(true);
    try {
      // Written once more with the note and the WhatsApp choice as they now stand: the same
      // order, same reference, so typing a note never made a second one.
      const final = await api.draftOrder({
        items,
        addressId: address.id,
        slotKey: slot.key,
        coupon,
        ref: draft.data.ref,
        usePoints,
        whatsapp,
        instructions,
      });
      const order = await api.payOrder(final.ref, method.code);
      queryClient.invalidateQueries({ queryKey: ['points'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.setQueryData(['order', order.ref], order);
      router.replace(`/order/placed/${order.ref}`);
      clear();
    } catch (err) {
      setPlacing(false);
      toast(err instanceof ApiError ? err.message : 'Could not place the order. Try again.');
    }
  };

  return (
    <Screen>
      <SubHeader title="Checkout" sub={`Order total ${money(total)}`} />
      <ScrollView contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: neutral.sur,
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: neutral.ln,
          }}>
          <Step n={1} label="Address" state={address ? 'done' : 'cur'} />
          <View style={{ flex: 1, height: 1.5, backgroundColor: neutral.ln, marginHorizontal: 8 }} />
          <Step n={2} label="Slot" state={!address ? 'todo' : slot ? 'done' : 'cur'} />
          <View style={{ flex: 1, height: 1.5, backgroundColor: neutral.ln, marginHorizontal: 8 }} />
          <Step n={3} label="Payment" state={address && slot ? 'cur' : 'todo'} />
        </View>

        <View>
          <GroupTitle title="Deliver to" action={address ? 'Change' : undefined} onAction={() => router.push('/addresses')} />
          {address ? (
            <OptionRow
              last
              selected
              title={`${address.name} · ${address.label}`}
              note={`${[address.line, address.area].filter(Boolean).join(', ')}, ${address.city} ${address.zip} · ${address.phone}`}
            />
          ) : (
            <View style={{ backgroundColor: neutral.sur, padding: PAD }}>
              <Btn label="Add a delivery address" icon="plus" onPress={() => router.push('/addresses/edit')} />
            </View>
          )}
        </View>

        {mySlots.length ? (
          <View>
            <GroupTitle title="Delivery slot" />
            {mySlots.map((s, i) => (
              <OptionRow
                key={s.key}
                last={i === mySlots.length - 1}
                selected={s.key === slot?.key}
                onPress={() => setSlotKey(s.key)}
                title={s.title}
                tag={s.tag}
                note={s.note}
                right={
                  s.fee ? (
                    <T w={500} s={12} tabular>
                      + {money(s.fee)}
                    </T>
                  ) : (
                    <T w={500} s={12} c={neutral.green}>
                      Free
                    </T>
                  )
                }
              />
            ))}
          </View>
        ) : null}

        <View style={{ backgroundColor: neutral.sur, padding: PAD, gap: 10 }}>
          <Field
            label="Instructions for the rider (optional)"
            value={instructions}
            onChangeText={setInstructions}
            placeholder="Ring the bell, leave at the gate…"
            maxLength={200}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <T w={500} s={12.5}>
                Send updates on WhatsApp
              </T>
              <T s={11} c={neutral.mut}>
                Packed, on the way and delivered, to {address?.phone || 'your number'}.
              </T>
            </View>
            <Switch
              accessibilityLabel="Send updates on WhatsApp"
              value={whatsapp}
              onValueChange={setWhatsapp}
              trackColor={{ true: t.acc, false: neutral.radio }}
              thumbColor="#fff"
            />
          </View>
          {bill.points && bill.points.usable > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: neutral.ln, paddingTop: 10 }}>
              <View style={{ flex: 1 }}>
                <T w={500} s={12.5}>
                  Use {count(bill.points.usable)} points
                </T>
                <T s={11} c={neutral.green}>
                  {bill.points.applied ? `${money(bill.points.off)} taken off this order` : `Saves ${money(bill.points.value)} on this order`}
                </T>
              </View>
              <Switch
                accessibilityLabel="Pay part of this order with points"
                value={usePoints}
                onValueChange={setUsePoints}
                trackColor={{ true: t.acc, false: neutral.radio }}
                thumbColor="#fff"
              />
            </View>
          ) : null}
        </View>

        <View>
          <GroupTitle title="Pay with" />
          {!address ? (
            <T s={12} c={neutral.mut} style={{ backgroundColor: neutral.sur, padding: PAD }}>
              Add an address to see how you can pay.
            </T>
          ) : bill.blocked ? (
            <T s={12} c={neutral.red} style={{ backgroundColor: neutral.sur, padding: PAD }}>
              {bill.blocked}
            </T>
          ) : draft.error ? (
            <View style={{ backgroundColor: neutral.sur, padding: PAD, gap: 8 }}>
              <T s={12} c={neutral.red}>
                {draft.error instanceof ApiError ? draft.error.message : 'Could not prepare the order.'}
              </T>
              <Btn label="Try again" height={36} onPress={() => draft.refetch()} />
            </View>
          ) : !methods ? (
            <View style={{ backgroundColor: neutral.sur, padding: 20, alignItems: 'center' }}>
              <ActivityIndicator color={t.acc} />
            </View>
          ) : !methods.length ? (
            <T s={12} c={neutral.mut} style={{ backgroundColor: neutral.sur, padding: PAD }}>
              No way to pay for this order is available right now.
            </T>
          ) : (
            methods.map((m, i) => (
              <OptionRow
                key={m.code}
                last={i === methods.length - 1}
                selected={m.code === method?.code}
                disabled={!m.enabled}
                onPress={() => setPay(m.code)}
                mark={m.mark}
                title={m.title}
                note={m.note}
              />
            ))
          )}
        </View>
      </ScrollView>

      <Footer>
        <FooterTotal label="To pay" amount={total} />
        <Btn
          label={method?.code === 'cod' ? 'Place order' : `Pay ${money(total)}`}
          kind="pri"
          busy={placing}
          disabled={!ready}
          onPress={place}
        />
      </Footer>
    </Screen>
  );
}
