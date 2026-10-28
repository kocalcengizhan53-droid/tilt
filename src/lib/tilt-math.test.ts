import { describe, expect, it } from '@jest/globals';

import { FULL_TILT, tiltStep } from '@/lib/tilt-math';

describe('cabinet tilt', () => {
  it('shows a lean from the way the phone is held, in −1…1', () => {
    const { tilt } = tiltStep(0.6 + FULL_TILT / 2, 0.6);
    expect(tilt).toBeGreaterThan(0.45);
    expect(tilt).toBeLessThanOrEqual(1);
    expect(tiltStep(0.6 - 5, 0.6).tilt).toBe(-1);
  });

  it('forgets a new way of holding it: the baseline follows and the tilt fades to nothing', () => {
    let baseline = 0;
    let tilt = 1;
    for (let frame = 0; frame < 600; frame++) ({ baseline, tilt } = tiltStep(0.5, baseline));
    expect(Math.abs(tilt)).toBeLessThan(0.01);
  });
});
