# Dark Clues: True Roguelike Setup Guide

Complete guide to using the scripting, progression, and content systems to build
a deep, replayable roguelike game.

## What You Have

### 1. Feature Generator (`Dev-Tools/scripts/generate-feature.js`)

Scaffold boilerplate for any feature type in one command:

```bash
node Dev-Tools/scripts/generate-feature.js mob "Wraith" 3 0x8888FF "A spectral entity"
node Dev-Tools/scripts/generate-feature.js ability "IceBlast" 73 2 "Freeze enemies"
node Dev-Tools/scripts/generate-feature.js encounter "haunted_crypt" 4 8 "large" "Undead lair"
node Dev-Tools/scripts/generate-feature.js pickup "SpellBook" "magical" "+1 ability stock"
```

Each command outputs a `.js` file ready to customize. No more copy-paste friction.

### 2. Progression System (`Dev-Tools/mods/progression-system.js`)

Automatic difficulty scaling:
- **Mob HP/Damage** scale with level (1x → 2x over 10 levels)
- **Hero HP bonus** depends on selected difficulty (Easy: +2, Hard: -1, Nightmare: -2)
- **Ability stock regeneration** is controlled and limited, forcing resource management
- **Configurable** via `window.PROGRESSION` global in console

Ensure challenge stays meaningful from level 1 to level 10.

### 3. Content Pack System (`Dev-Tools/mods/content-pack-system.js`)

Organize features into toggleable groups:

```js
window.__contentPacks.bestiary = {
    enabled: true,
    name: 'Bestiary Expansion',
    description: 'Wraiths, Goblins, and other creatures',
    features: ['wraith_mob', 'goblin_mob', 'zombie_mob']
};
```

Mods check pack status before loading:

```js
if (!window.isFeatureEnabled('my_feature_id')) return;  // skip if pack disabled
Rogue.Mob.define({ name: 'MyMob', ... });
```

Players enable/disable packs in console: `window.enablePack('bestiary')`.

### 4. Complete Workflow Documentation

- `Dev-Tools/skills/QUICK_START.md` — 5-minute quickstart
- `Dev-Tools/skills/TRUE_ROGUELIKE.md` — complete roguelike design guide
- `Dev-Tools/skills/workflows/*.md` — per-feature detailed guides
- `Dev-Tools/skills/GLOBALS_REFERENCE.md` — window state and globals
- `Dev-Tools/skills/SIGNALS_REFERENCE.md` — game events you can hook

## Quick Start: Add Your First Feature

### 1. Generate boilerplate (30 seconds)

```bash
cd dark-clues
node Dev-Tools/scripts/generate-feature.js mob "Skeleton" 2 0xFFFFFF "A shambling undead"
```

**Output:** `Dev-Tools/mods/skeleton-mob.js` with full boilerplate.

### 2. Customize the mob (2 minutes)

Open `skeleton-mob.js`, look for `SWAP` comments:

```js
Rogue.Mob.define({
    name: 'Skeleton',
    hp: 2,              // ← Change HP based on difficulty
    visual: 's',        // ← Change glyph (currently 's' for Skeleton)
    color: 0xFFFFFF,    // ← Customize color
    info: 'A shambling undead',  // ← Update flavor text
    damage: 1,          // ← Adjust damage
    state: 'chasing'    // ← or 'wandering'
});
```

### 3. Register in manifest (10 seconds)

Open `Dev-Tools/mods/manifest.js`, uncomment the template mods section:

```js
// Template mods (uncomment to activate):
"/Dev-Tools/mods/skeleton-mob.js",  // ← uncomment this
```

### 4. Reload and test (30 seconds)

```
Press Ctrl+Shift+R to hard-reload the page
→ Game loads with Skeleton registered
→ Type in console: DBG.mobs()
→ See Skeleton listed
```

**Total time: ~3 minutes per feature.**

## Recommended Content Roadmap

### Phase 1: Core Game (Already Done ✓)
- **Mobs:** Wanderer, Hunter
- **Abilities:** Q-fire stock system
- **Features:** Difficulty select, character creator, title menu

### Phase 2: Bestiary (10-15 mobs)
Use `generate-feature.js` to create:
- Goblin (2 HP, weak)
- Orc (4 HP, strong)
- Wraith (3 HP, fast)
- Phantom (2 HP, teleport)
- Zombie (2 HP, high damage)
- Spider (1 HP, swarm)
- Troll (5 HP, regenerate)
- Etc.

**Time:** ~30 minutes to generate + 30 seconds each to customize = ~2 hours total.

### Phase 3: Arcane Powers (8-12 abilities)
Use `add-ability.md` workflow to create:
- Fireball (AoE damage)
- Teleport (movement)
- Shield (damage reduction)
- Heal (restore HP)
- Freeze (disable enemies)
- Summon (spawn allies)
- Etc.

**Time:** ~20 minutes per ability = 3-4 hours total.

### Phase 4: Treasure Hoard (5-8 pickups)
Use `add-pickup.md` workflow to create:
- Health Potion
- Mana Orb
- Blessing Crystal
- Cursed Amulet
- Etc.

**Time:** ~15 minutes per pickup = 1-2 hours total.

### Phase 5: Dynamic Encounters (10-15 special events)
Use `add-encounter.md` workflow to create:
- Boss rooms
- Trap rooms
- Treasure vaults
- Mini-boss encounters
- Etc.

**Time:** ~20 minutes per encounter = 3-5 hours total.

## Testing & Balancing

### Smoke Test (30 minutes)

For each new feature:

```bash
# Generate it
node Dev-Tools/scripts/generate-feature.js mob "TestMob" 2 0xFF0000 "Test"

# Reload game, play one run
# In console:
DBG.mobs()           # see your mob in the list
DBG.rooms()          # check room spawns
# Walk until you encounter it
# Verify glyph, color, damage look right
```

### Difficulty Balance (1-2 hours)

Play 3 runs on each difficulty setting:

```js
// Before starting, in console:
window.PROGRESSION.mobHPScale = [0, 1, 1.1, 1.2, ...];  // tweak if needed
window.PROGRESSION.difficulty.hard = { hpBonus: -1, stockBonus: -1 };
```

**Check after each floor:**
- Hero HP should vary (not stuck at full or critical)
- Ability stock regen should feel slow but not stalling
- Encounters should scale smoothly (not sudden jump in difficulty)

### Content Variety (checking)

Play 5 runs on Normal; count unique encounters:

```
Run 1: Wanderer (5), Hunter (3), Wraith (2) — total 10 encounters
Run 2: Wanderer (4), Hunter (3), Goblin (3) — total 10 encounters
Run 3: Wraith (4), Goblin (2), Hunter (4) — total 10 encounters
...
Goal: Each run should feel different.
```

If runs 1-3 are similar, add more mobs or encounters.

## Command Reference

### Feature Generation

```bash
node Dev-Tools/scripts/generate-feature.js mob <name> <hp> <color> <info>
node Dev-Tools/scripts/generate-feature.js ability <name> <keyCode> <cost> <desc>
node Dev-Tools/scripts/generate-feature.js encounter <name> <minLvl> <maxLvl> <roomSize> <desc>
node Dev-Tools/scripts/generate-feature.js pickup <name> <type> <effect>
```

### Content Packs (in console)

```js
window.listContentPacks()              // show all packs
window.enablePack('bestiary')          // enable a pack
window.disablePack('bestiary')         // disable it
window.isFeatureEnabled('my_feature')  // check if enabled
window.registerFeature('id', ['mod.js']) // register a feature
```

### Progression (in console)

```js
window.PROGRESSION                     // view all scaling curves
window.PROGRESSION.mobHPScale[5] = 1.3 // tweak level 5 mob HP
window.PROGRESSION.stockRegenPerTurn = 0.3 // slower ability regen
window.getProgression(5, 'mobHPScale') // get scaling for level 5
```

### Debug Commands (in console)

```js
DBG.mobs()               // list all mobs on current floor
DBG.rooms()              // list all rooms with their properties
DBG.hero()               // show hero stats
DBG.plan()               // show floor plan
DBG.levelUp()            // jump to next level
DBG.kill(mob)            // kill a specific mob
DBG.clue(3)              // spawn 3 clues
```

## Full Workflow Example: Add a Spider Enemy

```bash
# 1. Generate
node Dev-Tools/scripts/generate-feature.js mob "Spider" 1 0xFF6600 "A venomous arachnid"

# 2. Edit Dev-Tools/mods/spider-mob.js
#    Change: glyph to 'S', damage to 2, add special ability

# 3. Uncomment in manifest.js:
#    "/Dev-Tools/mods/spider-mob.js",

# 4. Reload (Ctrl+Shift+R)

# 5. Test:
#    DBG.mobs() → see Spider
#    Play until you hit one
#    Verify damage output, spawning rate, etc.

# 6. Add to content pack (optional):
#    In content-pack-system.js, add 'spider_mob' to a pack's features

# 7. Create an encounter for spiders (optional):
#    node Dev-Tools/scripts/generate-feature.js encounter "spider_nest" 1 5 "large" "Arachnid warren"
#    Customize to spawn 2-4 spiders
#    Uncomment in manifest.js

# 8. Test encounter:
#    Play until level 1-5, enter a large room
#    Should encounter 2-4 spiders together
```

**Total time: ~10 minutes.**

## Shipping a Roguelike: Checklist

- [ ] **Core systems working:**
  - [ ] Difficulty scaling is smooth (no jumps)
  - [ ] Ability stock regen feels right
  - [ ] Progression is rewarding (runs feel different)

- [ ] **Content density:**
  - [ ] At least 10 different mob types
  - [ ] At least 8 different abilities
  - [ ] At least 5 different pickups
  - [ ] At least 10 different encounters

- [ ] **Replayability:**
  - [ ] Random element in mob spawning
  - [ ] Random element in encounters
  - [ ] Random element in treasure placement
  - [ ] Each run takes 30-60 minutes (not too fast, not too slow)

- [ ] **Balance:**
  - [ ] Easy is beatable by new players
  - [ ] Normal is challenging
  - [ ] Hard is punishing
  - [ ] Nightmare is for veterans

- [ ] **Polish:**
  - [ ] All mobs have unique glyphs/colors
  - [ ] All abilities are intuitive
  - [ ] All pickups have clear effects
  - [ ] Game explains the rules (intro message, tooltips)

## Recommended Resources

- **Design doc:** `Dev-Tools/skills/TRUE_ROGUELIKE.md` — philosophy and strategies
- **API refs:** `Dev-Tools/skills/QUICK_START.md` and `API_REFERENCE.md`
- **Per-feature:** `Dev-Tools/skills/workflows/add-*.md` — detailed guides
- **Debugging:** `Dev-Tools/skills/debugging.md` — troubleshooting

## Next Steps

1. **Pick a feature type** (mob, ability, encounter, pickup)
2. **Run the generator** with your idea
3. **Customize** the boilerplate in 1-2 minutes
4. **Uncomment** in manifest.js
5. **Test** with DBG commands
6. **Ship** when you have 30-50 pieces of content

Each cycle takes ~10 minutes. Ship early and often.

---

**Questions?** See `Dev-Tools/skills/QUICK_START.md` (5 min) or `debugging.md` (troubleshooting).

**Build a roguelike. Have fun.**
