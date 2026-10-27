import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import type { GameId } from '@/features/arcade/catalogue';
import { DISPLAY } from '@/features/arcade/neon';
import { useMotion } from '@/lib/motion';

/**
 * Cover art for each machine, drawn from plain views so the cabinet needs no canvas: the idea
 * of the game in one picture, with one thing in it moving. Every cover is 100% of its box and
 * works at any card width.
 */

const glow = (hex: string, r = 10) => ({ boxShadow: `0 0 ${r}px ${hex}` }) as const;

function useLoop(ms: number, reverse = true) {
  const { reduced } = useMotion();
  const t = useSharedValue(0.5);
  useEffect(() => {
    if (reduced) return;
    t.value = 0;
    t.value = withRepeat(withTiming(1, { duration: ms, easing: Easing.inOut(Easing.sin) }), -1, reverse);
  }, [ms, reduced, reverse, t]);
  return t;
}

function StackCover({ hex }: { hex: string }) {
  const t = useLoop(1600);
  const slider = useAnimatedStyle(() => ({ transform: [{ translateX: (t.value - 0.5) * 70 }] }));
  const widths = [0.74, 0.66, 0.62, 0.56];
  return (
    <View style={styles.fill}>
      <View style={styles.bottomCentre}>
        <Animated.View style={[styles.bar, { width: '50%', backgroundColor: hex, opacity: 0.95 }, glow(hex, 14), slider]} />
        {widths.map((w, i) => (
          <View
            key={w}
            style={[
              styles.bar,
              { width: `${w * 100}%`, backgroundColor: hex, opacity: 0.5 + i * 0.14, marginLeft: `${(i % 2 ? 4 : -4) * (3 - i)}%` },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function OrbitCover({ hex }: { hex: string }) {
  const t = useLoop(3200, false);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${t.value * 360}deg` }] }));
  return (
    <View style={[styles.fill, styles.centre]}>
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return <View key={i} style={[styles.dot, { transform: [{ translateX: Math.cos(a) * 46 }, { translateY: Math.sin(a) * 46 }], backgroundColor: hex, opacity: 0.6 }]} />;
      })}
      <LinearGradient colors={['#e6c9ff', hex, '#4b1c8f']} start={{ x: 0.2, y: 0.1 }} end={{ x: 0.9, y: 1 }} style={[styles.planet, glow(hex, 18)]} />
      <Animated.View style={[styles.orbitArm, spin]}>
        <View style={[styles.ship, glow('#ffffff', 8)]} />
      </Animated.View>
    </View>
  );
}

function BreakoutCover({ hex }: { hex: string }) {
  const t = useLoop(1300);
  const ball = useAnimatedStyle(() => ({
    transform: [{ translateX: (t.value - 0.5) * 80 }, { translateY: -Math.abs(Math.sin(t.value * Math.PI * 2)) * 30 }],
  }));
  const rows = ['#ff5c7a', '#ffd23f', '#ff4fd8'];
  return (
    <View style={[styles.fill, { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 8, justifyContent: 'space-between' }]}>
      <View style={{ gap: 4 }}>
        {rows.map((c, r) => (
          <View key={c} style={{ flexDirection: 'row', gap: 4 }}>
            {Array.from({ length: 6 }, (_, i) => (
              <View key={i} style={[styles.brick, { backgroundColor: c, opacity: (r + i) % 5 === 0 ? 0.15 : 0.9 }]} />
            ))}
          </View>
        ))}
      </View>
      <View style={styles.centre}>
        <Animated.View style={[styles.ball, glow('#ffffff', 8), ball]} />
        <View style={[styles.paddle, { backgroundColor: hex }, glow(hex, 12)]} />
      </View>
    </View>
  );
}

function SlideCover({ hex }: { hex: string }) {
  const t = useLoop(900);
  const pop = useAnimatedStyle(() => ({ transform: [{ scale: 0.94 + t.value * 0.1 }] }));
  const tiles: [string, number][] = [
    ['2', 0.35],
    ['8', 0.55],
    ['64', 0.75],
    ['2048', 1],
  ];
  return (
    <View style={[styles.fill, styles.centre]}>
      <View style={styles.tileGrid}>
        {tiles.map(([n, a], i) => {
          const tile = (
            <View style={[styles.tile, { backgroundColor: hex, opacity: a }, i === 3 ? glow(hex, 16) : null]}>
              <Text style={[styles.tileText, { fontSize: n.length > 2 ? 13 : 18 }]}>{n}</Text>
            </View>
          );
          return i === 3 ? (
            <Animated.View key={n} style={pop}>
              {tile}
            </Animated.View>
          ) : (
            <View key={n}>{tile}</View>
          );
        })}
      </View>
    </View>
  );
}

const TRACE_DOTS = Array.from({ length: 22 }, (_, i) => i / 21);
const traceY = (x: number) => Math.sin(x * Math.PI * 1.6 + 0.4) * 22;

function TraceCover({ hex }: { hex: string }) {
  const t = useLoop(2200);
  return (
    <View style={[styles.fill, styles.centre]}>
      <View style={{ width: '82%', height: 70 }}>
        {TRACE_DOTS.map((x) => (
          <View key={x} style={[styles.ink, { left: `${x * 100}%`, top: 35 + traceY(x), backgroundColor: hex, opacity: 0.85 }]} />
        ))}
        <TraceBall t={t} />
        <View style={[styles.goal, { left: '100%', top: 35 + traceY(1) - 14, borderColor: hex }, glow(hex, 10)]} />
      </View>
    </View>
  );
}

function TraceBall({ t }: { t: SharedValue<number> }) {
  const ball = useAnimatedStyle(() => ({
    left: `${t.value * 100}%`,
    top: 35 + Math.sin(t.value * Math.PI * 1.6 + 0.4) * 22 - 6,
  }));
  return <Animated.View style={[styles.traceBall, glow('#ffffff', 10), ball]} />;
}

function SimonCover() {
  const { reduced } = useMotion();
  const lit = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    lit.value = withRepeat(
      withSequence(withTiming(1, { duration: 500 }), withTiming(2, { duration: 500 }), withTiming(3, { duration: 500 }), withTiming(0, { duration: 500 })),
      -1,
    );
  }, [reduced, lit]);
  const pads = ['#ff4fd8', '#22e3ff', '#9dff4f', '#ffd23f'];
  return (
    <View style={[styles.fill, styles.centre]}>
      <View style={styles.simon}>
        {pads.map((c, i) => (
          <Pad key={c} colour={c} index={i} lit={lit} />
        ))}
        <View style={styles.simonHub} />
      </View>
    </View>
  );
}

function Pad({ colour, index, lit }: { colour: string; index: number; lit: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ opacity: Math.round(lit.value) === index ? 1 : 0.35 }));
  const corner = [
    { borderTopLeftRadius: 40 },
    { borderTopRightRadius: 40 },
    { borderBottomLeftRadius: 40 },
    { borderBottomRightRadius: 40 },
  ][index];
  return <Animated.View style={[styles.pad, corner, { backgroundColor: colour }, glow(colour, 12), style]} />;
}

export function Cover({ id, hex }: { id: GameId; hex: string }) {
  switch (id) {
    case 'stack':
      return <StackCover hex={hex} />;
    case 'orbit':
      return <OrbitCover hex={hex} />;
    case 'breakout':
      return <BreakoutCover hex={hex} />;
    case 'slide':
      return <SlideCover hex={hex} />;
    case 'trace':
      return <TraceCover hex={hex} />;
    default:
      return <SimonCover />;
  }
}

const FILL = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

const styles = StyleSheet.create({
  fill: { ...FILL },
  centre: { alignItems: 'center', justifyContent: 'center' },
  bottomCentre: { ...FILL, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 10, gap: 3 },
  bar: { height: 12, borderRadius: 3 },
  dot: { position: 'absolute', width: 3, height: 3, borderRadius: 2 },
  planet: { width: 46, height: 46, borderRadius: 23 },
  orbitArm: { position: 'absolute', width: 92, height: 92, alignItems: 'center' },
  ship: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffffff', marginTop: -4 },
  brick: { flex: 1, height: 9, borderRadius: 2 },
  ball: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffffff', marginBottom: 6 },
  paddle: { width: 54, height: 7, borderRadius: 4 },
  tileGrid: { width: 92, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tile: { width: 43, height: 43, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tileText: { fontFamily: DISPLAY, color: '#1a1004' },
  ink: { position: 'absolute', width: 5, height: 5, borderRadius: 3, marginLeft: -2.5 },
  traceBall: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: '#ffffff', marginLeft: -6 },
  goal: { position: 'absolute', width: 20, height: 28, borderWidth: 2, borderRadius: 4, marginLeft: -10 },
  simon: { width: 90, height: 90, flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', justifyContent: 'center' },
  pad: { width: 42, height: 42, borderRadius: 6 },
  simonHub: { position: 'absolute', width: 26, height: 26, borderRadius: 13, backgroundColor: '#0b0414', borderWidth: 2, borderColor: '#34245a' },
});
