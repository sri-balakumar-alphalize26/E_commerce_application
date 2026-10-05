import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { Img, Mode, Product } from '../api/types';
import { count, money, percentOff } from '../lib/format';
import { useCart } from '../store/cart';
import { toggleWish } from '../store/wish';
import { neutral, useTheme } from '../theme/tokens';
import { flyToCart } from './fly';
import { Icon, Star } from './Icon';
import { T } from './T';

/**
 * A product photo: the whole product, on white, never cropped. Where the shop
 * has no photo yet, a quiet grey mark holds the place.
 */
export function Photo({ source, style }: { source?: Img; style?: StyleProp<ViewStyle> }) {
  const [box, setBox] = useState(0);
  return (
    <View style={style} onLayout={source === undefined ? (e) => setBox(Math.min(e.nativeEvent.layout.width, e.nativeEvent.layout.height)) : undefined}>
      {source !== undefined ? (
        <Image source={source} contentFit="contain" transition={120} style={{ width: '100%', height: '100%' }} />
      ) : (
        <View accessibilityLabel="No photo yet" style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {box ? <Icon name="box" size={Math.max(14, Math.round(box * 0.4))} color="#c5ccd4" stroke={1.2} /> : null}
        </View>
      )}
    </View>
  );
}

/** 4.6★ (312) */
export function Rating({ product }: { product: Product }) {
  if (!product.rating) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 2,
          backgroundColor: neutral.green,
          paddingHorizontal: 5,
          paddingVertical: 1,
          borderRadius: 4,
        }}>
        <T w={600} s={10} c="#fff">
          {product.rating.toFixed(1)}
        </T>
        <Star />
      </View>
      {product.ratingCount ? (
        <T s={10.5} c={neutral.mut}>
          ({count(product.ratingCount)})
        </T>
      ) : null}
    </View>
  );
}

interface PriceProps {
  price: number;
  mrp?: number;
  /** Size of the price itself. */
  size?: number;
  /** Show "15% off" in green after the MRP. */
  showOff?: boolean;
  /** "MRP ₹10,500" rather than a bare struck figure: the product page. */
  mrpLabel?: boolean;
  /** Put the saving first, as the product page does. */
  offFirst?: boolean;
}

export function Price({ price, mrp, size = 14, showOff, mrpLabel, offFirst }: PriceProps) {
  const off = percentOff(price, mrp);
  const saving = off ? (
    <T w={600} s={11} c={neutral.green}>
      {off}
    </T>
  ) : null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5, flexWrap: 'wrap' }}>
      {offFirst ? saving : null}
      <T w={600} s={size} tabular>
        {money(price)}
      </T>
      {off && mrp ? (
        <T s={11} c={neutral.mut} tabular style={{ textDecorationLine: 'line-through' }}>
          {mrpLabel ? `MRP ${money(mrp)}` : money(mrp)}
        </T>
      ) : null}
      {showOff && !offFirst ? saving : null}
    </View>
  );
}

/** ⚡ 13 mins   /   🚚 Thu, 8 Oct · Free */
export function DeliveryLine({ mode, text }: { mode: Mode; text?: string }) {
  const t = useTheme();
  if (!text) return null;
  const [lead, ...rest] = text.split(' · ');
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Icon name={mode === 'quick' ? 'bolt' : 'truck'} size={12} color={t.acc} />
      <T s={10.5} c={neutral.mut} numberOfLines={1} style={{ flexShrink: 1 }}>
        <T w={500} s={10.5}>
          {lead}
        </T>
        {rest.length ? ` · ${rest.join(' · ')}` : ''}
      </T>
    </View>
  );
}

/** Add, which becomes − 1 + once the product is in the basket. */
export function AddStepper({ product, tall }: { product: Product; tall?: boolean }) {
  const t = useTheme();
  const router = useRouter();
  const qty = useCart((s) => s.items[product.id] ?? 0);
  const add = useCart((s) => s.add);
  const dec = useCart((s) => s.dec);
  const button = useRef<View>(null);
  const h = tall ? 32 : 30;

  if (product.soldOut) {
    return (
      <T w={500} s={10.5} c={neutral.mut}>
        Sold out
      </T>
    );
  }

  if (!qty) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Add ${product.name}`}
        hitSlop={6}
        // A product with a choice to make opens its page: nobody picked a variant yet.
        ref={button}
        onPress={() => {
          if (product.hasVariants) return router.push(`/product/${product.id}`);
          flyToCart(button.current, product.images[0]);
          add(product.id);
        }}
        style={({ pressed }) => ({
          height: h,
          paddingHorizontal: 14,
          borderRadius: 7,
          borderWidth: 1,
          borderColor: t.acc,
          backgroundColor: pressed ? t.accSoft : '#fff',
          justifyContent: 'center',
        })}>
        <T w={600} s={12} c={t.accText}>
          Add
        </T>
      </Pressable>
    );
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: h,
        borderRadius: 7,
        borderWidth: 1,
        borderColor: t.accLn,
        backgroundColor: t.accSoft,
      }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="One fewer"
        hitSlop={6}
        onPress={() => dec(product.id)}
        style={{ width: 28, height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="minus" size={12} color={t.accInk} stroke={2} />
      </Pressable>
      <T w={600} s={12} c={t.accInk} tabular style={{ minWidth: 24, textAlign: 'center' }}>
        {qty}
      </T>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="One more"
        hitSlop={6}
        onPress={() => add(product.id)}
        style={{ width: 28, height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="plus" size={12} color={t.accInk} stroke={2} />
      </Pressable>
    </View>
  );
}

export function WishButton({ id, size = 26 }: { id: string; size?: number }) {
  const on = useCart((s) => !!s.wish[id]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={on ? 'Remove from my list' : 'Save to my list'}
      hitSlop={8}
      onPress={() => toggleWish(id)}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: neutral.ln,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon name="heart" size={Math.round(size * 0.54)} color={on ? neutral.red : neutral.mut} filled={on} />
    </Pressable>
  );
}

/** The product card: photo on white, saving, name, rating, price, when it comes, Add. */
export function ProductCard({ product, style }: { product: Product; style?: StyleProp<ViewStyle> }) {
  const router = useRouter();
  const off = percentOff(product.price, product.mrp);
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={product.name}
      onPress={() => router.push(`/product/${product.id}`)}
      style={[
        {
          backgroundColor: neutral.sur,
          borderWidth: 1,
          borderColor: neutral.ln,
          borderRadius: 12,
          overflow: 'hidden',
        },
        style,
      ]}>
      <View style={{ aspectRatio: 1, padding: 12, backgroundColor: '#fff' }}>
        <Photo source={product.images[0]} style={{ flex: 1 }} />
        {off ? (
          <View
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              backgroundColor: neutral.green,
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
            }}>
            <T w={600} s={10} c="#fff">
              {off}
            </T>
          </View>
        ) : null}
        <View style={{ position: 'absolute', top: 6, right: 6 }}>
          <WishButton id={product.id} />
        </View>
      </View>
      <View style={{ padding: 10, paddingTop: 8, gap: 4, borderTopWidth: 1, borderTopColor: neutral.ln }}>
        {product.brand ? (
          <T s={10.5} c={neutral.mut} numberOfLines={1}>
            {product.brand}
          </T>
        ) : null}
        <T s={12} numberOfLines={2} style={{ lineHeight: 16, height: 32 }}>
          {product.name}
        </T>
        <Rating product={product} />
        <Price price={product.price} mrp={product.mrp} />
        <DeliveryLine mode={product.mode} text={product.delivery} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6, marginTop: 2 }}>
          {product.low ? (
            <T w={500} s={10.5} c={neutral.red} style={{ flexShrink: 1 }}>
              Only {product.low} left
            </T>
          ) : (
            <View />
          )}
          <AddStepper product={product} />
        </View>
      </View>
    </Pressable>
  );
}
