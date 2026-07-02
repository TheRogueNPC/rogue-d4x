# Workflow: Add a Canvas UI Panel/Screen

Per `SYSTEM_MAP.md`'s "Canvas vs. DOM" rule: any UI the player sees during a
run is canvas, built on `Rogue.UI` (`rogue-api.js`) — never
`document.createElement`. This covers the common case: a panel attached to
the current scene with some buttons/text/inputs in it (a settings screen, an
info popup, a custom menu). For a fully separate game *screen* (a new
`Scene` subclass entirely), see `add-scene-live.md` instead — that's about
scene transitions; this is about content *within* a scene.

## Steps

### 1. Build a full-screen modal (most common case)

```js
var ov = Rogue.UI.overlay('My Panel', 'Some body text.', 400); // title, body, width (all optional)
Rogue.UI.button('Do the thing', ov.__panel, function() {
    // ...
    Rogue.UI.dismiss(ov);
});
Rogue.UI.button('Cancel', ov.__panel, function() { Rogue.UI.dismiss(ov); });
```
`overlay()` dims the whole screen and centers the panel, auto-attaches to
the current scene. `ov.__panel` is what every other `Rogue.UI` helper
stacks content into — each call advances the panel's internal layout and
grows its background to fit. See `rogue-api.md` for the full list:
`button`/`description`/`prompt`/`label`/`stack`/`textInput`/`cycle`.

### 2. Or a non-modal panel (HUD-style, no dimming)

```js
var panel = Rogue.UI.panel('Status', null, 240);
Rogue.UI.description('Always-visible info', panel);
panel.set_x(8); panel.set_y(8);
scene.addChild(panel); // scene = Rogue.Util.getScene() or your hook's `this`
```
`panel()` alone (not wrapped in `overlay()`) gives you just the Sprite — no
dim background, no auto-attach. This is the pattern `hud-bars.js` would use
if it depended on `Rogue.UI` (it predates it and uses the native
`Indicator`/`StatePin` classes directly instead — see `API_REFERENCE.md` if
you want that lower-level route for performance-sensitive always-on HUD).

### 3. Custom content beyond the standard helpers

`Rogue.UI.stack(displayObject, parent, height)` drops any pre-built
`Sprite`/`TextField` into a panel's layout flow — use it for things the
standard helpers don't cover (a custom-drawn row, an embedded mini-grid,
etc.). See `title-menu.js`'s character-card row or `char-creator.js`'s
glyph-picker grid for worked examples of building bespoke content this way.

### 4. Showing/hiding based on context

If your panel needs different "Back"/"Close" behavior depending on where it
was opened from (the title screen vs. mid-game), accept a callback rather
than hardcoding the next screen — see how `pause-menu.js`'s
`showOptions(onBack)` lets `title-menu.js` and the in-game pause menu share
one Options screen with different "Back" targets.

### 5. Lifecycle — you don't need to clean up manually

Canvas content added via `scene.addChild(...)` is destroyed automatically
when the scene resets/switches, same as the native health bar. No
`Rogue.cleanup()` entry needed unless you're building genuine DOM (dev
tooling only — see the rule again).

### 6. Test

Open it from a button/hook, click through every interactive element,
confirm it tears down correctly on the next `GameScene.reset`/scene switch
(it should just disappear — if it doesn't, you probably attached it to
`document.body` instead of `scene`).

## Reference
- `rogue-api.md` → `Rogue.UI` — full method list
- `Dev-Tools/mods/title-menu.js` — overlay + button + conditional content (Continue button)
- `Dev-Tools/mods/char-creator.js` — textInput, cycle, custom grid content (`Rogue.UI.stack`)
- `Dev-Tools/mods/pause-menu.js` — `onBack` callback pattern, shared screens
- `Dev-Tools/skills/SYSTEM_MAP.md` — "Canvas vs. DOM" rule and the two CenteredText/Text.get gotchas
