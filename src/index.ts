// src/index.ts
// CLI smoke runner: executes the testable D4X loop and prints every terminal frame.

import { formatLoopFrames, runDummyRound } from './game-loop.js';

const result = runDummyRound();

console.log(formatLoopFrames(result));
