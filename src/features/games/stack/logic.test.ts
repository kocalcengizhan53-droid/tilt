import { describe, expect, test } from '@jest/globals';

import { drop, hsl, points, speed } from './logic';

describe('drop', () => {
  const below = { x: 100, w: 200 };

  test('within tolerance is a perfect, and grows the block back toward the base width', () => {
    const d = drop(below, 104, 200, 260);
    expect(d.kind).toBe('perfect');
    if (d.kind === 'perfect') expect(d.block).toEqual({ x: 100, w: 208 });
  });

  test('never grows past the base width', () => {
    const d = drop({ x: 100, w: 260 }, 100, 260, 260);
    if (d.kind === 'perfect') expect(d.block.w).toBe(260);
  });

  test('overhang to the right is cut off and falls', () => {
    const d = drop(below, 150, 200, 260);
    expect(d.kind).toBe('cut');
    if (d.kind === 'cut') {
      expect(d.block).toEqual({ x: 150, w: 150 });
      expect(d.cut).toEqual({ x: 300, w: 50 });
    }
  });

  test('overhang to the left is cut off and falls', () => {
    const d = drop(below, 40, 200, 260);
    if (d.kind === 'cut') {
      expect(d.block).toEqual({ x: 100, w: 140 });
      expect(d.cut).toEqual({ x: 40, w: 60 });
    }
  });

  test('no overlap is a miss', () => {
    expect(drop(below, 300, 200, 260).kind).toBe('miss');
    expect(drop(below, -150, 200, 260).kind).toBe('miss');
  });

  test('a cut block sits exactly on the one below: the tower never floats', () => {
    let block = { x: 80, w: 220 };
    for (const x of [90, 70, 110, 60]) {
      const d = drop(block, x, block.w, 220);
      expect(d.kind).toBe('cut');
      if (d.kind === 'cut') {
        expect(d.block.x).toBeGreaterThanOrEqual(block.x);
        expect(d.block.x + d.block.w).toBeLessThanOrEqual(block.x + block.w);
        block = d.block;
      }
    }
  });
});

test('speed climbs with the tower and is capped', () => {
  expect(speed(0, 400)).toBeLessThan(speed(10, 400));
  expect(speed(200, 400)).toBe(speed(300, 400));
});

test('points reward a streak, up to a point', () => {
  expect(points(0)).toBe(1);
  expect(points(3)).toBe(4);
  expect(points(9)).toBe(6);
});

test('hsl produces six hex digits', () => {
  expect(hsl(190, 80, 60)).toMatch(/^#[0-9a-f]{6}$/);
  expect(hsl(0, 100, 50)).toBe('#ff0000');
});
