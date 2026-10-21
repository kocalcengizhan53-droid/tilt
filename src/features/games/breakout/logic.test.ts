import { describe, expect, test } from '@jest/globals';

import { COLS, ROWS, hitSide, paddleBounce, speedFor, wall } from './logic';

test('the wall fills the width with every brick inside it', () => {
  const bricks = wall(360, 80);
  expect(bricks).toHaveLength(ROWS * COLS);
  for (const b of bricks) {
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.w).toBeLessThanOrEqual(360);
  }
});

describe('hitSide', () => {
  const brick = { x: 100, y: 100, w: 50, h: 20 };
  test('misses when the ball is clear', () => {
    expect(hitSide(50, 50, 6, brick)).toBe('none');
  });
  test('names the face the ball mostly came through', () => {
    expect(hitSide(125, 96, 6, brick)).toBe('top');
    expect(hitSide(125, 124, 6, brick)).toBe('bottom');
    expect(hitSide(96, 110, 6, brick)).toBe('left');
    expect(hitSide(154, 110, 6, brick)).toBe('right');
  });
  test('a corner clip bounces off the shallower face', () => {
    // Just above and barely inside the left edge: more of the ball is over the top face.
    expect(hitSide(101, 95, 6, brick)).toBe('top');
  });
});

test('the paddle sends the ball wider from its edges and straight up from its middle', () => {
  const mid = paddleBounce(150, 100, 100, 300);
  expect(Math.abs(mid.vx)).toBeLessThan(1);
  expect(mid.vy).toBeLessThan(0);
  const edge = paddleBounce(200, 100, 100, 300);
  expect(edge.vx).toBeGreaterThan(200);
  expect(Math.hypot(edge.vx, edge.vy)).toBeCloseTo(300, 5);
});

test('speed climbs and is capped', () => {
  expect(speedFor(0, 0, 600)).toBeLessThan(speedFor(2, 10, 600));
  expect(speedFor(50, 100, 600)).toBe(600 * 1.3);
});
