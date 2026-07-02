// src/core/board.ts
// Pure board helpers. No renderer or input code belongs here.

import { DIR_DELTA, OPPOSITE, type Coord, type Direction, type PlayerId, type Tile, type TileType } from './types.js';

export function createEmptyTile(x: number, y: number): Tile {
  return {
    pos: { x, y },
    type: 'empty',
    connections: [],
    bans: [],
  };
}

export function createBoard(size: number): Tile[][] {
  return Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => createEmptyTile(x, y)),
  );
}

export function cloneBoard(board: Tile[][]): Tile[][] {
  // JSON clone is intentional: board state must remain replay-safe and serializable.
  return JSON.parse(JSON.stringify(board)) as Tile[][];
}

export function inBounds(board: Tile[][], pos: Coord): boolean {
  return pos.y >= 0 && pos.y < board.length && pos.x >= 0 && pos.x < board[pos.y]!.length;
}

export function getTile(board: Tile[][], pos: Coord): Tile {
  if (!inBounds(board, pos)) {
    throw new Error(`Out of bounds tile lookup: ${pos.x},${pos.y}`);
  }
  return board[pos.y]![pos.x]!;
}

export function setTile(board: Tile[][], pos: Coord, tile: Tile): Tile[][] {
  const next = cloneBoard(board);
  next[pos.y]![pos.x] = tile;
  return next;
}

export function placeTile(
  board: Tile[][],
  pos: Coord,
  tileType: Exclude<TileType, 'empty' | 'void' | 'flag'>,
  ownerId: PlayerId,
  connections: Direction[],
): Tile[][] {
  const current = getTile(board, pos);
  if (current.type !== 'empty') {
    throw new Error(`Cannot place on non-empty tile: ${pos.x},${pos.y}`);
  }

  return setTile(board, pos, {
    pos,
    type: tileType,
    ownerId,
    connections: [...connections],
    bans: [],
  });
}

export function destroyTile(board: Tile[][], pos: Coord): Tile[][] {
  const current = getTile(board, pos);
  return setTile(board, pos, {
    pos,
    type: 'void',
    // Preserve temporal bans so destruction remains auditable in replay logs.
    bans: [...current.bans],
    connections: [],
  });
}

export function blockTile(board: Tile[][], pos: Coord, untilTurn: number): Tile[][] {
  const current = getTile(board, pos);
  return setTile(board, pos, {
    ...current,
    type: 'blocked',
    blockedUntilTurn: untilTurn,
    connections: [],
  });
}

export function addTileBan(board: Tile[][], pos: Coord, playerId: PlayerId, untilTurn: number): Tile[][] {
  const current = getTile(board, pos);
  return setTile(board, pos, {
    ...current,
    bans: [...current.bans, { playerId, untilTurn, reason: 'break' }],
  });
}

export function neighbor(pos: Coord, direction: Direction): Coord {
  const delta = DIR_DELTA[direction];
  return { x: pos.x + delta.x, y: pos.y + delta.y };
}

export function isEdge(board: Tile[][], pos: Coord): boolean {
  const max = board.length - 1;
  return pos.x === 0 || pos.y === 0 || pos.x === max || pos.y === max;
}

export function isWalkableTile(tile: Tile, playerId: PlayerId, turn: number): boolean {
  if (tile.type === 'empty' || tile.type === 'void' || tile.type === 'blocked') return false;
  if (tile.blockedUntilTurn !== undefined && tile.blockedUntilTurn >= turn) return false;
  return !tile.bans.some((ban) => ban.playerId === playerId && ban.untilTurn >= turn);
}

export function tilesConnect(a: Tile, b: Tile, directionFromA: Direction): boolean {
  return a.connections.includes(directionFromA) && b.connections.includes(OPPOSITE[directionFromA]);
}
