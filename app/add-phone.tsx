import { useQueryClient } from '@tanstack/react-query';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSession } from '../src/store/session';
import { neutral } from '../src/theme/tokens';
import { Screen, SubHeader } from '../src/ui/chrome';
import { joinedToast, PhoneAuth } from '../src/ui/PhoneAuth';
import { T } from '../src/ui/T';

/**
 * Add (or change) the account's mobile number, proven with a WhatsApp code.
 * An account without a proven number is sent here before anything else: the
 * number is what brings its WhatsApp orders in.
 */
export default function AddPhone() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const customer = useSession((s) => s.customer);
  const ready = useSession((s) => s.ready);
  if (ready && !customer) return <Redirect href="/login" />;
  const required = !!customer?.needPhone;

  return (
    <Screen bg={neutral.sur}>
      <SubHeader title={required ? 'Add your mobile number' : 'Change mobile number'} noBack={required} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 4, marginBottom: 4 }}>
            <T w={600} s={19}>
              {required ? 'One more step' : 'Your new number'}
            </T>
            <T c={neutral.mut}>
              Your number is how 369 Mart knows you - in the app, on the website and on WhatsApp. Any orders you placed
              on WhatsApp join your account.
            </T>
          </View>
          <PhoneAuth
            purpose="add"
            onDone={(result) => {
              joinedToast(result);
              queryClient.invalidateQueries();
              if (next) router.replace(next);
              else if (!required && router.canGoBack()) router.back();
              else router.replace('/');
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
