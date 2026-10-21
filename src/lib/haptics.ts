import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { useSettings } from '@/lib/settings';

/** Feedback under the thumb. Nothing on the web, nothing when switched off. */
export const haptic = {
  light: () => tap(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => tap(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  heavy: () => tap(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  success: () => tap(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: () => tap(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};

function tap(fn: () => Promise<void>) {
  if (Platform.OS === 'web' || !useSettings.getState().haptics) return;
  fn().catch(() => {});
}
