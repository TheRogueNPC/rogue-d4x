# Workflow: Add a Playable Character / Loadout

Three pieces fit together here — don't confuse them:

| Piece | What it is | Where |
|---|---|---|
| `assets/characters/*.json` | The data: name, stat bonuses, glyph, color scheme | static JSON files |
| `play.js`'s difficulty/character-select overlay | Reads the manifest at New-Game time, builds the canvas card row | `Dev-Tools/mods/play.js` |
| `char-creator.js` | An **in-game** canvas tool for *players* to build a custom loadout live and save it as `window.__characterLoadout` | `Dev-Tools/mods/char-creator.js` |
| `Dev-Tools/char-creator/` | A **standalone** DOM page for *you* (the modder) to design new character JSON files to ship | separate tool, not loaded in-game |

## Option A — add a new shippable character (data only, no code)

1. Open the standalone designer: `Dev-Tools/char-creator/index.html`
   (DOM tool, not the in-game one — see `dev-tools-workflow.md` for its
   full UI walkthrough: name, bonus HP/stock, theme, glyph picker, visual
   upload).
2. Export as `<name>.json` → place in `assets/characters/`.
3. Add an entry to `assets/characters/manifest.json`.
4. `play.js`'s `loadCharacters()` fetches the manifest at New-Game time —
   your character's card appears in the difficulty-select row automatically,
   no code change needed.

Character JSON shape (already validated working — see `play.js`'s
`DEFAULTS`/`findVisual()`):
```json
{ "name": "Detective", "hpBonus": 0, "stockBonus": 0, "colorScheme": "default", "glyph": "@", "visuals": [] }
```
`visuals: []` is the only field with no live consumer yet — every shipped
character so far uses `glyph` only (no PNG/SVG rendering is wired up; see
`API_REFERENCE.md`'s Assets section if you want to build that).

## Option B — let players build their own loadout in-game

This already exists end-to-end — `char-creator.js`'s canvas overlay (opened
via `window.__openCharCreator()`, currently wired to a dev-toolbar button)
writes straight to `window.__characterLoadout`, the same global `play.js`
reads when applying difficulty. If you want a *different* in-game creation
flow (a title-menu entry instead of a dev-toolbar button, say), the
integration point is exactly that: call `window.__openCharCreator()` from
wherever you want the entry point, and `window.__characterLoadout` does the
rest automatically.

## Option C — add a new stat/field to the loadout

1. Add the field to `DEFAULTS` in `char-creator.js` and to the form (use
   `Rogue.UI.cycle`/`textInput`/the stat-stepper pattern already there).
2. Add it to the object `saveLoadout()` builds.
3. Read it in `play.js`'s `applyDifficulty()`/`GameScene.reset` after-hook,
   wherever the existing `hpBonus`/`stockBonus` fields are applied — same
   pattern, new field.

## Test

`window.__characterLoadout` in the console to confirm what got saved; start
a New Game and confirm the stat bonuses actually apply (`hero.maxHP`, etc.).

## Reference
- `dev-tools-workflow.md` — standalone Level/Character Creator full UI walkthrough
- `Dev-Tools/mods/play.js` — `loadCharacters()`, `applyDifficulty()`, character-card canvas row
- `Dev-Tools/mods/char-creator.js` — in-game canvas loadout builder
- `add-ui-panel.md` — the canvas patterns (`Rogue.UI.cycle`/`textInput`) char-creator.js is built from
