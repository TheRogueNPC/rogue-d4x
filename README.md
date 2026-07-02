# RogueD4X — Dungeon Duel

A deterministic two-player Overlord-vs-Overlord tactical dungeon-extraction game.

The root project is the new D4X game. `Graphics Research- and foundation code/` is donor/research material only.

## Current playable scaffold

This first pass establishes the simulation spine:

- TypeScript + Node 22 project setup
- Serializable canonical `GameState`
- 4x4/8x8/12x12/16x16 board configuration
- Overlord + pawn state
- tile placement
- pipe-style connection validation
- Golden Path detection
- pawn movement
- Break and Block actions
- terminal renderer
- deterministic replay tests

## Install

```bash
npm install
```

## Run demo

```bash
npm run dev
```

## Test

```bash
npm test
```

## Build

```bash
npm run build
```

## Project layout

```text
src/
  actions/              reducer-style player actions
  core/                 canonical state, board, type model
  input/                terminal/dev command parsing
  pathing/              pipe routing and Golden Path detection
  render/               terminal renderer
tests/                  deterministic core tests
```

## Design rule

Simulation first. Renderer second. Donor code is reference-only until explicitly promoted.
