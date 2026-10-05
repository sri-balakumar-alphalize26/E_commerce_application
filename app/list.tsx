import { useRouter } from 'expo-router';
import { FlatList } from 'react-native';
import { useWishProducts } from '../src/hooks/queries';
import { useCart } from '../src/store/cart';
import { PAD } from '../src/theme/tokens';
import { CartBtn, Empty, Loading, Screen, SubHeader } from '../src/ui/chrome';
import { ProductCard } from '../src/ui/product';

/** My list: everything the customer has hearted. */
export default function MyList() {
  const router = useRouter();
  const wish = useCart((s) => s.wish);
  const n = Object.keys(wish).length;
  const { data, error, refetch } = useWishProducts();
  // A product taken off the list leaves at once, without waiting for the next fetch.
  const items = (data ?? []).filter((p) => wish[p.id]);

  return (
    <Screen>
      <SubHeader title="My list" sub={n ? `${n} item${n === 1 ? '' : 's'}` : undefined} right={<CartBtn />} />
      {!n ? (
        <Empty
          icon="heart"
          title="Nothing saved yet"
          text="Tap the heart on a product and it waits here."
          action="Start shopping"
          onAction={() => router.replace('/')}
        />
      ) : !data ? (
        <Loading error={error ? 'Could not load your list.' : undefined} onRetry={refetch} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 8, paddingHorizontal: PAD }}
          contentContainerStyle={{ gap: 8, paddingVertical: PAD }}
          renderItem={({ item }) => <ProductCard product={item} style={{ flex: 1, maxWidth: '50%' }} />}
        />
      )}
    </Screen>
  );
}
