import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { api } from '../src/api/endpoints';
import { ApiError } from '../src/api/types';
import { useSession } from '../src/store/session';
import { toast } from '../src/store/toast';
import { neutral, useTheme } from '../src/theme/tokens';
import { Btn, Footer, Screen, SubHeader } from '../src/ui/chrome';
import { Field } from '../src/ui/Field';
import { T } from '../src/ui/T';

/**
 * The name and an optional email on the account. The mobile number is the
 * sign-in and what joins WhatsApp orders, so it changes only by proving the
 * new one with a WhatsApp code.
 */
export default function ProfilePage() {
  const t = useTheme();
  const router = useRouter();
  const customer = useSession((s) => s.customer);
  const [name, setName] = useState(customer?.name ?? '');
  const [email, setEmail] = useState(customer?.email ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);

  if (!customer) return <Redirect href="/login?next=/profile" />;

  const save = async () => {
    if (!name.trim()) return setError({ field: 'name', message: 'Enter your name.' });
    const typed = email.trim();
    if (typed && !/^\S+@\S+\.\S+$/.test(typed)) return setError({ field: 'email', message: 'Enter a valid email address.' });
    setBusy(true);
    setError(null);
    try {
      const saved = await api.saveProfile({
        name: name.trim(),
        email: typed && typed !== customer.email ? typed : undefined,
      });
      useSession.setState({ customer: saved });
      toast('Profile saved');
      router.back();
    } catch (err) {
      setError(err instanceof ApiError ? { field: err.field, message: err.message } : { message: 'Could not save. Try again.' });
      setBusy(false);
    }
  };

  const fieldError = (field: string) => (error?.field === field ? error.message : undefined);

  return (
    <Screen bg={neutral.sur}>
      <SubHeader title="Edit profile" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
          <Field label="Full name" value={name} onChangeText={setName} autoComplete="name" error={fieldError('name')} />
          <View style={{ gap: 4 }}>
            <T w={500} s={11.5} c={neutral.mut}>
              Mobile number
            </T>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <T s={14} style={{ flex: 1 }}>
                {customer.phone || 'Not added yet'}
                {customer.phoneVerified ? '  ✓' : ''}
              </T>
              <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.push('/add-phone')}>
                <T w={600} c={t.accInk}>
                  {customer.phone ? 'Change' : 'Add'}
                </T>
              </Pressable>
            </View>
            <T s={11} c={neutral.mut}>
              You sign in with this number. A new one is confirmed with a code on WhatsApp.
            </T>
          </View>
          <Field
            label="Email (optional)"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            placeholder="you@example.com"
            error={fieldError('email')}
          />
          {error && error.field !== 'name' && error.field !== 'email' ? (
            <T s={12} c={neutral.red}>
              {error.message}
            </T>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <Footer>
        <Btn label="Save" kind="pri" busy={busy} style={{ flex: 1 }} onPress={save} />
      </Footer>
    </Screen>
  );
}
