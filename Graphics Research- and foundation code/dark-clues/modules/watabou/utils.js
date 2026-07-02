// ═══════════════════════════════════════════════════════════════════
// UTILS — modules/watabou/utils.js
// Extracted from SevenDRL.js by extract-seven-drl.js
//
// Core utility library for the "Dark Clues" roguelike.
// Ported from Haxe (com.watabou.utils) to JavaScript via OpenFL.
// Provides array helpers, math, random number generation, string
// formatting, graphics drawing primitives, display-object helpers,
// and the main game-loop tick dispatcher.
// ═══════════════════════════════════════════════════════════════════

// ─── ArrayExtender (com.watabou.utils.ArrayExtender) ─── line 15131 ───
/**
 * Static utility methods for Arrays.
 *
 * Mirrors the Haxe `com.watabou.utils.ArrayExtender` class, which adds
 * convenience methods on top of the native JS Array. Every method is
 * stateless and operates on the array(s) passed in.
 *
 * Several methods (shuffle, random, pick, fallOff, weighted, etc.) use
 * the seeded PRNG {@link com_watabou_utils_Random} so results are
 * reproducible when the seed is fixed — essential for a roguelike that
 * needs deterministic replay.
 */
var com_watabou_utils_ArrayExtender = function() { };
$hxClasses["com.watabou.utils.ArrayExtender"] = com_watabou_utils_ArrayExtender;
com_watabou_utils_ArrayExtender.__name__ = "com.watabou.utils.ArrayExtender";

/**
 * Remove all elements from the array (mutates in place).
 * Equivalent to `a.length = 0` but implemented via splice.
 *
 * @param {Array} a - The array to clear.
 */
com_watabou_utils_ArrayExtender.wipe = function(a) {
	a.splice(0,a.length);
};

/**
 * Append every element of `b` to the end of `a` (mutates `a`).
 *
 * @param {Array} a - Destination array.
 * @param {Array} b - Source array whose elements are appended.
 */
com_watabou_utils_ArrayExtender.append = function(a,b) {
	var _g = 0;
	while(_g < b.length) {
		var e = b[_g];
		++_g;
		a.push(e);
	}
};

/**
 * Prepend the elements of `b` to the front of `a` in reverse order
 * (mutates `a`). The first element of `b` ends up closest to the
 * front of `a`.
 *
 * @param {Array} a - Destination array.
 * @param {Array} b - Source array whose elements are prepended.
 */
com_watabou_utils_ArrayExtender.prependReversed = function(a,b) {
	var _g = 0;
	while(_g < b.length) {
		var e = b[_g];
		++_g;
		a.unshift(e);
	}
};

/**
 * Return a new array that is the reverse of `a`. Does NOT mutate
 * the original.
 *
 * @param {Array} a - The source array.
 * @returns {Array} A new reversed copy.
 */
com_watabou_utils_ArrayExtender.revert = function(a) {
	var c = a.slice();
	c.reverse();
	return c;
};

/**
 * Return a new array with elements from `a` in random order.
 * Uses the seeded PRNG for reproducibility. The original is
 * untouched.
 *
 * @param {Array} a - The source array.
 * @returns {Array} A new shuffled copy.
 */
com_watabou_utils_ArrayExtender.shuffle = function(a) {
	var result = [];
	var _g = 0;
	while(_g < a.length) {
		var e = a[_g];
		++_g;
		// Insert each element at a random position in the result,
		// producing a Fisher-Yates-style shuffle via the seeded PRNG.
		result.splice((com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 * (result.length + 1) | 0,0,e);
	}
	return result;
};

/**
 * Return a single randomly-chosen element from `a` using the seeded
 * PRNG. The array is NOT modified.
 *
 * @param {Array} a - The source array (must be non-empty).
 * @returns {*} A random element.
 */
com_watabou_utils_ArrayExtender.random = function(a) {
	return a[(com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 * a.length | 0];
};

/**
 * Remove and return a single randomly-chosen element from `a`.
 * Like `random` but also mutates the array by splicing the item out.
 *
 * @param {Array} a - The source array (must be non-empty).
 * @returns {*} The removed random element.
 */
com_watabou_utils_ArrayExtender.pick = function(a) {
	var index = (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 * a.length | 0;
	var item = a[index];
	a.splice(index,1);
	return item;
};

/**
 * Pick a random element from `a` with a non-uniform distribution
 * biased toward the start of the array. The bias is controlled by
 * an exponent `f` (default 2.0): higher values concentrate the
 * distribution more toward index 0.
 *
 * The formula is `index = pow(randomFloat, f) * length`.
 *
 * @param {Array}  a - The source array.
 * @param {number} [f=2.0] - Falloff exponent (> 0). Higher = more biased to front.
 * @returns {*} The selected element.
 */
com_watabou_utils_ArrayExtender.fallOff = function(a,f) {
	if(f == null) {
		f = 2.0;
	}
	return a[Math.pow((com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647,f) * a.length | 0];
};

/**
 * Return a random subset of `n` elements from `a`.
 * Internally shuffles the array and slices the first `n` items.
 *
 * @param {Array}  a - The source array.
 * @param {number} n - Number of elements to pick.
 * @returns {Array} A new array with up to `n` random elements.
 */
com_watabou_utils_ArrayExtender.subset = function(a,n) {
	return com_watabou_utils_ArrayExtender.shuffle(a).slice(0,n);
};

/**
 * Weighted random selection: pick an element from `a` where each
 * element's chance is proportional to its corresponding weight.
 *
 * @param {Array}    a       - The candidate elements.
 * @param {number[]} weights - Parallel array of numeric weights.
 * @returns {*} The selected element (falls back to `a[0]` on rounding).
 */
com_watabou_utils_ArrayExtender.weighted = function(a,weights) {
	// Generate a random value in [0, totalWeight).
	var z = (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 * com_watabou_utils_ArrayExtender.sum(weights);
	var acc = 0.0;
	var _g = 0;
	var _g1 = a.length;
	while(_g < _g1) {
		var i = _g++;
		// Accumulate weights until we exceed the random threshold.
		if(z <= (acc += weights[i])) {
			return a[i];
		}
	}
	// Fallback (should rarely happen due to floating-point rounding).
	return a[0];
};

/**
 * Return a weighted-random index (0-based) from the given weight
 * array. Useful when you need the index rather than the element.
 *
 * @param {number[]} weights - Array of numeric weights.
 * @returns {number} The selected index.
 */
com_watabou_utils_ArrayExtender.weightedIndex = function(weights) {
	var _g = [];
	var _g1 = 0;
	var _g2 = weights.length;
	// Build an index array [0, 1, 2, ..., n-1] then delegate to weighted().
	while(_g1 < _g2) {
		var i = _g1++;
		_g.push(i);
	}
	return com_watabou_utils_ArrayExtender.weighted(_g,weights);
};

/**
 * Check whether the array has no elements.
 *
 * @param {Array} a - The array to test.
 * @returns {boolean} `true` if `a.length === 0`.
 */
com_watabou_utils_ArrayExtender.isEmpty = function(a) {
	return a.length == 0;
};

/**
 * Return the first element of the array.
 *
 * @param {Array} a - The source array.
 * @returns {*} The element at index 0.
 */
com_watabou_utils_ArrayExtender.first = function(a) {
	return a[0];
};

/**
 * Return the second element of the array (index 1).
 *
 * @param {Array} a - The source array.
 * @returns {*} The element at index 1.
 */
com_watabou_utils_ArrayExtender.second = function(a) {
	return a[1];
};

/**
 * Return the last element of the array.
 *
 * @param {Array} a - The source array.
 * @returns {*} The element at the final index.
 */
com_watabou_utils_ArrayExtender.last = function(a) {
	return a[a.length - 1];
};

/**
 * Return the element for which a numeric measure is minimal.
 *
 * @param {Array}    a - The source array.
 * @param {Function} f - A mapping function `(element) => number`.
 * @returns {*} The element with the smallest measure.
 */
com_watabou_utils_ArrayExtender.min = function(a,f) {
	var result = a[0];
	var min = f(result);
	var _g = 1;
	var _g1 = a.length;
	while(_g < _g1) {
		var i = _g++;
		var element = a[i];
		var measure = f(element);
		if(measure < min) {
			result = element;
			min = measure;
		}
	}
	return result;
};

/**
 * Return the element for which a numeric measure is maximal.
 *
 * @param {Array}    a - The source array.
 * @param {Function} f - A mapping function `(element) => number`.
 * @returns {*} The element with the largest measure.
 */
com_watabou_utils_ArrayExtender.max = function(a,f) {
	var result = a[0];
	var max = f(result);
	var _g = 1;
	var _g1 = a.length;
	while(_g < _g1) {
		var i = _g++;
		var element = a[i];
		var measure = f(element);
		if(measure > max) {
			result = element;
			max = measure;
		}
	}
	return result;
};

/**
 * Test whether every element in `a` passes the given predicate.
 *
 * @param {Array}    a    - The source array.
 * @param {Function} test - A predicate `(element) => boolean`.
 * @returns {boolean} `true` if all elements pass.
 */
com_watabou_utils_ArrayExtender.every = function(a,test) {
	var _g = 0;
	while(_g < a.length) {
		var e = a[_g];
		++_g;
		if(!test(e)) {
			return false;
		}
	}
	return true;
};

/**
 * Test whether at least one element in `a` passes the predicate.
 *
 * @param {Array}    a    - The source array.
 * @param {Function} test - A predicate `(element) => boolean`.
 * @returns {boolean} `true` if any element passes.
 */
com_watabou_utils_ArrayExtender.some = function(a,test) {
	var _g = 0;
	while(_g < a.length) {
		var e = a[_g];
		++_g;
		if(test(e)) {
			return true;
		}
	}
	return false;
};

/**
 * Count the number of elements in `a` that pass the predicate.
 *
 * @param {Array}    a    - The source array.
 * @param {Function} test - A predicate `(element) => boolean`.
 * @returns {number} The count of matching elements.
 */
com_watabou_utils_ArrayExtender.count = function(a,test) {
	var count = 0;
	var _g = 0;
	while(_g < a.length) {
		var e = a[_g];
		++_g;
		if(test(e)) {
			++count;
		}
	}
	return count;
};

/**
 * Return an array of sequential indices `[0, 1, ..., a.length-1]`.
 *
 * @param {Array} a - The source array.
 * @returns {number[]} Array of indices.
 */
com_watabou_utils_ArrayExtender.indices = function(a) {
	var _g = [];
	var _g1 = 0;
	var _g2 = a.length;
	while(_g1 < _g2) {
		var i = _g1++;
		_g.push(i);
	}
	return _g;
};

/**
 * Return the sum of all numeric elements in `a`.
 *
 * @param {number[]} a - Array of numbers.
 * @returns {number} The total sum.
 */
com_watabou_utils_ArrayExtender.sum = function(a) {
	var sum = 0.0;
	var _g = 0;
	while(_g < a.length) {
		var f = a[_g];
		++_g;
		sum += f;
	}
	return sum;
};

/**
 * Apply a function to every element and return an array of results.
 *
 * @param {Array}    a - The source array.
 * @param {Function} f - A mapping function `(element) => *`.
 * @returns {Array} A new array of transformed values.
 */
com_watabou_utils_ArrayExtender.map = function(a,f) {
	var _g = [];
	var _g1 = 0;
	while(_g1 < a.length) {
		var el = a[_g1];
		++_g1;
		_g.push(f(el));
	}
	return _g;
};

/**
 * Replace the first occurrence of `el` in `a` with all elements of
 * `newEls` (mutates `a` in place). The first new element replaces
 * the found element; any remaining new elements are spliced in after.
 *
 * @param {Array} a      - The array to modify.
 * @param {*}     el     - The element to find and replace.
 * @param {Array} newEls - Replacement elements.
 */
com_watabou_utils_ArrayExtender.replace = function(a,el,newEls) {
	var index = a.indexOf(el);
	// Replace the found element with the first new element.
	a[index++] = newEls[0];
	// Splice in any additional new elements.
	var _g = 1;
	var _g1 = newEls.length;
	while(_g < _g1) {
		var i = _g++;
		a.splice(index++,0,newEls[i]);
	}
};

/**
 * Push `el` onto `a` only if it is not already present (set semantics).
 *
 * @param {Array} a  - The target array.
 * @param {*}     el - The element to add.
 * @returns {boolean} `true` if added; `false` if already present.
 */
com_watabou_utils_ArrayExtender.add = function(a,el) {
	if(a.indexOf(el) == -1) {
		a.push(el);
		return true;
	} else {
		return false;
	}
};

/**
 * Return a new array containing only the first occurrence of each
 * element (removes duplicates).
 *
 * @param {Array} a - The source array.
 * @returns {Array} A de-duplicated copy.
 */
com_watabou_utils_ArrayExtender.clean = function(a) {
	var _g = [];
	var _g1 = 0;
	var _g2 = a.length;
	while(_g1 < _g2) {
		var i = _g1++;
		// Keep only if this is the first occurrence.
		if(a.indexOf(a[i]) == i) {
			_g.push(a[i]);
		}
	}
	return _g;
};

/**
 * Return a new array containing only elements present in both `a`
 * and `b` (set intersection).
 *
 * @param {Array} a - First array.
 * @param {Array} b - Second array.
 * @returns {Array} Elements common to both arrays.
 */
com_watabou_utils_ArrayExtender.intersect = function(a,b) {
	var _g = [];
	var _g1 = 0;
	while(_g1 < a.length) {
		var el = a[_g1];
		++_g1;
		if(b.indexOf(el) != -1) {
			_g.push(el);
		}
	}
	return _g;
};

/**
 * Add every element from `b` into `a`, skipping duplicates (mutates `a`).
 *
 * @param {Array} a - Destination array.
 * @param {Array} b - Source array of elements to add.
 */
com_watabou_utils_ArrayExtender.addAll = function(a,b) {
	var _g = 0;
	while(_g < b.length) {
		var el = b[_g];
		++_g;
		if(a.indexOf(el) == -1) {
			a.push(el);
		}
	}
};

/**
 * "Collect" a list-of-lists into a flat, de-duplicated array.
 * Each sub-array is merged into the result using `addAll` (unique push).
 *
 * @param {Array} a - An array of arrays.
 * @returns {Array} A flat array with no duplicates.
 */
com_watabou_utils_ArrayExtender.collect = function(a) {
	var result = [];
	var _g = 0;
	while(_g < a.length) {
		var e = a[_g];
		++_g;
		com_watabou_utils_ArrayExtender.addAll(result,e);
	}
	return result;
};

/**
 * Return a new array that is the set union of `a` and `b`.
 * Elements from `b` that are not in `a` are appended.
 *
 * @param {Array} a - First array.
 * @param {Array} b - Second array.
 * @returns {Array} The union of both arrays.
 */
com_watabou_utils_ArrayExtender.union = function(a,b) {
	var _g = [];
	var _g1 = 0;
	while(_g1 < b.length) {
		var el = b[_g1];
		++_g1;
		// Collect only the elements from b that are not already in a.
		if(a.indexOf(el) == -1) {
			_g.push(el);
		}
	}
	return a.concat(_g);
};

/**
 * Remove every element found in `b` from `a` (mutates `a`).
 * Uses HxOverrides.remove for each element.
 *
 * @param {Array} a - The array to modify.
 * @param {Array} b - Elements to remove.
 */
com_watabou_utils_ArrayExtender.removeAll = function(a,b) {
	var _g = 0;
	while(_g < b.length) {
		var el = b[_g];
		++_g;
		HxOverrides.remove(a,el);
	}
};

/**
 * Return a new array containing elements that are in `a` but NOT
 * in `b` (set difference / relative complement).
 *
 * @param {Array} a - First array.
 * @param {Array} b - Second array.
 * @returns {Array} Elements in `a` that are absent from `b`.
 */
com_watabou_utils_ArrayExtender.difference = function(a,b) {
	var _g = [];
	var _g1 = 0;
	while(_g1 < a.length) {
		var el = a[_g1];
		++_g1;
		if(b.indexOf(el) == -1) {
			_g.push(el);
		}
	}
	return _g;
};

/**
 * Check whether `a` and `b` share at least one common element.
 *
 * @param {Array} a - First array.
 * @param {Array} b - Second array.
 * @returns {boolean} `true` if any element of `a` exists in `b`.
 */
com_watabou_utils_ArrayExtender.intersects = function(a,b) {
	var _g = 0;
	while(_g < a.length) {
		var el = a[_g];
		++_g;
		if(b.indexOf(el) != -1) {
			return true;
		}
	}
	return false;
};

/**
 * Flatten an array of arrays into a single array (with duplicates).
 *
 * @param {Array} a - An array of arrays.
 * @returns {Array} A flat concatenation of all sub-arrays.
 */
com_watabou_utils_ArrayExtender.flatten = function(a) {
	if(a.length == 0) {
		return [];
	} else {
		var result = a[0].slice();
		var _g = 1;
		var _g1 = a.length;
		while(_g < _g1) {
			var i = _g++;
			result = result.concat(a[i]);
		}
		return result;
	}
};

/**
 * Flatten an array of arrays into a single de-duplicated array
 * (set union of all sub-arrays).
 *
 * @param {Array} a - An array of arrays.
 * @returns {Array} A flat array with no duplicates.
 */
com_watabou_utils_ArrayExtender.uflatten = function(a) {
	if(a.length == 0) {
		return [];
	} else {
		var result = a[0].slice();
		var _g = 1;
		var _g1 = a.length;
		while(_g < _g1) {
			var i = _g++;
			result = com_watabou_utils_ArrayExtender.union(result,a[i]);
		}
		return result;
	}
};

/**
 * Check whether two arrays contain the same set of elements
 * (order-insensitive comparison).
 *
 * @param {Array} a - First array.
 * @param {Array} b - Second array.
 * @returns {boolean} `true` if both have the same elements.
 */
com_watabou_utils_ArrayExtender.equals = function(a,b) {
	if(a.length != b.length) {
		return false;
	} else if(a.length == 0) {
		return true;
	} else {
		var _g = 0;
		while(_g < a.length) {
			var el = a[_g];
			++_g;
			if(b.indexOf(el) == -1) {
				return false;
			}
		}
		return true;
	}
};

/**
 * Return a new array sorted by a numeric measure derived from each
 * element. The original array is untouched.
 *
 * @param {Array}    a      - The source array.
 * @param {Function} measure - A mapping `(element) => number`.
 * @returns {Array} A new sorted array.
 */
com_watabou_utils_ArrayExtender.sortBy = function(a,measure) {
	// Build an index array.
	var _g = [];
	var _g1 = 0;
	var _g2 = a.length;
	while(_g1 < _g2) {
		var i = _g1++;
		_g.push(i);
	}
	var ids = _g;

	// Pre-compute the measure for every element.
	var _g = [];
	var _g1 = 0;
	while(_g1 < a.length) {
		var el = a[_g1];
		++_g1;
		_g.push(measure(el));
	}
	var measured = _g;

	// Sort indices by their corresponding measure.
	ids.sort(function(i1,i2) {
		var value = measured[i1] - measured[i2];
		if(value == 0) {
			return 0;
		} else if(value < 0) {
			return -1;
		} else {
			return 1;
		}
	});

	// Gather the elements in sorted order.
	var _g = [];
	var _g1 = 0;
	var _g2 = a.length;
	while(_g1 < _g2) {
		var i = _g1++;
		_g.push(a[ids[i]]);
	}
	return _g;
};

/**
 * Extract the keys from a Haxe-style Map (with key-value iterator)
 * into a plain JS array.
 *
 * @param {Object} map - A Haxe Map with `keyValueIterator()`.
 * @returns {Array} An array of keys.
 */
com_watabou_utils_ArrayExtender.keys2array = function(map) {
	var _g = [];
	var _g1 = map.keyValueIterator();
	while(_g1.hasNext()) {
		var _g2 = _g1.next();
		var key = _g2.key;
		var value = _g2.value;
		_g.push(key);
	}
	return _g;
};

/**
 * Extract the values from a Haxe-style Map (with key-value iterator)
 * into a plain JS array.
 *
 * @param {Object} map - A Haxe Map with `keyValueIterator()`.
 * @returns {Array} An array of values.
 */
com_watabou_utils_ArrayExtender.values2array = function(map) {
	var _g = [];
	var _g1 = map.keyValueIterator();
	while(_g1.hasNext()) {
		var _g2 = _g1.next();
		var key = _g2.key;
		var value = _g2.value;
		_g.push(value);
	}
	return _g;
};


// ─── DisplayObjectExtender (com.watabou.utils.DisplayObjectExtender) ─── line 15525 ───
/**
 * Static helper methods that act as extensions on OpenFL DisplayObject
 * instances. Each method takes a DisplayObject as its first argument.
 *
 * Primarily used for quick positioning helpers (center, right-align,
 * bottom-align) and coordinate-conversion utilities.
 */
var com_watabou_utils_DisplayObjectExtender = function() { };
$hxClasses["com.watabou.utils.DisplayObjectExtender"] = com_watabou_utils_DisplayObjectExtender;
com_watabou_utils_DisplayObjectExtender.__name__ = "com.watabou.utils.DisplayObjectExtender";

/**
 * Horizontally center a display object by setting its x so the
 * object's origin is at `-width / 2` (useful when the parent uses
 * a center-origin coordinate system).
 *
 * @param {DisplayObject} child - The display object to position.
 */
com_watabou_utils_DisplayObjectExtender.centerX = function(child) {
	child.set_x(-child.get_width() / 2);
};

/**
 * Vertically center a display object by setting its y to `-height / 2`.
 *
 * @param {DisplayObject} child - The display object to position.
 */
com_watabou_utils_DisplayObjectExtender.centerY = function(child) {
	child.set_y(-child.get_height() / 2);
};

/**
 * Center a display object both horizontally and vertically by setting
 * its origin to `(-width/2, -height/2)`.
 *
 * @param {DisplayObject} child - The display object to position.
 */
com_watabou_utils_DisplayObjectExtender.center = function(child) {
	child.set_x(-child.get_width() / 2);
	child.set_y(-child.get_height() / 2);
};

/**
 * Right-align a display object by setting its x to `-width`.
 *
 * @param {DisplayObject} child - The display object to position.
 */
com_watabou_utils_DisplayObjectExtender.right = function(child) {
	child.set_x(-child.get_width());
};

/**
 * Bottom-align a display object by setting its y to `-height`.
 *
 * @param {DisplayObject} child - The display object to position.
 */
com_watabou_utils_DisplayObjectExtender.bottom = function(child) {
	child.set_y(-child.get_height());
};

/**
 * Register a handler that fires when the object is added to or
 * removed from the display stage. The handler receives a boolean:
 * `true` when added, `false` when removed.
 *
 * @param {DisplayObject} obj     - The display object to watch.
 * @param {Function}      handler - Callback `(isActive: boolean) => void`.
 */
com_watabou_utils_DisplayObjectExtender.onActivate = function(obj,handler) {
	var eventHandler = function(e) {
		handler(e.type == "addedToStage");
	};
	obj.addEventListener("addedToStage",eventHandler);
	obj.addEventListener("removedFromStage",eventHandler);
};

/**
 * Convert a point from one display object's local coordinate space
 * to another's, via global coordinates as an intermediary.
 *
 * @param {DisplayObject} obj   - The target display object.
 * @param {DisplayObject} other - The source display object.
 * @param {Point}         p     - The point in `other`'s local space.
 * @returns {Point} The equivalent point in `obj`'s local space.
 */
com_watabou_utils_DisplayObjectExtender.convertFrom = function(obj,other,p) {
	return obj.globalToLocal(other.localToGlobal(p));
};

/**
 * Compute the cumulative scale of a display object by multiplying
 * together the scaleX values of the object and all of its ancestors.
 *
 * @param {DisplayObject} obj - The display object.
 * @returns {number} The effective (total) scale factor.
 */
com_watabou_utils_DisplayObjectExtender.getScale = function(obj) {
	var scale = 1.0;
	while(obj.parent != null) {
		scale *= obj.get_scaleX();
		obj = obj.parent;
	}
	return scale;
};


// ─── GrammarExtender (com.watabou.utils.GrammarExtender) ─── line 15562 ───
/**
 * English grammar helper methods used by the Tracery-based procedural
 * text generator in the roguelike. Provides rules for verb conjugation,
 * pluralisation, articles, and possessive forms.
 */
var com_watabou_utils_GrammarExtender = function() { };
$hxClasses["com.watabou.utils.GrammarExtender"] = com_watabou_utils_GrammarExtender;
com_watabou_utils_GrammarExtender.__name__ = "com.watabou.utils.GrammarExtender";

/**
 * Convert a verb to its third-person singular present-tense form.
 * Handles irregular verbs ("be" -> "is", "have" -> "has") and
 * regular suffix rules (-y -> -ies, -o/-s -> -es, default -> -s).
 *
 * @param {string} verb - The base form of the verb.
 * @returns {string} The third-person singular form.
 */
com_watabou_utils_GrammarExtender.thirdSing = function(verb) {
	if(verb == "be") {
		return "is";
	} else if(verb == "have") {
		return "has";
	} else if(HxOverrides.substr(verb,-1,null) == "y" && "ieaou".indexOf(HxOverrides.substr(verb,verb.length - 2,1)) == -1) {
		// Words ending in consonant + y: carry -> carries
		return HxOverrides.substr(verb,0,verb.length - 1) + "ies";
	} else if(HxOverrides.substr(verb,-1,null) == "o") {
		// Words ending in -o: go -> goes
		return verb + "es";
	} else if(HxOverrides.substr(verb,-1,null) == "s") {
		// Words ending in -s: miss -> misses
		return verb + "es";
	} else {
		return verb + "s";
	}
};

/**
 * Convert a verb to its present participle (gerund) form.
 * Handles "be" -> "being" and verbs ending in -i, -y, -e by
 * dropping the final letter before adding "-ing".
 *
 * @param {string} verb - The base form of the verb.
 * @returns {string} The gerund form.
 */
com_watabou_utils_GrammarExtender.gerund = function(verb) {
	if(verb == "be") {
		return "being";
	} else if("iye".indexOf(HxOverrides.substr(verb,-1,null)) != -1) {
		// Drop trailing i/y/e before -ing: die -> dying, ski -> skiing
		return HxOverrides.substr(verb,0,verb.length - 1) + "ing";
	} else {
		return verb + "ing";
	}
};

/**
 * Pluralise an English noun using common rules:
 *   - "man" -> "men"
 *   - "ff" -> "ffs" (cliff -> cliffs)
 *   - "f" -> "ves" (wolf -> wolves)
 *   - "fe" -> "ves" (knife -> knives)
 *   - consonant + "y" -> "ies" (city -> cities)
 *   - sibilants (s, x, z, ch, sh) -> add "es"
 *   - Default: add "s"
 *
 * @param {string} s - The singular noun.
 * @returns {string} The plural form.
 */
com_watabou_utils_GrammarExtender.plural = function(s) {
	if(HxOverrides.substr(s,-3,null) == "man") {
		return HxOverrides.substr(s,0,s.length - 3) + "men";
	} else if(HxOverrides.substr(s,-2,null) == "ff") {
		return s + "s";
	} else if(HxOverrides.substr(s,-1,null) == "f") {
		return HxOverrides.substr(s,0,s.length - 1) + "ves";
	} else if(HxOverrides.substr(s,-2,null) == "fe") {
		return HxOverrides.substr(s,0,s.length - 2) + "ves";
	} else if(HxOverrides.substr(s,-1,null) == "y" && "ieaou".indexOf(HxOverrides.substr(s,s.length - 2,1)) == -1) {
		return HxOverrides.substr(s,0,s.length - 1) + "ies";
	} else if(HxOverrides.substr(s,-1,null) == "s" || HxOverrides.substr(s,-1,null) == "x" || HxOverrides.substr(s,-1,null) == "z" || HxOverrides.substr(s,-2,null) == "ch" || HxOverrides.substr(s,-2,null) == "sh") {
		return s + "es";
	} else {
		return s + "s";
	}
};

/**
 * Return the correct indefinite article ("a" or "an") for the given
 * word. If `articleOnly` is false (the default), appends the word
 * itself (e.g. "a sword").
 *
 * @param {string}  s            - The noun.
 * @param {boolean} [articleOnly=false] - When `true`, return only the article.
 * @returns {string} The article (or article + word).
 */
com_watabou_utils_GrammarExtender.a = function(s,articleOnly) {
	if(articleOnly == null) {
		articleOnly = false;
	}
	return ("ieaou".indexOf(s.charAt(0).toLowerCase()) != -1 ? "an" : "a") + (articleOnly ? "" : " " + s);
};

/**
 * Return the possessive form of a noun.
 * If the noun already ends with an apostrophe (e.g. "its" -- though
 * the check here is character-vs-string which may be a Haxe-ism),
 * appends just an apostrophe; otherwise appends "'s".
 *
 * @param {string} s - The noun.
 * @returns {string} The possessive form.
 */
com_watabou_utils_GrammarExtender.genitive = function(s) {
	if(s.charAt(s.length - 1) == s) {
		return s + "'";
	} else {
		return s + "'s";
	}
};


// ─── GraphicsExtender (com.watabou.utils.GraphicsExtender) ─── line 15619 ───
/**
 * Static drawing helpers that extend OpenFL's Graphics object.
 * Provides convenience methods for polygons, polylines, lines
 * (solid and dashed), and arcs. All methods take a Graphics `g`
 * as the first argument and draw directly into it.
 */
var com_watabou_utils_GraphicsExtender = function() { };
$hxClasses["com.watabou.utils.GraphicsExtender"] = com_watabou_utils_GraphicsExtender;
com_watabou_utils_GraphicsExtender.__name__ = "com.watabou.utils.GraphicsExtender";

/**
 * Draw a closed polygon. The pen starts at the LAST point in the
 * array and traces through every point in order, closing back to
 * the start.
 *
 * @param {Graphics} g    - The OpenFL Graphics context.
 * @param {Point[]}  poly - Array of Point objects defining vertices.
 */
com_watabou_utils_GraphicsExtender.drawPolygon = function(g,poly) {
	// Start from the last vertex so the path closes properly.
	var p = poly[poly.length - 1];
	g.moveTo(p.x,p.y);
	var _g = 0;
	while(_g < poly.length) {
		var p = poly[_g];
		++_g;
		g.lineTo(p.x,p.y);
	}
};

/**
 * Draw a closed polygon translated to position (x, y).
 *
 * @param {Graphics} g    - The OpenFL Graphics context.
 * @param {Point[]}  poly - Array of Point objects defining vertices.
 * @param {number}   x    - Horizontal offset.
 * @param {number}   y    - Vertical offset.
 */
com_watabou_utils_GraphicsExtender.drawPolygonAt = function(g,poly,x,y) {
	var p = poly[poly.length - 1];
	g.moveTo(p.x + x,p.y + y);
	var _g = 0;
	while(_g < poly.length) {
		var p = poly[_g];
		++_g;
		g.lineTo(p.x + x,p.y + y);
	}
};

/**
 * Draw an open polyline (not closed) through the given points.
 * Starts at the first point and draws to each subsequent point.
 *
 * @param {Graphics} g - The OpenFL Graphics context.
 * @param {Point[]}  p - Array of Point objects.
 */
com_watabou_utils_GraphicsExtender.drawPolyline = function(g,p) {
	var p1 = p[0];
	g.moveTo(p1.x,p1.y);
	var _g = 1;
	var _g1 = p.length;
	while(_g < _g1) {
		var i = _g++;
		var p1 = p[i];
		g.lineTo(p1.x,p1.y);
	}
};

/**
 * Draw an open polyline translated to position (x, y).
 *
 * @param {Graphics} g    - The OpenFL Graphics context.
 * @param {Point[]}  poly - Array of Point objects.
 * @param {number}   x    - Horizontal offset.
 * @param {number}   y    - Vertical offset.
 */
com_watabou_utils_GraphicsExtender.drawPolylineAt = function(g,poly,x,y) {
	g.moveTo(poly[0].x + x,poly[0].y + y);
	var _g = 1;
	var _g1 = poly.length;
	while(_g < _g1) {
		var i = _g++;
		var p = poly[i];
		g.lineTo(p.x + x,p.y + y);
	}
};

/**
 * Move the pen to a Point without drawing.
 *
 * @param {Graphics} g - The OpenFL Graphics context.
 * @param {Point}    p - Target position.
 */
com_watabou_utils_GraphicsExtender.moveToPoint = function(g,p) {
	g.moveTo(p.x,p.y);
};

/**
 * Draw a line from the current pen position to a Point.
 *
 * @param {Graphics} g - The OpenFL Graphics context.
 * @param {Point}    p - Target position.
 */
com_watabou_utils_GraphicsExtender.lineToPoint = function(g,p) {
	g.lineTo(p.x,p.y);
};

/**
 * Draw a straight line between two points.
 *
 * @param {Graphics} g  - The OpenFL Graphics context.
 * @param {Point}    p0 - Start point.
 * @param {Point}    p1 - End point.
 */
com_watabou_utils_GraphicsExtender.line = function(g,p0,p1) {
	g.moveTo(p0.x,p0.y);
	g.lineTo(p1.x,p1.y);
};

/**
 * Draw a dashed line between two points. The `pattern` array
 * alternates between dash lengths (drawn) and gap lengths (skipped).
 * A value of 0 in the pattern creates a zero-length gap (no-op for
 * that segment).
 *
 * @param {Graphics} g       - The OpenFL Graphics context.
 * @param {Point}    p1      - Start point.
 * @param {Point}    p2      - End point.
 * @param {number[]} pattern - Alternating dash/gap lengths, e.g. [5, 3].
 */
com_watabou_utils_GraphicsExtender.dashedLine = function(g,p1,p2,pattern) {
	var down = true;  // Whether we are currently drawing (true) or gapping (false).
	var pos = 0;      // Current index into the pattern array.
	g.moveTo(p1.x,p1.y);
	while(true) {
		var dist = openfl_geom_Point.distance(p1,p2);
		var dash = pattern[pos];
		if(dash > 0) {
			if(dist < dash) {
				// Remaining segment is shorter than the current dash/gap;
				// finish the line if we're drawing.
				if(down) {
					g.lineTo(p2.x,p2.y);
				}
				break;
			}
			// Interpolate along the line to find the next break point.
			p1 = com_watabou_geom_GeomUtils.lerp(p1,p2,dash / dist);
			if(down) {
				g.lineTo(p1.x,p1.y);
			} else {
				// Lift the pen to skip this gap segment.
				g.moveTo(p1.x,p1.y);
			}
		}
		// Advance to the next pattern entry, wrapping around.
		if(++pos >= pattern.length) {
			pos = 0;
		}
		down = !down; // Alternate between drawing and gapping.
	}
};

/**
 * Draw a dashed polyline through an array of points. The pattern
 * carries across segment boundaries, so dashes flow continuously
 * along the entire path.
 *
 * @param {Graphics} g       - The OpenFL Graphics context.
 * @param {Point[]}  poly    - Array of Point objects (at least 2).
 * @param {number[]} pattern - Alternating dash/gap lengths.
 */
com_watabou_utils_GraphicsExtender.dashedPolyline = function(g,poly,pattern) {
	if(poly.length < 2) {
		return;
	}
	var down = true;       // Currently drawing (true) or gapping (false).
	var patIndex = 0;      // Current index into the pattern.
	var patPos = 0.0;      // How far along the current dash/gap we've travelled.
	var dash = pattern[0]; // Length of the current dash/gap segment.
	var segIndex = 0;      // Current line-segment index in the polyline.
	var p1 = poly[0];
	var p2 = poly[1];
	g.moveTo(p1.x,p1.y);
	while(true) {
		var dist = openfl_geom_Point.distance(p1,p2);
		if(patPos + dist < dash) {
			// The current segment fits entirely within the current dash/gap.
			if(down) {
				g.lineTo(p2.x,p2.y);
			}
			if(++segIndex >= poly.length) {
				break; // Reached the end of the polyline.
			}
			p1 = p2;
			p2 = poly[segIndex];
			patPos += dist;
		} else {
			// The dash/gap boundary falls within this segment.
			if(dash > 0) {
				// Interpolate to find the exact boundary point.
				p1 = com_watabou_geom_GeomUtils.lerp(p1,p2,(dash - patPos) / dist);
				if(down) {
					g.lineTo(p1.x,p1.y);
				} else {
					g.moveTo(p1.x,p1.y);
				}
			}
			// Move to the next pattern entry.
			if(++patIndex >= pattern.length) {
				patIndex = 0;
			}
			dash = pattern[patIndex];
			patPos = 0.0;
			down = !down;
		}
	}
};

/**
 * Draw a circular arc using quadratic Bezier curve segments.
 * The arc is approximated by subdividing into sub-arcs of at most
 * PI/4 radians each, using a geometric construction that produces
 * a control point for `curveTo`.
 *
 * @param {Graphics} g        - The OpenFL Graphics context.
 * @param {number}   x        - Center X of the arc.
 * @param {number}   y        - Center Y of the arc.
 * @param {number}   r        - Radius.
 * @param {number}   start    - Start angle in radians.
 * @param {number}   end      - End angle in radians.
 * @param {boolean}  [moveTo=true] - If true, moves the pen to the arc start.
 */
com_watabou_utils_GraphicsExtender.drawArc = function(g,x,y,r,start,end,moveTo) {
	if(moveTo == null) {
		moveTo = true;
	}
	// Number of sub-arcs (at least 2, each at most PI/4 radians).
	var n = Math.ceil((end - start) / (Math.PI / 4));
	if(n < 2) {
		n = 2;
	}
	var step = (end - start) / n;

	// Draw a single sub-arc from angle a0 to a1 using a quadratic
	// Bezier control point derived from the arc's geometry.
	var subArc = function(a0,a1) {
		var da2 = (a1 - a0) / 2;
		var r1 = r / Math.cos(da2);
		var cx = x + Math.cos(a0 + da2) * r1;
		var cy = y + Math.sin(a0 + da2) * r1;
		g.curveTo(cx,cy,x + Math.cos(a1) * r,y + Math.sin(a1) * r);
	};

	if(moveTo) {
		g.moveTo(x + r * Math.cos(start),y + r * Math.sin(start));
	}
	var _g = 0;
	var _g1 = n;
	while(_g < _g1) {
		var i = _g++;
		subArc(start + i * step,start + (i + 1) * step);
	}
};


// ─── MathUtils (com.watabou.utils.MathUtils) ─── line 15768 ───
/**
 * Static math utility methods. Provides clamping, integer min/max,
 * sign, linear interpolation, and smooth-step functions.
 */
var com_watabou_utils_MathUtils = function() { };
$hxClasses["com.watabou.utils.MathUtils"] = com_watabou_utils_MathUtils;
com_watabou_utils_MathUtils.__name__ = "com.watabou.utils.MathUtils";

/**
 * Clamp a floating-point value to the range [min, max].
 *
 * @param {number} value - The value to clamp.
 * @param {number} min   - Lower bound.
 * @param {number} max   - Upper bound.
 * @returns {number} The clamped value.
 */
com_watabou_utils_MathUtils.gate = function(value,min,max) {
	if(value < min) {
		return min;
	} else if(value < max) {
		return value;
	} else {
		return max;
	}
};

/**
 * Clamp an integer value to the range [min, max].
 * Identical logic to `gate` but intended for integer arguments.
 *
 * @param {number} value - The value to clamp.
 * @param {number} min   - Lower bound.
 * @param {number} max   - Upper bound.
 * @returns {number} The clamped integer.
 */
com_watabou_utils_MathUtils.gatei = function(value,min,max) {
	if(value < min) {
		return min;
	} else if(value < max) {
		return value;
	} else {
		return max;
	}
};

/**
 * Return the smaller of two numbers.
 *
 * @param {number} a - First value.
 * @param {number} b - Second value.
 * @returns {number} The minimum.
 */
com_watabou_utils_MathUtils.mini = function(a,b) {
	if(a < b) {
		return a;
	} else {
		return b;
	}
};

/**
 * Return the larger of two numbers.
 *
 * @param {number} a - First value.
 * @param {number} b - Second value.
 * @returns {number} The maximum.
 */
com_watabou_utils_MathUtils.maxi = function(a,b) {
	if(a > b) {
		return a;
	} else {
		return b;
	}
};

/**
 * Return the absolute value of an integer.
 *
 * @param {number} i - The integer.
 * @returns {number} The absolute value.
 */
com_watabou_utils_MathUtils.absi = function(i) {
	if(i >= 0) {
		return i;
	} else {
		return -i;
	}
};

/**
 * Return the sign of a number: -1, 0, or 1.
 *
 * @param {number} value - The input value.
 * @returns {number} -1 if negative, 0 if zero, 1 if positive.
 */
com_watabou_utils_MathUtils.sign = function(value) {
	if(value == 0) {
		return 0;
	} else if(value < 0) {
		return -1;
	} else {
		return 1;
	}
};

/**
 * Linearly interpolate between two values.
 * `lerp(a, b, 0)` returns `a`; `lerp(a, b, 1)` returns `b`.
 *
 * @param {number} a - Start value.
 * @param {number} b - End value.
 * @param {number} [p=0.5] - Interpolation factor in [0, 1].
 * @returns {number} The interpolated value.
 */
com_watabou_utils_MathUtils.lerp = function(a,b,p) {
	if(p == null) {
		p = 0.5;
	}
	return a + (b - a) * p;
};

/**
 * Apply the smooth-step (Hermite) function: `x^2 * (3 - 2x)`.
 * Maps [0,1] to [0,1] with zero derivatives at both ends.
 *
 * @param {number} x - Input in [0, 1].
 * @returns {number} Smoothed value in [0, 1].
 */
com_watabou_utils_MathUtils.smooth = function(x) {
	return x * x * (3 - 2 * x);
};


// ─── PointExtender (com.watabou.utils.PointExtender) ─── line 15828 ───
/**
 * Static helper methods that act as extensions on OpenFL Point
 * objects. Provides 2D vector arithmetic: addition, subtraction,
 * scaling, rotation, dot product, cross product, normalisation,
 * and coordinate conversion.
 *
 * Methods that return a new Point create a fresh instance; methods
 * suffixed with "Eq" mutate the point in place.
 */
var com_watabou_utils_PointExtender = function() { };
$hxClasses["com.watabou.utils.PointExtender"] = com_watabou_utils_PointExtender;
com_watabou_utils_PointExtender.__name__ = "com.watabou.utils.PointExtender";

/**
 * Copy the coordinates of point `q` into point `p` (mutates `p`).
 *
 * @param {Point} p - Destination point.
 * @param {Point} q - Source point.
 */
com_watabou_utils_PointExtender.set = function(p,q) {
	p.x = q.x;
	p.y = q.y;
};

/**
 * Return a new point offset from `p` by (dx, dy).
 *
 * @param {Point}  p  - The base point.
 * @param {number} dx - Horizontal offset.
 * @param {number} dy - Vertical offset.
 * @returns {Point} The new offset point.
 */
com_watabou_utils_PointExtender.d = function(p,dx,dy) {
	return new openfl_geom_Point(p.x + dx,p.y + dy);
};

/**
 * Return a new point offset horizontally by `d` units.
 *
 * @param {Point}  p - The base point.
 * @param {number} d - Horizontal offset (can be negative).
 * @returns {Point} The new point.
 */
com_watabou_utils_PointExtender.dx = function(p,d) {
	return new openfl_geom_Point(p.x + d,p.y);
};

/**
 * Return a new point offset vertically by `d` units.
 *
 * @param {Point}  p - The base point.
 * @param {number} d - Vertical offset (can be negative).
 * @returns {Point} The new point.
 */
com_watabou_utils_PointExtender.dy = function(p,d) {
	return new openfl_geom_Point(p.x,p.y + d);
};

/**
 * Return a new point scaled uniformly by factor `f`.
 *
 * @param {Point}  p - The base point.
 * @param {number} f - Scale factor.
 * @returns {Point} The scaled point.
 */
com_watabou_utils_PointExtender.scale = function(p,f) {
	return new openfl_geom_Point(p.x * f,p.y * f);
};

/**
 * Return a new point scaled independently on each axis.
 *
 * @param {Point}  p  - The base point.
 * @param {number} sx - Horizontal scale.
 * @param {number} [sy=1.0] - Vertical scale.
 * @returns {Point} The scaled point.
 */
com_watabou_utils_PointExtender.scaleXY = function(p,sx,sy) {
	if(sy == null) {
		sy = 1.0;
	}
	return new openfl_geom_Point(p.x * sx,p.y * sy);
};

/**
 * Return a new point: `a + b * t`. Useful for linear extrapolation.
 *
 * @param {Point}  a - Base point.
 * @param {Point}  b - Direction point.
 * @param {number} t - Scale factor for `b`.
 * @returns {Point} The result.
 */
com_watabou_utils_PointExtender.addScaled = function(a,b,t) {
	return new openfl_geom_Point(a.x + b.x * t,a.y + b.y * t);
};

/**
 * Return a new point with both components negated.
 *
 * @param {Point} p - The point to invert.
 * @returns {Point} The negated point.
 */
com_watabou_utils_PointExtender.invert = function(p) {
	return new openfl_geom_Point(-p.x,-p.y);
};

/**
 * Return a new normalised copy of the point with the given length.
 * If no length is specified, normalises to unit length (1).
 *
 * @param {Point}  p        - The point to normalise.
 * @param {number} [length=1] - Desired length.
 * @returns {Point} A new point of the specified length.
 */
com_watabou_utils_PointExtender.norm = function(p,length) {
	if(length == null) {
		length = 1;
	}
	p = p.clone();
	p.normalize(length);
	return p;
};

/**
 * Add point `q` to point `p` in place.
 *
 * @param {Point} p - The point to modify.
 * @param {Point} q - The point to add.
 */
com_watabou_utils_PointExtender.addEq = function(p,q) {
	p.x += q.x;
	p.y += q.y;
};

/**
 * Subtract point `q` from point `p` in place.
 *
 * @param {Point} p - The point to modify.
 * @param {Point} q - The point to subtract.
 */
com_watabou_utils_PointExtender.subEq = function(p,q) {
	p.x -= q.x;
	p.y -= q.y;
};

/**
 * Scale point `p` by factor `f` in place.
 *
 * @param {Point}  p - The point to modify.
 * @param {number} f - Scale factor.
 */
com_watabou_utils_PointExtender.scaleEq = function(p,f) {
	p.x *= f;
	p.y *= f;
};

/**
 * Return the angle (in radians) of the vector from the origin to
 * point `p`, using atan2.
 *
 * @param {Point} p - The point.
 * @returns {number} The angle in radians.
 */
com_watabou_utils_PointExtender.atan = function(p) {
	return Math.atan2(p.y,p.x);
};

/**
 * Compute the dot product of two points (treated as 2D vectors).
 *
 * @param {Point} p1 - First vector.
 * @param {Point} p2 - Second vector.
 * @returns {number} The dot product.
 */
com_watabou_utils_PointExtender.dot = function(p1,p2) {
	return p1.x * p2.x + p1.y * p2.y;
};

/**
 * Return a new point rotated 90 degrees counter-clockwise:
 * (x, y) -> (-y, x).
 *
 * @param {Point} p - The point to rotate.
 * @returns {Point} The rotated point.
 */
com_watabou_utils_PointExtender.rotate90 = function(p) {
	return new openfl_geom_Point(-p.y,p.x);
};

/**
 * Rotate point `p` 90 degrees clockwise in place.
 * If `norm` is true, normalise to unit length afterwards.
 *
 * @param {Point}  p         - The point to rotate.
 * @param {boolean} [norm=false] - Whether to normalise afterwards.
 */
com_watabou_utils_PointExtender.cw = function(p,norm) {
	if(norm == null) {
		norm = false;
	}
	p.setTo(-p.y,p.x);
	if(norm) {
		p.normalize(1);
	}
};

/**
 * Rotate point `p` 90 degrees counter-clockwise in place.
 * If `norm` is true, normalise to unit length afterwards.
 *
 * @param {Point}  p         - The point to rotate.
 * @param {boolean} [norm=false] - Whether to normalise afterwards.
 */
com_watabou_utils_PointExtender.ccw = function(p,norm) {
	if(norm == null) {
		norm = false;
	}
	p.setTo(p.y,-p.x);
	if(norm) {
		p.normalize(1);
	}
};

/**
 * Return a new point rotated by angle `a` (radians) counter-clockwise.
 *
 * @param {Point}  p - The point to rotate.
 * @param {number} a - Rotation angle in radians.
 * @returns {Point} The rotated point.
 */
com_watabou_utils_PointExtender.rotate = function(p,a) {
	var sin = Math.sin(a);
	var cos = Math.cos(a);
	return new openfl_geom_Point(p.x * cos - p.y * sin,p.y * cos + p.x * sin);
};

/**
 * Return a new point rotated using pre-computed sin/cos values.
 *
 * @param {Point}  p   - The point to rotate.
 * @param {number} sin - Sine of the rotation angle.
 * @param {number} cos - Cosine of the rotation angle.
 * @returns {Point} The rotated point.
 */
com_watabou_utils_PointExtender.rotateYX = function(p,sin,cos) {
	return new openfl_geom_Point(p.x * cos - p.y * sin,p.y * cos + p.x * sin);
};

/**
 * Rotate point `p` in place using pre-computed sin/cos values.
 *
 * @param {Point}  p   - The point to rotate.
 * @param {number} sin - Sine of the rotation angle.
 * @param {number} cos - Cosine of the rotation angle.
 */
com_watabou_utils_PointExtender.asRotateYX = function(p,sin,cos) {
	p.setTo(p.x * cos - p.y * sin,p.y * cos + p.x * sin);
};

/**
 * Compute the 2D cross product (z-component) of two vectors:
 * `p1.x * p2.y - p1.y * p2.x`.
 *
 * @param {Point} p1 - First vector.
 * @param {Point} p2 - Second vector.
 * @returns {number} The cross product scalar.
 */
com_watabou_utils_PointExtender.cross = function(p1,p2) {
	return p1.x * p2.y - p1.y * p2.x;
};

/**
 * Project vector `v` onto `basis` and return the scalar projection
 * (i.e. the signed length of the projection).
 *
 * @param {Point} basis - The basis vector.
 * @param {Point} v     - The vector to project.
 * @returns {number} The scalar projection.
 */
com_watabou_utils_PointExtender.project = function(basis,v) {
	var len = basis.get_length();
	return (basis.x * v.x + basis.y * v.y) / (len * len);
};


// ─── Random (com.watabou.utils.Random) ─── line 15924 ───
/**
 * Seeded pseudo-random number generator (PRNG).
 *
 * Uses a linear congruential generator (LCG) with the constants
 *   seed = (seed * 48271) mod 2^31
 *
 * Because the seed is deterministic, the game can reproduce the
 * same random sequence given the same seed — critical for roguelike
 * replay, save/load, and debugging.
 *
 * @type {number} The current PRNG seed (module-private state).
 */
var com_watabou_utils_Random = function() { };
$hxClasses["com.watabou.utils.Random"] = com_watabou_utils_Random;
com_watabou_utils_Random.__name__ = "com.watabou.utils.Random";

/**
 * Reset the PRNG seed. If no seed is given (or -1 is passed),
 * uses the current system time modulo 2^31.
 *
 * @param {number} [seed=-1] - The desired seed, or -1 for time-based.
 */
com_watabou_utils_Random.reset = function(seed) {
	if(seed == null) {
		seed = -1;
	}
	com_watabou_utils_Random.seed = seed != -1 ? seed : new Date().getTime() % 2147483647 | 0;
};

/**
 * Save the current seed to the internal `saved` slot so it can be
 * restored later (useful for "peek" operations that shouldn't
 * consume random state).
 *
 * @returns {number} The saved seed value.
 */
com_watabou_utils_Random.save = function() {
	return com_watabou_utils_Random.saved = com_watabou_utils_Random.seed;
};

/**
 * Restore a previously saved seed. If no value is given and a
 * saved seed exists, restores that; otherwise does nothing.
 *
 * @param {number} [value=-1] - The seed to restore, or -1 for saved.
 */
com_watabou_utils_Random.restore = function(value) {
	if(value == null) {
		value = -1;
	}
	if(value != -1) {
		com_watabou_utils_Random.seed = value;
	} else if(com_watabou_utils_Random.saved != -1) {
		com_watabou_utils_Random.seed = com_watabou_utils_Random.saved;
		com_watabou_utils_Random.saved = -1;
	}
};

/**
 * Return the current PRNG seed without advancing it.
 *
 * @returns {number} The current seed.
 */
com_watabou_utils_Random.getSeed = function() {
	return com_watabou_utils_Random.seed;
};

/**
 * Execute a function while preserving the PRNG state. The seed is
 * saved before the call and restored afterwards, so the function's
 * random calls don't affect the global sequence.
 *
 * @param {Function} f - The function to execute.
 * @returns {*} The return value of `f`.
 */
com_watabou_utils_Random.preserve = function(f) {
	var seed = com_watabou_utils_Random.save();
	var result = f();
	com_watabou_utils_Random.restore(seed);
	return result;
};

/**
 * Return the current system time as an integer (ms since epoch,
 * mod 2^31). Not related to the PRNG; useful for timing.
 *
 * @returns {number} Current timestamp.
 */
com_watabou_utils_Random.time = function() {
	return new Date().getTime() % 2147483647 | 0;
};

/**
 * Advance the LCG by one step and return the new seed value.
 *
 * @returns {number} The new raw seed (integer).
 */
com_watabou_utils_Random.next = function() {
	return com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0;
};

/**
 * Return a random float in the range [0, 1).
 *
 * @returns {number} A uniformly distributed random float.
 */
com_watabou_utils_Random.float = function() {
	return (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647;
};

/**
 * Return a random float in [0, 1) raised to the third power.
 * This biases the distribution toward smaller values (cubic falloff).
 *
 * @returns {number} A cubically-biased random float.
 */
com_watabou_utils_Random.float2 = function() {
	var f = (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647;
	return f * f * f;
};

/**
 * Return an approximation of a normally-distributed random value
 * in [0, 1) by averaging three uniform random floats (Central Limit
 * Theorem approximation).
 *
 * @returns {number} A normally-distributed value in approximately [0, 1).
 */
com_watabou_utils_Random.normal = function() {
	return ((com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 + (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 + (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647) / 3;
};

/**
 * Return a normally-distributed random value in [-1, 1).
 * Same as `normal()` but rescaled and shifted to center on zero.
 *
 * @returns {number} A value in approximately [-1, 1).
 */
com_watabou_utils_Random.normal2 = function() {
	return ((com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 + (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 + (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647) / 3 * 2 - 1;
};

/**
 * Return a small random value centred on zero, produced by averaging
 * four uniform floats and taking the absolute value, then mapping
 * into [0, 1). Useful for small perturbations.
 *
 * @returns {number} A small positive value in [0, 1).
 */
com_watabou_utils_Random.small = function() {
	return Math.abs(((com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 + (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 + (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 + (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647) / 2 - 1);
};

/**
 * Return a random integer in the range [min, max) (max exclusive).
 *
 * @param {number} min - Lower bound (inclusive).
 * @param {number} max - Upper bound (exclusive).
 * @returns {number} A random integer.
 */
com_watabou_utils_Random.int = function(min,max) {
	return Math.floor(min + (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 * (max - min));
};

/**
 * Return a random integer in the range [0, max) (max exclusive).
 *
 * @param {number} max - Upper bound (exclusive).
 * @returns {number} A random integer.
 */
com_watabou_utils_Random.int0 = function(max) {
	return Math.floor((com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 * max);
};

/**
 * Roll a single die with `max` faces: returns a value in [1, max].
 * Named after the "d" notation in tabletop RPGs (e.g. d6 = d(6)).
 *
 * @param {number} max - Number of faces on the die.
 * @returns {number} The die result in [1, max].
 */
com_watabou_utils_Random.d = function(max) {
	return 1 + Math.floor((com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 * max);
};

/**
 * Roll an n-sided die (same as `d(n)`): returns [1, n].
 *
 * @param {number} n - Number of sides.
 * @returns {number} The die result in [1, n].
 */
com_watabou_utils_Random.roll = function(n) {
	return Math.floor((com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 * n) + 1;
};

/**
 * Given a floating-point number, round it probabilistically.
 * The integer part is always kept; the fractional part becomes the
 * chance of rounding up. E.g. `frac(3.7)` has a 70% chance of
 * returning 4 and 30% chance of returning 3.
 *
 * @param {number} f - The value to probabilistically round.
 * @returns {number} Either floor(f) or floor(f) + 1.
 */
com_watabou_utils_Random.frac = function(f) {
	var chance = f - (f | 0);
	if(chance == null) {
		chance = 0.5;
	}
	return (f | 0) + ((com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 < chance ? 1 : 0);
};

/**
 * Return a random boolean, with a configurable probability of
 * being `true`.
 *
 * @param {number} [chance=0.5] - Probability of returning `true` in [0, 1].
 * @returns {boolean} The random boolean.
 */
com_watabou_utils_Random.bool = function(chance) {
	if(chance == null) {
		chance = 0.5;
	}
	return (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 < chance;
};

/**
 * Return a "fuzzy" value around 0.5, where the spread is controlled
 * by `f`. When `f = 0` the result is always 0.5; when `f = 1` the
 * result is a full normal-distribution random in [0, 1).
 *
 * @param {number} [f=1.0] - Fuzziness factor in [0, 1].
 * @returns {number} A fuzzy value.
 */
com_watabou_utils_Random.fuzzy = function(f) {
	if(f == null) {
		f = 1.0;
	}
	if(f == 0) {
		return 0.5;
	} else {
		// Blend between 0.5 (no fuzz) and a 3-sample normal distribution.
		return (1 - f) / 2 + f * (((com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 + (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 + (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647) / 3);
	}
};


// ─── StringUtils (com.watabou.utils.StringUtils) ─── line 16013 ───
/**
 * Static string utility methods. Provides capitalisation, English
 * enumeration ("a, b, and c"), repetition, and integer-to-text
 * conversion (Roman numerals and English words).
 */
var com_watabou_utils_StringUtils = function() { };
$hxClasses["com.watabou.utils.StringUtils"] = com_watabou_utils_StringUtils;
com_watabou_utils_StringUtils.__name__ = "com.watabou.utils.StringUtils";

/**
 * Capitalise the first letter of a string.
 *
 * @param {string} s - The input string.
 * @returns {string} The string with its first character upper-cased.
 */
com_watabou_utils_StringUtils.capitalize = function(s) {
	return HxOverrides.substr(s,0,1).toUpperCase() + HxOverrides.substr(s,1,null);
};

/**
 * Capitalise every word in a space-separated string.
 *
 * @param {string} s - The input string.
 * @returns {string} Each word's first letter upper-cased.
 */
com_watabou_utils_StringUtils.capitalizeAll = function(s) {
	var _g = [];
	var _g1 = 0;
	var _g2 = s.split(" ");
	while(_g1 < _g2.length) {
		var word = _g2[_g1];
		++_g1;
		_g.push(com_watabou_utils_StringUtils.capitalize(word));
	}
	return _g.join(" ");
};

/**
 * Format an array of items as an English-style enumerated list.
 *   - 0 items: ""
 *   - 1 item:  "X"
 *   - 2+ items: "X, Y, and Z"
 *
 * @param {Array} a - The items to enumerate.
 * @returns {string} The formatted enumeration string.
 */
com_watabou_utils_StringUtils.enumerate = function(a) {
	switch(a.length) {
	case 0:
		return "";
	case 1:
		return Std.string(a[0]);
	default:
		return a.slice(0,a.length - 1).join(", ") + " and " + Std.string(a[a.length - 1]);
	}
};

/**
 * Repeat a string `n` times and return the concatenation.
 *
 * @param {string} s - The string to repeat.
 * @param {number} n - Number of repetitions.
 * @returns {string} The repeated string.
 */
com_watabou_utils_StringUtils.repeat = function(s,n) {
	var _g = [];
	var _g1 = 0;
	var _g2 = n;
	while(_g1 < _g2) {
		var i = _g1++;
		_g.push(s);
	}
	return _g.join("");
};

/**
 * Convert a positive integer to a Roman numeral string.
 * Uses the standard subtractive notation (e.g. 4 = "IV", 90 = "XC").
 *
 * @param {number} i - The integer to convert (1..3999).
 * @returns {string} The Roman numeral representation.
 */
com_watabou_utils_StringUtils.int2roman = function(i) {
	var _g = 0;
	var _g1 = com_watabou_utils_StringUtils.romanSymbols.length;
	while(_g < _g1) {
		var j = _g++;
		if(i >= com_watabou_utils_StringUtils.romanValues[j]) {
			// Recursively subtract the largest applicable value.
			return com_watabou_utils_StringUtils.romanSymbols[j] + com_watabou_utils_StringUtils.int2roman(i - com_watabou_utils_StringUtils.romanValues[j]);
		}
	}
	return "";
};

/**
 * Convert a positive integer to its English-word representation
 * (e.g. 42 -> "forty two", 1000 -> "one thousand").
 * Uses a lookup table of English words for powers and tens.
 *
 * @param {number} i - The integer to convert.
 * @returns {string} The English words, or "" if zero.
 */
com_watabou_utils_StringUtils.int2words = function(i) {
	if(i == 0) {
		return "";
	}
	var _g = 0;
	var _g1 = com_watabou_utils_StringUtils.decimalWords.length;
	while(_g < _g1) {
		var j = _g++;
		if(i == com_watabou_utils_StringUtils.decimalValues[j]) {
			return com_watabou_utils_StringUtils.decimalWords[j];
		} else if(i > com_watabou_utils_StringUtils.decimalValues[j]) {
			// Divide out the largest applicable power/tens word.
			var n = i / com_watabou_utils_StringUtils.decimalValues[j] | 0;
			var result = com_watabou_utils_StringUtils.int2words(n) + " " + com_watabou_utils_StringUtils.decimalWords[j];
			var rest = i % com_watabou_utils_StringUtils.decimalValues[j];
			if(rest == 0) {
				return result;
			} else {
				return result + " " + com_watabou_utils_StringUtils.int2words(rest);
			}
		}
	}
	return "";
};

// Static lookup tables for Roman numeral conversion.
/** @type {string[]} Roman numeral symbols, largest first. */
com_watabou_utils_StringUtils.romanSymbols = ["M","CM","D","CD","C","XC","L","XL","X","IX","V","IV","I"];
/** @type {number[]} Corresponding values for each Roman symbol. */
com_watabou_utils_StringUtils.romanValues = [1000,900,500,400,100,90,50,40,10,9,5,4,1];

// Static lookup tables for English word conversion.
/** @type {string[]} English words for powers of 10 and tens. */
com_watabou_utils_StringUtils.decimalWords = ["million","thousand","hundred","ninety","eighty","seventy","sixty","fifty","forty","thirty","twenty","nineteen","eighteen","seventeen","sixteen","fifteen","fourteen","thirteen","twelve","eleven","ten","nine","eight","seven","six","five","four","three","two","one"];
/** @type {number[]} Numeric values corresponding to each decimalWord entry. */
com_watabou_utils_StringUtils.decimalValues = [1000000,1000,100,90,80,70,60,50,40,30,20,19,18,17,16,15,14,13,12,11,10,9,8,7,6,5,4,3,2,1];


// ─── Updater (com.watabou.utils.Updater) ─── line 16317 ───
/**
 * Main game-loop tick system. Provides a centralised signal
 * ({@link com_watabou_utils_Updater._tick}) that fires every frame
 * (or at a fixed interval) with the elapsed time in seconds.
 *
 * Supports three tick sources:
 *   - **Timer** (setTimeout-based, fixed interval)
 *   - **EnterFrame** (OpenFL DisplayObject frame event)
 *   - **Renderer** (OpenFL window render callback)
 *
 * The tick signal is an msignal.Signal1 that dispatches a single
 * `elapsed` float (seconds, scaled by {@link com_watabou_utils_Updater.timeScale}).
 */
var com_watabou_utils_Updater = function() { };
$hxClasses["com.watabou.utils.Updater"] = com_watabou_utils_Updater;
com_watabou_utils_Updater.__name__ = "com.watabou.utils.Updater";
com_watabou_utils_Updater.__properties__ = {get_tick:"get_tick"};

/**
 * Remove all listeners from the tick signal.
 */
com_watabou_utils_Updater.reset = function() {
	com_watabou_utils_Updater._tick.removeAll();
};

/**
 * Lazily initialise and return the tick signal. If no tick source
 * has been configured yet, defaults to a 60ms timer.
 *
 * @returns {Signal1} The tick signal that dispatches elapsed seconds.
 */
com_watabou_utils_Updater.get_tick = function() {
	if(com_watabou_utils_Updater.source == null) {
		com_watabou_utils_Updater.useTimer(60);
	}
	return com_watabou_utils_Updater._tick;
};

/**
 * Called by the active tick source to advance the game loop.
 * Computes the elapsed time since the last fire, scales it by
 * {@link com_watabou_utils_Updater.timeScale}, and dispatches
 * the value to all tick listeners.
 *
 * On the very first call (when `lastTime == 0`), dispatches 0
 * to avoid a huge initial delta.
 */
com_watabou_utils_Updater.fire = function() {
	var t = openfl_Lib.getTimer();
	if(com_watabou_utils_Updater.lastTime == 0) {
		com_watabou_utils_Updater._tick.dispatch(0);
	} else {
		// Elapsed time in seconds, adjusted by the time-scale factor.
		com_watabou_utils_Updater._tick.dispatch((t - com_watabou_utils_Updater.lastTime) / 1000 * com_watabou_utils_Updater.timeScale);
	}
	com_watabou_utils_Updater.lastTime = t;
};

/**
 * Switch the tick source to a fixed-interval timer (setTimeout-based).
 *
 * @param {number} interval - Interval in milliseconds between ticks.
 */
com_watabou_utils_Updater.useTimer = function(interval) {
	if(com_watabou_utils_Updater.source != null) {
		com_watabou_utils_Updater.source.stop();
	}
	com_watabou_utils_Updater.source = new com_watabou_utils__$Updater_TimerEventDispatcher(interval);
};

/**
 * Switch the tick source to an OpenFL enterFrame event on the
 * given display object. Ticks fire once per animation frame.
 *
 * @param {DisplayObject} src - The display object that provides the frame event.
 */
com_watabou_utils_Updater.useEnterFrame = function(src) {
	if(com_watabou_utils_Updater.source != null) {
		com_watabou_utils_Updater.source.stop();
	}
	com_watabou_utils_Updater.source = new com_watabou_utils__$Updater_FrameEventDispatcher(src);
};

/**
 * Switch the tick source to the OpenFL window's onRender callback.
 * Useful for synchronising game logic with the render pipeline.
 *
 * @param {Window} $window - The OpenFL window object.
 */
com_watabou_utils_Updater.useRenderer = function($window) {
	if(com_watabou_utils_Updater.source != null) {
		com_watabou_utils_Updater.source.stop();
	}
	com_watabou_utils_Updater.source = new com_watabou_utils__$Updater_RendererDispatcher($window);
};

/**
 * Schedule a callback to fire after `time` seconds of game time
 * have elapsed. The callback is removed from the tick signal once
 * it fires.
 *
 * @param {number}   time     - Delay in game-seconds.
 * @param {Function} callback - The function to call when the wait expires.
 * @returns {Function} The internal waiting function (can be passed to {@link com_watabou_utils_Updater.cancel}).
 */
com_watabou_utils_Updater.wait = function(time,callback) {
	var passed = 0.0;
	var waiting = null;
	// The waiting function accumulates elapsed time and fires
	// the callback once the threshold is reached.
	waiting = function(elapsed) {
		if((passed += elapsed) >= time) {
			com_watabou_utils_Updater.get_tick().remove(waiting);
			callback();
		}
	};
	com_watabou_utils_Updater.get_tick().add(waiting);
	return waiting;
};

/**
 * Cancel a previously scheduled wait callback by removing it from
 * the tick signal.
 *
 * @param {Function} callback - The waiting function returned by {@link com_watabou_utils_Updater.wait}.
 */
com_watabou_utils_Updater.cancel = function(callback) {
	com_watabou_utils_Updater.get_tick().remove(callback);
};

/**
 * Stop the current tick source entirely. After this, no more tick
 * events will fire until a new source is configured.
 */
com_watabou_utils_Updater.stop = function() {
	if(com_watabou_utils_Updater.source != null) {
		com_watabou_utils_Updater.source.stop();
		com_watabou_utils_Updater.source = null;
	}
};


// ─── RecurringEventDispatcher (com.watabou.utils.RecurringEventDispatcher) ─── line 16378 ───
/**
 * Abstract base class for tick-source dispatchers.
 * Provides a no-op `stop()` method that subclasses override to
 * tear down their specific event listener.
 */
var com_watabou_utils_RecurringEventDispatcher = function() { };
$hxClasses["com.watabou.utils.RecurringEventDispatcher"] = com_watabou_utils_RecurringEventDispatcher;
com_watabou_utils_RecurringEventDispatcher.__name__ = "com.watabou.utils.RecurringEventDispatcher";
com_watabou_utils_RecurringEventDispatcher.prototype = {
	/** Stop the recurring event. Subclasses should override this. */
	stop: function() {
	}
	,__class__: com_watabou_utils_RecurringEventDispatcher
};


// ─── TimerEventDispatcher (com.watabou.utils._Updater.TimerEventDispatcher) ─── line 16386 ───
/**
 * Tick source backed by an OpenFL Timer (setTimeout wrapper).
 * Fires {@link com_watabou_utils_Updater.fire} at a fixed interval.
 *
 * @param {number} interval - Interval in milliseconds.
 */
var com_watabou_utils__$Updater_TimerEventDispatcher = function(interval) {
	this.timer = new openfl_utils_Timer(interval);
	this.timer.addEventListener("timer",$bind(this,this.onTimer));
	this.timer.start();
};
$hxClasses["com.watabou.utils._Updater.TimerEventDispatcher"] = com_watabou_utils__$Updater_TimerEventDispatcher;
com_watabou_utils__$Updater_TimerEventDispatcher.__name__ = "com.watabou.utils._Updater.TimerEventDispatcher";
com_watabou_utils__$Updater_TimerEventDispatcher.__super__ = com_watabou_utils_RecurringEventDispatcher;
com_watabou_utils__$Updater_TimerEventDispatcher.prototype = $extend(com_watabou_utils_RecurringEventDispatcher.prototype,{
	/**
	 * Timer tick handler. Delegates to the Updater's fire method
	 * and requests that the timer continue updating after this event.
	 *
	 * @param {TimerEvent} e - The timer event.
	 */
	onTimer: function(e) {
		com_watabou_utils_Updater.fire();
		e.updateAfterEvent();
	}
	/** Stop the underlying timer. */
	,stop: function() {
		this.timer.stop();
	}
	,__class__: com_watabou_utils__$Updater_TimerEventDispatcher
});


// ─── FrameEventDispatcher (com.watabou.utils._Updater.FrameEventDispatcher) ─── line 16404 ───
/**
 * Tick source driven by OpenFL's enterFrame event on a display object.
 * Fires once per animation frame.
 *
 * @param {DisplayObject} dispObj - The display object that dispatches enterFrame.
 */
var com_watabou_utils__$Updater_FrameEventDispatcher = function(dispObj) {
	this.dispObj = dispObj;
	dispObj.addEventListener("enterFrame",$bind(this,this.onEnterFrame));
};
$hxClasses["com.watabou.utils._Updater.FrameEventDispatcher"] = com_watabou_utils__$Updater_FrameEventDispatcher;
com_watabou_utils__$Updater_FrameEventDispatcher.__name__ = "com.watabou.utils._Updater.FrameEventDispatcher";
com_watabou_utils__$Updater_FrameEventDispatcher.__super__ = com_watabou_utils_RecurringEventDispatcher;
com_watabou_utils__$Updater_FrameEventDispatcher.prototype = $extend(com_watabou_utils_RecurringEventDispatcher.prototype,{
	/**
	 * EnterFrame handler. Delegates to the Updater's fire method.
	 *
	 * @param {Event} e - The enterFrame event (unused).
	 */
	onEnterFrame: function(e) {
		com_watabou_utils_Updater.fire();
	}
	/** Remove the enterFrame listener from the display object. */
	,stop: function() {
		this.dispObj.removeEventListener("enterFrame",$bind(this,this.onEnterFrame));
	}
	,__class__: com_watabou_utils__$Updater_FrameEventDispatcher
});


// ─── RendererDispatcher (com.watabou.utils._Updater.RendererDispatcher) ─── line 16420 ───
/**
 * Tick source driven by the OpenFL window's onRender callback.
 * Fires each time the renderer presents a frame.
 *
 * @param {Window} $window - The OpenFL window object.
 */
var com_watabou_utils__$Updater_RendererDispatcher = function($window) {
	this.window = $window;
	$window.onRender.add($bind(this,this.onRender));
};
$hxClasses["com.watabou.utils._Updater.RendererDispatcher"] = com_watabou_utils__$Updater_RendererDispatcher;
com_watabou_utils__$Updater_RendererDispatcher.__name__ = "com.watabou.utils._Updater.RendererDispatcher";
com_watabou_utils__$Updater_RendererDispatcher.__super__ = com_watabou_utils_RecurringEventDispatcher;
com_watabou_utils__$Updater_RendererDispatcher.prototype = $extend(com_watabou_utils_RecurringEventDispatcher.prototype,{
	/**
	 * Render callback. Delegates to the Updater's fire method.
	 *
	 * @param {RenderContext} context - The render context (unused).
	 */
	onRender: function(context) {
		com_watabou_utils_Updater.fire();
	}
	/** Remove the onRender callback from the window. */
	,stop: function() {
		this.window.onRender.remove($bind(this,this.onRender));
	}
	,__class__: com_watabou_utils__$Updater_RendererDispatcher
});

// -- Static initializers relocated from runtime/base.js (modules/DECISIONS.md, Bug E) --
com_watabou_utils_GrammarExtender.VOWELS = "ieaou";
com_watabou_utils_Random.g = 48271.0;
com_watabou_utils_Random.n = 2147483647;
com_watabou_utils_Random.seed = 1;
com_watabou_utils_Random.saved = -1;
com_watabou_utils_StringUtils.VOWELS = ["i","e","a","o","u","y"];
com_watabou_utils_StringUtils.romanSymbols = ["M","CM","D","CD","C","XC","L","XL","X","IX","V","IV","I"];
com_watabou_utils_StringUtils.romanValues = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
com_watabou_utils_StringUtils.decimalWords = ["million","thousand","hundred","ninety","eighty","seventy","sixty","fifty","forty","thirty","twenty","nineteen","eighteen","seventeen","sixteen","fifteen","fourteen","thirteen","twelve","eleven","ten","nine","eight","seven","six","five","four","three","two","one"];
com_watabou_utils_StringUtils.decimalValues = [1000000,1000,100,90,80,70,60,50,40,30,20,19,18,17,16,15,14,13,12,11,10,9,8,7,6,5,4,3,2,1];
com_watabou_utils_Updater._tick = new msignal_Signal1();
com_watabou_utils_Updater.lastTime = 0;
com_watabou_utils_Updater.timeScale = 1.0;


// -- Window exports (per module-manifest.json) --
// See modules/DECISIONS.md, Bug B: these were private module-scope
// vars with no export/import/window assignment anywhere.
window.com_watabou_utils_ArrayExtender = com_watabou_utils_ArrayExtender;
window.com_watabou_utils_DisplayObjectExtender = com_watabou_utils_DisplayObjectExtender;
window.com_watabou_utils_GrammarExtender = com_watabou_utils_GrammarExtender;
window.com_watabou_utils_GraphicsExtender = com_watabou_utils_GraphicsExtender;
window.com_watabou_utils_MathUtils = com_watabou_utils_MathUtils;
window.com_watabou_utils_PointExtender = com_watabou_utils_PointExtender;
window.com_watabou_utils_Random = com_watabou_utils_Random;
window.com_watabou_utils_StringUtils = com_watabou_utils_StringUtils;
window.com_watabou_utils_Updater = com_watabou_utils_Updater;
window.com_watabou_utils_RecurringEventDispatcher = com_watabou_utils_RecurringEventDispatcher;
window.com_watabou_utils__$Updater_TimerEventDispatcher = com_watabou_utils__$Updater_TimerEventDispatcher;
window.com_watabou_utils__$Updater_FrameEventDispatcher = com_watabou_utils__$Updater_FrameEventDispatcher;
window.com_watabou_utils__$Updater_RendererDispatcher = com_watabou_utils__$Updater_RendererDispatcher;



// ═══ END modules/watabou/utils.js ═══
