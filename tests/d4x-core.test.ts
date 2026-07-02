// tests/d4x-core.test.ts
// First-pass safety net for deterministic board, path, action, and extraction behavior.

import { describe, expect, it } from 'vitest';
import { applyAction, applyActions } from '../src/actions/special-actions.js';
import { getTile, placeTile } from '../src/core/board.js';
import { createInitialState } from '../src/core/state.js';
import type { PlayerAction } from '../src/core/types.js';

const straightPath: PlayerAction[] = [
  { type: 'place_tile', actorId: 'P1', pos: { x: 0, y: 0 }, tileType: 'corridor', connections: ['E'] },
  { type: 'place_tile', actorId: 'P1', pos: { x: 1, y: 0 }, tileType: 'corridor', connections: ['W', 'E'] },
  { type: 'place_tile', actorId: 'P1', pos: { x: 2, y: 0 }, tileType: 'corridor', connections: ['W', 'E'] },
  { type: 'place_tile', actorId: 'P1', pos: { x: 3, y: 0 }, tileType: 'corridor', connections: ['W'] },
];

describe('D4X core scaffold', () => {
  it('creates supported board sizes with matching party sizes', () => {
    const state4 = createInitialState('seed-a', 4);
    const state8 = createInitialState('seed-b', 8);

    expect(state4.board).toHaveLength(4);
    expect(state4.overlords.P1.party).toHaveLength(1);
    expect(state8.board).toHaveLength(8);
    expect(state8.overlords.P1.party).toHaveLength(2);
  });

  it('locks a Golden Path when a connected edge-to-edge route reaches the path length', () => {
    const state = applyActions(createInitialState('path-seed', 4), straightPath);

    expect(state.path.status).toBe('locked');
    expect(state.path.path).toHaveLength(4);
    expect(state.path.flagPos).toEqual({ x: 3, y: 0 });
  });

  it('moves a pawn along connected cardinal tiles and wins by extraction', () => {
    const movement: PlayerAction[] = [
      ...straightPath,
      { type: 'move_pawn', actorId: 'P1', pawnId: 'P1-pawn-1', direction: 'E' },
      { type: 'move_pawn', actorId: 'P1', pawnId: 'P1-pawn-1', direction: 'E' },
      { type: 'move_pawn', actorId: 'P1', pawnId: 'P1-pawn-1', direction: 'E' },
    ];

    const state = applyActions(createInitialState('extract-seed', 4), movement);

    expect(state.winner).toEqual({ playerId: 'P1', reason: 'extraction' });
    expect(state.mode).toBe('game-over');
    expect(state.overlords.P1.party[0]?.extracted).toBe(true);
  });

  it('consumes a Break charge and destroys an enemy-owned tile', () => {
    const initial = createInitialState('break-seed', 4);
    initial.board = placeTile(initial.board, { x: 1, y: 1 }, 'corridor', 'P2', ['N', 'S']);

    const state = applyAction(initial, { type: 'break_tile', actorId: 'P1', target: { x: 1, y: 1 } });

    expect(state.overlords.P1.breaksAvailable).toBe(1);
    expect(getTile(state.board, { x: 1, y: 1 }).type).toBe('void');
  });

  it('keeps replay deterministic for the same seed and action list', () => {
    const a = applyActions(createInitialState('same-seed', 4), straightPath);
    const b = applyActions(createInitialState('same-seed', 4), straightPath);

    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
