import { useEffect } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GAMES } from '@/features/arcade/catalogue';
import { GameCard } from '@/features/arcade/GameCard';
import { Backdrop, MONO, NeonText } from '@/features/arcade/neon';
import { useMotion } from '@/lib/motion';
import { useScores } from '@/lib/scores';
import { prefetchSkia } from '@/lib/skia-ready';
import { DailyCard } from '@/features/daily/DailyCard';
import { useTilt } from '@/lib/tilt';

/**
 * The cabinet: a lit sign, the daily tower, the tilting machine across the full width, six more
 * two to a row, and the way to the scores and the switches.
 */
export default function CabinetScreen() {
  const insets = useSafeAreaInsets();
  const best = useScores((s) => s.best);
  const rows = [GAMES.slice(0, 1), GAMES.slice(1, 3), GAMES.slice(3, 5), GAMES.slice(5, 7)];
  // One lean for the whole wall: the phone's on a device, the pointer's on a desktop.
  const { reduced } = useMotion();
  const tilt = useTilt(!reduced);

  // The games draw with Skia; on the web that is a WebAssembly download. Start it while the
  // player is choosing, so the first game opens without waiting.
  useEffect(() => prefetchSkia(), []);

  return (
    <View role="main" className="flex-1 bg-background">
      {/* A setting sun: low enough that the gaps between the cards never show it. */}
      <Backdrop horizon={0.92} sunRise={72} />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 18,
          padding: 16,
          paddingBottom: insets.bottom + 28,
          gap: 14,
        }}
      >
        <View className="mb-1 flex-row items-start justify-between">
          <View>
            <Text
              style={{
                fontFamily: MONO,
                fontSize: 11,
                letterSpacing: 4,
                color: '#22e3ff',
              }}
            >
              OFFLINE ARCADE
            </Text>
            <NeonText colour="#ff4fd8" size={58} flicker accessibilityLabel="Tilt">
              TILT
            </NeonText>
          </View>
          <View className="flex-row gap-2 pt-2">
            <Pressable accessibilityRole="link" accessibilityLabel="High scores" onPress={() => router.push('/scores')} style={pill}>
              <Text style={pillText}>Scores</Text>
            </Pressable>
            <Pressable accessibilityRole="link" accessibilityLabel="Settings" onPress={() => router.push('/settings')} style={pill}>
              <Text style={pillText}>Settings</Text>
            </Pressable>
          </View>
        </View>
        <DailyCard />
        {rows.map((row, r) => (
          <View key={r} className="flex-row gap-3">
            {row.map((meta, i) => (
              <GameCard key={meta.id} meta={meta} best={best[meta.id] ?? 0} index={r === 0 ? 0 : r * 2 - 1 + i} tilt={tilt} />
            ))}
          </View>
        ))}
        {/* The sun is fixed and this line scrolls, so where they meet depends on the screen:
            the line carries its own ground rather than hoping to land on the sky. */}
        <View style={footer}>
          <Text style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 2, color: '#cdbfe6' }}>
            {GAMES.length} GAMES · NO NETWORK · NO ACCOUNT
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const pill = {
  minHeight: 44,
  justifyContent: 'center' as const,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: '#22e3ff88',
  paddingHorizontal: 16,
  backgroundColor: '#0b041499',
  boxShadow: '0 0 12px #22e3ff44',
};
const pillText = { fontSize: 14, color: '#e9fbff' };
const footer = {
  marginTop: 10,
  alignSelf: 'center' as const,
  borderRadius: 999,
  paddingHorizontal: 14,
  paddingVertical: 7,
  backgroundColor: '#0b0414d9',
};
