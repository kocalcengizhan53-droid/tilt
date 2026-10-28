import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GAMES } from '@/features/arcade/catalogue';
import { DISPLAY, MONO, NeonText, textGlow } from '@/features/arcade/neon';
import { dayKey, lastDays, streak } from '@/features/daily/daily';
import { useDaily } from '@/lib/daily';
import { useScores, type Run } from '@/lib/scores';

const BARS = 8;

/** The last runs of one game, oldest first, as bars against its best. */
function Bars({ runs, best, hex }: { runs: Run[]; best: number; hex: string }) {
  const shown = runs.slice(0, BARS).reverse();
  return (
    <View className="flex-row items-end gap-1" style={{ height: 34 }}>
      {Array.from({ length: BARS }, (_, i) => {
        const run = shown[i - (BARS - shown.length)];
        const top = run !== undefined && run.score === best;
        return (
          <View
            key={i}
            style={{
              width: 7,
              height: run && best ? Math.max(3, (run.score / best) * 34) : 3,
              borderRadius: 2,
              backgroundColor: run ? hex : '#2a1d44',
              opacity: run && !top ? 0.55 : 1,
              boxShadow: top ? `0 0 8px ${hex}` : undefined,
            }}
          />
        );
      })}
    </View>
  );
}

function Stat({ label, value, colour }: { label: string; value: string | number; colour: string }) {
  return (
    <View className="flex-1 rounded-2xl bg-card px-3 py-3" style={{ borderWidth: 1, borderColor: `${colour}55` }}>
      <Text style={{ fontFamily: DISPLAY, fontSize: 24, color: '#ffffff', ...textGlow(colour, 8) }}>{value}</Text>
      <Text style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1.5, color: '#cdbfe6', marginTop: 2 }}>{label}</Text>
    </View>
  );
}

/**
 * The scores, as a machine's high-score board would show them if it remembered more than the
 * top line: each game's best with its last runs beside it, and four weeks of daily towers.
 */
export default function ScoresScreen() {
  const insets = useSafeAreaInsets();
  const { best, recent, reset: resetScores } = useScores();
  const history = useDaily((d) => d.history);
  const resetDaily = useDaily((d) => d.reset);
  // One button clears everything kept on the device, the daily towers included.
  const reset = () => {
    resetScores();
    resetDaily();
  };

  const today = dayKey();
  const days = lastDays(today, 28);
  const topDaily = Math.max(1, ...days.map((d) => history[d] ?? 0));
  const played = GAMES.filter((g) => best[g.id]).length;

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
      {/* Focusable, so the board can be scrolled from the keyboard on the web. */}
      <ScrollView tabIndex={0} aria-label="Scores" contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 24 }}>
        <View className="flex-row gap-2">
          <Stat label="GAMES PLAYED" value={`${played}/${GAMES.length}`} colour="#22e3ff" />
          <Stat label="DAILY STREAK" value={streak(history, today)} colour="#ff4fd8" />
          <Stat label="TOWERS" value={Object.keys(history).length} colour="#ffd23f" />
        </View>

        {GAMES.map((g, i) => {
          const runs = recent.filter((r) => r.game === g.id);
          return (
            <Animated.View
              key={g.id}
              entering={FadeInUp.delay(50 * i).duration(360)}
              className="flex-row items-center justify-between rounded-2xl bg-card px-4 py-3"
              style={{ borderWidth: 1, borderColor: `${g.hex}66`, boxShadow: `0 0 12px ${g.hex}22` }}
              accessible
              accessibilityRole="summary"
              accessibilityLabel={`${g.title}: best ${best[g.id] ?? 'none'}${runs.length ? `, last run ${runs[0].score}` : ''}`}
            >
              <View className="gap-1">
                <View className="flex-row items-center gap-2">
                  <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: g.hex, boxShadow: `0 0 8px ${g.hex}` }} />
                  <Text style={{ fontFamily: DISPLAY, fontSize: 15, color: g.hex, letterSpacing: 1 }}>{g.title.toUpperCase()}</Text>
                </View>
                <Text style={{ fontFamily: DISPLAY, fontSize: 26, color: '#ffffff', ...textGlow(g.hex, 8) }}>{best[g.id] ?? '—'}</Text>
              </View>
              <View className="items-end gap-1">
                <Bars runs={runs} best={best[g.id] ?? 0} hex={g.hex} />
                <Text style={{ fontFamily: MONO, fontSize: 10, color: '#a99bc4' }}>
                  {runs.length ? `last ${Math.min(BARS, runs.length)}` : 'not played'}
                </Text>
              </View>
            </Animated.View>
          );
        })}

        <Text className="mt-4 text-xs uppercase tracking-[3px] text-muted-foreground">Daily tower · four weeks</Text>
        <View className="rounded-2xl bg-card p-4" style={{ borderWidth: 1, borderColor: '#ff4fd855' }}>
          <View
            className="flex-row flex-wrap gap-1.5"
            style={{ maxWidth: 420 }}
            accessible
            accessibilityRole="image"
            accessibilityLabel={`${days.filter((d) => d in history).length} of the last 28 daily towers played`}
          >
            {days.map((d) => {
              const score = history[d];
              const t = score === undefined ? 0 : 0.35 + 0.65 * (score / topDaily);
              return (
                <View
                  key={d}
                  style={{
                    width: '12.4%',
                    aspectRatio: 1,
                    borderRadius: 6,
                    backgroundColor: score === undefined ? '#1c1233' : `rgba(255, 79, 216, ${t})`,
                    borderWidth: d === today ? 1.5 : 0,
                    borderColor: '#ffd23f',
                    boxShadow: score !== undefined && t > 0.8 ? '0 0 8px #ff4fd8aa' : undefined,
                  }}
                />
              );
            })}
          </View>
          <Text style={{ fontFamily: MONO, fontSize: 10, color: '#a99bc4', marginTop: 10 }}>Brighter is a taller tower. Today is outlined.</Text>
        </View>

        {recent.length ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear all scores" onPress={reset} className="mt-4 min-h-11 items-center justify-center">
            <Text className="text-sm text-muted-foreground underline">Clear all scores</Text>
          </Pressable>
        ) : (
          <Text className="mt-4 text-center text-sm text-muted-foreground">No runs yet. Go and play.</Text>
        )}
      </ScrollView>
    </View>
  );
}
