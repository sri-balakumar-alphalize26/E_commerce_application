import { useQuery } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { FlatList, Pressable, View } from 'react-native';
import { api } from '../src/api/endpoints';
import { useMyReviews } from '../src/hooks/queries';
import { useSession } from '../src/store/session';
import { neutral, PAD } from '../src/theme/tokens';
import { Empty, Loading, Screen, SubHeader, whenText } from '../src/ui/chrome';
import { Icon, Star } from '../src/ui/Icon';
import { Photo } from '../src/ui/product';
import { T } from '../src/ui/T';

/** Every review the customer has written. Tap one to change it. */
export default function MyReviews() {
  const router = useRouter();
  const customer = useSession((s) => s.customer);
  const { data: reviews, error, refetch } = useMyReviews();
  const ids = Object.keys(reviews ?? {}).sort();
  const { data: products } = useQuery({
    queryKey: ['products', ids.join(',')],
    queryFn: () => api.products(ids),
    enabled: ids.length > 0,
  });

  if (!customer) return <Redirect href="/login?next=/reviews" />;

  return (
    <Screen>
      <SubHeader title="My reviews" />
      {!reviews ? (
        <Loading error={error ? 'Could not load your reviews.' : undefined} onRetry={refetch} />
      ) : (
        <FlatList
          data={ids}
          keyExtractor={(id) => id}
          contentContainerStyle={{ flexGrow: 1, paddingVertical: 8 }}
          ListEmptyComponent={
            <Empty icon="edit" title="No reviews yet" text="Review what you bought from an order that has arrived." action="My orders" onAction={() => router.navigate('/orders')} />
          }
          renderItem={({ item: id }) => {
            const review = reviews[id];
            const product = products?.find((p) => p.id === id);
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Your ${review.stars} star review of ${product?.name ?? 'a product'}. Edit`}
                onPress={() => router.push(`/review/${id}`)}
                style={{
                  flexDirection: 'row',
                  gap: 10,
                  paddingVertical: 10,
                  paddingHorizontal: PAD,
                  backgroundColor: neutral.sur,
                  borderBottomWidth: 1,
                  borderBottomColor: neutral.ln,
                }}>
                <Photo
                  source={product?.images[0]}
                  style={{ width: 52, height: 52, borderWidth: 1, borderColor: neutral.ln, borderRadius: 8, padding: 4, backgroundColor: '#fff' }}
                />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <T s={12} numberOfLines={1}>
                    {product?.name ?? 'Product'}
                  </T>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} size={12} color={n <= review.stars ? '#f0a51f' : neutral.ln} />
                    ))}
                    <T s={10.5} c={neutral.mut}>
                      {'  '}
                      {whenText(review.at)}
                    </T>
                  </View>
                  {review.title || review.text ? (
                    <T s={12} c={neutral.mut} numberOfLines={2}>
                      {[review.title, review.text].filter(Boolean).join(' — ')}
                    </T>
                  ) : null}
                  {review.state !== 'published' ? (
                    <T s={11} c={neutral.amber}>
                      Held back by the shop
                    </T>
                  ) : null}
                </View>
                <Icon name="right" size={16} color={neutral.mut} />
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}
