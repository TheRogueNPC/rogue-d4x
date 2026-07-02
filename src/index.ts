// src/index.ts
// Tiny smoke-test entrypoint: creates a 4x4 D4X board, places a path, and renders it.

import { applyActions } from './actions/special-actions.js';
import { createInitialState } from './core/state.js';
import { renderTerminal } from './render/terminal-renderer.js';
import type { PlayerAction } from './core/types.js';

const demoActions: PlayerAction[] = [
  { type: 'place_tile', actorId: 'P1', pos: { x: 0, y: 0 }, tileType: 'corridor', connections: ['E'] },
  { type: 'place_tile', actorId: 'P1', pos: { x: 1, y: 0 }, tileType: 'corridor', connections: ['W', 'E'] },
  { type: 'place_tile', actorId: 'P1', pos: { x: 2, y: 0 }, tileType: 'corridor', connections: ['W', 'E'] },
  { type: 'place_tile', actorId: 'P1', pos: { x: 3, y: 0 }, tileType: 'corridor', connections: ['W'] },
];

const state = applyActions(createInitialState('demo-seed', 4), demoActions);
console.log(renderTerminal(state));
