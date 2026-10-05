import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Banner, BannerTone, CategoryNode, HomeSection } from '../../src/api/types';
import { useHome } from '../../src/hooks/queries';
import { categoryHref } from '../../src/lib/links';
import { neutral, PAD, useTheme } from '../../src/theme/tokens';
import { CartBar, Loading, Screen, SectionTitle } from '../../src/ui/chrome';
import { Icon } from '../../src/ui/Icon';
import { ModeHeader } from '../../src/ui/ModeHeader';
import { Photo, ProductCard } from '../../src/ui/product';
import { T } from '../../src/ui/T';

const NAVY: [string, string, string] = ['#0d2a3c', '#0b4a6e', '#0a78ab'];

const TONES: Record<BannerTone, [string, string, string]> = {
  violet: ['#1b1a2e', '#3b2a6b', '#6b4fd6'],
  blue: NAVY,
  navy: NAVY,
  teal: ['#0a2b2b', '#0f5a57', '#17908a'],
  orange: ['#2b1a0a', '#7a3f0a', '#c9641a'],
  purple: ['#1b1a2e', '#3b2a6b', '#6b4fd6'],
  red: ['#2e0f0f', '#7a1f1f', '#c0392b'],
  amber: ['#2b1a0a', '#7a3f0a', '#c9641a'],
  green: ['#0f2d1a', '#1e5a34', '#2f8f55'],
};

function BannerCard({ banner }: { banner: Banner }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${banner.title}. ${banner.note}`}
      onPress={() => (banner.href ? router.push(categoryHref(banner.href)) : undefined)}>
      <LinearGradient
        colors={TONES[banner.tone] ?? NAVY}
        locations={[0, 0.6, 1]}
        start={{ x: 0, y: 0.3 }}
        end={{ x: 1, y: 0.7 }}
        style={{ width: 236, height: 118, borderRadius: 12, padding: 12, justifyContent: 'flex-end', gap: 2, overflow: 'hidden' }}>
        {banner.pill ? (
          <View
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              backgroundColor: 'rgba(255,255,255,0.18)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.35)',
              borderRadius: 999,
              paddingHorizontal: 8,
              paddingVertical: 2,
            }}>
            <T w={600} s={10} c="#fff">
              {banner.pill}
            </T>
          </View>
        ) : null}
        <T w={700} s={15} c="#fff" style={{ lineHeight: 17, maxWidth: '58%' }}>
          {banner.title}
        </T>
        <T s={11} c="rgba(255,255,255,0.9)" style={{ maxWidth: '58%' }}>
          {banner.note}
        </T>
        {banner.image !== undefined ? (
          <Photo
            source={banner.image}
            style={{ position: 'absolute', right: 10, top: 12, width: 88, height: 70, backgroundColor: '#fff', borderRadius: 8, padding: 4 }}
          />
        ) : null}
      </LinearGradient>
    </Pressable>
  );
}

function Tile({ node }: { node: CategoryNode }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={node.name}
      onPress={() => router.push(categoryHref(node.slug))}
      style={{ width: '22.9%', alignItems: 'center', gap: 6 }}>
      <Photo
        source={node.image}
        style={{
          width: '100%',
          aspectRatio: 1,
          borderRadius: 14,
          backgroundColor: neutral.sur,
          borderWidth: 1,
          borderColor: neutral.ln,
          padding: 9,
        }}
      />
      <T s={11} style={{ textAlign: 'center', lineHeight: 13 }} numberOfLines={2}>
        {node.name}
      </T>
    </Pressable>
  );
}

/** 04 : 12 : 36 until the day's deals end. */
function Countdown({ endsAt }: { endsAt: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const left = Math.max(0, Math.floor((endsAt - now) / 1000));
  const parts = [Math.floor(left / 3600), Math.floor((left % 3600) / 60), left % 60];
  return (
    <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      {parts.map((n, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          {i ? <T s={12}>:</T> : null}
          <View style={{ backgroundColor: neutral.ink, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 }}>
            <T w={600} s={11} c="#fff" tabular>
              {String(n).padStart(2, '0')}
            </T>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function Home() {
  const t = useTheme();
  const router = useRouter();
  const { data: feed, error, refetch } = useHome(t.mode);

  return (
    <Screen accent>
      <ModeHeader eta={feed?.eta} tabs={feed?.tabs ?? []} searchHint={feed?.searchHint} />
      {!feed ? (
        <Loading error={error ? 'Could not load the shop.' : undefined} onRetry={refetch} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: PAD, gap: 12, paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
          {feed.banners.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -PAD }}
              contentContainerStyle={{ paddingHorizontal: PAD, gap: 8 }}>
              {feed.banners.map((b) => (
                <BannerCard key={b.id} banner={b} />
              ))}
            </ScrollView>
          ) : null}

          {feed.tiles.length ? (
            <View style={{ gap: 8 }}>
              <SectionTitle title="Shop by category" action="See all" onAction={() => router.navigate('/categories')} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: '2.8%', rowGap: 10 }}>
                {feed.tiles.slice(0, 7).map((node) => (
                  <Tile key={node.slug} node={node} />
                ))}
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel="All categories"
                  onPress={() => router.navigate('/categories')}
                  style={{ width: '22.9%', alignItems: 'center', gap: 6 }}>
                  <View
                    style={{
                      width: '100%',
                      aspectRatio: 1,
                      borderRadius: 14,
                      backgroundColor: t.accSoft,
                      borderWidth: 1,
                      borderColor: t.accLn,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 2,
                    }}>
                    <Icon name="right" color={t.accInk} />
                    <T w={600} s={11} c={t.accInk}>
                      All
                    </T>
                  </View>
                  <T s={11} style={{ textAlign: 'center', lineHeight: 13 }}>
                    {feed.moreCategories ? `${feed.moreCategories} more` : 'See all'}
                  </T>
                </Pressable>
              </View>
            </View>
          ) : null}

          {feed.deal ? (
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push('/offers')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: neutral.sur,
                borderWidth: 1,
                borderColor: neutral.ln,
                borderRadius: 10,
                paddingVertical: 8,
                paddingHorizontal: 10,
              }}>
              <Icon name="clock" color={t.acc} />
              <T s={12} style={{ flexShrink: 1 }}>
                <T w={600} s={12}>
                  Deals of the day
                </T>{' '}
                · {feed.deal.text}
              </T>
              {feed.deal.endsAt ? (
                <Countdown endsAt={feed.deal.endsAt} />
              ) : (
                <View style={{ marginLeft: 'auto' }}>
                  <Icon name="right" size={16} color={neutral.mut} />
                </View>
              )}
            </Pressable>
          ) : null}

          {feed.sections.slice(0, 1).map((sec) => (
            <Rail key={sec.key} section={sec} />
          ))}

          {feed.brands.length ? (
            <View style={{ gap: 8 }}>
              <SectionTitle title="Top brands" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginHorizontal: -PAD }}
                contentContainerStyle={{ paddingHorizontal: PAD, gap: 8 }}>
                {feed.brands.map((brand) => (
                  <Pressable
                    key={brand}
                    accessibilityRole="link"
                    accessibilityLabel={`Search ${brand}`}
                    onPress={() => router.push(`/search?q=${encodeURIComponent(brand)}`)}
                    style={{
                      height: 34,
                      paddingHorizontal: 14,
                      borderRadius: 8,
                      backgroundColor: neutral.sur,
                      borderWidth: 1,
                      borderColor: neutral.ln,
                      justifyContent: 'center',
                    }}>
                    <T w={700} s={12} c="#2a3540" style={{ letterSpacing: 0.24 }}>
                      {brand}
                    </T>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {feed.sections.slice(1).map((sec) => (
            <Rail key={sec.key} section={sec} />
          ))}
        </ScrollView>
      )}
      <CartBar />
    </Screen>
  );
}

function Rail({ section }: { section: HomeSection }) {
  const router = useRouter();
  const route = section.route;
  if (section.banners) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -PAD }}
        contentContainerStyle={{ paddingHorizontal: PAD, gap: 8 }}>
        {section.banners.map((b) => (
          <BannerCard key={b.id} banner={b} />
        ))}
      </ScrollView>
    );
  }
  return (
    <View style={{ gap: 8 }}>
      <SectionTitle
        title={section.title}
        note={section.subtitle}
        action={route ? 'See all' : undefined}
        onAction={route ? () => router.push(categoryHref(route)) : undefined}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -PAD }}
        contentContainerStyle={{ paddingHorizontal: PAD, gap: 8 }}>
        {section.items.map((p) => (
          <ProductCard key={p.id} product={p} style={{ width: 150 }} />
        ))}
      </ScrollView>
    </View>
  );
}
