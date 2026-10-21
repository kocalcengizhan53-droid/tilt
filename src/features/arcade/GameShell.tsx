import { router } from 'expo-router';
import { useEffect, useState, type ComponentType } from 'react';
import { Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { GameMeta, GameProps } from '@/features/arcade/catalogue';
import { play } from '@/lib/audio';
import { haptic } from '@/lib/haptics';
import { useScores } from '@/lib/scores';

type Status = 'loading' | 'intro' | 'playing' | 'over';

/**
 * Everything a game has in common, so a game is only its own idea.
 *
 * The shell loads the game's chunk, measures the area it may draw in, shows the one line
 * that explains it before the first run, keeps the score in the corner, and on game over
 * records the run and offers another. Every game is mounted fresh for each run — `run` is
 * part of its key — so "play again" is a true reset and no game has to implement one.
 */
export function GameShell({ meta }: { meta: GameMeta }) {
  const insets = useSafeAreaInsets();
  const [Game, setGame] = useState<ComponentType<GameProps> | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [score, setScore] = useState(0);
  const [run, setRun] = useState(1);
  const [result, setResult] = useState<{ best: number; isNew: boolean } | null>(null);
  const [area, setArea] = useState({ width: 0, height: 0 });
  const best = useScores((s) => s.best[meta.id] ?? 0);
  const record = useScores((s) => s.record);

  useEffect(() => {
    let live = true;
    meta.load().then((m) => {
      if (!live) return;
      setGame(() => m.default);
      setStatus('intro');
    });
    return () => {
      live = false;
    };
  }, [meta]);

  const start = () => {
    setScore(0);
    setResult(null);
    setRun((r) => r + 1);
    setStatus('playing');
    haptic.light();
    play('tap');
  };

  const end = (finalScore: number) => {
    const r = record(meta.id, finalScore);
    setScore(finalScore);
    setResult(r);
    setStatus('over');
    if (r.isNew && finalScore > 0) {
      haptic.success();
      play('win');
    } else {
      haptic.error();
      play('lose');
    }
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== area.width || height !== area.height) setArea({ width, height });
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* The HUD: a way out, the machine's name, the score and the best. */}
      <View className="h-14 flex-row items-center justify-between px-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to the cabinet"
          onPress={() => router.back()}
          className="min-h-11 min-w-11 items-start justify-center active:opacity-60"
        >
          <Text className="text-base text-muted-foreground">← Cabinet</Text>
        </Pressable>
        <Text className={`text-sm font-semibold uppercase tracking-[3px] text-${meta.colour}`}>
          {meta.title}
        </Text>
        <View className="min-w-11 items-end">
          <Text className="font-mono text-2xl font-bold text-foreground" accessibilityLabel={`Score ${score}`}>
            {score}
          </Text>
          <Text className="font-mono text-[11px] text-muted-foreground">best {Math.max(best, score)}</Text>
        </View>
      </View>

      <View className="flex-1" onLayout={onLayout}>
        {Game && area.width > 0 && status !== 'loading' ? (
          <Game
            key={run}
            run={run}
            width={area.width}
            height={area.height}
            onScore={setScore}
            onEnd={end}
          />
        ) : null}

        {status === 'intro' ? (
          <Overlay>
            <Animated.View entering={FadeInDown.duration(320)} className="items-center gap-4 px-8">
              <Text className={`text-4xl font-black uppercase tracking-[6px] text-${meta.colour}`}>
                {meta.title}
              </Text>
              <Text className="text-center text-base leading-6 text-foreground">{meta.howTo}</Text>
              <Text className="text-center font-mono text-xs text-muted-foreground">{meta.technique}</Text>
              <Button label="Play" colour={meta.colour} onPress={start} />
            </Animated.View>
          </Overlay>
        ) : null}

        {status === 'over' ? (
          <Overlay>
            <Animated.View entering={ZoomIn.duration(260)} className="items-center gap-3 px-8">
              <Text className="text-sm uppercase tracking-[4px] text-muted-foreground">Game over</Text>
              <Text className="font-mono text-6xl font-black text-foreground">{score}</Text>
              {result?.isNew && score > 0 ? (
                <Animated.Text
                  entering={FadeIn.delay(200)}
                  className={`text-sm font-bold uppercase tracking-[3px] text-${meta.colour}`}
                >
                  New best
                </Animated.Text>
              ) : (
                <Text className="font-mono text-sm text-muted-foreground">best {result?.best ?? best}</Text>
              )}
              <View className="mt-4 flex-row gap-3">
                <Button label="Play again" colour={meta.colour} onPress={start} />
                <Button label="Cabinet" ghost onPress={() => router.back()} />
              </View>
            </Animated.View>
          </Overlay>
        ) : null}
      </View>
    </View>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      className="absolute inset-0 items-center justify-center bg-background/80"
    >
      {children}
    </Animated.View>
  );
}

function Button({
  label,
  colour,
  ghost = false,
  onPress,
}: {
  label: string;
  colour?: GameMeta['colour'];
  ghost?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className={`min-h-12 min-w-36 items-center justify-center rounded-full px-6 active:scale-95 ${
        ghost ? 'border border-border' : `bg-${colour ?? 'live'}`
      }`}
    >
      <Text className={`text-base font-bold uppercase tracking-[2px] ${ghost ? 'text-foreground' : 'text-background'}`}>
        {label}
      </Text>
    </Pressable>
  );
}
