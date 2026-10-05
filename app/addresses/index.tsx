import { useQueryClient } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { api } from '../../src/api/endpoints';
import { Address, ApiError } from '../../src/api/types';
import { useAddresses } from '../../src/hooks/queries';
import { useSession } from '../../src/store/session';
import { toast } from '../../src/store/toast';
import { neutral, PAD } from '../../src/theme/tokens';
import { Btn, Footer, Loading, Screen, SubHeader } from '../../src/ui/chrome';
import { Icon } from '../../src/ui/Icon';
import { OptionRow } from '../../src/ui/OptionRow';
import { T } from '../../src/ui/T';

/** The address book. The one that is picked is where orders go. */
export default function Addresses() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const customer = useSession((s) => s.customer);
  const { data: addresses, error, refetch } = useAddresses();

  if (!customer) return <Redirect href="/login?next=/addresses" />;

  const run = async (work: () => Promise<unknown>) => {
    try {
      await work();
      await queryClient.invalidateQueries({ queryKey: ['addresses'] });
      // Where it goes decides Quick or Express, and so the bill.
      queryClient.invalidateQueries({ queryKey: ['bill'] });
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'That did not go through. Try again.');
    }
  };

  const choose = (a: Address) => {
    if (a.isDefault) return;
    const { id, ...rest } = a;
    run(() => api.saveAddress({ ...rest, isDefault: true }, id));
  };

  return (
    <Screen>
      <SubHeader title="Delivery addresses" />
      {!addresses ? (
        <Loading error={error ? 'Could not load your addresses.' : undefined} onRetry={refetch} />
      ) : !addresses.length ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 }}>
          <Icon name="pin" size={40} color={neutral.mut} />
          <T w={600} s={15}>
            No addresses yet
          </T>
          <T c={neutral.mut} style={{ textAlign: 'center' }}>
            Add where your orders should go.
          </T>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
          {addresses.map((a, i) => (
            <OptionRow
              key={a.id}
              last={i === addresses.length - 1}
              selected={a.isDefault}
              onPress={() => choose(a)}
              title={`${a.name} · ${a.label}`}
              note={`${[a.line, a.area].filter(Boolean).join(', ')}, ${a.city} ${a.zip} · ${a.phone}`}
              right={
                <View style={{ flexDirection: 'row', gap: 2 }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${a.label}`}
                    hitSlop={6}
                    onPress={() => router.push(`/addresses/edit?id=${a.id}`)}
                    style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="edit" size={16} color={neutral.mut} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${a.label}`}
                    hitSlop={6}
                    onPress={() => run(() => api.deleteAddress(a.id))}
                    style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="trash" size={16} color={neutral.mut} />
                  </Pressable>
                </View>
              }
            />
          ))}
          <T s={11} c={neutral.mut} style={{ paddingHorizontal: PAD, paddingTop: 10 }}>
            Orders go to the address that is selected.
          </T>
        </ScrollView>
      )}
      <Footer>
        <Btn label="Add a new address" kind="pri" icon="plus" style={{ flex: 1 }} onPress={() => router.push('/addresses/edit')} />
      </Footer>
    </Screen>
  );
}
