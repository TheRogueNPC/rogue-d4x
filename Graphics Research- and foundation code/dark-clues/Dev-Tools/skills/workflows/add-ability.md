# Workflow: Add a Custom Ability

Two layers exist already — pick based on what you're building:

- **`Rogue.Ability`** — the shared stock pool (`window.__abilityStock`), the
  one Q-fire/projectile ability already uses. Good for "one more thing that
  spends the same resource."
- **A parallel charge economy** (the pattern `ability-pickup.js` uses for
  chess-piece pickups, `window.__abilityCharges`) — good for "a genuinely
  separate resource with its own pickup/limit," the way the user asked for
  step-abilities ("press Q") to work per-piece rather than off one shared pool.

Don't try to add a real new `ActionCard` enum value for this — see
`add-card.md` for why that's unsafe; abilities are a completely separate
system from cards already, no enum involved.

## Option A — register on the existing shared stock pool

```js
Rogue.Ability.registerAbility(70, {       // keyCode 70 = 'F'
    label: 'Fireball',
    cost: 2,                                // stock spent per use
    onActivate: function(game) {
        // your effect — area damage, buff, whatever
        if (window.__eventLogAdd) window.__eventLogAdd('Fireball!');
    }
});
```
`Rogue.Ability.getStock()` / `setStock(n)` / `addStock(n)` / `consume(n)` /
`getMax()` / `onChange(fn)` manage the pool directly if you need to read or
modify it elsewhere. Full reference: `rogue-api.md` → `Rogue.Ability`.

## Option B — your own charge economy (per-type, own pickups)

Mirror `Dev-Tools/mods/ability-pickup.js`'s actual structure:

1. **State**: `window.__yourCharges = window.__yourCharges || {};` — a map
   keyed by ability type, not a single number.
2. **Pickup collectible**: build it via `Object.create(Clue.prototype)` so
   `instanceof Clue` is true (the native `ActionCollect` action auto-detects
   anything that passes that check — no new Action class needed). See step
   2 in `add-pickup.md` for the exact, working pattern.
3. **Selection + fire**: hook `GameScene.onKey` for your activation key
   (ability-pickup.js uses number keys 1-5 to select a type, Q to fire — see
   `ability.js`'s `onKey` hook for the aim-prompt + direction-pick flow you
   can reuse via `window.__showAimText`/`__hideAimText`).
4. **HUD**: add a row to `hud-bars.js` (it already has a `(Charge):` row
   reading `window.__abilityCharges` — extend that map and the row updates
   automatically) or build your own via `Rogue.UI`.

### Step-cost abilities ("press Q to use a step")

If the ability costs *steps* rather than charges, hook
`Hero.getCloser`/`Hero.act` (whichever fires once per hero turn — `ability.js`
already does this for shared-stock regen) and decrement/check there instead
of a charge map. The shape is identical, just swap "spend a charge" for
"spend a step."

## Reference
- `Dev-Tools/mods/ability.js` — shared stock pool, projectile fire, canvas aim prompt
- `Dev-Tools/mods/ability-pickup.js` — per-type charge economy, Clue-prototype pickup reuse
- `Dev-Tools/mods/hud-bars.js` — `(Charge):` row reads `window.__abilityCharges` directly
- `rogue-api.md` → `Rogue.Ability`
