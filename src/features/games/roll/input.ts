import { Platform } from 'react-native';
import { SensorType, useAnimatedSensor, useSharedValue } from 'react-native-reanimated';

import { levelled, tiltFromGravity, type Point } from './logic';

/**
 * The board's tilt from the phone's gravity sensor, read on the UI thread and levelled to the
 * way the phone was held when the run began. Where there is no sensor — a simulator — the game
 * falls back to the finger.
 */
export function useBoardTilt() {
  const sensor = useAnimatedSensor(SensorType.GRAVITY, { interval: 16 });
  const rest = useSharedValue<Point | null>(null);
  const android = Platform.OS === 'android';

  const read = (): Point => {
    'worklet';
    const g = sensor.sensor.value;
    // Before the first reading the sensor reports zeros; levelling to that would tip the board.
    if (g.x === 0 && g.y === 0 && g.z === 0) return { x: 0, y: 0 };
    const now = tiltFromGravity(g.x, g.y, android);
    if (!rest.value) rest.value = now;
    return levelled(now, rest.value);
  };

  return { available: sensor.isAvailable, read };
}
