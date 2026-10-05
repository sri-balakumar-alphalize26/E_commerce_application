import { useQueryClient } from '@tanstack/react-query';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { api } from '../../src/api/endpoints';
import { ApiError } from '../../src/api/types';
import { useMyReviews, useProduct } from '../../src/hooks/queries';
import { useSession } from '../../src/store/session';
import { toast } from '../../src/store/toast';
import { neutral } from '../../src/theme/tokens';
import { Btn, Footer, Loading, Screen, SubHeader } from '../../src/ui/chrome';
import { Field } from '../../src/ui/Field';
import { PhotoStrip, usePhotos } from '../../src/ui/photos';
import { Photo } from '../../src/ui/product';
import { StarPicker, starWord } from '../../src/ui/Stars';
import { T } from '../../src/ui/T';

/** The shop keeps up to three photos with a review. */
const MAX_PHOTOS = 3;

/** Write a review of a product, or change the one already written. */
export default function WriteReview() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const customer = useSession((s) => s.customer);
  const { data: detail, error, refetch } = useProduct(id);
  const { data: mine } = useMyReviews();
  const existing = mine?.[id];

  const [stars, setStars] = useState(0);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const { photos, take, remove } = usePhotos(Math.max(0, MAX_PHOTOS - (existing?.photos ?? 0)));

  // Editing: start from what was written.
  useEffect(() => {
    if (!existing) return;
    setStars(existing.stars);
    setTitle(existing.title);
    setText(existing.text);
  }, [existing]);

  if (!customer) return <Redirect href={`/login?next=/review/${id}`} />;

  if (!detail) {
    return (
      <Screen>
        <SubHeader title="Write a review" />
        <Loading error={error ? 'Could not load this product.' : undefined} onRetry={refetch} />
      </Screen>
    );
  }

  const done = () => {
    queryClient.invalidateQueries({ queryKey: ['myReviews'] });
    queryClient.invalidateQueries({ queryKey: ['product', id] });
    router.back();
  };

  const save = async () => {
    if (!stars) return setProblem('Choose a rating first.');
    setBusy(true);
    setProblem('');
    try {
      await api.writeReview(id, { stars, title: title.trim(), text: text.trim() });
      // Photos go up one by one, after the review they belong to exists.
      let failed = 0;
      for (const p of photos) {
        await api.addReviewPhoto(id, p.upload).catch(() => {
          failed += 1;
        });
      }
      toast(failed ? `Review saved, but ${failed} photo${failed === 1 ? '' : 's'} could not be added` : 'Review saved');
      done();
    } catch (err) {
      setProblem(err instanceof ApiError ? err.message : 'Could not save your review. Try again.');
      setBusy(false);
    }
  };

  const drop = () =>
    Alert.alert('Delete this review?', 'It is removed for everyone.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteReview(id);
            toast('Review deleted');
            done();
          } catch (err) {
            toast(err instanceof ApiError ? err.message : 'Could not delete it. Try again.');
          }
        },
      },
    ]);

  const p = detail.product;
  const room = MAX_PHOTOS - (existing?.photos ?? 0);

  return (
    <Screen bg={neutral.sur}>
      <SubHeader title={existing ? 'Edit your review' : 'Write a review'} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Photo
              source={p.images[0]}
              style={{ width: 56, height: 56, borderWidth: 1, borderColor: neutral.ln, borderRadius: 8, padding: 4, backgroundColor: '#fff' }}
            />
            <T s={12.5} numberOfLines={2} style={{ flex: 1 }}>
              {p.name}
            </T>
          </View>

          {existing && existing.state !== 'published' ? (
            <T s={12} c={neutral.amber}>
              The shop is holding this review back{existing.heldReason ? `: ${existing.heldReason}` : '.'}
            </T>
          ) : null}

          <View style={{ alignItems: 'center', gap: 6 }}>
            <StarPicker value={stars} onChange={setStars} />
            <T c={neutral.mut} style={{ minHeight: 18 }}>
              {starWord(stars)}
            </T>
          </View>

          <Field label="Headline (optional)" value={title} onChangeText={setTitle} maxLength={60} placeholder="Sum it up in a few words" />
          <Field
            label="Your review (optional)"
            value={text}
            onChangeText={setText}
            placeholder="What did you like or dislike?"
            multiline
            maxLength={500}
            style={{ height: 110, paddingTop: 10, textAlignVertical: 'top' }}
          />

          {room > 0 ? (
            <View style={{ gap: 6 }}>
              <T w={500} s={11.5} c={neutral.mut}>
                Add photos (up to {room}) — shown to others once the shop approves them
              </T>
              <PhotoStrip photos={photos} max={room} onTake={take} onRemove={remove} />
            </View>
          ) : (
            <T s={11.5} c={neutral.mut}>
              This review already has {existing?.photos} photos, the most it can hold.
            </T>
          )}

          {problem ? (
            <T s={12} c={neutral.red}>
              {problem}
            </T>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <Footer>
        {existing ? <Btn label="Delete" kind="ghost" onPress={drop} /> : null}
        <Btn label={existing ? 'Save changes' : 'Post review'} kind="pri" busy={busy} style={{ flex: 1 }} onPress={save} />
      </Footer>
    </Screen>
  );
}
