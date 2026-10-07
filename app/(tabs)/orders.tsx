import { useRouter } from 'expo-router';
import { FlatList, Pressable, View } from 'react-native';
import { Order } from '../../src/api/types';
import { useOrders } from '../../src/hooks/queries';
import { money } from '../../src/lib/format';
import { useSession } from '../../src/store/session';
import { neutral, PAD, useTheme } from '../../src/theme/tokens';
import { Btn, CartBtn, Loading, Screen, SubHeader } from '../../src/ui/chrome';
import { Icon } from '../../src/ui/Icon';
import { Photo } from '../../src/ui/product';
import { T } from '../../src/ui/T';

function OrderCard({ order }: { order: Order }) {
  const t = useTheme();
  const router = useRouter();
  const over = order.status === 'delivered' || order.status === 'cancelled';
  const quick = order.mode === 'quick';
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Order ${order.ref}, ${order.headline}`}
      onPress={() => router.push(`/order/${order.ref}`)}
      style={{ backgroundColor: neutral.sur, borderWidth: 1, borderColor: neutral.ln, borderRadius: 12, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: PAD, borderBottomWidth: 1, borderBottomColor: neutral.ln }}>
        <Icon name={quick ? 'bolt' : 'truck'} size={13} color={t.acc} />
        <T w={600} s={12} c={over ? (order.status === 'cancelled' ? neutral.red : neutral.green) : t.accInk} style={{ flex: 1 }} numberOfLines={1}>
          {order.status === 'cancelled' ? 'Cancelled' : order.headline}
        </T>
        {order.channel === 'whatsapp' ? (
          <T s={10.5} w={600} c={neutral.green} style={{ backgroundColor: neutral.greenSoft, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 }}>
            via WhatsApp
          </T>
        ) : null}
        <T s={11} c={neutral.mut}>
          #{order.ref}
        </T>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: PAD }}>
        <View style={{ flexDirection: 'row' }}>
          {order.lines.slice(0, 3).map((line, i) => (
            <Photo
              key={line.id}
              source={line.image}
              style={{
                width: 44,
                height: 44,
                borderWidth: 1,
                borderColor: neutral.ln,
                borderRadius: 8,
                padding: 4,
                backgroundColor: '#fff',
                marginLeft: i ? -10 : 0,
              }}
            />
          ))}
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <T s={12} numberOfLines={1}>
            {order.lines[0]?.name}
            {order.lines.length > 1 ? ` + ${order.lines.length - 1} more` : ''}
          </T>
          <T s={11} c={neutral.mut} numberOfLines={1}>
            {order.placedText} · {money(order.total)}
          </T>
        </View>
        <Icon name="right" size={16} color={neutral.mut} />
      </View>
    </Pressable>
  );
}

export default function Orders() {
  const router = useRouter();
  const customer = useSession((s) => s.customer);
  const { data: orders, error, refetch, isRefetching } = useOrders();

  return (
    <Screen>
      <SubHeader noBack title="My orders" right={<CartBtn />} />
      {!customer ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 }}>
          <Icon name="orders" size={40} color={neutral.mut} />
          <T w={600} s={15}>
            Sign in to see your orders
          </T>
          <Btn label="Sign in" kind="pri" onPress={() => router.push('/login')} />
        </View>
      ) : !orders ? (
        <Loading error={error ? 'Could not load your orders.' : undefined} onRetry={refetch} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.ref}
          contentContainerStyle={{ padding: PAD, gap: 8, flexGrow: 1 }}
          refreshing={isRefetching}
          onRefresh={refetch}
          renderItem={({ item }) => <OrderCard order={item} />}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 }}>
              <Icon name="orders" size={40} color={neutral.mut} />
              <T w={600} s={15}>
                No orders yet
              </T>
              <T c={neutral.mut} style={{ textAlign: 'center' }}>
                What you order shows up here, with live tracking.
              </T>
              <Btn label="Start shopping" kind="pri" onPress={() => router.navigate('/')} />
            </View>
          }
        />
      )}
    </Screen>
  );
}
