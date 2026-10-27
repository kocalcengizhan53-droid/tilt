import { useEffect } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GAMES } from '@/features/arcade/catalogue';
import { GameCard } from '@/features/arcade/GameCard';
import { Backdrop, MONO, NeonText } from '@/features/arcade/neon';
import { useScores } from '@/lib/scores';
import { prefetchSkia } from '@/lib/skia-ready';

/** The cabinet: a lit sign, six machines two to a row, and the way to the scores and the switches. */
export default function CabinetScreen() {
  const insets = useSafeAreaInsets();
  const best = useScores((s) => s.best);
  const rows = [GAMES.slice(0, 2), GAMES.slice(2, 4), GAMES.slice(4, 6)];

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
        {rows.map((row, r) => (
          <View key={r} className="flex-row gap-3">
            {row.map((meta, i) => (
              <GameCard key={meta.id} meta={meta} best={best[meta.id] ?? 0} index={r * 2 + i} />
            ))}
          </View>
        ))}
        <Text
          style={{
            marginTop: 10,
            textAlign: 'center',
            fontFamily: MONO,
            fontSize: 11,
            letterSpacing: 2,
            color: '#a99bc4',
          }}
        >
          6 GAMES · NO NETWORK · NO ACCOUNT
        </Text>
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
