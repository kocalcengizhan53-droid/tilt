import { router } from 'expo-router';
import { useEffect, useRef, useState, type ComponentType } from 'react';
import { Platform, Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, FadeOut, ZoomIn, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { GameMeta, GameProps } from '@/features/arcade/catalogue';
import { streak, type DailyRules } from '@/features/daily/daily';
import { useJuiceLayer } from '@/features/arcade/juice';
import { DISPLAY, MONO, NeonText, SKY, textGlow } from '@/features/arcade/neon';
import { play } from '@/lib/audio';
import { haptic } from '@/lib/haptics';
import { useDaily } from '@/lib/daily';
import { useMotion } from '@/lib/motion';
import { useScores } from '@/lib/scores';
import { skiaReady } from '@/lib/skia-ready';


type Status = 'intro' | 'countdown' | 'playing' | 'over';

/**
 * Everything a game has in common, so a game is only its own idea.
 *
 * The shell loads the game's chunk (after Skia, on the web), measures the area it may draw in,
 * shows the machine's title and the one line that explains it, counts in, keeps the score in the
 * corner, lends the game its juice, and on game over counts the score up, records it and offers
 * another. Every game is mounted fresh for each run — `run` is part of its key — so "play
 * again" is a true reset and no game has to implement one.
 */
/** "28 OCT", for the daily tower's title. */
const shortDate = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase();

export function GameShell({ meta, daily }: { meta: GameMeta; daily?: { day: string; rules: DailyRules } }) {
  const insets = useSafeAreaInsets();
  const { reduced } = useMotion();
  const [Game, setGame] = useState<ComponentType<GameProps> | null>(null);
  // The title and the rules need nothing loaded, so they show at once; the coin slot opens when
  // the machine (and, on the web, Skia) has arrived.
  const [status, setStatus] = useState<Status>('intro');
  const [count, setCount] = useState(3);
  const [score, setScore] = useState(0);
  const [run, setRun] = useState(1);
  const [result, setResult] = useState<{ best: number; isNew: boolean } | null>(null);
  const [area, setArea] = useState({ width: 0, height: 0 });
  const best = useScores((s) => s.best[meta.id] ?? 0);
  const record = useScores((s) => s.record);
  // The daily tower: one attempt, recorded apart from the ordinary best, since its rules differ.
  const history = useDaily((s) => s.history);
  const recordDaily = useDaily((s) => s.record);
  const playedToday = daily ? history[daily.day] : undefined;
  const { juice, shakeStyle, overlay } = useJuiceLayer(area);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    let live = true;
    const pending = timers.current;
    skiaReady()
      .then(() => meta.load())
      .then((m) => {
        if (live) setGame(() => m.default);
      });
    return () => {
      live = false;
      pending.forEach(clearTimeout);
    };
  }, [meta]);

  // The score in the corner jumps a little each time it changes.
  const bump = useSharedValue(1);
  useEffect(() => {
    if (score > 0 && !reduced) bump.set(withSequence(withTiming(1.25, { duration: 70 }), withSpring(1, { damping: 10 })));
  }, [score, reduced, bump]);
  const scoreStyle = useAnimatedStyle(() => ({ transform: [{ scale: bump.value }] }));

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  /** Three, two, one, go — a tick each, then the machine starts. */
  const start = () => {
    if (!Game || (daily && playedToday !== undefined)) return;
    timers.current.forEach(clearTimeout);
    setScore(0);
    setResult(null);
    setCount(3);
    setStatus('countdown');
    haptic.light();
    play('tick');
    [2, 1, 0].forEach((n, i) => {
      timers.current.push(
        setTimeout(() => {
          setCount(n);
          haptic.light();
          play(n === 0 ? 'perfect' : 'tick');
        }, (i + 1) * 520),
      );
    });
    timers.current.push(
      setTimeout(() => {
        setRun((r) => r + 1);
        setStatus('playing');
      }, 4 * 520 - 120),
    );
  };

  const end = (finalScore: number) => {
    if (daily) recordDaily(daily.day, finalScore);
    const r = daily ? { best: finalScore, isNew: false } : record(meta.id, finalScore);
    setScore(finalScore);
    setResult(r);
    setStatus('over');
    if (r.isNew && finalScore > 0) {
      haptic.success();
      play('win');
      const { width, height } = area;
      [0.2, 0.5, 0.8].forEach((fx, i) => timers.current.push(setTimeout(() => juice.burst(width * fx, height * 0.3, i === 1 ? '#ffd23f' : meta.hex, 22), 250 + i * 160)));
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
    <View role="main" style={{ flex: 1, backgroundColor: SKY.mid, paddingTop: insets.top }}>
      <LinearGradient colors={[SKY.top, SKY.mid]} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 200 }} />
      {/* The HUD: a way out, the machine's name, the score and the best. */}
      <View className="h-14 flex-row items-center justify-between px-4">
        <Pressable accessibilityRole="button" accessibilityLabel="Back to the cabinet" onPress={leave} className="min-h-11 min-w-11 items-start justify-center active:opacity-60">
          <Text style={{ fontSize: 15, color: '#a99bc4' }}>‹ Cabinet</Text>
        </Pressable>
        <NeonText colour={meta.hex} size={15}>
          {daily ? `DAILY · ${shortDate(daily.day)}` : meta.title.toUpperCase()}
        </NeonText>
        <View className="min-w-11 items-end">
          <Animated.Text
            accessibilityLabel={`Score ${score}`}
            style={[{ fontFamily: DISPLAY, fontSize: 24, color: '#ffffff', ...textGlow(meta.hex, 10) }, scoreStyle]}
          >
            {score}
          </Animated.Text>
          <Text style={{ fontFamily: MONO, fontSize: 11, color: '#a99bc4' }}>{daily ? 'one attempt' : `best ${Math.max(best, score)}`}</Text>
        </View>
      </View>

      <View style={{ flex: 1 }} onLayout={onLayout}>
        <Animated.View style={[{ flex: 1 }, shakeStyle]}>
          {Game && area.width > 0 && (status === 'playing' || status === 'over') ? (
            <Game key={run} run={run} width={area.width} height={area.height} onScore={setScore} onEnd={end} juice={juice} daily={daily?.rules} />
          ) : null}
        </Animated.View>
        {overlay}

        {status === 'intro' && daily && playedToday !== undefined ? (
          <Overlay>
            <Animated.View entering={FadeInDown.duration(360)} style={{ alignItems: 'center', gap: 14, paddingHorizontal: 32 }}>
              <NeonText colour={meta.hex} size={34} flicker>
                TODAY&apos;S TOWER
              </NeonText>
              <Text accessibilityLabel={`Today's score ${playedToday}`} style={{ fontFamily: DISPLAY, fontSize: 64, color: '#ffffff', ...textGlow(meta.hex, 22) }}>
                {playedToday}
              </Text>
              <Text style={{ textAlign: 'center', fontSize: 15, lineHeight: 22, color: '#f4ecff' }}>
                Built. A new tower goes up at midnight · {streak(history, daily.day)}-day streak.
              </Text>
              <Button label="Cabinet" ghost onPress={leave} />
            </Animated.View>
          </Overlay>
        ) : status === 'intro' ? (
          <Overlay>
            <Animated.View entering={FadeInDown.duration(360)} style={{ alignItems: 'center', gap: 18, paddingHorizontal: 32 }}>
              <NeonText colour={meta.hex} size={46} flicker>
                {daily ? 'DAILY TOWER' : meta.title.toUpperCase()}
              </NeonText>
              <Text style={{ textAlign: 'center', fontSize: 16, lineHeight: 24, color: '#f4ecff' }}>
                {daily ? 'Everyone gets the same tower today, and you get one attempt. It resets at midnight.' : meta.howTo}
              </Text>
              <Text style={{ textAlign: 'center', fontFamily: MONO, fontSize: 11, lineHeight: 17, color: '#a99bc4' }}>{meta.technique}</Text>
              <Button label={Game ? 'Insert coin' : 'Warming up'} colour={meta.hex} onPress={start} pulse={!reduced && !!Game} disabled={!Game} />
            </Animated.View>
          </Overlay>
        ) : null}

        {status === 'countdown' ? (
          <Overlay dim={false}>
            <Animated.View key={count} entering={reduced ? FadeIn.duration(120) : ZoomIn.springify().damping(11)}>
              <NeonText colour={count === 0 ? '#ffd23f' : meta.hex} size={count === 0 ? 76 : 96} accessibilityLabel={count === 0 ? 'Go' : String(count)}>
                {count === 0 ? 'GO!' : String(count)}
              </NeonText>
            </Animated.View>
          </Overlay>
        ) : null}

        {status === 'over' ? (
          <Overlay>
            <Animated.View entering={ZoomIn.duration(260)} style={{ alignItems: 'center', gap: 10, paddingHorizontal: 32 }}>
              <NeonText colour="#ff5c7a" size={30} flicker>
                GAME OVER
              </NeonText>
              <CountUp to={score} colour={meta.hex} />
              {daily ? (
                <Text style={{ fontFamily: MONO, fontSize: 13, color: '#a99bc4' }}>{streak(history, daily.day)}-day streak · back at midnight</Text>
              ) : result?.isNew && score > 0 ? (
                <Animated.View entering={FadeIn.delay(450)}>
                  <NeonText colour="#ffd23f" size={20}>
                    ★ NEW BEST ★
                  </NeonText>
                </Animated.View>
              ) : (
                <Text style={{ fontFamily: MONO, fontSize: 13, color: '#a99bc4' }}>best {result?.best ?? best}</Text>
              )}
              <View style={{ marginTop: 16, flexDirection: 'row', gap: 12 }}>
                {daily ? null : <Button label="Play again" colour={meta.hex} onPress={start} />}
                <Button label="Cabinet" ghost={!daily} onPress={leave} />
              </View>
            </Animated.View>
          </Overlay>
        ) : null}
      </View>
    </View>
  );
}

/** The final score, counted up from zero the way a cabinet tallies it. */
function CountUp({ to, colour }: { to: number; colour: string }) {
  const { reduced } = useMotion();
  const [shown, setShown] = useState(reduced ? to : 0);
  useEffect(() => {
    if (reduced || to === 0) return;
    const started = Date.now();
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - started) / 700);
      setShown(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (t === 1) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [to, reduced]);
  return (
    <Text accessibilityLabel={`Final score ${to}`} style={{ fontFamily: DISPLAY, fontSize: 64, color: '#ffffff', ...textGlow(colour, 22) }}>
      {reduced ? to : shown}
    </Text>
  );
}

/*
 * No exit animation on the web: Reanimated plays it by putting the node back into its parent
 * and removing it when the animation ends, and when the overlay leaves with its whole screen —
 * "Cabinet" on the game-over card — that parent is already gone, so the removal throws
 * (`removeChild … not a child of this node`). A slower machine (the CI runner) hit it every time.
 */
const OVERLAY_EXIT = Platform.OS === 'web' ? undefined : FadeOut.duration(150);

function Overlay({ children, dim = true }: { children: React.ReactNode; dim?: boolean }) {
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={OVERLAY_EXIT}
      style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: dim ? 'rgba(11,4,20,0.82)' : 'transparent' }}
    >
      {children}
    </Animated.View>
  );
}

function Button({
  label,
  colour = '#ffd23f',
  ghost = false,
  pulse = false,
  disabled = false,
  onPress,
}: {
  label: string;
  colour?: string;
  ghost?: boolean;
  pulse?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const glow = useSharedValue(0);
  useEffect(() => {
    if (!pulse) return;
    const loop = () => glow.set(withSequence(withTiming(1, { duration: 700 }), withTiming(0, { duration: 700 })));
    loop();
    const id = setInterval(loop, 1400);
    return () => clearInterval(id);
  }, [pulse, glow]);
  const style = useAnimatedStyle(() => ({ boxShadow: ghost ? 'none' : `0 0 ${10 + glow.value * 18}px ${colour}` }));
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, busy: disabled }} disabled={disabled} onPress={onPress}>
      <Animated.View
        style={[
          { minHeight: 50, minWidth: 150, alignItems: 'center', justifyContent: 'center', borderRadius: 999, paddingHorizontal: 24 },
          ghost ? { borderWidth: 1, borderColor: '#34245a' } : { backgroundColor: colour },
          disabled ? { opacity: 0.55 } : null,
          style,
        ]}
      >
        <Text style={{ fontFamily: DISPLAY, fontSize: 15, letterSpacing: 1.5, color: ghost ? '#f4ecff' : '#12051f' }}>{label.toUpperCase()}</Text>
      </Animated.View>
    </Pressable>
  );
}
