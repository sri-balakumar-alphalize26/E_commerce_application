import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';
import { api } from '../src/api/endpoints';
import { useSession } from '../src/store/session';
import { font, neutral, PAD, useTheme } from '../src/theme/tokens';
import { CartBtn, Loading, Screen, SubHeader } from '../src/ui/chrome';
import { Icon } from '../src/ui/Icon';
import { ProductCard } from '../src/ui/product';
import { T } from '../src/ui/T';

export default function Search() {
  const params = useLocalSearchParams<{ q?: string }>();
  const [text, setText] = useState(params.q ?? '');
  const [q, setQ] = useState(params.q ?? '');

  // Search once typing pauses, not on every letter.
  useEffect(() => {
    const timer = setTimeout(() => setQ(text.trim()), 300);
    return () => clearTimeout(timer);
  }, [text]);

  const t = useTheme();
  const queryClient = useQueryClient();
  const signedIn = useSession((s) => !!s.customer);
  const { data: trending } = useQuery({ queryKey: ['trending'], queryFn: () => api.trending() });
  const { data: recent } = useQuery({ queryKey: ['recent'], queryFn: () => api.recentSearches(), enabled: signedIn });

  // A search the customer finished typing (not every letter on the way) is remembered on their account.
  const remember = (term: string) => {
    const clean = term.trim();
    if (!signedIn || clean.length < 2) return;
    api
      .addRecentSearch(clean)
      .then((list) => queryClient.setQueryData(['recent'], list))
      .catch(() => {});
  };
  const pick = (term: string) => {
    setText(term);
    remember(term);
  };
  const { data: results, error, refetch, isFetching } = useQuery({
    queryKey: ['search', q],
    queryFn: () => api.search(q),
    enabled: q.length > 0,
  });

  return (
    <Screen>
      <SubHeader
        middle={
          <View
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
            <TextInput
              accessibilityLabel="Search products"
              autoFocus={!params.q}
              value={text}
              onChangeText={setText}
              placeholder="Search for products and brands"
              placeholderTextColor={neutral.mut}
              returnKeyType="search"
              onSubmitEditing={() => remember(text)}
              autoCorrect={false}
              style={[font(400), { flex: 1, fontSize: 13, color: neutral.ink, padding: 0, height: 34 }]}
            />
            {text ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10} onPress={() => setText('')}>
                <Icon name="close" size={16} color={neutral.mut} />
              </Pressable>
            ) : null}
          </View>
        }
        right={<CartBtn />}
      />

      {!q ? (
        <View style={{ padding: PAD, gap: 10 }}>
          {recent?.length ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <T w={600} s={13}>
                  Your recent searches
                </T>
                <Pressable
                  accessibilityRole="button"
                  hitSlop={10}
                  onPress={() =>
                    api
                      .clearRecentSearches()
                      .then((list) => queryClient.setQueryData(['recent'], list))
                      .catch(() => {})
                  }>
                  <T w={500} s={12} c={t.accInk}>
                    Clear
                  </T>
                </Pressable>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                {recent.map((term) => (
                  <Pressable
                    key={term}
                    accessibilityRole="button"
                    accessibilityLabel={`Search ${term} again`}
                    onPress={() => pick(term)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      height: 32,
                      paddingHorizontal: 10,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: neutral.ln,
                      backgroundColor: neutral.sur,
                    }}>
                    <Icon name="clock" size={13} color={neutral.mut} />
                    <T s={12}>{term}</T>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
          <T w={600} s={13}>
            Trending searches
          </T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(trending ?? []).map((term) => (
              <Pressable
                key={term}
                accessibilityRole="button"
                accessibilityLabel={`Search ${term}`}
                onPress={() => pick(term)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  height: 32,
                  paddingHorizontal: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: neutral.ln,
                  backgroundColor: neutral.sur,
                }}>
                <Icon name="trend" size={13} color={neutral.mut} />
                <T s={12}>{term}</T>
              </Pressable>
            ))}
          </View>
        </View>
      ) : !results ? (
        <Loading error={error ? 'Could not search just now.' : undefined} onRetry={refetch} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(p) => p.id}
          numColumns={2}
          keyboardShouldPersistTaps="handled"
          columnWrapperStyle={{ gap: 8, paddingHorizontal: PAD }}
          contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
          ListHeaderComponent={
            <T s={11} c={neutral.mut} style={{ paddingHorizontal: PAD, paddingTop: 10 }}>
              {isFetching ? 'Searching…' : `${results.length} result${results.length === 1 ? '' : 's'} for "${q}"`}
            </T>
          }
          ListEmptyComponent={
            <View style={{ padding: 32, alignItems: 'center', gap: 4 }}>
              <T w={600} s={14}>
                {`Nothing found for "${q}"`}
              </T>
              <T c={neutral.mut} style={{ textAlign: 'center' }}>
                Check the spelling, or try a brand or a category.
              </T>
            </View>
          }
          renderItem={({ item }) => <ProductCard product={item} style={{ flex: 1, maxWidth: '50%' }} />}
        />
      )}
    </Screen>
  );
}
