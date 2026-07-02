// src/game-loop.ts
// Small deterministic runner around the existing D4X reducer so CLI/dev/tests can exercise a full round.

import { applyAction } from './actions/special-actions.js';
import { createInitialState } from './core/state.js';
import type { GameState, PlayerAction } from './core/types.js';
import { renderTerminal } from './render/terminal-renderer.js';

export interface GameLoopFrame {
  step: number;
  state: GameState;
  output: string;
  action?: PlayerAction;
}

export interface GameLoopResult {
  seed: string;
  frames: GameLoopFrame[];
  finalState: GameState;
}

export const DUMMY_ROUND_ACTIONS: PlayerAction[] = [
  // P1 lays the first Golden Path across the 4x4 board.
  { type: 'place_tile', actorId: 'P1', pos: { x: 0, y: 0 }, tileType: 'corridor', connections: ['E'] },
  { type: 'place_tile', actorId: 'P1', pos: { x: 1, y: 0 }, tileType: 'corridor', connections: ['W', 'E'] },
  { type: 'place_tile', actorId: 'P1', pos: { x: 2, y: 0 }, tileType: 'corridor', connections: ['W', 'E'] },
  { type: 'place_tile', actorId: 'P1', pos: { x: 3, y: 0 }, tileType: 'corridor', connections: ['W'] },
  // Then the pawn runs the route and extracts at the flag.
  { type: 'move_pawn', actorId: 'P1', pawnId: 'P1-pawn-1', direction: 'E' },
  { type: 'move_pawn', actorId: 'P1', pawnId: 'P1-pawn-1', direction: 'E' },
  { type: 'move_pawn', actorId: 'P1', pawnId: 'P1-pawn-1', direction: 'E' },
];

export function runGameLoop(actions: PlayerAction[] = DUMMY_ROUND_ACTIONS, seed = 'd4x-loop-demo'): GameLoopResult {
  let state = createInitialState(seed, 4);
  const frames: GameLoopFrame[] = [
    {
      step: 0,
      state,
      output: renderTerminal(state),
    },
  ];

  for (const [index, action] of actions.entries()) {
    state = applyAction(state, action);
    frames.push({
      step: index + 1,
      action,
      state,
      output: renderTerminal(state),
    });

    if (state.mode === 'game-over') break;
  }

  return {
    seed,
    frames,
    finalState: state,
  };
}

export function runDummyRound(seed = 'd4x-loop-demo'): GameLoopResult {
  return runGameLoop([...DUMMY_ROUND_ACTIONS], seed);
}

export function formatLoopFrames(result: GameLoopResult): string {
  return result.frames
    .map((frame) => {
      const header = frame.action ? `#${frame.step} ${frame.action.type}` : `#${frame.step} initial`;
      return `${header}\n${frame.output}`;
    })
    .join('\n\n');
}
