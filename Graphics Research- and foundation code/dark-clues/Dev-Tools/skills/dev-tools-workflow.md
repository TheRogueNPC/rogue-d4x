# Dev Tools Workflow

## Level Creator (level-creator/index.html)

Design custom dungeon maps and export as JSON for `Rogue.Plan.loadFromJSON()`.

### Workflow
1. Set grid dimensions (W/H), click **Resize**
2. **Select a room** from the legend (left sidebar) — click to activate
3. **Paint** cells onto the active room (click + drag)
4. Mark **Hero start** (tool button ★, then click a cell)
5. Mark **Boss room** (tool button ♛, then click a room cell)
6. Configure **Character** loadout (name, HP/stock bonuses, theme)
7. Configure **Encounters**: select a room, pick enemies from dropdown, click +
8. **Export JSON** — place output in `assets/plan.json`

### Encounters
- Enemies are loaded from `assets/enemies/manifest.json` at page boot
- Each room's `spawn[]` array is included in export
- Game reads `room.spawn[]` during `Rogue.Plan.loadFromJSON()` to auto-register room entries

### Tips
- Delete a room by clicking × next to its label in the legend
- Use **Info** tool to inspect cell data (room, connections, spawn mobs)
- Keyboard: 1=Paint, 2=Erase, 3=Hero, 4=Boss, 5=Info

---

## Character Creator (char-creator/index.html)

Design player characters and enemy types as self-contained JSON.

### Character Tab
- Name, Bonus HP/Stock, Theme (color scheme)
- **Glyph picker** — choose a Share Tech symbol for the map sprite
- **Visual upload** — drag-and-drop PNG, SVG, or JSON sprites
- Export as `<name>.json` → place in `assets/characters/`

### Enemy Tab
- Name, HP, Damage, Behavior (Wandering/Chasing/Stationary/Patrol)
- Glyph picker for map symbol
- Export as `<name>.json` → place in `assets/enemies/`

### Enemy JSON Format
```json
{
  "name": "Spider",
  "hp": 2,
  "damage": 3,
  "state": "chasing",
  "glyph": "s"
}
```

### Character JSON Format
```json
{
  "name": "Detective",
  "hpBonus": 0,
  "stockBonus": 0,
  "colorScheme": "default",
  "glyph": "@",
  "visuals": []
}
```

### Adding to Game
- Characters: add file to `assets/characters/`, add entry to `manifest.json`
- Enemies: add file to `assets/enemies/`, add entry to `manifest.json`
- The game auto-loads manifests on difficulty-overlay boot
