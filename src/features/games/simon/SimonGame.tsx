import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import type { GameProps } from '@/features/arcade/catalogue';
import { play, type Sound } from '@/lib/audio';
import { haptic } from '@/lib/haptics';
import { check, extend, litFor } from './logic';

/**
 * Simon.
 *
 * Four pads, each with its own tone and its own glow. Playback lights each pad in turn with
 * its tone and a tap of haptics; then the pads are live and the player plays it back. The
 * glow is a shared value per pad, so a lit pad is a 60fps fade however busy React is.
 */

const PAD: { colour: string; sound: Sound }[] = [
  { colour: '#ff6ec7', sound: 'padA' },
  { colour: '#5ee7f0', sound: 'padB' },
  { colour: '#f6c453', sound: 'padC' },
  { colour: '#b9f26b', sound: 'padD' },
];

type Phase = 'watch' | 'play' | 'done';

export default function SimonGame({ width, height, onScore, onEnd }: GameProps) {
  const [sequence, setSequence] = useState<number[]>(() => extend([]));
  const [answer, setAnswer] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>('watch');
  const [lit, setLit] = useState<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const round = sequence.length;

  const glow = [useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0)];

  const light = (pad: number, ms: number) => {
    setLit(pad);
    glow[pad].value = withSequence(withTiming(1, { duration: 60 }), withTiming(0, { duration: ms }));
    play(PAD[pad].sound);
    haptic.light();
  };

  // Playback: the whole sequence, one pad at a time, then hand over.
  useEffect(() => {
    if (phase !== 'watch') return;
    const ms = litFor(round);
    timers.current.forEach(clearTimeout);
    timers.current = [];
    sequence.forEach((pad, i) => {
      timers.current.push(setTimeout(() => light(pad, ms), 600 + i * (ms + 160)));
    });
    timers.current.push(
      setTimeout(() => {
        setLit(null);
        setPhase('play');
      }, 600 + sequence.length * (ms + 160)),
    );
    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, sequence]);

  const press = (pad: number) => {
    if (phase !== 'play') return;
    light(pad, 260);
    const next = [...answer, pad];
    const result = check(sequence, next);
    if (result === 'wrong') {
      setPhase('done');
      haptic.error();
      setTimeout(() => play('lose'), 200);
      setTimeout(() => onEnd(round - 1), 700);
      return;
    }
    if (result === 'complete') {
      onScore(round);
      setAnswer([]);
      setPhase('watch');
      setSequence(extend(sequence));
      haptic.success();
      return;
    }
    setAnswer(next);
  };

  const size = Math.min(width, height) - 48;
  const pad = size / 2 - 8;

  return (
    <View className="flex-1 items-center justify-center" accessibilityLabel="Simon: repeat the sequence">
      <Text className="mb-5 text-xs uppercase tracking-[4px] text-muted-foreground">
        {phase === 'watch' ? `Round ${round} · watch` : phase === 'play' ? `Round ${round} · your turn` : 'Wrong'}
      </Text>
      {/* Two rows of two, laid out explicitly: a wrapping row is one more thing to go wrong. */}
      <View style={{ width: size, gap: 16 }}>
        {[0, 2].map((row) => (
          <View key={row} className="flex-row" style={{ gap: 16 }}>
            {[row, row + 1].map((i) => (
              <Pad key={i} index={i} colour={PAD[i].colour} size={pad} glow={glow[i]} lit={lit === i} live={phase === 'play'} onPress={() => press(i)} />
            ))}
          </View>
        ))}
      </View>
      <Text className="mt-6 font-mono text-xs text-muted-foreground">
        {answer.length}/{sequence.length}
      </Text>
    </View>
  );
}

function Pad({ index, colour, size, glow, lit, live, onPress }: { index: number; colour: string; size: number; glow: { value: number }; lit: boolean; live: boolean; onPress: () => void }) {
  const style = useAnimatedStyle(() => ({
    opacity: 0.35 + glow.value * 0.65,
    transform: [{ scale: 1 + glow.value * 0.04 }],
    shadowOpacity: glow.value,
  }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Pad ${index + 1}${lit ? ', lit' : ''}`}
      accessibilityState={{ disabled: !live }}
      onPress={onPress}
      style={{ width: size, height: size }}
    >
      <Animated.View
        style={[
          { flex: 1, borderRadius: 28, backgroundColor: colour, shadowColor: colour, shadowRadius: 24, shadowOffset: { width: 0, height: 0 } },
          style,
        ]}
      />
    </Pressable>
  );
}
