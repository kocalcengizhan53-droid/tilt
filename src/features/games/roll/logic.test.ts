import { describe, expect, it } from '@jest/globals';

import { BALL_R, HOLE_R, fallsIn, holesFor, levelled, place, pull, random, roll, tiltFromGravity, toward, touches } from './logic';

describe('roll', () => {
  it('rolls the marble down the screen when the phone is held upright, on both platforms', () => {
    // iOS: the earth is toward the bottom of the device, −y in its frame.
    const ios = tiltFromGravity(0, -9.81, false);
    expect([ios.x + 0, ios.y]).toEqual([0, 1]);
    // Android: the reading is the force holding the phone up, +y.
    const android = tiltFromGravity(0, 9.81, true);
    expect([android.x + 0, android.y]).toEqual([0, 1]);
    // The right edge dipped: the marble goes right.
    expect(tiltFromGravity(4.9, 0, false).x).toBeCloseTo(0.5, 2);
    expect(tiltFromGravity(-4.9, 0, true).x).toBeCloseTo(0.5, 2);
  });

  it('keeps the marble on the board and takes speed off it at the rim', () => {
    const b = { x: 100, y: 100, vx: 2000, vy: 0 };
    let knock = 0;
    for (let i = 0; i < 30; i++) knock = Math.max(knock, roll(b, 0, 0, 1 / 60, 200, 300));
    expect(b.x).toBeLessThanOrEqual(200 - BALL_R);
    expect(b.x).toBeGreaterThanOrEqual(BALL_R);
    expect(knock).toBeGreaterThan(500);
    expect(Math.abs(b.vx)).toBeLessThan(2000);
  });

  it('comes to rest on a level board', () => {
    const b = { x: 100, y: 100, vx: 300, vy: -200 };
    for (let i = 0; i < 600; i++) roll(b, 0, 0, 1 / 60, 400, 400);
    expect(Math.hypot(b.vx, b.vy)).toBeLessThan(1);
  });

  it('pulls toward a hole only from close by, and harder nearer the rim', () => {
    const hole = { x: 0, y: 0 };
    expect(pull({ x: HOLE_R * 3, y: 0 }, hole)).toEqual({ x: 0, y: 0 });
    const far = pull({ x: HOLE_R * 2, y: 0 }, hole);
    const near = pull({ x: HOLE_R * 1.2, y: 0 }, hole);
    expect(far.x).toBeLessThan(0);
    expect(Math.abs(near.x)).toBeGreaterThan(Math.abs(far.x));
  });

  it('tips in only past the lip, and catches a light on contact', () => {
    expect(fallsIn({ x: HOLE_R - BALL_R, y: 0 }, { x: 0, y: 0 })).toBe(true);
    expect(fallsIn({ x: HOLE_R, y: 0 }, { x: 0, y: 0 })).toBe(false);
    expect(touches({ x: 20, y: 0 }, { x: 0, y: 0 })).toBe(true);
    expect(touches({ x: 40, y: 0 }, { x: 0, y: 0 })).toBe(false);
  });

  it('adds holes as the lights mount, and stops at seven', () => {
    expect([0, 1, 2, 5, 14, 40].map(holesFor)).toEqual([0, 0, 1, 2, 7, 7]);
  });

  it('places lights clear of the marble and the holes, the same way for the same seed', () => {
    const avoid = [
      { x: 100, y: 100 },
      { x: 200, y: 300 },
    ];
    const a = place(random(7), 320, 480, avoid, 80);
    const b = place(random(7), 320, 480, avoid, 80);
    expect(a).toEqual(b);
    for (const q of avoid) expect(Math.hypot(a.x - q.x, a.y - q.y)).toBeGreaterThanOrEqual(80);
  });
});

describe('levelling', () => {
  it('treats the way the phone was held at the start as level', () => {
    const rest = tiltFromGravity(0, -6.3, false); // held back at a reading angle
    expect(levelled(rest, rest)).toEqual({ x: 0, y: 0 });
    const tipped = levelled(tiltFromGravity(0, -9.0, false), rest);
    expect(tipped.y).toBeGreaterThan(0.3);
  });

  it('steers toward the finger, harder further away', () => {
    expect(toward({ x: 240, y: 100 }, { x: 100, y: 100 })).toEqual({ x: 1, y: 0 });
    expect(toward({ x: 135, y: 100 }, { x: 100, y: 100 }).x).toBeCloseTo(0.25, 2);
  });
});
