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
import { joinedToast, PhoneAuth } from '../src/ui/PhoneAuth';
import { T } from '../src/ui/T';

/**
 * Sign in with the mobile number you shop with - here, on the website or on
 * WhatsApp - and a code sent to that WhatsApp. Email + password remains for
 * accounts made with an email; those add a number straight after.
 */
export default function Login() {
  const t = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { next, phone } = useLocalSearchParams<{ next?: string; phone?: string }>();
  const login = useSession((s) => s.login);
  const [withEmail, setWithEmail] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);

  const leave = () => {
    // Every screen refetches: orders, addresses and wallet fill at once.
    queryClient.invalidateQueries();
    // Back to what they were doing: checkout, or wherever Sign in was tapped.
    if (next) router.replace(next);
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  const signupWith = (phone?: string) => {
    const q = new URLSearchParams();
    if (next) q.set('next', next);
    if (phone) q.set('phone', phone);
    const s = q.toString();
    router.replace(s ? `/signup?${s}` : '/signup');
  };

  const submitEmail = async () => {
    if (!email.trim()) return setError({ field: 'login', message: 'Enter your email.' });
    if (!password) return setError({ field: 'password', message: 'Enter your password.' });
    setBusy(true);
    setError(null);
    try {
      const customer = await login(email.trim(), password);
      queryClient.invalidateQueries();
      // An account with no proven number adds one before anything else.
      if (customer.needPhone) router.replace(next ? `/add-phone?next=${encodeURIComponent(next)}` : '/add-phone');
      else leave();
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
            <T c={neutral.mut}>
              {withEmail
                ? 'For accounts made with an email. You will add your mobile number next, once.'
                : 'Use the mobile number you shop with - in the app, on the website or on WhatsApp.'}
            </T>
          </View>

          {withEmail ? (
            <>
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
                onSubmitEditing={submitEmail}
              />
              {error && error.field !== 'login' && error.field !== 'password' ? (
                <T s={12} c={neutral.red}>
                  {error.message}
                </T>
              ) : null}
              <Btn label="Sign in" kind="pri" busy={busy} onPress={submitEmail} />
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setWithEmail(false)}
                style={{ alignSelf: 'center', paddingVertical: 6 }}>
                <T w={600} c={t.accInk}>
                  Sign in with mobile number
                </T>
              </Pressable>
            </>
          ) : (
            <PhoneAuth
              purpose="signin"
              initialPhone={phone ?? ''}
              onDone={(result) => {
                joinedToast(result);
                leave();
              }}
              onNoAccount={signupWith}
              extra={
                <View style={{ gap: 10, alignItems: 'center' }}>
                  <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setWithEmail(true)}>
                    <T w={600} c={t.accInk}>
                      Sign in with email instead
                    </T>
                  </Pressable>
                  <Pressable accessibilityRole="link" hitSlop={8} onPress={() => signupWith()}>
                    <T c={neutral.mut}>
                      New here?{' '}
                      <T w={600} c={t.accInk}>
                        Create an account
                      </T>
                    </T>
                  </Pressable>
                </View>
              }
            />
          )}
          {isMock() ? (
            <T s={11} c={neutral.mut} style={{ textAlign: 'center' }}>
              Demo mode: any number, code 123456.
            </T>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
