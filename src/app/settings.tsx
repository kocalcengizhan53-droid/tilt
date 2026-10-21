import { router } from 'expo-router';
import { Pressable, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { play } from '@/lib/audio';
import { haptic } from '@/lib/haptics';
import { useSettings } from '@/lib/settings';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { sound, haptics, setSound, setHaptics } = useSettings();

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top + 8 }}>
      <View className="flex-row items-center justify-between px-4 pb-2">
        <Text className="text-2xl font-black uppercase tracking-[4px] text-foreground">Settings</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} className="min-h-11 min-w-11 items-end justify-center">
          <Text className="text-base text-muted-foreground">Done</Text>
        </Pressable>
      </View>
      <View className="gap-3 p-4">
        <Row label="Sound" hint="Synthesised tones, no samples" value={sound} onChange={(v) => { setSound(v); if (v) play('tap'); }} />
        <Row label="Haptics" hint="Feedback under the thumb, on a phone" value={haptics} onChange={(v) => { setHaptics(v); if (v) haptic.medium(); }} />
        <Text className="mt-6 font-mono text-xs leading-5 text-muted-foreground">
          Tilt keeps everything on this device: scores, settings, nothing else. No account, no network, no analytics.
        </Text>
      </View>
    </View>
  );
}

function Row({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View className="flex-row items-center justify-between rounded-2xl bg-card px-4 py-3">
      <View>
        <Text className="text-base font-semibold text-foreground">{label}</Text>
        <Text className="text-xs text-muted-foreground">{hint}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} accessibilityLabel={label} trackColor={{ true: '#f6c453' }} />
    </View>
  );
}
