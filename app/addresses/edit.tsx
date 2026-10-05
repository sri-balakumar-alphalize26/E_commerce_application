import { useQueryClient } from '@tanstack/react-query';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { api } from '../../src/api/endpoints';
import { ApiError } from '../../src/api/types';
import { useAddresses } from '../../src/hooks/queries';
import { useSession } from '../../src/store/session';
import { neutral, useTheme } from '../../src/theme/tokens';
import { Btn, Footer, Screen, SubHeader } from '../../src/ui/chrome';
import { Field } from '../../src/ui/Field';
import { T } from '../../src/ui/T';

const LABELS = ['Home', 'Work', 'Other'];

/** Which box an error belongs under, by the name the form or the shop gives it. */
const FIELD_OF: Record<string, string> = {
  name: 'name',
  phone: 'phone',
  line: 'line',
  area: 'area',
  city: 'city',
  town: 'city',
  zip: 'zip',
  pin: 'zip',
  state: 'zip',
};

/** Add an address, or change one. */
export default function EditAddress() {
  const t = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const customer = useSession((s) => s.customer);
  const { data: addresses } = useAddresses();
  const existing = id ? addresses?.find((a) => a.id === id) : undefined;

  const [label, setLabel] = useState('Home');
  const [name, setName] = useState(customer?.name.split(' ')[0] ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [line, setLine] = useState('');
  const [area, setArea] = useState('');
  const [stateId, setStateId] = useState<number | undefined>(undefined);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [city, setCity] = useState('');
  const [zip, setZip] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);

  // Editing: fill the form once the address has loaded.
  useEffect(() => {
    if (!existing) return;
    setLabel(existing.label);
    setName(existing.name);
    setPhone(existing.phone);
    setLine(existing.line);
    setArea(existing.area);
    setStateId(existing.stateId);
    setPin(existing.lat && existing.lng ? { lat: existing.lat, lng: existing.lng } : null);
    setCity(existing.city);
    setZip(existing.zip);
  }, [existing]);

  // A complete PIN code names the town and the state, so they need not be typed.
  useEffect(() => {
    const pin = zip.trim();
    if (pin.length < 5 || pin === existing?.zip) return;
    let live = true;
    api.lookupPin(pin).then((found) => {
      if (!live || !found) return;
      setStateId(found.stateId);
      setCity((current) => current || found.town);
    });
    return () => {
      live = false;
    };
  }, [zip, existing?.zip]);

  if (!customer) return <Redirect href="/login?next=/addresses" />;

  // Pin the address where the phone is, and fill in what the shop can tell from that spot.
  const pinHere = async () => {
    setLocating(true);
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setError({ message: 'Allow location to pin this address, or type it in below.' });
        return;
      }
      const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const here = { lat: fix.coords.latitude, lng: fix.coords.longitude };
      setPin(here);
      const place = await api.locate(here.lat, here.lng);
      if (place) {
        // What was already typed is kept; only the empty boxes are filled.
        setLine((v) => v || place.line);
        setArea((v) => v || place.area);
        setCity((v) => v || place.city);
        setZip((v) => v || place.zip);
        if (place.stateId) setStateId(place.stateId);
      }
    } catch {
      setError({ message: 'Could not find where you are. Check that location is on, or type the address.' });
    } finally {
      setLocating(false);
    }
  };

  const save = async () => {
    if (!name.trim()) return setError({ field: 'name', message: 'Who should the rider ask for?' });
    if (phone.replace(/\D/g, '').length < 8) return setError({ field: 'phone', message: 'Enter a phone number the rider can call.' });
    if (!line.trim()) return setError({ field: 'line', message: 'Enter the house no., building or apartment.' });
    if (!area.trim()) return setError({ field: 'area', message: 'Enter the road name, area or colony.' });
    if (!city.trim()) return setError({ field: 'city', message: 'Enter the city.' });
    if (!/^\d{3,10}$/.test(zip.trim())) return setError({ field: 'zip', message: 'Enter the PIN code.' });
    setBusy(true);
    setError(null);
    try {
      await api.saveAddress(
        {
          label,
          name: name.trim(),
          phone: phone.trim(),
          line: line.trim(),
          area: area.trim(),
          stateId,
          countryId: existing?.countryId,
          lat: pin?.lat,
          lng: pin?.lng,
          city: city.trim(),
          zip: zip.trim(),
          // A new address is the one being ordered to; an edited one keeps its place.
          isDefault: existing ? existing.isDefault : true,
        },
        existing?.id
      );
      await queryClient.invalidateQueries({ queryKey: ['addresses'] });
      queryClient.invalidateQueries({ queryKey: ['bill'] });
      router.back();
    } catch (err) {
      setError(
        err instanceof ApiError ? { field: err.field, message: err.message } : { message: 'Could not save the address. Try again.' }
      );
      setBusy(false);
    }
  };

  // The shop names its own fields; show its message under ours.
  const fieldError = (field: string) => (FIELD_OF[error?.field ?? ''] === field ? error?.message : undefined);
  const known = Object.keys(FIELD_OF);

  return (
    <Screen bg={neutral.sur}>
      <SubHeader title={existing ? 'Edit address' : 'New address'} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 6 }}>
            <T w={500} s={11.5} c={neutral.mut}>
              Save as
            </T>
            <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 6 }}>
              {LABELS.map((l) => {
                const on = l === label;
                return (
                  <Pressable
                    key={l}
                    accessibilityRole="radio"
                    accessibilityLabel={l}
                    accessibilityState={{ selected: on }}
                    onPress={() => setLabel(l)}
                    style={{
                      height: 32,
                      paddingHorizontal: 14,
                      borderRadius: 7,
                      borderWidth: on ? 1.5 : 1,
                      borderColor: on ? t.acc : neutral.ln,
                      backgroundColor: on ? t.accSoft : '#fff',
                      justifyContent: 'center',
                    }}>
                    <T w={500} s={12} c={on ? t.accInk : neutral.ink}>
                      {l}
                    </T>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View style={{ gap: 6 }}>
            <Btn
              label={pin ? 'Update to where I am now' : 'Use my current location'}
              icon="pin"
              busy={locating}
              onPress={pinHere}
            />
            <T s={11} c={pin ? neutral.green : neutral.mut}>
              {pin
                ? 'Location pinned. The shop uses it to check whether Quick delivery reaches you.'
                : 'Pinning the spot lets the shop check whether Quick delivery reaches you.'}
            </T>
          </View>
          <Field label="Name" value={name} onChangeText={setName} autoComplete="name" error={fieldError('name')} />
          <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" error={fieldError('phone')} />
          <Field
            label="House no., building, apartment"
            value={line}
            onChangeText={setLine}
            autoComplete="street-address"
            error={fieldError('line')}
          />
          <Field label="Road, area, colony" value={area} onChangeText={setArea} error={fieldError('area')} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field label="City" value={city} onChangeText={setCity} error={fieldError('city')} />
            </View>
            <View style={{ width: 120 }}>
              <Field
                label="PIN code"
                value={zip}
                onChangeText={setZip}
                keyboardType="number-pad"
                maxLength={10}
                autoComplete="postal-code"
                error={fieldError('zip')}
              />
            </View>
          </View>
          {error && !known.includes(error.field ?? '') ? (
            <T s={12} c={neutral.red}>
              {error.message}
            </T>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <Footer>
        <Btn label="Save address" kind="pri" busy={busy} style={{ flex: 1 }} onPress={save} />
      </Footer>
    </Screen>
  );
}
