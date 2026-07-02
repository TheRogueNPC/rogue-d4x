// src/core/types.ts
// Canonical D4X simulation types. Keep these plain JSON-compatible for deterministic replay.

export type PlayerId = 'P1' | 'P2';
export type Direction = 'N' | 'E' | 'S' | 'W';
export type TileType = 'empty' | 'corridor' | 'room' | 'gate' | 'key' | 'redirect' | 'blocked' | 'flag' | 'void';
export type GameMode = 'dungeon' | 'incursion' | 'game-over';
export type WinReason = 'extraction' | 'attrition' | 'none';

export interface Coord {
  x: number;
  y: number;
}

export interface TileBan {
  playerId: PlayerId;
  untilTurn: number;
  reason: 'break' | 'block' | 'death' | 'system';
}

export interface Tile {
  pos: Coord;
  type: TileType;
  ownerId?: PlayerId;
  connections: Direction[];
  eventCardId?: string;
  blockedUntilTurn?: number;
  bans: TileBan[];
}

export interface Pawn {
  id: string;
  ownerId: PlayerId;
  pos: Coord;
  hp: number;
  atk: number;
  stunnedUntilTurn?: number;
  gear: string[];
  alive: boolean;
  extracted: boolean;
}

export interface Overlord {
  id: PlayerId;
  name: string;
  party: Pawn[];
  breaksAvailable: number;
  breakCooldownUntil: number;
  blocksAvailable: number;
  swapsUsed: number;
  swapCooldownUntil: number;
  flipUsed: boolean;
  wipes: number;
}

export interface PathState {
  status: 'none' | 'candidate' | 'locked';
  path: Coord[];
  flagPos: Coord | null;
}

export interface GameConfig {
  boardSize: 4 | 8 | 12 | 16;
  partySize: 1 | 2 | 3 | 4;
  goldenPathLength: number;
  attritionWipeLimit: number;
}

export interface GameEvent {
  type: string;
  turn: number;
  message: string;
  actorId?: PlayerId;
  coord?: Coord;
}

export interface GameState {
  version: 1;
  seed: string;
  turn: number;
  currentPlayerId: PlayerId;
  mode: GameMode;
  config: GameConfig;
  board: Tile[][];
  overlords: Record<PlayerId, Overlord>;
  path: PathState;
  events: GameEvent[];
  winner: { playerId: PlayerId; reason: WinReason } | null;
}

export type PlayerAction =
  | { type: 'place_tile'; actorId: PlayerId; pos: Coord; tileType: Exclude<TileType, 'empty' | 'void' | 'flag'>; connections: Direction[] }
  | { type: 'move_pawn'; actorId: PlayerId; pawnId: string; direction: Direction }
  | { type: 'break_tile'; actorId: PlayerId; target: Coord }
  | { type: 'block_tile'; actorId: PlayerId; target: Coord }
  | { type: 'end_phase'; actorId: PlayerId };

export const DIR_DELTA: Record<Direction, Coord> = {
  N: { x: 0, y: -1 },
  E: { x: 1, y: 0 },
  S: { x: 0, y: 1 },
  W: { x: -1, y: 0 },
};

export const OPPOSITE: Record<Direction, Direction> = {
  N: 'S',
  E: 'W',
  S: 'N',
  W: 'E',
};
