# Workflow: Add a New Scene (Live Editing)

## Prerequisites
- `add-scene.js` loaded (uncomment in manifest.js)
- Game running, click canvas to activate globals

## CRITICAL

**`$hxClasses` does NOT exist on window.** It's scoped inside SevenDRL.js's
IIFE. Trying `$hxClasses["..."] = MyScene` throws ReferenceError.

Instead, just assign to `window` directly using the flattened name:

```js
// WRONG — ReferenceError (inside strict IIFE):
$hxClasses["com.watabou.sevendrl.scenes.MyScene"] = MyScene;

// RIGHT — assign to window directly:
window.com_watabou_sevendrl_scenes_MyScene = MyScene;
```

The `__name__`, `__super__`, and `prototype` assignments work the same way
since they're properties of the function object, not `$hxClasses`.

## Steps

### 1. Define the scene class

```js
(function() {
    'use strict';

    var TextScene = ModLoader.resolve("com.watabou.sevendrl.scenes.TextScene");
    if (!TextScene) { devLog("[my-scene] TextScene not available"); return; }

    var MyScene = function() {
        TextScene.call(this);
        this.setTitle("My Custom Scene");
        this.setText("This scene was added via live mod.");
        this.nextScene = ModLoader.resolve("com.watabou.sevendrl.scenes.TitleScene");
    };

    // Register on window (NOT $hxClasses — that's IIFE-local!)
    var flatName = "com.watabou.sevendrl.scenes.MyScene".replace(/\./g, '_');
    window[flatName] = MyScene;
    MyScene.__name__ = "com.watabou.sevendrl.scenes.MyScene";
    MyScene.__super__ = TextScene;
    MyScene.prototype = Object.create(TextScene.prototype);
    MyScene.prototype.constructor = MyScene;

    // ╔══ 2. Insert into the transition chain ────────────────────
    // NOT 'constructor' — ModLoader patches cls.prototype[method], and
    // prototype.constructor is just a self-reference; reassigning it has
    // zero effect on what `new VictoryScene()`/Type.createInstance actually
    // calls. 'activate' is a real method that runs once per instance right
    // after construction (switchSceneImp: construct → addChild → layout →
    // activate()), always before the player can click — same pattern
    // title-menu.js uses in production.
    ModLoader.after("com.watabou.sevendrl.scenes.VictoryScene", "activate",
        function() { this.nextScene = MyScene; }
    );

    devLog("[my-scene] loaded");
})();
```

### 2. Register in manifest

Add to `Dev-Tools/mods/manifest.js`:

```
"/Dev-Tools/mods/my-scene.js",
```

### 3. Hard refresh

Ctrl+Shift+R.

### 4. For interactive scenes (extending Scene, not TextScene)

`TextScene` is text-only (title/body/click-to-continue). For a fully
interactive scene, extend the base `Scene` class directly and build your own
canvas UI from it (see `Dev-Tools/skills/SKILL.md`'s "Canvas vs. DOM" — this
is in-game-world UI, so build it with `Rogue.UI`/native visuals classes, not
DOM):

```js
var Scene = ModLoader.resolve("com.watabou.coogee.Scene");
var GameScene = ModLoader.resolve("com.watabou.sevendrl.scenes.GameScene");

var MyInteractiveScene = function() {
    Scene.call(this);
    this.nextScene = GameScene;

    // Canvas UI — same Text.get/CenteredText/Style the rest of the game uses
    this.tfLabel = window.com_watabou_coogee_ui_utils_Text.get(
        "Interactive Scene", window.com_watabou_sevendrl_Style.formatTitle
    );
    this.addChild(this.tfLabel);
};
```

## Scene Transition Chain

```
TitleScene → GameScene → VictoryScene → TitleScene
                      → DeathScene → TitleScene
```

To insert your scene, hook `VictoryScene` or `DeathScene` constructor and set
`this.nextScene = YourScene`.

## Reference
- `Dev-Tools/mods/add-scene.js` — template scene mod
- `ModLoader.inspect("com.watabou.sevendrl.scenes.GameScene")` — methods + hierarchy
- `modules/IN_OUT_GLOSSARY.md` §2 (Scene Flow) — transition diagram