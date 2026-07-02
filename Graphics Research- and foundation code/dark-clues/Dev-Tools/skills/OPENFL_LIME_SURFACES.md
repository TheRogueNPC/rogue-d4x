# OpenFL & Lime Surfaces — Complete API Exposure

This document comprehensively exposes every OpenFL and Lime class available in
SevenDRL.js, organized by subsystem. Use this when the higher-level
`API_REFERENCE.md` doesn't have what you need.

---

## Overview

SevenDRL.js compiles Haxe code that includes:
- **OpenFL** — the rendering framework (display, events, text, geom, media)
- **Lime** — the low-level platform abstraction (app, graphics, audio, math, formats)

Both are available on `window` after `lime.embed()` runs, with flattened class names:
- `openfl_display_Sprite` (not `openfl.display.Sprite`)
- `lime_app_Application` (not `lime.app.Application`)
- Etc.

Total: **100+ classes** available for direct use or subclassing.

---

## Display & Rendering (openfl.display)

### Core Classes

| Class | Purpose | How to use |
|---|---|---|
| `openfl_display_Sprite` | Graphical object, display tree node | `new window.openfl_display_Sprite()` |
| `openfl_display_DisplayObject` | Base for all display objects | Subclass for custom objects |
| `openfl_display_DisplayObjectContainer` | Base for objects with children | Subclass for custom containers |
| `openfl_display_Graphics` | Drawing API (shapes, fills, lines) | `sprite.get_graphics()` |
| `openfl_display_Bitmap` | Raster image wrapper | `new window.openfl_display_Bitmap(bitmapData)` |
| `openfl_display_BitmapData` | Pixel buffer | `window.openfl_utils_Assets.getBitmapData(id)` |

### Sprite Methods (Frequently Used)

```js
var sprite = new window.openfl_display_Sprite();

// Display tree manipulation
sprite.addChild(child);                   // add to tree
sprite.removeChild(child);                // remove from tree
sprite.getChildAt(index);                 // get child
sprite.get_numChildren();                 // child count

// Position and scale
sprite.set_x(n);   sprite.get_x();
sprite.set_y(n);   sprite.get_y();
sprite.set_width(n);   sprite.get_width();
sprite.set_height(n);   sprite.get_height();
sprite.set_scaleX(n);  sprite.set_scaleY(n);
sprite.set_rotation(radians);

// Visibility and alpha
sprite.set_visible(bool);   sprite.get_visible();
sprite.set_alpha(0..1);     sprite.get_alpha();

// Hit testing
sprite.set_mouseEnabled(bool);
sprite.set_mouseChildren(bool);
sprite.get_bounds(targetCoordSpace);
sprite.hitTestPoint(x, y, useShapeHitTest);

// Graphics
sprite.get_graphics();    // → Graphics object

// Events
sprite.addEventListener(type, fn);   // "click", "mouseover", "mouseout", "mousedown", "mouseup"
sprite.removeEventListener(type, fn);
sprite.dispatchEvent(event);

// Parenting
sprite.parent;            // read-only
sprite.root;              // read-only, top of tree
```

### Graphics Methods (Drawing)

```js
var g = sprite.get_graphics();

// Fills and lines
g.beginFill(color, alpha);                 // solid fill
g.beginGradientFill(type, colors, alphas, ratios, matrix);
g.lineStyle(thickness, color, alpha);      // line width/color/transparency
g.endFill();
g.clear();                                 // erase all drawing

// Shapes
g.drawRect(x, y, width, height);
g.drawRoundRect(x, y, width, height, ellipseW, ellipseH);
g.drawCircle(x, y, radius);
g.drawEllipse(x, y, width, height);
g.drawPolygon(points);

// Lines and curves
g.moveTo(x, y);
g.lineTo(x, y);
g.curveTo(cx, cy, x, y);

// Fills (solid or gradient)
g.beginSolidFill(color, alpha);
g.beginGradientFill(type, colors, alphas, ratios, matrix);  // LINEAR, RADIAL, etc.
```

---

## Events (openfl.events)

### Event System

```js
// Event types (strings passed to addEventListener)
"click", "mousedown", "mouseup", "mouseover", "mouseout", "mousemove"
"keydown", "keyup", "focus", "focusin", "focusout"
"added", "removed", "addedToStage", "removedFromStage"
"enterFrame", "exitFrame", "render"

// Create a synthetic event
var evt = new window.openfl_events_MouseEvent('click', false);
sprite.dispatchEvent(evt);

// Event listener
sprite.addEventListener('click', function(evt) {
    console.log('clicked at', evt.localX, evt.localY);
});
```

### Event Object Properties

```js
evt.type;              // event name (string)
evt.currentTarget;     // object that listener is on
evt.target;            // object that triggered event (may differ due to bubbling)
evt.bubbles;           // whether event bubbles up the tree
evt.localX, evt.localY; // position in target's coordinate system
evt.stageX, evt.stageY; // position in stage coordinate system
evt.buttonDown;         // whether mouse button was down during event
```

---

## Text (openfl.text)

### TextField (Low-level)

```js
var tf = new window.openfl_text_TextField();

// Content
tf.set_text(str);              // plain text
tf.set_htmlText(str);          // HTML (basic tags only)
tf.get_text();

// Formatting
tf.set_textColor(0xRRGGBB);
tf.set_defaultTextFormat(format);
tf.set_font(fontName);
tf.set_size(pointSize);
tf.set_bold(bool);
tf.set_italic(bool);
tf.set_underline(bool);

// Sizing
tf.set_autoSize(mode);         // 0=NONE, 1=LEFT, 2=CENTER (shrink-wrap)
tf.set_wordWrap(bool);
tf.set_width(pixels);
tf.set_height(pixels);
tf.get_textWidth();
tf.get_textHeight();
tf.get_width();
tf.get_height();

// Input
tf.set_type(mode);             // 0=DYNAMIC (read-only), 1=INPUT (editable)
tf.set_selectable(bool);
tf.set_editable(bool);
tf.set_border(bool);
tf.set_borderColor(0xRRGGBB);
tf.set_background(bool);
tf.set_backgroundColor(0xRRGGBB);

// Selection
tf.set_selection(startIdx, endIdx);
tf.get_selectedText();
```

### TextFormat

```js
var fmt = new window.openfl_text_TextFormat(
    fontName,      // "Arial", "Courier", etc.
    fontSize,      // 12, 24, etc.
    color,         // 0xRRGGBB
    bold,          // true/false
    italic,        // true/false
    underline      // true/false
);

// Or use registered formats
window.com_watabou_sevendrl_Style.formatTitle       // 40pt
window.com_wababou_sevendrl_Style.formatText        // 24pt
window.com_wababou_sevendrl_Style.formatService     // 18pt
```

---

## Geometry (openfl.geom)

### Rectangle

```js
var rect = new window.openfl_geom_Rectangle(x, y, width, height);

rect.set_x(n);   rect.get_x();
rect.set_y(n);   rect.get_y();
rect.set_width(n);   rect.get_width();
rect.set_height(n);   rect.get_height();

rect.set_left(n);   rect.get_left();
rect.set_right(n);  rect.get_right();
rect.set_top(n);    rect.get_top();
rect.set_bottom(n); rect.get_bottom();

rect.set_topLeft(point);
rect.set_bottomRight(point);

rect.contains(x, y);
rect.containsRect(otherRect);
rect.intersection(otherRect);
rect.union(otherRect);
rect.inflate(dx, dy);
rect.offset(dx, dy);
```

### Point

```js
var pt = new window.openfl_geom_Point(x, y);

pt.set_x(n);   pt.get_x();
pt.set_y(n);   pt.get_y();

pt.distance(otherPoint);
pt.length;     // distance from origin
pt.offset(dx, dy);
```

### Matrix

```js
var mat = new window.openfl_geom_Matrix();

// Or with initial values
var mat = new window.openfl_geom_Matrix(a, b, c, d, tx, ty);

mat.set_a(n);  mat.get_a();     // scale x
mat.set_b(n);  mat.get_b();     // skew y
mat.set_c(n);  mat.get_c();     // skew x
mat.set_d(n);  mat.get_d();     // scale y
mat.set_tx(n); mat.get_tx();    // translate x
mat.set_ty(n); mat.get_ty();    // translate y

mat.translate(dx, dy);
mat.scale(sx, sy);
mat.rotate(radians);
mat.invert();
```

### ColorTransform

```js
var ct = new window.openfl_geom_ColorTransform(
    redMult, greenMult, blueMult, alphaMult,
    redOffset, greenOffset, blueOffset, alphaOffset
);

// Tints a sprite's colors
sprite.set_transform(new window.openfl_geom_Transform(null, ct));
```

---

## Media (openfl.media)

### SoundTransform (Volume Control)

```js
var st = new window.openfl_media_SoundTransform(volume, pan);

st.set_volume(0..1);
st.set_pan(-1..1);     // -1 = left, 0 = center, 1 = right

// Apply to all sound globally
window.openfl_media_SoundMixer.set_soundTransform(st);
```

---

## Math & Utilities (lime.math, lime.utils)

### Vector2

```js
var v = new window.lime_math_Vector2(x, y);

v.set_x(n);   v.get_x();
v.set_y(n);   v.get_y();

v.length;
v.distance(otherVector);
v.dot(otherVector);
v.normalize();
```

### Random (com.watabou.utils.Random)

```js
// Seeded PRNG
window.com_watabou_utils_Random.int(min, max);        // [min, max)
window.com_wababou_utils_Random.int0(max);            // [0, max)
window.com_wababou_utils_Random.float();              // [0, 1)
window.com_wababou_utils_Random.bool(chance);         // true w/ probability
window.com_wababou_utils_Random.roll(n);              // 1..n (die roll)
```

### ArrayExtender (com.watabou.utils.ArrayExtender)

```js
var Arr = window.com_wababou_utils_ArrayExtender;

Arr.pick(array);          // random element
Arr.random(array);        // alias
Arr.shuffle(array);       // in-place shuffle
Arr.weighted(array, weights); // pick by weight
Arr.first(array);
Arr.last(array);
Arr.sum(array);
Arr.map(array, fn);
Arr.filter(array, fn);
Arr.difference(a, b);     // elements in a not in b
Arr.intersect(a, b);      // common elements
Arr.union(a, b);          // combined, no duplicates
```

---

## Game & Processing (com.watatou.processes)

### Tweener (Animation)

```js
window.com_wababou_processes_Tweener.run(durationSeconds, function(progress) {
    // progress goes 0 → 1 linearly
    // Apply easing inside
    var eased = progress * progress * (3 - 2 * progress);  // smoothstep
    sprite.set_alpha(1 - eased);
}).onComplete(function() {
    // Called when done
});
```

### Assets (openfl.utils)

```js
window.openfl_utils_Assets.exists(id, type);
window.openfl_utils_Assets.getFont(id, useCache);
window.openfl_utils_Assets.getSound(id, useCache);
window.openfl_utils_Assets.getText(id);               // synchronous
window.openfl_utils_Assets.getBitmapData(id, useCache);
window.openfl_utils_Assets.loadText(id);              // async → Future
window.openfl_utils_Assets.loadBitmapData(id, useCache); // async
```

---

## SevenDRL-Specific Classes

These are game-specific, not part of OpenFL/Lime:

### Visuals (com.watatou.sevendrl.visuals)

| Class | Use |
|---|---|
| `Indicator` | Colored on/off bars (health, armor) |
| `Unit` | Single indicator cell |
| `StatePin` | Glow-fade pin for ability states |
| `CardIndicator` | Card display (power level visual) |
| `CenteredText` | Auto-centering text (requires setWidth()) |
| `CharacterSprite` | Character with glyph + animations |
| `AsciiSprite` | Single-character sprite |
| `Toast` | Self-dismissing message |
| `Window` | Modal popup |
| `Fader` | Full-screen fade overlay |

### Game Classes (com.watabou.sevendrl)

| Class | Use |
|---|---|
| `SevenDRL` / `Game` | Main game instance |
| `Hero` | Player character |
| `Mob` | Enemy base class |
| `Clue` | Collectible item |
| `Scene` | Game screen base |
| `GameScene` | Gameplay screen |
| `TitleScene` | Title screen |
| `DeathScene` | Death screen |
| `VictoryScene` | Victory screen |

### Engine Classes (com.watabou.coogee)

| Class | Use |
|---|---|
| `Game` | Game loop & scene manager |
| `Scene` | Screen base class |
| `TextScene` | Text-only screen (extends Scene) |

---

## Class Resolution & Usage Pattern

All classes are on `window` after `lime.embed()` runs:

```js
// Direct access
var Sprite = window.openfl_display_Sprite;
var sprite = new Sprite();

// Via ModLoader (recommended for mods)
var Sprite = ModLoader.resolve('openfl.display.Sprite');
var sprite = new Sprite();

// Inheritance pattern (mods: use Object.create, NOT $extend)
var CustomSprite = function() {
    Sprite.call(this);
};
CustomSprite.__super__ = Sprite;
CustomSprite.prototype = Object.create(Sprite.prototype);
CustomSprite.prototype.customMethod = function() { /* ... */ };
```

---

## Gotchas

1. **Color is int, not string:** `0xFF0000` not `"#FF0000"`
2. **setWidth() is mandatory for CenteredText:** constructor doesn't auto-size
3. **Graphics requires clear() before redraw:** when changing an existing sprite's look
4. **addEventListener is on display objects:** not on custom JS classes without OpenFL/Lime inheritance
5. **HitTestPoint respects mouseEnabled:** if false, clicks pass through
6. **Text.get() silently drops < and >:** use CenteredText for text with brackets
7. **No native shadow/blur filters:** implement via graphics drawing or custom shaders (not exposed)
8. **Stage is a special DisplayObject:** access via `sprite.stage` after added to tree

---

## When to Use What

| Task | Use |
|---|---|
| Draw shapes | Graphics (drawRect, drawCircle, etc.) |
| Display an image | Bitmap + BitmapData |
| Show text | TextField or CenteredText |
| Click detection | addEventListener('click', ...) on sprite |
| Fade animation | Tweener.run() |
| Reposition | set_x/set_y |
| Detect collisions | hitTestPoint or manual bounds checking |
| Play sound | Sounds.event() (SevenDRL-specific) |

---

## Reference

- `API_REFERENCE.md` — frequently-used subset with examples
- `modding.md` — ModLoader patterns
- SevenDRL.js — source of truth (grep for class definitions)
- Lime/OpenFL official docs (for architecture/concepts)

Version: 2026-06-24 | Compiled from SevenDRL.js introspection
