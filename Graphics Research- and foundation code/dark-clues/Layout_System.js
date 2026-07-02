// ═══════════════════════════════════════════════════════════════════════
// Layout_System.js — Themed Room Generation + Tag-Driven Layout Tooling
//
// Provides three interfaces for themed dungeon generation:
//   1. Programmatic builder   -> `LayoutSystem.builder()...build()` (in-game + Node)
//   2. JSON/JSON5 CLI intake  -> `node Layout_System.js build spec.json` (CLI)
//   3. Editor integration     -> tags + theme fields in level-creator export
//
// Also adds: Plan.loadFromJSON, Room.assignTheme, ThemeRegistry.
// ═══════════════════════════════════════════════════════════════════════
(function () {
'use strict';

/* ─── Globals ─── */
if (typeof window !== 'undefined') {
  window.LayoutSystem = {};
}

/* ─── Theme Registry ───────────────────────────────────────────────────────
 * A theme controls palette, room shape, prop/window density, spawn weights,
 * and the Tracery grammar namespace used for clues in those rooms.
 */
var LayoutSystem = window.LayoutSystem || {};

LayoutSystem.THEMES = {
  default: {
    id: 'default',
    label: 'Default Dungeon',
    floor: 0x111111,
    wall: 0x333333,
    visited: 0x333333,
    current: 0xFFFFFF,
    prop: 0x444444,
    window: 0x555555,
    clue: 0x999900,
    mob: 0xFF6633,
    hero: 0xFFCC00,
    boss: 0xFF3300,
    roomColors: ['#4488CC','#CC4466','#44CC88','#CC8844','#8844CC','#44CCCC','#CC4488','#88CC44','#CC6644','#66CC44','#CC44AA','#44AACC','#AACC44','#CC44CC'],
    minRoom: 3,
    maxRoom: 14,
    propDensity: 0.4,
    windowDensity: 0.25,
    spawns: {},
    grammar: 'default_clues'
  },
  haunted: {
    id: 'haunted',
    label: 'Haunted Hall',
    floor: 0x1A0F1A,
    wall: 0x2A152A,
    visited: 0x3A1A3A,
    current: 0x7A4A6A,
    prop: 0x4A2A4A,
    window: 0x5A3A5A,
    clue: 0xFFCC88,
    mob: 0xFF8844,
    hero: 0xFFDDAA,
    boss: 0xFF3355,
    roomColors: ['#6A2A4A','#4A2A6A','#5A3A5A','#7A3A4A','#5A4A6A'],
    minRoom: 3,
    maxRoom: 10,
    propDensity: 0.35,
    windowDensity: 0.15,
    spawns: { Wanderer: 0.45, Hunter: 0.15, Ambusher: 0.1, Clue: 0.3 },
    grammar: 'haunted_clues'
  },
  library: {
    id: 'library',
    label: 'Forgotten Library',
    floor: 0x121A24,
    wall: 0x0E1420,
    visited: 0x243040,
    current: 0x4A6A90,
    prop: 0x3A4A5A,
    window: 0x4A5A6A,
    clue: 0x88CCFF,
    mob: 0x88AAFF,
    hero: 0xAADDFF,
    boss: 0x224488,
    roomColors: ['#2A4A6A','#4A3A6A','#3A5A5A','#5A5A4A','#2A5A7A'],
    minRoom: 4,
    maxRoom: 12,
    propDensity: 0.6,
    windowDensity: 0.3,
    spawns: { Wanderer: 0.35, Ambusher: 0.35, Clue: 0.3 },
    grammar: 'library_clues'
  },
  laboratory: {
    id: 'laboratory',
    label: 'Abandoned Laboratory',
    floor: 0x101A10,
    wall: 0x0A140A,
    visited: 0x1E2E1E,
    current: 0x3E6A3E,
    prop: 0x2E3E2E,
    window: 0x3E4E3E,
    clue: 0x88FF88,
    mob: 0xAAFF88,
    hero: 0xCCFFDD,
    boss: 0x227722,
    roomColors: ['#2A5A3A','#4A5A3A','#3A6A4A','#5A6A3A','#3A7A4A'],
    minRoom: 3,
    maxRoom: 9,
    propDensity: 0.7,
    windowDensity: 0.1,
    spawns: { Ambusher: 0.4, Hunter: 0.3, Clue: 0.3 },
    grammar: 'lab_clues'
  }
};

LayoutSystem.getTheme = function (id) {
  return LayoutSystem.THEMES[id] || LayoutSystem.THEMES.default;
};

/* ─── Tag Resolution ─── */
LayoutSystem.resolveRoomTheme = function (room, planTheme, overrides) {
  var theme = LayoutSystem.getTheme(planTheme);
  var tags = (room.tags || []).slice();
  var out = {};

  // Priority: room.theme > room.tags > planTheme > default
  if (room.theme) {
    theme = LayoutSystem.getTheme(room.theme);
  } else if (tags.length) {
    // Merge tags from low to high specificity; last wins on conflicts
    tags.forEach(function (t) {
      var tt = LayoutSystem.getTheme(t);
      if (tt.id !== 'default') Object.assign(out, tt);
    });
    if (Object.keys(out).length) {
      out = Object.assign({}, theme, out);
      theme = out;
    }
  }

  // Per-room overrides
  if (overrides && Object.keys(overrides).length) {
    theme = Object.assign({}, theme, overrides);
  }
  return theme;
};

/* ─── Plan extension points (thin wrappers around internals) ─────────────── */
LayoutSystem.assignThemeToPlan = function (plan, themeId) {
  plan.__themeId = themeId;
  plan.__theme = LayoutSystem.getTheme(themeId);
  return plan;
};

// Monkey-patch Plan to add a JSON loader (additive — signature unchanged)
if (typeof com_watabou_sevendrl_Plan !== 'undefined') {
  com_watabou_sevendrl_Plan.__layoutSystemLoaded = true;

  com_watabou_sevendrl_Plan.loadFromJSON = function (json, optPlanTheme) {
    var data = typeof json === 'string' ? JSON.parse(json) : json;
    var size = data.gridW || data.gridH || 16;
    var required = Math.floor((size * size) * 0.45);
    var plan = com_watabou_sevendrl_Plan.create(size, required, 8);
    LayoutSystem.assignThemeToPlan(plan, optPlanTheme || data.theme || 'default');

    // Replace generated rooms with designer-specified ones if present
    if (data.rooms && data.rooms.length) {
      plan.rooms = [];
      data.rooms.forEach(function (rd) {
        if (!rd.cells || !rd.cells.length) return;
        // rd.cells are [j,i] per creator.js export; convert to cell objects
        var area = rd.cells.map(function (c) { return { j: c[0], i: c[1] }; });
        // Build a dummy contour from bbox since custom plans lack edges;
        // rely on area-only pathfind by marking all walkable and replacing rooms.
        var room = {
          plan: plan,
          area: area,
          contour: [],
          doors: new haxe_ds_ObjectMap(),
          spacious: area.length,
          props: rd.props || [],
          __tags: rd.tags || [],
          __theme: rd.theme || null,
          __label: rd.label || 'Room',
          __spawn: rd.spawn || []
        };
        plan.rooms.push(room);
      });
      plan.__custom = true;
    }
    return plan;
  };
}

/* ─── Programmatic Builder (fluent API) ─────────────────────────────────────
 * Usage (in-game or Node):
 *   var plan = LayoutSystem.builder()
 *     .withTheme('haunted')
 *     .size(20)
 *     .requiredFraction(0.45)
 *     .addRoom({ tags: ['library','secret'], shape: 'rect', cells: [[j,i],...] })
 *     .addRoom({ tags: ['ritual'] })
 *     .build();
 */
LayoutSystem.builder = function () {
  var cfg = {
    theme: 'default',
    size: 16,
    requiredFraction: 0.45,
    minRoomSize: 3,
    maxRoomSize: 14,
    customRooms: []
  };

  var api = {
    withTheme: function (t) { cfg.theme = t; return api; },
    size: function (s) { cfg.size = Math.max(6, s); return api; },
    requiredFraction: function (v) { cfg.requiredFraction = Math.min(0.85, Math.max(0.2, v)); return api; },
    minRoomSize: function (v) { cfg.minRoomSize = v; return api; },
    maxRoomSize: function (v) { cfg.maxRoomSize = v; return api; },
    addRoom: function (def) {
      cfg.customRooms.push(def);
      return api;
    },
    build: function () {
      var required = Math.floor((cfg.size * cfg.size) * cfg.requiredFraction);
      var plan = com_watabou_sevendrl_Plan.create(cfg.size, required, cfg.minRoomSize);
      LayoutSystem.assignThemeToPlan(plan, cfg.theme);

      if (cfg.customRooms.length) {
        plan.customRooms = cfg.customRooms;
      }
      return plan;
    },
    toJSON: function () {
      var out = {
        version: 2,
        generator: 'Layout_System.js',
        theme: cfg.theme,
        gridW: cfg.size,
        gridH: cfg.size,
        rooms: cfg.customRooms.map(function (r, idx) {
          return {
            id: idx,
            label: r.label || ('Room ' + idx),
            cells: (r.cells || []).map(function (c) { return [c[1], c[0]]; }),
            tags: r.tags || [],
            theme: r.theme || null,
            spawn: r.spawn || [],
            heroStart: !!r.heroStart,
            boss: !!r.boss
          };
        })
      };
      return out;
    }
  };

  return api;
};

// ─── Serialization helpers ───
LayoutSystem.exportPlanJSON = function (plan) {
  var data = {
    version: 2,
    generator: 'Layout_System.js',
    theme: plan.__themeId || 'default',
    gridW: plan.grid.w,
    gridH: plan.grid.h,
    rooms: plan.rooms.map(function (room, idx) {
      var cells = (room.area || []).map(function (c) { return [c.j, c.i]; });
      return {
        id: idx,
        label: room.__label || ('Room ' + idx),
        cells: cells,
        tags: room.__tags || [],
        theme: room.__theme || null,
        spawn: room.__spawn || [],
        props: room.props || []
      };
    })
  };
  return JSON.stringify(data, null, 2);
};

/* ─── Node CLI entry ────────────────────────────────────────────────────────
 * `node Layout_System.js build spec.json` -> writes plan.json
 * `node Layout_System.js init` -> writes a sample spec.json
 */
if (typeof window === 'undefined') {
  var argv = require('util').isArray ? process.argv.slice(2) : [];

  function run() {
    var fs = require('fs');
    var path = require('path');

    if (argv.length === 0 || argv[0] === 'init') {
      var sample = {
        version: 2,
        generator: 'Layout_System.js',
        theme: 'haunted',
        size: 18,
        requiredFraction: 0.45,
        minRoomSize: 3,
        maxRoomSize: 10,
        rooms: [
          { tags: ['library','secret'], label: 'Scriptorium' },
          { tags: ['ritual'], label: 'Charnel Chamber', boss: true }
        ]
      };
      var out = JSON.stringify(sample, null, 2);
      fs.writeFileSync(path.join(process.cwd(), 'spec.json'), out, 'utf8');
      console.log('Wrote spec.json -> ' + out);
      return;
    }

    if (argv[0] === 'build') {
      var specPath = argv[1] || 'spec.json';
      var spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
      var builder = LayoutSystem.builder()
        .withTheme(spec.theme || 'default')
        .size(spec.size || 16)
        .requiredFraction(spec.requiredFraction || 0.45)
        .minRoomSize(spec.minRoomSize || 3)
        .maxRoomSize(spec.maxRoomSize || 14);

      (spec.rooms || []).forEach(function (r) { builder.addRoom(r); });
      var plan = builder.build();
      var json = LayoutSystem.exportPlanJSON(plan);
      var outPath = path.join(process.cwd(), 'plan.json');
      fs.writeFileSync(outPath, json, 'utf8');
      console.log('Wrote ' + outPath);
      return;
    }

    console.log('Usage: node Layout_System.js [init|build [spec.json]]');
  }

  // Delay until LayoutSystem is attached from the parent module
  run();
}

})();
