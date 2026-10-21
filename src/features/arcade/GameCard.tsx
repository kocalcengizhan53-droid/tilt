import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInUp, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import type { GameMeta } from '@/features/arcade/catalogue';
import { haptic } from '@/lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * One machine on the wall: its colour, its name, one line, and the player's best. Presses
 * down under the thumb and springs back, the way a cabinet button does.
 */
export function GameCard({ meta, best, index }: { meta: GameMeta; best: number; index: number }) {
  const pressed = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.04 }],
  }));

  return (
    <Animated.View entering={FadeInUp.delay(60 * index).duration(380)} style={{ flex: 1 }}>
      <Link href={{ pathname: '/play/[game]', params: { game: meta.id } }} asChild>
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel={`${meta.title}. ${meta.tagline}${best ? `. Best ${best}` : ''}`}
          onPressIn={() => {
            pressed.value = withSpring(1, { damping: 18, stiffness: 320 });
          }}
          onPressOut={() => {
            pressed.value = withSpring(0, { damping: 14, stiffness: 260 });
          }}
          onPress={() => haptic.light()}
          style={style}
          className={`min-h-44 justify-between overflow-hidden rounded-3xl border border-border bg-card p-4`}
        >
          {/* The machine's light: a soft disc of its colour behind the title. */}
          <View className={`absolute -right-10 -top-10 h-40 w-40 rounded-full bg-${meta.colour} opacity-15`} />
          <View className="flex-row items-center justify-between">
            <View className={`h-2.5 w-2.5 rounded-full bg-${meta.colour}`} />
            {best ? (
              <Text className="font-mono text-xs text-muted-foreground">best {best}</Text>
            ) : (
              <Text className="font-mono text-xs text-muted-foreground">unplayed</Text>
            )}
          </View>
          <View>
            <Text numberOfLines={1} adjustsFontSizeToFit className={`text-2xl font-black uppercase tracking-[2px] text-${meta.colour}`}>{meta.title}</Text>
            <Text className="mt-1 text-sm leading-5 text-foreground">{meta.tagline}</Text>
          </View>
        </AnimatedPressable>
      </Link>
    </Animated.View>
  );
}
