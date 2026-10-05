import { Redirect, useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { usePoints } from '../src/hooks/queries';
import { count, money } from '../src/lib/format';
import { useSession } from '../src/store/session';
import { neutral, PAD } from '../src/theme/tokens';
import { Empty, Loading, Screen, SubHeader, whenText } from '../src/ui/chrome';
import { T } from '../src/ui/T';

const EARN_ON: Record<string, string> = {
  delivered: 'Points arrive once the order is delivered.',
  placed: 'Points arrive as soon as the order is placed.',
};

/** Loyalty points: what the customer has, how they are earned, and where they went. */
export default function PointsPage() {
  const router = useRouter();
  const customer = useSession((s) => s.customer);
  const { data, error, refetch } = usePoints();
  if (!customer) return <Redirect href="/login?next=/points" />;

  return (
    <Screen>
      <SubHeader title="Points" />
      {!data ? (
        <Loading error={error ? 'Could not load your points.' : undefined} onRetry={refetch} />
      ) : !data.enabled ? (
        <Empty icon="gift" title="No points scheme right now" text="When the shop runs one, your points show here." />
      ) : (
        <ScrollView contentContainerStyle={{ gap: 8, paddingBottom: 16 }}>
          <View style={{ backgroundColor: neutral.sur, padding: PAD, gap: 2 }}>
            <T s={11.5} c={neutral.mut}>
              Your points
            </T>
            <T w={700} s={26} tabular style={{ lineHeight: 32 }}>
              {count(data.points)}
            </T>
            <T s={11.5} c={neutral.mut}>
              Worth {money(data.value)}
              {data.cardNumber ? ` · card ${data.cardNumber}` : ''}
            </T>
          </View>

          {data.rule ? (
            <View style={{ backgroundColor: neutral.sur, padding: PAD, gap: 4 }}>
              <T w={600} s={13}>
                How it works
              </T>
              <T s={12}>
                Earn {count(data.rule.earn)} points for every {money(data.rule.spend)} you spend.
              </T>
              <T s={12}>Use them at checkout once you have {count(data.rule.minRedeem)} points.</T>
              <T s={11.5} c={neutral.mut}>
                {EARN_ON[data.earnOn] ?? ''}
              </T>
            </View>
          ) : null}

          <View style={{ backgroundColor: neutral.sur }}>
            <T w={600} s={13} style={{ padding: PAD, paddingBottom: 4 }}>
              History
            </T>
            {data.history.length ? (
              data.history.map((h, i) => (
                <Pressable
                  key={h.id}
                  accessibilityRole={h.orderRef ? 'link' : 'text'}
                  disabled={!h.orderRef}
                  onPress={() => router.push(`/order/${h.orderRef}`)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingVertical: 10,
                    paddingHorizontal: PAD,
                    borderBottomWidth: i === data.history.length - 1 ? 0 : 1,
                    borderBottomColor: neutral.ln,
                  }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T w={500} s={12.5} numberOfLines={1}>
                      {h.title}
                    </T>
                    <T s={11} c={neutral.mut} numberOfLines={1}>
                      {[h.sub, whenText(h.at)].filter(Boolean).join(' · ')}
                    </T>
                  </View>
                  <T w={600} s={13} c={h.credit ? neutral.green : neutral.ink} tabular>
                    {h.credit ? '+ ' : '− '}
                    {count(Math.abs(h.points))}
                  </T>
                </Pressable>
              ))
            ) : (
              <T c={neutral.mut} style={{ paddingHorizontal: PAD, paddingBottom: PAD }}>
                Points you earn and use show here.
              </T>
            )}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}
