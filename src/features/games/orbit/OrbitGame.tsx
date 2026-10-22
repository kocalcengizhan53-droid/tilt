import { Canvas, Circle, DashPathEffect, Fill, Group, RadialGradient, Shader, Skia, vec } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';

import type { GameProps } from '@/features/arcade/catalogue';
import { play } from '@/lib/audio';
import { haptic } from '@/lib/haptics';

/**
 * Orbit.
 *
 * Hold, and the ship circles the planet it is on. Let go, and it leaves on the tangent in a
 * straight line. If that line passes close enough to the next planet, the ship is caught and
 * circles that one. Everything — the angle, the flight, the catch — is integrated in a frame
 * callback on the UI thread; React hears about it only when a planet is caught or the ship
 * is lost. The sky is a tiny runtime shader: stars from a hash, twinkling on a clock.
 */

const TRAIL = 14;
const PLANET_R = 22;
const ORBIT_R = 48;
const CATCH_R = ORBIT_R + 10;
const SPACING = 190;

const STARFIELD = Skia.RuntimeEffect.Make(`
uniform float2 resolution;
uniform float time;
uniform float offset;

float hash(float2 p) { return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453); }

half4 main(float2 xy) {
  float2 world = xy + float2(0.0, offset * 0.35);
  float2 cell = floor(world / 7.0);
  float h = hash(cell);
  float2 f = fract(world / 7.0) - 0.5;
  float star = smoothstep(0.12, 0.0, length(f)) * step(0.992, h);
  float tw = 0.55 + 0.45 * sin(time * 2.2 + h * 60.0);
  float3 bg = mix(float3(0.043, 0.047, 0.07), float3(0.10, 0.07, 0.19), xy.y / resolution.y);
  return half4(half3(bg + star * tw * 0.9), 1.0);
}
`)!;

/** Planets placed up the sky, deterministic per run, alternating sides. */
function layout(width: number, seed: number, count: number) {
  let s = seed;
  const rand = () => ((s = (s * 48271) % 2147483647) / 2147483647);
  const planets: { x: number; y: number; hue: number }[] = [];
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? 0.3 : 0.7;
    planets.push({ x: width * (side + (rand() - 0.5) * 0.3), y: -i * SPACING, hue: (260 + i * 23) % 360 });
  }
  return planets;
}

const hsl = (h: number, s: number, l: number) => `hsl(${h}, ${s}%, ${l}%)`;

export default function OrbitGame({ width, height, onScore, onEnd, run }: GameProps) {
  const planets = useMemo(() => layout(width, run * 7919 + 13, 120), [width, run]);
  const px = useMemo(() => planets.map((p) => p.x), [planets]);
  const py = useMemo(() => planets.map((p) => p.y), [planets]);
  const score = useRef(0);
  const ended = useRef(false);

  const mode = useSharedValue(0); // 0 orbit, 1 flight, 2 lost
  const index = useSharedValue(0);
  const angle = useSharedValue(Math.PI / 2);
  const spin = useSharedValue(2.4); // radians per second
  const sx = useSharedValue(planets[0].x);
  const sy = useSharedValue(planets[0].y + ORBIT_R);
  const vx = useSharedValue(0);
  const vy = useSharedValue(0);
  const cameraY = useSharedValue(0);
  const clock = useSharedValue(0);
  const trail = useSharedValue(new Array(TRAIL * 2).fill(0));
  const pulse = useSharedValue(0);

  const caught = (i: number) => {
    score.current = i;
    onScore(i);
    haptic.medium();
    play('perfect');
  };
  const lost = () => {
    if (ended.current) return;
    ended.current = true;
    haptic.heavy();
    play('lose');
    setTimeout(() => onEnd(score.current), 500);
  };

  useFrameCallback((info) => {
    const dt = Math.min(0.04, (info.timeSincePreviousFrame ?? 16) / 1000);
    clock.value += dt;
    pulse.value *= 0.9;
    const i = index.value;

    if (mode.value === 0) {
      angle.value += spin.value * dt;
      sx.value = px[i] + Math.cos(angle.value) * ORBIT_R;
      sy.value = py[i] + Math.sin(angle.value) * ORBIT_R;
    } else if (mode.value === 1) {
      sx.value += vx.value * dt;
      sy.value += vy.value * dt;
      // Caught by the next planet?
      const n = i + 1;
      if (n < px.length) {
        const dx = sx.value - px[n];
        const dy = sy.value - py[n];
        const d = Math.hypot(dx, dy);
        if (d <= CATCH_R) {
          index.value = n;
          mode.value = 0;
          angle.value = Math.atan2(dy, dx);
          // Keep turning the way the ship arrived, so the catch feels continuous.
          const cross = dx * vy.value - dy * vx.value;
          spin.value = (cross > 0 ? 1 : -1) * Math.min(4.2, 2.4 + n * 0.06);
          pulse.value = 1;
          runOnJS(caught)(n);
        }
      }
      // Off the sides, or fallen below the camera: lost.
      if (sx.value < -20 || sx.value > width + 20 || sy.value - cameraY.value > height + 40) {
        mode.value = 2;
        runOnJS(lost)();
      }
    }

    // The camera keeps the current planet in the lower middle, climbing smoothly.
    const target = py[index.value] - height * 0.6;
    cameraY.value += (target - cameraY.value) * Math.min(1, dt * 4);

    trail.modify((t) => {
      for (let k = TRAIL - 1; k > 0; k--) {
        t[k * 2] = t[(k - 1) * 2];
        t[k * 2 + 1] = t[(k - 1) * 2 + 1];
      }
      t[0] = sx.value;
      t[1] = sy.value;
      return t;
    });
  });

  const release = () => {
    'worklet';
    if (mode.value !== 0) return;
    const speed = 300 + index.value * 6;
    // Tangent to the orbit, in the direction of spin.
    const dir = spin.value > 0 ? 1 : -1;
    vx.value = -Math.sin(angle.value) * speed * dir;
    vy.value = Math.cos(angle.value) * speed * dir;
    mode.value = 1;
    runOnJS(play)('tap');
  };

  const tap = Gesture.Tap().maxDuration(10000).onEnd(() => release());

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') release();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const world = useDerivedValue(() => [{ translateY: -cameraY.value }]);
  const shipX = useDerivedValue(() => sx.value);
  const shipY = useDerivedValue(() => sy.value);
  const uniforms = useDerivedValue(() => ({ resolution: [width, height], time: clock.value, offset: cameraY.value }));
  const ringX = useDerivedValue(() => px[index.value]);
  const ringY = useDerivedValue(() => py[index.value]);
  const ringR = useDerivedValue(() => ORBIT_R + pulse.value * 10);
  const ringOpacity = useDerivedValue(() => (mode.value === 0 ? 0.55 : 0.2));

  return (
    <GestureDetector gesture={tap}>
      <Canvas style={{ width, height }} accessibilityLabel="Orbit: release to fly to the next planet">
        <Fill>
          <Shader source={STARFIELD} uniforms={uniforms} />
        </Fill>
        <Group transform={world}>
          {planets.map((p, i) => (
            <Planet key={i} x={p.x} y={p.y} hue={p.hue} />
          ))}
          <Circle cx={ringX} cy={ringY} r={ringR} style="stroke" strokeWidth={1.5} color="#e8eaf6" opacity={ringOpacity}>
            <DashPathEffect intervals={[6, 6]} />
          </Circle>
          {Array.from({ length: TRAIL }, (_, k) => (
            <TrailDot key={k} k={k} trail={trail} />
          ))}
          <Circle cx={shipX} cy={shipY} r={7} color="#f4f6fa" />
          <Circle cx={shipX} cy={shipY} r={11} color="#b58cff" opacity={0.35} />
        </Group>
      </Canvas>
    </GestureDetector>
  );
}

function Planet({ x, y, hue }: { x: number; y: number; hue: number }) {
  return (
    <>
      <Circle cx={x} cy={y} r={PLANET_R * 1.9} opacity={0.18}>
        <RadialGradient c={vec(x, y)} r={PLANET_R * 1.9} colors={[hsl(hue, 90, 70), 'transparent']} />
      </Circle>
      <Circle cx={x} cy={y} r={PLANET_R}>
        <RadialGradient c={vec(x - PLANET_R * 0.35, y - PLANET_R * 0.35)} r={PLANET_R * 1.4} colors={[hsl(hue, 80, 72), hsl(hue, 70, 38)]} />
      </Circle>
    </>
  );
}

function TrailDot({ k, trail }: { k: number; trail: { value: number[] } }) {
  const cx = useDerivedValue(() => trail.value[k * 2]);
  const cy = useDerivedValue(() => trail.value[k * 2 + 1]);
  const t = 1 - k / TRAIL;
  return <Circle cx={cx} cy={cy} r={1.5 + t * 4} color="#b58cff" opacity={t * 0.6} />;
}
