// src/core/state.ts
// Creates the canonical D4X state object used by tests, renderers, AIs, and future replays.

import { createBoard } from './board.js';
import type { GameConfig, GameEvent, GameState, Overlord, Pawn, PlayerId } from './types.js';

export function partySizeForBoard(boardSize: GameConfig['boardSize']): GameConfig['partySize'] {
  if (boardSize === 4) return 1;
  if (boardSize === 8) return 2;
  if (boardSize === 12) return 3;
  return 4;
}

export function createGameConfig(boardSize: GameConfig['boardSize'] = 4): GameConfig {
  return {
    boardSize,
    partySize: partySizeForBoard(boardSize),
    // First playable target: short path on 4x4, scales upward later through scenarios.
    goldenPathLength: Math.max(4, boardSize),
    attritionWipeLimit: 3,
  };
}

function createPawn(ownerId: PlayerId, index: number, boardSize: number): Pawn {
  const isP1 = ownerId === 'P1';
  return {
    id: `${ownerId}-pawn-${index + 1}`,
    ownerId,
    pos: isP1 ? { x: 0, y: index } : { x: boardSize - 1, y: boardSize - 1 - index },
    hp: 3,
    atk: 1,
    gear: [],
    alive: true,
    extracted: false,
  };
}

function createOverlord(id: PlayerId, partySize: number, boardSize: number): Overlord {
  return {
    id,
    name: id === 'P1' ? 'Overlord One' : 'Overlord Two',
    party: Array.from({ length: partySize }, (_, index) => createPawn(id, index, boardSize)),
    breaksAvailable: 2,
    breakCooldownUntil: 0,
    blocksAvailable: 1,
    swapsUsed: 0,
    swapCooldownUntil: 0,
    flipUsed: false,
    wipes: 0,
  };
}

export function createEvent(turn: number, message: string, type = 'GAME_CREATED', actorId?: PlayerId): GameEvent {
  const event: GameEvent = { type, turn, message };
  if (actorId) event.actorId = actorId;
  return event;
}

export function createInitialState(seed = 'd4x-alpha', boardSize: GameConfig['boardSize'] = 4): GameState {
  const config = createGameConfig(boardSize);
  return {
    version: 1,
    seed,
    turn: 1,
    currentPlayerId: 'P1',
    mode: 'dungeon',
    config,
    board: createBoard(config.boardSize),
    overlords: {
      P1: createOverlord('P1', config.partySize, config.boardSize),
      P2: createOverlord('P2', config.partySize, config.boardSize),
    },
    path: {
      status: 'none',
      path: [],
      flagPos: null,
    },
    events: [createEvent(1, `Game created with seed ${seed}`)],
    winner: null,
  };
}

export function cloneState(state: GameState): GameState {
  // JSON clone keeps the state honest: no hidden functions, class instances, or renderer references.
  return JSON.parse(JSON.stringify(state)) as GameState;
}
