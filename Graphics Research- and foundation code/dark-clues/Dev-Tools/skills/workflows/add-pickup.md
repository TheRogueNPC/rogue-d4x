# Workflow: Add a Collectible Pickup Item

There's no separate "Item" or "Pickup" base class in the engine, and adding
one means a new `Action` subclass plus hooking `Hero.target()`'s branching
logic — real work for no benefit. The proven shortcut, used by
`ability-pickup.js`'s chess pieces: build your pickup class via
**`Object.create(Clue.prototype)`** so `instanceof Clue` is true. The native
`ActionCollect` action (and `Hero.target()`'s branch that creates it) already
auto-detects anything that passes that check — no new Action class, no
`Hero.target()` patching, nothing else to wire up.

## Steps

### 1. Define the pickup class

```js
var Clue = ModLoader.resolve('com.watabou.sevendrl.characters.Clue');
var CharacterSprite = ModLoader.resolve('com.watabou.sevendrl.visuals.CharacterSprite');

var HealthPotion = function(game, pos) {
    Clue.call(this, game, pos);
};
HealthPotion.__name__ = 'com.watabou.sevendrl.characters.HealthPotion';
HealthPotion.__super__ = Clue;
HealthPotion.prototype = Object.create(Clue.prototype);
HealthPotion.prototype.__class__ = HealthPotion;

HealthPotion.prototype.createSprite = function() {
    this.sprite = new CharacterSprite(this, '!');     // map glyph
    this.sprite.tf.set_textColor(0xFF4444);
    this.sprite.setScale(0.8);
};
HealthPotion.prototype.blocks = function() { return false; }; // walkable, not a wall
HealthPotion.prototype.getInfo = function() { return 'A small vial of healing draught.'; };

// collect() replaces Clue's default "add to discovered clues" behavior —
// override it completely with your own effect:
HealthPotion.prototype.collect = function() {
    var hero = this.game.hero;
    hero.hp = Math.min(hero.hp + 2, hero.maxHP);
    if (hero.hpChanged) hero.hpChanged.dispatch(hero.hp);
    if (window.__eventLogAdd) window.__eventLogAdd('Picked up a Health Potion (+2 HP)');
    this.sprite.despawn();
    this.game.queue.splice(this.game.queue.indexOf(this), 1);
};
```

### 2. Spawn it into the dungeon

Hook `spawnClues` (already runs once per level) rather than inventing a new
spawn pass:

```js
ModLoader.after('com.watabou.sevendrl.SevenDRL', 'spawnClues', function() {
    var AE = window.com_watabou_utils_ArrayExtender;
    var cells = AE.difference(this.cells, this.hero.getFOV())
        .filter(function(c) { return c !== this.hero.pos && !this.getChar(c); }, this);
    if (!cells.length) return;
    var pos = AE.random(cells);
    var potion = new HealthPotion(this, pos);
    potion.setPos(pos);
    this.queue.push(potion);
    if (window.devLog) window.devLog('[health-potion] spawned 1');
});
```

### 3. Give it a HUD presence (optional)

If it's a counted resource rather than instant-effect (like the chess-piece
charges), see `add-ability.md`'s "Option B" and extend `hud-bars.js`'s
`(Charge):` row, or add your own row via `Rogue.UI`.

### 4. Test

Reload, walk onto the glyph, confirm the effect fires and the entity
despawns. `DBG.mobs()`/`Rogue.Grid.dump()` to confirm it actually spawned if
it's not showing up.

## Reference
- `Dev-Tools/mods/ability-pickup.js` — the real, working multi-type version
  this pattern is extracted from (per-type charges, canvas aim/indicator UI)
- `Dev-Tools/mods/add-pickup.js` — minimal single-effect template (this doc, as a file)
- `add-ability.md` — if the pickup grants a usable ability rather than an instant effect
