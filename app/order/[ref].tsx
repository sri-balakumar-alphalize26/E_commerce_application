import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, View } from 'react-native';
import { api } from '../../src/api/endpoints';
import { ApiError } from '../../src/api/types';
import { useOrder } from '../../src/hooks/queries';
import { money } from '../../src/lib/format';
import { toast } from '../../src/store/toast';
import { neutral, PAD, useTheme } from '../../src/theme/tokens';
import { Btn, Footer, IconBtn, Loading, Screen, SubHeader } from '../../src/ui/chrome';
import { Icon } from '../../src/ui/Icon';
import { OrderLineRow, RouteSketch, Timeline } from '../../src/ui/order';
import { OrderExtras } from '../../src/ui/orderExtras';
import { T } from '../../src/ui/T';

/** One order: where it is, who is bringing it, the code for the door. */
export default function TrackOrder() {
  const t = useTheme();
  const router = useRouter();
  const { ref } = useLocalSearchParams<{ ref: string }>();
  const { data: order, error, refetch } = useOrder(ref);
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState(false);

  const cancel = () =>
    Alert.alert('Cancel this order?', 'It will not be delivered. Anything you paid goes back to your wallet.', [
      { text: 'Keep order', style: 'cancel' },
      {
        text: 'Cancel order',
        style: 'destructive',
        onPress: async () => {
          setCancelling(true);
          try {
            const after = await api.cancelOrder(ref, 'Cancelled in the app');
            queryClient.setQueryData(['order', ref], after);
            queryClient.invalidateQueries({ queryKey: ['orders'] });
          } catch (err) {
            toast(err instanceof ApiError ? err.message : 'Could not cancel the order. Try again.');
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);

  if (!order) {
    return (
      <Screen>
        <SubHeader title={`Order #${ref}`} />
        <Loading error={error ? 'Could not load this order.' : undefined} onRetry={refetch} />
      </Screen>
    );
  }

  const rider = order.rider;
  const initials = rider?.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2);
  const [lead, ...rest] = order.statusLine.split(' · ');
  const help = () => router.push('/support');

  return (
    <Screen>
      <SubHeader
        title={`Order #${order.ref}`}
        sub={`${order.placedText} · ${order.lines.length} item${order.lines.length === 1 ? '' : 's'}`}
        right={<IconBtn name="help" label="Help" onPress={help} />}
      />
      <ScrollView contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
        <View style={{ backgroundColor: neutral.sur, padding: PAD, gap: 2 }}>
          <T w={700} s={20} style={{ letterSpacing: -0.2 }}>
            {order.headline}
          </T>
          <T s={12} c={neutral.mut}>
            <T w={500} s={12}>
              {lead}
            </T>
            {rest.length ? ` · ${rest.join(' · ')}` : ''}
          </T>
        </View>

        {rider ? (
          <View>
            <RouteSketch />
            <View
              style={{
                backgroundColor: neutral.sur,
                paddingVertical: 10,
                paddingHorizontal: PAD,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                borderBottomWidth: 1,
                borderBottomColor: neutral.ln,
              }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: t.accSoft,
                  borderWidth: 1,
                  borderColor: t.accLn,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <T w={600} s={14} c={t.accInk}>
                  {initials}
                </T>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T w={600}>{rider.name} · Rider</T>
                <T s={11} c={neutral.mut} numberOfLines={1}>
                  {rider.note}
                </T>
              </View>
              {rider.phone ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Call the rider"
                  onPress={() => Linking.openURL(`tel:${rider.phone}`)}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    borderWidth: 1,
                    borderColor: neutral.ln,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Icon name="phone" size={18} />
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}

        {order.otp ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: PAD, backgroundColor: neutral.sur }}>
            <View accessibilityLabel={`Delivery code ${order.otp.split('').join(' ')}`} style={{ flexDirection: 'row', gap: 5 }}>
              {order.otp.split('').map((digit, i) => (
                <View
                  key={i}
                  style={{
                    width: 28,
                    height: 34,
                    borderRadius: 6,
                    backgroundColor: neutral.soft,
                    borderWidth: 1,
                    borderColor: neutral.ln,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <T w={600} s={16} tabular>
                    {digit}
                  </T>
                </View>
              ))}
            </View>
            <View style={{ flex: 1 }}>
              <T w={600} s={12}>
                Delivery code
              </T>
              <T s={10.5} c={neutral.mut}>
                Tell the rider this code at the door.
              </T>
            </View>
          </View>
        ) : null}

        <Timeline steps={order.timeline} />

        <OrderExtras order={order} />

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
              Items in this order
            </T>
            <T s={12} c={neutral.mut} style={{ marginLeft: 'auto' }}>
              {money(order.total)} · {order.payNote}
            </T>
          </View>
          {order.lines.map((line) => (
            <OrderLineRow
              key={line.id}
              line={line}
              size={44}
              // A product can be reviewed once it has arrived. A chosen variant is reviewed as its product.
              onReview={order.status === 'delivered' && !line.id.startsWith('v') ? () => router.push(`/review/${line.id}`) : undefined}
            />
          ))}
          {order.address ? (
            <View style={{ paddingVertical: 8, paddingHorizontal: PAD }}>
              <T s={10.5} c={neutral.mut}>
                Delivering to
              </T>
              <T s={12}>
                {order.address.name} · {[order.address.line, order.address.area].filter(Boolean).join(', ')}, {order.address.city} {order.address.zip}
              </T>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Footer>
        {order.canCancel ? (
          <Btn label="Cancel order" kind="ghost" busy={cancelling} style={{ flex: 1 }} onPress={cancel} />
        ) : (
          <Btn label="Need help" kind="ghost" icon="help" style={{ flex: 1 }} onPress={help} />
        )}
        {rider?.phone ? (
          <Btn label="Call rider" kind="pri" icon="phone" style={{ flex: 1 }} onPress={() => Linking.openURL(`tel:${rider.phone}`)} />
        ) : (
          <Btn label="Shop more" kind="pri" style={{ flex: 1 }} onPress={() => router.replace('/')} />
        )}
      </Footer>
    </Screen>
  );
}
