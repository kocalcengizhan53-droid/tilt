import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, interpolate, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import type { GameMeta } from '@/features/arcade/catalogue';
import { Cover } from '@/features/arcade/covers';
import { MONO, NeonText } from '@/features/arcade/neon';
import { play } from '@/lib/audio';
import { haptic } from '@/lib/haptics';

/**
 * One machine on the wall: a lit frame in its colour, the game's picture, its name in tube
 * lettering, and the player's best. It sinks under the thumb and its glow brightens, the way a
 * cabinet button does.
 */
export function GameCard({ meta, best, index }: { meta: GameMeta; best: number; index: number }) {
  const pressed = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.04 }],
    boxShadow: `0 0 ${interpolate(pressed.value, [0, 1], [14, 26])}px ${meta.hex}${pressed.value > 0.5 ? '99' : '55'}`,
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
            <Cover id={meta.id} hex={meta.hex} />
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
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}
