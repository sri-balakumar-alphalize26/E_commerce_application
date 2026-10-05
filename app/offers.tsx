import { FlatList, View } from 'react-native';
import { useOffers } from '../src/hooks/queries';
import { neutral, PAD } from '../src/theme/tokens';
import { CartBtn, Loading, Screen, SubHeader } from '../src/ui/chrome';
import { ProductCard } from '../src/ui/product';
import { T } from '../src/ui/T';

/** Everything with money off, biggest saving first. */
export default function Offers() {
  const { data: items, error, refetch } = useOffers();
  return (
    <Screen>
      <SubHeader title="Offers" sub="Biggest savings first" right={<CartBtn />} />
      {!items ? (
        <Loading error={error ? 'Could not load the offers.' : undefined} onRetry={refetch} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 8, paddingHorizontal: PAD }}
          contentContainerStyle={{ gap: 8, paddingVertical: PAD }}
          ListEmptyComponent={
            <View style={{ padding: 32, alignItems: 'center' }}>
              <T c={neutral.mut}>No offers running right now.</T>
            </View>
          }
          renderItem={({ item }) => <ProductCard product={item} style={{ flex: 1, maxWidth: '50%' }} />}
        />
      )}
    </Screen>
  );
}
