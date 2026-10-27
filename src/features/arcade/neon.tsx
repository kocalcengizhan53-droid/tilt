import { useEffect, type ReactNode } from 'react';
import { Image, Platform, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useMotion } from '@/lib/motion';


/**
 * The arcade's visual language, in four pieces: the display face, lit type, the sky the
 * cabinet stands under, and the glass of an old screen over all of it.
 */

/** Bungee, loaded at startup; the system face stands in until it has. */
export const DISPLAY = 'Bungee_400Regular';
export const MONO = 'Menlo';

export const SKY = {
  top: '#1a0633',
  mid: '#0b0414',
  floor: '#05020a',
  horizon: '#ff4fd8',
  grid: '#c64bff',
};

/**
 * A text glow where it renders as one. Browsers blur the glyphs; React Native on iOS (new
 * architecture) draws a text shadow as a shadow of the whole text box — a lit rectangle — so
 * native type gets its glow from the halo in `NeonText` instead, and plain text none.
 */
export const textGlow = (colour: string, radius: number): TextStyle =>
  Platform.OS === 'web' ? { textShadowColor: colour, textShadowRadius: radius, textShadowOffset: { width: 0, height: 0 } } : {};

/** On native, the halo is the word in its colour a hair off-centre in four directions. */
const HALO_OFFSETS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;

/**
 * Type that glows like a tube: a soft, blurred copy in the colour behind a crisp core. React
 * Native has one text shadow per run, so the halo is a second layer rather than a stack.
 */
export function NeonText({
  children,
  colour,
  size,
  style,
  flicker = false,
  accessibilityLabel,
}: {
  children: ReactNode;
  colour: string;
  size: number;
  style?: StyleProp<TextStyle>;
  flicker?: boolean;
  accessibilityLabel?: string;
}) {
  const { reduced } = useMotion();
  const on = useSharedValue(1);
  useEffect(() => {
    if (!flicker || reduced) return;
    // A tired tube: steady most of the time, then a stutter, every few seconds.
    on.value = withRepeat(
      withSequence(
        withDelay(3200, withTiming(0.35, { duration: 60 })),
        withTiming(1, { duration: 50 }),
        withTiming(0.55, { duration: 70 }),
        withTiming(1, { duration: 90 }),
      ),
      -1,
    );
  }, [flicker, reduced, on]);
  const glow = useAnimatedStyle(() => ({ opacity: on.value }));
  const base: TextStyle = { fontFamily: DISPLAY, fontSize: size, lineHeight: size * 1.12, letterSpacing: size * 0.04 };
  return (
    <View accessible accessibilityRole="text" accessibilityLabel={accessibilityLabel ?? String(children)}>
      {Platform.OS === 'web' ? (
        <Animated.Text
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={[base, style, { position: 'absolute', color: colour }, textGlow(colour, size * 0.6), glow]}
        >
          {children}
        </Animated.Text>
      ) : (
        HALO_OFFSETS.map(([dx, dy]) => (
          <Animated.Text
            key={`${dx}${dy}`}
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
            style={[
              base,
              style,
              { position: 'absolute', color: colour, opacity: 0.55, transform: [{ translateX: dx * size * 0.035 }, { translateY: dy * size * 0.035 }] },
              glow,
            ]}
          >
            {children}
          </Animated.Text>
        ))
      )}
      <Text
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={[base, style, { color: tint(colour) }, textGlow(colour, size * 0.18)]}
      >
        {children}
      </Text>
    </View>
  );
}

/** The hot core of a tube: the colour pushed most of the way to white. */
function tint(hex: string) {
  const n = parseInt(hex.slice(1, 7), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * 0.72);
  return `rgb(${mix((n >> 16) & 255)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}

/** The grid floor running toward the viewer, under a striped sun on the horizon. */
function Floor() {
  const { reduced } = useMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    t.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.linear }), -1, false);
  }, [reduced, t]);
  const scroll = useAnimatedStyle(() => ({ transform: [{ translateY: t.value * 28 }] }));
  const rows = Array.from({ length: 26 }, (_, i) => i);
  const cols = Array.from({ length: 41 }, (_, i) => i);
  return (
    <View pointerEvents="none" style={styles.floorWrap}>
      <View style={styles.floorPlane}>
        <Animated.View style={[StyleSheet.absoluteFill, scroll]}>
          {rows.map((r) => (
            <View key={`r${r}`} style={[styles.hLine, { top: r * 28 - 28 }]} />
          ))}
        </Animated.View>
        {cols.map((c) => (
          <View key={`c${c}`} style={[styles.vLine, { left: `${(c / 40) * 100}%` }]} />
        ))}
      </View>
      <LinearGradient colors={[SKY.mid, 'transparent']} style={styles.floorFade} />
    </View>
  );
}

function Sun() {
  return (
    <View pointerEvents="none" style={styles.sunWrap}>
      <LinearGradient colors={['#ffd23f', '#ff7a3d', '#ff4fd8']} style={styles.sun}>
        {[0.14, 0.24, 0.33, 0.56, 0.66, 0.75].map((y, i) => (
          <View key={y} style={[styles.sunCut, { top: `${y * 100}%`, height: 2.5 + (i % 3) * 1.8 }]} />
        ))}
      </LinearGradient>
    </View>
  );
}

/** The sky behind every screen: a fixed layer, so screens slide over one world. */
export function Backdrop({ horizon = 0.72, sunRise = 140 }: { horizon?: number; sunRise?: number }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={[SKY.top, SKY.mid, SKY.floor]} locations={[0, horizon, 1]} style={StyleSheet.absoluteFill} />
      <View style={[styles.horizonGlow, { top: `${horizon * 100 - 8}%` }]} />
      {/* `sunRise` points of the sun above the horizon; the floor, opaque, hides the rest. */}
      <View style={[StyleSheet.absoluteFill, { top: `${horizon * 100}%`, marginTop: -sunRise }]}>
        <Sun />
      </View>
      <View style={[StyleSheet.absoluteFill, { top: `${horizon * 100}%` }]}>
        <Floor />
      </View>
    </View>
  );
}

/** The glass: scan lines and a vignette, over everything, catching no touches. */
export function Glass() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image source={require('../../../assets/images/scanline.png')} resizeMode="repeat" style={[StyleSheet.absoluteFill, { opacity: 0.32 }]} />
      <LinearGradient colors={['rgba(0,0,0,0.3)', 'transparent']} style={styles.vigTop} />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.35)']} style={styles.vigBottom} />
    </View>
  );
}

const FILL = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

const styles = StyleSheet.create({
  floorWrap: { ...FILL, overflow: 'hidden', backgroundColor: SKY.floor },
  floorPlane: {
    position: 'absolute',
    left: '-60%',
    right: '-60%',
    top: 0,
    height: '220%',
    transform: [{ perspective: 260 }, { rotateX: '62deg' }],
    transformOrigin: 'top',
  },
  hLine: { position: 'absolute', left: 0, right: 0, height: 1.5, backgroundColor: SKY.grid, opacity: 0.55 },
  vLine: { position: 'absolute', top: 0, bottom: 0, width: 1.5, backgroundColor: SKY.grid, opacity: 0.45 },
  floorFade: { position: 'absolute', left: 0, right: 0, top: 0, height: 60 },
  horizonGlow: {
    position: 'absolute',
    left: '-20%',
    right: '-20%',
    height: 120,
    backgroundColor: SKY.horizon,
    opacity: 0.16,
    borderRadius: 999,
    transform: [{ scaleY: 0.35 }],
  },
  sunWrap: { alignItems: 'center' },
  sun: { width: 210, height: 210, borderRadius: 105, overflow: 'hidden', opacity: 0.85 },
  sunCut: { position: 'absolute', left: 0, right: 0, backgroundColor: SKY.mid },
  vigTop: { position: 'absolute', left: 0, right: 0, top: 0, height: 140 },
  vigBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 180 },
});
