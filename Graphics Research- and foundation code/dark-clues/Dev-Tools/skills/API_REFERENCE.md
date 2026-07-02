# API Reference — Lime / OpenFL / coogee / sevendrl-visuals

The curated, practical subset of the engine's API surface that mods
actually use. This is NOT the full class list — for that, see `GLOSSARY.md`
(510 compiled classes with file:line). Every signature below was read
directly out of `SevenDRL.js`, not guessed.

All classes here live inside `SevenDRL.js`'s IIFE and only appear on
`window` after `lime.embed()` runs — see `SYSTEM_MAP.md`'s boot sequence
and `modding.md`'s class-resolution rule before using any of this.

## openfl.display.Sprite — the display-list building block

Every canvas UI element in this codebase (`Rogue.UI` panels/buttons,
`Indicator`, `StatePin`, `CardIndicator`, your own custom widgets) is a
`Sprite` or a `Sprite` subclass. Core methods used throughout:

```js
var s = new window.openfl_display_Sprite();

s.addChild(child);                  // append to display list
s.removeChild(child);
s.removeChildAt(index);
s.getChildAt(index);
s.get_numChildren();
s.set_x(n); s.get_x();
s.set_y(n); s.get_y();
s.set_visible(bool); s.get_visible();
s.set_width(n); s.get_width();      // bounding-box width (children-derived unless graphics drawn)
s.set_height(n); s.get_height();
s.set_alpha(n);                     // 0..1
s.set_scaleX(n); s.set_scaleY(n);
s.parent;                            // read-only ref to parent DisplayObject, or null
s.get_graphics();                    // → Graphics (see below)
s.addEventListener(type, fn);        // "click", "mouseover", "mouseout" all work on Sprites
s.removeEventListener(type, fn);
s.dispatchEvent(event);
```

`mouseEnabled`/`mouseChildren` (plain properties, not getter/setters) gate
whether a Sprite receives mouse events at all — `CenteredText` sets
`mouseEnabled = false` on itself in its constructor, which is why a click
listener on a *row* Sprite needs its own `graphics`-drawn hit area (see
`rogue-api.js`'s `Rogue.UI.cycle()` for the pattern: a near-invisible
`beginFill(0x000000, 0.001)` rect gives the whole row a clickable bounds).

## openfl.display.Graphics — drawing

Obtained via `sprite.get_graphics()`. Always call `.clear()` before
redrawing if you're changing an existing sprite's look (see `StatePin.on()`,
`Unit.on()` in `modules/core/visuals.js` for the canonical clear-and-redraw
pattern used for state changes).

```js
var g = sprite.get_graphics();
g.clear();
g.beginFill(color, alpha);                 // alpha optional, default 1
g.beginGradientFill(type, colors, alphas, ratios, matrix, spreadMethod, interpolationMethod, focalPointRatio);
g.lineStyle(thickness, color, alpha, pixelHinting, scaleMode, caps, joints, miterLimit); // only thickness/color/alpha typically needed
g.drawRect(x, y, width, height);
g.drawRoundRect(x, y, width, height, ellipseWidth, ellipseHeight);
g.drawCircle(x, y, radius);
g.moveTo(x, y);
g.lineTo(x, y);
```

Colors are plain ints (`0xRRGGBB`), not CSS strings — `0x111122`, not
`"#111122"`.

## openfl.text.TextField / TextFormat — text

Two ways to get a text field, both built on `TextField` underneath:

```js
// Plain label — com.watabou.coogee.ui.utils.Text.get()
var tf = window.com_watabou_coogee_ui_utils_Text.get(text, format, onUpdate, onFinish);
// → calls set_autoSize(1) (LEFT) for you, but ALSO calls set_htmlText(text) —
//   "<Skill>" gets parsed as an unknown HTML tag and silently dropped.
//   Safe for plain words ("Power"); NOT safe for text containing < or >.

// Real text INPUT field (focusable, OS-level editing)
var input = window.com_watabou_coogee_ui_utils_Text.input(text, format, onUpdate);
// → TextField with type=INPUT, border+background on, fires "change".
//   This is what Rogue.UI.textInput() wraps — see rogue-api.md.

// com.watabou.sevendrl.visuals.CenteredText — auto-centering, NO htmlText risk
var ct = new window.com_watabou_sevendrl_visuals_CenteredText(text, format);
ct.setWidth(maxWidth);   // ALWAYS call this — see "Canvas vs DOM" in SKILL.md.
                          // Without it, CenteredText keeps OpenFL's default
                          // ~100x100 TextField box instead of sizing to text.
```

Raw `TextField` methods used by the above (rarely need these directly):

```js
tf.set_text(str);            // plain text, no HTML parsing
tf.set_htmlText(str);        // parses basic HTML — avoid for arbitrary strings
tf.set_defaultTextFormat(format);
tf.set_autoSize(mode);        // 0=NONE, 1=LEFT (shrink to fit), 2=NONE (lock current size)
tf.set_wordWrap(bool);
tf.set_selectable(bool);
tf.set_type(mode);            // 0=DYNAMIC (read-only), 1=INPUT (editable)
tf.set_border(bool); tf.set_borderColor(color); tf.set_background(bool);
tf.get_numLines();
tf.get_textWidth(); tf.get_width(); tf.get_height();
```

`TextFormat` constructor (build your own if `Style.formatXxx` doesn't fit):

```js
new window.openfl_text_TextFormat(fontName, size, color, bold, italic, underline, url, target, align);
// Or via the helper that resolves a registered font id first:
window.com_watabou_coogee_ui_utils_Text.format(fontId, size, color);
// fontId: "default" or "mono" — see Style.js's own usage
```

Existing formats, ready to use — `window.com_watabou_sevendrl_Style`:
`formatTitle` (40pt), `formatToast` (36pt), `formatText` (24pt),
`formatService` (18pt). All gold/cream colored by default; override per-field
with `tf.set_textColor(0xRRGGBB)`.

## openfl.events.MouseEvent

```js
new window.openfl_events_MouseEvent(type, bubbles, cancelable, localX, localY, relatedObject, ctrlKey, altKey, shiftKey, buttonDown, delta, commandKey, clickCount);
// In practice only `type` and `bubbles` matter for synthetic testing:
sprite.dispatchEvent(new window.openfl_events_MouseEvent('click', false));
```
Pass `bubbles: false` for synthetic test dispatches — `true` bubbles all the
way to the Stage, where a known pre-existing native listener bug can throw
(tracked separately, unrelated to your code; see `debugging.md`).

## Sound — openfl.media.SoundTransform / SoundMixer, com.watabou.sevendrl.Sounds

```js
// Per-channel volume (used for ambient/BGM):
var ch = window.com_watabou_sevendrl_Sounds.enviroChannel;
if (ch) ch.set_volume(0.5);   // 0..1

// Global mixer volume (used for SFX):
var st = new window.openfl_media_SoundTransform(0.5);
window.openfl_media_SoundMixer.set_soundTransform(st);

// Playing a registered sound by asset id:
window.com_watabou_sevendrl_Sounds.event(id, volume, pitchOffset);
```
See `modules/IN_OUT_GLOSSARY.md` §1 ("Sounds") for the full asset-id table
and how to register a new `.ogg` file.

## openfl.utils.Assets — asset loading

```js
window.openfl_utils_Assets.exists(id, type);
window.openfl_utils_Assets.getFont(id, useCache);
window.openfl_utils_Assets.getSound(id, useCache);
window.openfl_utils_Assets.getText(id);            // synchronous text asset read
window.openfl_utils_Assets.getBitmapData(id, useCache);
window.openfl_utils_Assets.loadText(id);            // async, returns a Future
window.openfl_utils_Assets.loadBitmapData(id, useCache);
```
This game has no live PNG/SVG character-portrait loading wired up anywhere
yet (see `play.js`'s character-card comment) — `loadBitmapData`/`Loader`
would be the entry point if you build that.

## com.watabou.processes.Tweener — animation

```js
window.com_watabou_processes_Tweener.run(durationSeconds, function(e) {
    // e goes 0 → 1 linearly over durationSeconds; you supply the easing
    var eased = e * e * (3 - 2 * e); // smoothstep, the convention used everywhere in this codebase
    sprite.set_alpha(eased);
}).onComplete(function() {
    // optional
});
```

## com.watabou.utils.Random — seeded PRNG

```js
window.com_watabou_utils_Random.int(min, max);   // [min, max)
window.com_watabou_utils_Random.int0(max);       // [0, max)
window.com_watabou_utils_Random.float();         // [0, 1)
window.com_watabou_utils_Random.bool(chance);    // true with probability `chance` (0..1)
window.com_watabou_utils_Random.roll(n);         // 1..n, like a die
```
There is **no** `Random.Int(max)` (capital I) — that's a common wrong guess;
see `debugging.md`.

## com.watabou.utils.ArrayExtender — array helpers

```js
var Arr = window.com_watabou_utils_ArrayExtender;
Arr.pick(a);            // random element
Arr.random(a);          // alias of pick
Arr.shuffle(a);          // in-place shuffle
Arr.weighted(a, weights);// pick one element by weight array
Arr.first(a); Arr.last(a);
Arr.sum(a); Arr.map(a, f);
Arr.difference(a, b); Arr.intersect(a, b); Arr.union(a, b);
```

## com.watabou.coogee — the engine layer underneath SevenDRL

```js
window.com_watabou_coogee_Game.scene;             // current active Scene instance
window.com_watabou_coogee_Game.switchScene(Cls);  // ALWAYS constructs a fresh instance — see SYSTEM_MAP.md
window.com_watabou_coogee_Game.instance;          // the Game/Main singleton itself

// Scene base class — activate()/deactivate() wire the per-frame update tick
// and keyDown/keyUp listeners. TextScene.activate() additionally adds the
// stage-wide "click to advance" listener — title-menu.js intentionally
// skips that by calling Scene.prototype.activate.call(this) directly.
window.com_watabou_coogee_Scene.prototype.activate;
window.com_watabou_coogee_Scene.prototype.deactivate;
window.com_watabou_coogee_Scene.prototype.layout;   // override per-scene; called on resize + scene entry
```

## sevendrl visuals — canvas-native UI building blocks

Fully documented with constructor/method signatures and inline rationale in
`modules/core/visuals.js` (read that file directly — it's commented for
exactly this purpose). Quick index of what exists, so you don't reinvent it:

| Class | What it is | Used by |
|---|---|---|
| `Indicator` + `Unit` | Row of colored on/off rectangles, `l2r` direction baked in at construction | health/armor/clues bars, `hud-bars.js` |
| `CardIndicator` + `StatePin` | Label + row of glow-fade pins | native "Power" card display, `hud-bars.js`'s Skill row |
| `CenteredText` | Auto-sizing centered text (needs `setWidth()` — see above) | almost everything |
| `AsciiSprite` / `CharacterSprite` | Single-glyph sprite with move/engage animations | map entities |
| `Toast` | Self-dismissing fading message | `scene.out(msg)` |
| `Window` | Modal popup with title/body/click-to-close, dispatches a `click` signal | `scene.showWindow(title, text)` |
| `Fader` | Full-screen fade in/out overlay | every scene transition |

For building NEW canvas UI, prefer `Rogue.UI` (`rogue-api.md`) over these
directly — it's a thinner, more ergonomic layer built on top of exactly
these classes plus `Sprite`/`Graphics` from this doc.
