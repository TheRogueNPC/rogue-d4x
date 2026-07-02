# AGENT_START_HERE — RogueD4X

Read order:

1. `agent.md` — stable implementation contract.
2. `RogueD4X dungeon-duel-spec.md` — design source for Dungeon Duel / D4X.
3. `README.md` — current scaffold and commands.
4. `src/core/types.ts` — canonical state model.
5. `tests/d4x-core.test.ts` — current definition of working behavior.

## Current rule

Build the new game in `src/`. Treat `Graphics Research- and foundation code/` as donor/research material only unless Mariku explicitly promotes a piece of it.

## Implementation priorities

1. Keep simulation deterministic and serializable.
2. Keep renderer/input out of core state mutation.
3. Add tests before expanding rules.
4. Preserve the anti-stalemate design: mutable terrain, cooldown windows, forced movement, attrition pressure.

## Current milestone

Playable D4X alpha spine:

- 4x4 board
- one pawn per Overlord
- tile placement
- Golden Path detection
- Break / Block
- pawn movement
- extraction win
- deterministic replay tests

Next systems should be added in this order: turn-phase enforcement, Swap, Flip, Stun, Shove, death/reset, event cards, AI harness, larger-board scenarios.
