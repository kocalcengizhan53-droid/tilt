import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, interpolate, useAnimatedStyle, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';

import type { GameMeta } from '@/features/arcade/catalogue';
import { Cover } from '@/features/arcade/covers';
import { MONO, NeonText } from '@/features/arcade/neon';
import { play } from '@/lib/audio';
import { haptic } from '@/lib/haptics';

/**
 * One machine on the wall: a lit frame in its colour, the game's picture, its name in tube
 * lettering, and the player's best. It sinks under the thumb and its glow brightens, the way a
 * cabinet button does — and the whole wall leans as the phone does, a sheen of light sliding
 * across the glass and the picture sitting a little deeper than the frame.
 */
export function GameCard({
  meta,
  best,
  index,
  tilt,
}: {
  meta: GameMeta;
  best: number;
  index: number;
  tilt: { x: SharedValue<number>; y: SharedValue<number>; live: boolean };
}) {
  const pressed = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    transform: [
      { perspective: 700 },
      { rotateX: `${-tilt.y.value * 9}deg` },
      { rotateY: `${tilt.x.value * 9}deg` },
      { scale: 1 - pressed.value * 0.04 },
    ],
    boxShadow: `${-tilt.x.value * 6}px ${tilt.y.value * 6}px ${interpolate(pressed.value, [0, 1], [14, 26])}px ${meta.hex}${pressed.value > 0.5 ? '99' : '55'}`,
  }));
  const sheen = useAnimatedStyle(() => ({
    opacity: 0.08 + Math.min(0.14, (Math.abs(tilt.x.value) + Math.abs(tilt.y.value)) * 0.12),
    transform: [{ translateX: tilt.x.value * 70 }, { translateY: tilt.y.value * 50 }, { rotate: '20deg' }],
  }));
  const depth = useAnimatedStyle(() => ({
    transform: [{ translateX: -tilt.x.value * 5 }, { translateY: -tilt.y.value * 4 }],
  }));

  return (
    <Animated.View entering={FadeInUp.delay(70 * index).duration(420)} style={{ flex: 1 }}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${meta.title}. ${meta.tagline}${best ? `. Best ${best}` : ''}`}
        onPressIn={() => pressed.set(withSpring(1, { damping: 18, stiffness: 320 }))}
        onPressOut={() => pressed.set(withSpring(0, { damping: 14, stiffness: 260 }))}
        onPress={() => {
          haptic.light();
          play('tap');
          router.push({ pathname: '/play/[game]', params: { game: meta.id } });
        }}
      >
        <Animated.View
          style={[{ borderRadius: 22, borderWidth: 1.5, borderColor: `${meta.hex}aa`, overflow: 'hidden', backgroundColor: '#120824' }, style]}
        >
          <LinearGradient colors={[`${meta.hex}26`, 'transparent']} style={{ height: 118 }}>
            {/* Always wrapped, live or not: swapping the parent would remount the picture after
                hydration, and a picture painted late becomes the page's largest paint. */}
            <Animated.View style={[{ flex: 1 }, depth]}>
              <Cover id={meta.id} hex={meta.hex} tilt={tilt} />
            </Animated.View>
          </LinearGradient>
          <View style={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: 6, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <NeonText colour={meta.hex} size={19}>
                {meta.title.toUpperCase()}
              </NeonText>
              <Text style={{ fontFamily: MONO, fontSize: 11, color: best ? '#f4ecff' : '#a99bc4' }}>
                {best ? `★${best.toLocaleString('en-GB')}` : 'new'}
              </Text>
            </View>
            <Text numberOfLines={2} style={{ fontSize: 13, lineHeight: 18, color: '#d9cdf0', minHeight: 36 }}>
              {meta.tagline}
            </Text>
          </View>
          {/* Light on the glass: a soft diagonal band that slides with the lean. */}
          <Animated.View
            pointerEvents="none"
            style={[{ position: 'absolute', top: -60, bottom: -60, left: '25%', width: '45%', display: tilt.live ? 'flex' : 'none' }, sheen]}
          >
            <LinearGradient colors={['transparent', '#ffffff', 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1 }} />
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}
