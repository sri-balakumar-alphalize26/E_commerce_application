import { useQueryClient } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { api } from '../src/api/endpoints';
import { ApiError, WalletEntry } from '../src/api/types';
import { useWallet } from '../src/hooks/queries';
import { money } from '../src/lib/format';
import { useSession } from '../src/store/session';
import { toast } from '../src/store/toast';
import { neutral, PAD, useTheme } from '../src/theme/tokens';
import { Btn, Loading, Screen, SubHeader, whenText } from '../src/ui/chrome';
import { Field } from '../src/ui/Field';
import { Icon, IconName } from '../src/ui/Icon';
import { T } from '../src/ui/T';

/** How each kind of wallet line reads. Money out is the only one that subtracts. */
const KIND: Record<string, { icon: IconName; out?: boolean }> = {
  add: { icon: 'plus' },
  spend: { icon: 'cart', out: true },
  refund: { icon: 'replace' },
  reward: { icon: 'gift' },
};

function Entry({ row, last }: { row: WalletEntry; last: boolean }) {
  const t = useTheme();
  const kind = KIND[row.kind] ?? KIND.add;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: PAD,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: neutral.ln,
      }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: t.accSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={kind.icon} size={16} color={t.accInk} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T w={500} s={12.5} numberOfLines={1}>
          {row.title}
        </T>
        <T s={11} c={neutral.mut} numberOfLines={1}>
          {[row.sub, whenText(row.at)].filter(Boolean).join(' · ')}
        </T>
      </View>
      <T w={600} s={13} c={kind.out ? neutral.ink : neutral.green} tabular>
        {kind.out ? '− ' : '+ '}
        {money(row.amount)}
      </T>
    </View>
  );
}

export default function WalletPage() {
  const t = useTheme();
  const queryClient = useQueryClient();
  const customer = useSession((s) => s.customer);
  const restore = useSession((s) => s.restore);
  const { data: wallet, error, refetch } = useWallet();
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  if (!customer) return <Redirect href="/login?next=/wallet" />;

  const add = async () => {
    const value = Number(amount);
    if (!value || value <= 0) return setProblem('Enter an amount.');
    setBusy(true);
    setProblem('');
    try {
      const next = await api.topUp(value);
      queryClient.setQueryData(['wallet'], next);
      setAmount('');
      toast(`${money(value)} added to your wallet`);
      // The balance on Account comes with the customer.
      restore();
    } catch (err) {
      setProblem(err instanceof ApiError ? err.message : 'Could not add money. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <SubHeader title="369 Wallet" />
      {!wallet ? (
        <Loading error={error ? 'Could not load your wallet.' : undefined} onRetry={refetch} />
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ gap: 8, paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
            <View style={{ backgroundColor: neutral.sur, padding: PAD, gap: 2 }}>
              <T s={11.5} c={neutral.mut}>
                Balance
              </T>
              <T w={700} s={26} tabular style={{ lineHeight: 32 }}>
                {money(wallet.balance)}
              </T>
              <T s={11} c={neutral.mut}>
                Holds up to {money(wallet.limit)}. Use it at checkout.
              </T>
            </View>

            <View style={{ backgroundColor: neutral.sur, padding: PAD, gap: 10 }}>
              <T w={600} s={13}>
                Add money
              </T>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {[100, 500, 1000].map((v) => (
                  <Pressable
                    key={v}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${money(v)}`}
                    onPress={() => setAmount(String(v))}
                    style={{
                      height: 32,
                      paddingHorizontal: 12,
                      borderRadius: 7,
                      borderWidth: 1,
                      borderColor: amount === String(v) ? t.acc : neutral.ln,
                      backgroundColor: amount === String(v) ? t.accSoft : '#fff',
                      justifyContent: 'center',
                    }}>
                    <T w={500} s={12} c={amount === String(v) ? t.accInk : neutral.ink}>
                      + {money(v)}
                    </T>
                  </Pressable>
                ))}
              </View>
              <Field
                label={`Amount (at least ${money(wallet.minTopup)})`}
                value={amount}
                onChangeText={(v) => setAmount(v.replace(/[^\d.]/g, ''))}
                keyboardType="decimal-pad"
                error={problem || undefined}
                onSubmitEditing={add}
              />
              <Btn label="Add money" kind="pri" busy={busy} onPress={add} />
            </View>

            <View style={{ backgroundColor: neutral.sur }}>
              <T w={600} s={13} style={{ padding: PAD, paddingBottom: 6 }}>
                History
              </T>
              {wallet.ledger.length ? (
                wallet.ledger.map((row, i) => <Entry key={row.id} row={row} last={i === wallet.ledger.length - 1} />)
              ) : (
                <T c={neutral.mut} style={{ paddingHorizontal: PAD, paddingBottom: PAD }}>
                  Money you add, spend or get back shows here.
                </T>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}
