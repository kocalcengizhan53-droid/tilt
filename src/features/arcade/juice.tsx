import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { DISPLAY, textGlow } from '@/features/arcade/neon';
import { motionReduced } from '@/lib/motion';


/**
 * Juice: the feedback that makes a game feel like a machine rather than a form. Every game gets
 * the same four instruments from the shell — a burst of sparks, a word that pops and floats away,
 * a shake of the screen, a flash — and calls them at its own moments. Coordinates are the game's
 * own, since the layer covers exactly the area the game draws in.
 *
 * Shake, flash and sparks are only feel, so they stop when motion is reduced; the words carry
 * information ("PERFECT ×3") and stay, without the movement.
 */
export type Juice = {
  burst: (x: number, y: number, colour: string, count?: number) => void;
  text: (label: string, options?: { x?: number; y?: number; colour?: string; big?: boolean }) => void;
  shake: (strength?: number) => void;
  flash: (colour?: string) => void;
};

type Spark = { id: number; x: number; y: number; colour: string; count: number; seed: number };
type Word = { id: number; label: string; x: number; y: number; colour: string; big: boolean };

const SPARK_MS = 700;
const WORD_MS = 900;

function Burst({ spark }: { spark: Spark }) {
  const p = useSharedValue(0);
  // Runs once from mount; the parent drops the burst when it is done.
  useEffect(() => {
    p.set(withTiming(1, { duration: SPARK_MS, easing: Easing.out(Easing.quad) }));
  }, [p]);
  const dirs = useMemo(
    () =>
      Array.from({ length: spark.count }, (_, i) => {
        const a = (i / spark.count) * Math.PI * 2 + spark.seed;
        const speed = 40 + ((Math.sin(spark.seed * 13 + i * 7.1) + 1) / 2) * 70;
        return { dx: Math.cos(a) * speed, dy: Math.sin(a) * speed, size: 3 + ((i * 37) % 5) };
      }),
    [spark.count, spark.seed],
  );
  return (
    <>
      {dirs.map((d, i) => (
        <Particle key={i} p={p} x={spark.x} y={spark.y} dx={d.dx} dy={d.dy} size={d.size} colour={spark.colour} />
      ))}
    </>
  );
}

function Particle({ p, x, y, dx, dy, size, colour }: { p: SharedValue<number>; x: number; y: number; dx: number; dy: number; size: number; colour: string }) {
  const style = useAnimatedStyle(() => ({
    opacity: 1 - p.value,
    transform: [
      { translateX: x + dx * p.value },
      { translateY: y + dy * p.value + 90 * p.value * p.value },
      { scale: 1 - p.value * 0.6 },
    ],
  }));
  return (
    <Animated.View
      style={[
        { position: 'absolute', left: -size / 2, top: -size / 2, width: size, height: size, borderRadius: size, backgroundColor: colour, boxShadow: `0 0 8px ${colour}` },
        style,
      ]}
    />
  );
}

function FloatWord({ word, reduced }: { word: Word; reduced: boolean }) {
  const p = useSharedValue(0);
  const pop = useSharedValue(reduced ? 1 : 0.4);
  useEffect(() => {
    p.set(withTiming(1, { duration: WORD_MS }));
    if (!reduced) pop.set(withSpring(1, { damping: 9, stiffness: 260 }));
  }, [p, pop, reduced]);
  const style = useAnimatedStyle(() => ({
    opacity: p.value < 0.65 ? 1 : 1 - (p.value - 0.65) / 0.35,
    transform: [{ translateY: reduced ? 0 : -46 * p.value }, { scale: pop.value }],
  }));
  const size = word.big ? 40 : 24;
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: word.x - 150, top: word.y - size, width: 300, alignItems: 'center' }, style]}>
      <Animated.Text
        style={{
          fontFamily: DISPLAY,
          fontSize: size,
          // White-hot with a glow on the web; in its colour where a glow would draw as a box.
          color: Platform.OS === 'web' ? '#ffffff' : word.colour,
          ...textGlow(word.colour, size * 0.5),
          letterSpacing: 1,
          transform: [{ rotate: '-6deg' }],
        }}
      >
        {word.label}
      </Animated.Text>
    </Animated.View>
  );
}

/**
 * The instruments, and what they draw: a style that shakes the game and an overlay of sparks,
 * words and flash to place above it. The overlay is an element, not a component, so the game
 * underneath is never remounted when a spark is added.
 */
export function useJuiceLayer(size: { width: number; height: number }) {
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [words, setWords] = useState<Word[]>([]);
  const [flashColour, setFlashColour] = useState('#ffffff');
  const amp = useSharedValue(0);
  const sx = useSharedValue(0);
  const sy = useSharedValue(0);
  const flashO = useSharedValue(0);
  const next = useRef(1);

  // The shake: a random offset each frame, from an amplitude that decays toward still.
  useFrameCallback((frame) => {
    if (amp.value < 0.2) {
      if (sx.value !== 0 || sy.value !== 0) {
        sx.value = 0;
        sy.value = 0;
      }
      return;
    }
    const dt = (frame.timeSincePreviousFrame ?? 16) / 1000;
    sx.value = (Math.random() - 0.5) * 2 * amp.value;
    sy.value = (Math.random() - 0.5) * 2 * amp.value;
    amp.value *= Math.pow(0.0025, dt);
  });

  const juice = useMemo<Juice>(
    () => ({
      burst: (x, y, colour, count = 14) => {
        if (motionReduced()) return;
        const spark = { id: next.current++, x, y, colour, count, seed: next.current * 1.37 };
        setSparks((s) => [...s.slice(-5), spark]);
        setTimeout(() => setSparks((s) => s.filter((b) => b.id !== spark.id)), SPARK_MS + 50);
      },
      text: (label, o = {}) => {
        const word = { id: next.current++, label, x: o.x ?? size.width / 2, y: o.y ?? size.height * 0.38, colour: o.colour ?? '#ff4fd8', big: o.big ?? false };
        setWords((w) => [...w.slice(-2), word]);
        setTimeout(() => setWords((w) => w.filter((x) => x.id !== word.id)), WORD_MS + 50);
      },
      shake: (strength = 8) => {
        if (motionReduced()) return;
        amp.set(Math.max(amp.get(), strength));
      },
      flash: (colour = '#ffffff') => {
        if (motionReduced()) return;
        setFlashColour(colour);
        flashO.set(withSequence(withTiming(0.35, { duration: 40 }), withTiming(0, { duration: 280 })));
      },
    }),
    [size.width, size.height, amp, flashO],
  );

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: sx.value }, { translateY: sy.value }] }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashO.value }));
  const reduced = motionReduced();

  const overlay = (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {sparks.map((s) => (
        <Burst key={s.id} spark={s} />
      ))}
      {words.map((w) => (
        <FloatWord key={w.id} word={w} reduced={reduced} />
      ))}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: flashColour }, flashStyle]} />
    </View>
  );

  return { juice, shakeStyle, overlay };
}
