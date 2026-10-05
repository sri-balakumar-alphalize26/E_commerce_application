import { useLocalSearchParams, useRouter } from 'expo-router';
import { ReactNode, useState } from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';
import { ProductDetail } from '../../src/api/types';
import { useAddresses, useProduct } from '../../src/hooks/queries';
import { count, money } from '../../src/lib/format';
import { useCart } from '../../src/store/cart';
import { toast } from '../../src/store/toast';
import { neutral, PAD, useTheme } from '../../src/theme/tokens';
import { Btn, CartBtn, Footer, IconBtn, Loading, Screen, SubHeader } from '../../src/ui/chrome';
import { Icon, IconName, Star } from '../../src/ui/Icon';
import { Photo, Price, Rating, WishButton } from '../../src/ui/product';
import { T } from '../../src/ui/T';

function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={{ backgroundColor: neutral.sur, padding: PAD, gap: 6 }}>
      {title ? (
        <T w={600} s={13}>
          {title}
        </T>
      ) : null}
      {children}
    </View>
  );
}

function Fact({ icon, title, note, first }: { icon: IconName; title: string; note?: string; first?: boolean }) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        paddingVertical: 7,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: neutral.ln,
      }}>
      <Icon name={icon} color={t.acc} />
      <View style={{ flex: 1 }}>
        <T w={500} s={12}>
          {title}
        </T>
        {note ? (
          <T s={11} c={neutral.mut}>
            {note}
          </T>
        ) : null}
      </View>
    </View>
  );
}

function Variants({ detail }: { detail: ProductDetail }) {
  const t = useTheme();
  const router = useRouter();
  // What is picked in each group, by position. Starts on what the page opened with.
  const [picked, setPicked] = useState(() =>
    detail.variants.map((g) => Math.max(0, g.options.findIndex((o) => o.selected)))
  );
  if (!detail.variants.length) return null;
  return (
    <Card>
      {detail.variants.map((group, gi) => (
        <View key={group.name} style={{ gap: 6, marginTop: gi ? 4 : 0 }}>
          <T w={600} s={13}>
            {group.name} ·{' '}
            <T s={13}>{group.options[picked[gi]]?.label.split(' · ')[0]}</T>
          </T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {group.options.map((opt, oi) => {
              const on = picked[gi] === oi;
              return (
                <Pressable
                  key={opt.label}
                  accessibilityRole="radio"
                  accessibilityLabel={`${group.name}: ${opt.label}`}
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    setPicked((p) => p.map((v, i) => (i === gi ? oi : v)));
                    // A choice that is its own product opens that product.
                    if (opt.productId && opt.productId !== detail.product.id) {
                      router.replace(`/product/${opt.productId}`);
                    }
                  }}
                  style={{
                    height: 30,
                    paddingHorizontal: 10,
                    borderRadius: 7,
                    borderWidth: on ? 1.5 : 1,
                    borderColor: on ? t.acc : neutral.ln,
                    backgroundColor: on ? t.accSoft : '#fff',
                    justifyContent: 'center',
                  }}>
                  <T w={500} s={11.5} c={on ? t.accInk : neutral.ink}>
                    {opt.label}
                  </T>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </Card>
  );
}

function Ratings({ detail }: { detail: ProductDetail }) {
  const p = detail.product;
  if (!p.rating) return null;
  const bars = detail.ratingBars;
  return (
    <Card title="Ratings & reviews">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ alignItems: 'center', gap: 2 }}>
          <T w={600} s={28} style={{ lineHeight: 30 }}>
            {p.rating.toFixed(1)}
          </T>
          <View style={{ flexDirection: 'row', gap: 1 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} size={12} color={n <= Math.round(p.rating ?? 0) ? neutral.green : neutral.ln} />
            ))}
          </View>
          {p.ratingCount ? (
            <T s={10.5} c={neutral.mut}>
              {count(p.ratingCount)} ratings
            </T>
          ) : null}
        </View>
        {bars ? (
          <View style={{ flex: 1, gap: 4 }}>
            {bars.map((n, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <T s={10.5} c={neutral.mut} tabular>
                  {5 - i}
                </T>
                <View style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: neutral.ln, overflow: 'hidden' }}>
                  <View style={{ width: `${Math.max(0, Math.min(100, n))}%`, height: '100%', backgroundColor: neutral.green, borderRadius: 3 }} />
                </View>
                <T s={10.5} c={neutral.mut} tabular style={{ minWidth: 28, textAlign: 'right' }}>
                  {Math.round(n)}%
                </T>
              </View>
            ))}
          </View>
        ) : null}
      </View>
      {detail.reviews.map((r, i) => (
        <View key={i} style={{ borderTopWidth: 1, borderTopColor: neutral.ln, paddingTop: 8, marginTop: 2, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <View style={{ backgroundColor: neutral.green, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
              <T w={600} s={10} c="#fff">
                {r.stars} ★
              </T>
            </View>
            <T s={11} c={neutral.mut}>
              <T w={500} s={11}>
                {r.who}
              </T>
              {r.where ? ` · ${r.where}` : ''}
            </T>
          </View>
          <T s={12}>{r.text}</T>
        </View>
      ))}
    </Card>
  );
}

export default function ProductPage() {
  const t = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: detail, error, refetch } = useProduct(id);
  const { data: addresses } = useAddresses();
  const add = useCart((s) => s.add);
  const inCart = useCart((s) => s.items[id] ?? 0);
  const [shot, setShot] = useState(0);

  if (!detail) {
    return (
      <Screen>
        <SubHeader title=" " right={<CartBtn />} />
        <Loading error={error ? 'Could not load this product.' : undefined} onRetry={refetch} />
      </Screen>
    );
  }

  const p = detail.product;
  const quick = p.mode === 'quick';
  const zip = (addresses?.find((a) => a.isDefault) ?? addresses?.[0])?.zip;
  const combo = [p, ...detail.together];
  const comboTotal = combo.reduce((sum, x) => sum + x.price, 0) - (detail.comboSaving ?? 0);
  const [when, ...whenRest] = (p.delivery ?? '').split(' · ');

  return (
    <Screen>
      <SubHeader
        title={p.brand ?? p.name}
        sub={detail.trail}
        right={
          <>
            <IconBtn name="search" label="Search" onPress={() => router.push('/search')} />
            <IconBtn
              name="share"
              label="Share"
              onPress={() => Share.share({ message: `${p.name} · ${money(p.price)} on 369 Mart` }).catch(() => {})}
            />
            <CartBtn />
          </>
        }
      />
      <ScrollView contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
        <View style={{ backgroundColor: '#fff', paddingHorizontal: PAD, paddingTop: 10, paddingBottom: 8, alignItems: 'center', gap: 8 }}>
          <Photo source={p.images[shot] ?? p.images[0]} style={{ width: '100%', height: 230 }} />
          {p.badge ? (
            <View
              style={{
                position: 'absolute',
                top: 12,
                left: 12,
                backgroundColor: t.accSoft,
                borderWidth: 1,
                borderColor: t.accLn,
                borderRadius: 5,
                paddingHorizontal: 7,
                paddingVertical: 2,
              }}>
              <T w={600} s={10} c={t.accInk}>
                {p.badge}
              </T>
            </View>
          ) : null}
          <View style={{ position: 'absolute', top: 10, right: 12 }}>
            <WishButton id={p.id} size={32} />
          </View>
          {p.images.length > 1 ? (
            <View style={{ flexDirection: 'row', gap: 6, alignSelf: 'flex-start' }}>
              {p.images.map((img, i) => (
                <Pressable key={i} accessibilityRole="button" accessibilityLabel={`Photo ${i + 1}`} onPress={() => setShot(i)}>
                  <Photo
                    source={img}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 8,
                      borderWidth: i === shot ? 1.5 : 1,
                      borderColor: i === shot ? t.acc : neutral.ln,
                      backgroundColor: '#fff',
                      padding: 4,
                    }}
                  />
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <Card>
          {p.brand ? (
            <T w={500} s={10.5} c={t.accInk}>
              {p.brand}
            </T>
          ) : null}
          <T w={500} s={15} style={{ lineHeight: 20 }}>
            {p.name}
          </T>
          {p.unit ? (
            <T s={12} c={neutral.mut}>
              {p.unit}
            </T>
          ) : null}
          <Rating product={p} />
          <Price price={p.price} mrp={p.mrp} size={21} offFirst mrpLabel />
          <T s={10.5} c={neutral.mut}>
            Inclusive of all taxes
          </T>
        </Card>

        <Variants detail={detail} />

        <Card>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change delivery address"
            onPress={() => router.push('/addresses')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              borderWidth: 1,
              borderColor: neutral.ln,
              borderRadius: 8,
              height: 34,
              paddingHorizontal: 10,
            }}>
            <Icon name="pin" size={16} color={neutral.mut} />
            <T s={12} c={neutral.mut}>
              Deliver to
            </T>
            <T w={500} s={12}>
              {zip ?? 'your address'}
            </T>
            <T w={600} s={11.5} c={t.accInk} style={{ marginLeft: 'auto' }}>
              {zip ? 'Change' : 'Set'}
            </T>
          </Pressable>
          <Fact
            first
            icon={quick ? 'bolt' : 'truck'}
            title={quick ? `Quick · arrives in about ${when}` : `Express · ${[when, ...whenRest].join(' · ')}`}
            note={quick ? detail.quickNote : detail.expressNote}
          />
          <Fact
            icon="box"
            title={p.soldOut ? 'Sold out' : 'In stock'}
            note={p.low ? `Only ${p.low} left` : quick ? undefined : 'Dispatches within 24 hours'}
          />
        </Card>

        {detail.offers.length ? (
          <Card title="Offers">
            {detail.offers.map((o) => (
              <View key={o.text} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <View
                  style={{
                    backgroundColor: t.accSoft,
                    borderWidth: 1,
                    borderColor: t.accLn,
                    borderRadius: 4,
                    paddingHorizontal: 5,
                    paddingVertical: 1,
                    marginTop: 1,
                  }}>
                  <T w={600} s={10} c={t.accInk}>
                    {o.tag}
                  </T>
                </View>
                <T s={11.5} style={{ flex: 1 }}>
                  {o.text}
                </T>
              </View>
            ))}
          </Card>
        ) : null}

        {detail.together.length ? (
          <Card title="Frequently bought together">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {combo.map((x, i) => (
                <View key={x.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {i ? (
                    <T w={600} c={neutral.mut}>
                      +
                    </T>
                  ) : null}
                  <Pressable accessibilityRole="link" accessibilityLabel={x.name} onPress={() => (i ? router.push(`/product/${x.id}`) : undefined)}>
                    <Photo
                      source={x.images[0]}
                      style={{ width: 64, height: 64, borderWidth: 1, borderColor: neutral.ln, borderRadius: 8, padding: 5, backgroundColor: '#fff' }}
                    />
                  </Pressable>
                </View>
              ))}
              <View style={{ flex: 1, minWidth: 0, paddingLeft: 4 }}>
                <T w={600} s={14} tabular>
                  {money(comboTotal)}
                </T>
                <T s={11} c={neutral.mut}>
                  for {combo.length === 2 ? 'both' : `all ${combo.length}`}
                </T>
                {detail.comboSaving ? (
                  <T w={600} s={11} c={neutral.green}>
                    Save {money(detail.comboSaving)} as a combo
                  </T>
                ) : null}
              </View>
            </View>
            <Btn
              label={combo.length === 2 ? 'Add both' : `Add all ${combo.length}`}
              height={36}
              onPress={() => {
                combo.forEach((x) => add(x.id));
                toast(`${combo.length} items added to cart`);
              }}
            />
          </Card>
        ) : null}

        {detail.highlights.length ? (
          <Card title="Highlights">
            <View style={{ gap: 3 }}>
              {detail.highlights.map((h) => (
                <View key={h} style={{ flexDirection: 'row', gap: 8 }}>
                  <T s={12}>•</T>
                  <T s={12} style={{ flex: 1 }}>
                    {h}
                  </T>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        {detail.specs.length ? (
          <Card title="Specifications">
            <View>
              {detail.specs.map(([k, v], i) => (
                <View key={k} style={{ flexDirection: 'row', paddingVertical: 6, borderTopWidth: i ? 1 : 0, borderTopColor: neutral.ln }}>
                  <T s={12} c={neutral.mut} style={{ width: '38%' }}>
                    {k}
                  </T>
                  <T s={12} style={{ flex: 1 }}>
                    {v}
                  </T>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        <Ratings detail={detail} />

        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 4 }}>
            {(
              [
                ['replace', 'Easy returns'],
                ['shield', 'Genuine products'],
                ['box', 'Sold by 369 Mart'],
              ] as [IconName, string][]
            ).map(([icon, label]) => (
              <View key={label} style={{ alignItems: 'center', gap: 4, width: 72 }}>
                <Icon name={icon} size={22} />
                <T s={10} c={neutral.mut} style={{ textAlign: 'center', lineHeight: 12 }}>
                  {label}
                </T>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>

      <Footer>
        <Btn
          label={inCart ? `In cart · ${inCart}` : 'Add to cart'}
          disabled={p.soldOut}
          style={{ flex: 1 }}
          onPress={() => {
            add(p.id);
            toast('Added to cart');
          }}
        />
        <Btn
          label="Buy now"
          kind="pri"
          disabled={p.soldOut}
          style={{ flex: 1 }}
          onPress={() => {
            if (!inCart) add(p.id);
            router.push('/cart');
          }}
        />
      </Footer>
    </Screen>
  );
}
