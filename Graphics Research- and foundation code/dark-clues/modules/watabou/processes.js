// ═══════════════════════════════════════════════════════════════════
// PROCESSES — modules/watabou/processes.js
// Extracted from SevenDRL.js by extract-seven-drl.js
// Classes: Process, Sequence, Tweener
//
// A lightweight process system for managing timed operations, sequential
// sub-process chains, and value interpolation (tweening). Originally
// part of the watabou roguelike toolkit (Haxe -> JS compilation target).
// ═══════════════════════════════════════════════════════════════════

/**
 * @fileoverview Process system for timed and sequential operations.
 *
 * Provides three core abstractions:
 * - Process: Base class representing any timed or lifecycle-bound operation.
 * - Sequence: A composite process that runs child processes one after another.
 * - Tweener: A process that linearly interpolates a value from 0 to 1 over a
 *   given duration, invoking a callback on each frame tick.
 *
 * Usage pattern (Haxe source lines 4658-4789 in SevenDRL.js):
 *   var tw = Tweener.run(1.0, function(p) { // p: 0 to 1
 *   });
 *   var seq = new Sequence().add(tw).add(anotherProcess);
 *   seq.start();
 */

// ─── Process (com.watabou.processes.Process) ─── line 4658 ───

/**
 * Base class for all timed operations in the process system.
 *
 * A Process has a lifecycle managed by `start`, `stop`, `pause`, and `resume`.
 * Completion is signaled via the `complete` signal, and consumers can chain
 * callbacks with `onComplete()`.
 *
 * This is an abstract-style base: its methods are no-ops by default.
 * Subclasses (Sequence, Tweener) override them with concrete behaviour.
 *
 * @class Process
 * @constructor
 *
 * @example
 * // Typical subclass pattern:
 * var p = new Process();
 * p.onComplete(function() { console.log("done"); });
 * p.start();
 *
 * @see Sequence   For running child processes sequentially
 * @see Tweener    For value interpolation over time
 */
var com_watabou_processes_Process = function() {
	/**
	 * Signal dispatched when this process finishes execution.
	 * Type: Signal0 (no arguments).
	 *
	 * @type {Signal0}
	 */
	this.complete = new msignal_Signal0();
};

// Register the class in the Haxe runtime's type map
$hxClasses["com.watabou.processes.Process"] = com_watabou_processes_Process;
com_watabou_processes_Process.__name__ = "com.watabou.processes.Process";

/**
 * Start this process. The base implementation is a no-op.
 * @returns {Process} this, for method chaining
 */
com_watabou_processes_Process.prototype = {
	start: function() {
		return this;
	}
	/**
	 * Stop this process. The base implementation is a no-op.
	 * @returns {Process} this, for method chaining
	 */
	,stop: function() {
		return this;
	}
	/**
	 * Pause this process. The base implementation is a no-op.
	 * @returns {Process} this, for method chaining
	 */
	,pause: function() {
		return this;
	}
	/**
	 * Resume this process. The base implementation is a no-op.
	 * @returns {Process} this, for method chaining
	 */
	,resume: function() {
		return this;
	}
	/**
	 * Register a callback to be invoked when this process completes.
	 * If callback is null, it is simply ignored (returns this for chaining).
	 *
	 * @param {function} [callback] - Function to call on completion.
	 *   Receives no arguments.
	 * @returns {Process} this, for method chaining
	 */
	,onComplete: function(callback) {
		if(callback != null) {
			this.complete.add(callback);
		}
		return this;
	}
	,__class__: com_watabou_processes_Process
};

// ─── Sequence (com.watabou.processes.Sequence) ─── line 4684 ───

/**
 * A composite process that runs child processes sequentially.
 *
 * When started, the Sequence dequeues the first child from `subs`, starts it,
 * and when that child completes, automatically starts the next one. Once all
 * children have been executed, this Sequence dispatches its own `complete` signal.
 *
 * If constructed with an initial process `p`, that process is set as the
 * current sub-process (its completion will trigger `start` to advance).
 *
 * @class Sequence
 * @extends Process
 * @constructor
 * @param {Process} [p] - Optional initial process to set as the current sub.
 *   If provided, it is assigned to `curSub` and its completion auto-starts
 *   the Sequence.
 *
 * @example
 * var seq = new Sequence()
 *   .add(new Tweener(0.5, fadeCallback))
 *   .add(new Tweener(1.0, slideCallback));
 * seq.start(); // runs first tweener, then second, then fires complete
 */
var com_watabou_processes_Sequence = function(p) {
	/**
	 * The currently executing sub-process, or null if idle.
	 * @type {Process|null}
	 */
	this.curSub = null;

	/**
	 * Queue of child processes waiting to be executed.
	 * Shifted from left (FIFO order).
	 * @type {Process[]}
	 */
	this.subs = [];

	// Call parent constructor
	com_watabou_processes_Process.call(this);

	// If an initial process was provided, set it as current and wire
	// its completion to auto-start the sequence
	if(p != null) {
		this.curSub = p;
		this.curSub.complete.add($bind(this,this.start));
	}
};

$hxClasses["com.watabou.processes.Sequence"] = com_watabou_processes_Sequence;
com_watabou_processes_Sequence.__name__ = "com.watabou.processes.Sequence";

/** @type {Process} */
com_watabou_processes_Sequence.__super__ = com_watabou_processes_Process;

com_watabou_processes_Sequence.prototype = $extend(com_watabou_processes_Process.prototype,{
	/**
	 * Start the next sub-process in the queue, or dispatch complete if empty.
	 *
	 * When a sub-process finishes, its `complete` signal calls `start` again,
	 * which dequeues the next child. If no children remain, `complete` fires.
	 *
	 * @returns {Sequence} this, for method chaining
	 */
	start: function() {
		if(this.subs.length > 0) {
			// Dequeue the next sub-process
			this.curSub = this.subs.shift();
			// Wire its completion to advance the sequence
			this.curSub.complete.add($bind(this,this.start));
			// Start the sub-process
			this.curSub.start();
		} else {
			// All children done — signal completion of this Sequence
			this.complete.dispatch();
		}
		return this;
	}
	/**
	 * Stop (pause) the currently executing sub-process.
	 * @returns {Sequence} this, for method chaining
	 */
	,stop: function() {
		if(this.curSub != null) {
			this.curSub.stop();
		}
		return this;
	}
	/**
	 * Resume the currently executing sub-process.
	 * @returns {Sequence} this, for method chaining
	 */
	,resume: function() {
		if(this.curSub != null) {
			this.curSub.resume();
		}
		return this;
	}
	/**
	 * Pause the currently executing sub-process.
	 * @returns {Sequence} this, for method chaining
	 */
	,pause: function() {
		if(this.curSub != null) {
			this.curSub.pause();
		}
		return this;
	}
	/**
	 * Enqueue a child process to run after all currently queued children.
	 *
	 * @param {Process} p - The process to add to the end of the queue.
	 * @returns {Sequence} this, for method chaining
	 */
	,add: function(p) {
		this.subs.push(p);
		return this;
	}
	,__class__: com_watabou_processes_Sequence
});

// ─── Tweener (com.watabou.processes.Tweener) ─── line 4731 ───

/**
 * A process that linearly interpolates a value from 0 to 1 over a specified
 * duration, invoking a callback on each frame with the current progress.
 *
 * Tweener hooks into the global `Updater.tick` signal to receive frame deltas.
 * When `time` seconds have elapsed, it clamps the value to 1, fires the
 * callback one last time, stops itself, and dispatches the `complete` signal.
 *
 * Two static helpers exist:
 * - `Tweener.create(time, callback)` — creates but does NOT start a Tweener.
 * - `Tweener.run(time, callback)` — creates AND starts a Tweener immediately.
 *
 * @class Tweener
 * @extends Process
 * @constructor
 *
 * @example
 * // Fade out over 0.5 seconds:
 * Tweener.run(0.5, function(p) {
 *   sprite.alpha = 1 - p;
 * });
 *
 * @example
 * // Create without starting, then chain:
 * var tw = Tweener.create(1.0, function(p) { moveTo(p * 100, 0); });
 * // tw.start() when ready
 */
var com_watabou_processes_Tweener = function() {
	com_watabou_processes_Process.call(this);
};

$hxClasses["com.watabou.processes.Tweener"] = com_watabou_processes_Tweener;
com_watabou_processes_Tweener.__name__ = "com.watabou.processes.Tweener";

/**
 * Create a Tweener without starting it.
 *
 * @param {number} time - Duration in seconds for the tween.
 * @param {function(number): void} callback - Called each frame with the
 *   current progress value (0 → 1).
 * @returns {Tweener} The newly created, unstarted Tweener instance.
 */
com_watabou_processes_Tweener.create = function(time,callback) {
	var tw = new com_watabou_processes_Tweener();
	tw.time = time;
	tw.updateCallback = callback;
	return tw;
};

/**
 * Create and immediately start a Tweener.
 * Convenience method: equivalent to `create(time, callback).start()`.
 *
 * @param {number} time - Duration in seconds for the tween.
 * @param {function(number): void} callback - Called each frame with the
 *   current progress value (0 → 1).
 * @returns {Tweener} The started Tweener instance (for chaining or reference).
 */
com_watabou_processes_Tweener.run = function(time,callback) {
	var tw = com_watabou_processes_Tweener.create(time,callback);
	tw.start();
	return tw;
};

com_watabou_processes_Tweener.__super__ = com_watabou_processes_Process;

com_watabou_processes_Tweener.prototype = $extend(com_watabou_processes_Process.prototype,{
	/**
	 * Start the tween. Resets elapsed time to 0, fires the callback with 0,
	 * then resumes to hook into the frame tick.
	 *
	 * @returns {Tweener} this, for method chaining
	 */
	start: function() {
		this.passed = 0.0;
		this.paused = false;
		this.updateCallback(0);
		return this.resume();
	}
	/**
	 * Stop the tween (delegates to pause — removes from tick updates).
	 * @returns {Tweener} this, for method chaining
	 */
	,stop: function() {
		return this.pause();
	}
	/**
	 * Resume the tween by re-attaching to the global tick signal.
	 * @returns {Tweener} this, for method chaining
	 */
	,resume: function() {
		com_watabou_utils_Updater.get_tick().add($bind(this,this.update));
		this.paused = false;
		return this;
	}
	/**
	 * Pause the tween by detaching from the global tick signal.
	 * @returns {Tweener} this, for method chaining
	 */
	,pause: function() {
		com_watabou_utils_Updater.get_tick().remove($bind(this,this.update));
		this.paused = true;
		return this;
	}
	/**
	 * Force the update callback to fire with the current progress value.
	 * Useful for syncing external state without waiting for a tick.
	 */
	,forceUpdate: function() {
		this.updateCallback(Math.min(this.passed / this.time,1));
	}
	/**
	 * Per-frame update handler. Called by the global Updater tick.
	 *
	 * Accumulates elapsed time into `passed`. If the full duration has not
	 * elapsed, calls the update callback with `passed / time` (0→1 range).
	 * If the duration has been reached, clamps to 1, stops, and fires complete.
	 *
	 * @param {number} elapsed - Time in seconds since the last frame.
	 */
	,update: function(elapsed) {
		if(this.paused) {
			return;
		}
		// Accumulate time
		var tmp = this;
		if((tmp.passed += elapsed) < this.time) {
			// Still in progress — compute and dispatch normalized progress
			var p = this.passed / this.time;
			this.updateCallback(p);
		} else {
			// Duration reached — clamp to 1, stop, and signal complete
			this.updateCallback(1);
			this.stop();
			this.complete.dispatch();
		}
	}
	/**
	 * Create a Sequence containing this Tweener followed by process `p`.
	 *
	 * @param {Process} p - The process to run after this Tweener completes.
	 * @returns {Sequence} A new Sequence starting with this Tweener.
	 */
	,add: function(p) {
		return new com_watabou_processes_Sequence(this).add(p);
	}
	,__class__: com_watabou_processes_Tweener
});

// -- Window exports (per module-manifest.json) --
// See modules/DECISIONS.md, Bug B: these were private module-scope
// vars with no export/import/window assignment anywhere.
window.com_watabou_processes_Process = com_watabou_processes_Process;
window.com_watabou_processes_Sequence = com_watabou_processes_Sequence;
window.com_watabou_processes_Tweener = com_watabou_processes_Tweener;



// ═══ END modules/watabou/processes.js ═══
