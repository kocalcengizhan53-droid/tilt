import { Canvas, Group, LinearGradient, Path, Rect, RoundedRect, Skia, vec } from '@shopify/react-native-skia';
import { useEffect, useRef, useState } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  runOnJS,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { GameProps } from '@/features/arcade/catalogue';
import { play } from '@/lib/audio';
import { haptic } from '@/lib/haptics';
import { BLOCK_H, drop, hsl, hue, points, speed, type Block } from './logic';

/**
 * Stack.
 *
 * The slider runs on the UI thread: a frame callback moves a shared value every frame, and
 * the canvas reads it directly, so the block glides at the display's rate whatever React is
 * doing. A tap is the only input. It reads the shared value where it is at that instant and
 * hands the arithmetic to `drop()`; React then commits the result and the canvas redraws the
 * tower. The camera is a shared value too, eased to a new height after every landing.
 */

const SIDE = 10; // the block's visible right face, for depth
const TOP = 6; // its visible top face

function faceColour(level: number) {
  const h = hue(level);
  return { front: hsl(h, 72, 62), side: hsl(h, 72, 42), top: hsl(h, 60, 78) };
}

export default function StackGame({ width, height, onScore, onEnd }: GameProps) {
  const baseWidth = Math.round(width * 0.62);
  const floorY = height - 36; // world y of the bottom of the first block
  const [blocks, setBlocks] = useState<Block[]>([{ x: (width - baseWidth) / 2, w: baseWidth }]);
  const [over, setOver] = useState(false);
  const [falling, setFalling] = useState<{ block: Block; level: number } | null>(null);
  const score = useRef(0);
  const streak = useRef(0);

  // The slider, on the UI thread.
  const sliderX = useSharedValue(-baseWidth);
  const sliderW = useSharedValue(baseWidth);
  const dir = useSharedValue(1);
  const velocity = useSharedValue(speed(0, width));
  const running = useSharedValue(true);
  const cameraY = useSharedValue(0);
  const fallT = useSharedValue(1);

  useFrameCallback((info) => {
    if (!running.value) return;
    const dt = Math.min(0.05, (info.timeSincePreviousFrame ?? 16) / 1000);
    let x = sliderX.value + dir.value * velocity.value * dt;
    if (x > width - sliderW.value * 0.15) {
      x = width - sliderW.value * 0.15;
      dir.value = -1;
    } else if (x < -sliderW.value * 0.85) {
      x = -sliderW.value * 0.85;
      dir.value = 1;
    }
    sliderX.value = x;
  });

  const land = (x: number) => {
    if (over) return;
    const level = blocks.length;
    const below = blocks[level - 1];
    const result = drop(below, x, sliderW.value, baseWidth);

    if (result.kind === 'miss') {
      running.value = false;
      setOver(true);
      setFalling({ block: { x, w: sliderW.value }, level });
      fallT.value = 0;
      fallT.value = withTiming(1, { duration: 600 });
      haptic.heavy();
      play('hit');
      setTimeout(() => onEnd(score.current), 650);
      return;
    }

    if (result.kind === 'perfect') {
      streak.current += 1;
      haptic.medium();
      play('perfect');
    } else {
      streak.current = 0;
      haptic.light();
      play('drop');
      setFalling({ block: result.cut, level });
      fallT.value = 0;
      fallT.value = withTiming(1, { duration: 520 });
    }

    score.current += points(streak.current);
    onScore(score.current);
    const next = [...blocks, result.block];
    setBlocks(next);

    // The next slider: the landed width, entering from the opposite side, a little faster.
    sliderW.value = result.block.w;
    dir.value = dir.value === 1 ? -1 : 1;
    sliderX.value = dir.value === 1 ? -result.block.w * 0.85 : width - result.block.w * 0.15;
    velocity.value = speed(next.length, width);

    // The camera climbs once the tower reaches the middle of the screen.
    const towerTop = floorY - next.length * BLOCK_H;
    const target = Math.max(0, height * 0.5 - towerTop);
    cameraY.value = withTiming(target, { duration: 260 });
  };

  const tap = Gesture.Tap()
    .maxDuration(400)
    .onEnd(() => {
      runOnJS(land)(sliderX.value);
    });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        land(sliderX.value);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const world = useDerivedValue(() => [{ translateY: cameraY.value }]);
  const sliderTransform = useDerivedValue(() => [{ translateX: sliderX.value }]);
  const fallTransform = useDerivedValue(() => [{ translateY: fallT.value * 260 }, { rotate: fallT.value * 0.4 }]);
  const fallOpacity = useDerivedValue(() => 1 - fallT.value);

  const level = blocks.length;
  const sliderY = floorY - (level + 1) * BLOCK_H;
  const sliderColour = faceColour(level);
  // The slider's width is the last landed block's, so it can be drawn as a block, faces and all.

  return (
    <GestureDetector gesture={tap}>
      <Canvas style={{ width, height }} accessibilityLabel="Stack: tap to drop the sliding block">
        <Rect x={0} y={0} width={width} height={height}>
          <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={['#0b0c12', '#141729']} />
        </Rect>

        <Group transform={world}>
          {blocks.map((b, i) => (
            <Block3D key={i} x={b.x} y={floorY - (i + 1) * BLOCK_H} w={b.w} colour={faceColour(i)} />
          ))}

          {falling ? (
            <Group transform={fallTransform} opacity={fallOpacity} origin={vec(falling.block.x, floorY - falling.level * BLOCK_H)}>
              <Block3D
                x={falling.block.x}
                y={floorY - (falling.level + 1) * BLOCK_H}
                w={falling.block.w}
                colour={faceColour(falling.level)}
              />
            </Group>
          ) : null}

          {!over ? (
            <Group transform={sliderTransform}>
              <Group transform={[{ translateY: sliderY }]}>
                <Block3D x={0} y={0} w={blocks[level - 1].w} colour={sliderColour} />
              </Group>
            </Group>
          ) : null}
        </Group>
      </Canvas>
    </GestureDetector>
  );
}

/** A block with a lit top and a shaded right face: enough depth to read as a thing. */
function Block3D({ x, y, w, colour }: { x: number; y: number; w: number; colour: { front: string; side: string; top: string } }) {
  // Faces as SVG path strings: the one path constructor every Skia version agrees on.
  const side = Skia.Path.MakeFromSVGString(
    `M${x + w} ${y} L${x + w + SIDE} ${y - TOP} L${x + w + SIDE} ${y - TOP + BLOCK_H} L${x + w} ${y + BLOCK_H} Z`
  )!;
  const top = Skia.Path.MakeFromSVGString(
    `M${x} ${y} L${x + SIDE} ${y - TOP} L${x + w + SIDE} ${y - TOP} L${x + w} ${y} Z`
  )!;
  return (
    <>
      <Path path={side} color={colour.side} />
      <Path path={top} color={colour.top} />
      <RoundedRect x={x} y={y} width={w} height={BLOCK_H} r={2} color={colour.front} />
    </>
  );
}
