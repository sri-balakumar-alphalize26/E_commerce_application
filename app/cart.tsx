import { useRouter } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Bill, Mode, Product } from '../src/api/types';
import { useAddresses, useBill, useCartProducts, useHome } from '../src/hooks/queries';
import { money } from '../src/lib/format';
import { useCart } from '../src/store/cart';
import { useSession } from '../src/store/session';
import { toggleWish } from '../src/store/wish';
import { toast } from '../src/store/toast';
import { neutral, PAD, useTheme } from '../src/theme/tokens';
import { Btn, Footer, FooterTotal, Loading, Screen, SectionTitle, SubHeader } from '../src/ui/chrome';
import { Icon } from '../src/ui/Icon';
import { AddStepper, Photo, Price, ProductCard } from '../src/ui/product';
import { T } from '../src/ui/T';

function Line({ product, last }: { product: Product; last: boolean }) {
  const router = useRouter();
  const remove = useCart((s) => s.remove);
  const wished = useCart((s) => !!s.wish[product.id]);
  return (
    <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 10, paddingHorizontal: PAD, borderBottomWidth: last ? 0 : 1, borderBottomColor: neutral.ln }}>
      <Pressable accessibilityRole="link" accessibilityLabel={product.name} onPress={() => router.push(`/product/${product.id}`)}>
        <Photo
          source={product.images[0]}
          style={{ width: 64, height: 64, borderWidth: 1, borderColor: neutral.ln, borderRadius: 8, padding: 5, backgroundColor: '#fff' }}
        />
      </Pressable>
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <T s={12} numberOfLines={2} style={{ lineHeight: 16 }}>
          {product.name}
        </T>
        {product.unit ? (
          <T s={11} c={neutral.mut} numberOfLines={1}>
            {product.unit}
          </T>
        ) : null}
        <Price price={product.price} mrp={product.mrp} size={13} showOff />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 }}>
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => {
              if (!wished) toggleWish(product.id);
              remove(product.id);
              toast('Saved to My list');
            }}>
            <T w={500} s={11} c={neutral.mut}>
              Save for later
            </T>
          </Pressable>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => remove(product.id)}>
            <T w={500} s={11} c={neutral.mut}>
              Remove
            </T>
          </Pressable>
          <View style={{ marginLeft: 'auto' }}>
            <AddStepper product={product} />
          </View>
        </View>
      </View>
    </View>
  );
}

function Group({ mode, lines }: { mode: Mode; lines: Product[] }) {
  const t = useTheme();
  if (!lines.length) return null;
  const when = (lines[0].delivery ?? '').split(' · ')[0];
  return (
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
        <Icon name={mode === 'quick' ? 'bolt' : 'truck'} size={13} color={t.acc} />
        <T w={600} s={12} c={t.accInk}>
          {mode === 'quick' ? 'Quick' : 'Express'}
        </T>
        {when ? <T s={12}>· {mode === 'quick' ? `arrives in ${when}` : when}</T> : null}
        <T s={12} c={neutral.mut} style={{ marginLeft: 'auto' }}>
          {lines.length} item{lines.length === 1 ? '' : 's'}
        </T>
      </View>
      {lines.map((p, i) => (
        <Line key={p.id} product={p} last={i === lines.length - 1} />
      ))}
    </View>
  );
}

function Row({ label, note, children }: { label: string; note?: string; children: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingVertical: 6 }}>
      <View style={{ flexShrink: 1 }}>
        <T s={12}>{label}</T>
        {note ? (
          <T s={10.5} c={neutral.mut}>
            {note}
          </T>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function Fee({ label, line }: { label: string; line?: { fee: number; was: number; freeAbove: number } }) {
  if (!line) return null;
  return (
    <Row label={label} note={`free above ${money(line.freeAbove)}`}>
      {line.fee ? (
        <T s={12} tabular>
          {money(line.fee)}
        </T>
      ) : (
        <T w={500} s={12} c={neutral.green} tabular>
          <T s={12} c={neutral.mut} style={{ textDecorationLine: 'line-through' }}>
            {money(line.was)}
          </T>{' '}
          Free
        </T>
      )}
    </Row>
  );
}

function PriceDetails({ bill }: { bill: Bill }) {
  return (
    <View style={{ backgroundColor: neutral.sur, paddingHorizontal: PAD, paddingTop: 4 }}>
      <T w={600} s={12.5} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: neutral.ln }}>
        Price details
      </T>
      <Row label={`Price (${bill.count} item${bill.count === 1 ? '' : 's'})`}>
        <T s={12} tabular>
          {money(bill.mrp)}
        </T>
      </Row>
      {bill.mrp > bill.items ? (
        <Row label="Discount">
          <T w={500} s={12} c={neutral.green} tabular>
            − {money(bill.mrp - bill.items)}
          </T>
        </Row>
      ) : null}
      <Fee label="Quick delivery" line={bill.fees.quick} />
      <Fee label="Express delivery" line={bill.fees.express} />
      {bill.deliveryFee !== undefined ? (
        <Row label="Delivery">
          {bill.deliveryFee ? (
            <T s={12} tabular>
              {money(bill.deliveryFee)}
            </T>
          ) : (
            <T w={500} s={12} c={neutral.green}>
              Free
            </T>
          )}
        </Row>
      ) : null}
      {bill.slotFee ? (
        <Row label="Priority slot">
          <T s={12} tabular>
            {money(bill.slotFee)}
          </T>
        </Row>
      ) : null}
      {bill.couponOff ? (
        <Row label={`Coupon ${bill.coupon ?? ''}`}>
          <T w={500} s={12} c={neutral.green} tabular>
            − {money(bill.couponOff)}
          </T>
        </Row>
      ) : null}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: neutral.ln, marginTop: 2, paddingTop: 8, paddingBottom: 8 }}>
        <T w={600} s={13}>
          Total amount
        </T>
        <T w={600} s={13} tabular>
          {money(bill.total)}
        </T>
      </View>
      {bill.saved > 0 ? (
        <View style={{ backgroundColor: neutral.greenSoft, marginHorizontal: -PAD, paddingHorizontal: PAD, paddingVertical: 7 }}>
          <T s={11.5} c={neutral.green}>
            You save {money(bill.saved)} on this order
          </T>
        </View>
      ) : null}
    </View>
  );
}

export default function Cart() {
  const t = useTheme();
  const router = useRouter();
  const items = useCart((s) => s.items);
  const coupon = useCart((s) => s.coupon);
  const setCoupon = useCart((s) => s.setCoupon);
  const customer = useSession((s) => s.customer);
  const n = Object.keys(items).length;
  const { data: products } = useCartProducts();
  const { data: bill, error, refetch } = useBill();
  const { data: addresses } = useAddresses();
  const { data: feed } = useHome(t.mode);
  const home = addresses?.find((a) => a.isDefault) ?? addresses?.[0];

  if (!n) {
    return (
      <Screen bg={neutral.sur}>
        <SubHeader title="Cart" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 }}>
          <Icon name="cart" size={40} color={neutral.mut} />
          <T w={600} s={15}>
            Your cart is empty
          </T>
          <T c={neutral.mut} style={{ textAlign: 'center' }}>
            Add something from the shop and it will wait here.
          </T>
          <Btn label="Start shopping" kind="pri" onPress={() => router.replace('/')} style={{ marginTop: 6 }} />
        </View>
      </Screen>
    );
  }

  if (!bill || !products) {
    return (
      <Screen>
        <SubHeader title="Cart" sub={`${n} item${n === 1 ? '' : 's'}`} />
        <Loading error={error ? 'Could not price your cart.' : undefined} onRetry={refetch} />
      </Screen>
    );
  }

  // The shop decides how each line travels; a line it has not priced yet waits with its own default.
  const modeOf = (p: Product): Mode => bill.modes[p.id] ?? p.mode;
  const inBasket = products.filter((p) => items[p.id]);
  const quick = inBasket.filter((p) => modeOf(p) === 'quick');
  const express = inBasket.filter((p) => modeOf(p) === 'express');
  const more = (feed?.sections ?? []).flatMap((s) => s.items).filter((p, i, all) => !items[p.id] && all.findIndex((x) => x.id === p.id) === i);

  return (
    <Screen>
      <SubHeader title="Cart" sub={`${n} item${n === 1 ? '' : 's'}`} />
      <ScrollView contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change delivery address"
          onPress={() => router.push(customer ? '/addresses' : '/login')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingVertical: 9,
            paddingHorizontal: PAD,
            backgroundColor: t.accSoft,
            borderBottomWidth: 1,
            borderBottomColor: t.accLn,
          }}>
          <Icon name="pin" size={15} color={t.accInk} />
          <T s={11.5} c={t.accInk} numberOfLines={1} style={{ flex: 1 }}>
            {home ? (
              <>
                Deliver to{' '}
                <T w={600} s={11.5} c={t.accInk}>
                  {home.label} · {home.city} {home.zip}
                </T>
              </>
            ) : customer ? (
              'Add a delivery address'
            ) : (
              'Sign in to choose where it goes'
            )}
          </T>
          <T w={600} s={11.5} c={t.accInk}>
            {home ? 'Change' : customer ? 'Add' : 'Sign in'}
          </T>
        </Pressable>

        <Group mode="quick" lines={quick} />
        <Group mode="express" lines={express} />

        {bill.coupon || bill.couponHint ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={bill.coupon ? `Remove coupon ${bill.coupon}` : `Apply coupon ${bill.couponHint?.code}`}
            onPress={() => setCoupon(bill.coupon ? null : (bill.couponHint?.code ?? null))}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: PAD, backgroundColor: neutral.sur }}>
            <Icon name="tag" color={t.acc} />
            <View style={{ flex: 1 }}>
              <T w={500}>{bill.coupon ? `${bill.coupon} applied` : 'Apply coupon'}</T>
              <T s={11} c={neutral.green}>
                {bill.coupon
                  ? `You save ${money(bill.couponOff)} · tap to remove`
                  : `${bill.couponHint?.code} available · save ${money(bill.couponHint?.saves ?? 0)}`}
              </T>
            </View>
            <Icon name={bill.coupon ? 'close' : 'right'} color={neutral.mut} />
          </Pressable>
        ) : coupon ? (
          <View style={{ paddingVertical: 10, paddingHorizontal: PAD, backgroundColor: neutral.sur }}>
            <T s={12} c={neutral.red}>
              {coupon} does not apply to this cart.
            </T>
          </View>
        ) : null}

        {more.length ? (
          <View style={{ paddingHorizontal: PAD, gap: 8 }}>
            <SectionTitle title="You may also need" />
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

        <PriceDetails bill={bill} />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 2 }}>
          <Icon name="shield" size={14} color={neutral.mut} />
          <T s={10.5} c={neutral.mut}>
            Safe and secure payments · 100% authentic products
          </T>
        </View>
      </ScrollView>

      <Footer>
        <FooterTotal label="Total" amount={bill.total} />
        <Btn
          label="Place order"
          kind="pri"
          disabled={!!bill.blocked}
          onPress={() => router.push(customer ? '/checkout' : '/login?next=/checkout')}
        />
      </Footer>
      {bill.blocked ? (
        <View style={{ position: 'absolute', left: PAD, right: PAD, bottom: 76, backgroundColor: neutral.ink, borderRadius: 8, padding: 8 }}>
          <T s={11.5} c="#fff">
            {bill.blocked}
          </T>
        </View>
      ) : null}
    </Screen>
  );
}
