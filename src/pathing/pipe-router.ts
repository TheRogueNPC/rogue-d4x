// src/pathing/pipe-router.ts
// Dedicated Golden Path subsystem. Terrain mutation should re-run this, not hide path checks in actions.

import { getTile, inBounds, isEdge, isWalkableTile, neighbor, tilesConnect } from '../core/board.js';
import { DIR_DELTA, type Coord, type GameState, type PathState, type Tile } from '../core/types.js';

function coordKey(pos: Coord): string {
  return `${pos.x},${pos.y}`;
}

function allTiles(board: Tile[][]): Tile[] {
  return board.flat();
}

function isDifferentEdge(board: Tile[][], start: Coord, end: Coord): boolean {
  const max = board.length - 1;
  if (!isEdge(board, start) || !isEdge(board, end)) return false;
  if (start.x === 0 && end.x === max) return true;
  if (start.x === max && end.x === 0) return true;
  if (start.y === 0 && end.y === max) return true;
  if (start.y === max && end.y === 0) return true;
  return false;
}

export function findConnectedPath(state: GameState): Coord[] {
  const { board, turn, config } = state;
  const starts = allTiles(board).filter((tile) => isEdge(board, tile.pos) && isWalkableTile(tile, state.currentPlayerId, turn));

  for (const start of starts) {
    const queue: Coord[][] = [[start.pos]];
    const visited = new Set<string>([coordKey(start.pos)]);

    while (queue.length > 0) {
      const path = queue.shift()!;
      const currentPos = path[path.length - 1]!;
      const currentTile = getTile(board, currentPos);

      if (path.length >= config.goldenPathLength && isDifferentEdge(board, start.pos, currentPos)) {
        return path;
      }

      for (const direction of Object.keys(DIR_DELTA) as Array<keyof typeof DIR_DELTA>) {
        const nextPos = neighbor(currentPos, direction);
        if (!inBounds(board, nextPos)) continue;

        const nextTile = getTile(board, nextPos);
        const key = coordKey(nextPos);
        if (visited.has(key)) continue;
        if (!isWalkableTile(nextTile, state.currentPlayerId, turn)) continue;
        if (!tilesConnect(currentTile, nextTile, direction)) continue;

        visited.add(key);
        queue.push([...path, nextPos]);
      }
    }
  }

  return [];
}

export function evaluateGoldenPath(state: GameState): PathState {
  const existing = state.path.status === 'locked' ? state.path : null;
  if (existing?.path.length) {
    const stillValid = existing.path.every((pos, index, path) => {
      const tile = getTile(state.board, pos);
      if (!isWalkableTile(tile, state.currentPlayerId, state.turn)) return false;
      const next = path[index + 1];
      if (!next) return true;
      const nextTile = getTile(state.board, next);
      const dx = next.x - pos.x;
      const dy = next.y - pos.y;
      const direction = dx === 1 ? 'E' : dx === -1 ? 'W' : dy === 1 ? 'S' : 'N';
      return tilesConnect(tile, nextTile, direction);
    });

    if (stillValid) return existing;
  }

  const path = findConnectedPath(state);
  if (path.length === 0) {
    return { status: 'none', path: [], flagPos: null };
  }

  return {
    status: 'locked',
    path,
    flagPos: path[path.length - 1] ?? null,
  };
}
