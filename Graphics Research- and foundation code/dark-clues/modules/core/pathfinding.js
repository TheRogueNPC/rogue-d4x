// ═══════════════════════════════════════════════════════════════════
// PATHFINDING — modules/core/pathfinding.js
// Extracted from SevenDRL.js by extract-seven-drl.js
// Classes: Pathfinder
// ═══════════════════════════════════════════════════════════════════

/**
 * Pathfinder — A* / Dijkstra pathfinding on the dungeon graph.
 *
 * During construction the game's room layout is walked and every walkable
 * cell is wired to its valid neighbours (cardinal directions first, then
 * intercardinal / diagonal directions when not blocked by a wall edge or
 * a missing door).  The resulting adjacency map (`graph`) is then used
 * by `getPath` (single-source shortest path) and `getMap` (flood-fill
 * distance map from a point).
 *
 * All distances are uniform (cost 1 per step) since the dungeon graph
 * has no weighted edges.
 *
 * @class Pathfinder
 * @param {Object} game - The game instance whose `plan` contains rooms and grid data.
 */
var com_watabou_sevendrl_Pathfinder = function(game) {
	/** @type {Object} Reference to the parent game object. */
	this.game = game;

	/**
	 * Adjacency map: cell → Array<cell>.
	 * Each key is a dungeon cell; the value is the list of cells reachable
	 * in one step from that cell through unblocked edges.
	 * @type {haxe_ds_ObjectMap}
	 */
	this.graph = new haxe_ds_ObjectMap();

	var plan = game.plan;
	var grid = plan.grid;

	// Cardinal directions (N, S, E, W) — movement along grid axes.
	var cardinals = [com_watabou_sevendrl_Dir.NORTH,com_watabou_sevendrl_Dir.SOUTH,com_watabou_sevendrl_Dir.EAST,com_watabou_sevendrl_Dir.WEST];

	// Intercardinal directions (NE, NW, SE, SW) — diagonal movement.
	var intercardinals = [com_watabou_sevendrl_Dir.NE,com_watabou_sevendrl_Dir.NW,com_watabou_sevendrl_Dir.SE,com_watabou_sevendrl_Dir.SW];

	// Build the adjacency list for every cell in every room.
	// ╔══ EXTENSION POINT: [Pathfinding] ───────────────────────────
	// ║ What: Graph customization
	// ║ How:  Modify the adjacency-building loop below to add weighted
	// ║       edges, teleporters, locked doors, or conditional passages.
	// ║       You can also replace the graph with a custom structure.
	// ╚═════════════════════════════════════════════════════════════════
	var _g = 0;
	var _g1 = plan.rooms;
	while(_g < _g1.length) {
		var room = _g1[_g];
		++_g;

		// Iterate over every cell that belongs to this room's area.
		var _g2 = 0;
		var _g3 = room.area;
		while(_g2 < _g3.length) {
			var cell = _g3[_g2];
			++_g2;

			// The list of cells this cell is connected to.
			var v = [];
			this.graph.set(cell,v);
			var connected = v;

			// ── Cardinal neighbours ──────────────────────────────
			// A cardinal neighbour is reachable if either:
			//   (a) the edge between the two cells is NOT a room contour wall, or
			//   (b) the edge IS a contour wall but it contains a door.
			var _g4 = 0;
			while(_g4 < cardinals.length) {
				var dir = cardinals[_g4];
				++_g4;

				var e = grid.cellNdir2edge(cell,dir);
				if(room.contour.indexOf(e) == -1 || room.getDoor(e) != null) {
					connected.push(grid.cell(cell.i + dir.di,cell.j + dir.dj));
				}
			}

			// ── Intercardinal (diagonal) neighbours ─────────────
			// Diagonal movement is blocked when ANY of the four edges
			// that form the "diamond" between the two diagonal cells
			// is a room contour wall.  The decomposition helper breaks
			// the intercardinal direction into its two cardinal components.
			var _g5 = 0;
			while(_g5 < intercardinals.length) {
				var dir1 = intercardinals[_g5];
				++_g5;

				var blocked = false;

				// Check the first cardinal component of the diagonal.
				var dc = com_watabou_sevendrl_Dir.decompose.h[dir1.__id__];
				if(!blocked) {
					var cell1 = cell;
					var e1 = grid.cellNdir2edge(cell1,dc[0]);
					if(room.contour.indexOf(e1) != -1) {
						blocked = true;
					}
				}

				// Check the second cardinal component of the diagonal.
				if(!blocked) {
					var cell2 = cell;
					var e2 = grid.cellNdir2edge(cell2,dc[1]);
					if(room.contour.indexOf(e2) != -1) {
						blocked = true;
					}
				}

				// Check the edge from the first intermediate cell to the target.
				if(!blocked) {
					var dir2 = dc[1];
					var cell3 = grid.cell(cell.i + dir2.di,cell.j + dir2.dj);
					var e3 = grid.cellNdir2edge(cell3,dc[0]);
					if(room.contour.indexOf(e3) != -1) {
						blocked = true;
					}
				}

				// Check the edge from the second intermediate cell to the target.
				if(!blocked) {
					var dir3 = dc[0];
					var cell4 = grid.cell(cell.i + dir3.di,cell.j + dir3.dj);
					var e4 = grid.cellNdir2edge(cell4,dc[1]);
					if(room.contour.indexOf(e4) != -1) {
						blocked = true;
					}
				}

				// If no blocking wall was found, the diagonal cell is reachable.
				if(!blocked) {
					connected.push(grid.cell(cell.i + dir1.di,cell.j + dir1.dj));
				}
			}
		}
	}
};

$hxClasses["com.watabou.sevendrl.Pathfinder"] = com_watabou_sevendrl_Pathfinder;
com_watabou_sevendrl_Pathfinder.__name__ = "com.watabou.sevendrl.Pathfinder";

com_watabou_sevendrl_Pathfinder.prototype = {

	/**
	 * Check whether two cells are directly adjacent (connected by a single
	 * edge) in the pathfinding graph.
	 *
	 * @param {Object} cell1 - The first dungeon cell.
	 * @param {Object} cell2 - The second dungeon cell.
	 * @returns {boolean} `true` if `cell2` appears in the adjacency list of `cell1`.
	 */
	areConnected: function(cell1,cell2) {
		return this.graph.h[cell1.__id__].indexOf(cell2) != -1;
	},

	/**
	 * Return the list of cells that are directly reachable from `cell`
	 * in one step (i.e. its graph neighbours).
	 *
	 * @param {Object} cell - The dungeon cell whose neighbours to retrieve.
	 * @returns {Array<Object>} Adjacent cells connected to `cell`.
	 */
	getConnected: function(cell) {
		return this.graph.h[cell.__id__];
	},

	/**
	 * Find the shortest path from `from` to `to` through the given set of
	 * available (walkable) cells using Dijkstra's algorithm (uniform cost).
	 *
	 * The algorithm runs *backwards* — it starts at the destination and
	 * fans out until it reaches the origin, then reconstructs the path
	 * by greedily stepping towards the cell with the smallest distance
	 * at each point.
	 *
	 * @param {Object}   from      - The origin cell.
	 * @param {Object}   to        - The destination cell.
	 * @param {Array<Object>} available - The set of cells the path may use.
	 * @returns {Array<Object>|null} Ordered list of cells from `from` to `to`
	 *   (excluding `from`, including `to`), or `null` if no path exists.
	 */
	getPath: function(from,to,available) {
		// Trivial case — no movement needed.
		if(from == to) {
			return null;
		}

		// Destination must be walkable.
		if(available.indexOf(to) == -1) {
			return null;
		}

		// Initialise distances to infinity for every available cell.
		var _g = new haxe_ds_ObjectMap();
		var _g1 = 0;
		while(_g1 < available.length) {
			var cell = available[_g1];
			++_g1;
			_g.set(cell,1e+10);
		}
		var dist = _g;

		// Copy of available cells that haven't been settled yet.
		var _g = [];
		var _g1 = 0;
		while(_g1 < available.length) {
			var cell = available[_g1];
			++_g1;
			_g.push(cell);
		}
		var unvisited = _g;

		// Seed the destination with distance 0.
		dist.set(to,0.0);

		// Run Dijkstra from the destination outward.
		// ╔══ EXTENSION POINT: [Pathfinding] ───────────────────────────
		// ║ What: Algorithm swap point (A*, Dijkstra, etc.)
		// ║ How:  Replace the Dijkstra loop below with A* (add heuristic),
		// ║       Jump Point Search, or any other pathfinding algorithm.
		// ║       The interface: return ordered cells from `from` to `to`.
		// ╚═════════════════════════════════════════════════════════════════
		var cur = to;
		while(cur != from) {
			// Relax neighbours: try to improve their distance via `cur`.
			var nextValue = dist.h[cur.__id__] + 1;
			var _g = 0;
			var _g1 = this.graph.h[cur.__id__];
			while(_g < _g1.length) {
				var c = _g1[_g];
				++_g;
				if(unvisited.indexOf(c) != -1) {
					if(dist.h[c.__id__] > nextValue) {
						dist.set(c,nextValue);
					}
				}
			}

			// Mark current node as settled.
			HxOverrides.remove(unvisited,cur);

			// Pick the unvisited node with the smallest tentative distance.
			cur = com_watabou_utils_ArrayExtender.min(unvisited,function(c) {
				return dist.h[c.__id__];
			});

			// If no reachable unvisited node remains, the destination is unreachable.
			if(cur == null || dist.h[cur.__id__] == 1e+10) {
				return null;
			}
		}

		// Reconstruct the path from `from` to `to` by always stepping to the
		// neighbour with the smallest distance value.
		var path = [];
		var pos = from;
		while(pos != to) {
			pos = com_watabou_utils_ArrayExtender.min(com_watabou_utils_ArrayExtender.intersect(this.graph.h[pos.__id__],available),function(c) {
				return dist.h[c.__id__];
			});
			path.push(pos);
		}

		return path;
	},

	/**
	 * Compute a flood-fill distance map from `to` to every reachable cell
	 * in the available set.
	 *
	 * This is essentially the same Dijkstra expansion as `getPath`, but
	 * it continues until all available cells have been visited and returns
	 * the full distance map rather than a single path.
	 *
	 * Useful for AI threat analysis, movement range display, or any
	 * feature that needs the distance from a point to every other cell.
	 *
	 * @param {Object}   to        - The origin cell (distance 0).
	 * @param {Array<Object>} available - The set of cells to include in the map.
	 * @returns {haxe_ds_ObjectMap|null} Map of cell → distance (integer),
	 *   or `null` if `to` is not in `available`.
	 */
	getMap: function(to,available) {
		// The origin cell must be walkable.
		if(available.indexOf(to) == -1) {
			return null;
		}

		// Initialise distances to infinity.
		var _g = new haxe_ds_ObjectMap();
		var _g1 = 0;
		while(_g1 < available.length) {
			var cell = available[_g1];
			++_g1;
			_g.set(cell,1e+10);
		}
		var dist = _g;

		// Copy of available cells that haven't been settled yet.
		var _g = [];
		var _g1 = 0;
		while(_g1 < available.length) {
			var cell = available[_g1];
			++_g1;
			_g.push(cell);
		}
		var unvisited = _g;

		// Seed the origin with distance 0.
		dist.set(to,0.0);

		// Expand outward until every reachable cell has been settled.
		// ╔══ EXTENSION POINT: [Pathfinding] ───────────────────────────
		// ║ What: Distance calculation customization
		// ║ How:  Replace the flood-fill loop below with custom distance
		// ║       logic: weighted terrain costs, diagonal penalties,
		// ║       line-of-sight checks, or terrain-type modifiers.
		// ╚═════════════════════════════════════════════════════════════════
		var cur = to;
		while(true) {
			// Relax neighbours.
			var nextValue = dist.h[cur.__id__] + 1;
			var _g = 0;
			var _g1 = this.graph.h[cur.__id__];
			while(_g < _g1.length) {
				var c = _g1[_g];
				++_g;
				if(unvisited.indexOf(c) != -1) {
					if(dist.h[c.__id__] > nextValue) {
						dist.set(c,nextValue);
					}
				}
			}

			// Mark current node as settled.
			HxOverrides.remove(unvisited,cur);

			// All cells have been processed — return the complete distance map.
			if(unvisited.length == 0) {
				return dist;
			}

			// Pick the next unvisited cell with the smallest distance.
			cur = com_watabou_utils_ArrayExtender.min(unvisited,function(c) {
				return dist.h[c.__id__];
			});

			// No more reachable cells — remaining cells are disconnected.
			if(cur == null || dist.h[cur.__id__] == 1e+10) {
				return null;
			}
		}
	},

	/** @type {string} Haxe class identifier for runtime type checks. */
	__class__: com_watabou_sevendrl_Pathfinder
};

// -- Static initializers relocated from runtime/base.js (modules/DECISIONS.md, Bug E) --
com_watabou_sevendrl_Pathfinder.MAX = 1e+10;


// -- Window exports (per module-manifest.json) --
// See modules/DECISIONS.md, Bug B: these were private module-scope
// vars with no export/import/window assignment anywhere.
window.com_watabou_sevendrl_Pathfinder = com_watabou_sevendrl_Pathfinder;



// ═══ END modules/core/pathfinding.js ═══
