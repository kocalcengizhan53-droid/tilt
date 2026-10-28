/**
 * The arithmetic of the cabinet's tilt, kept apart from the sensor so it can be tested. The
 * resting angle is not upright — people hold a phone leaning back — so the tilt is measured
 * from a baseline that slowly follows the hand: a lean shows, a new way of holding it fades.
 */

/** How far the baseline moves toward the current angle each frame (about a second to settle). */
export const BASELINE_FOLLOW = 0.015;
/** Radians of lean that count as a full tilt. */
export const FULL_TILT = 0.35;

export const clamp = (v: number, lo = -1, hi = 1) => {
  'worklet';
  return Math.min(hi, Math.max(lo, v));
};

/** One frame: the new baseline, and the tilt in −1…1 relative to it. */
export function tiltStep(angle: number, baseline: number) {
  'worklet';
  const next = baseline + (angle - baseline) * BASELINE_FOLLOW;
  return { baseline: next, tilt: clamp((angle - next) / FULL_TILT) };
}
