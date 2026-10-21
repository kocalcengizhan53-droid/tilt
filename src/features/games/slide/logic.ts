/**
 * Slide, the arithmetic: a 4×4 board of tiles that slide and merge.
 *
 * Tiles have identities, not just values, so the screen can move a tile from where it was to
 * where it went rather than repainting a grid. A move returns the surviving tiles (including
 * the ones a merge created), and the tiles a merge consumed with their final positions, so
 * the screen can carry them to the merge point before they vanish.
 */

export const SIZE = 4;
export type Dir = 'up' | 'down' | 'left' | 'right';
export type Tile = { id: number; v: number; r: number; c: number };
export type Board = { tiles: Tile[]; nextId: number };

export type Move = {
  board: Board;
  /** Points scored by this move: the value of every tile a merge created. */
  gained: number;
  moved: boolean;
  /** Tiles consumed by merges, at the cell they slid to. */
  ghosts: Tile[];
  /** Ids of tiles created by merges this move. */
  born: number[];
};

export const emptyBoard = (): Board => ({ tiles: [], nextId: 1 });

/** A random number in [0, 1); injectable so the tests are deterministic. */
export type Rand = () => number;

export function spawn(board: Board, rand: Rand = Math.random): Board {
  const taken = new Set(board.tiles.map((t) => t.r * SIZE + t.c));
  const free: number[] = [];
  for (let i = 0; i < SIZE * SIZE; i++) if (!taken.has(i)) free.push(i);
  if (free.length === 0) return board;
  const cell = free[Math.floor(rand() * free.length)];
  const v = rand() < 0.9 ? 2 : 4;
  return {
    tiles: [...board.tiles, { id: board.nextId, v, r: Math.floor(cell / SIZE), c: cell % SIZE }],
    nextId: board.nextId + 1,
  };
}

export function move(board: Board, dir: Dir): Move {
  const vertical = dir === 'up' || dir === 'down';
  const reverse = dir === 'down' || dir === 'right';
  const survivors: Tile[] = [];
  const ghosts: Tile[] = [];
  const born: number[] = [];
  let gained = 0;
  let moved = false;
  let nextId = board.nextId;

  for (let line = 0; line < SIZE; line++) {
    // The tiles on this line, ordered from the edge they are sliding toward.
    const tiles = board.tiles
      .filter((t) => (vertical ? t.c : t.r) === line)
      .sort((a, b) => (vertical ? a.r - b.r : a.c - b.c));
    if (reverse) tiles.reverse();

    let slot = 0;
    const place = (slotIndex: number) => (reverse ? SIZE - 1 - slotIndex : slotIndex);
    const at = (t: Tile, s: number): Tile => (vertical ? { ...t, r: place(s) } : { ...t, c: place(s) });

    for (let i = 0; i < tiles.length; i++) {
      const a = tiles[i];
      const b = tiles[i + 1];
      if (b && a.v === b.v) {
        const r = vertical ? place(slot) : a.r;
        const c = vertical ? a.c : place(slot);
        const merged: Tile = { id: nextId++, v: a.v * 2, r, c };
        survivors.push(merged);
        born.push(merged.id);
        ghosts.push(at(a, slot), at(b, slot));
        gained += merged.v;
        moved = true;
        i += 1;
      } else {
        const placed = at(a, slot);
        if (placed.r !== a.r || placed.c !== a.c) moved = true;
        survivors.push(placed);
      }
      slot += 1;
    }
  }

  return { board: { tiles: survivors, nextId }, gained, moved, ghosts, born };
}

export function canMove(board: Board): boolean {
  if (board.tiles.length < SIZE * SIZE) return true;
  const grid = new Map(board.tiles.map((t) => [t.r * SIZE + t.c, t.v]));
  for (const t of board.tiles) {
    if (grid.get(t.r * SIZE + t.c + 1) === t.v && t.c < SIZE - 1) return true;
    if (grid.get((t.r + 1) * SIZE + t.c) === t.v && t.r < SIZE - 1) return true;
  }
  return false;
}

export const highest = (board: Board) => board.tiles.reduce((m, t) => Math.max(m, t.v), 0);
