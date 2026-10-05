import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { api } from '../../../src/api/endpoints';
import { ApiError } from '../../../src/api/types';
import { useOrder } from '../../../src/hooks/queries';
import { money } from '../../../src/lib/format';
import { toast } from '../../../src/store/toast';
import { neutral, PAD, useTheme } from '../../../src/theme/tokens';
import { Btn, Footer, Loading, Screen, SubHeader } from '../../../src/ui/chrome';
import { Field } from '../../../src/ui/Field';
import { GroupTitle, OptionRow } from '../../../src/ui/OptionRow';
import { PhotoStrip, usePhotos } from '../../../src/ui/photos';
import { T } from '../../../src/ui/T';

const REASONS = ['Item damaged', 'Wrong item delivered', 'Item missing from the order', 'Not working', 'Not as described'];

/** The shop keeps up to six photos with a return. */
const MAX_PHOTOS = 6;

/** Ask for a refund or a replacement on a delivered order. */
export default function ReturnOrder() {
  const t = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { ref } = useLocalSearchParams<{ ref: string }>();
  const { data: order, error, refetch } = useOrder(ref);

  const [kind, setKind] = useState<'refund' | 'replace'>('refund');
  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const { photos, take, remove } = usePhotos(MAX_PHOTOS);

  if (!order) {
    return (
      <Screen>
        <SubHeader title="Return or replace" />
        <Loading error={error ? 'Could not load this order.' : undefined} onRetry={refetch} />
      </Screen>
    );
  }

  const send = async () => {
    if (!reason) return setProblem('Choose what went wrong.');
    setBusy(true);
    setProblem('');
    try {
      const after = await api.requestReturn(ref, { kind, reason, detail: detail.trim(), photos: photos.map((p) => p.upload) });
      queryClient.setQueryData(['order', ref], after);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast(kind === 'refund' ? 'Refund requested' : 'Replacement requested');
      router.back();
    } catch (err) {
      setProblem(err instanceof ApiError ? err.message : 'Could not send the request. Try again.');
      setBusy(false);
    }
  };

  return (
    <Screen>
      <SubHeader title="Return or replace" sub={`Order #${order.ref} · ${money(order.total)}`} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ gap: 8, paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
          <View style={{ backgroundColor: neutral.sur, padding: PAD, gap: 8 }}>
            <T w={600} s={12.5}>
              What would you like?
            </T>
            <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 8 }}>
              {(
                [
                  ['refund', 'Refund', 'Money back to your wallet'],
                  ['replace', 'Replacement', 'The same item again'],
                ] as const
              ).map(([value, title, note]) => {
                const on = kind === value;
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityLabel={`${title}. ${note}`}
                    accessibilityState={{ selected: on }}
                    onPress={() => setKind(value)}
                    style={{
                      flex: 1,
                      borderRadius: 9,
                      borderWidth: on ? 1.5 : 1,
                      borderColor: on ? t.acc : neutral.ln,
                      backgroundColor: on ? t.accSoft : '#fff',
                      padding: 10,
                      gap: 2,
                    }}>
                    <T w={600} s={12.5} c={on ? t.accInk : neutral.ink}>
                      {title}
                    </T>
                    <T s={11} c={neutral.mut}>
                      {note}
                    </T>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View>
            <GroupTitle title="What went wrong?" />
            {REASONS.map((r, i) => (
              <OptionRow key={r} title={r} selected={reason === r} last={i === REASONS.length - 1} onPress={() => setReason(r)} />
            ))}
          </View>

          <View style={{ backgroundColor: neutral.sur, padding: PAD, gap: 12 }}>
            <Field
              label="Tell us more (optional)"
              value={detail}
              onChangeText={setDetail}
              placeholder="What happened?"
              multiline
              maxLength={500}
              style={{ height: 84, paddingTop: 10, textAlignVertical: 'top' }}
            />
            <View style={{ gap: 6 }}>
              <T w={500} s={11.5} c={neutral.mut}>
                Photos (up to {MAX_PHOTOS}) — they help the shop decide quickly
              </T>
              <PhotoStrip photos={photos} max={MAX_PHOTOS} onTake={take} onRemove={remove} />
            </View>
            {problem ? (
              <T s={12} c={neutral.red}>
                {problem}
              </T>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <Footer>
        <Btn label={kind === 'refund' ? 'Request refund' : 'Request replacement'} kind="pri" busy={busy} style={{ flex: 1 }} onPress={send} />
      </Footer>
    </Screen>
  );
}
