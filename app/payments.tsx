import { useQueryClient } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { api } from '../src/api/endpoints';
import { ApiError, SavedUpi } from '../src/api/types';
import { useSavedUpis } from '../src/hooks/queries';
import { useSession } from '../src/store/session';
import { toast } from '../src/store/toast';
import { neutral, PAD } from '../src/theme/tokens';
import { Btn, Loading, Screen, SubHeader } from '../src/ui/chrome';
import { Field } from '../src/ui/Field';
import { Icon } from '../src/ui/Icon';
import { T } from '../src/ui/T';

/** Saved ways to pay: the customer's UPI IDs. */
export default function PaymentsPage() {
  const queryClient = useQueryClient();
  const customer = useSession((s) => s.customer);
  const { data: upis, error, refetch } = useSavedUpis();
  const [vpa, setVpa] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  if (!customer) return <Redirect href="/login?next=/payments" />;

  const set = (next: SavedUpi[]) => queryClient.setQueryData(['upis'], next);

  const add = async () => {
    if (!vpa.trim()) return setProblem('Enter a UPI ID like name@bank.');
    setBusy(true);
    setProblem('');
    try {
      set(await api.addUpi(vpa.trim()));
      setVpa('');
    } catch (err) {
      setProblem(err instanceof ApiError ? err.message : 'Could not save that UPI ID.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      set(await api.removeUpi(id));
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not remove it. Try again.');
    }
  };

  return (
    <Screen>
      <SubHeader title="Saved payments" />
      {!upis ? (
        <Loading error={error ? 'Could not load your saved payments.' : undefined} onRetry={refetch} />
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ gap: 8, paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
            <View style={{ backgroundColor: neutral.sur }}>
              <T w={600} s={13} style={{ padding: PAD, paddingBottom: 4 }}>
                UPI IDs
              </T>
              {upis.length ? (
                upis.map((u, i) => (
                  <View
                    key={u.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      paddingVertical: 10,
                      paddingHorizontal: PAD,
                      borderBottomWidth: i === upis.length - 1 ? 0 : 1,
                      borderBottomColor: neutral.ln,
                    }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <T w={500} s={12.5} numberOfLines={1}>
                        {u.vpa}
                      </T>
                      {u.isDefault ? (
                        <T s={11} c={neutral.green}>
                          Used first at checkout
                        </T>
                      ) : null}
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${u.vpa}`}
                      hitSlop={8}
                      onPress={() => remove(u.id)}
                      style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="trash" size={16} color={neutral.mut} />
                    </Pressable>
                  </View>
                ))
              ) : (
                <T c={neutral.mut} style={{ paddingHorizontal: PAD, paddingBottom: PAD }}>
                  No UPI ID saved yet.
                </T>
              )}
            </View>

            <View style={{ backgroundColor: neutral.sur, padding: PAD, gap: 10 }}>
              <Field
                label="Add a UPI ID"
                value={vpa}
                onChangeText={setVpa}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="name@bank"
                error={problem || undefined}
                onSubmitEditing={add}
              />
              <Btn label="Save UPI ID" busy={busy} onPress={add} />
            </View>

            <T s={11} c={neutral.mut} style={{ paddingHorizontal: PAD }}>
              Cards are entered on the payment page when you pay, and are not stored here.
            </T>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}
