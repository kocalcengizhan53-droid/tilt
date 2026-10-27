import { router } from 'expo-router';
import { Pressable, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NeonText } from '@/features/arcade/neon';
import { play } from '@/lib/audio';
import { haptic } from '@/lib/haptics';
import { useSettings } from '@/lib/settings';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { sound, haptics, reduceMotion, setSound, setHaptics, setReduceMotion } = useSettings();

  return (
    <View role="main" className="flex-1 bg-background" style={{ paddingTop: insets.top + 8 }}>
      <View className="flex-row items-center justify-between px-4 pb-2">
        <NeonText colour="#22e3ff" size={26}>
          SETTINGS
        </NeonText>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} className="min-h-11 min-w-11 items-end justify-center">
          <Text className="text-base text-muted-foreground">Done</Text>
        </Pressable>
      </View>
      <View className="gap-3 p-4">
        <Row label="Sound" hint="Synthesised tones, no samples" value={sound} onChange={(v) => { setSound(v); if (v) play('tap'); }} />
        <Row label="Haptics" hint="Feedback under the thumb, on a phone" value={haptics} onChange={(v) => { setHaptics(v); if (v) haptic.medium(); }} />
        <Row label="Reduce motion" hint="No shake, flash, sparks or flicker. Also follows the system setting." value={reduceMotion} onChange={setReduceMotion} />
        <Text className="mt-6 font-mono text-xs leading-5 text-muted-foreground">
          Tilt keeps everything on this device: scores, settings, nothing else. No account, no network, no analytics.
        </Text>
      </View>
    </View>
  );
}

function Row({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View className="flex-row items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3" style={{ borderWidth: 1, borderColor: '#34245a' }}>
      <View style={{ flex: 1 }}>
        <Text className="text-base font-semibold text-foreground">{label}</Text>
        <Text className="text-xs text-muted-foreground">{hint}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} accessibilityLabel={label} trackColor={{ true: '#22e3ff' }} />
    </View>
  );
}
