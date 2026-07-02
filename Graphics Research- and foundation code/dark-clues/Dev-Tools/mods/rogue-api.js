// ═══════════════════════════════════════════════════════════════════
// Dev-Tools/mods/rogue-api.js — Unified Modder API
//
// Exposes window.Rogue with subsystems:
//   Rogue.Mob       — custom mob/state class factory
//   Rogue.Grid      — grid/node/cell inspection API
//   Rogue.Room      — room inspection API (doors, area, corridor)
//   Rogue.Plan      — dungeon plan overview (windows, layout)
//   Rogue.Encounter — room-entry encounter definitions
//   Rogue.Ability   — ability stock system
//   Rogue.UI        — game-native canvas panel/window builders
//   Rogue.Util      — helpers (random, game refs, etc.)
//
// All subsystems self-initialize once game classes are on window.
// ═══════════════════════════════════════════════════════════════════

(function() {
    'use strict';

    var Rogue = {
        _ready: false,
        _initQueue: []
    };

    // ── Lazy init: poll until game classes available ──
    function _ready() { return Rogue._ready; }
    Rogue.onReady = function(fn) {
        if (Rogue._ready) { fn(); return; }
        Rogue._initQueue.push(fn);
    };

    // ───────────────────────────────────────────────────────────────
    //  Rogue.Util — shared helpers
    // ───────────────────────────────────────────────────────────────
    Rogue.Util = {
        // Resolve a Haxe class name to the window constructor
        cls: function(name) {
            return window[name.replace(/\./g, '_')];
        },

        // Get current SevenDRL game instance (static .level check)
        getGame: function() {
            var G = Rogue.Util.cls('com.watabou.sevendrl.SevenDRL');
            return G && G.level ? G : null;
        },

        // Get current GameScene
        getScene: function() {
            var Game = Rogue.Util.cls('com.watabou.coogee.Game');
            return Game && Game.scene ? Game.scene : null;
        },

        // Get the Hero
        getHero: function() {
            var g = Rogue.Util.getGame();
            return g ? g.hero : null;
        },

        // Log to event log if available
        log: function(msg) {
            if (window.__eventLogAdd) window.__eventLogAdd(msg);
        },

        // Random helpers (wraps game's Random static methods)
        random: {
            float: function() {
                var R = window.com_watabou_utils_Random;
                return R && R.Float ? R.Float() : Math.random();
            },
            int: function(max) {
                if (max == null) return 0;
                var R = window.com_watabou_utils_Random;
                return R && R.Int ? R.Int(max) : Math.floor(Math.random() * max);
            },
            pick: function(arr) {
                return arr[Rogue.Util.random.int(arr.length)];
            },
            seed: function() {
                var R = window.com_watabou_utils_Random;
                return R ? R.seed : 0;
            }
        },

        // Tweener (async animation helper)
        tween: function(duration, fn) {
            var Tweener = Rogue.Util.cls('com.watabou.processes.Tweener');
            return Tweener.run(duration, fn);
        },

        // Check if a Haxe class/instance is on window
        isAvailable: function(name) {
            return !!Rogue.Util.cls(name);
        }
    };

    // ───────────────────────────────────────────────────────────────
    //  Rogue.Mob — Custom Mob & State factory
    //
    //  Before defining mobs, inspect rooms for placement:
    //    var rooms  = Rogue.Room.getAll();
    //    var plan   = Rogue.Plan.getInfo();
    //    var grid   = Rogue.Grid.getSize();
    //
    //  Usage:
    //    Rogue.Mob.define({ name: 'Imp', hp: 3, ... });
    //      hp: 3,
    //      visual: 'i',
    //      color: 0xFF8800,
    //      name: 'imp',
    //      info: 'A small fiery imp.',
    //      damage: 2,
    //      state: 'chasing',      // 'wandering' (default) | 'chasing'
    //      onChase: function(hero) { ... },   // override chase transition
    //      onEngage: function(hero) { ... },  // override attack
    //      onSight: function(hero) { ... },   // hero enters FOV
    //      onDamage: function(value) { ... }, // takes damage
    //      onDeath: function() { ... },       // dies
    //      extras: {}              // extra prototype methods
    //    });
    //
    //    // Then spawn:
    //    var imp = new Rogue.Mob.Imp(game, pos);
    //
    //    // Or use Encounter API to auto-spawn.
    // ───────────────────────────────────────────────────────────────
    Rogue.Mob = {
        _mobs: {},

        define: function(def) {
            var Mob = Rogue.Util.cls('com.watabou.sevendrl.characters.Mob');
            var StateChasing = Rogue.Util.cls('com.watabou.sevendrl.characters.StateChasing');
            var StateWandering = Rogue.Util.cls('com.watabou.sevendrl.characters.StateWandering');
            var fullName = 'com.watabou.sevendrl.characters.' + def.name;

            // ── Custom State class (if chasing behavior differs) ──
            var hasCustomCombat = def.onEngage || def.damage !== 1;
            var StateClass = StateChasing;

            if (hasCustomCombat) {
                StateClass = function(mob, target) {
                    StateChasing.call(this, mob, target);
                };
                StateClass.__name__ = fullName + 'State';
                StateClass.__super__ = StateChasing;
                StateClass.prototype = Object.create(StateChasing.prototype);
                StateClass.prototype.engage = function() {
                    var _gthis = this;
                    if (def.onEngage) {
                        def.onEngage.call(this, this.target);
                        this.mob.isReady = false;
                        this.mob.sprite.engage(this.mob.pos, this.target.pos).onComplete(function() {
                            _gthis.mob.game.finish(_gthis.mob, true);
                        });
                        return true;
                    }
                    this.target.damage(def.damage || 1);
                    this.mob.isReady = false;
                    this.mob.sprite.engage(this.mob.pos, this.target.pos).onComplete(function() {
                        _gthis.mob.game.finish(_gthis.mob, true);
                    });
                    return true;
                };
                StateClass.prototype.__class__ = StateClass;
                window[fullName + 'State'] = StateClass;
            }

            // ── Mob class ──
            var Cls = function(game, pos) {
                Mob.call(this, game, pos);
                this.hp = def.hp || 1;
                if (def.state !== 'chasing') {
                    this.wander();
                }
                if (def.extras) {
                    for (var k in def.extras) this[k] = def.extras[k];
                }
            };
            Cls.__name__ = fullName;
            Cls.__super__ = Mob;
            Cls.prototype = Object.create(Mob.prototype);

            // Visual
            Cls.prototype.createSprite = function() {
                this.sprite = new (Rogue.Util.cls('com.watabou.sevendrl.visuals.CharacterSprite'))(this, def.visual || '?', false);
                this.sprite.tf.set_textColor(def.color || 0xFFFFFF);
            };
            Cls.prototype.getName = function() { return def.name; };
            Cls.prototype.getInfo = function() { return def.info || 'A ' + def.name + '.'; };

            // Act
            Cls.prototype.act = function() {
                if (this.sees(this.game.hero.pos)) {
                    if (def.onSight) def.onSight.call(this, this.game.hero);
                    if (!((this.state) instanceof StateChasing || (hasCustomCombat && this.state instanceof StateClass))) {
                        this.chase(this.game.hero);
                        return false;
                    }
                }
                return this.state.act();
            };

            // Chase override
            Cls.prototype.chase = function(ch) {
                if (def.onChase) def.onChase.call(this, ch);
                this.state = hasCustomCombat ? new StateClass(this, ch) : new StateChasing(this, ch);
            };

            // Damage hook
            Cls.prototype.damage = function(value) {
                if (value == null) value = 1;
                Mob.prototype.damage.call(this, value);
                if (def.onDamage) def.onDamage.call(this, value);
            };

            // Death hook
            Cls.prototype.die = function() {
                Mob.prototype.die.call(this);
                if (def.onDeath) def.onDeath.call(this);
            };

            Cls.prototype.__class__ = Cls;

            // Export to window
            window[fullName] = Cls;
            Rogue.Mob._mobs[def.name] = Cls;
            return Cls;
        },

        // Spawn a specific mob type at a valid unseen location
        spawn: function(mobClass, game, count) {
            if (count == null) count = 1;
            var available = Rogue.Util.cls('com.watabou.utils.ArrayExtender').difference(game.cells, game.hero.getFOV());
            var spawned = [];
            for (var i = 0; i < count; i++) {
                if (available.length === 0) break;
                var pos = Rogue.Util.random.pick(available);
                var mob = new mobClass(game, pos);
                mob.setPos(pos);
                game.queue.push(mob);
                spawned.push(mob);
            }
            return spawned;
        }
    };

    // ───────────────────────────────────────────────────────────────
    //  Rogue.Grid — Grid inspection API
    //
    //  Grid is the dungeon's graph backbone: (h+1)×(w+1) nodes at
    //  intersections, h×w cells in the squares between them.
    //  Edges are directed connections between adjacent nodes.
    //
    //  Usage:
    //    Rogue.Grid.dump()           → ASCII map of cell contents
    //    Rogue.Grid.cellAt(i, j)     → cell object at (row, col)
    //    Rogue.Grid.nodeAt(i, j)     → node at intersection (row, col)
    //    Rogue.Grid.getSize()        → { w, h }
    //    Rogue.Grid.getCellInfo(cell)→ hero/mob/clue at that cell
    // ───────────────────────────────────────────────────────────────
    Rogue.Grid = {
        getGrid: function() {
            var g = Rogue.Util.getGame();
            return g && g.plan ? g.plan.grid : null;
        },

        cellAt: function(i, j) {
            var grid = Rogue.Grid.getGrid();
            return grid ? grid.cell(i, j) : null;
        },

        nodeAt: function(i, j) {
            var grid = Rogue.Grid.getGrid();
            return grid ? grid.node(i, j) : null;
        },

        getSize: function() {
            var grid = Rogue.Grid.getGrid();
            return grid ? { w: grid.w, h: grid.h } : null;
        },

        getCellInfo: function(cell) {
            var g = Rogue.Util.getGame();
            if (!g) return null;
            var ch = g.getChar(cell);
            if (!ch) return { occupied: false };
            var Hero = Rogue.Util.cls('com.watabou.sevendrl.characters.Hero');
            var Clue = Rogue.Util.cls('com.watabou.sevendrl.characters.Clue');
            var Boss = Rogue.Util.cls('com.watabou.sevendrl.characters.Boss');
            var type = 'mob';
            if (Hero && ch instanceof Hero) type = 'hero';
            else if (Boss && ch instanceof Boss) type = 'boss';
            else if (Clue && ch instanceof Clue) type = 'clue';
            return { occupied: true, type: type, hp: ch.hp, name: ch.getName ? ch.getName() : '?' };
        },

        getCellContents: function(i, j) {
            var cell = Rogue.Grid.cellAt(i, j);
            return cell ? Rogue.Grid.getCellInfo(cell) : null;
        },

        // Distance between two cells (Manhattan)
        cellDistance: function(c1, c2) {
            return Math.abs(c1.i - c2.i) + Math.abs(c1.j - c2.j);
        },

        // ASCII dump of grid: @=hero B=boss M=mob !=clue .=walkable #=wall
        dump: function() {
            var grid = Rogue.Grid.getGrid();
            var g = Rogue.Util.getGame();
            if (!grid || !g) return '(game not ready)';
            var lines = [];
            for (var i = 0; i < grid.h; i++) {
                var row = '';
                for (var j = 0; j < grid.w; j++) {
                    var cell = grid.cell(i, j);
                    if (!cell || g.cells.indexOf(cell) === -1) { row += '#'; continue; }
                    var ch = g.getChar(cell);
                    if (!ch) { row += '.'; continue; }
                    if (ch === g.hero) row += '@';
                    else {
                        var Clue = Rogue.Util.cls('com.watabou.sevendrl.characters.Clue');
                        var Boss = Rogue.Util.cls('com.watabou.sevendrl.characters.Boss');
                        if (Boss && ch instanceof Boss) row += 'B';
                        else if (Clue && ch instanceof Clue) row += '!';
                        else row += 'M';
                    }
                }
                lines.push(row);
            }
            return lines.join('\n');
        },

        // Dump the node/edge grid structure
        dumpNodes: function() {
            var grid = Rogue.Grid.getGrid();
            if (!grid) return '(no grid)';
            var lines = ['Grid: ' + grid.w + '×' + grid.h + ' cells, ' + (grid.w + 1) + '×' + (grid.h + 1) + ' nodes'];
            lines.push('Edges: ' + Object.keys(grid.edges.h).length + ' node connection maps');
            return lines.join('\n');
        }
    };

    // ───────────────────────────────────────────────────────────────
    //  Rogue.Room — Room inspection API
    //
    //  Each room has a contour (boundary edge chain), an area (cell
    //  list), doors (ObjectMap<Room, Door>), props (decorative rects),
    //  and a spacious count (non-corridor cells).
    //
    //  Usage:
    //    Rogue.Room.getAll()           → all rooms in current plan
    //    Rogue.Room.getAt(cell|i, j)   → room containing that cell
    //    Rogue.Room.getHeroRoom()      → hero's current room
    //    Rogue.Room.isCorridor(room)   → true if narrow passage
    //    Rogue.Room.isDeadEnd(room)    → true if only 1 door
    //    Rogue.Room.getDoors(room)     → [{ other, edge, price }]
    //    Rogue.Room.dump(room)         → full room details
    // ───────────────────────────────────────────────────────────────
    Rogue.Room = {
        getAll: function() {
            var g = Rogue.Util.getGame();
            return g && g.plan ? g.plan.rooms : [];
        },

        getById: function(id) {
            var rooms = Rogue.Room.getAll();
            return rooms[id] || null;
        },

        getAt: function(cellOrI, j) {
            var cell = (j !== undefined) ? Rogue.Grid.cellAt(cellOrI, j) : cellOrI;
            if (!cell) return null;
            var rooms = Rogue.Room.getAll();
            for (var i = 0; i < rooms.length; i++) {
                if (rooms[i].area.indexOf(cell) !== -1) return rooms[i];
            }
            return null;
        },

        getHeroRoom: function() {
            var hero = Rogue.Util.getHero();
            return hero ? hero.room : null;
        },

        getVisited: function() {
            var g = Rogue.Util.getGame();
            return g ? (g.visited || []) : [];
        },

        // Check if a room is a narrow corridor (opposite-wall detection)
        isCorridor: function(room) {
            return room.spacious <= (room.area.length >> 1);
        },

        // Check if a room has only one door (dead end)
        isDeadEnd: function(room) {
            var count = 0;
            var iter = room.doors.keys();
            while (iter.hasNext()) { iter.next(); count++; }
            return count <= 1;
        },

        // Get the door connections from a room as plain objects
        getDoors: function(room) {
            var doors = [];
            var map = room.doors;
            var keys = map.keys();
            while (keys.hasNext()) {
                var other = keys.next();
                var door = map.get(other);
                var rooms = Rogue.Room.getAll();
                doors.push({
                    roomId: rooms.indexOf(other),
                    edge: { a: { i: door.edge1.a.i, j: door.edge1.a.j }, b: { i: door.edge1.b.i, j: door.edge1.b.j } },
                    cell: { i: door.cell(room).i, j: door.cell(room).j },
                    price: door.getPrice()
                });
            }
            return doors;
        },

        // Count props in a room
        getPropCount: function(room) {
            return room.props ? room.props.length : 0;
        },

        // Full dump of a room's details
        dump: function(room) {
            var rooms = Rogue.Room.getAll();
            var id = rooms.indexOf(room);
            var diter = room.doors.keys();
            var doorCount = 0;
            while (diter.hasNext()) { diter.next(); doorCount++; }
            var isCorr = Rogue.Room.isCorridor(room);
            var isDE = Rogue.Room.isDeadEnd(room);
            return {
                id: id,
                cells: room.area.length,
                spacious: room.spacious,
                isCorridor: isCorr,
                isDeadEnd: isDE,
                doors: doorCount,
                props: Rogue.Room.getPropCount(room),
                doorList: Rogue.Room.getDoors(room)
            };
        },

        // Pretty-print all rooms
        printAll: function() {
            var rooms = Rogue.Room.getAll();
            var g = Rogue.Util.getGame();
            var visited = g ? g.visited : [];
            var heroRoom = Rogue.Room.getHeroRoom();
            var lines = ['Rooms: ' + rooms.length + '  Visited: ' + visited.length];
            for (var i = 0; i < rooms.length; i++) {
                var r = rooms[i];
                var diter = r.doors.keys();
                var doorCount = 0;
                while (diter.hasNext()) { diter.next(); doorCount++; }
                var isCorr = Rogue.Room.isCorridor(r);
                var isDE = Rogue.Room.isDeadEnd(r);
                var tags = [];
                if (isCorr) tags.push('corridor');
                if (isDE) tags.push('dead-end');
                if (visited.indexOf(r) !== -1) tags.push('visited');
                var here = (heroRoom && r === heroRoom) ? ' << HERO' : '';
                lines.push(
                    (visited.indexOf(r) !== -1 ? '*' : ' ') + ' R' + i +
                    ' area=' + r.area.length +
                    (isCorr ? ' (corridor)' : '') +
                    ' doors=' + doorCount +
                    (isDE ? ' [DEAD END]' : '') +
                    here
                );
            }
            return lines.join('\n');
        }
    };

    // ───────────────────────────────────────────────────────────────
    //  Rogue.Plan — Dungeon plan inspection & custom plan API
    //
    //  Build custom levels from JSON exported by the Level Creator:
    //    Rogue.Plan.loadFromJSON(json)
    //      → creates a complete plan from level-creator JSON data
    //
    //  Auto-load: place plan.json in assets/ and call once on game start:
    //    Rogue.Plan.autoLoad('assets/plan.json')
    //      → stores parsed data; Plan.create() will use it instead
    //      → call before game level is generated
    //
    //  Usage:
    //    Rogue.Plan.getInfo()         → summary object
    //    Rogue.Plan.dump()            → pretty-printed details
    //    Rogue.Plan.toJSON()          → export current plan to JSON
    //    Rogue.Plan.loadFromJSON(json)→ build plan from JSON data
    // ───────────────────────────────────────────────────────────────
    Rogue.Plan = {
        _customPlanData: null,
        _customPlanLoaded: false,

        getPlan: function() {
            var g = Rogue.Util.getGame();
            return g ? g.plan : null;
        },

        getInfo: function() {
            var plan = Rogue.Plan.getPlan();
            if (!plan) return { ready: false };
            return {
                ready: true,
                rooms: plan.rooms.length,
                windows: plan.windows ? plan.windows.length : 0,
                abris: plan.abris ? plan.abris.length : 0,
                innerWalls: plan.innerWalls ? plan.innerWalls.length : 0,
                gridSize: { w: plan.grid.w, h: plan.grid.h }
            };
        },

        getWindowCount: function() {
            var plan = Rogue.Plan.getPlan();
            return plan && plan.windows ? plan.windows.length : 0;
        },

        getAbris: function() {
            var plan = Rogue.Plan.getPlan();
            return plan ? plan.abris : [];
        },

        getInnerWalls: function() {
            var plan = Rogue.Plan.getPlan();
            return plan ? plan.innerWalls : [];
        },

        // Full pretty-printed dump
        dump: function() {
            var info = Rogue.Plan.getInfo();
            if (!info.ready) return '(no plan)';
            var lines = [
                '── DUNGEON PLAN ──',
                'Grid: ' + info.gridSize.w + '×' + info.gridSize.h + ' cells',
                'Rooms: ' + info.rooms + '  Windows: ' + info.windows,
                'Outer walls (abris): ' + info.abris + ' edges',
                'Inner walls (cuts): ' + info.innerWalls,
                ''
            ];
            lines.push(Rogue.Room.printAll());
            return lines.join('\n');
        },

        // Draw a simple ASCII plan overview (room outlines)
        asciiMap: function() {
            var plan = Rogue.Plan.getPlan();
            if (!plan) return '(no plan)';
            var grid = plan.grid;
            var rooms = plan.rooms;
            var map = [];
            for (var i = 0; i <= grid.h; i++) {
                var row = [];
                for (var j = 0; j <= grid.w; j++) {
                    row.push(' ');
                }
                map.push(row);
            }
            // Draw room contours on node grid
            for (var ri = 0; ri < rooms.length; ri++) {
                var r = rooms[ri];
                for (var ei = 0; ei < r.contour.length; ei++) {
                    var e = r.contour[ei];
                    var a = e.a, b = e.b;
                    if (a.i === b.i) {
                        var minJ = Math.min(a.j, b.j);
                        for (var j = minJ; j <= Math.max(a.j, b.j); j++) {
                            if (map[a.i][j] === ' ') map[a.i][j] = '-';
                        }
                    } else {
                        var minI = Math.min(a.i, b.i);
                        for (var i = minI; i <= Math.max(a.i, b.i); i++) {
                            if (map[i][a.j] === ' ') map[i][a.j] = '|';
                        }
                    }
                }
                var cx = 0, cy = 0;
                for (var ci = 0; ci < r.area.length; ci++) {
                    cx += r.area[ci].j;
                    cy += r.area[ci].i;
                }
                cx = Math.round(cx / r.area.length);
                cy = Math.round(cy / r.area.length);
                map[cy][cx] = String(ri);
            }
            return map.map(function(row) { return row.join(''); }).join('\n');
        },

        // ── Custom plan management ─────────────────────────────────
        // Set a custom plan that persists across game restarts
        setCustomPlan: function(jsonData) {
            Rogue.Plan._customPlanData = jsonData;
            if (window.devLog) window.devLog('[Rogue.Plan] custom plan set (' +
                (jsonData.rooms ? jsonData.rooms.length + ' rooms' : 'size ' + jsonData.gridW + '×' + jsonData.gridH) + ')');
        },

        // Clear the stored custom plan
        clearCustomPlan: function() {
            Rogue.Plan._customPlanData = null;
            if (window.devLog) window.devLog('[Rogue.Plan] custom plan cleared');
        },

        // ── Export: convert live plan to level-creator JSON ─────────
        toJSON: function() {
            var plan = Rogue.Plan.getPlan();
            if (!plan) return null;
            var grid = plan.grid;
            var rooms = plan.rooms;
            var Dir = Rogue.Util.cls('com.watabou.sevendrl.Dir');

            var roomData = [];
            var visitedIds = {};
            var nextId = 0;
            var cellToRoomId = {};

            // Assign IDs to rooms and map cells
            for (var ri = 0; ri < rooms.length; ri++) {
                var r = rooms[ri];
                var id = nextId++;
                visitedIds[r.__id__] = id;
                var cells = [];
                for (var ci = 0; ci < r.area.length; ci++) {
                    cells.push([r.area[ci].j, r.area[ci].i]); // [col, row]
                    cellToRoomId[r.area[ci].__id__] = id;
                }
                // Detect doors/connections
                var diter = r.doors.keys();
                var cons = [];
                while (diter.hasNext()) {
                    var other = diter.next();
                    var oid = visitedIds[other.__id__];
                    if (oid !== undefined) cons.push(oid);
                }
                roomData.push({
                    id: id,
                    label: 'Room ' + id,
                    cells: cells,
                    connections: cons,
                    doors: [],
                    heroStart: false,
                    boss: false,
                    spawn: []
                });
            }

            // Detect shared edges for door placement metadata
            for (var ri = 0; ri < rooms.length; ri++) {
                var r = rooms[ri];
                var rid = visitedIds[r.__id__];
                for (var ei = 0; ei < r.contour.length; ei++) {
                    var e = r.contour[ei];
                    var twin = grid.edges.h[e.b.__id__].h[e.a.__id__];
                    if (!twin) continue;
                    var neighbourCell = grid.edge2cell(twin);
                    if (!neighbourCell) continue;
                    var nid = cellToRoomId[neighbourCell.__id__];
                    if (nid !== undefined && nid !== rid) {
                        var dirName = 'NORTH';
                        if (e.dir === Dir.SOUTH) dirName = 'SOUTH';
                        else if (e.dir === Dir.EAST) dirName = 'EAST';
                        else if (e.dir === Dir.WEST) dirName = 'WEST';
                        roomData[rid].doors.push({
                            to: nid,
                            fromCell: [e.a.j, e.a.i],
                            dir: dirName
                        });
                    }
                }
            }

            // Hero start
            var hero = Rogue.Util.getHero();
            var heroPos = hero ? [hero.pos.j, hero.pos.i] : [0, 0];
            for (var ri = 0; ri < roomData.length; ri++) {
                for (var ci = 0; ci < roomData[ri].cells.length; ci++) {
                    if (roomData[ri].cells[ci][0] === heroPos[0] && roomData[ri].cells[ci][1] === heroPos[1]) {
                        roomData[ri].heroStart = true;
                    }
                }
            }

            return {
                version: 1,
                description: 'Exported from Dark Clues live plan',
                gridW: grid.w,
                gridH: grid.h,
                heroStart: heroPos,
                bossRoomId: -1,
                rooms: roomData
            };
        },

        // ── Import: build a live Plan from level-creator JSON ───────
        // Returns { plan, grid, heroStart, bossRoomId } or null on error
        loadFromJSON: function(jsonData) {
            var Grid = Rogue.Util.cls('com.watabou.sevendrl.Grid');
            var Plan = Rogue.Util.cls('com.watabou.sevendrl.Plan');
            var Room = Rogue.Util.cls('com.watabou.sevendrl.Room');
            var Dir = Rogue.Util.cls('com.watabou.sevendrl.Dir');
            if (!Grid || !Plan || !Room || !Dir) {
                if (window.devLog) window.devLog('[Rogue.Plan.loadFromJSON] game classes not ready');
                return null;
            }

            // Parse / stringify to handle objects
            var data = (typeof jsonData === 'string') ? JSON.parse(jsonData) : jsonData;
            if (!data.rooms || !data.gridW || !data.gridH) {
                if (window.devLog) window.devLog('[Rogue.Plan.loadFromJSON] invalid data');
                return null;
            }

            var gw = data.gridW, gh = data.gridH;
            var grid = new Grid(gw, gh);

            // ── Step 1: Build cells array ──
            var cellMap = {}; // roomId → array of cell objects
            for (var ri = 0; ri < data.rooms.length; ri++) {
                var rd = data.rooms[ri];
                cellMap[rd.id] = [];
                var rawCells = rd.cells || [];
                for (var ci = 0; ci < rawCells.length; ci++) {
                    var c = rawCells[ci];
                    var col = c[0], row = c[1];
                    var cell = grid.cell(row, col);
                    if (cell) cellMap[rd.id].push(cell);
                }
            }

            // ── Step 2: Collect all playable cells ──
            var allCells = [];
            var cellSet = {};
            for (var rid in cellMap) {
                for (var ci = 0; ci < cellMap[rid].length; ci++) {
                    var cell = cellMap[rid][ci];
                    var key = cell.i + ',' + cell.j;
                    if (!cellSet[key]) {
                        cellSet[key] = true;
                        allCells.push(cell);
                    }
                }
            }

            // ── Step 3: Compute whole outline (abris) from all cells ──
            var abris = grid.outline(allCells);
            var plan = new Plan(grid, allCells, gw);
            // Override the auto-generated rooms with our custom ones

            // ── Step 4: Create Room objects ──
            // We need to set plan.rooms = [], then create each room manually
            plan.rooms = [];
            var createdRooms = {}; // roomId → game Room object

            for (var ri = 0; ri < data.rooms.length; ri++) {
                var rd = data.rooms[ri];
                var cells = cellMap[rd.id] || [];
                if (cells.length === 0) continue;

                // Compute contour from cells
                var contour = grid.outline(cells);
                var room = new Room(plan, contour);
                // Room constructor computed area/contour/spacious from contour
                // But area will only include cells reachable from edge2cell(contour[0])
                // via flood fill — which is correct for our custom shapes
                createdRooms[rd.id] = room;
                plan.rooms.push(room);
            }

            // ── Step 5: Create doors between connected rooms ──
            for (var ri = 0; ri < data.rooms.length; ri++) {
                var rd = data.rooms[ri];
                var room = createdRooms[rd.id];
                if (!room) continue;
                var connections = rd.connections || [];
                for (var ci = 0; ci < connections.length; ci++) {
                    var otherId = connections[ci];
                    var otherRoom = createdRooms[otherId];
                    if (!otherRoom || otherId <= rd.id) continue; // avoid duplicates

                    // Find shared edge between the two rooms
                    var sharedEdge = null;
                    for (var ei = 0; ei < room.contour.length; ei++) {
                        var e = room.contour[ei];
                        var twin = grid.edges.h[e.b.__id__].h[e.a.__id__];
                        if (!twin) continue;
                        if (otherRoom.contour.indexOf(twin) !== -1) {
                            sharedEdge = e;
                            break;
                        }
                    }
                    if (sharedEdge) {
                        room.link(otherRoom, sharedEdge);
                    }
                }
            }

            // ── Step 6: Set plan meta ──
            plan.abris = abris;
            plan.innerWalls = [];
            plan.windows = [];

            // ── Step 7: Spawn props for visual variety ──
            for (var ri = 0; ri < plan.rooms.length; ri++) {
                try { plan.rooms[ri].spawnProps(); } catch(e) {}
            }

            Rogue.Plan._customPlanLoaded = true;
            if (window.devLog) window.devLog('[Rogue.Plan.loadFromJSON] built ' + plan.rooms.length + ' rooms, ' + grid.w + '×' + grid.h);

            // Return extra info for the game to use
            var heroStart = data.heroStart || [0, 0];
            return {
                plan: plan,
                grid: grid,
                heroStart: heroStart,
                bossRoomId: data.bossRoomId != null ? data.bossRoomId : -1
            };
        },

        // ── Auto-load: fetch plan.json from assets URL and store ────
        // Call before game level is generated (e.g. on GameScene.reset)
        autoLoad: function(url) {
            if (Rogue.Plan._customPlanData) return; // already loaded
            url = url || 'assets/plan.json';
            fetch(url).then(function(r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            }).then(function(data) {
                Rogue.Plan._customPlanData = data;
                if (window.devLog) window.devLog('[Rogue.Plan.autoLoad] loaded custom plan: ' + url);
            }).catch(function(err) {
                if (window.devLog) window.devLog('[Rogue.Plan.autoLoad] no custom plan: ' + err.message);
            });
        },

        // ── Apply: check if custom plan data exists and inject ──────
        // This is called by the init hook during level creation.
        // Returns the loadFromJSON result or null.
        _applyCustomPlan: function() {
            var data = Rogue.Plan._customPlanData;
            if (!data) return null;
            Rogue.Plan._customPlanData = null; // one-shot
            return Rogue.Plan.loadFromJSON(data);
        }
    };

    // ───────────────────────────────────────────────────────────────
    //  Rogue.Encounter — Room-entry encounter definitions
    //
    //  Define a room encounter:
    //    Rogue.Encounter.define({
    //      name: 'spider_nest',
    //      minLevel: 1,
    //      maxLevel: 3,
    //      roomSize: 'large',     // 'small' | 'large' | 'dead_end' | null
    //      priority: 0,           // higher = checked first (default 0)
    //      once: true,            // only trigger once per game
    //      onEnter: function(game, room) {
    //        // return array of characters to add, or falsy to skip
    //        return [new MyMob(game, room.area[0])];
    //      }
    //    });
    //
    //  Or register a custom room-enter handler:
    //    Rogue.Encounter.onRoomEnter(function(room, game) {
    //      // called every time hero enters a new room
    //    });
    // ───────────────────────────────────────────────────────────────
    Rogue.Encounter = {
        _defs: [],
        _handlers: [],
        _triggered: {},

        define: function(def) {
            Rogue.Encounter._defs.push(def);
            Rogue.Encounter._defs.sort(function(a, b) {
                return (b.priority || 0) - (a.priority || 0);
            });
        },

        // Register a handler called on every room enter
        onRoomEnter: function(fn) {
            Rogue.Encounter._handlers.push(fn);
        },

        // Hook RoomEnter to game (call once on ready)
        _hook: function() {
            window.ModLoader.hook('com.watabou.sevendrl.scenes.GameScene', 'reset', function() {
                // reset is called from constructor before this.game is assigned
                if (!this.game || !this.game.hero) return;
                var hero = this.game.hero;
                if (hero.__rogueEncSub) hero.roomChanged.remove(hero.__rogueEncSub);
                hero.__rogueEncSub = function(room) {
                    Rogue.Encounter._onRoomEnter(hero.game, room);
                };
                hero.roomChanged.add(hero.__rogueEncSub);
            });
        },

        _onRoomEnter: function(game, room) {
            // Run generic handlers
            for (var i = 0; i < Rogue.Encounter._handlers.length; i++) {
                try { Rogue.Encounter._handlers[i](room, game); } catch(e) {}
            }

            // Check defined encounters
            var level = Rogue.Util.cls('com.watabou.sevendrl.SevenDRL').level;
            for (var i = 0; i < Rogue.Encounter._defs.length; i++) {
                var def = Rogue.Encounter._defs[i];
                if (def.once && Rogue.Encounter._triggered[def.name]) continue;
                if (def.minLevel != null && level < def.minLevel) continue;
                if (def.maxLevel != null && level > def.maxLevel) continue;
                if (def.roomSize) {
                    var isLarge = room.area.length > 12;
                    var isDeadEnd = room.doors.keys().length <= 1;
                    if (def.roomSize === 'large' && !isLarge) continue;
                    if (def.roomSize === 'small' && isLarge) continue;
                    if (def.roomSize === 'dead_end' && !isDeadEnd) continue;
                }

                try {
                    var result = def.onEnter(game, room);
                    if (result && result.length) {
                        for (var j = 0; j < result.length; j++) {
                            game.addChar(result[j]);
                        }
                        if (def.once) Rogue.Encounter._triggered[def.name] = true;
                        Rogue.Util.log('Encounter: ' + def.name + ' (' + result.length + ' spawned)');
                    }
                } catch(e) {
                    if (window.devLog) window.devLog('[Rogue.Encounter] error in ' + def.name + ':', e.message);
                }
            }
        },

        // Spawn mobs into a room (helper for onEnter implementations)
        spawnInRoom: function(game, room, mobClass, count) {
            var cells = room.area.slice();
            var spawned = [];
            for (var i = 0; i < count && cells.length > 0; i++) {
                var idx = Rogue.Util.random.int(cells.length);
                var cell = cells.splice(idx, 1)[0];
                if (!game.getChar(cell, Rogue.Util.cls('com.watabou.sevendrl.characters.Character'))) {
                    var mob = new mobClass(game, cell);
                    mob.setPos(cell);
                    game.queue.push(mob);
                    spawned.push(mob);
                }
            }
            return spawned;
        }
    };

    // ───────────────────────────────────────────────────────────────
    //  Rogue.Ability — Stock/ability system
    //
    //  Usage:
    //    Rogue.Ability.getStock()          → current stock
    //    Rogue.Ability.setStock(n)         → set stock (clamped)
    //    Rogue.Ability.addStock(n)         → add stock (clamped)
    //    Rogue.Ability.consume(n)          → true if had enough
    //    Rogue.Ability.getMax()            → max stock from difficulty
    //    Rogue.Ability.onChange(fn)        → watch stock changes
    //    Rogue.Ability.registerAbility(keyCode, {
    //      label: 'Fireball',
    //      cost: 2,
    //      onActivate: function(game) { ... }
    //    })
    // ───────────────────────────────────────────────────────────────
    Rogue.Ability = {
        _watchers: [],
        _abilities: [],

        getStock: function() { return window.__abilityStock || 0; },
        setStock: function(n) {
            var max = Rogue.Ability.getMax();
            window.__abilityStock = Math.max(0, Math.min(max, n));
            Rogue.Ability._notify();
        },
        addStock: function(n) {
            Rogue.Ability.setStock(Rogue.Ability.getStock() + (n || 1));
        },
        consume: function(n) {
            if (Rogue.Ability.getStock() < (n || 1)) return false;
            window.__abilityStock -= (n || 1);
            Rogue.Ability._notify();
            return true;
        },
        getMax: function() {
            return (window.__difficultySettings || { maxStock: 6 }).maxStock;
        },
        onChange: function(fn) {
            Rogue.Ability._watchers.push(fn);
        },

        _notify: function() {
            if (window.__updateAbilityBar) window.__updateAbilityBar();
            for (var i = 0; i < Rogue.Ability._watchers.length; i++) {
                try { Rogue.Ability._watchers[i](Rogue.Ability.getStock()); } catch(e) {}
            }
        },

        // Register a custom ability (triggers on key press)
        registerAbility: function(keyCode, def) {
            Rogue.Ability._abilities.push({ keyCode: keyCode, def: def });
        },

        _hookFire: function() {
            window.ModLoader.hook('com.watabou.sevendrl.scenes.GameScene', 'onKey', function(keyCode, down) {
                if (!down) return;
                for (var i = 0; i < Rogue.Ability._abilities.length; i++) {
                    var a = Rogue.Ability._abilities[i];
                    if (keyCode === a.keyCode && Rogue.Ability.consume(a.def.cost || 0)) {
                        try { a.def.onActivate(this.game); } catch(e) {}
                        this.__suppressOrig = true;
                        return;
                    }
                }
            });
        }
    };

    // ───────────────────────────────────────────────────────────────
    //  Rogue.UI — Game-native canvas panel/window builders
    //
    //  These build openfl.display.Sprite trees — the same display list
    //  the game's own Window/CardIndicator/Indicator use — not DOM. A
    //  panel tracks its own running layout (__nextY) so each call to
    //  button/description/prompt stacks the next element underneath
    //  the last and grows the panel's background to fit.
    //
    //  Usage:
    //    var p = Rogue.UI.panel('Title', 'Body text');
    //    Rogue.UI.button('Click me', p, onClick);
    //    Rogue.UI.prompt('Click to close...', p);
    //    scene.addChild(p);   // or wrap in Rogue.UI.overlay(...)
    //
    //    Rogue.UI.gameWindow('Title', 'Body', onClose);
    //
    //    Rogue.UI.toast('Short message', 2.0);
    // ───────────────────────────────────────────────────────────────
    var UI_BG = 0x111122, UI_BORDER = 0xDDDDDD, UI_BORDER_DIM = 0x555555, UI_TEXT = 0xDDDDDD, UI_DIM_TEXT = 0x888888;
    var UI_PAD = 20, UI_WIDTH = 460;

    // CenteredText's own constructor never calls setWidth()/autoSize — every
    // native usage (Window.tfText, Toast) calls setWidth() right after
    // construction to get real dimensions; skip it and the field keeps
    // OpenFL's default ~100x100 TextField box instead of shrinking to fit.
    // 2000 forces the single-line "shrink to actual text width" branch.
    function uiText(str, format, color) {
        var tf = new window.com_watabou_sevendrl_visuals_CenteredText(str, format);
        tf.setWidth(2000);
        if (color != null) tf.set_textColor(color);
        return tf;
    }

    // Redraws a panel's background to fit everything stacked into it so far.
    // Sprite.graphics renders behind that Sprite's own children regardless
    // of call order (see native Window: it draws its background last too),
    // so this is safe to call again after every addition.
    function redrawPanel(p) {
        p.__height = (p.__nextY || 0) + UI_PAD;
        p.get_graphics().clear();
        p.get_graphics().lineStyle(4, UI_BORDER, 1);
        p.get_graphics().beginFill(UI_BG, 1);
        p.get_graphics().drawRect(0, 0, p.__width, p.__height);
    }

    Rogue.UI = {
        // Create a game-styled panel (background:0x111122, border 4px 0xddd).
        // Returns a Sprite with __width/__nextY tracked for stacking more
        // content via button()/description()/prompt() below. width defaults
        // to UI_WIDTH (460) — pass one explicitly for wider layouts (e.g. a
        // panel with a horizontal row of cards inside it).
        panel: function(title, body, width) {
            var Style = window.com_watabou_sevendrl_Style;
            var p = new window.openfl_display_Sprite();
            p.__width = width || UI_WIDTH;
            p.__nextY = UI_PAD;

            if (title) {
                var t = uiText(title, Style.formatTitle, UI_TEXT);
                t.set_x((p.__width - t.get_width()) / 2);
                t.set_y(p.__nextY);
                p.addChild(t);
                p.__nextY += t.get_height() + 8;
            }
            if (body) {
                var b = new window.com_watabou_sevendrl_visuals_CenteredText(body, Style.formatText);
                b.setWidth(p.__width - UI_PAD * 2);
                b.set_x((p.__width - b.get_width()) / 2);
                b.set_y(p.__nextY);
                p.addChild(b);
                p.__nextY += b.get_height() + 12;
            }
            redrawPanel(p);
            return p;
        },

        // Create a game-styled clickable button, stacked into parent if given.
        button: function(label, parent, onClick) {
            var Style = window.com_watabou_sevendrl_Style;
            var w = parent && parent.__width ? parent.__width - UI_PAD * 2 : 200;
            var tf = uiText(label, Style.formatService, UI_TEXT);
            var h = tf.get_height() + 16;
            var b = new window.openfl_display_Sprite();

            function draw(hover) {
                b.get_graphics().clear();
                b.get_graphics().lineStyle(1, hover ? UI_BORDER : UI_BORDER_DIM, 1);
                b.get_graphics().beginFill(UI_BG, 1);
                b.get_graphics().drawRect(0, 0, w, h);
            }
            draw(false);
            tf.set_x((w - tf.get_width()) / 2);
            tf.set_y((h - tf.get_height()) / 2);
            b.addChild(tf);
            b.addEventListener('mouseover', function() { draw(true); });
            b.addEventListener('mouseout', function() { draw(false); });
            if (onClick) b.addEventListener('click', onClick);

            if (parent) {
                b.set_x((parent.__width - w) / 2);
                b.set_y(parent.__nextY);
                parent.addChild(b);
                parent.__nextY += h + 4;
                redrawPanel(parent);
            }
            return b;
        },

        // Create a game-styled inline description text, stacked into parent if given.
        description: function(text, parent) {
            var Style = window.com_watabou_sevendrl_Style;
            var d = uiText(text, Style.formatService, UI_DIM_TEXT);
            if (parent) {
                d.set_x((parent.__width - d.get_width()) / 2);
                d.set_y(parent.__nextY);
                parent.addChild(d);
                parent.__nextY += d.get_height() + 4;
                redrawPanel(parent);
            }
            return d;
        },

        // Create a game-styled prompt (small text, extra gap above it), stacked into parent if given.
        prompt: function(text, parent) {
            var Style = window.com_watabou_sevendrl_Style;
            var p = uiText(text, Style.formatService, UI_DIM_TEXT);
            if (parent) {
                parent.__nextY += 6;
                p.set_x((parent.__width - p.get_width()) / 2);
                p.set_y(parent.__nextY);
                parent.addChild(p);
                parent.__nextY += p.get_height() + 4;
                redrawPanel(parent);
            }
            return p;
        },

        // Full-screen dim overlay with a centered panel. Adds itself to the
        // current scene (if one exists) and returns the overlay Sprite —
        // call Rogue.UI.dismiss(ov) or ov.parent.removeChild(ov) to close it.
        overlay: function(title, body, panelWidth) {
            var scene = Rogue.Util.getScene();
            var w = scene ? scene.rWidth : 1000;
            var h = scene ? scene.rHeight : 800;

            var ov = new window.openfl_display_Sprite();
            ov.get_graphics().beginFill(0x000000, 0.85);
            ov.get_graphics().drawRect(0, 0, w, h);

            var panel = Rogue.UI.panel(title, body, panelWidth);
            panel.set_x((w - panel.__width) / 2);
            panel.set_y((h - panel.__height) / 2);
            ov.addChild(panel);
            ov.__panel = panel;

            if (scene) scene.addChild(ov);
            return ov;
        },

        // Remove an overlay/panel built above from its parent, if attached.
        dismiss: function(displayObject) {
            if (displayObject && displayObject.parent) displayObject.parent.removeChild(displayObject);
        },

        // Stack an arbitrary, already-built DisplayObject into a panel at
        // the current __nextY, advancing the layout by `height` (defaults
        // to the object's own get_height()). For custom content (e.g. a
        // row of cards) that panel()/button()/description()/prompt() above
        // don't cover directly.
        stack: function(displayObject, parent, height) {
            if (!parent) return displayObject;
            displayObject.set_y(parent.__nextY);
            parent.addChild(displayObject);
            parent.__nextY += (height != null ? height : displayObject.get_height()) + 4;
            redrawPanel(parent);
            return displayObject;
        },

        // Left-aligned small label (e.g. a "◈ SECTION" header), stacked
        // into parent if given. Unlike description()/prompt() this is NOT
        // centered. Uses uiText() (CenteredText), not Text.get() — Text.get
        // calls set_htmlText() under the hood, so a label containing "<"/">"
        // would get parsed as an (unknown, silently dropped) HTML tag.
        label: function(text, parent, color) {
            var Style = window.com_watabou_sevendrl_Style;
            var tf = uiText(text, Style.formatService, color);
            if (parent) {
                tf.set_x(UI_PAD);
                Rogue.UI.stack(tf, parent);
            }
            return tf;
        },

        // A real canvas text-input field — wraps the native
        // com.watabou.coogee.ui.utils.Text.input() (a TextField with
        // type=INPUT: focusable, OS-level text editing, a "change" event),
        // the same low-level utility the game's own Text.get() labels are
        // built on. No custom keyboard handling needed.
        textInput: function(initialText, parent, width, onUpdate) {
            var Style = window.com_watabou_sevendrl_Style;
            var tf = window.com_watabou_coogee_ui_utils_Text.input(initialText || '', Style.formatService, onUpdate);
            tf.set_width(width || (parent && parent.__width ? parent.__width - UI_PAD * 2 : 200));
            if (parent) {
                tf.set_x((parent.__width - tf.get_width()) / 2);
                Rogue.UI.stack(tf, parent);
            }
            return tf;
        },

        // A "‹ value ›" row that cycles through `options` on click — the
        // canvas-native equivalent of a <select> when there's a short,
        // fixed list of choices. Returns the row Sprite; call
        // row.__getIdx()/row.__getValue() to read the current selection.
        cycle: function(label, options, initialIdx, parent, onChange) {
            var Style = window.com_watabou_sevendrl_Style;
            var idx = initialIdx || 0;
            var w = parent && parent.__width ? parent.__width - UI_PAD * 2 : 200;
            var h = 28;
            var row = new window.openfl_display_Sprite();

            var labelTf = uiText(label + ':', Style.formatService, UI_DIM_TEXT);
            labelTf.set_x(0);
            labelTf.set_y((h - labelTf.get_height()) / 2);
            row.addChild(labelTf);

            var valueTf = uiText('', Style.formatService, UI_TEXT);
            row.addChild(valueTf);

            function redraw() {
                valueTf.set_text('‹ ' + options[idx] + ' ›');
                valueTf.setWidth(2000);
                valueTf.set_x(w - valueTf.get_width());
                valueTf.set_y((h - valueTf.get_height()) / 2);
            }
            redraw();

            // Near-invisible fill gives the whole row a click hit-area —
            // CenteredText/Text.get fields set mouseEnabled=false on
            // themselves, so only the Sprite's own graphics are clickable.
            row.get_graphics().beginFill(0x000000, 0.001);
            row.get_graphics().drawRect(0, 0, w, h);

            row.addEventListener('click', function() {
                idx = (idx + 1) % options.length;
                redraw();
                if (onChange) onChange(options[idx], idx);
            });
            row.__getIdx = function() { return idx; };
            row.__getValue = function() { return options[idx]; };

            if (parent) Rogue.UI.stack(row, parent, h);
            return row;
        },

        // Show the game's native Window (clue-style popup)
        gameWindow: function(title, text, onClose) {
            var scene = Rogue.Util.getScene();
            if (scene && scene.showWindow) {
                scene.showWindow(title, text);
                if (onClose) {
                    var origHide = scene.hideWindow;
                    scene.hideWindow = function() {
                        origHide.call(scene);
                        scene.hideWindow = origHide;
                        if (onClose) onClose();
                    };
                }
            }
        },

        // Display a temporary toast overlay
        toast: function(msg, duration) {
            if (duration == null) duration = 2.0;
            var scene = Rogue.Util.getScene();
            if (scene && scene.toast == null) {
                scene.out(msg);
                if (duration > 0) {
                    setTimeout(function() {
                        if (scene.toast) {
                            scene.removeChild(scene.toast);
                            scene.toast = null;
                        }
                    }, duration * 1000);
                }
            }
        }
    };

    // ───────────────────────────────────────────────────────────────
    //  Rogue.Registry — Data-driven definition system
    //
    //  Define mobs, abilities, encounters, items, spells with
    //  plain metadata. The registry auto-generates game classes
    //  and hooks on first use.
    //
    //  Usage:
    //    Rogue.Registry.mob('fire_ele', {
    //      name: 'Fire Elemental',
    //      hp: 5, damage: 3,
    //      visual: 'F', color: 0xFF4400,
    //      behavior: 'chasing'
    //    });
    //
    //    Rogue.Registry.ability('fireball', {
    //      keyCode: 69,  // E key
    //      cost: 2,
    //      onActivate: function(game) { ... }
    //    });
    //
    //    Rogue.Registry.encounter('fire_room', {
    //      mobs: ['fire_ele'],
    //      count: [2, 3],
    //      roomSize: 'large',
    //      minLevel: 2, maxLevel: 5,
    //      once: true
    //    });
    //
    //    Rogue.Registry.item('heal_pot', {
    //      label: '!', color: 0xFF0000,
    //      onPickup: function(hero) { hero.damage(-2); }
    //    });
    //
    //    Rogue.Registry.spawn('fire_ele', game, 3);
    // ───────────────────────────────────────────────────────────────
    Rogue.Registry = {
        _store: { mob: {}, ability: {}, encounter: {}, item: {}, spell: {} },

        mob: function(key, def) {
            Rogue.Registry._store.mob[key] = def;
        },
        ability: function(key, def) {
            Rogue.Registry._store.ability[key] = def;
        },
        encounter: function(key, def) {
            Rogue.Registry._store.encounter[key] = def;
        },
        item: function(key, def) {
            Rogue.Registry._store.item[key] = def;
        },
        spell: function(key, def) {
            Rogue.Registry._store.spell[key] = def;
        },

        // Resolve a mob key → generated class (auto-generates on first use)
        _resolveMob: function(key) {
            if (typeof key === 'function') return key;
            var def = Rogue.Registry._store.mob[key];
            if (!def) return null;
            if (def.__class) return def.__class;
            def.name = def.name || key;
            def.state = def.behavior || def.state || 'wandering';
            var cls = Rogue.Mob.define(def);
            def.__class = cls;
            return cls;
        },

        // Spawn a registered mob by key
        spawn: function(key, game, count) {
            if (count == null) count = 1;
            var cls = Rogue.Registry._resolveMob(key);
            if (!cls) { if (window.devLog) window.devLog('[Registry] mob not found: ' + key); return []; }
            return Rogue.Mob.spawn(cls, game, count);
        },

        // Auto-register all encounters that reference registered mobs
        _flushEncounters: function() {
            var enc = Rogue.Registry._store.encounter;
            for (var key in enc) {
                var def = enc[key];
                if (def.__hooked) continue;
                var defCopy = {
                    name: def.name || key,
                    minLevel: def.minLevel,
                    maxLevel: def.maxLevel,
                    roomSize: def.roomSize,
                    priority: def.priority || 0,
                    once: def.once !== false,
                    onEnter: (function(d) {
                        return function(game, room) {
                            var mobKeys = d.mobs || [key];
                            var minC = Array.isArray(d.count) ? d.count[0] : (d.count || 1);
                            var maxC = Array.isArray(d.count) ? d.count[1] : minC;
                            var count = minC + Rogue.Util.random.int(maxC - minC + 1);
                            var all = [];
                            for (var m = 0; m < mobKeys.length; m++) {
                                var cls = Rogue.Registry._resolveMob(mobKeys[m]);
                                if (cls) all = all.concat(Rogue.Encounter.spawnInRoom(game, room, cls, count));
                            }
                            return all;
                        };
                    })(def)
                };
                Rogue.Encounter.define(defCopy);
                def.__hooked = true;
            }
        },

        // Auto-register all abilities from the registry
        _flushAbilities: function() {
            var ab = Rogue.Registry._store.ability;
            for (var key in ab) {
                var def = ab[key];
                if (def.__hooked) continue;
                Rogue.Ability.registerAbility(def.keyCode || key.charCodeAt(0), def);
                def.__hooked = true;
            }
        }
    };

    // ───────────────────────────────────────────────────────────────
    //  Rogue.cleanup — Reset state for new game
    //
    //  Removes all mod-created DOM overlays, resets globals.
    //  Called automatically on GameScene.reset. Mod authors can
    //  call Rogue.cleanup() manually if needed.
    // ───────────────────────────────────────────────────────────────
    Rogue.cleanup = function(preserveStock) {
        // Remove all known mod overlay elements.
        // 'dev-console', 'dc-inspector', and 'dc-dev-toolbar' used to be in
        // this list, but they're persistent session-level dev tools (each
        // only ever created once, via an `if already exists, return` guard
        // in its own init()), not per-game transient overlays like the
        // pause/difficulty/death screens below. Since this runs on EVERY
        // GameScene.reset() — including the very first one during normal
        // game boot — removing them here destroyed them permanently within
        // seconds of any game starting, with no recreation logic anywhere
        // to bring them back (inspector.js's poll loop kept running anyway,
        // throwing on every tick since its panel reference was a now-
        // detached DOM node — see modules/DECISIONS.md style note in
        // inspector.js for the related self-clearing fix).
        // 'dc-aim', 'dc-chess-aim', and 'dc-chess-indicator' also used to be
        // here, but the ability/aim prompts they referred to are canvas
        // sprites now (children of the scene itself, so they're cleaned up
        // automatically by ability.js's/ability-pickup.js's own reset
        // hooks) — those ids never resolve to anything anymore.
        // 'dc-pause-overlay', 'dc-difficulty-overlay', 'dc-intro-message',
        // and 'dc-char-creator-overlay' are gone for the same reason:
        // pause-menu.js/play.js/char-creator.js now build all of these as
        // canvas Sprites (Rogue.UI), not DOM.
        var ids = [
            'dc-death-overlay', 'dc-mystery-overlay', 'dc-spawn-indicator',
            'dc-view-overlay', 'rogue-encounter-ui'
        ];
        for (var i = 0; i < ids.length; i++) {
            var el = document.getElementById(ids[i]);
            if (el) el.remove();
        }

        if (!preserveStock) {
            window.__abilityStock = 0;
            window.__stepCounter = 0;
        }
        window.__gamePaused = false;
    };

    // ───────────────────────────────────────────────────────────────
    //  Initialization — poll until game classes available
    // ───────────────────────────────────────────────────────────────
    (function init() {
        var Mob = Rogue.Util.cls('com.watabou.sevendrl.characters.Mob');
        if (!Mob) { setTimeout(init, 50); return; }

        // Hook cleanup on GameScene reset
        window.ModLoader.hook('com.watabou.sevendrl.scenes.GameScene', 'reset', function() {
            if (!this.game) return;
            Rogue.cleanup(true);
        });

        // Hook Encounter system
        Rogue.Encounter._hook();
        Rogue.Ability._hookFire();

        // Override Plan.create to check for custom plan data on every call
        // This works even if autoLoad() hasn't resolved yet at init time
        var origPlanCreate = Rogue.Util.cls('com.watabou.sevendrl.Plan').create;
        Rogue.Util.cls('com.watabou.sevendrl.Plan').create = function(size, required, roomSize) {
            var result = Rogue.Plan._applyCustomPlan();
            if (result) {
                if (window.devLog) window.devLog('[Rogue.Plan] using custom plan (' + result.plan.rooms.length + ' rooms)');
                window.__customPlanResult = result;
                return result.plan;
            }
            return origPlanCreate(size, required, roomSize);
        };

        // Reposition hero and handle boss room after game is created.
        // This applies arbitrary level-editor-authored data (custom plans),
        // which can be malformed in ways core gameplay never produces — a
        // failure here must never take down the GameScene constructor it's
        // hooked onto, so the whole thing is isolated in try/catch.
        window.ModLoader.after('com.watabou.sevendrl.scenes.GameScene', 'reset', function() {
            if (!this.game || !window.__customPlanResult) return;
            var result = window.__customPlanResult;
            window.__customPlanResult = null;
            try {
                var grid = result.grid;
                // Move hero to custom start position
                if (result.heroStart) {
                    var hCell = grid.cell(result.heroStart[1], result.heroStart[0]);
                    if (hCell && this.game.hero) {
                        this.game.hero.setPos(hCell);
                        if (!this.game.hero.room) {
                            // heroStart isn't inside any room in this plan — leaving the
                            // hero room-less crashes later (Hero.getFOV/sees() requires
                            // this.room). Fall back to the first room with cells instead.
                            var fallbackCell = null;
                            var rooms = result.plan.rooms || [];
                            for (var ri = 0; ri < rooms.length; ri++) {
                                if (rooms[ri].area && rooms[ri].area.length > 0) {
                                    fallbackCell = rooms[ri].area[0];
                                    break;
                                }
                            }
                            if (fallbackCell) {
                                if (window.devLog) window.devLog('[Rogue.Plan] heroStart cell has no room — falling back to first valid room cell');
                                this.game.hero.setPos(fallbackCell);
                            } else if (window.devLog) {
                                window.devLog('[Rogue.Plan] heroStart cell has no room and no fallback room found — hero may be unstable');
                            }
                        }
                        if (this.game.hero.room) {
                            this.game.explore(this.game.hero.room);
                        }
                    }
                }
                // Spawn boss in designated boss room
                if (result.bossRoomId >= 0) {
                    var bossRoom = result.plan.rooms[result.bossRoomId];
                    if (bossRoom && bossRoom.area && bossRoom.area.length > 0) {
                        var Boss = Rogue.Util.cls('com.watabou.sevendrl.characters.Boss');
                        if (Boss) {
                            var bc = bossRoom.area[0];
                            this.game.addChar(new Boss(this.game, bc));
                        }
                    }
                }
            } catch (e) {
                if (window.devLog) window.devLog('[Rogue.Plan] custom plan apply failed — ' + e.message + ' (core game unaffected)');
            }
        });

        // Auto-load plan.json from assets — opt-in only. Without this gate,
        // a leftover assets/plan.json would silently override every game
        // start forever, and the default random ("Random Manor") generator
        // would never run. Set window.__testCustomPlan = true (e.g. from a
        // Level Creator "Test in game" button) before reload to opt in.
        if (typeof fetch !== 'undefined' && window.__testCustomPlan) {
            Rogue.Plan.autoLoad('assets/plan.json');
        }

        Rogue._ready = true;
        for (var i = 0; i < Rogue._initQueue.length; i++) {
            try { Rogue._initQueue[i](); } catch(e) {
                if (window.devLog) window.devLog('[Rogue] init error:', e.message);
            }
        }
        Rogue._initQueue = [];

        if (window.devLog) window.devLog('[Rogue API] ready — Mob, Grid, Room, Plan, Encounter, Ability, UI, Registry');
    })();

    window.Rogue = Rogue;
})();
