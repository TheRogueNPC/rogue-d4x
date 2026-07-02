// src/render/terminal-renderer.ts
// Text renderer only reads state. It never mutates the simulation.

import type { Coord, GameState, PlayerId, Tile } from '../core/types.js';

const GLYPHS: Record<string, string> = {
  empty: '·',
  corridor: '─',
  room: '□',
  gate: '▓',
  key: '♦',
  redirect: '↻',
  blocked: '▒',
  void: '░',
  flag: '▲',
  pawnP1: '①',
  pawnP2: '②',
};

const ANSI = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  p1: '\x1b[36m',
  p2: '\x1b[35m',
  danger: '\x1b[31m',
  gold: '\x1b[33m',
  void: '\x1b[90m',
};

function sameCoord(a: Coord, b: Coord): boolean {
  return a.x === b.x && a.y === b.y;
}

function pawnGlyph(playerId: PlayerId): string {
  return playerId === 'P1' ? `${ANSI.p1}${GLYPHS.pawnP1}${ANSI.reset}` : `${ANSI.p2}${GLYPHS.pawnP2}${ANSI.reset}`;
}

function tileGlyph(tile: Tile, state: GameState): string {
  const pawn = Object.values(state.overlords)
    .flatMap((overlord) => overlord.party)
    .find((candidate) => candidate.alive && !candidate.extracted && sameCoord(candidate.pos, tile.pos));

  if (pawn) return pawnGlyph(pawn.ownerId);
  if (state.path.flagPos && sameCoord(state.path.flagPos, tile.pos)) return `${ANSI.gold}${GLYPHS.flag}${ANSI.reset}`;
  if (state.path.path.some((pos) => sameCoord(pos, tile.pos))) return `${ANSI.gold}${GLYPHS[tile.type] ?? GLYPHS.corridor}${ANSI.reset}`;
  if (tile.type === 'void') return `${ANSI.void}${GLYPHS.void}${ANSI.reset}`;
  if (tile.type === 'blocked') return `${ANSI.danger}${GLYPHS.blocked}${ANSI.reset}`;
  return GLYPHS[tile.type] ?? '?';
}

export function renderTerminal(state: GameState): string {
  const p1 = state.overlords.P1;
  const p2 = state.overlords.P2;
  const lines: string[] = [];

  lines.push(`Turn ${state.turn} | Active ${state.currentPlayerId} | Mode ${state.mode}`);
  lines.push(`P1 break:${p1.breaksAvailable} block:${p1.blocksAvailable} extracted:${p1.party.filter((p) => p.extracted).length}/${p1.party.length} | P2 break:${p2.breaksAvailable} block:${p2.blocksAvailable} extracted:${p2.party.filter((p) => p.extracted).length}/${p2.party.length}`);
  lines.push('');

  for (const row of state.board) {
    lines.push(row.map((tile) => tileGlyph(tile, state)).join(' '));
  }

  lines.push('');
  lines.push(`Golden Path: ${state.path.status}${state.path.flagPos ? ` flag=${state.path.flagPos.x},${state.path.flagPos.y}` : ''}`);
  lines.push(`Last: ${state.events[state.events.length - 1]?.message ?? 'No events yet.'}`);

  if (state.winner) {
    lines.push(`${state.winner.playerId} wins by ${state.winner.reason}.`);
  }

  return lines.join('\n');
}
