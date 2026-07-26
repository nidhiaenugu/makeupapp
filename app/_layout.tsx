import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAppStore } from '@/store/useAppStore';
import { LoadingScreen } from '@/ui/components';
import { useTheme } from '@/ui/theme';

export default function RootLayout() {
  const hydrated = useAppStore((state) => state.hydrated);
  const hydrate = useAppStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {hydrated ? <Navigator /> : <LoadingScreen />}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Routes the user to onboarding until they have finished the quiz.
 *
 * The redirect lives here rather than in each screen so there is exactly one
 * place that decides whether the app is usable yet.
 */
function Navigator() {
  const theme = useTheme();
  const needsOnboarding = useAppStore((state) => state.needsOnboarding);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inOnboarding = segments[0] === 'onboarding';
    if (needsOnboarding && !inOnboarding) {
      router.replace('/onboarding');
    } else if (!needsOnboarding && inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [needsOnboarding, segments, router]);

  return (
    <>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}>
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="product/[id]"
          options={{
            headerShown: true,
            title: '',
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: theme.colors.background },
            headerTintColor: theme.colors.text,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="advisor"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Beauty advisor',
            headerStyle: { backgroundColor: theme.colors.background },
            headerTintColor: theme.colors.text,
            headerShadowVisible: false,
          }}
        />
      </Stack>
    </>
  );
}
