// src/frontend/dungeon-layout.ts
// Reusable browser/Tauri dungeon layout generator with theme metadata kept separate from rendering.

export type DungeonCell = 0 | 1;
export type DungeonThemeId = 'obsidian' | 'crypt' | 'scar' | 'tower';

export interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DungeonTheme {
  id: DungeonThemeId;
  label: string;
  wall: string;
  floor: string;
  player: string;
  accent: string;
  background: string;
}

export interface DungeonLayout {
  width: number;
  height: number;
  seed: string;
  grid: DungeonCell[][];
  rooms: Room[];
  spawn: { x: number; y: number };
  theme: DungeonTheme;
}

export interface DungeonLayoutOptions {
  width?: number;
  height?: number;
  minRooms?: number;
  maxRooms?: number;
  minRoomSize?: number;
  maxRoomSize?: number;
  seed?: string;
  themeId?: DungeonThemeId;
}

export const DUNGEON_THEMES: Record<DungeonThemeId, DungeonTheme> = {
  obsidian: {
    id: 'obsidian',
    label: 'Obsidian Keep',
    wall: '#151515',
    floor: '#555555',
    player: '#ff4444',
    accent: '#f0c85a',
    background: '#080808',
  },
  crypt: {
    id: 'crypt',
    label: 'Bone Crypt',
    wall: '#1f2420',
    floor: '#7a7568',
    player: '#d8f3dc',
    accent: '#95d5b2',
    background: '#101310',
  },
  scar: {
    id: 'scar',
    label: 'Scar Rift',
    wall: '#21151a',
    floor: '#6c3343',
    player: '#f28482',
    accent: '#f6bd60',
    background: '#12090d',
  },
  tower: {
    id: 'tower',
    label: 'Tower Ruin',
    wall: '#111827',
    floor: '#64748b',
    player: '#38bdf8',
    accent: '#a78bfa',
    background: '#020617',
  },
};

export const DUNGEON_THEME_IDS = Object.keys(DUNGEON_THEMES) as DungeonThemeId[];

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 0x9e3779b9;
}

function createRng(seed: string): () => number {
  let state = hashSeed(seed);
  return () => {
    state += 0x6d2b79f5;
    let next = state;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function createGrid(width: number, height: number): DungeonCell[][] {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => 0 as DungeonCell));
}

function centerOf(room: Room): { x: number; y: number } {
  return {
    x: room.x + Math.floor(room.w / 2),
    y: room.y + Math.floor(room.h / 2),
  };
}

function roomsOverlap(a: Room, b: Room, padding = 1): boolean {
  return (
    a.x <= b.x + b.w + padding &&
    a.x + a.w + padding >= b.x &&
    a.y <= b.y + b.h + padding &&
    a.y + a.h + padding >= b.y
  );
}

function carveRoom(grid: DungeonCell[][], room: Room): void {
  for (let y = room.y; y < room.y + room.h; y++) {
    const row = grid[y];
    if (!row) continue;
    for (let x = room.x; x < room.x + room.w; x++) {
      row[x] = 1;
    }
  }
}

function carveHorizontal(grid: DungeonCell[][], y: number, fromX: number, toX: number): void {
  const row = grid[y];
  if (!row) return;
  for (let x = Math.min(fromX, toX); x <= Math.max(fromX, toX); x++) {
    row[x] = 1;
  }
}

function carveVertical(grid: DungeonCell[][], x: number, fromY: number, toY: number): void {
  for (let y = Math.min(fromY, toY); y <= Math.max(fromY, toY); y++) {
    const row = grid[y];
    if (row) row[x] = 1;
  }
}

function connectRooms(grid: DungeonCell[][], rooms: Room[], rng: () => number): void {
  for (let i = 1; i < rooms.length; i++) {
    const previous = rooms[i - 1];
    const current = rooms[i];
    if (!previous || !current) continue;

    const from = centerOf(previous);
    const to = centerOf(current);

    if (rng() < 0.5) {
      carveHorizontal(grid, from.y, from.x, to.x);
      carveVertical(grid, to.x, from.y, to.y);
    } else {
      carveVertical(grid, from.x, from.y, to.y);
      carveHorizontal(grid, to.y, from.x, to.x);
    }
  }
}

export function getDungeonTheme(themeId: DungeonThemeId): DungeonTheme {
  return DUNGEON_THEMES[themeId];
}

export function nextThemeId(current: DungeonThemeId): DungeonThemeId {
  const currentIndex = DUNGEON_THEME_IDS.indexOf(current);
  const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % DUNGEON_THEME_IDS.length;
  return DUNGEON_THEME_IDS[nextIndex] ?? 'obsidian';
}

export function isFloor(layout: DungeonLayout, x: number, y: number): boolean {
  return layout.grid[y]?.[x] === 1;
}

export function createDungeonLayout(options: DungeonLayoutOptions = {}): DungeonLayout {
  const width = options.width ?? 50;
  const height = options.height ?? 50;
  const minRooms = options.minRooms ?? 6;
  const maxRooms = options.maxRooms ?? 10;
  const minRoomSize = options.minRoomSize ?? 5;
  const maxRoomSize = options.maxRoomSize ?? 10;
  const seed = options.seed ?? `${Date.now()}-${Math.random()}`;
  const themeId = options.themeId ?? 'obsidian';
  const rng = createRng(seed);
  const grid = createGrid(width, height);
  const rooms: Room[] = [];
  const targetRooms = randInt(rng, minRooms, maxRooms);
  const maxAttempts = Math.max(targetRooms * 8, 32);

  for (let attempt = 0; attempt < maxAttempts && rooms.length < targetRooms; attempt++) {
    const w = randInt(rng, minRoomSize, maxRoomSize);
    const h = randInt(rng, minRoomSize, maxRoomSize);
    const x = randInt(rng, 1, Math.max(1, width - w - 2));
    const y = randInt(rng, 1, Math.max(1, height - h - 2));
    const room: Room = { x, y, w, h };

    if (rooms.some((other) => roomsOverlap(room, other))) continue;

    carveRoom(grid, room);
    rooms.push(room);
  }

  if (rooms.length === 0) {
    const fallbackRoom: Room = {
      x: Math.max(1, Math.floor(width / 2) - 3),
      y: Math.max(1, Math.floor(height / 2) - 3),
      w: Math.min(6, width - 2),
      h: Math.min(6, height - 2),
    };
    carveRoom(grid, fallbackRoom);
    rooms.push(fallbackRoom);
  }

  connectRooms(grid, rooms, rng);

  return {
    width,
    height,
    seed,
    grid,
    rooms,
    spawn: centerOf(rooms[0]!),
    theme: getDungeonTheme(themeId),
  };
}
