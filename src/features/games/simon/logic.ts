/**
 * Simon, the arithmetic: a sequence that grows by one, and a comparison with what was played.
 */

export const PADS = 4;

export type Rand = () => number;

/** One more pad on the end. */
export function extend(sequence: readonly number[], rand: Rand = Math.random): number[] {
  return [...sequence, Math.floor(rand() * PADS)];
}

/** How a partial answer compares with the sequence so far. */
export function check(sequence: readonly number[], answer: readonly number[]): 'wrong' | 'partial' | 'complete' {
  for (let i = 0; i < answer.length; i++) {
    if (answer[i] !== sequence[i]) return 'wrong';
  }
  return answer.length === sequence.length ? 'complete' : 'partial';
}

/** Milliseconds each pad is lit during playback: brisker as the rounds mount. */
export function litFor(round: number): number {
  return Math.max(220, 520 - round * 22);
}
