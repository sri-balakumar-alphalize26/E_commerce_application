import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { api } from '../src/api/endpoints';
import { ApiError } from '../src/api/types';
import { useSession } from '../src/store/session';
import { toast } from '../src/store/toast';
import { neutral } from '../src/theme/tokens';
import { Btn, Footer, Screen, SubHeader } from '../src/ui/chrome';
import { Field } from '../src/ui/Field';
import { T } from '../src/ui/T';

/** Change the name and phone number on the account. */
export default function ProfilePage() {
  const router = useRouter();
  const customer = useSession((s) => s.customer);
  const [name, setName] = useState(customer?.name ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);

  if (!customer) return <Redirect href="/login?next=/profile" />;

  const save = async () => {
    if (!name.trim()) return setError({ field: 'name', message: 'Enter your name.' });
    setBusy(true);
    setError(null);
    try {
      const saved = await api.saveProfile({ name: name.trim(), phone: phone.trim() });
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
          <Field label="Mobile number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" error={fieldError('phone')} />
          <View style={{ gap: 4 }}>
            <T w={500} s={11.5} c={neutral.mut}>
              Email
            </T>
            <T s={14}>{customer.email}</T>
            <T s={11} c={neutral.mut}>
              Your email is also your sign-in, so it is changed on the website.
            </T>
          </View>
          {error && error.field !== 'name' && error.field !== 'phone' ? (
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
