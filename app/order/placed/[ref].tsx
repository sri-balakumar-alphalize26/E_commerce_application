import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, Share, View } from 'react-native';
import { useHome, useOrder } from '../../../src/hooks/queries';
import { money } from '../../../src/lib/format';
import { useSession } from '../../../src/store/session';
import { neutral, PAD, useTheme } from '../../../src/theme/tokens';
import { Btn, Footer, IconBtn, Loading, Screen, SectionTitle, SubHeader } from '../../../src/ui/chrome';
import { Icon } from '../../../src/ui/Icon';
import { OrderLineRow } from '../../../src/ui/order';
import { Printed } from '../../../src/ui/Printed';
import { ProductCard } from '../../../src/ui/product';
import { T } from '../../../src/ui/T';

/** The confirmation straight after paying. */
export default function OrderPlaced() {
  const t = useTheme();
  const router = useRouter();
  const { ref } = useLocalSearchParams<{ ref: string }>();
  const { data: order, error, refetch } = useOrder(ref);
  const customer = useSession((s) => s.customer);
  const { data: feed } = useHome(order?.mode ?? 'quick');

  if (!order) {
    return (
      <Screen>
        <SubHeader noBack title="Order placed" />
        <Loading error={error ? 'Could not load your order.' : undefined} onRetry={refetch} />
      </Screen>
    );
  }

  const quick = order.mode === 'quick';
  const firstName = customer?.name.split(' ')[0];
  const bought = new Set(order.lines.map((l) => l.id));
  const more = (feed?.sections ?? []).flatMap((s) => s.items).filter((p, i, all) => !bought.has(p.id) && all.findIndex((x) => x.id === p.id) === i);

  return (
    <Screen>
      <SubHeader
        noBack
        title="Order placed"
        right={
          <IconBtn
            name="share"
            label="Share"
            onPress={() => Share.share({ message: `My 369 Mart order #${order.ref} · ${order.headline}` }).catch(() => {})}
          />
        }
      />
      <ScrollView contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
        <View style={{ backgroundColor: neutral.sur, paddingTop: 28, paddingBottom: 18, paddingHorizontal: 16, alignItems: 'center', gap: 8 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#e7f6ec', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={30} color={neutral.green} stroke={2.4} />
          </View>
          <T w={600} s={19} style={{ marginTop: 4 }}>
            Thank you{firstName ? `, ${firstName}` : ''}
          </T>
          <T c={neutral.mut} style={{ textAlign: 'center' }}>
            Order #{order.ref} · {money(order.total)} · {order.payNote}
          </T>
          <View
            style={{
              marginTop: 6,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: t.accSoft,
              borderWidth: 1,
              borderColor: t.accLn,
              borderRadius: 999,
              paddingVertical: 6,
              paddingHorizontal: 12,
            }}>
            <Icon name={quick ? 'bolt' : 'truck'} size={14} color={t.accInk} />
            <T w={600} s={12} c={t.accInk}>
              {order.headline}
            </T>
          </View>
        </View>

        <Printed>
        <View style={{ backgroundColor: neutral.sur }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingVertical: 9,
              paddingHorizontal: PAD,
              borderBottomWidth: 1,
              borderBottomColor: neutral.ln,
            }}>
            <T w={600} s={12}>
              Items ({order.lines.length})
            </T>
            {order.address ? (
              <T s={12} c={neutral.mut} numberOfLines={1} style={{ marginLeft: 'auto', flexShrink: 1 }}>
                Deliver to {order.address.label} · {order.address.city} {order.address.zip}
              </T>
            ) : null}
          </View>
          {order.lines.map((line) => (
            <OrderLineRow key={line.id} line={line} showMode />
          ))}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingVertical: 8, paddingHorizontal: PAD }}>
            <View>
              <T s={10.5} c={neutral.mut}>
                Payment
              </T>
              <T w={600} s={12}>
                {order.payNote}
              </T>
            </View>
            {order.slot ? (
              <View style={{ alignItems: 'flex-end', flexShrink: 1 }}>
                <T s={10.5} c={neutral.mut}>
                  Slot
                </T>
                <T w={600} s={12} numberOfLines={1}>
                  {order.slot}
                </T>
              </View>
            ) : null}
          </View>
        </View>
        </Printed>

        {more.length ? (
          <View style={{ paddingHorizontal: PAD, paddingTop: 4, gap: 8 }}>
            <SectionTitle title="Complete your setup" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -PAD }}
              contentContainerStyle={{ paddingHorizontal: PAD, gap: 8 }}>
              {more.map((p) => (
                <ProductCard key={p.id} product={p} style={{ width: 150 }} />
              ))}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>

      <Footer>
        <Btn label="Continue shopping" kind="ghost" style={{ flex: 1 }} onPress={() => router.replace('/')} />
        <Btn label="Track order" kind="pri" style={{ flex: 1 }} onPress={() => router.replace(`/order/${order.ref}`)} />
      </Footer>
    </Screen>
  );
}
