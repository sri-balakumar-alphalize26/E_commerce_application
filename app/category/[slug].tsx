import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';
import { Product } from '../../src/api/types';
import { useBrowse } from '../../src/hooks/queries';
import { money } from '../../src/lib/format';
import { neutral, PAD, useTheme } from '../../src/theme/tokens';
import { CartBtn, Loading, Screen, SubHeader } from '../../src/ui/chrome';
import { Icon, IconName } from '../../src/ui/Icon';
import { Photo, ProductCard } from '../../src/ui/product';
import { T } from '../../src/ui/T';

const SORTS = [
  { key: 'popular', label: 'Popular' },
  { key: 'low', label: 'Price: low to high' },
  { key: 'high', label: 'Price: high to low' },
  { key: 'rating', label: 'Top rated' },
] as const;

type SortKey = (typeof SORTS)[number]['key'];

function sorted(items: Product[], sort: SortKey): Product[] {
  if (sort === 'popular') return items;
  const out = [...items];
  if (sort === 'low') out.sort((a, b) => a.price - b.price);
  if (sort === 'high') out.sort((a, b) => b.price - a.price);
  if (sort === 'rating') out.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  return out;
}

function Chip({ label, on, onPress, icon, after }: { label: string; on?: boolean; onPress: () => void; icon?: IconName; after?: IconName }) {
  const t = useTheme();
  const color = on ? t.accInk : neutral.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!on }}
      onPress={onPress}
      style={{
        height: 30,
        paddingHorizontal: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: on ? t.accLn : neutral.ln,
        backgroundColor: on ? t.accSoft : '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
      }}>
      {icon ? <Icon name={icon} size={13} color={color} /> : null}
      <T w={500} s={11.5} c={color}>
        {label}
      </T>
      {after ? <Icon name={after} size={13} color={color} /> : null}
    </Pressable>
  );
}

export default function Category() {
  const t = useTheme();
  const router = useRouter();
  const { slug, sub } = useLocalSearchParams<{ slug: string; sub?: string }>();
  const { data, error, refetch } = useBrowse(slug, sub || undefined);

  const [sort, setSort] = useState<SortKey>('popular');
  const [modeOnly, setModeOnly] = useState(false);
  const [under10k, setUnder10k] = useState(false);
  const [fourUp, setFourUp] = useState(false);
  const [inStock, setInStock] = useState(false);
  const [brand, setBrand] = useState<string | null>(null);

  const brands = useMemo(
    () => [...new Set((data?.items ?? []).map((p) => p.brand).filter((b): b is string => !!b))].slice(0, 6),
    [data]
  );

  // Filtered on the phone, as the website filters in the browser: the page
  // already holds every product of the category.
  const items = useMemo(() => {
    let out = data?.items ?? [];
    if (modeOnly) out = out.filter((p) => p.mode === t.mode);
    if (under10k) out = out.filter((p) => p.price < 10000);
    if (fourUp) out = out.filter((p) => (p.rating ?? 0) >= 4);
    if (inStock) out = out.filter((p) => !p.soldOut);
    if (brand) out = out.filter((p) => p.brand === brand);
    return sorted(out, sort);
  }, [data, modeOnly, under10k, fourUp, inStock, brand, sort, t.mode]);

  const filtering = modeOnly || under10k || fourUp || inStock || !!brand;
  const clear = () => {
    setModeOnly(false);
    setUnder10k(false);
    setFourUp(false);
    setInStock(false);
    setBrand(null);
  };

  if (!data) {
    return (
      <Screen>
        <SubHeader title=" " right={<CartBtn />} />
        <Loading error={error ? 'Could not load this category.' : undefined} onRetry={refetch} />
      </Screen>
    );
  }

  const shownName = data.sub?.name ?? data.category.name;
  const subcats = [{ slug: '', name: 'All', image: data.category.image }, ...data.category.subs];
  const nextSort = SORTS[(SORTS.findIndex((s) => s.key === sort) + 1) % SORTS.length];

  return (
    <Screen>
      <SubHeader
        middle={
          <Pressable
            accessibilityRole="search"
            accessibilityLabel={`Search in ${data.category.name}`}
            onPress={() => router.push('/search')}
            style={{
              flex: 1,
              height: 36,
              marginHorizontal: 4,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: neutral.ln,
              backgroundColor: neutral.sur,
              paddingHorizontal: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}>
            <Icon name="search" color={neutral.mut} />
            <T c={neutral.mut} numberOfLines={1}>
              Search in {data.category.name}
            </T>
          </Pressable>
        }
        right={<CartBtn />}
      />

      <View style={{ backgroundColor: neutral.sur, borderBottomWidth: 1, borderBottomColor: neutral.ln }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: PAD, paddingVertical: 8, gap: 6 }}>
          {filtering ? <Chip label="Clear" icon="close" onPress={clear} /> : null}
          <Chip
            label={SORTS.find((s) => s.key === sort)!.label}
            icon="sort"
            after="down"
            on={sort !== 'popular'}
            onPress={() => setSort(nextSort.key)}
          />
          <Chip
            label={t.mode === 'quick' ? 'Quick only' : 'Express only'}
            icon={t.mode === 'quick' ? 'bolt' : 'truck'}
            on={modeOnly}
            onPress={() => setModeOnly((v) => !v)}
          />
          <Chip label={`Under ${money(10000)}`} on={under10k} onPress={() => setUnder10k((v) => !v)} />
          <Chip label="4★ & up" on={fourUp} onPress={() => setFourUp((v) => !v)} />
          {brands.map((b) => (
            <Chip key={b} label={b} on={brand === b} onPress={() => setBrand(brand === b ? null : b)} />
          ))}
          <Chip label="In stock" on={inStock} onPress={() => setInStock((v) => !v)} />
        </ScrollView>
      </View>

      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 8, paddingHorizontal: PAD }}
        contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
        ListHeaderComponent={
          <View style={{ gap: 8 }}>
            {data.category.subs.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: PAD, paddingTop: 10, paddingBottom: 2, gap: 10 }}>
                {subcats.map((node) => {
                  const on = (sub ?? '') === node.slug;
                  return (
                    <Pressable
                      key={node.slug || 'all'}
                      accessibilityRole="tab"
                      accessibilityLabel={node.name}
                      accessibilityState={{ selected: on }}
                      onPress={() => router.setParams({ sub: node.slug })}
                      style={{ width: 58, alignItems: 'center', gap: 4 }}>
                      <Photo
                        source={node.image}
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 26,
                          backgroundColor: neutral.sur,
                          borderWidth: on ? 1.5 : 1,
                          borderColor: on ? t.acc : neutral.ln,
                          padding: 7,
                          overflow: 'hidden',
                        }}
                      />
                      <T w={on ? 600 : 400} s={10.5} c={on ? t.accInk : neutral.mut} numberOfLines={1} style={{ textAlign: 'center' }}>
                        {node.name}
                      </T>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={{ height: 2 }} />
            )}
            <T s={11} c={neutral.mut} style={{ paddingHorizontal: PAD }}>
              {items.length} product{items.length === 1 ? '' : 's'} in {shownName}
            </T>
          </View>
        }
        ListEmptyComponent={
          <View style={{ padding: 32, alignItems: 'center', gap: 4 }}>
            <T w={600} s={14}>
              {filtering ? 'Nothing matches these filters' : 'Launching soon'}
            </T>
            <T c={neutral.mut} style={{ textAlign: 'center' }}>
              {filtering ? 'Clear a filter to see more.' : `${shownName} will be stocked shortly.`}
            </T>
          </View>
        }
        renderItem={({ item }) => <ProductCard product={item} style={{ flex: 1, maxWidth: '50%' }} />}
      />
    </Screen>
  );
}
