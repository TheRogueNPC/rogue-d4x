// ═══════════════════════════════════════════════════════════════════════════
// GAME.JS — Core Game Engine & Dungeon Layout
// ═══════════════════════════════════════════════════════════════════════════
//
// The heart of Dark Clues. This file contains:
//   - Main:          Application entry point (bootstraps the game)
//   - SevenDRL:      The master game controller — owns the turn queue,
//                    spawns entities, tracks clues, triggers win/lose
//   - Plan/Room/Door: Procedural dungeon layout generator
//   - Grid/Node/Edge: The underlying graph structure for the dungeon
//   - PlanView:      Renders the minimap as an isometric-ish floor plan
//   - ActionDeck:    Shuffled deck of attack-power cards (Weak/Normal/Strong)
//
// ARCHITECTURE:
//   The dungeon is a grid of cells. Each cell sits inside a Room. Rooms are
//   connected by Doors. The Plan generator carves rooms out of rectangular
//   areas using a recursive notch-cutting algorithm. Characters move on the
//   grid and interact through the Pathfinder's adjacency graph.
//
// TURN SYSTEM:
//   SevenDRL maintains a circular queue. Each turn, the next character in
//   queue gets to act. The hero acts when the player clicks a cell. Mobs act
//   via their State (idle/wander/chase). After acting, a character signals
//   "done" via game.finish(), which advances the queue.
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────
// Main — Application Entry Point
// ─────────────────────────────────────────────────────────────────────────
/**
 * Main — The application entry point.
 *
 * Called by Lime/OpenFL when the page loads. Resets the RNG, initializes
 * the visual style (font sizes, colors), then launches the Coogee Game
 * framework with TitleScene as the first screen.
 *
 * Extends: com.watabou.coogee.Game
 * Original line: 3301
 */
var com_watabou_sevendrl_Main = function() {
	com_watabou_utils_Random.reset();
	com_watabou_sevendrl_Style.init();
	// ╔══ EXTENSION POINT: [Scene] ─────────────────────────────────
	// ║ What: SWAP POINT for initial scene
	// ║ How:  Replace `com_watabou_sevendrl_scenes_TitleScene` with your
	// ║       own Scene constructor (e.g. custom menu, splash, or lobby).
	// ╚═════════════════════════════════════════════════════════════════
	com_watabou_coogee_Game.call(this,com_watabou_sevendrl_scenes_TitleScene);
};
$hxClasses["com.watabou.sevendrl.Main"] = com_watabou_sevendrl_Main;
com_watabou_sevendrl_Main.__name__ = "com.watabou.sevendrl.Main";
com_watabou_sevendrl_Main.__super__ = com_watabou_coogee_Game;
com_watabou_sevendrl_Main.prototype = $extend(com_watabou_coogee_Game.prototype,{
	/**
	 * Returns the display scale factor, fitting an 800×800 virtual canvas
	 * into the browser window.
	 * @param {number} w - Window width
	 * @param {number} h - Window height
	 * @returns {number} Scale factor (min of width/800, height/800)
	 */
	getScale: function(w,h) {
		return Math.min(w / 800,h / 800);
	}
	,__class__: com_watabou_sevendrl_Main
});

// ─────────────────────────────────────────────────────────────────────────
// ActionDeck — Shuffled Card System
// ─────────────────────────────────────────────────────────────────────────
/**
 * ActionDeck — A shuffled draw pile of action cards.
 *
 * The hero has 3 cards: WEAK (1 dmg), NORMAL (2 dmg), STRONG (3 dmg).
 * Each turn, one card is drawn. After use, it goes to the discard heap.
 * When the draw pile is empty, the heap is reshuffled back in.
 *
 * This creates a cycling rhythm — you can't always hit hard, but you'll
 * never go more than 3 turns without your best card.
 *
 * Original line: 4796
 *
 * @param {Array} cards - Array of ActionCard enum values to shuffle in
 */
var com_watabou_sevendrl_ActionDeck = function(cards) {
	this.cards = com_watabou_utils_ArrayExtender.shuffle(cards);
	this.heap = [];
};
$hxClasses["com.watabou.sevendrl.ActionDeck"] = com_watabou_sevendrl_ActionDeck;
com_watabou_sevendrl_ActionDeck.__name__ = "com.watabou.sevendrl.ActionDeck";
com_watabou_sevendrl_ActionDeck.prototype = {
	/**
	 * Draw the next card. If the draw pile is empty, reshuffles the heap
	 * back into the pile first.
	 * @returns {ActionCard} The drawn card
	 */
	get: function() {
		if(this.cards.length == 0) {
			this.cards = com_watabou_utils_ArrayExtender.shuffle(this.heap);
			this.heap = [];
		}
		return this.cards.shift();
	}
	/**
	 * Discard a used card (goes to the heap until reshuffle).
	 * @param {ActionCard} card - The card to discard
	 */
	,discard: function(card) {
		this.heap.push(card);
	}
	,__class__: com_watabou_sevendrl_ActionDeck
};

// ─────────────────────────────────────────────────────────────────────────
// Grid — The Dungeon's Graph Backbone
// ─────────────────────────────────────────────────────────────────────────
/**
 * Grid — A W×H grid of nodes and cells that forms the dungeon's structure.
 *
 * THINK OF IT LIKE THIS:
 *   Nodes sit at grid intersections (like fence posts). Cells sit in the
 *   squares between them (like garden beds). Edges connect adjacent nodes
 *   and have a direction (NORTH/SOUTH/EAST/WEST).
 *
 *   For a 5×5 grid:
 *     - 6×6 = 36 nodes (intersections)
 *     - 5×5 = 25 cells (rooms go here)
 *     - Edges connect neighboring nodes
 *
 * Grid is the foundation that Plan carves rooms into, and Pathfinder uses
 * for A* pathfinding. All character movement happens on cells.
 *
 * Original line: 4815
 *
 * @param {number} w - Width in cells
 * @param {number} h - Height in cells
 */
var com_watabou_sevendrl_Grid = function(w,h) {
	this.w = w;
	this.h = h;
	// Create (h+1) × (w+1) node grid
	var _g = [];
	var _g1 = 0;
	var _g2 = h + 1;
	while(_g1 < _g2) {
		var i = _g1++;
		var _g3 = [];
		var _g4 = 0;
		var _g5 = w + 1;
		while(_g4 < _g5) {
			var j = _g4++;
			_g3.push(new com_watabou_sevendrl_Node(i,j));
		}
		_g.push(_g3);
	}
	this.nodes = _g;
	// Create h × w cell grid (cells are just {i,j} coordinate objects)
	var _g = [];
	var _g1 = 0;
	var _g2 = h;
	while(_g1 < _g2) {
		var i = _g1++;
		var _g3 = [];
		var _g4 = 0;
		var _g5 = w;
		while(_g4 < _g5) {
			var j = _g4++;
			_g3.push({ i : i, j : j});
		}
		_g.push(_g3);
	}
	this.cells = _g;
	// Wire up edges between adjacent nodes
	this.edges = new haxe_ds_ObjectMap();
	var _g = 0;
	var _g1 = h + 1;
	while(_g < _g1) {
		var i = _g++;
		var _g2 = 0;
		var _g3 = w + 1;
		while(_g2 < _g3) {
			var j = _g2++;
			var n = this.nodes[i][j];
			var this1 = this.edges;
			var v = new haxe_ds_ObjectMap();
			this1.set(n,v);
			var e = v;
			if(i > 0) {
				var k = this.nodes[i - 1][j];
				var v1 = new com_watabou_sevendrl_Edge(n,this.nodes[i - 1][j],com_watabou_sevendrl_Dir.NORTH);
				e.set(k,v1);
			}
			if(i < h) {
				var k1 = this.nodes[i + 1][j];
				var v2 = new com_watabou_sevendrl_Edge(n,this.nodes[i + 1][j],com_watabou_sevendrl_Dir.SOUTH);
				e.set(k1,v2);
			}
			if(j > 0) {
				var k2 = this.nodes[i][j - 1];
				var v3 = new com_watabou_sevendrl_Edge(n,this.nodes[i][j - 1],com_watabou_sevendrl_Dir.WEST);
				e.set(k2,v3);
			}
			if(j < w) {
				var k3 = this.nodes[i][j + 1];
				var v4 = new com_watabou_sevendrl_Edge(n,this.nodes[i][j + 1],com_watabou_sevendrl_Dir.EAST);
				e.set(k3,v4);
			}
		}
	}
};
$hxClasses["com.watabou.sevendrl.Grid"] = com_watabou_sevendrl_Grid;
com_watabou_sevendrl_Grid.__name__ = "com.watabou.sevendrl.Grid";
com_watabou_sevendrl_Grid.prototype = {
	/**
	 * Get a node by grid coordinates. Returns null if out of bounds.
	 * Nodes go from (0,0) to (h,w) — inclusive on both ends.
	 * @param {number} i - Row
	 * @param {number} j - Column
	 * @returns {Node|null}
	 */
	node: function(i,j) {
		if(i >= 0 && i <= this.h && j >= 0 && j <= this.w) {
			return this.nodes[i][j];
		} else {
			return null;
		}
	}
	/**
	 * Get a cell by grid coordinates. Returns null if out of bounds.
	 * Cells go from (0,0) to (h-1,w-1).
	 * @param {number} i - Row
	 * @param {number} j - Column
	 * @returns {Object|null} Cell object {i, j}
	 */
	,cell: function(i,j) {
		if(i >= 0 && i < this.h && j >= 0 && j < this.w) {
			return this.cells[i][j];
		} else {
			return null;
		}
	}
	/**
	 * Get the edge between two nodes.
	 * @param {Node} n1 - First node
	 * @param {Node} n2 - Second node
	 * @returns {Edge} The directed edge from n1 to n2
	 */
	,edge: function(n1,n2) {
		return this.edges.h[n1.__id__].h[n2.__id__];
	}
	/**
	 * Get the twin (reverse) of an edge. If edge goes A→B, twin goes B→A.
	 * @param {Edge} e - The edge
	 * @returns {Edge} The reversed edge
	 */
	,twin: function(e) {
		return this.edges.h[e.b.__id__].h[e.a.__id__];
	}
	/**
	 * From a node and direction, get the connecting edge.
	 * @param {Node} nodeA - Starting node
	 * @param {Dir} dir - Direction to look
	 * @returns {Edge|null} The edge, or null if off-grid
	 */
	,edgeNdir2node: function(nodeA,dir) {
		var nodeB = this.node(nodeA.i + dir.di,nodeA.j + dir.dj);
		if(nodeB != null) {
			return this.edges.h[nodeA.__id__].h[nodeB.__id__];
		} else {
			return null;
		}
	}
	/**
	 * From a cell and direction, get the edge on that side of the cell.
	 * Each cell has 4 edges: NORTH=top, EAST=right, SOUTH=bottom, WEST=left.
	 * @param {Object} cell - Cell {i, j}
	 * @param {Dir} dir - Which side
	 * @returns {Edge|null}
	 */
	,cellNdir2edge: function(cell,dir) {
		var i = cell.i;
		var j = cell.j;
		if(dir == com_watabou_sevendrl_Dir.NORTH) {
			return this.edges.h[this.nodes[i][j].__id__].h[this.nodes[i][j + 1].__id__];
		} else if(dir == com_watabou_sevendrl_Dir.EAST) {
			return this.edges.h[this.nodes[i][j + 1].__id__].h[this.nodes[i + 1][j + 1].__id__];
		} else if(dir == com_watabou_sevendrl_Dir.SOUTH) {
			return this.edges.h[this.nodes[i + 1][j + 1].__id__].h[this.nodes[i + 1][j].__id__];
		} else if(dir == com_watabou_sevendrl_Dir.WEST) {
			return this.edges.h[this.nodes[i + 1][j].__id__].h[this.nodes[i][j].__id__];
		} else {
			return null;
		}
	}
	/**
	 * Get the neighboring cell in a given direction.
	 * @param {Object} c - Current cell {i, j}
	 * @param {Dir} dir - Direction
	 * @returns {Object|null} The neighbor cell, or null if off-grid
	 */
	,cellNdir2cell: function(c,dir) {
		return this.cell(c.i + dir.di,c.j + dir.dj);
	}
	/**
	 * Get a node offset from an origin by a direction and distance.
	 * @param {Node} origin - Starting node
	 * @param {Dir} dir - Direction
	 * @param {number} [dist=1] - How many steps
	 * @returns {Node|null}
	 */
	,nodeOffset: function(origin,dir,dist) {
		if(dist == null) {
			dist = 1;
		}
		return this.node(origin.i + dir.di * dist,origin.j + dir.dj * dist);
	}
	/**
	 * Given an edge, returns the cell on its "left" side (based on direction).
	 * This is how edges map back to the cells they border.
	 * @param {Edge} edge
	 * @returns {Object|null} The cell on the left side
	 */
	,edge2cell: function(edge) {
		var a = edge.a;
		if(edge.dir == com_watabou_sevendrl_Dir.EAST) {
			return this.cell(a.i,a.j);
		} else if(edge.dir == com_watabou_sevendrl_Dir.SOUTH) {
			return this.cell(a.i,a.j - 1);
		} else if(edge.dir == com_watabou_sevendrl_Dir.WEST) {
			return this.cell(a.i - 1,a.j - 1);
		} else if(edge.dir == com_watabou_sevendrl_Dir.NORTH) {
			return this.cell(a.i - 1,a.j);
		} else {
			return null;
		}
	}
	/**
	 * Compute the outline (boundary edges) of a set of cells.
	 * Returns an ordered chain of edges forming the polygon outline.
	 * Used by Plan to determine room shapes and by PlanView for rendering.
	 * @param {Array} cells - Array of cells to outline
	 * @returns {Array<Edge>} Ordered boundary edges
	 */
	,outline: function(cells) {
		var edges = [];
		var _g = 0;
		while(_g < cells.length) {
			var c = cells[_g];
			++_g;
			var n00 = this.nodes[c.i][c.j];
			var n01 = this.nodes[c.i][c.j + 1];
			var n11 = this.nodes[c.i + 1][c.j + 1];
			var n10 = this.nodes[c.i + 1][c.j];
			if(cells.indexOf(this.cell(c.i - 1,c.j)) == -1) {
				edges.push(this.edges.h[n00.__id__].h[n01.__id__]);
			}
			if(cells.indexOf(this.cell(c.i,c.j + 1)) == -1) {
				edges.push(this.edges.h[n01.__id__].h[n11.__id__]);
			}
			if(cells.indexOf(this.cell(c.i + 1,c.j)) == -1) {
				edges.push(this.edges.h[n11.__id__].h[n10.__id__]);
			}
			if(cells.indexOf(this.cell(c.i,c.j - 1)) == -1) {
				edges.push(this.edges.h[n10.__id__].h[n00.__id__]);
			}
		}
		var last = edges.pop();
		var outline = [last];
		while(true) {
			var next = null;
			var _g = 0;
			var _g1 = [com_watabou_sevendrl_Dir.cw.h[last.dir.__id__],last.dir,com_watabou_sevendrl_Dir.ccw.h[last.dir.__id__]];
			while(_g < _g1.length) {
				var dir = _g1[_g];
				++_g;
				next = this.edgeNdir2node(last.b,dir);
				if(next != null && edges.indexOf(next) != -1) {
					break;
				}
			}
			HxOverrides.remove(edges,next);
			outline.push(next);
			last = next;
			if(!(last.b != outline[0].a)) {
				break;
			}
		}
		return outline;
	}
	/**
	 * Given a contour (boundary edge chain), flood-fills to find all cells
	 * inside it. Used by Room to determine its area.
	 * @param {Array<Edge>} contour - The boundary edge chain
	 * @returns {Array<Object>} Array of cells {i, j}
	 */
	,contour2area: function(contour) {
		var start = this.edge2cell(contour[0]);
		var area = [start];
		var toCheck = [start];
		while(toCheck.length > 0) {
			var c = toCheck.pop();
			var _g = 0;
			var _g1 = com_watabou_sevendrl_Dir.ALL;
			while(_g < _g1.length) {
				var dir = _g1[_g];
				++_g;
				var n = this.cell(c.i + dir.di,c.j + dir.dj);
				if(n != null && area.indexOf(n) == -1) {
					var edge = this.cellNdir2edge(c,dir);
					if(contour.indexOf(edge) == -1) {
						area.push(n);
						toCheck.push(n);
					}
				}
			}
		}
		return area;
	}
	/**
	 * Reverse an edge chain (flip all edge directions).
	 * @param {Array<Edge>} chain
	 * @returns {Array<Edge>} Reversed chain
	 */
	,revertChain: function(chain) {
		var result = [];
		var _g = 0;
		while(_g < chain.length) {
			var edge = chain[_g];
			++_g;
			result.unshift(this.edges.h[edge.b.__id__].h[edge.a.__id__]);
		}
		return result;
	}
	,__class__: com_watabou_sevendrl_Grid
};

// ─────────────────────────────────────────────────────────────────────────
// Node — Grid Intersection Point
// ─────────────────────────────────────────────────────────────────────────
/**
 * Node — A single point on the grid (intersection of grid lines).
 *
 * Nodes sit at integer coordinates and define the corners of cells.
 * They're used for edge connectivity and pathfinding.
 *
 * Original line: 5035
 *
 * @param {number} i - Row coordinate
 * @param {number} j - Column coordinate
 */
var com_watabou_sevendrl_Node = function(i,j) {
	this.i = i;
	this.j = j;
};
$hxClasses["com.watabou.sevendrl.Node"] = com_watabou_sevendrl_Node;
com_watabou_sevendrl_Node.__name__ = "com.watabou.sevendrl.Node";
/**
 * Manhattan distance between two nodes (|Δi| + |Δj|).
 * @param {Node} n1
 * @param {Node} n2
 * @returns {number}
 */
com_watabou_sevendrl_Node.distance = function(n1,n2) {
	var di = n1.i - n2.i;
	var dj = n1.j - n2.j;
	return (di >= 0 ? di : -di) + (dj >= 0 ? dj : -dj);
};
com_watabou_sevendrl_Node.prototype = {
	__class__: com_watabou_sevendrl_Node
};

// ─────────────────────────────────────────────────────────────────────────
// Edge — Directed Connection Between Nodes
// ─────────────────────────────────────────────────────────────────────────
/**
 * Edge — A directed link between two adjacent nodes.
 *
 * Edges have a direction (NORTH/SOUTH/EAST/WEST) and connect node A to
 * node B. Each edge has a "twin" — the same link going the other way.
 * Edges form the walls of cells and the connections in the pathfinding graph.
 *
 * Original line: 5049
 *
 * @param {Node} a   - Source node
 * @param {Node} b   - Destination node
 * @param {Dir}  dir - Direction from a to b
 */
var com_watabou_sevendrl_Edge = function(a,b,dir) {
	this.a = a;
	this.b = b;
	this.dir = dir;
};
$hxClasses["com.watabou.sevendrl.Edge"] = com_watabou_sevendrl_Edge;
com_watabou_sevendrl_Edge.__name__ = "com.watabou.sevendrl.Edge";
com_watabou_sevendrl_Edge.prototype = {
	/**
	 * Manhattan distance between the two endpoint nodes.
	 * @returns {number}
	 */
	length: function() {
		return com_watabou_sevendrl_Node.distance(this.a,this.b);
	}
	,__class__: com_watabou_sevendrl_Edge
};

// ─────────────────────────────────────────────────────────────────────────
// Dir — Cardinal/Intercardinal Direction
// ─────────────────────────────────────────────────────────────────────────
/**
 * Dir — Represents a compass direction as a (di, dj) offset pair.
 *
 * NORTH = (-1, 0), SOUTH = (1, 0), EAST = (0, 1), WEST = (0, -1)
 * Plus intercardinals: NE, NW, SE, SW and their diagonal combinations.
 *
 * Static properties (set elsewhere):
 *   Dir.NORTH, Dir.SOUTH, Dir.EAST, Dir.WEST — the 4 cardinals
 *   Dir.NE, Dir.NW, Dir.SE, Dir.SW — intercardinals
 *   Dir.ALL — [N, E, S, W]
 *   Dir.cw — clockwise rotation map
 *   Dir.ccw — counter-clockwise rotation map
 *   Dir.op — opposite direction map
 *   Dir.decompose — maps intercardinals to their 2 cardinal components
 *
 * Original line: 5062
 *
 * @param {number} di - Row offset (-1, 0, or 1)
 * @param {number} dj - Column offset (-1, 0, or 1)
 */
var com_watabou_sevendrl_Dir = function(di,dj) {
	this.di = di;
	this.dj = dj;
};
$hxClasses["com.watabou.sevendrl.Dir"] = com_watabou_sevendrl_Dir;
com_watabou_sevendrl_Dir.__name__ = "com.watabou.sevendrl.Dir";
com_watabou_sevendrl_Dir.prototype = {
	__class__: com_watabou_sevendrl_Dir
};

// ─────────────────────────────────────────────────────────────────────────
// ChainUtils — Edge Chain Utilities
// ─────────────────────────────────────────────────────────────────────────
/**
 * ChainUtils — Static helper functions for working with edge chains.
 *
 * An edge chain is an ordered sequence of edges forming a path or contour.
 * These utilities handle: finding edges, slicing chains, converting to
 * node lists, and merging collinear edges into longer segments.
 *
 * Original line: 5071
 */
var com_watabou_sevendrl_ChainUtils = function() { };
$hxClasses["com.watabou.sevendrl.ChainUtils"] = com_watabou_sevendrl_ChainUtils;
com_watabou_sevendrl_ChainUtils.__name__ = "com.watabou.sevendrl.ChainUtils";
/**
 * Find the first edge in a chain that starts from a given node.
 * @param {Array<Edge>} chain
 * @param {Node} node
 * @returns {Edge|null}
 */
com_watabou_sevendrl_ChainUtils.findEdge = function(chain,node) {
	var _g = 0;
	while(_g < chain.length) {
		var e = chain[_g];
		++_g;
		if(e.a == node) {
			return e;
		}
	}
	return null;
};
/**
 * Convert an edge chain to a list of nodes.
 * @param {Array<Edge>} chain
 * @param {boolean} [closed=false] - If true, omit the first node (it's the same as last)
 * @returns {Array<Node>}
 */
com_watabou_sevendrl_ChainUtils.toNodes = function(chain,closed) {
	if(closed == null) {
		closed = false;
	}
	var nodes = closed ? [] : [chain[0].a];
	var _g = 0;
	while(_g < chain.length) {
		var e = chain[_g];
		++_g;
		nodes.push(e.b);
	}
	return nodes;
};
/**
 * Extract a sub-chain between two nodes (wraps around if needed).
 * @param {Array<Edge>} chain
 * @param {Node} start
 * @param {Node} end
 * @returns {Array<Edge>}
 */
com_watabou_sevendrl_ChainUtils.slice = function(chain,start,end) {
	var start1 = chain.indexOf(com_watabou_sevendrl_ChainUtils.findEdge(chain,start));
	var end1 = chain.indexOf(com_watabou_sevendrl_ChainUtils.findEdge(chain,end));
	if(start1 < end1) {
		return chain.slice(start1,end1);
	} else {
		return chain.slice(start1).concat(chain.slice(0,end1));
	}
};
/**
 * Get the next edge in a circular chain.
 * @param {Array<Edge>} chain
 * @param {Edge} edge
 * @returns {Edge}
 */
com_watabou_sevendrl_ChainUtils.next = function(chain,edge) {
	return chain[(chain.indexOf(edge) + 1) % chain.length];
};
/**
 * Get the previous edge in a circular chain.
 * @param {Array<Edge>} chain
 * @param {Edge} edge
 * @returns {Edge}
 */
com_watabou_sevendrl_ChainUtils.prev = function(chain,edge) {
	return chain[(chain.indexOf(edge) + chain.length - 1) % chain.length];
};
/**
 * Merge consecutive collinear edges into longer "long edges."
 * Used by Plan to find the best place to cut rooms.
 * @param {Array<Edge>} contour
 * @returns {Array<Edge>} Merged edges
 */
com_watabou_sevendrl_ChainUtils.longEdges = function(contour) {
	var conLen = contour.length;
	var longEdges = [];
	var start = 0;
	while(contour[start].dir == contour[(start + conLen - 1) % conLen].dir) ++start;
	while(true) {
		var length = 1;
		while(contour[start].dir == contour[(start + length) % conLen].dir) ++length;
		longEdges.push(new com_watabou_sevendrl_Edge(contour[start].a,contour[(start + length) % conLen].a,contour[start].dir));
		start = (start + length) % conLen;
		if(!(longEdges[longEdges.length - 1].b != longEdges[0].a)) {
			break;
		}
	}
	return longEdges;
};

// ─────────────────────────────────────────────────────────────────────────
// Plan — Procedural Dungeon Generator
// ─────────────────────────────────────────────────────────────────────────
/**
 * Plan — Generates a dungeon layout by recursively carving rooms.
 *
 * ALGORITHM (Recursive Notch Cutting):
 *   1. Start with a filled rectangular area (the "contour").
 *   2. Find the longest straight edge ("notch") on the contour.
 *   3. Cut perpendicular to that edge, splitting the area in two.
 *   4. Recurse on each half until pieces are small enough to be rooms.
 *   5. Connect adjacent rooms with doors (choosing the shortest paths).
 *   6. "Wall off" some doors to create dead ends and maze-like corridors.
 *   7. Place windows on outer walls.
 *   8. Spawn decorative props (furniture, crates, etc.) in each room.
 *
 * The result is a collection of rooms with doors, windows, and props —
 * the physical layout of the dungeon.
 *
 * Original line: 5315
 *
 * @param {Grid}  grid     - The grid to carve into
 * @param {Array} whole    - Array of cells to fill the initial shape
 * @param {number} roomSize - Minimum room dimension before stopping recursion
 */
var com_watabou_sevendrl_Plan = function(grid,whole,roomSize) {
	this.grid = grid;
	this.whole = whole;
	this.abris = grid.outline(whole);
	this.rooms = [];
	this.innerWalls = [];
	this.divideArea(this.abris,roomSize);
	this.connectRooms();
	this.spawnWindows();
	var _g = 0;
	var _g1 = this.rooms;
	while(_g < _g1.length) {
		var r = _g1[_g];
		++_g;
		r.spawnProps();
	}
};
$hxClasses["com.watabou.sevendrl.Plan"] = com_watabou_sevendrl_Plan;
com_watabou_sevendrl_Plan.__name__ = "com.watabou.sevendrl.Plan";
/**
 * Factory method — creates a complete Plan from scratch.
 *
 * 1. Scatters random rectangles on a size×size map until enough cells
 *    are covered (at least `required` cells).
 * 2. Builds a Grid and collects all covered cells.
 * 3. Creates a Plan with those cells and the given room size limit.
 *
 * @param {number} size     - Grid dimension (e.g. 16 for level 1, 24 for level 3)
 * @param {number} required - Minimum number of cells to cover
 * @param {number} [roomSize=0] - Max room dimension (0 = use size)
 * @returns {Plan}
 */
com_watabou_sevendrl_Plan.create = function(size,required,roomSize) {
	if(roomSize == null) {
		roomSize = 0;
	}
	var _g = [];
	var _g1 = 0;
	var _g2 = size;
	while(_g1 < _g2) {
		var _ = _g1++;
		var _g3 = [];
		var _g4 = 0;
		var _g5 = size;
		while(_g4 < _g5) {
			var _1 = _g4++;
			_g3.push(false);
		}
		_g.push(_g3);
	}
	var map = _g;
	var area = 0;
	var rects = [];
	while(true) {
		var rect = null;
		while(true) {
			var w = Math.floor(2 + (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 * ((size >> 1) - 2));
			var h = Math.floor(2 + (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 * ((size >> 1) - 2));
			var x = Math.floor((com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 * (size - w));
			var y = Math.floor((com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 * (size - h));
			rect = new com_watabou_geom_Rect(x,y,w,h);
			if(rects.length > 0) {
				var intersects = false;
				var _g = 0;
				while(_g < rects.length) {
					var r = rects[_g];
					++_g;
					if(r.intersects(rect)) {
						intersects = true;
						break;
					}
				}
				if(!intersects) {
					rect = null;
				}
			}
			if(!(rect == null)) {
				break;
			}
		}
		rects.push(rect);
		var _g1 = rect.top;
		var _g2 = rect.top + rect.height;
		while(_g1 < _g2) {
			var i = _g1++;
			var _g3 = rect.left;
			var _g4 = rect.left + rect.width;
			while(_g3 < _g4) {
				var j = _g3++;
				if(!map[i][j]) {
					map[i][j] = true;
					++area;
				}
			}
		}
		if(!(area < required)) {
			break;
		}
	}
	var grid = new com_watabou_sevendrl_Grid(size,size);
	var area = [];
	var _g = 0;
	var _g1 = size;
	while(_g < _g1) {
		var i = _g++;
		var _g2 = 0;
		var _g3 = size;
		while(_g2 < _g3) {
			var j = _g2++;
			if(map[i][j]) {
				area.push(grid.cell(i,j));
			}
		}
	}
	return new com_watabou_sevendrl_Plan(grid,area,roomSize == 0 ? size : roomSize);
};
com_watabou_sevendrl_Plan.prototype = {
	/**
	 * Recursively divide an area into smaller rooms.
	 * Finds a notch (corner) in the contour, cuts across it, and recurses
	 * on both halves until they're small enough to be individual rooms.
	 *
	 * @param {Array<Edge>} contour - Current area boundary
	 * @param {number} limit - Minimum size threshold
	 */
	divideArea: function(contour,limit) {
		var area = this.grid.contour2area(contour);
		var randomSize = limit + ((this.whole.length >> 2) - limit) * Math.abs(((com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 + (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 + (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 + (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647) / 2 - 1);
		if(area.length <= randomSize) {
			this.addRoom(contour);
			return;
		}
		var notch = this.getNotch(contour);
		if(notch == null) {
			this.addRoom(contour);
			return;
		}
		var dir = notch.dir;
		var cut = [notch];
		while(com_watabou_sevendrl_ChainUtils.findEdge(contour,cut[cut.length - 1].b) == null) cut.push(this.grid.edgeNdir2node(cut[cut.length - 1].b,dir));
		var tmp;
		if(cut.length > 1) {
			var chance = cut.length / limit;
			if(chance == null) {
				chance = 0.5;
			}
			tmp = (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 < chance;
		} else {
			tmp = false;
		}
		if(tmp) {
			dir = com_watabou_utils_ArrayExtender.random([com_watabou_sevendrl_Dir.cw.h[dir.__id__],com_watabou_sevendrl_Dir.ccw.h[dir.__id__]]);
			var f = cut.length / 2;
			var chance = f - (f | 0);
			if(chance == null) {
				chance = 0.5;
			}
			cut = cut.slice(0,(f | 0) + ((com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 < chance ? 1 : 0));
			while(com_watabou_sevendrl_ChainUtils.findEdge(contour,cut[cut.length - 1].b) == null) cut.push(this.grid.edgeNdir2node(cut[cut.length - 1].b,dir));
		}
		this.innerWalls.push(cut);
		var part1 = com_watabou_sevendrl_ChainUtils.slice(contour,cut[cut.length - 1].b,cut[0].a).concat(cut);
		var part2 = com_watabou_sevendrl_ChainUtils.slice(contour,cut[0].a,cut[cut.length - 1].b).concat(this.grid.revertChain(cut));
		this.divideArea(part1,limit);
		this.divideArea(part2,limit);
	}
	/**
	 * Find the best notch point on a contour for cutting.
	 * A notch is the midpoint of the longest straight edge — this
	 * creates the most natural-looking room splits.
	 *
	 * @param {Array<Edge>} contour
	 * @returns {Node|null} The notch node, or null if contour is too small
	 */
	,getNotch: function(contour) {
		var longEdges = com_watabou_sevendrl_ChainUtils.longEdges(contour);
		var _g = [];
		var _g1 = 0;
		var _g2 = longEdges;
		while(_g1 < _g2.length) {
			var v = _g2[_g1];
			++_g1;
			if(com_watabou_sevendrl_Node.distance(v.a,v.b) > 1) {
				_g.push(v);
			}
		}
		longEdges = _g;
		if(longEdges.length == 0) {
			return null;
		}
		var edge2cut = com_watabou_utils_ArrayExtender.max(longEdges,function(e) {
			return com_watabou_sevendrl_Node.distance(e.a,e.b);
		});
		var node2cut = this.grid;
		var edge2cut1 = edge2cut.a;
		var edge2cut2 = edge2cut.dir;
		var f = com_watabou_sevendrl_Node.distance(edge2cut.a,edge2cut.b) / 2;
		var chance = f - (f | 0);
		if(chance == null) {
			chance = 0.5;
		}
		var node2cut1 = node2cut.nodeOffset(edge2cut1,edge2cut2,(f | 0) + ((com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 < chance ? 1 : 0));
		var dir = com_watabou_sevendrl_Dir.cw.h[edge2cut.dir.__id__];
		return this.grid.edgeNdir2node(node2cut1,dir);
	}
	,getNotch1: function(contour) {
		var _g = [];
		var _g1 = 0;
		var _g2 = contour;
		while(_g1 < _g2.length) {
			var v = _g2[_g1];
			++_g1;
			var v1 = v.dir;
			var this1 = com_watabou_sevendrl_Dir.cw;
			var key = com_watabou_sevendrl_ChainUtils.prev(contour,v).dir;
			if(v1 != this1.h[key.__id__]) {
				_g.push(v);
			}
		}
		var cuttable = _g;
		var edge2cut = com_watabou_utils_ArrayExtender.random(cuttable);
		var node2cut = edge2cut.a;
		var prev = com_watabou_sevendrl_ChainUtils.prev(contour,edge2cut);
		var dir = prev.dir == edge2cut.dir ? com_watabou_sevendrl_Dir.cw.h[edge2cut.dir.__id__] : com_watabou_utils_ArrayExtender.random([com_watabou_sevendrl_Dir.op.h[edge2cut.dir.__id__],com_watabou_sevendrl_Dir.cw.h[edge2cut.dir.__id__]]);
		return this.grid.edgeNdir2node(node2cut,dir);
	}
	/**
	 * Convert a contour into a Room object and add it to the plan.
	 * @param {Array<Edge>} contour
	 */
	,addRoom: function(contour) {
		this.rooms.push(new com_watabou_sevendrl_Room(this,contour));
	}
	/**
	 * Find which room a cell belongs to.
	 * @param {Object} cell - Cell {i, j}
	 * @returns {Room|null}
	 */
	,getRoom: function(cell) {
		var _g = 0;
		var _g1 = this.rooms;
		while(_g < _g1.length) {
			var room = _g1[_g];
			++_g;
			if(room.area.indexOf(cell) != -1) {
				return room;
			}
		}
		return null;
	}
	/**
	 * Connect all adjacent rooms with doors.
	 *
	 * Algorithm:
	 *   1. Find all pairs of rooms that share a contour edge.
	 *   2. For each pair, pick the edge that minimizes the "entrance cost"
	 *      (preferring edges that aren't already busy).
	 *   3. Wall off redundant doors (creating a spanning tree + some extras).
	 *   4. Remove walled doors to create dead ends.
	 */
	,connectRooms: function() {
		var _gthis = this;
		var _g = new haxe_ds_ObjectMap();
		var _g1 = 0;
		var _g2 = this.rooms;
		while(_g1 < _g2.length) {
			var room = _g2[_g1];
			++_g1;
			var _g3 = new haxe_ds_ObjectMap();
			var _g4 = 0;
			var _g5 = this.rooms;
			while(_g4 < _g5.length) {
				var another = _g5[_g4];
				++_g4;
				_g3.set(another,[]);
			}
			_g.set(room,_g3);
		}
		var links = _g;
		var link = function(a,b,edge) {
			com_watabou_utils_ArrayExtender.add(links.h[a.__id__].h[b.__id__],edge);
			com_watabou_utils_ArrayExtender.add(links.h[b.__id__].h[a.__id__],_gthis.grid.edges.h[edge.b.__id__].h[edge.a.__id__]);
		};
		var _g = 0;
		var _g1 = this.rooms;
		while(_g < _g1.length) {
			var room = _g1[_g];
			++_g;
			var _g2 = 0;
			var _g3 = room.contour;
			while(_g2 < _g3.length) {
				var e = _g3[_g2];
				++_g2;
				var twin = this.grid.edges.h[e.b.__id__].h[e.a.__id__];
				if(twin != null) {
					var neighbour = this.grid.edge2cell(twin);
					var another = this.getRoom(neighbour);
					if(another != null) {
						link(room,another,e);
					}
				}
			}
		}
		var busy = [];
		var estimateEntrance = function(cell,room) {
			var count = 0;
			var _g = 0;
			var _g1 = com_watabou_sevendrl_Dir.ALL;
			while(_g < _g1.length) {
				var dir = _g1[_g];
				++_g;
				var neighbour = _gthis.grid.cell(cell.i + dir.di,cell.j + dir.dj);
				if(room.area.indexOf(neighbour) != -1) {
					++count;
				}
			}
			if(busy.indexOf(cell) != -1) {
				count *= 2;
			}
			return count;
		};
		var checked = [];
		var _g = 0;
		var _g1 = this.rooms;
		while(_g < _g1.length) {
			var room = _g1[_g];
			++_g;
			checked.push(room);
			var map = links.h[room.__id__];
			var _g5_map = map;
			var _g5_keys = map.keys();
			while(_g5_keys.hasNext()) {
				var key = _g5_keys.next();
				var _g6_value = _g5_map.get(key);
				var _g6_key = key;
				var another = _g6_key;
				var edges = _g6_value;
				if(checked.indexOf(another) != -1) {
					continue;
				}
				var candidates = [];
				var minPrice = Infinity;
				var _g2 = 0;
				while(_g2 < edges.length) {
					var e = edges[_g2];
					++_g2;
					var twin = this.grid.edges.h[e.b.__id__].h[e.a.__id__];
					var n1 = estimateEntrance(this.grid.edge2cell(e),room);
					var n2 = estimateEntrance(this.grid.edge2cell(twin),another);
					var price = n1 * n2;
					if(price == minPrice) {
						candidates.push(e);
					} else if(price < minPrice) {
						minPrice = price;
						candidates = [e];
					}
				}
				if(candidates.length > 0) {
					var e1 = com_watabou_utils_ArrayExtender.random(candidates);
					room.link(another,e1);
					com_watabou_utils_ArrayExtender.add(busy,this.grid.edge2cell(e1));
					com_watabou_utils_ArrayExtender.add(busy,this.grid.edge2cell(this.grid.edges.h[e1.b.__id__].h[e1.a.__id__]));
				}
			}
		}
		this.wallDoors();
		var _g = 0;
		var _g1 = this.walledDoors;
		while(_g < _g1.length) {
			var door = _g1[_g];
			++_g;
			door.room1.unlink(door.room2);
		}
	}
	/**
	 * Select which doors to wall off, creating a maze-like structure.
	 *
	 * Strategy:
	 *   1. Wall off any door where a shorter path exists through a third room.
	 *   2. Build a minimum spanning tree of rooms.
	 *   3. Randomly remove ~half of the remaining doors for variety.
	 */
	,wallDoors: function() {
		this.walledDoors = [];
		var _g = 0;
		var _g1 = this.rooms;
		while(_g < _g1.length) {
			var room = _g1[_g];
			++_g;
			var map = room.doors;
			var _g_map = map;
			var _g_keys = map.keys();
			while(_g_keys.hasNext()) {
				var key = _g_keys.next();
				var _g1_value = _g_map.get(key);
				var _g1_key = key;
				var another = _g1_key;
				var door = _g1_value;
				var dist = door.getPrice();
				var link = true;
				var _g2 = 0;
				var _g3 = this.rooms;
				while(_g2 < _g3.length) {
					var r = _g3[_g2];
					++_g2;
					if(room.doors.h.__keys__[r.__id__] != null && r.doors.h.__keys__[another.__id__] != null) {
						var d1 = room.doors.h[r.__id__].getPrice();
						var d2 = r.doors.h[another.__id__].getPrice();
						if(d1 < dist && d2 < dist) {
							link = false;
							break;
						}
					}
				}
				if(!link) {
					this.walledDoors.push(door);
				}
			}
		}
		var doors = [];
		var _g = 0;
		var _g1 = this.rooms;
		while(_g < _g1.length) {
			var r1 = _g1[_g];
			++_g;
			var _g2 = 0;
			var _g3 = this.rooms;
			while(_g2 < _g3.length) {
				var r2 = _g3[_g2];
				++_g2;
				var d = r1.doors.h[r2.__id__];
				if(d != null) {
					com_watabou_utils_ArrayExtender.add(doors,d);
				}
			}
		}
		com_watabou_utils_ArrayExtender.removeAll(doors,this.walledDoors);
		var unconnected = this.rooms.slice();
		var connected = [com_watabou_utils_ArrayExtender.pick(unconnected)];
		while(unconnected.length > 0) {
			var ways = [];
			var _g = 0;
			while(_g < connected.length) {
				var r1 = connected[_g];
				++_g;
				var _g1 = 0;
				while(_g1 < unconnected.length) {
					var r2 = unconnected[_g1];
					++_g1;
					if(r1.doors.h.__keys__[r2.__id__] != null) {
						com_watabou_utils_ArrayExtender.add(ways,r1.doors.h[r2.__id__]);
					}
				}
			}
			com_watabou_utils_ArrayExtender.removeAll(ways,this.walledDoors);
			var door = com_watabou_utils_ArrayExtender.min(ways,function(d) {
				return d.getPrice();
			});
			var toConnect = unconnected.indexOf(door.room1) != -1 ? door.room1 : door.room2;
			HxOverrides.remove(doors,door);
			HxOverrides.remove(unconnected,toConnect);
			com_watabou_utils_ArrayExtender.add(connected,toConnect);
		}
		com_watabou_utils_ArrayExtender.addAll(this.walledDoors,com_watabou_utils_ArrayExtender.subset(doors,doors.length >> 1));
	}
	/**
	 * Place windows on outer walls. Windows are purely decorative — they
	 * make the dungeon feel less claustrophobic by showing "outside."
	 */
	,spawnWindows: function() {
		var n = this.abris.length >> 2;
		var groups = [];
		var _g = 0;
		var _g1 = this.rooms;
		while(_g < _g1.length) {
			var room = _g1[_g];
			++_g;
			var _g2 = 0;
			var _g3 = com_watabou_sevendrl_Dir.ALL;
			while(_g2 < _g3.length) {
				var dir = _g3[_g2];
				++_g2;
				var group = [];
				var _g4 = 0;
				var _g5 = room.contour;
				while(_g4 < _g5.length) {
					var e = _g5[_g4];
					++_g4;
					if(this.abris.indexOf(e) != -1 && e.dir == dir) {
						group.push(e);
					}
				}
				if(group.length > 0) {
					groups.push(group);
				}
			}
		}
		this.windows = [];
		while(this.windows.length < n) {
			var _g = [];
			var _g1 = 0;
			while(_g1 < groups.length) {
				var g = groups[_g1];
				++_g1;
				_g.push(g.length);
			}
			var group = com_watabou_utils_ArrayExtender.weighted(groups,_g);
			HxOverrides.remove(groups,group);
			var a = this.windows;
			var _g2 = 0;
			while(_g2 < group.length) {
				var e = group[_g2];
				++_g2;
				a.push(e);
			}
		}
	}
	,__class__: com_watabou_sevendrl_Plan
};

// ─────────────────────────────────────────────────────────────────────────
// Room — A Single Dungeon Room
// ─────────────────────────────────────────────────────────────────────────
/**
 * Room — One room in the dungeon.
 *
 * Each room has:
 *   - A contour: the ordered chain of edges forming its boundary
 *   - An area: the list of cells inside it
 *   - Doors: connections to neighboring rooms (stored as a Map<Room, Door>)
 *   - Props: decorative rectangles (furniture, crates) for visual variety
 *   - A "spacious" count: how many non-corridor cells it has (used for
 *     door placement scoring)
 *
 * A room can also be a "corridor" — a narrow 1-cell-wide passage between
 * larger rooms. Corridors are detected by checking if a cell has walls
 * on opposite sides.
 *
 * Original line: 5776
 *
 * @param {Plan}      plan    - The parent plan
 * @param {Array<Edge>} contour - Boundary edge chain
 */
var com_watabou_sevendrl_Room = function(plan,contour) {
	this.plan = plan;
	this.contour = contour;
	this.area = plan.grid.contour2area(contour);
	this.doors = new haxe_ds_ObjectMap();
	this.spacious = 0;
	var _g = 0;
	var _g1 = this.area;
	while(_g < _g1.length) {
		var cell = _g1[_g];
		++_g;
		if(!this.isCorridor(cell)) {
			this.spacious++;
		}
	}
};
$hxClasses["com.watabou.sevendrl.Room"] = com_watabou_sevendrl_Room;
com_watabou_sevendrl_Room.__name__ = "com.watabou.sevendrl.Room";
com_watabou_sevendrl_Room.prototype = {
	/**
	 * Create a door connecting this room to another.
	 * @param {Room} room - The other room
	 * @param {Edge} edge - The shared edge where the door goes
	 */
	link: function(room,edge) {
		var door = new com_watabou_sevendrl_Door(this,room,edge);
		this.doors.set(room,door);
		room.doors.set(this,door);
	}
	/**
	 * Remove the door between this room and another.
	 * @param {Room} room
	 */
	,unlink: function(room) {
		this.doors.remove(room);
		room.doors.remove(this);
	}
	/**
	 * Find the door that sits on a given edge.
	 * @param {Edge} edge
	 * @returns {Door|null}
	 */
	,getDoor: function(edge) {
		var door = this.doors.iterator();
		while(door.hasNext()) {
			var door1 = door.next();
			if((this == door1.room1 ? door1.edge1 : this == door1.room2 ? door1.edge2 : null) == edge) {
				return door1;
			}
		}
		return null;
	}
	/**
	 * Check if a cell is a corridor (narrow passage).
	 * A cell is a corridor if it has walls on two opposite sides.
	 * @param {Object} cell
	 * @returns {boolean}
	 */
	,isCorridor: function(cell) {
		var _g = [];
		var _g1 = 0;
		var _g2 = com_watabou_sevendrl_Dir.ALL;
		while(_g1 < _g2.length) {
			var dir = _g2[_g1];
			++_g1;
			_g.push(this.contour.indexOf(this.plan.grid.cellNdir2edge(cell,dir)) != -1);
		}
		var borders = _g;
		if(!(borders[0] && borders[1])) {
			if(borders[2]) {
				return borders[3];
			} else {
				return false;
			}
		} else {
			return true;
		}
	}
	/**
	 * Check if a cell has a door on any of its edges.
	 * @param {Object} cell
	 * @returns {boolean}
	 */
	,hasDoor: function(cell) {
		var door = this.doors.iterator();
		while(door.hasNext()) {
			var door1 = door.next();
			if(this.plan.grid.edge2cell(this == door1.room1 ? door1.edge1 : this == door1.room2 ? door1.edge2 : null) == cell) {
				return true;
			}
		}
		return false;
	}
	/**
	 * Spawn decorative props (furniture rectangles) along walls.
	 *
	 * Props are small rectangles placed against contour edges, sized and
	 * oriented randomly. They create visual variety — a room with props
	 * feels "lived in" versus an empty corridor.
	 */
	,spawnProps: function() {
		var maxSize = 0.1 + 0.4 * ((com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647);
		var minSize = 0.1 + (maxSize - 0.1) * ((com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647);
		var clusterSize = 1 + 3 * ((com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647);
		var ratio = 0.3 + 0.6 * (((com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 + (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 + (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647) / 3);
		var edges = [];
		var _g = 0;
		var _g1 = this.contour;
		while(_g < _g1.length) {
			var edge = _g1[_g];
			++_g;
			var cell = this.plan.grid.edge2cell(edge);
			var noDoors = true;
			var _g2 = 0;
			var _g3 = com_watabou_sevendrl_Dir.ALL;
			while(_g2 < _g3.length) {
				var dir = _g3[_g2];
				++_g2;
				if(this.getDoor(this.plan.grid.cellNdir2edge(cell,dir)) != null) {
					noDoors = false;
					break;
				}
			}
			if(noDoors && (!this.isCorridor(cell) || (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 < 0.5)) {
				edges.push(edge);
			}
		}
		this.props = [];
		var n = Math.round(edges.length * Math.abs(((com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 + (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 + (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 + (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647) / 2 - 1));
		var _g = 0;
		var _g1 = com_watabou_utils_ArrayExtender.subset(edges,n);
		while(_g < _g1.length) {
			var e = _g1[_g];
			++_g;
			var _g2 = 0;
			var chance = clusterSize - (clusterSize | 0);
			if(chance == null) {
				chance = 0.5;
			}
			var _g3 = (clusterSize | 0) + ((com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 < chance ? 1 : 0);
			while(_g2 < _g3) {
				var _ = _g2++;
				var pr = minSize + (maxSize - minSize) * ((com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647);
				var qr = pr * Math.pow(ratio,2 * (((com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 + (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 + (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647) / 3));
				var chance1 = 0.2;
				if(chance1 == null) {
					chance1 = 0.5;
				}
				if((com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 < chance1) {
					var t = pr;
					pr = qr;
					qr = t;
				}
				var f = ((com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 + (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 + (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647) / 3 - 0.5;
				var p = -0.09 + pr + (1.18 - pr * 2) * (f < 0 ? 1 + f : f);
				var q = 0.09 + qr - 0.03;
				var a = e.a.j;
				var p1 = p;
				if(p1 == null) {
					p1 = 0.5;
				}
				var x = a + (e.b.j - a) * p1 - e.dir.di * q;
				var a1 = e.a.i;
				var p2 = p;
				if(p2 == null) {
					p2 = 0.5;
				}
				var y = a1 + (e.b.i - a1) * p2 + e.dir.dj * q;
				var poly = e.dir.di == 0 ? new openfl_geom_Rectangle(x - pr,y - qr,pr * 2,qr * 2) : new openfl_geom_Rectangle(x - qr,y - pr,qr * 2,pr * 2);
				this.props.push(poly);
			}
		}
	}
	,__class__: com_watabou_sevendrl_Room
};

// ─────────────────────────────────────────────────────────────────────────
// Door — Connection Between Two Rooms
// ─────────────────────────────────────────────────────────────────────────
/**
 * Door — A doorway connecting two rooms through a shared edge.
 *
 * Each door stores:
 *   - room1, room2: the two rooms it connects
 *   - edge1, edge2: the corresponding edges (twins of each other)
 *   - plan: reference to the parent Plan
 *
 * The "price" of a door measures how desirable it is — lower price means
 * the door is more important (connects rooms with fewer alternatives).
 *
 * Original line: 5919
 *
 * @param {Room} room   - First room
 * @param {Room} another - Second room
 * @param {Edge} edge   - The shared edge
 */
var com_watabou_sevendrl_Door = function(room,another,edge) {
	this.plan = room.plan;
	this.room1 = room;
	this.edge1 = edge;
	this.room2 = another;
	this.edge2 = this.plan.grid.edges.h[edge.b.__id__].h[edge.a.__id__];
};
$hxClasses["com.watabou.sevendrl.Door"] = com_watabou_sevendrl_Door;
com_watabou_sevendrl_Door.__name__ = "com.watabou.sevendrl.Door";
com_watabou_sevendrl_Door.prototype = {
	/**
	 * Compute the door's "price" — how many corridor cells it connects.
	 * Lower price = more important connection.
	 * @returns {number}
	 */
	getPrice: function() {
		return this.room1.spacious - this.room1.area.length + (this.room2.spacious - this.room2.area.length);
	}
	/**
	 * Given one room, return the other room this door connects to.
	 * @param {Room} room
	 * @returns {Room|null}
	 */
	,another: function(room) {
		if(room == this.room1) {
			return this.room2;
		} else if(room == this.room2) {
			return this.room1;
		} else {
			return null;
		}
	}
	/**
	 * Given one room, return the edge on that room's side.
	 * @param {Room} room
	 * @returns {Edge|null}
	 */
	,edge: function(room) {
		if(room == this.room1) {
			return this.edge1;
		} else if(room == this.room2) {
			return this.edge2;
		} else {
			return null;
		}
	}
	/**
	 * Get the cell on a given room's side of the door.
	 * @param {Room} room
	 * @returns {Object|null} Cell {i, j}
	 */
	,cell: function(room) {
		return this.plan.grid.edge2cell(room == this.room1 ? this.edge1 : room == this.room2 ? this.edge2 : null);
	}
	,__class__: com_watabou_sevendrl_Door
};

// ─────────────────────────────────────────────────────────────────────────
// PlanView — Minimap Renderer
// ─────────────────────────────────────────────────────────────────────────
/**
 * PlanView — Renders the dungeon minimap as a rotated floor plan.
 *
 * The minimap shows:
 *   - Visited rooms (gray background)
 *   - Current room (brighter highlight, animated on room change)
 *   - Room contours (dark outlines)
 *   - Props (furniture rectangles)
 *   - Doors (gaps in walls)
 *   - Windows (thinner lines on outer walls)
 *   - Grid lines (faint internal lines)
 *   - All characters (their sprites sit on the map)
 *
 * The view rotates slightly randomly on each room change for a "hand-drawn"
 * feel. It zooms to fit the visible area and smoothly animates transitions.
 *
 * Extends: openfl.display.Sprite
 * Original line: 5955
 *
 * @param {SevenDRL} game - The game instance
 */
var com_watabou_sevendrl_PlanView = function(game) {
	this.click = new msignal_Signal2();
	openfl_display_Sprite.call(this);
	this.game = game;
	this.updateBounds();
	this.view = new openfl_display_Sprite();
	this.addChild(this.view);
	this.map = new openfl_display_Sprite();
	this.view.addChild(this.map);
	this.visited = new openfl_display_Sprite();
	this.map.addChild(this.visited);
	this.current = new openfl_display_Sprite();
	this.map.addChild(this.current);
	this.another = new openfl_display_Sprite();
	this.map.addChild(this.another);
	var _g = 0;
	var _g1 = game.visited;
	while(_g < _g1.length) {
		var room = _g1[_g];
		++_g;
		this.addVisited(room);
	}
	this.drawCurrent(game.hero.room);
	var _g = 0;
	var _g1 = game.queue;
	while(_g < _g1.length) {
		var ch = _g1[_g];
		++_g;
		this.map.addChild(ch.sprite);
	}
	game.hero.roomChanged.add($bind(this,this.onRoomChanged));
	game.charAdded.add($bind(this,this.onCharAdded));
	com_watabou_utils_DisplayObjectExtender.onActivate(this,$bind(this,this.onActivate));
	this.mouseEnabled = false;
	this.mouseChildren = false;
};
$hxClasses["com.watabou.sevendrl.PlanView"] = com_watabou_sevendrl_PlanView;
com_watabou_sevendrl_PlanView.__name__ = "com.watabou.sevendrl.PlanView";
/**
 * Convert an edge chain to a polygon (array of Points) for drawing.
 * @param {Array<Edge>} chain
 * @param {boolean} [closed=false]
 * @returns {Array<Point>}
 */
com_watabou_sevendrl_PlanView.chain2poly = function(chain,closed) {
	if(closed == null) {
		closed = false;
	}
	var _g = [];
	var _g1 = 0;
	while(_g1 < chain.length) {
		var e = chain[_g1];
		++_g1;
		_g.push(new openfl_geom_Point(e.b.j,e.b.i));
	}
	var poly = _g;
	if(!closed) {
		poly.unshift(new openfl_geom_Point(chain[0].a.j,chain[0].a.i));
	}
	return poly;
};
/**
 * Get the center point of an edge (for door/window placement).
 * @param {Edge} edge
 * @returns {Point}
 */
com_watabou_sevendrl_PlanView.edge2point = function(edge) {
	var from = edge.a;
	var dir = edge.dir;
	return new openfl_geom_Point(from.j + dir.dj * 0.5,from.i + dir.di * 0.5);
};
com_watabou_sevendrl_PlanView.__super__ = openfl_display_Sprite;
com_watabou_sevendrl_PlanView.prototype = $extend(openfl_display_Sprite.prototype,{
	/**
	 * Toggle click event listeners based on scene activation.
	 * @param {boolean} activate
	 */
	onActivate: function(activate) {
		if(activate) {
			this.stage.addEventListener("click",$bind(this,this.onClick));
		} else {
			this.stage.removeEventListener("click",$bind(this,this.onClick));
		}
	}
	/**
	 * Resize the minimap to fit within the given dimensions.
	 * Applies random rotation for visual variety.
	 * @param {number} w - Available width
	 * @param {number} h - Available height
	 */
	,setSize: function(w,h) {
		this.rWidth = w;
		this.rHeight = h;
		this.view.set_x(this.rWidth / 2);
		this.view.set_y(this.rHeight / 2);
		this.map.set_scaleX(this.map.set_scaleY(Math.min(this.rWidth / (this.viewWidth + 2),this.rHeight / (this.viewHeight + 2))));
		this.map.set_x(-this.map.get_scaleX() * this.viewCenterX);
		this.map.set_y(-this.map.get_scaleY() * this.viewCenterY);
		this.view.set_rotation(30.0 * (((com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 + (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 + (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647) / 3 * 2 - 1));
	}
	/**
	 * Add a new character's sprite to the map layer.
	 * @param {Character} ch
	 */
	,onCharAdded: function(ch) {
		this.map.addChild(ch.sprite);
	}
	/**
	 * Recalculate the bounding box of all visited rooms.
	 * Used for zoom/pan calculations.
	 */
	,updateBounds: function() {
		var minx = 255;
		var miny = 255;
		var maxx = -1;
		var maxy = -1;
		var _g = 0;
		var _g1 = this.game.visited;
		while(_g < _g1.length) {
			var room = _g1[_g];
			++_g;
			var _g2 = 0;
			var _g3 = room.area;
			while(_g2 < _g3.length) {
				var cell = _g3[_g2];
				++_g2;
				if(minx > cell.j) {
					minx = cell.j;
				}
				if(miny > cell.i) {
					miny = cell.i;
				}
				if(maxx < cell.j) {
					maxx = cell.j;
				}
				if(maxy < cell.i) {
					maxy = cell.i;
				}
			}
		}
		this.viewWidth = maxx - minx + 1;
		this.viewHeight = maxy - miny + 1;
		this.viewCenterX = minx + this.viewWidth / 2;
		this.viewCenterY = miny + this.viewHeight / 2;
	}
	/**
	 * Handle click on the minimap — dispatches cell coordinates.
	 * @param {Event} e
	 */
	,onClick: function(e) {
		if(e.target == this.parent) {
			this.click.dispatch(Math.floor(this.map.get_mouseX()),Math.floor(this.map.get_mouseY()));
		}
	}
	/**
	 * Smoothly animate the minimap to fit newly visible rooms.
	 * Adjusts scale, position, and rotation with a smoothstep tween.
	 */
	,relayout: function() {
		var _gthis = this;
		if(this.zooming != null) {
			this.zooming.stop();
			this.zooming = null;
		}
		var scale0 = this.map.get_scaleX();
		var x0 = this.map.get_x();
		var y0 = this.map.get_y();
		var scale1 = Math.min(this.rWidth / (this.viewWidth + 2),this.rHeight / (this.viewHeight + 2));
		var x1 = -scale1 * this.viewCenterX;
		var y1 = -scale1 * this.viewCenterY;
		var angle0 = this.view.get_rotation();
		var angle1;
		while(true) {
			angle1 = 30.0 * (((com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 + (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 + (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647) / 3 * 2 - 1);
			if(!(Math.abs(angle0 - angle1) < 10.)) {
				break;
			}
		}
		this.zooming = com_watabou_processes_Tweener.run(0.2,function(e) {
			e = e * e * (3 - 2 * e);
			var p = e;
			if(p == null) {
				p = 0.5;
			}
			_gthis.map.set_scaleX(_gthis.map.set_scaleY(scale0 + (scale1 - scale0) * p));
			var p = e;
			if(p == null) {
				p = 0.5;
			}
			_gthis.map.set_x(x0 + (x1 - x0) * p);
			var p = e;
			if(p == null) {
				p = 0.5;
			}
			_gthis.map.set_y(y0 + (y1 - y0) * p);
			var p = e;
			if(p == null) {
				p = 0.5;
			}
			_gthis.view.set_rotation(angle0 + (angle1 - angle0) * p);
		});
		this.zooming.onComplete(function() {
			_gthis.zooming = null;
		});
	}
	/**
	 * React to the hero entering a new room.
	 * Highlights the new room, explores it, and animates the view.
	 * @param {Room} room - The newly entered room
	 */
	,onRoomChanged: function(room) {
		var _gthis = this;
		this.switchCurrent(room);
		if(this.game.explore(room)) {
			this.updateBounds();
			com_watabou_utils_Updater.wait(0.2,function() {
				_gthis.addVisited(room);
			});
		}
		this.relayout();
	}
	/**
	 * Draw a room into the visited layer (permanent gray background).
	 * @param {Room} room
	 */
	,addVisited: function(room) {
		this.drawRoom(this.visited.get_graphics(),room,7833736);
	}
	/**
	 * Redraw the current-room highlight (animated crossfade).
	 * @param {Room} room
	 */
	,drawCurrent: function(room) {
		var g = this.current.get_graphics();
		g.clear();
		this.drawRoom(g,room,16772812,true);
	}
	/**
	 * Draw a room's floor, props, walls, doors, and windows.
	 * @param {Graphics} g     - Drawing context
	 * @param {Room}     room  - Room to draw
	 * @param {number}   color - Fill/stroke color
	 * @param {boolean}  [grid=false] - Draw internal grid lines
	 */
	,drawRoom: function(g,room,color,grid) {
		if(grid == null) {
			grid = false;
		}
		var poly = com_watabou_sevendrl_PlanView.chain2poly(room.contour,true);
		g.beginFill(2236979);
		com_watabou_utils_GraphicsExtender.drawPolygon(g,poly);
		g.endFill();
		var c = com_watabou_geom_Color.lerp(2236979,color,0.2);
		var _g = 0;
		var _g1 = room.props;
		while(_g < _g1.length) {
			var r = _g1[_g];
			++_g;
			g.beginFill(c);
			g.drawRect(r.x,r.y,r.width,r.height);
		}
		g.endFill();
		if(grid) {
			g.lineStyle(0.03,c);
			var _g = 0;
			var _g1 = room.area;
			while(_g < _g1.length) {
				var cell = _g1[_g];
				++_g;
				var dir = com_watabou_sevendrl_Dir.SOUTH;
				var e = this.game.plan.grid.cellNdir2edge(cell,dir);
				if(room.contour.indexOf(e) == -1) {
					g.moveTo(e.a.j,e.a.i);
					g.lineTo(e.b.j,e.b.i);
				}
				var dir1 = com_watabou_sevendrl_Dir.EAST;
				var e1 = this.game.plan.grid.cellNdir2edge(cell,dir1);
				if(room.contour.indexOf(e1) == -1) {
					g.moveTo(e1.a.j,e1.a.i);
					g.lineTo(e1.b.j,e1.b.i);
				}
			}
		}
		g.lineStyle(0.18,color,null,null,null,2,1);
		com_watabou_utils_GraphicsExtender.drawPolygon(g,poly);
		g.endFill();
		var map = room.doors;
		var _g2_map = map;
		var _g2_keys = map.keys();
		while(_g2_keys.hasNext()) {
			var key = _g2_keys.next();
			var _g3_value = _g2_map.get(key);
			var _g3_key = key;
			var _ = _g3_key;
			var door = _g3_value;
			this.drawDoorway(g,room,door);
		}
		g.endFill();
		var _g = 0;
		var _g1 = room.contour;
		while(_g < _g1.length) {
			var e = _g1[_g];
			++_g;
			if(this.game.plan.windows.indexOf(e) != -1) {
				this.drawWindow(g,e,color);
			}
		}
	}
	/**
	 * Crossfade between the old and new current-room highlights.
	 * @param {Room} room - The new current room
	 */
	,switchCurrent: function(room) {
		var _gthis = this;
		var tmp = this.current;
		this.current = this.another;
		this.another = tmp;
		this.current.set_visible(true);
		this.drawCurrent(room);
		com_watabou_processes_Tweener.run(0.2,function(e) {
			e = e * e * (3 - 2 * e);
			_gthis.current.set_alpha(e);
			_gthis.another.set_alpha(1 - e);
		}).onComplete(function() {
			_gthis.another.set_visible(false);
		});
	}
	/**
	 * Draw a doorway gap between two rooms.
	 * @param {Graphics} g
	 * @param {Room}     room
	 * @param {Door}     door
	 */
	,drawDoorway: function(g,room,door) {
		var p = com_watabou_sevendrl_PlanView.edge2point(door.edge1);
		var dir = door.edge1.dir;
		var w = dir == com_watabou_sevendrl_Dir.NORTH || dir == com_watabou_sevendrl_Dir.SOUTH ? 0.54 : 0.40;
		var h = dir == com_watabou_sevendrl_Dir.EAST || dir == com_watabou_sevendrl_Dir.WEST ? 0.54 : 0.40;
		g.beginFill(2236979);
		g.drawRect(p.x - w / 2,p.y - h / 2,w,h);
	}
	/**
	 * Draw a window on an outer wall.
	 * @param {Graphics} g
	 * @param {Edge}     e
	 * @param {number}   color
	 */
	,drawWindow: function(g,e,color) {
		var dir = e.dir;
		var p = com_watabou_sevendrl_PlanView.edge2point(e);
		var p0 = new openfl_geom_Point(p.x + -dir.dj * 0.24 / 2,p.y + -dir.di * 0.24 / 2);
		var p1 = new openfl_geom_Point(p.x + dir.dj * 0.24 / 2,p.y + dir.di * 0.24 / 2);
		g.lineStyle(0.12,2236979,null,null,null,0);
		g.moveTo(p0.x,p0.y);
		g.lineTo(p1.x,p1.y);
		g.lineStyle(0.03,color);
		g.moveTo(p0.x,p0.y);
		g.lineTo(p1.x,p1.y);
	}
	,__class__: com_watabou_sevendrl_PlanView
});

// ─────────────────────────────────────────────────────────────────────────
// SevenDRL — The Master Game Controller
// ─────────────────────────────────────────────────────────────────────────
/**
 * SevenDRL — The central game controller.
 *
 * Owns everything:
 *   - The dungeon plan (Plan)
 *   - The turn queue (array of Characters)
 *   - The hero (Hero)
 *   - The pathfinder (Pathfinder)
 *   - Exploration state (visited rooms, explored cells)
 *   - Clue tracking (how many found, how many needed)
 *   - Win/lose signals
 *
 * GAME FLOW:
 *   1. Constructor generates the dungeon, spawns the hero, mobs, clues.
 *   2. game.proceed() runs the turn loop: shift next character from queue,
 *      call act(), wait for completion, repeat.
 *   3. Hero acts when the player clicks a cell (via GameScene).
 *   4. Mobs act automatically via their State AI.
 *   5. When all clues are collected, the Boss spawns.
 *   6. Kill the Boss → victory. Hero dies → game over.
 *
 * Original line: 6243
 */
var com_watabou_sevendrl_SevenDRL = function() {
	this.over = new msignal_Signal0();
	this.charAdded = new msignal_Signal1();
	this.clueFound = new msignal_Signal1();
	// ╔══ EXTENSION POINT: [Events] ────────────────────────────────
	// ║ What: Event bus extension points (over, charAdded, clueFound)
	// ║ How:  Subscribe to `game.over`, `game.charAdded`, or
	// ║       `game.clueFound` signals to react to game events.
	// ║       Add new msignal_SignalN() fields here for custom events.
	// ╚═════════════════════════════════════════════════════════════════
	// Random level: 1-3 (bigger grid, more mobs, more clues at higher levels)
	com_watabou_sevendrl_SevenDRL.level = Math.floor(1 + (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 * 3);
	com_watabou_sevendrl_characters_Clue.reset();
	var size = 12 + 4 * com_watabou_sevendrl_SevenDRL.level;
	var required = size * size / 3 | 0;
	this.plan = com_watabou_sevendrl_Plan.create(size,required,8);
	this.cells = [];
	var _g = 0;
	var _g1 = this.plan.rooms;
	while(_g < _g1.length) {
		var room = _g1[_g];
		++_g;
		var a = this.cells;
		var b = room.area;
		var _g2 = 0;
		while(_g2 < b.length) {
			var e = b[_g2];
			++_g2;
			a.push(e);
		}
	}
	this.pf = new com_watabou_sevendrl_Pathfinder(this);
	this.visited = [];
	this.explored = [];
	this.queue = [];
	this.hero = new com_watabou_sevendrl_characters_Hero(this,com_watabou_utils_ArrayExtender.random(this.cells));
	// ╔══ EXTENSION POINT: [Character] ─────────────────────────────
	// ║ What: Hero customization
	// ║ How:  Replace `com_watabou_sevendrl_characters_Hero` with your
	// ║       own Hero subclass or alternative character constructor.
	// ║       You can also modify the spawn position logic.
	// ╚═════════════════════════════════════════════════════════════════
	this.explore(this.hero.room);
	this.queue.push(this.hero);
	this.maxClues = 2 + com_watabou_sevendrl_SevenDRL.level;
	// ╔══ EXTENSION POINT: [Difficulty] ────────────────────────────
	// ║ What: Clue count customization
	// ║ How:  Replace `2 + com_watabou_sevendrl_SevenDRL.level` with a
	// ║       formula or constant to control how many clues are needed
	// ║       to spawn the boss. Affects game length and difficulty.
	// ╚═════════════════════════════════════════════════════════════════
	this.gotClues = 0;
	this.spawnAmbushes();
	this.spawnMobs();
	this.spawnClues();
};
$hxClasses["com.watabou.sevendrl.SevenDRL"] = com_watabou_sevendrl_SevenDRL;
com_watabou_sevendrl_SevenDRL.__name__ = "com.watabou.sevendrl.SevenDRL";
/**
 * Static logging function — redirects to Haxe's trace() for debugging.
 * Overwritten by GameScene to display messages in the toast UI.
 * @param {string} txt
 */
com_watabou_sevendrl_SevenDRL.out = function(txt) {
	haxe_Log.trace(txt,{ fileName : "Source/com/watabou/sevendrl/SevenDRL.hx", lineNumber : 37, className : "com.watabou.sevendrl.SevenDRL", methodName : "out"});
};
com_watabou_sevendrl_SevenDRL.prototype = {
	/**
	 * Mark a room as visited and its cells as explored.
	 * Also explores the door cells leading to neighboring rooms.
	 *
	 * @param {Room} room
	 * @returns {boolean} true if this is a newly visited room
	 */
	explore: function(room) {
		if(this.visited.indexOf(room) == -1) {
			this.visited.push(room);
			com_watabou_utils_ArrayExtender.addAll(this.explored,room.area);
			var door = room.doors.iterator();
			while(door.hasNext()) {
				var door1 = door.next();
				var room1 = room == door1.room1 ? door1.room2 : room == door1.room2 ? door1.room1 : null;
				com_watabou_utils_ArrayExtender.add(this.explored,door1.plan.grid.edge2cell(room1 == door1.room1 ? door1.edge1 : room1 == door1.room2 ? door1.edge2 : null));
			}
			return true;
		} else {
			return false;
		}
	}
	/**
	 * Get a cell by grid coordinates.
	 * @param {number} i
	 * @param {number} j
	 * @returns {Object}
	 */
	,cell: function(i,j) {
		return this.plan.grid.cell(i,j);
	}
	/**
	 * Add a character to the game (turn queue + map).
	 * @param {Character} ch
	 */
	,addChar: function(ch) {
		// ╔══ EXTENSION POINT: [Lifecycle] ────────────────────────────
		// ║ What: Character registration hook
		// ║ How:  Add logic here to run when any character is added:
		// ║       stat tracking, aura checks, spawn effects, etc.
		// ╚═════════════════════════════════════════════════════════════════
		com_watabou_utils_ArrayExtender.add(this.queue,ch);
		this.charAdded.dispatch(ch);
	}
	/**
	 * Find a character at a given position, optionally filtered by type.
	 * @param {Object}  pos - Cell {i, j}
	 * @param {Function} [cl] - Class to filter by (e.g. Mob, Clue)
	 * @returns {Character|null}
	 */
	,getChar: function(pos,cl) {
		var _g = 0;
		var _g1 = this.queue;
		while(_g < _g1.length) {
			var ch = _g1[_g];
			++_g;
			if(ch.pos == pos && (cl == null || js_Boot.__instanceof(ch,cl))) {
				return ch;
			}
		}
		return null;
	}
	/**
	 * The turn loop. Shifts the next character from the queue and calls
	 * their act(). When they finish, proceeds to the next.
	 *
	 * If the current character isn't ready (e.g. waiting for animation),
	 * pauses until finish() is called.
	 */
	,proceed: function() {
		// ╔══ EXTENSION POINT: [Turn System] ──────────────────────────
		// ║ What: Turn system customization
		// ║ How:  Modify this method to change turn order (initiative,
		// ║       speed-based, simultaneous phases, etc.), add interrupt
		// ║       mechanics, or insert pre/post-turn hooks.
		// ╚═════════════════════════════════════════════════════════════════
		if(this.curCh == null) {
			if(com_watabou_utils_ArrayExtender.isEmpty(this.queue)) {
				return;
			}
			this.curCh = this.queue.shift();
			this.queue.push(this.curCh);
		}
		if(!this.curCh.isReady) {
			return;
		}
		if(!this.curCh.act()) {
			this.curCh = null;
			if(this.hero.isAlive()) {
				this.proceed();
			} else {
				com_watabou_utils_Updater.wait(0,$bind(this,this.proceed));
			}
		}
	}
	/**
	 * Signal that a character has finished their turn.
	 * If blocking=true, clears the current character so the next one goes.
	 *
	 * @param {Character} ch       - The character that finished
	 * @param {boolean}   blocking - If true, interrupt the current turn
	 */
	,finish: function(ch,blocking) {
		ch.isReady = true;
		if(blocking) {
			this.curCh = null;
		}
		this.proceed();
	}
	/**
	 * Remove a character from the game (e.g. when killed or collected).
	 * @param {Character} ch
	 */
	,remove: function(ch) {
		// ╔══ EXTENSION POINT: [Lifecycle] ────────────────────────────
		// ║ What: Character removal hook
		// ║ How:  Add logic here to run when a character is removed:
		// ║       death effects, loot drops, cleanup of custom state.
		// ╚═════════════════════════════════════════════════════════════════
		HxOverrides.remove(this.queue,ch);
	}
	/**
	 * Spawn ambush triggers in dead-end rooms.
	 * When the hero enters an ambush room, enemies spawn from the edges.
	 */
	,spawnAmbushes: function() {
		var nAmbushes = com_watabou_sevendrl_SevenDRL.level;
		var _g = [];
		var _g1 = 0;
		var _g2 = this.plan.rooms;
		while(_g1 < _g2.length) {
			var v = _g2[_g1];
			++_g1;
			if(v.area.length > 2 && com_watabou_utils_ArrayExtender.keys2array(v.doors).length == 1) {
				_g.push(v);
			}
		}
		var rooms = _g;
		HxOverrides.remove(rooms,this.hero.room);
		var _g = 0;
		var _g1 = nAmbushes;
		while(_g < _g1) {
			var _ = _g++;
			if(rooms.length == 0) {
				break;
			}
			var room = com_watabou_utils_ArrayExtender.pick(rooms);
			var door = room.doors.iterator();
			while(door.hasNext()) {
				var door1 = door.next();
				this.queue.push(new com_watabou_sevendrl_characters_Ambush(this,door1.plan.grid.edge2cell(room == door1.room1 ? door1.edge1 : room == door1.room2 ? door1.edge2 : null)));
			// ╔══ EXTENSION POINT: [Spawning] ────────────────────────────
			// ║ What: Ambush placement customization
			// ║ How:  Replace `new com_watabou_sevendrl_characters_Ambush`
			// ║       with a custom ambush type, or add additional spawns
			// ║       per ambush event (e.g. traps, turrets, environmental).
			// ╚═════════════════════════════════════════════════════════════════
			}
		}
	}
	/**
	 * Spawn wandering mobs and hunters.
	 *   - Wanderers: passive until attacked, then chase
	 *   - Hunters: actively seek the hero
	 */
	,spawnMobs: function() {
		var _g = [];
		var _g1 = 0;
		var _g2 = 1 + com_watabou_sevendrl_SevenDRL.level;
		while(_g1 < _g2) {
			var _ = _g1++;
			_g.push(new com_watabou_sevendrl_characters_Wanderer(this));
		}
	var mobs = _g;
	// ╔══ EXTENSION POINT: [Spawning] ────────────────────────────
	// ║ What: SWAP POINT for mob types and counts
	// ║ How:  Modify the mobs array above or add new mob constructors
	// ║       here. Replace Wanderer/Hunter with custom mob classes.
	// ║       Adjust counts: `1 + level` wanderers, 3 hunters.
	// ╚═════════════════════════════════════════════════════════════════
	mobs.push(new com_watabou_sevendrl_characters_Hunter(this));
		mobs.push(new com_watabou_sevendrl_characters_Hunter(this));
		mobs.push(new com_watabou_sevendrl_characters_Hunter(this));
		var available = com_watabou_utils_ArrayExtender.difference(this.cells,this.hero.getFOV());
		var _g = 0;
		while(_g < mobs.length) {
			var mob = mobs[_g];
			++_g;
			mob.setPos(com_watabou_utils_ArrayExtender.pick(available));
			this.queue.push(mob);
		}
	}
	/**
	 * Spawn clue items using distance-weighted placement.
	 * Clues are placed far from the hero, distributed across rooms,
	 * with one clue per room maximum.
	 */
	,spawnClues: function() {
		var map = this.pf.getMap(this.hero.pos,this.cells);
		var _g = 0;
		var _g1 = this.hero.room.area;
		while(_g < _g1.length) {
			var cell = _g1[_g];
			++_g;
			map.set(cell,0.0);
		}
		var _g = 0;
		var _g1 = this.plan.rooms;
		while(_g < _g1.length) {
			var room = _g1[_g];
			++_g;
			if(room.area.length > 1) {
				var door = room.doors.iterator();
				while(door.hasNext()) {
					var door1 = door.next();
					map.set(this.plan.grid.edge2cell(room == door1.room1 ? door1.edge1 : room == door1.room2 ? door1.edge2 : null),0.0);
				}
				var _g2 = 0;
				var _g3 = room.area;
				while(_g2 < _g3.length) {
					var cell = _g3[_g2];
					++_g2;
					var _g4 = cell;
					var _g5 = map;
					var v = _g5.h[_g4.__id__] / room.area.length;
					_g5.set(_g4,v);
				}
			}
		}
		var _g = [];
		var _g1 = 0;
		var _g2 = this.cells;
		while(_g1 < _g2.length) {
			var cell = _g2[_g1];
			++_g1;
			_g.push(map.h[cell.__id__]);
		}
		var weights = _g;
		var _g = 0;
		var _g1 = this.maxClues;
		while(_g < _g1) {
			var _ = _g++;
			var pos = com_watabou_utils_ArrayExtender.weighted(this.cells,weights);
			var clue = new com_watabou_sevendrl_characters_Clue(this,pos);
		// ╔══ EXTENSION POINT: [Spawning] ────────────────────────────
		// ║ What: Clue placement customization
		// ║ How:  Replace `com_watabou_sevendrl_characters_Clue` with a
		// ║       custom clue class, or modify the weighted placement
		// ║       algorithm above to change where clues appear.
		// ╚═════════════════════════════════════════════════════════════════
			this.queue.push(clue);
			var _g2 = 0;
			var _g3 = clue.room.area;
			while(_g2 < _g3.length) {
				var cell = _g3[_g2];
				++_g2;
				weights[this.cells.indexOf(cell)] = 0.0;
			}
		}
	}
	/**
	 * Handle collecting a clue.
	 * Increments the counter. If all clues are found, spawns the Boss.
	 *
	 * @param {Clue} clue - The collected clue
	 */
	,collectClue: function(clue) {
		this.remove(clue);
		this.gotClues++;
		this.clueFound.dispatch(clue);
		if(this.gotClues >= this.maxClues) {
			var pos = com_watabou_utils_ArrayExtender.random(com_watabou_utils_ArrayExtender.difference(this.cells,this.hero.getFOV()));
			// ╔══ EXTENSION POINT: [Spawning] ────────────────────────────
			// ║ What: Boss spawn trigger customization
			// ║ How:  Replace `com_watabou_sevendrl_characters_Boss` with
			// ║       a custom boss class, or change the trigger condition
			// ║       (e.g. timed trigger, item-based, kill-count threshold).
			// ╚═════════════════════════════════════════════════════════════════
			this.addChar(new com_watabou_sevendrl_characters_Boss(this,pos));
		}
	}
	,__class__: com_watabou_sevendrl_SevenDRL
};

// -- DocumentClass -- OpenFL's bridge to the project's entry point --
// Originally lived in runtime/base.js, but it extends com_watabou_sevendrl_Main,
// which was extracted here. It belongs wherever Main lives, not in the
// runtime layer. runtime/base.js's ApplicationMain.start() now calls
// window.DocumentClass (see modules/DECISIONS.md, Bug A).
var DocumentClass = function(current) {
	current.addChild(this);
	com_watabou_sevendrl_Main.call(this);
	this.dispatchEvent(new openfl_events_Event("addedToStage",false,false));
};
$hxClasses["DocumentClass"] = DocumentClass;
DocumentClass.__name__ = "DocumentClass";
DocumentClass.__super__ = com_watabou_sevendrl_Main;
DocumentClass.prototype = $extend(com_watabou_sevendrl_Main.prototype,{
	__class__: DocumentClass
});

// -- Static initializers relocated from runtime/base.js (modules/DECISIONS.md, Bug E) --
// ActionCard's actual enum declaration was never extracted to ANY modules/*.js
// file by extract-seven-drl.js (Haxe enums compile to a different shape than
// regular classes, apparently missed by its class-boundary detection). Only
// the static __constructs__ initializer survived (in runtime/base.js, now
// relocated here too). Pulled the real declaration from SevenDRL.js:4790-4794.
var com_watabou_sevendrl_ActionCard = $hxEnums["com.watabou.sevendrl.ActionCard"] = { __ename__:"com.watabou.sevendrl.ActionCard",__constructs__:null
	,WEAK: {_hx_name:"WEAK",_hx_index:0,__enum__:"com.watabou.sevendrl.ActionCard",toString:$estr}
	,NORMAL: {_hx_name:"NORMAL",_hx_index:1,__enum__:"com.watabou.sevendrl.ActionCard",toString:$estr}
	,STRONG: {_hx_name:"STRONG",_hx_index:2,__enum__:"com.watabou.sevendrl.ActionCard",toString:$estr}
};
com_watabou_sevendrl_ActionCard.__constructs__ = [com_watabou_sevendrl_ActionCard.WEAK,com_watabou_sevendrl_ActionCard.NORMAL,com_watabou_sevendrl_ActionCard.STRONG];
com_watabou_sevendrl_Dir.NORTH = new com_watabou_sevendrl_Dir(-1,0);
com_watabou_sevendrl_Dir.SOUTH = new com_watabou_sevendrl_Dir(1,0);
com_watabou_sevendrl_Dir.EAST = new com_watabou_sevendrl_Dir(0,1);
com_watabou_sevendrl_Dir.WEST = new com_watabou_sevendrl_Dir(0,-1);
com_watabou_sevendrl_Dir.NE = new com_watabou_sevendrl_Dir(-1,1);
com_watabou_sevendrl_Dir.SE = new com_watabou_sevendrl_Dir(1,1);
com_watabou_sevendrl_Dir.NW = new com_watabou_sevendrl_Dir(-1,-1);
com_watabou_sevendrl_Dir.SW = new com_watabou_sevendrl_Dir(1,-1);
com_watabou_sevendrl_Dir.ALL = [com_watabou_sevendrl_Dir.NORTH,com_watabou_sevendrl_Dir.SOUTH,com_watabou_sevendrl_Dir.EAST,com_watabou_sevendrl_Dir.WEST];
com_watabou_sevendrl_Dir.cw = (function($this) {
	var $r;
	var _g = new haxe_ds_ObjectMap();
	_g.set(com_watabou_sevendrl_Dir.NORTH,com_watabou_sevendrl_Dir.EAST);
	_g.set(com_watabou_sevendrl_Dir.EAST,com_watabou_sevendrl_Dir.SOUTH);
	_g.set(com_watabou_sevendrl_Dir.SOUTH,com_watabou_sevendrl_Dir.WEST);
	_g.set(com_watabou_sevendrl_Dir.WEST,com_watabou_sevendrl_Dir.NORTH);
	$r = _g;
	return $r;
}(this));
com_watabou_sevendrl_Dir.ccw = (function($this) {
	var $r;
	var _g = new haxe_ds_ObjectMap();
	_g.set(com_watabou_sevendrl_Dir.NORTH,com_watabou_sevendrl_Dir.WEST);
	_g.set(com_watabou_sevendrl_Dir.WEST,com_watabou_sevendrl_Dir.SOUTH);
	_g.set(com_watabou_sevendrl_Dir.SOUTH,com_watabou_sevendrl_Dir.EAST);
	_g.set(com_watabou_sevendrl_Dir.EAST,com_watabou_sevendrl_Dir.NORTH);
	$r = _g;
	return $r;
}(this));
com_watabou_sevendrl_Dir.op = (function($this) {
	var $r;
	var _g = new haxe_ds_ObjectMap();
	_g.set(com_watabou_sevendrl_Dir.NORTH,com_watabou_sevendrl_Dir.SOUTH);
	_g.set(com_watabou_sevendrl_Dir.WEST,com_watabou_sevendrl_Dir.EAST);
	_g.set(com_watabou_sevendrl_Dir.SOUTH,com_watabou_sevendrl_Dir.NORTH);
	_g.set(com_watabou_sevendrl_Dir.EAST,com_watabou_sevendrl_Dir.WEST);
	$r = _g;
	return $r;
}(this));
com_watabou_sevendrl_Dir.decompose = (function($this) {
	var $r;
	var _g = new haxe_ds_ObjectMap();
	_g.set(com_watabou_sevendrl_Dir.NE,[com_watabou_sevendrl_Dir.NORTH,com_watabou_sevendrl_Dir.EAST]);
	_g.set(com_watabou_sevendrl_Dir.NW,[com_watabou_sevendrl_Dir.NORTH,com_watabou_sevendrl_Dir.WEST]);
	_g.set(com_watabou_sevendrl_Dir.SE,[com_watabou_sevendrl_Dir.SOUTH,com_watabou_sevendrl_Dir.EAST]);
	_g.set(com_watabou_sevendrl_Dir.SW,[com_watabou_sevendrl_Dir.SOUTH,com_watabou_sevendrl_Dir.WEST]);
	$r = _g;
	return $r;
}(this));
com_watabou_sevendrl_Plan.WALL = 0.18;
com_watabou_sevendrl_Plan.DOOR = 0.40;
com_watabou_sevendrl_Plan.WINDOW = 0.24;
com_watabou_sevendrl_PlanView.TRANSITION = 0.2;
com_watabou_sevendrl_PlanView.MAX_TILT = 30.0;
com_watabou_sevendrl_PlanView.STROKE = 0.03;
com_watabou_sevendrl_SevenDRL.level = 0;


// -- Window exports (per module-manifest.json) --
// These classes were declared as private module-scope vars with no
// export/import/window assignment anywhere (see modules/DECISIONS.md,
// Bug B). Cross-module references and the entire Dev-Tools/mods/* hook
// system depend on window.com_watabou_* flat globals existing.
window.com_watabou_sevendrl_Main = com_watabou_sevendrl_Main;
window.com_watabou_sevendrl_SevenDRL = com_watabou_sevendrl_SevenDRL;
window.com_watabou_sevendrl_Plan = com_watabou_sevendrl_Plan;
window.com_watabou_sevendrl_PlanView = com_watabou_sevendrl_PlanView;
window.com_watabou_sevendrl_Room = com_watabou_sevendrl_Room;
window.com_watabou_sevendrl_Door = com_watabou_sevendrl_Door;
window.com_watabou_sevendrl_Grid = com_watabou_sevendrl_Grid;
window.com_watabou_sevendrl_Node = com_watabou_sevendrl_Node;
window.com_watabou_sevendrl_Edge = com_watabou_sevendrl_Edge;
window.com_watabou_sevendrl_Dir = com_watabou_sevendrl_Dir;
window.com_watabou_sevendrl_ChainUtils = com_watabou_sevendrl_ChainUtils;
window.com_watabou_sevendrl_ActionCard = com_watabou_sevendrl_ActionCard;
window.com_watabou_sevendrl_ActionDeck = com_watabou_sevendrl_ActionDeck;
window.DocumentClass = DocumentClass;


// ═══ END modules/core/game.js ═══
