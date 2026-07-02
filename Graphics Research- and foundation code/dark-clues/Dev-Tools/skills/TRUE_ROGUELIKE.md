# True Roguelike Setup

This guide explains how to use the generation, progression, and content-pack
systems to build a deep, replayable roguelike that feels new every playthrough.

## What makes a roguelike "true"?

1. **Permadeath** — one mistake ends the run. ✓ Game has this.
2. **Procedural generation** — randomized floors, encounters, treasure. ✓ Core exists; expand it.
3. **Meaningful choice** — every decision (ability, loadout, path) matters. ✓ Build this via variety.
4. **Replayability** — different runs feel genuinely different. ✓ Randomization + lots of content.
5. **Fair challenge** — difficulty is consistent, not arbitrary. ✓ Progression system ensures this.
6. **Deep progression** — meaningful advancement through mechanics, not just leveling. ✓ Add via abilities/items.

## Three Systems Working Together

### System 1: Feature Generation (generate-feature.js)

**What it does:** Scaffold boilerplate for mobs, abilities, encounters, pickups.

**How to use it:**

```bash
# Generate a new mob
node Dev-Tools/scripts/generate-feature.js mob "Ogre" 4 0xFF6600 "A brutish brute"

# Generate a new ability
node Dev-Tools/scripts/generate-feature.js ability "IceBlast" 73 2 "Freeze enemies in place"

# Generate an encounter
node Dev-Tools/scripts/generate-feature.js encounter "goblin_warren" 2 4 "large" "Goblins have nested here"

# Generate a pickup
node Dev-Tools/scripts/generate-feature.js pickup "ManaOrb" "magical" "+1 ability stock"
```

Each command outputs a `.js` file with full boilerplate ready to edit. Uncomment
in `manifest.js`, reload, test.

**Why:** Eliminates the copy-paste friction. You focus on mechanics, not syntax.

### System 2: Progression System (progression-system.js)

**What it does:** Scales mob difficulty with level, manages ability regen,
ensures challenge doesn't spike or plateau.

**How it works:**

```
Level 1: Mob HP 1x, Damage 1x
Level 5: Mob HP 1.3x, Damage 1.3x
Level 10: Mob HP 2x, Damage 1.9x
```

Difficulty settings adjust hero baseline:
- **Easy:** +2 HP, +2 ability stock
- **Normal:** baseline
- **Hard:** -1 HP, -1 stock
- **Nightmare:** -2 HP, -2 stock

Ability stock regenerates slowly (`+0.5/turn after 3-turn delay`), forcing
resource management.

**How to customize:**

```js
// In console or another mod:
window.PROGRESSION.mobHPScale[5] = 1.4;  // change level 5 scaling
window.PROGRESSION.stockRegenPerTurn = 0.3;  // slower regen
window.PROGRESSION.difficulty.custom = { hpBonus: 1, stockBonus: 0 };  // new difficulty
```

### System 3: Content Packs (content-pack-system.js)

**What it does:** Organize features into toggleable groups (Core, Bestiary,
Arcane Powers, etc.). Players can enable/disable packs; mods check pack status
before loading.

**How to use it:**

```js
// In a feature mod, at the top:
if (!window.isFeatureEnabled('my_creature_id')) {
    if (window.devLog) window.devLog('[my-mob] disabled by content pack');
    return;  // don't register
}

// Register your feature:
Rogue.Mob.define({ name: 'MyMob', ... });
window.registerFeature('my_creature_id', ['my-mob.js']);
```

In the console:

```js
window.listContentPacks();           // show all packs
window.enablePack('creatures');      // enable a pack
window.disablePack('creatures');     // disable it
window.isFeatureEnabled('goblin');   // check if a feature is on
```

**Why:** Lets you ship multiple content levels without having to fork the
entire project. Players can customize their experience. Developers can test
interactions between different feature sets.

## Recommended Content Structure

Build out your game in tiers of increasing complexity:

### Tier 1: Core (shipped as-is)
- **Mobs:** Wanderer, Hunter (existing)
- **Encounters:** Procedurally spawned per level
- **Abilities:** Basic Q-fire (existing)
- **Pickups:** None (could add a health potion)

### Tier 2: Bestiary Expansion (optional, one pack)
- **Mobs:** Goblin, Phantom, Zombie (template: generate-feature.js)
- **Encounters:** Triggered room encounters (template: add-encounter.md)
- **Abilities:** None new (but add more via add-ability.md)
- **Pickups:** Health Potion (template: add-pickup.md)

### Tier 3: Arcane Powers (optional, one pack)
- **Abilities:** Fireball, Teleport, Shield (template: add-ability.md)
- **Mobs:** None new, but scale the ones from Tier 2
- **Encounters:** Ability-locked encounters (only accessible with Tier 3)

### Tier 4: Advanced/Optional
- **Mechanics:** Critical strikes, dual-wielding, curse system
- **Meta-progression:** Unlockables after victory, ascension levels
- **Asymmetric runs:** Challenge modes (no healing, limited abilities)

## Adding Content: The Full Workflow

### Step 1: Generate boilerplate

```bash
node Dev-Tools/scripts/generate-feature.js mob "Wraith" 3 0x8888FF "A spectral entity"
```

Outputs: `Dev-Tools/mods/wraith-mob.js`

### Step 2: Edit the template

Open `wraith-mob.js`, customize:
- **Glyph** (currently `'w'`, the first letter of name)
- **Color** (currently `0x8888FF`)
- **HP/Damage** (currently `3` / `1`)
- **Ability** (encounter `onEnter`, special attacks, etc.)

Example: make Wraiths only spawn in large rooms at level 3+, with 2-4 per room:

```js
Rogue.Encounter.define({
    name: 'wraith_lair',
    minLevel: 3,
    maxLevel: 10,
    roomSize: 'large',
    onEnter: function(game, room) {
        var Wraith = window['com.watabou.sevendrl.characters.Wraith'.replace(/\./g, '_')];
        var count = 2 + Math.floor(Math.random() * 3);  // 2-4
        return Rogue.Encounter.spawnInRoom(game, room, Wraith, count);
    }
});
```

### Step 3: Register in content pack

Add to `content-pack-system.js`:

```js
window.__contentPacks.bestiary = {
    enabled: true,  // ship enabled by default
    name: 'Bestiary Expansion',
    description: 'Wraiths, Goblins, and other creatures',
    features: ['wraith_mob', 'goblin_mob', 'phantom_mob']
};

window.__contentFeatures.wraith_mob = ['wraith-mob.js', 'wraith-encounter.js'];
```

### Step 4: Uncomment in manifest.js

```js
"/Dev-Tools/mods/wraith-mob.js",
// (if not already included)
```

### Step 5: Reload and test

```
Ctrl+Shift+R
→ Game loads
→ Floor 3+ should have Wraiths
→ Type: DBG.mobs() → see Wraiths in the list
→ Type: window.listContentPacks() → verify pack is registered
```

## Advanced Patterns

### Pattern 1: Difficulty-locked content

Only enable Wraiths on Hard+:

```js
// In wraith-mob.js:
var difficulty = window.__difficultySettings ? window.__difficultySettings.difficulty : 'normal';
if (['easy', 'normal'].indexOf(difficulty) !== -1) {
    if (window.devLog) window.devLog('[wraith] disabled on easy/normal');
    return;
}
Rogue.Mob.define({ name: 'Wraith', ... });
```

### Pattern 2: Encounter chaining

After beating Wraiths once, unlock a boss encounter:

```js
// In a mod:
ModLoader.hook('com.watabou.sevendrl.characters.Mob', 'die', function() {
    if (this.getName && this.getName() === 'Wraith') {
        window.__wraiths_defeated = (window.__wraiths_defeated || 0) + 1;
        if (window.__wraiths_defeated >= 10) {
            window.__bossMobUnlocked = 'WraithLord';
        }
    }
}, null);
```

Then define a boss encounter that only triggers if the flag is set:

```js
Rogue.Encounter.define({
    name: 'wraith_lord_lair',
    minLevel: 6,
    roomSize: 'large',
    onEnter: function(game, room) {
        if (!window.__bossMobUnlocked) return null;  // skip if not unlocked
        // spawn boss...
    }
});
```

### Pattern 3: Ability synergy

Create a pickup that gives stat bonuses for certain ability loadouts:

```js
// In a pickup:
if (game.hero.deck && game.hero.deck.size === 0) {
    // No cards in deck = tech-focused build
    game.hero.maxHP += 1;
}
```

## Testing Strategies

### Smoke test every feature

```js
// Before shipping, run through each content pack:
window.enablePack('bestiary');
// New Game → Hard
// DBG.mobs() at levels 1-3, 4-6, 7-10 → see variety
// Encounter at least one Wraith
// DBG.rooms() → verify room types match encounter filters
```

### Replay variance

Play the same difficulty 3 times; count unique encounters:

```
Run 1: Wanderer (5), Hunter (3), Wraith (2)
Run 2: Wanderer (4), Hunter (4), Goblin (3)
Run 3: Wraith (5), Phantom (2), Hunter (2)
→ Good variance ✓
```

If Run 1 and Run 2 are identical, add more encounter variety or randomization.

### Difficulty balance

On Hard, measure hero survival past level 3:

```js
// In console, after each floor:
DBG.hero()  // check HP, current stock, deck state
// If HP is always 1-2, difficulty is too high
// If HP is always full, too low
```

## Migration Checklist

Starting from the current game, to full roguelike:

- [ ] Run `generate-feature.js` to scaffold 5-10 new mobs
- [ ] Test that all 5-10 mobs spawn, scale correctly with level
- [ ] Add 3-5 new abilities via `add-ability.md` workflow
- [ ] Organize mobs/abilities into content packs
- [ ] Tweak `PROGRESSION` scaling until difficulty feels right
- [ ] Play 10 runs on each difficulty, check for plateau/spike
- [ ] Add 3-5 new encounters that trigger on room entry
- [ ] Add 2-3 pickup items (health, stock regen, temporary buff)
- [ ] Verify High is genuinely hard, Easy is accessible
- [ ] Ship with Core pack enabled by default, Bestiary optional

## Reference

- `generate-feature.js` — the scaffold tool
- `progression-system.js` — difficulty scaling, stock regen
- `content-pack-system.js` — pack management, feature flags
- `QUICK_START.md` — 5-min workflow for adding a single feature
- `add-mob.md`, `add-ability.md`, `add-encounter.md` — detailed workflows
