import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { ApiError } from '../src/api/types';
import { useSession } from '../src/store/session';
import { neutral, useTheme } from '../src/theme/tokens';
import { Btn, Screen, SubHeader } from '../src/ui/chrome';
import { Field } from '../src/ui/Field';
import { T } from '../src/ui/T';

/** A new 369 Mart account: the same one the website uses. */
export default function Signup() {
  const t = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const signup = useSession((s) => s.signup);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);

  const submit = async () => {
    if (!name.trim()) return setError({ field: 'name', message: 'Enter your name.' });
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError({ field: 'email', message: 'Enter a valid email.' });
    if (password.length < 8) return setError({ field: 'password', message: 'Use at least 8 characters.' });
    setBusy(true);
    setError(null);
    try {
      await signup({ name: name.trim(), email: email.trim(), password, phone: phone.trim() || undefined });
      queryClient.invalidateQueries();
      router.replace(next ?? '/');
    } catch (err) {
      setError(
        err instanceof ApiError ? { field: err.field, message: err.message } : { message: 'Could not create the account. Try again.' }
      );
    } finally {
      setBusy(false);
    }
  };

  const fieldError = (field: string) => (error?.field === field ? error.message : undefined);
  const known = ['name', 'email', 'phone', 'password'];

  return (
    <Screen bg={neutral.sur}>
      <SubHeader title="Create account" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 4, marginBottom: 4 }}>
            <T w={600} s={19}>
              Join 369 Mart
            </T>
            <T c={neutral.mut}>One account for the app and the website.</T>
          </View>
          <Field label="Full name" value={name} onChangeText={setName} autoComplete="name" error={fieldError('name')} />
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            placeholder="you@example.com"
            error={fieldError('email')}
          />
          <Field
            label="Mobile number (optional)"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            placeholder="+91"
            error={fieldError('phone')}
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            placeholder="At least 8 characters"
            error={fieldError('password')}
            onSubmitEditing={submit}
          />
          {error && !known.includes(error.field ?? '') ? (
            <T s={12} c={neutral.red}>
              {error.message}
            </T>
          ) : null}
          <Btn label="Create account" kind="pri" busy={busy} onPress={submit} />
          <Pressable
            accessibilityRole="link"
            hitSlop={8}
            onPress={() => router.replace(next ? `/login?next=${encodeURIComponent(next)}` : '/login')}
            style={{ alignSelf: 'center', paddingVertical: 6 }}>
            <T c={neutral.mut}>
              Already have an account?{' '}
              <T w={600} c={t.accInk}>
                Sign in
              </T>
            </T>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
