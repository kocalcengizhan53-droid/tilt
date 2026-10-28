import { BlurMask, Canvas, Circle, DashPathEffect, Group, LinearGradient, RadialGradient, Rect, RoundedRect, Path, Skia, vec } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';

import type { GameProps } from '@/features/arcade/catalogue';
import { play } from '@/lib/audio';
import { haptic } from '@/lib/haptics';
import { useBoardTilt } from './input';
import {
  ACCEL,
  BALL_R,
  BONUS_SECONDS,
  HOLE_R,
  LIGHT_R,
  START_SECONDS,
  WELL,
  fallsIn,
  holesFor,
  place,
  pull,
  random,
  roll,
  toward,
  touches,
  type Point,
} from './logic';

/**
 * Roll.
 *
 * Tilt the phone and the marble rolls; touch the light and the clock gains three and a half
 * seconds and another light appears somewhere else. Every second light opens a hole, and holes
 * pull. The marble is integrated in a frame callback on the UI thread from the gravity sensor,
 * read there too, so a lean reaches the marble in the same frame; React hears about a light
 * caught or a marble lost. Without a sensor — the web, a simulator — it rolls toward the
 * pointer or the finger, and the arrow keys tilt it.
 */

const ORANGE = '#ff8a3d';
const TRAIL = 14;
const SHOWN_SECONDS = 20;

export default function RollGame({ width, height, onScore, onEnd, juice, run }: GameProps) {
  const board = useBoardTilt();
  const next = useMemo(() => random(run * 7919 + 17), [run]);
  // A board, not the whole screen: on a wide window it sits in the middle at a phone's proportions.
  const field = { w: Math.min(width - 16, 560), h: Math.min(height - 38, 820) };
  const left = (width - field.w) / 2;
  const top = 26 + (height - 26 - field.h) / 2;
  const first = useMemo(() => place(next, field.w, field.h, [{ x: field.w / 2, y: field.h / 2 }], 120), [next, field.w, field.h]);
  const [holes, setHoles] = useState<Point[]>([]);
  // The frame callback calls back into whichever render it was made in; the list it adds to
  // has to be the current one.
  const holesRef = useRef<Point[]>([]);
  const score = useRef(0);
  const streakAt = useRef(0);
  const ended = useRef(false);

  // UI-thread state.
  const ball = useSharedValue({ x: field.w / 2, y: field.h / 2, vx: 0, vy: 0 });
  const light = useSharedValue<Point>(first);
  const holesSv = useSharedValue<Point[]>([]);
  const time = useSharedValue(START_SECONDS);
  const clock = useSharedValue(0);
  const running = useSharedValue(true);
  const sinking = useSharedValue(0); // 0 rolling, then 0→1 as the marble drops into a hole
  const sinkAt = useSharedValue<Point>({ x: 0, y: 0 });
  // Where a finger presses, and where a mouse hovers: two, so the end of one never clears the other.
  const aim = useSharedValue<Point | null>(null);
  const hoverAim = useSharedValue<Point | null>(null);
  const keys = useSharedValue({ x: 0, y: 0 });
  const trail = useSharedValue(new Array(TRAIL * 2).fill(-100));
  const sensorOn = board.available;

  const caught = (x: number, y: number) => {
    if (ended.current) return;
    score.current += 1;
    onScore(score.current);
    haptic.light();
    play('hit');
    juice.burst(x + left, y + top, ORANGE, 14);
    const now = Date.now();
    const quick = now - streakAt.current < 2200;
    streakAt.current = now;
    juice.text(quick ? `QUICK +${BONUS_SECONDS}s` : `+${BONUS_SECONDS}s`, { x: x + left, y: y + top - 18, colour: quick ? '#ffd23f' : ORANGE });
    // A new hole every second light, clear of the marble and the next light.
    const want = holesFor(score.current);
    let list = holesRef.current;
    if (want > list.length) {
      const avoid = [{ x, y }, ...list];
      list = [...list, place(next, field.w, field.h, avoid, HOLE_R * 4)];
      holesRef.current = list;
      setHoles(list);
      holesSv.value = list;
      if (want === 1) juice.text('MIND THE HOLES', { big: true, colour: '#ff5c7a' });
    }
    light.value = place(next, field.w, field.h, [{ x, y }, ...list], 110);
    if (score.current % 10 === 0) {
      juice.text(`${score.current} LIGHTS`, { big: true, colour: '#ffd23f' });
      juice.flash('#ffd23f');
      play('win');
    }
  };

  const knocked = (speed: number) => {
    if (speed > 520) {
      haptic.light();
      juice.shake(Math.min(6, speed / 220));
    }
  };

  const lost = (how: 'hole' | 'time') => {
    if (ended.current) return;
    ended.current = true;
    haptic.heavy();
    play('lose');
    juice.shake(how === 'hole' ? 14 : 6);
    juice.flash('#ff5c7a');
    juice.text(how === 'hole' ? 'DOWN THE HOLE' : 'OUT OF TIME', { big: true, colour: '#ff5c7a' });
    setTimeout(() => onEnd(score.current), 650);
  };

  useFrameCallback((info) => {
    const dt = Math.min(0.033, (info.timeSincePreviousFrame ?? 16) / 1000);
    clock.value += dt;
    if (sinking.value > 0) {
      sinking.value = Math.min(1, sinking.value + dt * 2.6);
      return;
    }
    if (!running.value) return;

    const b = ball.value;
    let t = sensorOn ? board.read() : { x: 0, y: 0 };
    const steer = aim.value ?? hoverAim.value;
    if (steer) t = toward(steer, b);
    if (keys.value.x || keys.value.y) t = { x: keys.value.x * 0.85, y: keys.value.y * 0.85 };
    let ax = t.x * ACCEL;
    let ay = t.y * ACCEL;
    const list = holesSv.value;
    for (let i = 0; i < list.length; i++) {
      const p = pull(b, list[i]);
      ax += p.x;
      ay += p.y;
    }
    const moved = { ...b };
    const knock = roll(moved, ax, ay, dt, field.w, field.h);
    ball.value = moved;
    if (knock > 520) runOnJS(knocked)(knock);

    trail.modify((tr) => {
      for (let i = TRAIL - 1; i > 0; i--) {
        tr[i * 2] = tr[(i - 1) * 2];
        tr[i * 2 + 1] = tr[(i - 1) * 2 + 1];
      }
      tr[0] = moved.x;
      tr[1] = moved.y;
      return tr;
    });

    for (let i = 0; i < list.length; i++) {
      if (fallsIn(moved, list[i])) {
        running.value = false;
        sinkAt.value = list[i];
        sinking.value = 0.001;
        runOnJS(lost)('hole');
        return;
      }
    }
    if (touches(moved, light.value)) {
      time.value += BONUS_SECONDS;
      runOnJS(caught)(light.value.x, light.value.y);
      // Parked out of reach until React places the next one, so it cannot be caught twice.
      light.value = { x: -1000, y: -1000 };
    }
    time.value -= dt;
    if (time.value <= 0) {
      time.value = 0;
      running.value = false;
      runOnJS(lost)('time');
    }
  });

  // Without a sensor: the finger or the pointer steers, pressed or (with a mouse) hovering.
  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      aim.value = { x: e.x - left, y: e.y - top };
    })
    .onChange((e) => {
      aim.value = { x: e.x - left, y: e.y - top };
    })
    .onFinalize(() => {
      aim.value = null;
    });
  const hover = Gesture.Hover()
    .onChange((e) => {
      hoverAim.value = { x: e.x - left, y: e.y - top };
    })
    .onFinalize(() => {
      hoverAim.value = null;
    });
  const gesture = sensorOn ? Gesture.Simultaneous(pan) : Gesture.Simultaneous(pan, hover);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const held = new Set<string>();
    const sync = () => {
      keys.value = {
        x: (held.has('ArrowRight') ? 1 : 0) - (held.has('ArrowLeft') ? 1 : 0),
        y: (held.has('ArrowDown') ? 1 : 0) - (held.has('ArrowUp') ? 1 : 0),
      };
    };
    const down = (e: KeyboardEvent) => {
      if (!e.key.startsWith('Arrow')) return;
      e.preventDefault();
      held.add(e.key);
      sync();
    };
    const up = (e: KeyboardEvent) => {
      held.delete(e.key);
      sync();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [keys]);

  // The board's dots, drawn once as one path.
  const dots = useMemo(() => {
    const b = Skia.PathBuilder.Make();
    for (let x = 16; x < field.w; x += 28) for (let y = 16; y < field.h; y += 28) b.addCircle(x, y, 1.1);
    return b.build();
  }, [field.w, field.h]);

  const ballX = useDerivedValue(() => (sinking.value > 0 ? ball.value.x + (sinkAt.value.x - ball.value.x) * sinking.value : ball.value.x));
  const ballY = useDerivedValue(() => (sinking.value > 0 ? ball.value.y + (sinkAt.value.y - ball.value.y) * sinking.value : ball.value.y));
  const ballR = useDerivedValue(() => BALL_R * (1 - sinking.value * 0.75));
  const ballCentre = useDerivedValue(() => vec(ballX.value - 3, ballY.value - 4));
  const glowCentre = useDerivedValue(() => vec(ballX.value, ballY.value));
  const lightX = useDerivedValue(() => light.value.x);
  const lightY = useDerivedValue(() => light.value.y);
  const lightR = useDerivedValue(() => LIGHT_R * (0.85 + 0.15 * Math.sin(clock.value * 6)));
  const haloR = useDerivedValue(() => LIGHT_R * (1.9 + 0.5 * Math.sin(clock.value * 3)));
  const timeW = useDerivedValue(() => (Math.min(time.value, SHOWN_SECONDS) / SHOWN_SECONDS) * field.w);
  const timeColour = useDerivedValue(() => (time.value < 4 ? '#ff5c7a' : ORANGE));

  return (
    <GestureDetector gesture={gesture}>
      <Canvas style={{ width, height }} accessibilityLabel={sensorOn ? 'Roll: tilt the phone to roll the marble into the light' : 'Roll: point or press where the marble should roll; the arrow keys tilt the board'}>
        <Rect x={0} y={0} width={width} height={height}>
          <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={['#03141a', '#0b0414']} />
        </Rect>
        {/* The clock: what is left of the time, draining. */}
        <RoundedRect x={left} y={top - 16} width={field.w} height={5} r={3} color="#ffffff14" />
        <RoundedRect x={left} y={top - 16} width={timeW} height={5} r={3} color={timeColour}>
          <BlurMask blur={4} style="solid" />
        </RoundedRect>
        <Group transform={[{ translateX: left }, { translateY: top }]}>
          <RoundedRect x={0} y={0} width={field.w} height={field.h} r={10} color="#061a21" />
          <Path path={dots} color="#ff8a3d47" />
          {/* The marble lights the board around it. */}
          <Circle cx={ballX} cy={ballY} r={110}>
            <RadialGradient c={glowCentre} r={110} colors={['#ff8a3d30', '#ff8a3d00']} />
          </Circle>
          <RoundedRect x={1} y={1} width={field.w - 2} height={field.h - 2} r={10} color={ORANGE} style="stroke" strokeWidth={1.5} opacity={0.55}>
            <BlurMask blur={6} style="solid" />
          </RoundedRect>
          {holes.map((h, i) => (
            <Group key={i}>
              <Circle cx={h.x} cy={h.y} r={HOLE_R * WELL} color="#ff5c7a" style="stroke" strokeWidth={1} opacity={0.22}>
                <DashPathEffect intervals={[3, 6]} />
              </Circle>
              <Circle cx={h.x} cy={h.y} r={HOLE_R + 3}>
                <RadialGradient c={vec(h.x, h.y)} r={HOLE_R + 3} colors={['#000000', '#000000', '#ff5c7a55']} positions={[0, 0.7, 1]} />
              </Circle>
              <Circle cx={h.x} cy={h.y} r={HOLE_R} color="#ff5c7a" style="stroke" strokeWidth={1.2} opacity={0.7} />
            </Group>
          ))}
          <Circle cx={lightX} cy={lightY} r={haloR} color={ORANGE} opacity={0.22}>
            <BlurMask blur={10} style="normal" />
          </Circle>
          <Circle cx={lightX} cy={lightY} r={lightR} color="#ffe0b8">
            <BlurMask blur={3} style="solid" />
          </Circle>
          {Array.from({ length: TRAIL }, (_, i) => (
            <TrailDot key={i} index={i} trail={trail} />
          ))}
          <Circle cx={ballX} cy={ballY} r={ballR} color={ORANGE} opacity={0.5}>
            <BlurMask blur={9} style="normal" />
          </Circle>
          <Circle cx={ballX} cy={ballY} r={ballR}>
            <RadialGradient c={ballCentre} r={BALL_R * 1.4} colors={['#ffffff', '#ffd7b8', ORANGE, '#7a2e0b']} positions={[0, 0.25, 0.7, 1]} />
          </Circle>
        </Group>
      </Canvas>
    </GestureDetector>
  );
}

function TrailDot({ index, trail }: { index: number; trail: { value: number[] } }) {
  const cx = useDerivedValue(() => trail.value[index * 2]);
  const cy = useDerivedValue(() => trail.value[index * 2 + 1]);
  const fade = 1 - index / TRAIL;
  return <Circle cx={cx} cy={cy} r={BALL_R * (0.25 + fade * 0.55)} color={ORANGE} opacity={fade * 0.35} />;
}
