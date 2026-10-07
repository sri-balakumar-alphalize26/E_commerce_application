import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, usePathname, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSession } from '../src/store/session';
import { syncWish } from '../src/store/wish';
import { neutral } from '../src/theme/tokens';
import { ToastHost } from '../src/ui/chrome';
import { FlyLayer } from '../src/ui/fly';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30000 },
  },
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const ready = useSession((s) => s.ready);
  const restore = useSession((s) => s.restore);

  useEffect(() => {
    restore();
  }, [restore]);

  // Whoever is signed in, My list is theirs: what the account holds, plus what was hearted signed out.
  const who = useSession((s) => s.customer?.email || s.customer?.phone);
  useEffect(() => {
    if (who) syncWish();
  }, [who]);

  // The mobile number is the account's identity - it is what brings the
  // customer's WhatsApp orders in. An account without a proven one (an older
  // email account) adds it before anything else.
  const router = useRouter();
  const pathname = usePathname();
  const needPhone = useSession((s) => !!s.customer?.needPhone);
  useEffect(() => {
    if (ready && needPhone && pathname !== '/add-phone') router.replace('/add-phone');
  }, [ready, needPhone, pathname, router]);

  // A font error must not hold the app hostage: fall through to system fonts.
  const appReady = (fontsLoaded || !!fontError) && ready;

  useEffect(() => {
    if (appReady) SplashScreen.hideAsync().catch(() => {});
  }, [appReady]);

  if (!appReady) return <View style={{ flex: 1, backgroundColor: '#fff' }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: neutral.soft } }} />
          <FlyLayer />
          <ToastHost />
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
