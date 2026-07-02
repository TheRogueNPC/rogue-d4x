# Workflow: Add a New Mob

`modules/core/characters.js` is a read-only reference mirror of `SevenDRL.js`
— editing it does **nothing at runtime** (see `SYSTEM_MAP.md`). Real mobs are
added as a live `Dev-Tools/mods/*.js` file. Two ways to do it, easiest first.

## Prerequisites
- Read `modules/IN_OUT_GLOSSARY.md` §3 (Character Spawning) for the spawn pipeline
- Game running, click canvas to activate globals (`Rogue` namespace ready)

## Option A — `Rogue.Mob.define()` (fastest, covers most cases)

```js
Rogue.Mob.define({
    name: 'Imp',
    hp: 3,
    visual: 'i',
    color: 0xFF8800,
    info: 'A small fiery imp.',
    damage: 2,
    state: 'chasing',                 // 'wandering' (default) | 'chasing'
    onChase: function(hero) { },       // override chase transition
    onEngage: function(hero) { },      // override attack
    onSight: function(hero) { },       // hero enters FOV
    onDamage: function(value) { },     // takes damage
    onDeath: function() { },           // dies
    extras: { /* extra prototype methods */ }
});

// Spawn it:
var Imp = window['com.watabou.sevendrl.characters.Imp'];
Rogue.Mob.spawn(Imp, game, 3);          // 3 of them, random unseen cells
// or, via the Encounter system, automatically on room entry — see add-encounter.md
```

Full option reference: `rogue-api.md` → `Rogue.Mob`.

## Option B — hand-write the class (full control, e.g. custom AI)

Copy `Dev-Tools/mods/add_mob_phantom.js` (a working, tested template) and
adapt it. Key points it gets right that are easy to get wrong by hand:

```js
(function() {
    'use strict';
    var Mob = ModLoader.resolve('com.watabou.sevendrl.characters.Mob');

    var YourMob = function(game, pos) {
        this.hp = 3;                 // SWAP POINT: HP
        Mob.call(this, game, pos);
        this.wander();               // initial AI state
    };
    YourMob.__name__ = "com.watabou.sevendrl.characters.YourMob";
    YourMob.__super__ = Mob;
    // Object.create(), NEVER $extend() — $extend/$hxClasses are scoped
    // inside SevenDRL.js's own IIFE; referencing either bare from a mod
    // file throws ReferenceError. See modding.md / SKILL.md.
    YourMob.prototype = Object.create(Mob.prototype);
    YourMob.prototype.createSprite = function() {
        this.sprite = new (ModLoader.resolve('com.watabou.sevendrl.visuals.CharacterSprite'))(this, "Y", false);
        this.sprite.tf.set_textColor(0xFF0000);
    };
    YourMob.prototype.getName = function() { return "your mob name"; };
    YourMob.prototype.getInfo = function() { return "Description shown in info popup."; };
    // Optional overrides: act(), die(), damage(value)
    YourMob.prototype.__class__ = YourMob;
    window['com.watabou.sevendrl.characters.YourMob'.replace(/\./g, '_')] = YourMob;

    // Register into the spawn pipeline:
    ModLoader.hook('com.watabou.sevendrl.SevenDRL', 'spawnMobs', null, function() {
        var mob = new YourMob(this, this.plan.randomCell());
        this.addCharacter(mob);
    });

    if (window.devLog) window.devLog('[mod:your-mob] loaded');
})();
```

### Custom AI state

For AI beyond wander/chase, create a class extending `State`
(`modules/core/states.js` for reference — same Object.create rule applies):

```js
var StateChasing = ModLoader.resolve('com.watabou.sevendrl.characters.StateChasing');
var YourState = function(mob, target) { StateChasing.call(this, mob, target); };
YourState.__super__ = StateChasing;
YourState.prototype = Object.create(StateChasing.prototype);
YourState.prototype.act = function() {
    // your AI logic — return true if the mob's turn is done
    return false;
};
YourState.prototype.__class__ = YourState;
```

`Dev-Tools/mods/zombies.js` is a second working, currently-active reference
for this exact pattern (custom `ZombieChasing` state + `Zombie` mob).

## Sound effects (optional)

Call `window.com_watabou_sevendrl_Sounds.event("your_sound_id")` from your
mob's `act()`/`die()`. Add the `.ogg` to `assets/` and register it — see
`modules/IN_OUT_GLOSSARY.md` §1.

## Test

Refresh the browser (Ctrl+Shift+R). Check the dev console for load errors;
`DBG.mobs()` lists everything currently spawned.

## Reference
- `Dev-Tools/mods/add_mob_phantom.js` — working hand-written template
- `Dev-Tools/mods/zombies.js` — working custom-AI-state example
- `rogue-api.md` → `Rogue.Mob` — the high-level API
- `modules/IN_OUT_GLOSSARY.md` §3 — spawn pipeline, §7 — event signals
