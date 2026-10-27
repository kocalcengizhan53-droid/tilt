/**
 * The daily tower: one Stack run a day, the same for everyone on that day. The date seeds the
 * rules — how wide the tower starts, how fast the block slides, which side it enters from, the
 * colour it is lit in — so there is nothing to download and nothing to cheat with a server.
 */

export type DailyRules = {
  /** Starting width as a share of the screen (an ordinary run is 0.62). */
  readonly widthFactor: number;
  /** Multiplier on the slider's speed. */
  readonly speedFactor: number;
  readonly startLeft: boolean;
  /** Degrees added to the tower's hue. */
  readonly hueOffset: number;
};

/** The local calendar day, YYYY-MM-DD: a day starts at the player's midnight, not UTC's. */
export function dayKey(date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** A day before or after, by calendar arithmetic in UTC so a clock change cannot skip one. */
export function addDays(day: string, delta: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + delta));
  return t.toISOString().slice(0, 10);
}

function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/** mulberry32: small, fast, and the same sequence on every device for the same seed. */
function random(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (n: number) => Math.round(n * 100) / 100;

export function rulesFor(day: string): DailyRules {
  const r = random(hash(`tilt:daily:${day}`));
  return {
    widthFactor: round(0.45 + r() * 0.3),
    speedFactor: round(0.9 + r() * 0.4),
    startLeft: r() < 0.5,
    hueOffset: Math.floor(r() * 360),
  };
}

/** Consecutive days played, ending today — or yesterday, while today is still open. */
export function streak(history: Readonly<Record<string, number>>, today: string): number {
  let day = today in history ? today : addDays(today, -1);
  let count = 0;
  while (day in history) {
    count++;
    day = addDays(day, -1);
  }
  return count;
}

/** The last `n` days, oldest first, ending today. */
export function lastDays(today: string, n = 7): string[] {
  return Array.from({ length: n }, (_, i) => addDays(today, i - (n - 1)));
}
