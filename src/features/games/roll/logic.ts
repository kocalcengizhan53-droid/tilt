/**
 * Roll, the arithmetic: a marble on a board you tilt, the light it chases and the holes that
 * want it. Plain numbers, so the same code runs in a worklet on the UI thread and in a test.
 */

/** Points per second² at a full tilt — the board held on its edge. */
export const ACCEL = 1500;
/** How much of its speed the marble keeps after a second of rolling. */
export const KEEP_PER_SECOND = 0.3;
/** How much speed survives hitting the rim. */
export const BOUNCE = 0.55;
export const BALL_R = 11;
export const LIGHT_R = 13;
export const HOLE_R = 19;
/** Seconds on the clock at the start, and what each light adds. */
export const START_SECONDS = 12;
export const BONUS_SECONDS = 3.5;
/** Holes pull from this many hole radii out. */
export const WELL = 2.4;

export type Point = { x: number; y: number };
export type Ball = { x: number; y: number; vx: number; vy: number };

/**
 * The board's tilt from the gravity sensor, in g along the screen's axes (x right, y down).
 * iOS reports the direction of the earth in the device's frame (y toward its top); Android
 * reports the opposite, the force holding the phone up. Held upright, the marble rolls down
 * the screen on both.
 */
export function tiltFromGravity(gx: number, gy: number, android: boolean): Point {
  'worklet';
  const s = android ? -1 : 1;
  const clamp = (v: number) => Math.max(-1, Math.min(1, v));
  return { x: clamp((s * gx) / 9.81), y: clamp((-s * gy) / 9.81) };
}

/** One step of rolling. Returns the speed lost to the rim, for a knock that matches the hit. */
export function roll(b: Ball, ax: number, ay: number, dt: number, width: number, height: number): number {
  'worklet';
  const keep = Math.pow(KEEP_PER_SECOND, dt);
  b.vx = (b.vx + ax * dt) * keep;
  b.vy = (b.vy + ay * dt) * keep;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  let knock = 0;
  if (b.x < BALL_R) {
    b.x = BALL_R;
    knock = Math.max(knock, Math.abs(b.vx));
    b.vx = Math.abs(b.vx) * BOUNCE;
  } else if (b.x > width - BALL_R) {
    b.x = width - BALL_R;
    knock = Math.max(knock, Math.abs(b.vx));
    b.vx = -Math.abs(b.vx) * BOUNCE;
  }
  if (b.y < BALL_R) {
    b.y = BALL_R;
    knock = Math.max(knock, Math.abs(b.vy));
    b.vy = Math.abs(b.vy) * BOUNCE;
  } else if (b.y > height - BALL_R) {
    b.y = height - BALL_R;
    knock = Math.max(knock, Math.abs(b.vy));
    b.vy = -Math.abs(b.vy) * BOUNCE;
  }
  return knock;
}

/** A hole's pull on the marble, growing as it nears the rim, nothing beyond `WELL` radii. */
export function pull(b: Point, hole: Point): Point {
  'worklet';
  const dx = hole.x - b.x;
  const dy = hole.y - b.y;
  const d = Math.hypot(dx, dy);
  const reach = HOLE_R * WELL;
  if (d >= reach || d < 1e-6) return { x: 0, y: 0 };
  const strength = ACCEL * 0.55 * (1 - d / reach) ** 2;
  return { x: (dx / d) * strength, y: (dy / d) * strength };
}

/** Over the hole far enough that it tips in: the marble's centre inside the rim, less a lip. */
export const fallsIn = (b: Point, hole: Point) => {
  'worklet';
  return Math.hypot(b.x - hole.x, b.y - hole.y) < HOLE_R - BALL_R * 0.35;
};

export const touches = (b: Point, light: Point) => {
  'worklet';
  return Math.hypot(b.x - light.x, b.y - light.y) < BALL_R + LIGHT_R;
};

/** How many holes the board has after `lights` lights: none at first, then one per two, up to seven. */
export const holesFor = (lights: number) => Math.min(7, Math.floor(lights / 2));

/** A small seeded generator, so a run's board is the same in a test as on the phone. */
export function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A free spot on the board: inside the rim, clear of everything in `avoid` by `gap`. Gives up
 * gracefully on a crowded board and takes the clearest of its tries.
 */
export function place(next: () => number, width: number, height: number, avoid: readonly Point[], gap: number): Point {
  const margin = HOLE_R + 8;
  let best: Point = { x: width / 2, y: height / 2 };
  let bestClear = -1;
  for (let i = 0; i < 40; i++) {
    const p = { x: margin + next() * (width - 2 * margin), y: margin + next() * (height - 2 * margin) };
    const clear = avoid.reduce((m, q) => Math.min(m, Math.hypot(p.x - q.x, p.y - q.y)), Infinity);
    if (clear >= gap) return p;
    if (clear > bestClear) {
      bestClear = clear;
      best = p;
    }
  }
  return best;
}

/**
 * The tilt measured from however the board was held when the run began, so a phone held at a
 * reading angle is level. A lean of about 35° from there is a full tilt.
 */
export function levelled(now: Point, rest: Point): Point {
  'worklet';
  const clamp = (v: number) => Math.max(-1, Math.min(1, v));
  return { x: clamp((now.x - rest.x) * 1.7), y: clamp((now.y - rest.y) * 1.7) };
}

/** Steering by pointer or finger: roll toward it, harder the further it is, full at 140 points. */
export function toward(aim: Point, b: Point): Point {
  'worklet';
  const clamp = (v: number) => Math.max(-1, Math.min(1, v));
  return { x: clamp((aim.x - b.x) / 140), y: clamp((aim.y - b.y) / 140) };
}
