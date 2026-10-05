import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../src/api/endpoints';
import { ApiError, ChatMessage } from '../src/api/types';
import { placeHref } from '../src/lib/links';
import { useSession } from '../src/store/session';
import { font, neutral, PAD, useTheme } from '../src/theme/tokens';
import { Loading, Screen, SubHeader } from '../src/ui/chrome';
import { Icon } from '../src/ui/Icon';
import { T } from '../src/ui/T';

/** How often to look for a reply from a person while the chat is open. */
const POLL_MS = 8000;

function Bubble({ message, onChip, onAction }: { message: ChatMessage; onChip: (text: string) => void; onAction: (go: string[]) => void }) {
  const t = useTheme();
  const mine = message.from === 'me';
  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', gap: 6 }}>
      {message.from === 'agent' ? (
        <T s={10.5} c={neutral.mut}>
          369 Mart support
        </T>
      ) : null}
      <View
        style={{
          maxWidth: '84%',
          backgroundColor: mine ? t.acc : neutral.sur,
          borderWidth: mine ? 0 : 1,
          borderColor: neutral.ln,
          borderRadius: 14,
          borderBottomRightRadius: mine ? 4 : 14,
          borderBottomLeftRadius: mine ? 14 : 4,
          paddingVertical: 8,
          paddingHorizontal: 12,
        }}>
        <T s={13} c={mine ? '#fff' : neutral.ink} style={{ lineHeight: 19 }}>
          {message.text}
        </T>
      </View>
      {message.actions?.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {message.actions.map((a) => (
            <Pressable
              key={a.label}
              accessibilityRole="link"
              onPress={() => onAction(a.go)}
              style={{ height: 32, paddingHorizontal: 12, borderRadius: 8, backgroundColor: t.acc, justifyContent: 'center' }}>
              <T w={600} s={12} c="#fff">
                {a.label}
              </T>
            </Pressable>
          ))}
        </View>
      ) : null}
      {message.chips?.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {message.chips.map((chip) => (
            <Pressable
              key={chip}
              accessibilityRole="button"
              onPress={() => onChip(chip)}
              style={{
                height: 32,
                paddingHorizontal: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: t.accLn,
                backgroundColor: t.accSoft,
                justifyContent: 'center',
              }}>
              <T w={500} s={12} c={t.accInk}>
                {chip}
              </T>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Help & support: the shop's assistant first, a person when asked for. */
export default function Support() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const customer = useSession((s) => s.customer);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [withAgent, setWithAgent] = useState(false);
  const [text, setText] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [failed, setFailed] = useState(false);
  const scroller = useRef<ScrollView>(null);

  const start = useCallback(async () => {
    setFailed(false);
    try {
      const opened = await api.supportStart();
      setWithAgent(opened.withAgent);
      // A conversation with a person already under way is picked up where it was.
      setMessages(opened.withAgent && opened.history.length ? opened.history : [opened.greeting]);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    if (customer) start();
  }, [customer, start]);

  // While a person is on the case, look for what they wrote.
  useEffect(() => {
    if (!withAgent) return;
    const timer = setInterval(async () => {
      const transcript = await api.supportTicket().catch(() => null);
      if (!transcript) return;
      setMessages((shown) => {
        const staffNow = transcript.filter((m) => m.from === 'agent').length;
        const staffShown = (shown ?? []).filter((m) => m.from === 'agent' && m.at).length;
        // Only when the staff have said something new: the transcript is then the truth.
        return staffNow > staffShown ? transcript : shown;
      });
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [withAgent]);

  if (!customer) return <Redirect href="/login?next=/support" />;

  const add = (...more: ChatMessage[]) => setMessages((old) => [...(old ?? []), ...more]);

  const send = async (raw: string) => {
    const said = raw.trim();
    if (!said || waiting) return;
    setText('');
    add({ from: 'me', text: said });
    setWaiting(true);
    try {
      if (withAgent) {
        const { reply } = await api.supportSay(said);
        if (reply) add({ from: 'agent', text: reply });
      } else {
        const { reply, toAgent } = await api.supportAsk(said);
        add(reply);
        if (toAgent) {
          const handed = await api.supportAgent(said);
          setWithAgent(true);
          add({ from: 'agent', text: handed.reply });
        }
      }
    } catch (err) {
      add({ from: 'bot', text: err instanceof ApiError ? err.message : 'That did not go through. Try again.' });
    } finally {
      setWaiting(false);
    }
  };

  return (
    <Screen>
      <SubHeader title="Help & support" sub={withAgent ? 'Talking to 369 Mart support' : '369 Mart assistant'} />
      {!messages ? (
        <Loading error={failed ? 'Could not open support.' : undefined} onRetry={start} />
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            ref={scroller}
            contentContainerStyle={{ padding: PAD, gap: 10 }}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}>
            {messages.map((m, i) => (
              <Bubble
                key={i}
                message={m}
                onChip={send}
                onAction={(go) => {
                  const href = placeHref(go);
                  if (href) router.push(href);
                }}
              />
            ))}
            {waiting ? <ActivityIndicator color={t.acc} style={{ alignSelf: 'flex-start', marginLeft: 8 }} /> : null}
          </ScrollView>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: neutral.sur,
              borderTopWidth: 1,
              borderTopColor: neutral.ln,
              paddingHorizontal: PAD,
              paddingTop: 8,
              paddingBottom: 8 + insets.bottom,
            }}>
            <TextInput
              accessibilityLabel="Type a message"
              value={text}
              onChangeText={setText}
              placeholder={withAgent ? 'Write to support' : 'Ask a question'}
              placeholderTextColor={neutral.mut}
              returnKeyType="send"
              onSubmitEditing={() => send(text)}
              maxLength={500}
              style={[
                font(400),
                {
                  flex: 1,
                  height: 42,
                  borderWidth: 1,
                  borderColor: neutral.ln,
                  borderRadius: 21,
                  paddingHorizontal: 14,
                  fontSize: 13,
                  color: neutral.ink,
                  backgroundColor: neutral.soft,
                },
              ]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send"
              disabled={!text.trim() || waiting}
              onPress={() => send(text)}
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: t.acc,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: !text.trim() || waiting ? 0.5 : 1,
              }}>
              <Icon name="right" size={20} color="#fff" stroke={2.2} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}
