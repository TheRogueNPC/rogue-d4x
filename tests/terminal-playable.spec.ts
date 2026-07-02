// tests/terminal-playable.spec.ts
// Safety net for the real terminal control layer so dev mode stays playable.

import { describe, expect, it } from 'vitest';
import { getTile } from '../src/core/board.js';
import { createInitialState } from '../src/core/state.js';
import {
  applyTerminalCommand,
  commandFromKey,
  createTerminalMoveActions,
  renderPlayableTerminal,
} from '../src/terminal/playable-terminal.js';

describe('playable terminal controls', () => {
  it('maps WASD and arrow key input to terminal commands', () => {
    expect(commandFromKey('w')).toBe('move_north');
    expect(commandFromKey('d')).toBe('move_east');
    expect(commandFromKey('\u001b[B')).toBe('move_south');
    expect(commandFromKey('\u001b[D')).toBe('move_west');
    expect(commandFromKey('r')).toBe('reset');
    expect(commandFromKey('q')).toBe('quit');
  });

  it('creates auto-build move actions from the empty starting tile', () => {
    const state = createInitialState('terminal-actions', 4);
    const actions = createTerminalMoveActions(state, 'E');

    expect(actions.map((action) => action.type)).toEqual(['place_tile', 'place_tile', 'move_pawn']);
    expect(actions[0]).toMatchObject({ pos: { x: 0, y: 0 }, tileType: 'corridor' });
    expect(actions[1]).toMatchObject({ pos: { x: 1, y: 0 }, tileType: 'corridor' });
  });

  it('moves east by placing playable corridor tiles first', () => {
    const state = createInitialState('terminal-move', 4);
    const result = applyTerminalCommand(state, 'move_east');

    expect(result.shouldQuit).toBe(false);
    expect(result.state.overlords.P1.party[0]?.pos).toEqual({ x: 1, y: 0 });
    expect(getTile(result.state.board, { x: 0, y: 0 }).type).toBe('corridor');
    expect(getTile(result.state.board, { x: 1, y: 0 }).type).toBe('corridor');
  });

  it('blocks invalid out-of-bounds movement without mutating position', () => {
    const state = createInitialState('terminal-wall', 4);
    const result = applyTerminalCommand(state, 'move_west');

    expect(result.state.overlords.P1.party[0]?.pos).toEqual({ x: 0, y: 0 });
    expect(result.message).toContain('Blocked W');
  });

  it('renders control help with the terminal board', () => {
    const output = renderPlayableTerminal(createInitialState('terminal-render', 4), 'Ready.');

    expect(output).toContain('Rogue D4X Terminal');
    expect(output).toContain('WASD/arrows');
    expect(output).toContain('Turn 1 | Active P1');
  });
});
