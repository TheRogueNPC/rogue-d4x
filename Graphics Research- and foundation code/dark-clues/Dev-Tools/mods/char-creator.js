(function() {
    'use strict';

    // Canvas-native character creator. Built on Rogue.UI (rogue-api.js):
    // panel/button/description/textInput/cycle for the standard rows, plus
    // two small bespoke widgets below (stat stepper, glyph grid) that don't
    // generalize enough to belong in the shared Rogue.UI namespace. The
    // name field uses the native Text.input() TextField (type=INPUT) via
    // Rogue.UI.textInput — real OS-level text editing, no custom keyboard
    // handling needed.

    var GLYPHS = '@ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#$%&?!=+*';
    var GLYPH_CELL = 28, GLYPH_GAP = 2;
    var STAT_BTN_W = 24, STAT_BTN_H = 24;
    var THEMES = ['Default', 'Amber', 'Teal', 'Crimson'];

    var DEFAULTS = {
        name: 'Detective',
        hpBonus: 0,
        stockBonus: 0,
        colorScheme: 'default',
        glyph: '@'
    };

    var creatorOv = null;
    var creatorRefs = null;

    // ── Stat stepper row: "Label   [-] 0 [+]" ──
    function statButton(text, onClick) {
        var Style = window.com_watabou_sevendrl_Style;
        var b = new window.openfl_display_Sprite();
        var tf = new window.com_watabou_sevendrl_visuals_CenteredText(text, Style.formatService);
        tf.setWidth(2000);
        tf.set_textColor(0xDDDDDD);
        function draw(hover) {
            b.get_graphics().clear();
            b.get_graphics().lineStyle(1, hover ? 0xDDDDDD : 0x555555, 1);
            b.get_graphics().beginFill(0x111122, 1);
            b.get_graphics().drawRect(0, 0, STAT_BTN_W, STAT_BTN_H);
        }
        draw(false);
        tf.set_x((STAT_BTN_W - tf.get_width()) / 2);
        tf.set_y((STAT_BTN_H - tf.get_height()) / 2);
        b.addChild(tf);
        b.addEventListener('mouseover', function() { draw(true); });
        b.addEventListener('mouseout', function() { draw(false); });
        b.addEventListener('click', onClick);
        return b;
    }

    function statRow(label, parent, min, max) {
        var Style = window.com_watabou_sevendrl_Style;
        var w = parent.__width - 40;
        var h = STAT_BTN_H;
        var row = new window.openfl_display_Sprite();
        var value = 0;

        // CenteredText, not Text.get() — Text.get() calls set_htmlText()
        // under the hood, which would silently drop "<"/">" characters.
        var labelTf = new window.com_watabou_sevendrl_visuals_CenteredText(label, Style.formatService);
        labelTf.setWidth(2000);
        labelTf.set_x(0);
        labelTf.set_y((h - labelTf.get_height()) / 2);
        row.addChild(labelTf);

        var valueTf = new window.com_watabou_sevendrl_visuals_CenteredText('0', Style.formatService);
        valueTf.setWidth(2000);
        valueTf.set_textColor(0x00DD88);
        valueTf.set_y((h - valueTf.get_height()) / 2);

        var minusBtn = statButton('-', function() { value = Math.max(min, value - 1); layout(); });
        var plusBtn = statButton('+', function() { value = Math.min(max, value + 1); layout(); });
        minusBtn.set_y(0);
        plusBtn.set_y(0);

        function layout() {
            valueTf.set_text(String(value));
            valueTf.setWidth(2000);
            valueTf.set_y((h - valueTf.get_height()) / 2);
            plusBtn.set_x(w - STAT_BTN_W);
            valueTf.set_x(plusBtn.get_x() - 8 - valueTf.get_width());
            minusBtn.set_x(valueTf.get_x() - 8 - STAT_BTN_W);
        }
        layout();

        row.addChild(minusBtn);
        row.addChild(valueTf);
        row.addChild(plusBtn);
        Rogue.UI.stack(row, parent, h);

        return { get: function() { return value; }, set: function(v) { value = v; layout(); } };
    }

    // ── Glyph picker grid ──
    function redrawGlyphCell(cell, selected, hover) {
        var border = selected ? 0x00FFFF : (hover ? 0xDDDDDD : 0x444444);
        var bg = selected ? 0x113333 : 0x1A1A33;
        cell.get_graphics().clear();
        cell.get_graphics().lineStyle(1, border, 1);
        cell.get_graphics().beginFill(bg, 1);
        cell.get_graphics().drawRect(0, 0, GLYPH_CELL, GLYPH_CELL);
    }

    function buildGlyphGrid(parent, initialGlyph) {
        var Style = window.com_watabou_sevendrl_Style;
        var w = parent.__width - 40;
        var perRow = Math.max(1, Math.floor((w + GLYPH_GAP) / (GLYPH_CELL + GLYPH_GAP)));
        var rows = Math.ceil(GLYPHS.length / perRow);
        var grid = new window.openfl_display_Sprite();
        var cells = [];
        var selectedIdx = Math.max(0, GLYPHS.indexOf(initialGlyph || '@'));

        for (var i = 0; i < GLYPHS.length; i++) {
            var cell = new window.openfl_display_Sprite();
            var col = i % perRow, r = Math.floor(i / perRow);
            cell.set_x(col * (GLYPH_CELL + GLYPH_GAP));
            cell.set_y(r * (GLYPH_CELL + GLYPH_GAP));
            redrawGlyphCell(cell, i === selectedIdx, false);

            var tf = new window.com_watabou_sevendrl_visuals_CenteredText(GLYPHS[i], Style.formatService);
            tf.setWidth(2000);
            tf.set_textColor(0xDDDDDD);
            tf.set_x((GLYPH_CELL - tf.get_width()) / 2);
            tf.set_y((GLYPH_CELL - tf.get_height()) / 2);
            cell.addChild(tf);

            (function(idx, c) {
                c.addEventListener('mouseover', function() { if (idx !== selectedIdx) redrawGlyphCell(c, false, true); });
                c.addEventListener('mouseout', function() { if (idx !== selectedIdx) redrawGlyphCell(c, false, false); });
                c.addEventListener('click', function() {
                    var prev = selectedIdx;
                    selectedIdx = idx;
                    redrawGlyphCell(cells[prev], false, false);
                    redrawGlyphCell(c, true, false);
                });
            })(i, cell);

            grid.addChild(cell);
            cells.push(cell);
        }

        Rogue.UI.stack(grid, parent, rows * (GLYPH_CELL + GLYPH_GAP));
        return { getGlyph: function() { return GLYPHS[selectedIdx]; } };
    }

    // ── Overlay lifecycle ──
    function openCreator() {
        if (creatorOv) return;

        var ov = Rogue.UI.overlay('Character Creator', null, 420);
        creatorOv = ov;
        var panel = ov.__panel;

        Rogue.UI.description('Customize your detective before each case', panel);
        var nameInput = Rogue.UI.textInput(DEFAULTS.name, panel);
        var hpStat = statRow('Bonus HP', panel, -1, 3);
        var stockStat = statRow('Bonus Stock', panel, -1, 3);
        var themeCycle = Rogue.UI.cycle('Theme', THEMES, 0, panel);

        Rogue.UI.label('Map Symbol', panel, 0xCCCCCC);
        var glyphGrid = buildGlyphGrid(panel, DEFAULTS.glyph);

        Rogue.UI.description('Bonuses are applied on top of your chosen difficulty.', panel);
        Rogue.UI.button('Save', panel, saveLoadout);
        Rogue.UI.button('Cancel', panel, closeCreator);

        creatorRefs = { nameInput: nameInput, hpStat: hpStat, stockStat: stockStat, themeCycle: themeCycle, glyphGrid: glyphGrid };
    }

    function closeCreator() {
        if (creatorOv) {
            Rogue.UI.dismiss(creatorOv);
            creatorOv = null;
            creatorRefs = null;
        }
    }

    function saveLoadout() {
        if (!creatorRefs) return;
        var loadout = {
            name: creatorRefs.nameInput.get_text() || 'Detective',
            hpBonus: creatorRefs.hpStat.get(),
            stockBonus: creatorRefs.stockStat.get(),
            colorScheme: creatorRefs.themeCycle.__getValue().toLowerCase(),
            glyph: creatorRefs.glyphGrid.getGlyph()
        };
        window.__characterLoadout = loadout;
        if (window.devLog) window.devLog('[char-creator] loadout saved:', JSON.stringify(loadout));
        closeCreator();
    }

    // ── Exports ──
    window.__openCharCreator = openCreator;
    window.__closeCharCreator = closeCreator;

    // Also expose on Rogue namespace if available (poll-safe)
    (function tryRogue() {
        if (window.Rogue && window.Rogue.onReady) {
            window.Rogue.onReady(function() {
                window.Rogue.charCreator = { open: openCreator, close: closeCreator };
            });
        } else {
            setTimeout(tryRogue, 50);
        }
    })();

    if (window.devLog) window.devLog('[mod:char-creator] ready — call __openCharCreator()');
})();
