import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { neutral, useTheme } from '../src/theme/tokens';
import { Screen, SubHeader } from '../src/ui/chrome';
import { joinedToast, PhoneAuth } from '../src/ui/PhoneAuth';
import { T } from '../src/ui/T';

/**
 * A new 369 Mart account - the same one the website uses: a name and a mobile
 * number, proven with a code on WhatsApp. Already ordered on WhatsApp? Those
 * orders come with the account. Email is optional, later, in Profile.
 */
export default function Signup() {
  const t = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { next, phone } = useLocalSearchParams<{ next?: string; phone?: string }>();
  const signin = (number?: string) => {
    const q = new URLSearchParams();
    if (next) q.set('next', next);
    if (number) q.set('phone', number);
    const s = q.toString();
    router.replace(s ? `/login?${s}` : '/login');
  };

  return (
    <Screen bg={neutral.sur}>
      <SubHeader title="Create account" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 4, marginBottom: 4 }}>
            <T w={600} s={19}>
              Join 369 Mart
            </T>
            <T c={neutral.mut}>One account for the app, the website and WhatsApp.</T>
          </View>
          <PhoneAuth
            purpose="signup"
            initialPhone={phone ?? ''}
            onDone={(result) => {
              joinedToast(result);
              queryClient.invalidateQueries();
              router.replace(next ?? '/');
            }}
            onHasAccount={signin}
            extra={
              <Pressable
                accessibilityRole="link"
                hitSlop={8}
                onPress={() => signin()}
                style={{ alignSelf: 'center', paddingVertical: 6 }}>
                <T c={neutral.mut}>
                  Already have an account?{' '}
                  <T w={600} c={t.accInk}>
                    Sign in
                  </T>
                </T>
              </Pressable>
            }
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
