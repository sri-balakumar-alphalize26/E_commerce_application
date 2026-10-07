import { useQuery } from '@tanstack/react-query';
import { ReactNode, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { api } from '../api/endpoints';
import { ApiError, PhonePurpose, PhoneVerifyResult } from '../api/types';
import { useSession } from '../store/session';
import { toast } from '../store/toast';
import { neutral, useTheme } from '../theme/tokens';
import { Btn } from './chrome';
import { CountryPicker } from './CountryPicker';
import { Field } from './Field';
import { T } from './T';

/** "We found 3 WhatsApp orders and 1 address" - said once, after joining. */
export function joinedToast(result: PhoneVerifyResult) {
  const { orders, addresses } = result.joined;
  if (!orders && !addresses) return;
  const o = `${orders} WhatsApp order${orders === 1 ? '' : 's'}`;
  const a = `${addresses} address${addresses === 1 ? '' : 'es'}`;
  toast(`We found ${o} and ${a} - they're in your account now.`);
}

type Step = 'number' | 'code' | 'password';
interface Problem {
  field?: string;
  message: string;
  info?: Record<string, unknown>;
}

interface Props {
  purpose: PhonePurpose;
  /** The code was right: signed in, signed up, or the number is proven. */
  onDone: (result: PhoneVerifyResult) => void;
  /** Sign in found no account for the number. */
  onNoAccount?: (phone: string) => void;
  /** Sign up found the number already has an account. */
  onHasAccount?: (phone: string) => void;
  initialPhone?: string;
  /** Under the number step: "Sign in with email instead", "Create an account". */
  extra?: ReactNode;
}

/**
 * Mobile number -> 6-digit code on WhatsApp -> done.
 *
 * The number is the customer's identity: it is what brings their WhatsApp
 * orders, addresses and wallet into the account. The code proves the phone
 * is theirs - nobody can type someone else's number and open their account.
 */
export function PhoneAuth({ purpose, onDone, onNoAccount, onHasAccount, initialPhone = '', extra }: Props) {
  const t = useTheme();
  const phoneVerify = useSession((s) => s.phoneVerify);
  const form = useQuery({ queryKey: ['phone-form'], queryFn: () => api.phoneForm(), staleTime: 60 * 60 * 1000 });

  const [step, setStep] = useState<Step>('number');
  const [country, setCountry] = useState('');
  const [phone, setPhone] = useState(initialPhone);
  const [name, setName] = useState('');
  const [referral, setReferral] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [sentText, setSentText] = useState('');
  const [left, setLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);

  // The shop's own country first - never a hard-coded +91.
  useEffect(() => {
    if (!country && form.data) setCountry(form.data.country.code);
  }, [country, form.data]);
  useEffect(() => {
    if (left <= 0) return;
    const timer = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);

  const countries = form.data?.countries ?? [];
  const dial = countries.find((c) => c.code === country)?.dial ?? '';
  const fail = (err: unknown, fallback: string) =>
    setProblem(
      err instanceof ApiError ? { field: err.field, message: err.message, info: err.info } : { message: fallback }
    );
  const errorFor = (field: string) => (problem?.field === field ? problem.message : undefined);

  const send = async () => {
    if (purpose === 'signup' && name.trim().length < 2) {
      return setProblem({ field: 'name', message: 'Enter your name as it should appear on deliveries.' });
    }
    if (!phone.trim()) return setProblem({ field: 'phone', message: 'Enter your mobile number.' });
    setBusy(true);
    setProblem(null);
    try {
      const r = await api.phoneStart({ phone: phone.trim(), country, purpose, name: name.trim() || undefined });
      setSentText(r.message);
      setLeft(r.resendIn);
      setCode('');
      setStep('code');
    } catch (err) {
      fail(err, 'Could not send the code. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value = code, withPassword?: string) => {
    if (value.length !== 6) return setProblem({ field: 'code', message: 'Enter the 6-digit code.' });
    setBusy(true);
    setProblem(null);
    try {
      const result = await phoneVerify({
        phone: phone.trim(),
        country,
        purpose,
        code: value,
        name: name.trim() || undefined,
        referral: referral.trim().toUpperCase() || undefined,
        password: withPassword,
      });
      onDone(result);
    } catch (err) {
      if (err instanceof ApiError && err.info.needPassword) {
        if (step !== 'password') {
          setStep('password');
          setProblem(null);
        } else {
          fail(err, 'That password is not right.');
        }
      } else {
        fail(err, 'That code is not right.');
      }
    } finally {
      setBusy(false);
    }
  };

  if (step === 'code') {
    return (
      <View style={{ gap: 14 }}>
        <View style={{ gap: 4 }}>
          <T w={600} s={19}>
            Enter the code
          </T>
          <T c={neutral.mut}>
            {sentText || 'We sent a 6-digit code to your WhatsApp.'}{' '}
            <T w={600}>
              {dial} {phone.trim()}
            </T>
          </T>
        </View>
        <Field
          label="6-digit code"
          value={code}
          onChangeText={(v) => {
            const clean = v.replace(/\D/g, '').slice(0, 6);
            setCode(clean);
            setProblem(null);
            if (clean.length === 6 && !busy) verify(clean);
          }}
          keyboardType="number-pad"
          maxLength={6}
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          autoFocus
          style={{ fontSize: 22, letterSpacing: 8, textAlign: 'center', height: 52 }}
          error={errorFor('code') ?? (problem && !problem.field ? problem.message : undefined)}
        />
        <Btn label={purpose === 'add' ? 'Confirm number' : 'Sign in'} kind="pri" busy={busy} onPress={() => verify()} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setStep('number')}>
            <T c={t.accInk} w={600}>
              Change number
            </T>
          </Pressable>
          {left > 0 ? (
            <T c={neutral.mut}>Resend in 0:{String(left).padStart(2, '0')}</T>
          ) : (
            <Pressable accessibilityRole="button" hitSlop={8} disabled={busy} onPress={send}>
              <T c={t.accInk} w={600}>
                Send a new code
              </T>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  if (step === 'password') {
    return (
      <View style={{ gap: 14 }}>
        <View style={{ gap: 4 }}>
          <T w={600} s={19}>
            Confirm it&apos;s your account
          </T>
          <T c={neutral.mut}>
            This number was saved on an account but never confirmed. Enter that account&apos;s password once - after this,
            your number is enough.
          </T>
        </View>
        <Field
          label="Password"
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            setProblem(null);
          }}
          secureTextEntry
          autoComplete="current-password"
          autoFocus
          error={errorFor('password')}
          onSubmitEditing={() => verify(code, password)}
        />
        <Btn label="Sign in" kind="pri" busy={busy} onPress={() => verify(code, password)} />
      </View>
    );
  }

  const offerSignup = problem?.info?.signup === true;
  const offerSignin = problem?.info?.signin === true;
  return (
    <View style={{ gap: 14 }}>
      {purpose === 'signup' ? (
        <Field
          label="Full name"
          value={name}
          onChangeText={(v) => {
            setName(v);
            setProblem(null);
          }}
          autoComplete="name"
          placeholder="As on your delivery label"
          error={errorFor('name')}
        />
      ) : null}
      <View style={{ gap: 4 }}>
        <T w={500} s={11.5} c={neutral.mut}>
          Mobile number
        </T>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
          <CountryPicker countries={countries} value={country} onChange={setCountry} />
          <View style={{ flex: 1 }}>
            <Field
              label=""
              accessibilityLabel="Mobile number"
              value={phone}
              onChangeText={(v) => {
                setPhone(v.replace(/[^\d\s+()-]/g, ''));
                setProblem(null);
              }}
              keyboardType="phone-pad"
              autoComplete="tel"
              placeholder={form.data?.hint?.example ?? 'Mobile number'}
              returnKeyType="go"
              onSubmitEditing={send}
              error={errorFor('phone')}
            />
          </View>
        </View>
        <T s={11} c={neutral.mut}>
          We&apos;ll send a 6-digit code to this number on WhatsApp.
        </T>
      </View>
      {purpose === 'signup' ? (
        <Field
          label="Referral code (optional)"
          value={referral}
          onChangeText={(v) => setReferral(v.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="369ABCD"
        />
      ) : null}
      {problem && !problem.field ? (
        <T s={12} c={neutral.red}>
          {problem.message}
        </T>
      ) : null}
      {offerSignup && onNoAccount ? (
        <Btn label="Create an account with this number" onPress={() => onNoAccount(phone.trim())} />
      ) : null}
      {offerSignin && onHasAccount ? (
        <Btn label="Sign in with this number" onPress={() => onHasAccount(phone.trim())} />
      ) : null}
      <Btn label={purpose === 'add' ? 'Send code on WhatsApp' : 'Continue'} kind="pri" busy={busy} onPress={send} />
      {extra}
    </View>
  );
}
