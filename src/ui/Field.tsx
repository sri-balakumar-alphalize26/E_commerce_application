import { useState } from 'react';
import { TextInput, TextInputProps, View } from 'react-native';
import { font, neutral, useTheme } from '../theme/tokens';
import { T } from './T';

interface Props extends TextInputProps {
  label: string;
  /** What is wrong with this field, said under it. */
  error?: string;
}

/** A labelled text box. */
export function Field({ label, error, style, ...rest }: Props) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 4 }}>
      {label ? (
        <T w={500} s={11.5} c={neutral.mut}>
          {label}
        </T>
      ) : null}
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#9aa4ae"
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        style={[
          font(400),
          {
            height: 44,
            borderWidth: focused ? 1.5 : 1,
            borderColor: error ? neutral.red : focused ? t.acc : neutral.ln,
            borderRadius: 8,
            paddingHorizontal: 12,
            fontSize: 14,
            color: neutral.ink,
            backgroundColor: neutral.sur,
          },
          style,
        ]}
      />
      {error ? (
        <T s={11} c={neutral.red}>
          {error}
        </T>
      ) : null}
    </View>
  );
}
