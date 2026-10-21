import { expect, test } from '@jest/globals';

import { check, extend, litFor } from './logic';

test('extend adds exactly one pad in range', () => {
  const s = extend([], () => 0.99);
  expect(s).toEqual([3]);
  expect(extend(s, () => 0)).toEqual([3, 0]);
});

test('check tells a partial answer from a wrong one from a complete one', () => {
  const seq = [0, 2, 1];
  expect(check(seq, [])).toBe('partial');
  expect(check(seq, [0, 2])).toBe('partial');
  expect(check(seq, [0, 2, 1])).toBe('complete');
  expect(check(seq, [0, 1])).toBe('wrong');
  expect(check(seq, [1])).toBe('wrong');
});

test('playback gets brisker and never below the floor', () => {
  expect(litFor(1)).toBeGreaterThan(litFor(5));
  expect(litFor(40)).toBe(220);
});
