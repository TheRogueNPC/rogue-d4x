// ═══════════════════════════════════════════════════════════════════
// MOD: add-scene.js — Add a new game screen/scene
// Follows the same pattern as TitleScene/VictoryScene/DeathScene.
//
// To insert into the scene chain:
//   - Set this.nextScene = ... in the constructor
//   - Redirect an adjacent scene's nextScene by hooking its 'activate'
//     method (NOT 'constructor' — ModLoader can't intercept actual
//     instantiation by patching prototype.constructor; that property is
//     just a self-reference, not what `new Cls()`/Type.createInstance
//     calls. 'activate' runs once per instance right after construction,
//     always before the player can click to advance — see title-menu.js
//     for this exact pattern in production use.)
// ═══════════════════════════════════════════════════════════════════

(function() {
    'use strict';

    // ╔══ EXTENSION POINT: Custom Scene Template ─────────────────────
    // ║ Uncomment and adapt to create your own scene.
    // ║ Pattern: define class (Object.create, NOT $extend — see modding.md)
    // ║          → register → hook an adjacent scene's 'activate'
    // ╚════════════════════════════════════════════════════════════════

    /*
    // ── 1. Define the scene class (extends TextScene) ─────────────
    var TextScene = ModLoader.resolve("com.watabou.sevendrl.scenes.TextScene");
    var TitleScene = ModLoader.resolve("com.watabou.sevendrl.scenes.TitleScene");

    var MyScene = function() {
        TextScene.call(this);
        this.setTitle("My Custom Scene");
        this.setText("This is a custom scene added via mod.");
        // Target: where does the player go on click?
        this.nextScene = TitleScene;
    };
    MyScene.__name__ = "com.watabou.sevendrl.scenes.MyScene";
    MyScene.__super__ = TextScene;
    MyScene.prototype = Object.create(TextScene.prototype);
    MyScene.prototype.__class__ = MyScene;
    window.com_watabou_sevendrl_scenes_MyScene = MyScene;

    // ── 2. Insert into the transition chain ─────────────────────
    // Example: Make VictoryScene go to MyScene instead of TitleScene
    ModLoader.after('com.watabou.sevendrl.scenes.VictoryScene', 'activate', function() {
        this.nextScene = MyScene;
    });
    */

    // ╔══ EXAMPLE: Insert a "Loading..." screen between Title and Game ──
    // ║ Uncomment to activate:
    // ╚════════════════════════════════════════════════════════════════════
    /*
    var TextScene2 = ModLoader.resolve("com.watabou.sevendrl.scenes.TextScene");
    var GameScene = ModLoader.resolve("com.watabou.sevendrl.scenes.GameScene");

    var LoadingScene = function() {
        TextScene2.call(this);
        this.setTitle("Loading...");
        this.setText("Preparing the dungeon...");
        this.nextScene = GameScene;
    };
    LoadingScene.__name__ = "com.watabou.sevendrl.scenes.LoadingScene";
    LoadingScene.__super__ = TextScene2;
    LoadingScene.prototype = Object.create(TextScene2.prototype);
    LoadingScene.prototype.__class__ = LoadingScene;
    window.com_watabou_sevendrl_scenes_LoadingScene = LoadingScene;

    // Hook: TitleScene → LoadingScene instead of directly to GameScene
    ModLoader.after('com.watabou.sevendrl.scenes.TitleScene', 'activate', function() {
        this.nextScene = LoadingScene;
    });
    */

    if (window.devLog) window.devLog('[mod:add-scene] loaded — template ready (uncomment to activate)');
})();
