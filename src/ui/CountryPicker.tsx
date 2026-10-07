import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, TextInput, View } from 'react-native';
import { Country } from '../api/types';
import { font, neutral, useTheme } from '../theme/tokens';
import { OptionRow } from './OptionRow';
import { T } from './T';

/** 🇮🇳 from "IN" - the regional-indicator letters every phone already draws. */
export function flag(code: string): string {
  if (!code || code.length !== 2) return '';
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 127397 + c.charCodeAt(0)));
}

interface Props {
  countries: Country[];
  value: string;
  onChange: (code: string) => void;
}

/**
 * The dial-code chip in front of a mobile number. Starts on the shop's own
 * country (from the shop, never a hard-coded +91); tap it for every country.
 */
export function CountryPicker({ countries, value, onChange }: Props) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const current = countries.find((c) => c.code === value);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return countries;
    return countries.filter(
      (c) => c.name.toLowerCase().includes(needle) || c.dial.includes(needle) || c.code.toLowerCase() === needle
    );
  }, [countries, q]);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={current ? `Country code ${current.name} ${current.dial}. Change` : 'Choose country code'}
        onPress={() => setOpen(true)}
        style={{
          height: 44,
          paddingHorizontal: 10,
          borderWidth: 1,
          borderColor: neutral.ln,
          borderRadius: 8,
          backgroundColor: neutral.sur,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
        }}>
        <T w={600}>
          {current ? `${flag(current.code)} ${current.dial}` : '…'}
        </T>
        <T c={neutral.mut}>▾</T>
      </Pressable>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: neutral.sur, paddingTop: 48 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12, marginBottom: 10 }}>
            <T w={600} s={17} style={{ flex: 1 }}>
              Country code
            </T>
            <Pressable accessibilityRole="button" hitSlop={10} onPress={() => setOpen(false)}>
              <T w={600} c={t.accInk}>
                Close
              </T>
            </Pressable>
          </View>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search country or code"
            placeholderTextColor="#9aa4ae"
            autoCorrect={false}
            style={[
              font(400),
              {
                marginHorizontal: 16,
                marginBottom: 8,
                height: 42,
                borderWidth: 1,
                borderColor: neutral.ln,
                borderRadius: 8,
                paddingHorizontal: 12,
                color: neutral.ink,
              },
            ]}
          />
          <FlatList
            data={shown}
            keyExtractor={(c) => c.code}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item, index }) => (
              <OptionRow
                title={`${flag(item.code)}  ${item.name}`}
                right={<T c={neutral.mut}>{item.dial}</T>}
                selected={item.code === value}
                last={index === shown.length - 1}
                onPress={() => {
                  onChange(item.code);
                  setQ('');
                  setOpen(false);
                }}
              />
            )}
          />
        </View>
      </Modal>
    </>
  );
}
