// src/terminal/playable-terminal.ts
// Interactive terminal runner for Rogue D4X. This is the playable CLI layer, not a replay slideshow.

import { applyAction } from '../actions/special-actions.js';
import { getTile, inBounds, neighbor } from '../core/board.js';
import { createInitialState } from '../core/state.js';
import type { Direction, GameState, Pawn, PlayerAction } from '../core/types.js';
import { renderTerminal } from '../render/terminal-renderer.js';

export type TerminalCommand =
  | 'move_north'
  | 'move_east'
  | 'move_south'
  | 'move_west'
  | 'reset'
  | 'help'
  | 'quit'
  | 'noop';

type MoveCommand = Extract<TerminalCommand, 'move_north' | 'move_east' | 'move_south' | 'move_west'>;

export interface TerminalCommandResult {
  state: GameState;
  message: string;
  shouldQuit: boolean;
}

const MOVE_DIRECTIONS: Record<MoveCommand, Direction> = {
  move_north: 'N',
  move_east: 'E',
  move_south: 'S',
  move_west: 'W',
};

const ALL_CONNECTIONS: Direction[] = ['N', 'E', 'S', 'W'];

function isMoveCommand(command: TerminalCommand): command is MoveCommand {
  return command === 'move_north' || command === 'move_east' || command === 'move_south' || command === 'move_west';
}

function activePawn(state: GameState): Pawn | null {
  return state.overlords.P1.party.find((pawn) => pawn.alive && !pawn.extracted) ?? null;
}

export function commandFromKey(input: string): TerminalCommand {
  switch (input) {
    case '\u0003':
    case 'q':
    case 'Q':
      return 'quit';
    case 'r':
    case 'R':
      return 'reset';
    case 'h':
    case 'H':
    case '?':
      return 'help';
    case 'w':
    case 'W':
    case '\u001b[A':
      return 'move_north';
    case 'd':
    case 'D':
    case '\u001b[C':
      return 'move_east';
    case 's':
    case 'S':
    case '\u001b[B':
      return 'move_south';
    case 'a':
    case 'A':
    case '\u001b[D':
      return 'move_west';
    default:
      return 'noop';
  }
}

export function createTerminalMoveActions(state: GameState, direction: Direction): PlayerAction[] {
  const pawn = activePawn(state);
  if (!pawn || state.mode === 'game-over') return [];

  const target = neighbor(pawn.pos, direction);
  if (!inBounds(state.board, target)) return [];

  const fromTile = getTile(state.board, pawn.pos);
  const targetTile = getTile(state.board, target);
  if (targetTile.type === 'void' || targetTile.type === 'blocked') return [];

  const actions: PlayerAction[] = [];

  if (fromTile.type === 'empty') {
    actions.push({
      type: 'place_tile',
      actorId: 'P1',
      pos: pawn.pos,
      tileType: 'corridor',
      connections: ALL_CONNECTIONS,
    });
  }

  if (targetTile.type === 'empty') {
    actions.push({
      type: 'place_tile',
      actorId: 'P1',
      pos: target,
      tileType: 'corridor',
      connections: ALL_CONNECTIONS,
    });
  }

  actions.push({
    type: 'move_pawn',
    actorId: 'P1',
    pawnId: pawn.id,
    direction,
  });

  return actions;
}

export function applyTerminalCommand(
  state: GameState,
  command: TerminalCommand,
  seedFactory: () => string = () => `d4x-terminal-${Date.now()}`,
): TerminalCommandResult {
  if (command === 'quit') {
    return { state, message: 'Quitting Rogue D4X terminal.', shouldQuit: true };
  }

  if (command === 'reset') {
    return {
      state: createInitialState(seedFactory(), 4),
      message: 'New terminal run created.',
      shouldQuit: false,
    };
  }

  if (command === 'help') {
    return {
      state,
      message: 'WASD/arrows build and move. R resets. Q quits.',
      shouldQuit: false,
    };
  }

  if (!isMoveCommand(command)) {
    return { state, message: 'Waiting for input.', shouldQuit: false };
  }

  if (state.mode === 'game-over') {
    return {
      state,
      message: 'Round is over. Press R to start a new run or Q to quit.',
      shouldQuit: false,
    };
  }

  const direction = MOVE_DIRECTIONS[command];
  const actions = createTerminalMoveActions(state, direction);
  if (actions.length === 0) {
    return {
      state,
      message: `Blocked ${direction}. Try a different direction.`,
      shouldQuit: false,
    };
  }

  let next = state;
  let lastMessage = `Moved ${direction}.`;
  for (const action of actions) {
    next = applyAction(next, action);
    lastMessage = next.events.at(-1)?.message ?? lastMessage;
    if (next.events.at(-1)?.type === 'ACTION_REJECTED') break;
  }

  return {
    state: next,
    message: lastMessage,
    shouldQuit: false,
  };
}

export function renderPlayableTerminal(state: GameState, message: string): string {
  return [
    'Rogue D4X Terminal',
    'Controls: WASD/arrows build+move | R reset | H help | Q quit',
    'Goal: carve a connected Golden Path to the far edge, then extract at ▲.',
    '',
    renderTerminal(state),
    '',
    `Input: ${message}`,
  ].join('\n');
}

function clearTerminal(): void {
  process.stdout.write('\x1b[2J\x1b[H');
}

function writeFrame(state: GameState, message: string): void {
  clearTerminal();
  process.stdout.write(`${renderPlayableTerminal(state, message)}\n`);
}

export async function runInteractiveTerminal(): Promise<void> {
  let state = createInitialState('d4x-terminal', 4);
  let message = 'Press WASD or arrow keys to build and move.';

  if (!process.stdin.isTTY) {
    process.stdout.write(`${renderPlayableTerminal(state, 'Interactive terminal requires a TTY.')}\n`);
    return;
  }

  process.stdin.setEncoding('utf8');
  process.stdin.setRawMode(true);
  process.stdin.resume();

  writeFrame(state, message);

  await new Promise<void>((resolve) => {
    const onData = (chunk: string): void => {
      const result = applyTerminalCommand(state, commandFromKey(chunk));
      state = result.state;
      message = result.message;
      writeFrame(state, message);

      if (result.shouldQuit) {
        process.stdin.off('data', onData);
        process.stdin.setRawMode(false);
        process.stdin.pause();
        resolve();
      }
    };

    process.stdin.on('data', onData);
  });
}
