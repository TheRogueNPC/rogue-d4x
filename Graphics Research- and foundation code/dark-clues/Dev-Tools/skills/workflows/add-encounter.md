# Workflow: Add a Room Encounter

Spawn mobs (or run arbitrary logic) the first time the hero enters a
matching room, via `Rogue.Encounter` — no scene/hook plumbing needed.

## Steps

### 1. Define mobs first (if new)

See `add-mob.md`. You can also use any existing mob class or
`Rogue.Registry`-defined one.

### 2. Define the encounter

```js
Rogue.Encounter.define({
    name: 'spider_nest',        // unique id
    minLevel: 1,
    maxLevel: 3,                 // omit either bound to leave it open
    roomSize: 'large',           // 'small' | 'large' | 'dead_end' | null (any)
    priority: 0,                  // higher checked first when multiple defs could match
    once: true,                   // only fires once per game (per def, not per room)
    onEnter: function(game, room) {
        // Return an array of characters to add, or a falsy value to skip.
        var Spider = window['com.watabou.sevendrl.characters.Spider'.replace(/\./g, '_')];
        return Rogue.Encounter.spawnInRoom(game, room, Spider, 3);
    }
});
```

`onEnter` fires once per room, the first time the hero enters it, checked
against every defined encounter in priority order until one matches and
returns a truthy result.

### 3. Or: a generic handler for every room

For logic that isn't "spawn mobs in a matching room" (lore triggers,
ambient sound changes, etc.):

```js
Rogue.Encounter.onRoomEnter(function(room, game) {
    if (room.id === game.plan.bossRoomId) {
        if (window.__eventLogAdd) window.__eventLogAdd('The air grows cold...');
    }
});
```
This runs on **every** room entry, with no `once`/level/size filtering —
do your own condition-checking inside the handler.

### 4. Helper: spawn N of a mob in a room

```js
Rogue.Encounter.spawnInRoom(game, room, MobClass, count);
// → places `count` instances of MobClass at random cells within `room.area`,
//   adds each to game.queue, returns the array of spawned instances
```

### 5. Level-Creator integration (optional)

The standalone Level Editor (`Dev-Tools/level-creator/`) lets you assign
`room.spawn[]` arrays per-room when designing a custom plan; those are read
back automatically when the plan loads via `Rogue.Plan.loadFromJSON()` —
see `dev-tools-workflow.md`.

### 6. Test

`DBG.rooms()` / `Rogue.Room.printAll()` to see room sizes/levels you're
targeting; walk into a matching room and confirm mobs/logic trigger.

## Reference
- `rogue-api.md` → `Rogue.Encounter`
- `Dev-Tools/mods/add-encounter.js` — working template
- `add-mob.md` — defining the mob to spawn
- `modules/IN_OUT_GLOSSARY.md` §3 — spawn pipeline
