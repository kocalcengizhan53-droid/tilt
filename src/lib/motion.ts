import { useReducedMotion } from 'react-native-reanimated';

import { useSettings } from '@/lib/settings';

/**
 * Whether to move things that are only there for feel — shake, flicker, particles, the
 * scrolling floor. Off when the system asks for reduced motion or the player switches it off.
 * Game motion itself (a falling block, a flying ship) is the game, and stays.
 */
export function useMotion() {
  const system = useReducedMotion();
  const setting = useSettings((s) => s.reduceMotion);
  return { reduced: system || setting };
}

export const motionReduced = () => useSettings.getState().reduceMotion;
