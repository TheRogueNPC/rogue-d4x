// src/frontend/main.ts
// Browser/Tauri renderer for the donor-inspired dungeon layout module.

import {
  createDungeonLayout,
  getDungeonTheme,
  isFloor,
  nextThemeId,
  type DungeonLayout,
  type DungeonThemeId,
} from './dungeon-layout.js';

const WIDTH = 50;
const HEIGHT = 50;

const canvas = document.getElementById('gameCanvas');
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('Missing #gameCanvas canvas element.');
}

const ctx = canvas.getContext('2d');
if (!ctx) {
  throw new Error('Unable to initialize 2D canvas context.');
}

const hud = document.createElement('div');
hud.style.maxWidth = `${canvas.width}px`;
hud.style.margin = '8px auto 0';
hud.style.padding = '0 12px';
hud.style.fontFamily = 'monospace';
hud.style.fontSize = '14px';
hud.style.color = '#ddd';
document.body.appendChild(hud);

// UI enhancements: helper to create styled buttons and a controls bar
function createButton(label: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.onclick = onClick;
  btn.style.fontFamily = 'monospace';
  btn.style.fontSize = '14px';
  btn.style.padding = '4px 8px';
  btn.style.backgroundColor = '#333';
  btn.style.color = '#eee';
  btn.style.border = '1px solid #555';
  btn.style.borderRadius = '3px';
  btn.style.cursor = 'pointer';
  btn.addEventListener('mouseenter', () => {
    btn.style.backgroundColor = '#444';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.backgroundColor = '#333';
  });
  return btn;
}
const controls = document.createElement('div');
controls.style.maxWidth = `${canvas.width}px`;
controls.style.margin = '8px auto';
controls.style.display = 'flex';
controls.style.justifyContent = 'center';
controls.style.gap = '8px';
document.body.appendChild(controls);

const rerollBtn = createButton('Reroll (R)', () => rerollDungeon());
const themeBtn = createButton('Next Theme (T)', () => cycleTheme());
controls.appendChild(rerollBtn);
controls.appendChild(themeBtn);

let themeId: DungeonThemeId = 'obsidian';
let layout: DungeonLayout = createDungeonLayout({ width: WIDTH, height: HEIGHT, themeId });
let player = { ...layout.spawn };

function updateHud(): void {
  hud.textContent = `${layout.theme.label} | rooms:${layout.rooms.length} | WASD/Arrows move | R reroll | T theme`;
}

function tileSize(): number {
  return Math.min(canvas.width / layout.width, canvas.height / layout.height);
}

function draw(): void {
  const size = tileSize();

  ctx.fillStyle = layout.theme.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < layout.height; y++) {
    for (let x = 0; x < layout.width; x++) {
      ctx.fillStyle = isFloor(layout, x, y) ? layout.theme.floor : layout.theme.wall;
      ctx.fillRect(x * size, y * size, size, size);
    }
  }

  for (const room of layout.rooms) {
    const cx = room.x + Math.floor(room.w / 2);
    const cy = room.y + Math.floor(room.h / 2);
    ctx.fillStyle = layout.theme.accent;
    ctx.fillRect(cx * size + size * 0.35, cy * size + size * 0.35, size * 0.3, size * 0.3);
  }

  ctx.fillStyle = layout.theme.player;
  ctx.fillRect(player.x * size, player.y * size, size, size);

  updateHud();
}

function rerollDungeon(): void {
  layout = createDungeonLayout({ width: WIDTH, height: HEIGHT, themeId });
  player = { ...layout.spawn };
  draw();
}

function cycleTheme(): void {
  themeId = nextThemeId(themeId);
  layout = {
    ...layout,
    theme: getDungeonTheme(themeId),
  };
  draw();
}

function tryMove(dx: number, dy: number): void {
  const next = {
    x: player.x + dx,
    y: player.y + dy,
  };

  if (!isFloor(layout, next.x, next.y)) return;

  player = next;
  draw();
}

function movementForKey(key: string): { dx: number; dy: number } | null {
  switch (key.toLowerCase()) {
    case 'arrowup':
    case 'w':
      return { dx: 0, dy: -1 };
    case 'arrowdown':
    case 's':
      return { dx: 0, dy: 1 };
    case 'arrowleft':
    case 'a':
      return { dx: -1, dy: 0 };
    case 'arrowright':
    case 'd':
      return { dx: 1, dy: 0 };
    default:
      return null;
  }
}

window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'r') {
    rerollDungeon();
    event.preventDefault();
    return;
  }

  if (event.key.toLowerCase() === 't') {
    cycleTheme();
    event.preventDefault();
    return;
  }

  const movement = movementForKey(event.key);
  if (!movement) return;

  tryMove(movement.dx, movement.dy);
  event.preventDefault();
});

draw();