(function() {
    'use strict';

    // ── View Mode State ────────────────────────────────────────────
    var VIEW_MODES = ['top', 'iso', 'side'];
    var TILE = 16;
    var ISO_TW = TILE;
    var ISO_TH = TILE / 2;
    var HALF_W = ISO_TW / 2;
    var HALF_H = ISO_TH / 2;
    var WALL_HEIGHT = TILE * 0.8;
    var FLOOR_THICK = 2;
    var WINDOW_HEIGHT = TILE * 0.4;

    window.__viewMode = 'top';
    window.__viewModeIdx = 0;

    var overlay = null;
    var ctx = null;
    var animId = null;
    var running = false;
    var heroGlyph = '@';
    var mobGlyph = 'e';

    // ── Room color palette (shared cache across view switches) ──────
    var ROOM_COLORS = [
        '#4488CC', '#CC4466', '#44CC88', '#CC8844', '#8844CC',
        '#44CCCC', '#CC4488', '#88CC44', '#4488CC', '#CC6644',
        '#66CC44', '#CC44AA', '#44AACC', '#AACC44', '#CC44CC',
    ];
    var _paletteCache = {};

    // ── Event-driven render signature ──────────────────────────────
    var _signature = { revision: 0 };
    var _renderRequested = false;

    function bumpSig() { _signature.revision++; _renderRequested = true; }

    // ── Precomputed geometry cache ─────────────────────────────────
    var _roomGeo = {};

    // ── Helpers ────────────────────────────────────────────────────
    function getGame() {
        var G = window.com_watabou_coogee_Game;
        return G && G.scene && G.scene.game ? G.scene.game : null;
    }
    function getScene() {
        var G = window.com_watabou_coogee_Game;
        return G && G.scene ? G.scene : null;
    }
    function getGrid() {
        var g = getGame();
        return g && g.plan ? g.plan.grid : null;
    }

    function getFOV(game) {
        if (!game || !game.hero || !game.hero.sees) return [];
        try { return game.hero.getFOV(); } catch(e) { return []; }
    }

    // ── Palette cache ──────────────────────────────────────────────
    function roomColor(room) {
        if (!room) return '#2a2a44';
        if (_paletteCache[room.id] !== undefined) return _paletteCache[room.id];
        _paletteCache[room.id] = ROOM_COLORS[room.id % ROOM_COLORS.length];
        return _paletteCache[room.id];
    }

    function clearPaletteCache() { _paletteCache = {}; }

    // ── Fog-of-war helpers ─────────────────────────────────────────
    function visibilityTier(cell, game, fovCells) {
        if (!cell || !game) return 'none';
        var g = game;
        if (g.cells.indexOf(cell) === -1) return 'none';
        if (fovCells && fovCells.indexOf(cell) !== -1) return 'visible';
        if (g.visited) {
            for (var i = 0; i < g.visited.length; i++) {
                if (g.visited[i].area.indexOf(cell) !== -1) return 'explored';
            }
        }
        return 'none';
    }

    function renderAlphaForTier(tier) {
        if (tier === 'visible') return 1.0;
        if (tier === 'explored') return 0.35;
        return 0;
    }

    // ── Overlay canvas setup ───────────────────────────────────────
    function ensureOverlay() {
        if (overlay) return;
        overlay = document.createElement('canvas');
        overlay.id = 'dc-view-overlay';
        overlay.style.cssText = [
            'position:fixed; inset:0; z-index:990;',
            'pointer-events:none; display:none;',
            'image-rendering:pixelated;',
        ].join(' ');
        overlay.width = window.innerWidth;
        overlay.height = window.innerHeight;
        ctx = overlay.getContext('2d');
        document.body.appendChild(overlay);

        window.addEventListener('resize', function() {
            overlay.width = window.innerWidth;
            overlay.height = window.innerHeight;
            bumpSig();
        });
    }

    // ── Render loop (event-driven + interpolative) ─────────────────
    function renderLoop() {
        if (!running) return;
        var game = getGame();
        if (!game || !game.plan || !game.hero) {
            animId = requestAnimationFrame(renderLoop);
            return;
        }

        if (_renderRequested) {
            ctx.clearRect(0, 0, overlay.width, overlay.height);
            if (window.__viewMode === 'iso') renderIso(game);
            else if (window.__viewMode === 'side') renderSide(game);
            _renderRequested = false;
        }

        animId = requestAnimationFrame(renderLoop);
    }

    // ── Character glyph/color ──────────────────────────────────────
    function getCharGlyph(ch) {
        var Hero = window.com_watabou_sevendrl_characters_Hero;
        var Boss = window.com_watabou_sevendrl_characters_Boss;
        var Clue = window.com_watabou_sevendrl_characters_Clue;
        var Mob = window.com_watabou_sevendrl_characters_Mob;

        if (ch instanceof Hero) {
            return window.__characterLoadout && window.__characterLoadout.glyph
                ? window.__characterLoadout.glyph : heroGlyph;
        }
        if (ch instanceof Boss) return 'B';
        if (ch instanceof Clue) return '?';
        if (ch instanceof Mob) return 'm';
        return '\u00B7';
    }

    function getCharColor(ch) {
        var Hero = window.com_watabou_sevendrl_characters_Hero;
        var Boss = window.com_watabou_sevendrl_characters_Boss;
        var Clue = window.com_watabou_sevendrl_characters_Clue;
        var Mob = window.com_watabou_sevendrl_characters_Mob;

        if (ch instanceof Hero) return '#0f0';
        if (ch instanceof Boss) return '#f44';
        if (ch instanceof Clue) return '#ff0';
        if (ch instanceof Mob) return '#f80';
        return '#888';
    }

    // ── Contour analysis for side view ─────────────────────────────
    // Cache per plan generation: which exterior edges have doors/windows
    function buildRoomGeo(game) {
        var plan = game.plan;
        if (!plan || !plan.grid) return;
        var planKey = plan.__id__ || 0;
        if (_roomGeo._planKey === planKey) return;
        _roomGeo = { _planKey: planKey };
        var grid = plan.grid;
        var abris = plan.abris || [];
        var windows = plan.windows || [];

        for (var ri = 0; ri < plan.rooms.length; ri++) {
            var room = plan.rooms[ri];
            var geo = {
                downWalls: [],   // walls visible from below (south)
                rightWalls: [],  // walls on right edge
                doors: {},       // cellKey -> true
                windows: {},
            };
            // Find door cells
            var diter = room.doors.keys();
            while (diter.hasNext()) {
                var other = diter.next();
                var door = room.doors.get(other);
                if (door) {
                    var cell = door.cell(room);
                    if (cell) geo.doors[cell.i + ',' + cell.j] = true;
                }
            }
            // Find which contour edges are on the abris (exterior)
            for (var ei = 0; ei < room.contour.length; ei++) {
                var e = room.contour[ei];
                var cell = grid.edge2cell(e);
                if (!cell) continue;
                var ck = cell.i + ',' + cell.j;
                geo.doors[ck] = geo.doors[ck] || false;
                // Mark windows where contour edge is in window list
                if (windows.indexOf(e) !== -1) {
                    geo.windows[ck] = true;
                }
                // Track exterior down-facing edges (south wall candidates)
                if (e.dir === window.com_watabou_sevendrl_Dir.SOUTH) {
                    geo.downWalls.push(cell);
                }
                // Track exterior right-facing edges
                if (e.dir === window.com_watabou_sevendrl_Dir.EAST) {
                    geo.rightWalls.push(cell);
                }
            }
            _roomGeo['r' + ri] = geo;
        }
    }

    // ── Inverse projection hit-tests (for future click-to-move) ────
    function isoCellFromPoint(px, py, game, originX, originY) {
        var hero = game.hero;
        if (!hero || !hero.cell) return null;
        var hx = hero.cell.j, hy = hero.cell.i;
        var cx = (originX || overlay.width / 2) - (hx - hy) * HALF_W;
        var cy = (originY || overlay.height / 3) - (hx + hy) * HALF_H;
        var rx = px - cx, ry = py - cy;
        var col = Math.round((rx / HALF_W + ry / HALF_H) / 2);
        var row = Math.round((ry / HALF_H - rx / HALF_W) / 2);
        var grid = getGrid();
        return grid ? grid.cell(row, col) : null;
    }

    function sideCellFromPoint(px, py, game) {
        var hero = game.hero;
        if (!hero || !hero.cell) return null;
        var offX = px - overlay.width / 2 + hero.cell.j * TILE - TILE / 2;
        var offY = py - overlay.height / 2 + hero.cell.i * TILE;
        var col = Math.round(offX / TILE);
        var row = Math.round(offY / TILE);
        var grid = getGrid();
        return grid ? grid.cell(row, col) : null;
    }

    // ── Iso rendering ──────────────────────────────────────────────
    function renderIso(game) {
        buildRoomGeo(game);
        var w = overlay.width, h = overlay.height;
        var cx = w / 2, cy = h / 3;
        var hero = game.hero;
        var fovCells = getFOV(game);

        // Camera offset centered on hero
        var hx = hero.cell ? hero.cell.j : 0;
        var hy = hero.cell ? hero.cell.i : 0;
        cx -= (hx - hy) * HALF_W;
        cy -= (hx + hy) * HALF_H;

        // Collect visible + explored cells
        var cells = [];
        var cellTier = {};
        var visited = game.visited || [];

        for (var ri = 0; ri < visited.length; ri++) {
            var room = visited[ri];
            var color = roomColor(room);
            for (var ci = 0; ci < room.area.length; ci++) {
                var cell = room.area[ci];
                var key = cell.i + ',' + cell.j;
                if (!cellTier[key]) {
                    cells.push(cell);
                    cellTier[key] = { color: color, tier: visibilityTier(cell, game, fovCells) };
                }
            }
        }
        if (hero && hero.room) {
            for (var ci = 0; ci < hero.room.area.length; ci++) {
                var cell = hero.room.area[ci];
                var key = cell.i + ',' + cell.j;
                if (!cellTier[key]) {
                    cells.push(cell);
                    cellTier[key] = { color: '#3a3a5e', tier: visibilityTier(cell, game, fovCells) };
                }
            }
        }

        // Depth sort by foot Y (i + j)
        cells.sort(function(a, b) { return (a.i + a.j) - (b.i + b.j); });

        ctx.save();
        ctx.translate(cx, cy);

        // Draw floor diamonds
        for (var i = 0; i < cells.length; i++) {
            var c = cells[i];
            var sx = (c.j - c.i) * HALF_W;
            var sy = (c.j + c.i) * HALF_H;
            var info = cellTier[c.i + ',' + c.j];
            var alpha = renderAlphaForTier(info.tier);
            if (alpha === 0) continue;

            ctx.fillStyle = info.color;
            ctx.globalAlpha = 0.4 + 0.35 * alpha;
            ctx.beginPath();
            ctx.moveTo(sx, sy - HALF_H);
            ctx.lineTo(sx + HALF_W, sy);
            ctx.lineTo(sx, sy + HALF_H);
            ctx.lineTo(sx - HALF_W, sy);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1;

            if (alpha > 0.5) {
                ctx.strokeStyle = '#444';
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        }

        // Draw characters (depth sorted by foot Y = i + j)
        var chars = [];
        for (var i = 0; i < game.queue.length; i++) {
            var ch = game.queue[i];
            if (ch.cell) chars.push(ch);
        }
        chars.sort(function(a, b) {
            return (a.cell.i + a.cell.j) - (b.cell.i + b.cell.j);
        });

        for (var i = 0; i < chars.length; i++) {
            var ch = chars[i];
            var sx = (ch.cell.j - ch.cell.i) * HALF_W;
            var sy = (ch.cell.j + ch.cell.i) * HALF_H - HALF_H;
            var glyph = getCharGlyph(ch);
            var color = getCharColor(ch);

            ctx.fillStyle = color;
            ctx.font = 'bold ' + (TILE * 0.9) + 'px "Share Tech Regular", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(glyph, sx, sy);
        }

        ctx.restore();
    }

    // ── Side view rendering (with wall carving) ────────────────────
    function renderSide(game) {
        buildRoomGeo(game);
        var w = overlay.width, h = overlay.height;
        var hero = game.hero;
        var fovCells = getFOV(game);
        var camX = 0, camY = 0;

        if (hero && hero.cell) {
            camX = hero.cell.j * TILE - w / 2 + TILE / 2;
            camY = hero.cell.i * TILE - h / 2 + TILE / 2;
        }

        var visited = game.visited || [];
        var margin = TILE * 2;
        var minJ = Math.floor((camX - margin) / TILE);
        var maxJ = Math.ceil((camX + w + margin) / TILE);
        var minI = Math.floor((camY - margin) / TILE);
        var maxI = Math.ceil((camY + h + margin) / TILE);

        // Build cell → room lookup
        var cellRoom = {};
        for (var ri = 0; ri < visited.length; ri++) {
            var room = visited[ri];
            for (var ci = 0; ci < room.area.length; ci++) {
                var c = room.area[ci];
                cellRoom[c.i + ',' + c.j] = room;
            }
        }
        if (hero && hero.room) {
            for (var ci = 0; ci < hero.room.area.length; ci++) {
                var c = hero.room.area[ci];
                if (!cellRoom[c.i + ',' + c.j]) cellRoom[c.i + ',' + c.j] = hero.room;
            }
        }

        ctx.save();
        ctx.translate(w / 2 - camX - TILE / 2, h / 2 - camY);

        // Floor pass: fill each cell rectangle
        for (var ri = minI; ri <= maxI; ri++) {
            for (var cj = minJ; cj <= maxJ; cj++) {
                var room = cellRoom[ri + ',' + cj];
                if (!room) continue;
                var cell = { i: ri, j: cj };
                var tier = visibilityTier(cell, game, fovCells);
                var alpha = renderAlphaForTier(tier);
                if (alpha === 0) continue;

                var sx = cj * TILE, sy = ri * TILE;
                var color = roomColor(room);

                // Floor strip
                ctx.fillStyle = color;
                ctx.globalAlpha = 0.3 + 0.25 * alpha;
                ctx.fillRect(sx, sy, TILE, FLOOR_THICK);
                ctx.globalAlpha = 1;
            }
        }

        // Wall pass: extrude contour edges into wall quads
        for (var ri = minI; ri <= maxI; ri++) {
            for (var cj = minJ; cj <= maxJ; cj++) {
                var room = cellRoom[ri + ',' + cj];
                if (!room) continue;
                var cell = { i: ri, j: cj };
                var tier = visibilityTier(cell, game, fovCells);
                var alpha = renderAlphaForTier(tier);
                if (alpha === 0) continue;

                var sx = cj * TILE, sy = ri * TILE;
                var color = roomColor(room);
                var cellKey = ri + ',' + cj;
                var geo = _roomGeo['r' + room.id];
                var hasDoor = geo && geo.doors[cellKey];
                var hasWindow = geo && geo.windows[cellKey];

                // SOUTH wall (downward-facing edge) — full wall height
                var hasDown = cellRoom[(ri + 1) + ',' + cj];
                if (!hasDown && geo && geo.downWalls.indexOf(cell) !== -1) {
                    if (hasDoor) {
                        // Carve door opening: render wall left/right
                        ctx.fillStyle = color;
                        ctx.globalAlpha = 0.6 + 0.25 * alpha;
                        ctx.fillRect(sx, sy + FLOOR_THICK, TILE * 0.35, WALL_HEIGHT);
                        ctx.fillRect(sx + TILE * 0.65, sy + FLOOR_THICK, TILE * 0.35, WALL_HEIGHT);
                        ctx.globalAlpha = 1;
                        // Door outline
                        ctx.strokeStyle = '#666';
                        ctx.lineWidth = 0.5;
                        ctx.strokeRect(sx, sy + FLOOR_THICK, TILE * 0.35, WALL_HEIGHT);
                        ctx.strokeRect(sx + TILE * 0.65, sy + FLOOR_THICK, TILE * 0.35, WALL_HEIGHT);
                        // Door hint (gap indicator)
                        ctx.fillStyle = '#444';
                        ctx.fillRect(sx + TILE * 0.35, sy + FLOOR_THICK + WALL_HEIGHT * 0.4, TILE * 0.30, 2);
                    } else if (hasWindow && alpha > 0.7) {
                        // Window: shorter wall segment with lighter fill
                        ctx.fillStyle = color;
                        ctx.globalAlpha = 0.6 + 0.25 * alpha;
                        ctx.fillRect(sx, sy + FLOOR_THICK, TILE, WALL_HEIGHT * 0.3);
                        ctx.globalAlpha = 1;
                        // Window pane
                        ctx.fillStyle = '#aaddff';
                        ctx.globalAlpha = 0.3 + 0.3 * alpha;
                        ctx.fillRect(sx + 2, sy + FLOOR_THICK + WALL_HEIGHT * 0.3, TILE - 4, WALL_HEIGHT * 0.5);
                        ctx.globalAlpha = 1;
                        // Window cross
                        ctx.strokeStyle = '#888';
                        ctx.lineWidth = 0.5;
                        ctx.strokeRect(sx + TILE * 0.3, sy + FLOOR_THICK + WALL_HEIGHT * 0.3, TILE * 0.4, WALL_HEIGHT * 0.5);
                        // Wall cap above window
                        ctx.fillStyle = color;
                        ctx.globalAlpha = 0.8;
                        ctx.fillRect(sx, sy + FLOOR_THICK + WALL_HEIGHT * 0.8, TILE, WALL_HEIGHT * 0.2);
                        ctx.globalAlpha = 1;
                    } else {
                        // Full wall
                        ctx.fillStyle = color;
                        ctx.globalAlpha = 0.6 + 0.25 * alpha;
                        ctx.fillRect(sx, sy + FLOOR_THICK, TILE, WALL_HEIGHT);
                        ctx.globalAlpha = 1;
                        ctx.strokeStyle = '#666';
                        ctx.lineWidth = 0.5;
                        ctx.strokeRect(sx, sy + FLOOR_THICK, TILE, WALL_HEIGHT);
                    }
                }

                // EAST wall (right-edge) — thin wall edge
                var hasRight = cellRoom[ri + ',' + (cj + 1)];
                if (!hasRight && geo && geo.rightWalls.indexOf(cell) !== -1) {
                    if (hasDoor) {
                        // Door gap on right wall
                    } else {
                        ctx.fillStyle = color;
                        ctx.globalAlpha = 0.5 + 0.2 * alpha;
                        ctx.fillRect(sx + TILE - 1, sy, 1, FLOOR_THICK);
                        ctx.globalAlpha = 1;
                    }
                }
            }
        }

        // Character pass
        for (var i = 0; i < game.queue.length; i++) {
            var ch = game.queue[i];
            if (!ch.cell) continue;
            var tier = visibilityTier(ch.cell, game, fovCells);
            var alpha = renderAlphaForTier(tier);
            if (alpha === 0) continue;

            var sx = ch.cell.j * TILE;
            var sy = ch.cell.i * TILE;
            var glyph = getCharGlyph(ch);
            var color = getCharColor(ch);

            ctx.globalAlpha = 0.5 + 0.5 * alpha;
            ctx.fillStyle = color;
            ctx.font = 'bold ' + (TILE * 0.8) + 'px "Share Tech Regular", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(glyph, sx + TILE / 2, sy + FLOOR_THICK / 2);
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    }

    // ── View switching ─────────────────────────────────────────────
    window.__setViewMode = function(mode) {
        if (VIEW_MODES.indexOf(mode) === -1) return;
        window.__viewMode = mode;
        window.__viewModeIdx = VIEW_MODES.indexOf(mode);

        var scene = getScene();
        var nativeView = scene && scene.view;
        ensureOverlay();

        if (mode === 'top') {
            if (nativeView) nativeView.set_visible(true);
            if (overlay) overlay.style.display = 'none';
            stopLoop();
        } else {
            if (nativeView) nativeView.set_visible(false);
            if (overlay) {
                overlay.style.display = 'block';
                overlay.width = window.innerWidth;
                overlay.height = window.innerHeight;
            }
            _renderRequested = true;
            startLoop();
        }

        if (window.devLog) window.devLog('[View] mode: ' + mode);
    };

    window.__cycleViewMode = function() {
        var idx = (window.__viewModeIdx + 1) % VIEW_MODES.length;
        window.__setViewMode(VIEW_MODES[idx]);
        return VIEW_MODES[idx];
    };

    function startLoop() {
        if (running) return;
        running = true;
        animId = requestAnimationFrame(renderLoop);
    }

    function stopLoop() {
        running = false;
        if (animId) {
            cancelAnimationFrame(animId);
            animId = null;
        }
    }

    // ── Public hit-test API for future click-to-move ───────────────
    window.__viewIsoCellFromPoint = function(px, py) {
        var game = getGame();
        return game ? isoCellFromPoint(px, py, game) : null;
    };
    window.__viewSideCellFromPoint = function(px, py) {
        var game = getGame();
        return game ? sideCellFromPoint(px, py, game) : null;
    };

    // ── Hook into game events for event-driven rendering ───────────
    // Bump signature on hero move, room change, char add/remove
    function WireEvents() {
        var game = getGame();
        if (!game || !game.hero) { setTimeout(WireEvents, 200); return; }

        // Subscribe to signals that should trigger redraw
        if (!game.hero.__viewSig_hp) {
            game.hero.hpChanged.add(function() { bumpSig(); });
            game.hero.__viewSig_hp = true;
        }
        if (!game.hero.__viewSig_room) {
            game.hero.roomChanged.add(function() { bumpSig(); });
            game.hero.__viewSig_room = true;
        }
        if (!game.__viewSig_char) {
            game.charAdded.add(function() { bumpSig(); });
            game.__viewSig_char = true;
        }
        if (!game.__viewSig_over) {
            game.over.add(function() { bumpSig(); });
            game.__viewSig_over = true;
        }
    }
    WireEvents();

    // ── Mod hook: rewire events + re-apply view mode after reset ──
    ModLoader.after('com.watabou.sevendrl.scenes.GameScene', 'reset', function() {
        clearPaletteCache();
        _roomGeo = { _planKey: null };
        bumpSig();
        if (window.__viewMode !== 'top') {
            var _mode = window.__viewMode;
            window.__viewMode = 'top';
            window.__setViewMode(_mode);
        }
        setTimeout(WireEvents, 200);
    });

    // ── Cleanup ─────────────────────────────────────────────────────
    (function tryRogue() {
        if (window.Rogue && window.Rogue.cleanup) {
            var origCleanup = window.Rogue.cleanup;
            window.Rogue.cleanup = function(preserveStock) {
                stopLoop();
                if (overlay) overlay.style.display = 'none';
                var scene = getScene();
                if (scene && scene.view) scene.view.set_visible(true);
                window.__viewMode = 'top';
                window.__viewModeIdx = 0;
                clearPaletteCache();
                _roomGeo = { _planKey: null };
                origCleanup(preserveStock);
            };
        } else {
            setTimeout(tryRogue, 50);
        }
    })();

    if (window.devLog) window.devLog('[mod:view-mode] upgraded — event-driven + fog-of-war + wall carving');
})();
