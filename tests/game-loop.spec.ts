// tests/game-loop.spec.ts
// Verifies that the CLI-facing game loop can run a deterministic playable round.

import { describe, expect, it } from 'vitest';
import { DUMMY_ROUND_ACTIONS, formatLoopFrames, runDummyRound, runGameLoop } from '../src/game-loop.js';

describe('game loop runner', () => {
  it('runs the dummy round and records terminal frames', () => {
    const result = runDummyRound('loop-test-seed');

    expect(result.frames).toHaveLength(DUMMY_ROUND_ACTIONS.length + 1);
    expect(result.finalState.winner).toEqual({ playerId: 'P1', reason: 'extraction' });
    expect(result.finalState.mode).toBe('game-over');
    expect(result.frames.at(-1)?.output).toContain('P1 wins by extraction.');
  });

  it('can format the recorded frames for terminal output', () => {
    const output = formatLoopFrames(runGameLoop(DUMMY_ROUND_ACTIONS.slice(0, 1), 'format-test-seed'));

    expect(output).toContain('#0 initial');
    expect(output).toContain('#1 place_tile');
    expect(output).toContain('Turn 1 | Active P1');
  });
});
