// src/actions/special-actions.ts
// Reducer-style action handling. All player intent enters the simulation through applyAction().

import {
  addTileBan,
  blockTile,
  destroyTile,
  getTile,
  inBounds,
  isWalkableTile,
  neighbor,
  placeTile,
  tilesConnect,
} from '../core/board.js';
import { cloneState, createEvent } from '../core/state.js';
import { evaluateGoldenPath } from '../pathing/pipe-router.js';
import type { GameEvent, GameState, Pawn, PlayerAction, PlayerId } from '../core/types.js';

function opponentOf(playerId: PlayerId): PlayerId {
  return playerId === 'P1' ? 'P2' : 'P1';
}

function reject(state: GameState, action: PlayerAction, message: string): GameState {
  const next = cloneState(state);
  next.events.push(createEvent(next.turn, message, 'ACTION_REJECTED', action.actorId));
  return next;
}

function withEvent(state: GameState, event: GameEvent): GameState {
  return { ...state, events: [...state.events, event] };
}

function recomputePath(state: GameState): GameState {
  const path = evaluateGoldenPath(state);
  const next: GameState = { ...state, path };
  const wasLocked = state.path.status === 'locked';
  if (!wasLocked && path.status === 'locked') {
    return withEvent(next, createEvent(next.turn, 'Golden Path locked. The dungeon shifts into extraction pressure.', 'GOLDEN_PATH_LOCKED'));
  }
  return next;
}

function findPawn(state: GameState, actorId: PlayerId, pawnId: string): Pawn | null {
  return state.overlords[actorId].party.find((pawn) => pawn.id === pawnId) ?? null;
}

function markPawnMoved(state: GameState, actorId: PlayerId, pawnId: string, update: (pawn: Pawn) => Pawn): GameState {
  const next = cloneState(state);
  next.overlords[actorId].party = next.overlords[actorId].party.map((pawn) =>
    pawn.id === pawnId ? update(pawn) : pawn,
  );
  return next;
}

function checkExtraction(state: GameState, actorId: PlayerId, pawnId: string): GameState {
  const flag = state.path.flagPos;
  if (!flag) return state;

  const pawn = findPawn(state, actorId, pawnId);
  if (!pawn || pawn.extracted || pawn.pos.x !== flag.x || pawn.pos.y !== flag.y) return state;

  let next = markPawnMoved(state, actorId, pawnId, (p) => ({ ...p, extracted: true }));
  next = withEvent(next, createEvent(next.turn, `${pawn.id} extracted through the Flag.`, 'PAWN_EXTRACTED', actorId));

  if (next.overlords[actorId].party.every((p) => p.extracted)) {
    next.winner = { playerId: actorId, reason: 'extraction' };
    next.mode = 'game-over';
    next = withEvent(next, createEvent(next.turn, `${actorId} wins by extraction.`, 'GAME_OVER', actorId));
  }

  return next;
}

function applyPlaceTile(state: GameState, action: Extract<PlayerAction, { type: 'place_tile' }>): GameState {
  try {
    const next = cloneState(state);
    next.board = placeTile(next.board, action.pos, action.tileType, action.actorId, action.connections);
    next.events.push(createEvent(next.turn, `${action.actorId} placed ${action.tileType} at ${action.pos.x},${action.pos.y}.`, 'TILE_PLACED', action.actorId));
    return recomputePath(next);
  } catch (error) {
    return reject(state, action, String(error instanceof Error ? error.message : error));
  }
}

function applyBreakTile(state: GameState, action: Extract<PlayerAction, { type: 'break_tile' }>): GameState {
  if (!inBounds(state.board, action.target)) return reject(state, action, 'Break target is out of bounds.');

  const tile = getTile(state.board, action.target);
  if (!tile.ownerId || tile.ownerId === action.actorId || tile.type === 'empty' || tile.type === 'void') {
    return reject(state, action, 'Break requires an enemy-owned non-empty tile.');
  }

  const actor = state.overlords[action.actorId];
  if (actor.breaksAvailable <= 0 || actor.breakCooldownUntil > state.turn) {
    return reject(state, action, `${action.actorId} cannot Break yet.`);
  }

  const next = cloneState(state);
  next.overlords[action.actorId].breaksAvailable -= 1;
  next.overlords[action.actorId].breakCooldownUntil = next.turn + 2;
  next.board = destroyTile(next.board, action.target);
  next.board = addTileBan(next.board, action.target, tile.ownerId, next.turn + 2);
  next.events.push(createEvent(next.turn, `${action.actorId} broke ${tile.ownerId}'s tile at ${action.target.x},${action.target.y}.`, 'TILE_DESTROYED', action.actorId));
  return recomputePath(next);
}

function applyBlockTile(state: GameState, action: Extract<PlayerAction, { type: 'block_tile' }>): GameState {
  if (!inBounds(state.board, action.target)) return reject(state, action, 'Block target is out of bounds.');

  const actor = state.overlords[action.actorId];
  if (actor.blocksAvailable <= 0) return reject(state, action, `${action.actorId} has no Blocks available.`);

  const next = cloneState(state);
  next.overlords[action.actorId].blocksAvailable -= 1;
  next.board = blockTile(next.board, action.target, next.turn + 1);
  next.events.push(createEvent(next.turn, `${action.actorId} blocked ${action.target.x},${action.target.y} for one turn.`, 'TILE_BLOCKED', action.actorId));
  return recomputePath(next);
}

function applyMovePawn(state: GameState, action: Extract<PlayerAction, { type: 'move_pawn' }>): GameState {
  const pawn = findPawn(state, action.actorId, action.pawnId);
  if (!pawn || !pawn.alive || pawn.extracted) return reject(state, action, 'Pawn is not available to move.');
  if (pawn.stunnedUntilTurn !== undefined && pawn.stunnedUntilTurn >= state.turn) return reject(state, action, 'Pawn is stunned.');

  const fromTile = getTile(state.board, pawn.pos);
  const to = neighbor(pawn.pos, action.direction);
  if (!inBounds(state.board, to)) return reject(state, action, 'Pawn cannot move out of bounds.');

  const toTile = getTile(state.board, to);
  if (!isWalkableTile(toTile, action.actorId, state.turn)) return reject(state, action, 'Target tile is not walkable.');
  if (!tilesConnect(fromTile, toTile, action.direction)) return reject(state, action, 'Tiles do not connect in that direction.');

  let next = markPawnMoved(state, action.actorId, action.pawnId, (p) => ({ ...p, pos: to }));
  next = withEvent(next, createEvent(next.turn, `${action.pawnId} moved ${action.direction}.`, 'PAWN_MOVED', action.actorId));
  return checkExtraction(next, action.actorId, action.pawnId);
}

function applyEndPhase(state: GameState, action: Extract<PlayerAction, { type: 'end_phase' }>): GameState {
  if (action.actorId !== state.currentPlayerId) return reject(state, action, 'Only the active player can end the phase.');

  const next = cloneState(state);
  if (next.currentPlayerId === 'P1') {
    next.currentPlayerId = 'P2';
  } else {
    next.currentPlayerId = 'P1';
    next.turn += 1;
    // First pass cooldown economy: Break slowly refills, matching the spec baseline.
    for (const playerId of ['P1', 'P2'] as const) {
      if (next.turn % 4 === 0) {
        next.overlords[playerId].breaksAvailable = Math.min(2, next.overlords[playerId].breaksAvailable + 1);
      }
    }
  }
  next.events.push(createEvent(next.turn, `Phase passed to ${next.currentPlayerId}.`, 'TURN_ADVANCED', next.currentPlayerId));
  return recomputePath(next);
}

export function applyAction(state: GameState, action: PlayerAction): GameState {
  if (state.mode === 'game-over') return reject(state, action, 'Game is already over.');
  if (action.actorId !== state.currentPlayerId) return reject(state, action, `${action.actorId} is not the active player.`);

  switch (action.type) {
    case 'place_tile':
      return applyPlaceTile(state, action);
    case 'break_tile':
      return applyBreakTile(state, action);
    case 'block_tile':
      return applyBlockTile(state, action);
    case 'move_pawn':
      return applyMovePawn(state, action);
    case 'end_phase':
      return applyEndPhase(state, action);
    default:
      return reject(state, action, 'Unsupported action.');
  }
}

export function applyActions(initial: GameState, actions: PlayerAction[]): GameState {
  return actions.reduce((state, action) => applyAction(state, action), initial);
}

export { opponentOf };
