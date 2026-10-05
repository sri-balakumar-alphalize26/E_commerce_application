import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { api } from '../../../src/api/endpoints';
import { ApiError } from '../../../src/api/types';
import { toast } from '../../../src/store/toast';
import { neutral } from '../../../src/theme/tokens';
import { Btn, Footer, Screen, SubHeader } from '../../../src/ui/chrome';
import { Field } from '../../../src/ui/Field';
import { StarPicker, starWord } from '../../../src/ui/Stars';
import { T } from '../../../src/ui/T';

/** How the order and its delivery went, in stars and a few words. */
export default function RateOrder() {
  const router = useRouter();
  const { ref } = useLocalSearchParams<{ ref: string }>();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  const send = async () => {
    if (!stars) return setProblem('Choose a rating first.');
    setBusy(true);
    setProblem('');
    try {
      await api.rateOrder(ref, { stars, comment: comment.trim() });
      toast('Thanks for rating your order');
      router.back();
    } catch (err) {
      setProblem(err instanceof ApiError ? err.message : 'Could not send your rating. Try again.');
      setBusy(false);
    }
  };

  return (
    <Screen bg={neutral.sur}>
      <SubHeader title="Rate your order" sub={`Order #${ref}`} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', gap: 6, paddingVertical: 8 }}>
            <T w={600} s={15}>
              How was this order?
            </T>
            <StarPicker value={stars} onChange={setStars} />
            <T c={neutral.mut} style={{ minHeight: 18 }}>
              {starWord(stars)}
            </T>
          </View>
          <Field
            label="Anything to add? (optional)"
            value={comment}
            onChangeText={setComment}
            placeholder="Packing, delivery, the rider…"
            multiline
            maxLength={300}
            style={{ height: 84, paddingTop: 10, textAlignVertical: 'top' }}
          />
          {problem ? (
            <T s={12} c={neutral.red}>
              {problem}
            </T>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <Footer>
        <Btn label="Send rating" kind="pri" busy={busy} style={{ flex: 1 }} onPress={send} />
      </Footer>
    </Screen>
  );
}
