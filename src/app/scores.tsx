import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GAMES, gameById } from '@/features/arcade/catalogue';
import { DISPLAY, NeonText, textGlow } from '@/features/arcade/neon';
import { useScores } from '@/lib/scores';


export default function ScoresScreen() {
  const insets = useSafeAreaInsets();
  const { best, recent, reset } = useScores();

  return (
    <View role="main" className="flex-1 bg-background" style={{ paddingTop: insets.top + 8 }}>
      <View className="flex-row items-center justify-between px-4 pb-2">
        <NeonText colour="#ffd23f" size={26}>
          HIGH SCORES
        </NeonText>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} className="min-h-11 min-w-11 items-end justify-center">
          <Text className="text-base text-muted-foreground">Done</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: insets.bottom + 24 }}>
        {GAMES.map((g) => (
          <View
            key={g.id}
            className="flex-row items-center justify-between rounded-2xl bg-card px-4 py-3"
            style={{ borderWidth: 1, borderColor: `${g.hex}66`, boxShadow: `0 0 12px ${g.hex}22` }}
          >
            <View className="flex-row items-center gap-3">
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: g.hex, boxShadow: `0 0 8px ${g.hex}` }} />
              <Text style={{ fontFamily: DISPLAY, fontSize: 16, color: g.hex, letterSpacing: 1 }}>{g.title.toUpperCase()}</Text>
            </View>
            <Text style={{ fontFamily: DISPLAY, fontSize: 22, color: '#ffffff', ...textGlow(g.hex, 8) }}>{best[g.id] ?? '—'}</Text>
          </View>
        ))}
        {recent.length ? (
          <>
            <Text className="mt-6 text-xs uppercase tracking-[3px] text-muted-foreground">Recent runs</Text>
            {recent.slice(0, 12).map((run, i) => (
              <View key={`${run.at}-${i}`} className="flex-row justify-between px-1 py-1.5">
                <Text className="text-sm text-foreground">{gameById(run.game)?.title ?? run.game}</Text>
                <Text className="font-mono text-sm text-muted-foreground">{run.score}</Text>
              </View>
            ))}
            <Pressable accessibilityRole="button" accessibilityLabel="Clear all scores" onPress={reset} className="mt-6 min-h-11 items-center justify-center">
              <Text className="text-sm text-muted-foreground underline">Clear all scores</Text>
            </Pressable>
          </>
        ) : (
          <Text className="mt-6 text-center text-sm text-muted-foreground">No runs yet. Go and play.</Text>
        )}
      </ScrollView>
    </View>
  );
}
