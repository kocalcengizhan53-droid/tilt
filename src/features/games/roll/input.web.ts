import type { Point } from './logic';

/**
 * On the web the board follows the pointer or the arrow keys: a browser's motion sensors need a
 * permission prompt, and on a laptop there is nothing to tilt.
 */
export function useBoardTilt() {
  const read = (): Point => {
    'worklet';
    return { x: 0, y: 0 };
  };
  return { available: false, read };
}
