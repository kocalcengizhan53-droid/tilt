import { describe, expect, test } from '@jest/globals';

import { canMove, emptyBoard, move, spawn, type Board, type Tile } from './logic';

const board = (cells: (number | 0)[][]): Board => {
  const tiles: Tile[] = [];
  let id = 1;
  cells.forEach((row, r) => row.forEach((v, c) => v && tiles.push({ id: id++, v, r, c })));
  return { tiles, nextId: id };
};
const grid = (b: Board) => {
  const g = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
  for (const t of b.tiles) g[t.r][t.c] = t.v;
  return g;
};

describe('move', () => {
  test('slides and merges once per pair, toward the edge', () => {
    const m = move(board([[2, 2, 4, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]), 'left');
    expect(grid(m.board)[0]).toEqual([4, 4, 0, 0]);
    expect(m.gained).toBe(4);
    expect(m.moved).toBe(true);
  });

  test('a new tile does not merge again in the same move', () => {
    const m = move(board([[2, 2, 2, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]), 'right');
    expect(grid(m.board)[0]).toEqual([0, 0, 4, 4]);
    expect(m.gained).toBe(8);
  });

  test('works in every direction', () => {
    const b = board([[2, 0, 0, 0], [2, 0, 0, 0], [4, 0, 0, 0], [4, 0, 0, 0]]);
    expect(grid(move(b, 'up').board).map((r) => r[0])).toEqual([4, 8, 0, 0]);
    expect(grid(move(b, 'down').board).map((r) => r[0])).toEqual([0, 0, 4, 8]);
  });

  test('reports nothing moved when nothing can', () => {
    const m = move(board([[2, 4, 8, 16], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]), 'left');
    expect(m.moved).toBe(false);
    expect(m.gained).toBe(0);
  });

  test('keeps identities: a tile that slides is the same tile; a merge births a new one and ghosts the two', () => {
    const b = board([[0, 2, 0, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
    const m = move(b, 'left');
    expect(m.born).toHaveLength(1);
    expect(m.ghosts.map((g) => g.c)).toEqual([0, 0]);
    const b2 = board([[0, 0, 0, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
    const m2 = move(b2, 'left');
    expect(m2.board.tiles[0].id).toBe(b2.tiles[0].id);
    expect(m2.board.tiles[0].c).toBe(0);
  });

  test('tile count never exceeds sixteen and values are powers of two', () => {
    let b = spawn(spawn(emptyBoard(), () => 0.5), () => 0.1);
    let rand = 7;
    const next = () => ((rand = (rand * 48271) % 2147483647) / 2147483647);
    for (let i = 0; i < 300; i++) {
      const dir = (['up', 'down', 'left', 'right'] as const)[Math.floor(next() * 4)];
      const m = move(b, dir);
      b = m.moved ? spawn(m.board, next) : b;
      expect(b.tiles.length).toBeLessThanOrEqual(16);
      for (const t of b.tiles) expect(Math.log2(t.v) % 1).toBe(0);
      if (!canMove(b)) break;
    }
  });
});

test('canMove is false only on a full board with no equal neighbours', () => {
  expect(canMove(board([[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2]]))).toBe(false);
  expect(canMove(board([[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 4]]))).toBe(true);
  expect(canMove(board([[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 0]]))).toBe(true);
});

test('spawn fills a free cell with a 2 or a 4', () => {
  const b = spawn(emptyBoard(), () => 0.95);
  expect(b.tiles).toHaveLength(1);
  expect([2, 4]).toContain(b.tiles[0].v);
});
