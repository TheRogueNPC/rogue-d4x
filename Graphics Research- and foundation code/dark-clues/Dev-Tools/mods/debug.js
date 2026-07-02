// ═══════════════════════════════════════════════════════════════════
// Dev-Tools/mods/debug.js — Debug utilities and REPL helpers
// Accessible from Dev Console (F12) or browser DevTools.
// ═══════════════════════════════════════════════════════════════════

(function() {
    'use strict';

    window.DBG = {
        // ── Find Game Instance ────────────────────────────────────
        findGame: function() {
            var info = {
                sevendrl: !!window.sevendrl,
                hero: !!window.hero,
                sevenDRLClass: typeof window.com_watabou_sevendrl_SevenDRL,
                scene: typeof window.com_watabou_coogee_Game !== 'undefined' && window.com_watabou_coogee_Game.scene ? true : false,
                modLoaderReady: ModLoader ? ModLoader.ready : 'N/A',
                patchesPending: ModLoader ? ModLoader.patches.length : 'N/A',
                msg: ''
            };
            var g = window.sevendrl;
            if (g) {
                info.msg = 'Found! sevendrl/hero/scene are available.';
                info.queue = g.queue ? g.queue.length : 0;
                info.level = window.com_watabou_sevendrl_SevenDRL.level;
            } else if (info.scene) {
                info.msg = 'Scene exists but globals not set yet. Click the canvas to trigger proceed() hook.';
            } else if (ModLoader && ModLoader.ready) {
                info.msg = 'Mods ready but globals not set yet. Click the game canvas to trigger proceed() hook.';
            } else if (ModLoader && ModLoader.patches.length > 0) {
                info.msg = ModLoader.patches.length + ' patches pending. Check validateMethod() for each.';
            } else {
                info.msg = 'ModLoader not ready. Check browser console for errors.';
            }
            return info;
        },

        // ── Game State ──────────────────────────────────────────────
        status: function() {
            var g = window.sevendrl;
            if (!g) return 'No game instance';
            var q = g.queue || [];
            var Clue = window.com_watabou_sevendrl_characters_Clue;
            var Boss = window.com_watabou_sevendrl_characters_Boss;
            var nClues = 0, hasBoss = false;
            for (var i = 0; i < q.length; i++) {
                var ch = q[i];
                if (Clue && ch instanceof Clue) nClues++;
                if (Boss && ch instanceof Boss) hasBoss = true;
            }
            return {
                level: window.com_watabou_sevendrl_SevenDRL.level,
                hero: g.hero ? { hp: g.hero.hp, pos: g.hero.pos, maxHP: g.hero.maxHP || 6 } : null,
                clues: nClues,
                queue: q.length,
                boss: hasBoss ? 'alive' : 'dead/not spawned'
            };
        },

        // ── Hero Manipulation ──────────────────────────────────────
        heal: function(amount) {
            var h = window.hero;
            if (!h) return 'No hero';
            var maxHP = h.maxHP || 6;
            h.hp = amount !== undefined ? Math.min(maxHP, h.hp + amount) : maxHP;
            if (h.hpChanged) h.hpChanged.dispatch(h.hp);
            return 'Healed to ' + h.hp;
        },

        damage: function(amount) {
            var h = window.hero;
            if (!h) return 'No hero';
            h.damage(amount || 1);
            return 'Dealt ' + (amount || 1) + ' damage';
        },

        kill: function() {
            var h = window.hero;
            if (!h) return 'No hero';
            h.die();
            return 'Hero killed';
        },

        // ── Map / Level ─────────────────────────────────────────────
        reveal: function() {
            var g = window.sevendrl;
            if (!g || !g.plan) return 'No plan';
            var Game = window.com_watabou_coogee_Game;
            if (!Game || !Game.scene || !Game.scene.view) return 'Scene not ready';
            var view = Game.scene.view;
            if (!g.visited) return 'No visited array';
            var rooms = g.plan.rooms;
            if (!rooms) return 'No rooms';
            var count = 0;
            for (var i = 0; i < rooms.length; i++) {
                if (g.visited.indexOf(rooms[i]) == -1) {
                    g.explore(rooms[i]);
                    count++;
                }
            }
            if (count === 0) return 'All ' + rooms.length + ' rooms already revealed';
            view.updateBounds();
            for (var i = 0; i < g.visited.length; i++) {
                view.addVisited(g.visited[i]);
            }
            // Direct scale/position update — avoids relayout() which randomizes
            // view rotation and breaks map.get_mouseX/Y in OpenFL HTML5
            if (view.rWidth && view.rHeight) {
                var scale = Math.min(view.rWidth / (view.viewWidth + 2), view.rHeight / (view.viewHeight + 2));
                view.map.set_scaleX(view.map.set_scaleY(scale));
                view.map.set_x(-scale * view.viewCenterX);
                view.map.set_y(-scale * view.viewCenterY);
            }
            return 'Revealed ' + count + ' rooms (total visited: ' + g.visited.length + ')';
        },

        // ── Spawning ────────────────────────────────────────────────
        nextLevel: function() {
            return 'Dark Clues is a single-level game — there is no next level';
        },


        spawnClue: function() {
            var g = window.sevendrl;
            if (!g || !g.spawnClues) return 'No game';
            var Clue = window.com_watabou_sevendrl_characters_Clue;
            if (!Clue) return 'Clue class not found';
            // Cap at ~20 to prevent flooding the queue from repeated calls
            var curClues = 0;
            for (var i = 0; i < g.queue.length; i++) {
                if (g.queue[i] instanceof Clue) curClues++;
            }
            if (curClues >= 20) return 'Already ' + curClues + ' clues — use rerollClues() to reset text instead';
            var before = curClues;
            // spawnClues() uses queue.push() instead of addChar() — it bypasses
            // the charAdded signal, so we must add sprite children ourselves
            g.spawnClues();
            var Game = window.com_watabou_coogee_Game;
            var view = Game && Game.scene && Game.scene.view;
            if (view) {
                for (var i = 0; i < g.queue.length; i++) {
                    var ch = g.queue[i];
                    if (ch instanceof Clue && ch.sprite && ch.sprite.parent == null) {
                        view.map.addChild(ch.sprite);
                        // Match initial visibility: hidden if outside hero's FOV
                        var h = g.hero;
                        ch.sprite.set_visible(!h || h.sees(ch.pos));
                    }
                }
            }
            var after = 0;
            for (var i = 0; i < g.queue.length; i++) {
                if (g.queue[i] instanceof Clue) after++;
            }
            return 'Spawned clues, total: ' + after + ' (+' + (after - before) + ')';
        },

        spawnBoss: function() {
            var g = window.sevendrl;
            if (!g || !g.addChar) return 'No game';
            var Boss = window.com_watabou_sevendrl_characters_Boss;
            if (!Boss) return 'Boss class not found';
            for (var i = 0; i < g.queue.length; i++) {
                if (g.queue[i] instanceof Boss) return 'Boss already exists';
            }
            if (!g.cells || typeof g.cells.indexOf !== 'function') return 'No cells';
            var AE = window.com_watabou_utils_ArrayExtender;
            var candidates = AE ? AE.difference(g.cells, g.hero.getFOV()) : g.cells.slice();
            if (!candidates || candidates.length === 0) {
                var allButHero = g.cells.slice();
                var heroIdx = allButHero.indexOf(g.hero.pos);
                if (heroIdx != -1) allButHero.splice(heroIdx, 1);
                if (allButHero.length === 0) return 'No valid spawn cell';
                candidates = allButHero;
            }
            var pos = AE ? AE.random(candidates) : candidates[0];
            var boss = new Boss(g, pos);
            g.addChar(boss);
            return 'Boss spawned at ' + pos.j + ',' + pos.i;
        },

        // ── Clue Text ───────────────────────────────────────────────
        rerollClues: function() {
            var Clue = window.com_watabou_sevendrl_characters_Clue;
            if (!Clue || !Clue.reset) return 'Clue class not found';
            // Clue.reset() only clears the Tracery deck-selector's internal
            // repeat-avoidance state for FUTURE clue generation — it never
            // touches the .text already baked into existing Clue instances
            // (set once in the constructor). Calling it alone had no
            // visible effect on a level that already has clues spawned.
            // Actually regenerate text for clues still in the world below.
            Clue.reset();
            var g = window.sevendrl;
            if (!g || !g.queue) return 'Clue text generator reset (no active game to reroll live clues)';
            var rerolled = 0, skippedDiscovered = 0;
            for (var i = 0; i < g.queue.length; i++) {
                var ch = g.queue[i];
                if (!(ch instanceof Clue)) continue;
                if (ch.discovered) { skippedDiscovered++; continue; }
                ch.text = Clue.grammar.flatten('#clue#');
                rerolled++;
            }
            return 'Rerolled ' + rerolled + ' clue(s)' + (skippedDiscovered ? ' (' + skippedDiscovered + ' already-discovered left unchanged)' : '');
        },

        // ── Info ─────────────────────────────────────────────────────
        mobs: function() {
            var g = window.sevendrl;
            var q = g && g.queue;
            if (!q) return [];
            var list = [];
            var Mob = window.com_watabou_sevendrl_characters_Mob;
            for (var i = 0; i < q.length; i++) {
                var ch = q[i];
                if (ch === g.hero) continue;
                if (Mob && !(ch instanceof Mob)) continue;
                list.push({
                    id: ch.__id__,
                    name: ch.getName ? ch.getName() : ch.toString ? ch.toString() : '?',
                    hp: ch.hp,
                    pos: ch.pos,
                    state: ch.state ? ch.state.__class__ : '?'
                });
            }
            return list;
        },

        // ── Clue listing ──────────────────────────────────────────────
        // The dev-toolbar's "Clues" button used to check `g.clues` directly,
        // a property that never existed on the game object (clues live in
        // g.queue alongside every other entity, filtered by instanceof) —
        // so it always hit its own "No clues" early-return and never
        // listed anything. Every Haxe object already carries a unique
        // __id__ (used internally for ObjectMap hashing); surfaced here
        // since clue entities had no other stable identifier.
        clues: function() {
            var g = window.sevendrl;
            var q = g && g.queue;
            if (!q) return [];
            var Clue = window.com_watabou_sevendrl_characters_Clue;
            if (!Clue) return [];
            var list = [];
            var clueNum = 0;
            for (var i = 0; i < q.length; i++) {
                var ch = q[i];
                if (!(ch instanceof Clue)) continue;
                clueNum++;
                // Dev tool — shows text for undiscovered clues too (by
                // design, this isn't a player-facing spoiler concern).
                list.push({
                    num: clueNum,
                    id: ch.__id__,
                    discovered: !!ch.discovered,
                    text: ch.text
                });
            }
            return list;
        },

        rooms: function() {
            if (window.Rogue && Rogue.Room) return Rogue.Room.printAll();
            // Fallback if Rogue API not loaded
            var g = window.sevendrl;
            if (!g || !g.plan || !g.plan.rooms) return 'No game';
            var rooms = g.plan.rooms;
            var heroRoom = g.hero && g.hero.room;
            var lines = ['Rooms: ' + rooms.length, 'Visited: ' + g.visited.length];
            for (var i = 0; i < rooms.length; i++) {
                var r = rooms[i];
                var doors = [];
                var diter = r.doors.keys();
                while (diter.hasNext()) {
                    var other = diter.next();
                    var idx = rooms.indexOf(other);
                    doors.push(idx != -1 ? 'R' + idx : '?');
                }
                var diterAll = r.doors.keys();
                var doorCount = 0;
                while (diterAll.hasNext()) { diterAll.next(); doorCount++; }
                var isCorr = r.spacious <= (r.area.length >> 1);
                var isDE = doorCount <= 1;
                var visited = g.visited.indexOf(r) != -1;
                lines.push(
                    (visited ? '*' : ' ') + ' R' + i +
                    ' area=' + r.area.length +
                    (isCorr ? ' (corridor)' : '') +
                    ' doors=[' + doors.join(',') + ']' +
                    (isDE ? ' [DEAD END]' : '') +
                    (heroRoom && r === heroRoom ? ' <-- HERO' : '')
                );
            }
            return lines.join('\n');
        },

        grid: function() {
            var g = window.sevendrl;
            if (!g || !g.plan || !g.plan.grid) return 'No game';
            var grid = g.plan.grid;
            var lines = [];
            for (var i = 0; i < grid.h; i++) {
                var row = '';
                for (var j = 0; j < grid.w; j++) {
                    var cell = grid.cell(i, j);
                    if (!cell) { row += ' '; continue; }
                    if (g.cells.indexOf(cell) === -1) { row += '#'; continue; }
                    var ch = g.getChar(cell);
                    if (!ch) { row += '.'; continue; }
                    if (ch === g.hero) row += '@';
                    else if (ch.getName && ch.getName() === 'boss') row += 'B';
                    else if (ch.getName) row += 'M';
                    else row += '?';
                }
                lines.push(row);
            }
            return lines.join('\n');
        },

        // ── Window Manipulation ─────────────────────────────────────
        showText: function(title, text) {
            var Game = window.com_watabou_coogee_Game;
            var scene = Game && Game.scene;
            if (!scene || !scene.showWindow) return 'No scene window';
            scene.showWindow(title || 'Dev Info', text || 'Hello from Dev Tools');
            return 'Window shown';
        },

        toast: function(msg) {
            var Game = window.com_watabou_coogee_Game;
            var scene = Game && Game.scene;
            if (!scene || !scene.out) return 'No scene';
            scene.out(msg || 'Hello from Dev Tools');
            return 'Toast sent';
        },

        // ── Time / Turn ─────────────────────────────────────────────
        skipTurn: function() {
            var h = window.hero;
            if (!h) return 'No hero';
            // Only safe to skip when hero is idle (waiting for input)
            // Mid-action (isReady=false) would corrupt the action queue
            var g = window.sevendrl;
            if (!g || !g.curCh) return 'Game not ready';
            if (g.curCh !== h) return 'Not hero\'s turn — ' + (g.curCh.getName ? g.curCh.getName() : 'other character') + ' is acting';
            if (!h.isReady) return 'Hero is mid-action, cannot skip now';
            if (!h.wait) return 'Hero has no wait() method';
            h.wait();
            return 'Turn skipped';
        },

        // ── Class Info ──────────────────────────────────────────────
        classes: function(pattern) {
            var results = [];
            var re = pattern ? new RegExp(pattern, 'i') : null;
            for (var key in window) {
                if (key.indexOf('com_watabou_') === 0 && typeof window[key] === 'function') {
                    var name = key.split('_').join('.');
                    if (!re || re.test(name)) results.push(name);
                }
            }
            // Also check the lime namespace for any other haxe classes
            if (window.lime) {
                for (var key2 in window.lime) {
                    if (key2.indexOf('$') === -1 && typeof window.lime[key2] === 'function') {
                        var name2 = 'lime.' + key2;
                        if (!re || re.test(name2)) results.push(name2);
                    }
                }
            }
            return results.length > 0 ? results.sort().join('\n') : 'No classes found (game may not be initialized yet)';
        },

        help: function() {
            var cmds = Object.keys(window.DBG).sort();
            var out = '── DBG commands ──\n';
            for (var i = 0; i < cmds.length; i++) {
                var k = cmds[i];
                var line = (window.DBG[k].toString().split('\n')[0] || '').substring(0, 60);
                out += k + (k.length < 8 ? '\t' : '\t') + line + '\n';
            }
            out += '\n── F12 console shortcuts ──\n';
            out += 'd              \talias for DBG\n';
            out += 'sevendrl       \tcurrent game instance (after clicking canvas)\n';
            out += 'hero           \tcurrent hero (after clicking canvas)\n';
            out += 'ModLoader      \thook toolkit — .validateMethod(), .listMethods(), .find(), .inspect()\n';
            out += 'toggleInspector()\tshow/hide inspector panel\n';
            out += '\nTroubleshooting:\n';
            out += 'DBG.findGame()  \tdiagnose why globals are missing\n';
            out += 'DBG.rooms()     \tshow room structure, types, connections\n';
            out += 'DBG.plan()      \tshow dungeon plan overview + room details\n';
            out += 'DBG.grid()      \tASCII grid dump (hero/mob/clue positions)\n';
            out += 'DBG.god()       \ttoggle god mode\n';
            out += 'Rogue.Room.printAll()  \tsame as DBG.rooms() via API\n';
            out += 'Rogue.Plan.dump()      \tsame as DBG.plan() via API\n';
            out += 'Rogue.Grid.dump()      \tsame as DBG.grid() via API\n';
            out += 'ModLoader.listMethods("com.watabou.sevendrl.SevenDRL")\n';
            return out;
        },

        // ── God Mode ──────────────────────────────────────────────────
        _godMode: false,

        god: function() {
            this._godMode = !this._godMode;
            if (this._godMode && window.hero) {
                var h = window.hero;
                h.hp = h.maxHP || 6;
                if (h.hpChanged) h.hpChanged.dispatch(h.hp);
            }
            return 'God mode ' + (this._godMode ? 'ON' : 'OFF');
        },

        // ── Direct State Manipulation ─────────────────────────────────
        setHP: function(n) {
            var h = window.hero;
            if (!h) return 'No hero';
            h.hp = n !== undefined ? Math.max(0, +n) : 6;
            if (h.hpChanged) h.hpChanged.dispatch(h.hp);
            return 'HP set to ' + h.hp;
        },

        setCard: function(n) {
            var h = window.hero;
            if (!h) return 'No hero';
            var ActionCard = window.com_watabou_sevendrl_ActionCard;
            if (!ActionCard) return 'ActionCard class not found';
            var cards = [ActionCard.WEAK, ActionCard.NORMAL, ActionCard.STRONG];
            var idx = n !== undefined ? Math.max(0, Math.min(+n, 2)) : 1;
            h.card = cards[idx];
            if (h.cardChanged) h.cardChanged.dispatch(h.card);
            return 'Card set to ' + h.card._hx_name;
        },

        // ── Teleport ──────────────────────────────────────────────────
        teleport: function(j, i) {
            var h = window.hero;
            if (!h) return 'No hero';
            var g = window.sevendrl;
            if (!g || !g.plan || !g.plan.grid) return 'No game plan';
            var cell = g.plan.grid.cell(i, j);
            if (!cell) return 'Invalid cell at ' + j + ',' + i;
            h.setPos(cell);
            h.sprite.setPos(i, j);
            if (g.visited.indexOf(h.room) == -1) {
                g.explore(h.room);
                var Game = window.com_watabou_coogee_Game;
                var view = Game && Game.scene && Game.scene.view;
                if (view) {
                    view.updateBounds();
                    view.addVisited(h.room);
                }
            }
            if (window.__eventLogAdd) window.__eventLogAdd('Teleported to ' + j + ',' + i);
            return 'Teleported to ' + j + ',' + i;
        },

        // ── Entity Management ─────────────────────────────────────────
        clear: function() {
            var g = window.sevendrl;
            if (!g || !g.queue) return 'No game';
            var Clue = window.com_watabou_sevendrl_characters_Clue;
            var count = 0;
            for (var i = g.queue.length - 1; i >= 0; i--) {
                var ch = g.queue[i];
                if (ch !== g.hero && !(Clue && ch instanceof Clue)) {
                    if (ch.sprite && ch.sprite.parent) ch.sprite.parent.removeChild(ch.sprite);
                    g.queue.splice(i, 1);
                    count++;
                }
            }
            if (window.__eventLogAdd) window.__eventLogAdd('Cleared ' + count + ' entities');
            return 'Removed ' + count + ' entities';
        },

        // ── Game Flow Control ─────────────────────────────────────────
        _paused: false,

        pause: function() {
            this._paused = !this._paused;
            if (!this._paused && window.hero) {
                window.hero.paused = false;
            } else if (this._paused && window.hero) {
                window.hero.paused = true;
            }
            var msg = this._paused ? 'Game PAUSED' : 'Game RESUMED';
            if (window.__eventLogAdd) window.__eventLogAdd(msg);
            return msg;
        },

        step: function() {
            var g = window.sevendrl;
            if (!g) return 'No game';
            var wasPaused = this._paused;
            this._paused = false;
            if (window.hero) window.hero.paused = false;
            g.proceed();
            if (wasPaused) {
                this._paused = true;
                if (window.hero) window.hero.paused = true;
            }
            var msg = wasPaused ? 'Stepped one tick' : 'proceed() called (game not paused)';
            if (window.__eventLogAdd) window.__eventLogAdd(msg);
            return msg;
        },

        // ── Event Log ─────────────────────────────────────────────────
        plan: function() {
            if (window.Rogue && Rogue.Plan) return Rogue.Plan.dump();
            var g = window.sevendrl;
            if (!g || !g.plan) return 'No game plan';
            var p = g.plan;
            var lines = [
                '── DUNGEON PLAN ──',
                'Grid: ' + p.grid.w + '×' + p.grid.h + ' cells',
                'Rooms: ' + p.rooms.length,
                'Windows: ' + (p.windows ? p.windows.length : 0),
                'Outer walls (abris): ' + (p.abris ? p.abris.length : 0) + ' edges',
                'Inner walls: ' + (p.innerWalls ? p.innerWalls.length : 0),
                '',
                'Room details:'
            ];
            var heroRoom = g.hero && g.hero.room;
            for (var i = 0; i < p.rooms.length; i++) {
                var r = p.rooms[i];
                var diter = r.doors.keys();
                var doorCount = 0;
                while (diter.hasNext()) { diter.next(); doorCount++; }
                var isCorr = r.spacious <= (r.area.length >> 1);
                var isDE = doorCount <= 1;
                var visited = g.visited.indexOf(r) !== -1;
                lines.push(
                    (visited ? '*' : ' ') + ' R' + i +
                    ' area=' + r.area.length +
                    (isCorr ? ' corridor' : '') +
                    ' doors=' + doorCount +
                    (isDE ? ' [DEAD END]' : '') +
                    (heroRoom && r === heroRoom ? ' << HERO' : '')
                );
            }
            return lines.join('\n');
        },

        // ── Ability / Chess Pickup Commands ────────────────────────────
        abilityStock: function(n) {
            if (n !== undefined) {
                var max = (window.__difficultySettings || { maxStock: 6 }).maxStock;
                window.__abilityStock = Math.max(0, Math.min(max, +n));
                if (window.__updateAbilityBar) window.__updateAbilityBar();
                if (window.__eventLogAdd) window.__eventLogAdd('Stock set to ' + window.__abilityStock);
                return 'Stock set to ' + window.__abilityStock;
            }
            return 'Stock: ' + (window.__abilityStock || 0);
        },

        abilityGive: function(type) {
            var pieces = ['pawn','knight','bishop','rook','queen','king'];
            if (!type) {
                type = com_watabou_utils_ArrayExtender.random(pieces);
            } else {
                type = type.toLowerCase();
                if (pieces.indexOf(type) === -1) return 'Unknown piece. Try: ' + pieces.join(', ');
            }
            if (type === 'king') {
                var hero = window.hero;
                if (!hero) return 'No hero';
                hero.maxHP = (hero.maxHP || 6) + 1;
                hero.hp = Math.min(hero.hp + 1, hero.maxHP);
                if (hero.hpChanged) hero.hpChanged.dispatch(hero.hp);
                if (window.__eventLogAdd) window.__eventLogAdd('Debug: King (+1 max HP)');
                return 'King passive applied: +1 max HP (' + hero.maxHP + ')';
            }
            window.__chessAbilities = window.__chessAbilities || [];
            window.__abilityCharges = window.__abilityCharges || {};
            window.__abilityCharges[type] = (window.__abilityCharges[type] || 0) + 1;
            if (window.__chessAbilities.indexOf(type) === -1) window.__chessAbilities.push(type);
            if (window.__selectedAbilityIdx < 0) window.__selectedAbilityIdx = 0;
            if (window.__eventLogAdd) window.__eventLogAdd('Debug: +' + type.charAt(0).toUpperCase() + type.slice(1) + ' (x' + window.__abilityCharges[type] + ')');
            // Refresh indicator if available
            var evt = new CustomEvent('dc-ability-given', { detail: { type: type } });
            window.dispatchEvent(evt);
            return 'Added: ' + type + ' x' + window.__abilityCharges[type] + ' (Tab to select, Q+direction to fire)';
        },

        abilityList: function() {
            var arr = window.__chessAbilities;
            if (!arr || !arr.length) return 'No abilities collected';
            var pieces = { pawn:'Pawn', knight:'Knight', bishop:'Bishop', rook:'Rook', queen:'Queen', king:'King' };
            var charges = window.__abilityCharges || {};
            var lines = ['Collected abilities (' + arr.length + '):'];
            for (var i = 0; i < arr.length; i++) {
                var p = pieces[arr[i]] || arr[i];
                lines.push('  [' + i + '] ' + p + ' x' + (charges[arr[i]] || 0) + (i === window.__selectedAbilityIdx ? ' <-- selected' : ''));
            }
            return lines.join('\n');
        },

        abilityClear: function() {
            window.__chessAbilities = [];
            window.__selectedAbilityIdx = -1;
            window.__abilityCharges = {};
            if (window.__eventLogAdd) window.__eventLogAdd('Abilities cleared');
            return 'All abilities cleared';
        },

        log: function(n) {
            var entries = window.__eventLog || [];
            var count = n !== undefined ? Math.max(1, +n) : 20;
            return entries.slice(-count).join('\n') || '(log empty — start by clicking the game canvas)';
        }
    };

    // ── Toggle dev console from toolbar button ──────────────────────
    DBG.toggleAll = function() {
        var panel = document.getElementById('dev-console');
        if (!panel) return;
        var show = panel.style.display === 'none' || panel.style.display === '';
        panel.style.display = show ? 'flex' : 'none';
    };

    // ── UI helpers (for F12 console access) ──────────────────────────
    DBG.inspector = function() {
        if (window.toggleInspector) { toggleInspector(); return 'Inspector toggled'; }
        return 'Inspector not loaded (add ui/inspector.js to manifest)';
    };
    DBG.toolbar = function() {
        var tb = document.getElementById('dc-dev-toolbar');
        if (!tb) return 'Toolbar not loaded (add ui/dev-toolbar.js to manifest)';
        var btn = document.getElementById('dc-toolbar-toggle');
        if (btn) btn.click();
        return 'Toolbar toggled';
    };

    // Also expose as `d` shorthand in dev console
    window.d = window.DBG;

    // ── Dev tools gate: disable all DBG commands when __devToolsEnabled is false ──
    var _rawDBG = window.DBG;
    window.DBG = new Proxy(_rawDBG, {
        get: function(target, prop) {
            if (typeof target[prop] === 'function' && !window.__devToolsEnabled) {
                return function() { return 'Dev tools disabled — enable in Options'; };
            }
            return target[prop];
        }
    });
    window.d = window.DBG;

    if (window.devLog) window.devLog('[mod:debug] loaded — DBG.{help,status,heal,reveal,spawnClue,spawnBoss,rooms,plan,ability*}');
})();