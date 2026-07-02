// src/input/command-parser.ts
// Small command parser for terminal/dev usage. Tests can bypass this and call applyAction directly.

import type { Direction, PlayerAction, PlayerId, TileType } from '../core/types.js';

function parsePlayerId(value: string): PlayerId {
  const normalized = value.toUpperCase();
  if (normalized !== 'P1' && normalized !== 'P2') throw new Error(`Invalid player id: ${value}`);
  return normalized;
}

function parseDirection(value: string): Direction {
  const normalized = value.toUpperCase();
  if (!['N', 'E', 'S', 'W'].includes(normalized)) throw new Error(`Invalid direction: ${value}`);
  return normalized as Direction;
}

function parseCoord(x: string, y: string): { x: number; y: number } {
  return { x: Number.parseInt(x, 10), y: Number.parseInt(y, 10) };
}

function parseConnections(value: string): Direction[] {
  return value.split('').map(parseDirection);
}

export function parseCommand(input: string): PlayerAction {
  const parts = input.trim().split(/\s+/);
  const [command] = parts;

  if (command === 'place') {
    const [, actor = '', x = '', y = '', tileType = 'corridor', connections = ''] = parts;
    return {
      type: 'place_tile',
      actorId: parsePlayerId(actor),
      pos: parseCoord(x, y),
      tileType: tileType as Exclude<TileType, 'empty' | 'void' | 'flag'>,
      connections: parseConnections(connections),
    };
  }

  if (command === 'move') {
    const [, actor = '', pawnId = '', direction = ''] = parts;
    return {
      type: 'move_pawn',
      actorId: parsePlayerId(actor),
      pawnId,
      direction: parseDirection(direction),
    };
  }

  if (command === 'break') {
    const [, actor = '', x = '', y = ''] = parts;
    return { type: 'break_tile', actorId: parsePlayerId(actor), target: parseCoord(x, y) };
  }

  if (command === 'block') {
    const [, actor = '', x = '', y = ''] = parts;
    return { type: 'block_tile', actorId: parsePlayerId(actor), target: parseCoord(x, y) };
  }

  if (command === 'end') {
    const [, actor = ''] = parts;
    return { type: 'end_phase', actorId: parsePlayerId(actor) };
  }

  throw new Error(`Unknown command: ${input}`);
}
