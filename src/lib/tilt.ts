import { useEffect } from 'react';
import { SensorType, useAnimatedSensor, useFrameCallback, useSharedValue } from 'react-native-reanimated';

import { tiltStep } from '@/lib/tilt-math';

/**
 * How far the phone leans, as two shared values in −1…1, read from the rotation sensor on the
 * UI thread. Off when motion is reduced: the cards then settle flat.
 */
export function useTilt(enabled: boolean) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const base = useSharedValue({ pitch: Number.NaN, roll: Number.NaN });
  const sensor = useAnimatedSensor(SensorType.ROTATION, { interval: 16 });
  // Read on the UI thread, so it lives in a shared value rather than the closure.
  const on = useSharedValue(enabled);
  useEffect(() => on.set(enabled), [enabled, on]);

  useFrameCallback(() => {
    if (!on.value) {
      x.value += (0 - x.value) * 0.2;
      y.value += (0 - y.value) * 0.2;
      return;
    }
    const { pitch, roll } = sensor.sensor.value;
    const b = Number.isNaN(base.value.pitch) ? { pitch, roll } : base.value;
    const p = tiltStep(pitch, b.pitch);
    const r = tiltStep(roll, b.roll);
    base.value = { pitch: p.baseline, roll: r.baseline };
    x.value += (r.tilt - x.value) * 0.2;
    y.value += (p.tilt - y.value) * 0.2;
  });

  return { x, y, live: enabled && sensor.isAvailable };
}
