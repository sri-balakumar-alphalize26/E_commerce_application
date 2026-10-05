import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { isMock } from '../src/api/endpoints';
import { ApiError } from '../src/api/types';
import { useSession } from '../src/store/session';
import { neutral, useTheme } from '../src/theme/tokens';
import { Btn, Screen, SubHeader } from '../src/ui/chrome';
import { Field } from '../src/ui/Field';
import { T } from '../src/ui/T';

/** Sign in with the same email and password as the website. */
export default function Login() {
  const t = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const login = useSession((s) => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);

  const submit = async () => {
    if (!email.trim()) return setError({ field: 'login', message: 'Enter your email.' });
    if (!password) return setError({ field: 'password', message: 'Enter your password.' });
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      queryClient.invalidateQueries();
      // Back to what they were doing: checkout, or wherever Sign in was tapped.
      if (next) router.replace(next);
      else if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (err) {
      setError(
        err instanceof ApiError ? { field: err.field, message: err.message } : { message: 'Could not sign in. Try again.' }
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen bg={neutral.sur}>
      <SubHeader title="Sign in" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 4, marginBottom: 4 }}>
            <T w={600} s={19}>
              Welcome back
            </T>
            <T c={neutral.mut}>Use the email and password of your 369 Mart account.</T>
          </View>
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            placeholder="you@example.com"
            error={error?.field === 'login' ? error.message : undefined}
            returnKeyType="next"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            error={error?.field === 'password' ? error.message : undefined}
            returnKeyType="go"
            onSubmitEditing={submit}
          />
          {error && error.field !== 'login' && error.field !== 'password' ? (
            <T s={12} c={neutral.red}>
              {error.message}
            </T>
          ) : null}
          <Btn label="Sign in" kind="pri" busy={busy} onPress={submit} />
          <Pressable
            accessibilityRole="link"
            hitSlop={8}
            onPress={() => router.replace(next ? `/signup?next=${encodeURIComponent(next)}` : '/signup')}
            style={{ alignSelf: 'center', paddingVertical: 6 }}>
            <T c={neutral.mut}>
              New here?{' '}
              <T w={600} c={t.accInk}>
                Create an account
              </T>
            </T>
          </Pressable>
          {isMock() ? (
            <T s={11} c={neutral.mut} style={{ textAlign: 'center' }}>
              Demo mode: any email and password will sign you in.
            </T>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
