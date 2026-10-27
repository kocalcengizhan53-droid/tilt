import '@/global.css';

import { useEffect } from 'react';
import { useFonts, Bungee_400Regular } from '@expo-google-fonts/bungee';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Glass } from '@/features/arcade/neon';

// The splash is the cabinet's own background with nothing on it, so holding it while the sign's
// typeface loads looks like the room before the lights come on.
SplashScreen.preventAutoHideAsync().catch(() => {});

/** The arcade is one dark room; every screen is a stack card over it, all under one sheet of glass. */
export default function RootLayout() {
  const [loaded, failed] = useFonts({ Bungee_400Regular });
  useEffect(() => {
    if (loaded || failed) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, failed]);

  // On iOS a Text drawn before its font is registered keeps the system face for good, so nothing
  // is drawn until the face is in (or has failed to load); the splash covers the wait.
  if (!loaded && !failed) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0b0414' }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0b0414' },
            animation: 'fade_from_bottom',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="play/[game]" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="scores" options={{ presentation: 'modal' }} />
          <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        </Stack>
        <Glass />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
