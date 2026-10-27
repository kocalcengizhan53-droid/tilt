import { describe, expect, it } from '@jest/globals';

import { addDays, lastDays, rulesFor, streak } from './daily';

describe('daily rules', () => {
  it('are the same for the same day on every call, and differ between days', () => {
    expect(rulesFor('2026-10-28')).toEqual(rulesFor('2026-10-28'));
    const week = lastDays('2026-10-28').map((d) => JSON.stringify(rulesFor(d)));
    expect(new Set(week).size).toBe(7);
  });

  it('stay inside playable bounds across a year', () => {
    for (let i = 0; i < 365; i++) {
      const r = rulesFor(addDays('2026-01-01', i));
      expect(r.widthFactor).toBeGreaterThanOrEqual(0.45);
      expect(r.widthFactor).toBeLessThanOrEqual(0.75);
      expect(r.speedFactor).toBeGreaterThanOrEqual(0.9);
      expect(r.speedFactor).toBeLessThanOrEqual(1.3);
      expect(r.hueOffset).toBeGreaterThanOrEqual(0);
      expect(r.hueOffset).toBeLessThan(360);
    }
  });
});

describe('calendar', () => {
  it('crosses month, year and clock-change boundaries one day at a time', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26'); // the last Sunday of October
    expect(lastDays('2026-03-02', 3)).toEqual(['2026-02-28', '2026-03-01', '2026-03-02']);
  });
});

describe('streak', () => {
  it('counts back from today, or from yesterday while today is unplayed, and stops at a gap', () => {
    const history = { '2026-10-25': 3, '2026-10-26': 9, '2026-10-27': 14 };
    expect(streak(history, '2026-10-27')).toBe(3);
    expect(streak(history, '2026-10-28')).toBe(3); // today still open
    expect(streak(history, '2026-10-29')).toBe(0); // yesterday missed
    expect(streak({ ...history, '2026-10-23': 1 }, '2026-10-27')).toBe(3);
  });
});
