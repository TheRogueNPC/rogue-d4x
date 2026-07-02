# Workflow: Retheme (Colors, Fonts, Visual Style)

## Prerequisites
- Read `modules/IN_OUT_GLOSSARY.md` §9 (Style / Theming)
- Read `modules/core/style.js` — style constants
- Read `modules/core/visuals.js` — sprite rendering

## Steps

### 1. Change color constants

Edit `modules/core/style.js`:

```js
com_watabou_sevendrl_Style.BG       = 0x1118498;  // ← change these
com_watabou_sevendrl_Style.FLOOR    = 0x2236979;
com_watabou_sevendrl_Style.DARK     = 0x7833736;
com_watabou_sevendrl_Style.LIGHT    = 0x16772812;
com_watabou_sevendrl_Style.GHOST    = 0x13430527;
com_watabou_sevendrl_Style.SPECTRE  = 0x13434845;
com_watabou_sevendrl_Style.CLUE     = 0x6710954;
com_watabou_sevendrl_Style.UI       = 0x14544639;
```

Colors are RGB hex values (0xRRGGBB).

### 2. Change text formats

In `modules/core/style.js`, modify `Style.init()`:

```js
com_watabou_sevendrl_Style.formatTitle   = Text.format("default", 40, 0xDDEEFF);  // size, color
com_watabou_sevendrl_Style.formatService = Text.format("default", 18, 0xDDEEFF);
com_watabou_sevendrl_Style.formatToast   = Text.format("default", 36, 0xDDEEFF);
com_watabou_sevendrl_Style.formatText    = Text.format("default", 24, 0xDDEEFF);
```

### 3. Change fonts

1. Replace font files in `assets/`:
   - `ShareTech-Regular.ttf` → your regular font
   - `ShareTechMono-Regular.ttf` → your mono font

2. Update `index.html` CSS `@font-face` declarations:
   ```css
   @font-face {
       font-family: 'Your Font';
       src: url('Assets/YourFont.eot');
       src: url('Assets/YourFont.woff') format('woff'),
            url('Assets/YourFont.ttf') format('truetype');
   }
   ```

3. Update the font registration in `SevenDRL.js` (lines 3495-3496)
   **OR** keep the same asset IDs ("default" and "mono") and just swap the files.

### 4. Change character sprite colors

In each character's `createSprite()` method (`characters.js`):

```js
// Hero: gold color
this.sprite.tf.set_textColor(0xFFD700);

// Hunter: cyan
this.sprite.tf.set_textColor(0x00FFFF);

// Boss: red
this.sprite.tf.set_textColor(0xFF0000);
```

### 5. Change indicator colors

In `GameScene.reset()` (`scenes.js`):

```js
// Health indicator: red instead of gold
this.health = new Indicator(this.game.hero.hp, 0xFF0000, true);

// Clue indicator: green instead of blue
this.clues = new Indicator(this.game.maxClues, 0x00FF00, false);
```

### 6. Change dungeon colors

The dungeon rendering uses `Style.FLOOR`, `Style.DARK`, `Style.LIGHT` in
`PlanView` (`game.js`). Change these constants to retheme the map.

### 7. Change transition speeds

In `modules/core/visuals.js`:

```js
// Fader duration (currently 0.6 seconds):
com_watabou_processes_Tweener.run(0.6, function(e) { ... });
// Change 0.6 to your desired duration

// Character move animation (currently 0.2 seconds):
com_watabou_processes_Tweener.run(0.2, function(e) { ... });

// Character attack animation (currently 0.2 seconds):
com_watabou_processes_Tweener.run(0.2, function(e) { ... });
```

### 8. Test

Refresh the browser. All visual changes should be immediately visible.

## Reference
- `IN_OUT_GLOSSARY.md` §9 — all style constants
- `modules/core/style.js` — Style class
- `modules/core/visuals.js` — AsciiSprite, Indicator, Fader
