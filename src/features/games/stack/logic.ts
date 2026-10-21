/**
 * Stack, the arithmetic.
 *
 * A block slides; the player drops it; whatever does not sit on the block below is cut away
 * and falls. Drop it within a few points of true and it is a perfect: nothing is cut, and the
 * block grows back a little, so a run of perfects rebuilds a tower that bad drops have
 * whittled. The rendering never decides any of this — it draws what these functions return.
 */

export const BLOCK_H = 26;
/** Points of error forgiven as a perfect drop. */
export const TOLERANCE = 6;
/** How much a perfect drop grows the block back, in points, up to the starting width. */
export const REGROW = 8;

export type Block = { x: number; w: number };

export type Drop =
  | { kind: 'miss' }
  | { kind: 'perfect'; block: Block }
  | { kind: 'cut'; block: Block; cut: Block };

/** The next block's resting place, given the block beneath it and where it was released. */
export function drop(below: Block, x: number, w: number, baseWidth: number): Drop {
  if (Math.abs(x - below.x) <= TOLERANCE) {
    return { kind: 'perfect', block: { x: below.x, w: Math.min(baseWidth, below.w + REGROW) } };
  }
  const start = Math.max(below.x, x);
  const end = Math.min(below.x + below.w, x + w);
  if (end - start <= 0) return { kind: 'miss' };
  const cut = x < below.x ? { x, w: below.x - x } : { x: below.x + below.w, w: x + w - (below.x + below.w) };
  return { kind: 'cut', block: { x: start, w: end - start }, cut };
}

/** Points per second the slider moves at, climbing with the tower and capped. */
export function speed(level: number, width: number): number {
  return Math.min(width * 1.6, width * 0.55 + level * width * 0.035);
}

/** Score for a landed block: one, and one more for each perfect in the current streak (capped). */
export function points(streak: number): number {
  return 1 + Math.min(5, streak);
}

/** The block's colour drifts up the spectrum as the tower climbs. */
export function hue(level: number): number {
  return (190 + level * 6) % 360;
}

/** HSL to a hex string, for a canvas that only reads hex. */
export function hsl(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => l / 100 - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
}
