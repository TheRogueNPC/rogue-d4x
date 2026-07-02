# Rogue API Reference

## Rogue.Mob — Custom Mob Factory

```js
Rogue.Mob.define({
  name: 'Spider',
  hp: 3,
  damage: 2,
  visual: 's',        // sprite character
  color: 0xFF8800,    // text color
  state: 'chasing',   // 'wandering' | 'chasing' | 'stationary'
  onSight: function(hero) { },
  onDamage: function(value) { },
  onDeath: function() { },
  extras: { }          // extra prototype methods
});
// → returns window['com.watabou.sevendrl.characters.Spider']
```

### Spawning
```js
var Spider = Rogue.Registry._resolveMob('spider');
Rogue.Mob.spawn(Spider, game, 3);
// or:
Rogue.Registry.spawn('spider', game, 3);
```

## Rogue.Encounter — Room-Entry Triggers

### Define
```js
Rogue.Encounter.define({
  name: 'spider_nest',
  minLevel: 1,
  maxLevel: 3,
  roomSize: 'large',    // 'small' | 'large' | 'dead_end' | null
  priority: 0,
  once: true,
  onEnter: function(game, room) {
    return [new MyMob(game, room.area[0])];
  }
});
```

### Helper: Spawn in room
```js
Rogue.Encounter.spawnInRoom(game, room, MyMob, 3);
```

### Generic handler
```js
Rogue.Encounter.onRoomEnter(function(room, game) {
  // called every time hero enters any room
});
```

## Rogue.Plan — Dungeon Plan API

### Custom Plans (from Level Creator)
```js
// One-time load:
Rogue.Plan.loadFromJSON(jsonData);
// → { plan, grid, heroStart, bossRoomId }

// Auto-load from assets/plan.json:
Rogue.Plan.autoLoad('assets/plan.json');

// Persist across resets:
Rogue.Plan.setCustomPlan(jsonData);
Rogue.Plan.clearCustomPlan();

// Export current live plan:
Rogue.Plan.toJSON();
```

### Inspection
```js
Rogue.Plan.getInfo();       // { rooms, windows, abris, gridSize }
Rogue.Plan.dump();          // pretty-printed string
Rogue.Plan.asciiMap();      // room-outline ASCII
```

## Rogue.Grid — Cell & Node API

```js
Rogue.Grid.cellAt(i, j);          // cell object at (row, col)
Rogue.Grid.nodeAt(i, j);          // node at intersection
Rogue.Grid.getSize();             // { w, h }
Rogue.Grid.getCellInfo(cell);     // { occupied, type, hp, name }
Rogue.Grid.getCellContents(i, j); // same by row+col
Rogue.Grid.cellDistance(c1, c2);  // Manhattan distance
Rogue.Grid.dump();                // ASCII map (@=hero M=mob !=clue)
Rogue.Grid.dumpNodes();           // node grid structure
```

## Rogue.Room — Room Inspection

```js
Rogue.Room.getAll();            // room array
Rogue.Room.getById(id);         // room by index
Rogue.Room.getAt(cell|i,j);     // room containing cell
Rogue.Room.getHeroRoom();       // hero's current room
Rogue.Room.getVisited();        // visited room array
Rogue.Room.isCorridor(room);    // narrow passage?
Rogue.Room.isDeadEnd(room);     // only 1 door?
Rogue.Room.getDoors(room);      // [{ roomId, edge, cell, price }]
Rogue.Room.dump(room);          // full details object
Rogue.Room.printAll();          // labeled ASCII listing
```

## Rogue.Ability — Stock & Ability System

```js
Rogue.Ability.getStock();       // current stock
Rogue.Ability.setStock(n);      // clamped to max
Rogue.Ability.addStock(n);      // increment clamped
Rogue.Ability.consume(n);       // true if had enough
Rogue.Ability.getMax();         // from difficulty settings
Rogue.Ability.onChange(fn);     // watch stock changes
```

### Register Custom Ability
```js
Rogue.Ability.registerAbility(69, {  // E key
  label: 'Fireball',
  cost: 2,
  onActivate: function(game) { }
});
```

## Rogue.UI — Canvas Panel Builders

These build `openfl.display.Sprite` trees in the game's own display list —
not DOM. `panel()`/`overlay()` return a Sprite that tracks its own layout, so
each `button()`/`description()`/`prompt()` call stacks the next element
underneath the last and grows the panel to fit.

```js
var ov = Rogue.UI.overlay('Title', 'Body text', 460);  // full-screen dim overlay + centered panel (width optional, default 460), auto-added to the scene
Rogue.UI.button('Label', ov.__panel, onClick);    // game-styled clickable button, stacked into the panel
Rogue.UI.description('Text', ov.__panel);         // centered subtitle text, stacked into the panel
Rogue.UI.prompt('Click to close...', ov.__panel); // small centered prompt text, stacked into the panel
Rogue.UI.label('◈ SECTION', ov.__panel, 0x00FFFF);// left-aligned section header (not centered), optional color
Rogue.UI.stack(mySprite, ov.__panel, height);     // stack an arbitrary pre-built DisplayObject into the panel's layout
Rogue.UI.dismiss(ov);                             // removes the overlay/panel from its parent

var input = Rogue.UI.textInput('default', ov.__panel, width, onUpdate);
// real canvas text field (native Text.input() — TextField type=INPUT, OS-level
// editing, "change" event), not a custom keyboard handler. input.get_text() to read.

var row = Rogue.UI.cycle('Theme', ['Default','Amber','Teal','Crimson'], 0, ov.__panel, function(value, idx) { });
// "‹ value ›" row that advances through options on click — canvas equivalent
// of a <select> for short option lists. row.__getIdx()/row.__getValue() to read.

Rogue.UI.panel('Title', 'Body text', width);      // just the panel Sprite, not added to anything
Rogue.UI.gameWindow('Title', 'Text', onClose);    // native game window
Rogue.UI.toast('Message', 2.0);                   // temporary overlay
```

All of the above build `openfl.display.Sprite`/`TextField` trees in the
current scene's own display list — never DOM. See `Dev-Tools/skills/SKILL.md`
("Canvas vs. DOM") for the two CenteredText/Text.get gotchas to know about
before adding new labels.

## Rogue.Registry — Data-Driven Definitions

```js
Rogue.Registry.mob('spider', { hp: 3, damage: 2, visual: 's', behavior: 'chasing' });
Rogue.Registry.ability('fireball', { keyCode: 69, cost: 2, onActivate: fn });
Rogue.Registry.encounter('spider_nest', { mobs: ['spider'], count: [2,3], roomSize: 'large' });
Rogue.Registry.spawn('spider', game, 3);
Rogue.Registry.item('heal_pot', { label: '!', color: 0xFF0000, onPickup: fn });
Rogue.Registry.spell('fire', { keyCode: 70, cost: 1, onActivate: fn });
```

## Rogue.Util — Helpers

```js
Rogue.Util.cls('com.watabou.sevendrl.SevenDRL');  // resolve Haxe class
Rogue.Util.getGame();                               // current SevenDRL instance
Rogue.Util.getScene();                              // current GameScene
Rogue.Util.getHero();                               // current Hero
Rogue.Util.log('message');                          // add to event log
Rogue.Util.random.float();                          // [0, 1)
Rogue.Util.random.int(max);                         // [0, max)
Rogue.Util.random.pick(arr);                        // random element
Rogue.Util.tween(duration, fn);                     // async animation
Rogue.Util.isAvailable(name);                       // class exists?
```

## Rogue.cleanup — Reset State

```js
Rogue.cleanup(preserveStock);  // Removes leftover dev-only DOM ids, resets globals
```
Most in-game UI is canvas now (Rogue.UI), so this only needs to clean up the
handful of things still genuinely DOM: the spawn-mode indicator, the
view-mode `<canvas>` overlay wrapper, and the legacy `rogue-encounter-ui` id.
Canvas content cleans itself up automatically — it's added as a child of the
current scene, so it goes away when the scene is replaced/reset, same as any
other display-list child.

Automatically called on `GameScene.reset` (as a before-hook).
