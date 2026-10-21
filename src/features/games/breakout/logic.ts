/**
 * Breakout, the arithmetic: a ball, a paddle, a wall of bricks, and where things bounce.
 *
 * Everything here is plain numbers so it can run inside a worklet on the UI thread and be
 * tested on the JS thread with the same code.
 */

export const ROWS = 6;
export const COLS = 7;

export type Brick = { x: number; y: number; w: number; h: number; row: number; col: number };

/** The wall, laid out for a play area. */
export function wall(width: number, top: number): Brick[] {
  'worklet';
  const gap = 4;
  const w = (width - gap * (COLS + 1)) / COLS;
  const h = 16;
  const out: Brick[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      out.push({ x: gap + col * (w + gap), y: top + row * (h + gap), w, h, row, col });
    }
  }
  return out;
}

export type Hit = 'none' | 'top' | 'bottom' | 'left' | 'right';

/**
 * Which side of a rectangle a circle has crossed into, judged by the shallower penetration —
 * which is how a ball that clips a brick's corner bounces off the face it mostly hit.
 */
export function hitSide(cx: number, cy: number, r: number, b: { x: number; y: number; w: number; h: number }): Hit {
  'worklet';
  const nx = Math.max(b.x, Math.min(cx, b.x + b.w));
  const ny = Math.max(b.y, Math.min(cy, b.y + b.h));
  const dx = cx - nx;
  const dy = cy - ny;
  if (dx * dx + dy * dy > r * r) return 'none';
  const overlapX = r - Math.abs(dx);
  const overlapY = r - Math.abs(dy);
  if (dx === 0 && dy === 0) {
    // Centre inside the rect: use the distance to each edge instead.
    const l = cx - b.x, rr = b.x + b.w - cx, t = cy - b.y, bb = b.y + b.h - cy;
    const m = Math.min(l, rr, t, bb);
    return m === t ? 'top' : m === bb ? 'bottom' : m === l ? 'left' : 'right';
  }
  if (overlapX < overlapY) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'top' : 'bottom';
}

/** The angle a paddle sends the ball back at, from where it struck: edges send it wide. */
export function paddleBounce(ballX: number, paddleX: number, paddleW: number, speed: number): { vx: number; vy: number } {
  'worklet';
  const t = Math.max(-1, Math.min(1, (ballX - (paddleX + paddleW / 2)) / (paddleW / 2)));
  const angle = t * (Math.PI / 3); // up to 60° from vertical
  return { vx: Math.sin(angle) * speed, vy: -Math.cos(angle) * speed };
}

/** Speed for a level, climbing but capped: the ball gets quicker the longer it lives. */
export function speedFor(level: number, bricksGone: number, height: number): number {
  'worklet';
  return Math.min(height * 1.3, height * 0.55 + level * height * 0.08 + bricksGone * height * 0.004);
}

export const pointsFor = (row: number) => (ROWS - row) * 10;
