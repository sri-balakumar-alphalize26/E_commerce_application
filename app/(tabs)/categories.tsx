import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { useCatalog } from '../../src/hooks/queries';
import { categoryHref } from '../../src/lib/links';
import { neutral, PAD } from '../../src/theme/tokens';
import { CartBtn, IconBtn, Loading, Screen, SectionTitle, SubHeader } from '../../src/ui/chrome';
import { Photo } from '../../src/ui/product';
import { T } from '../../src/ui/T';

/** Every category the shop has, grouped under its parent. */
export default function Categories() {
  const router = useRouter();
  const { data: tree, error, refetch } = useCatalog();

  return (
    <Screen>
      <SubHeader
        noBack
        title="Categories"
        right={
          <>
            <IconBtn name="search" label="Search" onPress={() => router.push('/search')} />
            <CartBtn />
          </>
        }
      />
      {!tree ? (
        <Loading error={error ? 'Could not load the categories.' : undefined} onRetry={refetch} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: PAD, gap: 16 }}>
          {tree.map((top) => {
            const tiles = top.subs.length
              ? top.subs.map((s) => ({ ...s, path: `${top.slug}/${s.slug}` }))
              : [{ ...top, path: top.slug }];
            return (
              <View key={top.slug} style={{ gap: 8 }}>
                <SectionTitle title={top.name} action="See all" onAction={() => router.push(categoryHref(top.slug))} />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: '2.8%', rowGap: 10 }}>
                  {tiles.map((node) => (
                    <Pressable
                      key={node.path}
                      accessibilityRole="link"
                      accessibilityLabel={node.name}
                      onPress={() => router.push(categoryHref(node.path))}
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
                      <T s={11} numberOfLines={2} style={{ textAlign: 'center', lineHeight: 13 }}>
                        {node.name}
                      </T>
                    </Pressable>
                  ))}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}
