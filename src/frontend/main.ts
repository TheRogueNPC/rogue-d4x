interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
}

const WIDTH = 50;
const HEIGHT = 50;
const grid: number[][] = [];
const rooms: Room[] = [];

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateDungeon() {
  // initialize grid with walls
  for (let y = 0; y < HEIGHT; y++) {
    const row: number[] = [];
    for (let x = 0; x < WIDTH; x++) {
      row.push(0);
    }
    grid.push(row);
  }

  const numRooms = rand(6, 10);

  for (let i = 0; i < numRooms; i++) {
    const w = rand(5, 10);
    const h = rand(5, 10);
    const x = rand(1, WIDTH - w - 2);
    const y = rand(1, HEIGHT - h - 2);

    const newRoom: Room = { x, y, w, h };

    // check overlap
    let failed = false;
    for (const other of rooms) {
      if (
        newRoom.x <= other.x + other.w + 1 &&
        newRoom.x + newRoom.w + 1 >= other.x &&
        newRoom.y <= other.y + other.h + 1 &&
        newRoom.y + newRoom.h + 1 >= other.y
      ) {
        failed = true;
        break;
      }
    }

    if (!failed) {
      // carve the room into grid
      for (let yi = y; yi < y + h; yi++) {
        for (let xi = x; xi < x + w; xi++) {
          grid[yi][xi] = 1;
        }
      }
      rooms.push(newRoom);
    }
  }

  // connect rooms
  for (let i = 1; i < rooms.length; i++) {
    const prev = rooms[i - 1];
    const curr = rooms[i];
    const prevCenter = { x: prev.x + Math.floor(prev.w / 2), y: prev.y + Math.floor(prev.h / 2) };
    const currCenter = { x: curr.x + Math.floor(curr.w / 2), y: curr.y + Math.floor(curr.h / 2) };

    if (Math.random() < 0.5) {
      // horizontal then vertical
      for (let x = Math.min(prevCenter.x, currCenter.x); x <= Math.max(prevCenter.x, currCenter.x); x++) {
        grid[prevCenter.y][x] = 1;
      }
      for (let y = Math.min(prevCenter.y, currCenter.y); y <= Math.max(prevCenter.y, currCenter.y); y++) {
        grid[y][currCenter.x] = 1;
      }
    } else {
      // vertical then horizontal
      for (let y = Math.min(prevCenter.y, currCenter.y); y <= Math.max(prevCenter.y, currCenter.y); y++) {
        grid[y][prevCenter.x] = 1;
      }
      for (let x = Math.min(prevCenter.x, currCenter.x); x <= Math.max(prevCenter.x, currCenter.x); x++) {
        grid[currCenter.y][x] = 1;
      }
    }
  }
}

generateDungeon();

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const TILE_SIZE = canvas.width / WIDTH;

const player = {
  x: rooms[0] ? rooms[0].x + Math.floor(rooms[0].w / 2) : 1,
  y: rooms[0] ? rooms[0].y + Math.floor(rooms[0].h / 2) : 1,
};

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      if (grid[y][x] === 1) {
        ctx.fillStyle = '#555';
      } else {
        ctx.fillStyle = '#222';
      }
      ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }
  // draw player
  ctx.fillStyle = '#ff4444';
  ctx.fillRect(player.x * TILE_SIZE, player.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
}

draw();

window.addEventListener('keydown', (e) => {
  let dx = 0;
  let dy = 0;
  if (e.key === 'ArrowUp' || e.key === 'w') dy = -1;
  if (e.key === 'ArrowDown' || e.key === 's') dy = 1;
  if (e.key === 'ArrowLeft' || e.key === 'a') dx = -1;
  if (e.key === 'ArrowRight' || e.key === 'd') dx = 1;

  if (dx !== 0 || dy !== 0) {
    const nx = player.x + dx;
    const ny = player.y + dy;
    if (nx >= 0 && nx < WIDTH && ny >= 0 && ny < HEIGHT && grid[ny][nx] === 1) {
      player.x = nx;
      player.y = ny;
      draw();
    }
    e.preventDefault();
  }
});
