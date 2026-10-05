import { useQueryClient } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { FlatList, Pressable, View } from 'react-native';
import { api } from '../src/api/endpoints';
import { Notice } from '../src/api/types';
import { useNotifications } from '../src/hooks/queries';
import { placeHref } from '../src/lib/links';
import { useSession } from '../src/store/session';
import { neutral, PAD, useTheme } from '../src/theme/tokens';
import { Empty, Loading, Screen, SubHeader, whenText } from '../src/ui/chrome';
import { Icon, IconName } from '../src/ui/Icon';
import { T } from '../src/ui/T';

const ICON: Record<string, IconName> = { order: 'box', wallet: 'wallet', offer: 'pct', reward: 'gift' };

export default function NotificationsPage() {
  const t = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const customer = useSession((s) => s.customer);
  const { data, error, refetch, isRefetching } = useNotifications();
  if (!customer) return <Redirect href="/login?next=/notifications" />;

  const patch = (change: (rows: Notice[]) => Notice[]) =>
    queryClient.setQueryData<Notice[]>(['notifications'], (old) => (old ? change(old) : old));

  const open = (n: Notice) => {
    if (!n.read) {
      patch((rows) => rows.map((r) => (r.id === n.id ? { ...r, read: true } : r)));
      api.markRead([n.id]).catch(() => {});
    }
    const href = placeHref(n.go);
    if (href) router.push(href);
  };

  const dismiss = (n: Notice) => {
    patch((rows) => rows.filter((r) => r.id !== n.id));
    api.dismissNotice(n.id).catch(() => refetch());
  };

  const unread = (data ?? []).some((n) => !n.read);

  return (
    <Screen>
      <SubHeader
        title="Notifications"
        right={
          unread ? (
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => {
                patch((rows) => rows.map((r) => ({ ...r, read: true })));
                api.markRead('all').catch(() => refetch());
              }}
              style={{ paddingHorizontal: 10 }}>
              <T w={600} s={12} c={t.accInk}>
                Mark all read
              </T>
            </Pressable>
          ) : undefined
        }
      />
      {!data ? (
        <Loading error={error ? 'Could not load your notifications.' : undefined} onRetry={refetch} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(n) => n.id}
          refreshing={isRefetching}
          onRefresh={refetch}
          contentContainerStyle={{ flexGrow: 1, paddingVertical: 8 }}
          ListEmptyComponent={<Empty icon="bell" title="You're all caught up" text="Order updates and offers show here." />}
          renderItem={({ item: n }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${n.read ? '' : 'Unread. '}${n.title}. ${n.text}`}
              onPress={() => open(n)}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 10,
                paddingVertical: 11,
                paddingHorizontal: PAD,
                backgroundColor: n.read ? neutral.sur : t.accSoft,
                borderBottomWidth: 1,
                borderBottomColor: neutral.ln,
              }}>
              <Icon name={ICON[n.type] ?? 'bell'} color={n.read ? neutral.mut : t.accInk} />
              <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                <T w={n.read ? 500 : 600} s={12.5}>
                  {n.title}
                </T>
                <T s={12} c={neutral.mut}>
                  {n.text}
                </T>
                <T s={10.5} c={neutral.mut}>
                  {whenText(n.at)}
                </T>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`Remove: ${n.title}`} hitSlop={10} onPress={() => dismiss(n)}>
                <Icon name="close" size={16} color={neutral.mut} />
              </Pressable>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
