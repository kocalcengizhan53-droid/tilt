import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GAMES } from '@/features/arcade/catalogue';
import { GameCard } from '@/features/arcade/GameCard';
import { useScores } from '@/lib/scores';

/** The cabinet: six machines, two to a row, and the way to the scores and the switches. */
export default function CabinetScreen() {
  const insets = useSafeAreaInsets();
  const best = useScores((s) => s.best);
  const rows = [GAMES.slice(0, 2), GAMES.slice(2, 4), GAMES.slice(4, 6)];

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12 }}>
        <View className="mb-2 flex-row items-end justify-between">
          <View>
            <Text className="text-xs uppercase tracking-[4px] text-muted-foreground">Offline arcade</Text>
            <Text className="text-5xl font-black uppercase tracking-[6px] text-foreground">Tilt</Text>
          </View>
          <View className="flex-row gap-2">
            <Link href="/scores" asChild>
              <Pressable accessibilityRole="button" accessibilityLabel="High scores" className="min-h-11 justify-center rounded-full border border-border px-4 active:opacity-60">
                <Text className="text-sm text-foreground">Scores</Text>
              </Pressable>
            </Link>
            <Link href="/settings" asChild>
              <Pressable accessibilityRole="button" accessibilityLabel="Settings" className="min-h-11 justify-center rounded-full border border-border px-4 active:opacity-60">
                <Text className="text-sm text-foreground">Settings</Text>
              </Pressable>
            </Link>
          </View>
        </View>
        {rows.map((row, r) => (
          <View key={r} className="flex-row gap-3">
            {row.map((meta, i) => (
              <GameCard key={meta.id} meta={meta} best={best[meta.id] ?? 0} index={r * 2 + i} />
            ))}
          </View>
        ))}
        <Text className="mt-4 text-center font-mono text-xs text-muted-foreground">
          Six games, no network, no account. Everything runs on this device.
        </Text>
      </ScrollView>
    </View>
  );
}
