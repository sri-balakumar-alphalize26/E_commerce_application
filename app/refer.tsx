import { Redirect } from 'expo-router';
import { ScrollView, Share, View } from 'react-native';
import { useReferrals } from '../src/hooks/queries';
import { money } from '../src/lib/format';
import { useSession } from '../src/store/session';
import { neutral, PAD, useTheme } from '../src/theme/tokens';
import { Btn, Loading, Screen, SubHeader, whenText } from '../src/ui/chrome';
import { T } from '../src/ui/T';

const STATUS: Record<string, string> = {
  invited: 'Invited',
  joined: 'Joined · reward after their first order',
  ordered: 'Ordered · reward earned',
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: neutral.sur, borderWidth: 1, borderColor: neutral.ln, borderRadius: 10, padding: 10, gap: 2 }}>
      <T w={600} s={15} tabular>
        {value}
      </T>
      <T s={11} c={neutral.mut}>
        {label}
      </T>
    </View>
  );
}

/** Refer & earn: the customer's code, a way to share it, and what it has earned. */
export default function ReferPage() {
  const t = useTheme();
  const customer = useSession((s) => s.customer);
  const { data, error, refetch } = useReferrals();
  if (!customer) return <Redirect href="/login?next=/refer" />;

  return (
    <Screen>
      <SubHeader title="Refer & earn" />
      {!data ? (
        <Loading error={error ? 'Could not load your referrals.' : undefined} onRetry={refetch} />
      ) : (
        <ScrollView contentContainerStyle={{ gap: 8, paddingBottom: 16 }}>
          <View style={{ backgroundColor: neutral.sur, padding: PAD, gap: 10 }}>
            <T w={600} s={15}>
              Get {money(data.reward)} for every friend who orders
            </T>
            <T c={neutral.mut}>Share your code. When a friend signs up with it and places a first order, the reward lands in your wallet.</T>
            <View
              accessibilityLabel={`Your code ${data.code}`}
              style={{
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: t.accLn,
                backgroundColor: t.accSoft,
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: 'center',
                gap: 2,
              }}>
              <T s={11} c={t.accInk}>
                Your code
              </T>
              <T w={700} s={20} c={t.accInk} selectable style={{ letterSpacing: 2, lineHeight: 26 }}>
                {data.code}
              </T>
            </View>
            <Btn
              label="Share my code"
              kind="pri"
              icon="share"
              onPress={() =>
                Share.share({
                  message: `Shop on 369 Mart with my code ${data.code} and we both get a reward: ${data.link}`,
                }).catch(() => {})
              }
            />
          </View>

          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: PAD }}>
            <Stat label="Earned" value={money(data.earned)} />
            <Stat label="On the way" value={money(data.pending)} />
            <Stat label="Friends joined" value={String(data.joined)} />
          </View>

          <View style={{ backgroundColor: neutral.sur }}>
            <T w={600} s={13} style={{ padding: PAD, paddingBottom: 4 }}>
              Your friends
            </T>
            {data.friends.length ? (
              data.friends.map((f, i) => (
                <View
                  key={f.id}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: PAD,
                    borderBottomWidth: i === data.friends.length - 1 ? 0 : 1,
                    borderBottomColor: neutral.ln,
                  }}>
                  <T w={500}>{f.name}</T>
                  <T s={11} c={neutral.mut}>
                    {[STATUS[f.status] ?? f.status, whenText(f.at)].filter(Boolean).join(' · ')}
                  </T>
                </View>
              ))
            ) : (
              <T c={neutral.mut} style={{ paddingHorizontal: PAD, paddingBottom: PAD }}>
                Nobody has joined with your code yet.
              </T>
            )}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}
