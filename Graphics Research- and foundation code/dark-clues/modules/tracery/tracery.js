// ═══════════════════════════════════════════════════════════════════════════════
// TRACERY — modules/tracery/tracery.js
// ═══════════════════════════════════════════════════════════════════════════════
//
// A context-free text generation grammar library, originally ported from Haxe
// (com.watabou.tracery) for the Dark Clues roguelike. Tracery lets you define
// symbols (non-terminals) with sets of replacement rules, then expand a start
// rule into finished text by recursively substituting symbols.
//
// Key concepts:
//   - **Symbol**  — a named non-terminal (e.g. "#name#") backed by a RuleSet.
//   - **RuleSet** — an ordered collection of replacement strings for one symbol.
//                   Supports inline choices like "{a|b|c}" which are compiled
//                   into sub-symbols automatically.
//   - **RuleSelector** — decides which rule to pick from a RuleSet. The default
//                   selector picks uniformly at random; DeckRuleSelector draws
//                   without replacement (like a deck of cards).
//   - **TraceryNode** — a single node in the parse tree produced by expanding a
//                   rule string. Handles tags (#symbol.mod#), actions
//                   ([target:rule]), and plain text.
//   - **NodeAction** — an action node parsed from [target:rule] syntax. Can push
//                   rules onto a symbol's stack, pop them, or execute a grammar
//                   function (e.g. "set flagName").
//   - **Grammar**  — the top-level container that owns all symbols, modifiers,
//                   subgrammars, and flags. Provides expand()/flatten() to turn
//                   a rule string into finished text.
//   - **ModsEngBasic** — a library of English text modifiers (capitalize,
//                   pluralize, possessive, a/an, past tense, etc.) that can be
//                   chained onto symbols via dot notation.
//   - **ExtSymbol** — a symbol whose rule is generated dynamically by a callback
//                   function rather than from a static rule list.
//   - **Tracery**  — the static parser class that tokenizes rule strings into
//                   sections (text, tag, action).
//
// Original source: SevenDRL.js (Haxe-to-JS compilation).
// Extracted into this module by extract-seven-drl.js.
//
// Classes:
//   RuleSelector, DeckRuleSelector, Symbol, ExtSymbol, Grammar,
//   ModsEngBasic, NodeAction, RuleSet, Tracery, TraceryNode
// ═══════════════════════════════════════════════════════════════════════════════


// ─────────────────────────────────────────────────────────────────────────────
// RuleSelector
// ─────────────────────────────────────────────────────────────────────────────
// Default rule selection strategy: picks a random rule from the RuleSet's
// defaultRules array every time select() is called. This means the same rule
// can be picked multiple times (selection with replacement).
//
// Used as the default selector for RuleSet instances. Can be replaced with
// DeckRuleSelector (or a custom subclass) for different selection behaviour.
//
// Constructor: RuleSelector(ruleSet)
//   @param {RuleSet} ruleSet — the RuleSet this selector picks rules from.
// ─────────────────────────────────────────────────────────────────────────────

var com_watabou_tracery_RuleSelector = function(ruleSet) {
	// Store a back-reference to the owning RuleSet so we can access its rules.
	this.ruleSet = ruleSet;
	this.clearState();
};
$hxClasses["com.watabou.tracery.RuleSelector"] = com_watabou_tracery_RuleSelector;
com_watabou_tracery_RuleSelector.__name__ = "com.watabou.tracery.RuleSelector";
com_watabou_tracery_RuleSelector.prototype = {
	/** Select a single rule at random from the default rules list. */
	select: function() {
		var rules = this.ruleSet.defaultRules;
		// Use Tracery.rng() to get a random index in [0, rules.length).
		var index = com_watabou_tracery_Tracery.rng() * rules.length | 0;
		return rules[index];
	}
	/** Reset internal state. No-op for the basic selector since it has no state. */
	,clearState: function() {
	}
	,__class__: com_watabou_tracery_RuleSelector
};


// ─────────────────────────────────────────────────────────────────────────────
// DeckRuleSelector
// ─────────────────────────────────────────────────────────────────────────────
// Deck-based rule selection: shuffles all rules into a "deck", then draws them
// one at a time without replacement. When the deck is exhausted it is rebuilt
// from the original rule list and reshuffled.
//
// This ensures every rule in the set is used before any repeat, which is
// useful for things like one-time-use flavour text or sequential events.
//
// Constructor: DeckRuleSelector(ruleSet)
//   @param {RuleSet} ruleSet — the RuleSet this selector picks rules from.
//
// Inherits from RuleSelector.
// ─────────────────────────────────────────────────────────────────────────────

var com_watabou_tracery_DeckRuleSelector = function(ruleSet) {
	// Call the parent constructor to set up the ruleSet back-reference.
	com_watabou_tracery_RuleSelector.call(this,ruleSet);
};
$hxClasses["com.watabou.tracery.DeckRuleSelector"] = com_watabou_tracery_DeckRuleSelector;
com_watabou_tracery_DeckRuleSelector.__name__ = "com.watabou.tracery.DeckRuleSelector";
// Set up prototype chain for inheritance from RuleSelector.
com_watabou_tracery_DeckRuleSelector.__super__ = com_watabou_tracery_RuleSelector;
com_watabou_tracery_DeckRuleSelector.prototype = $extend(com_watabou_tracery_RuleSelector.prototype,{
	/**
	 * Draw a random rule from the deck. If the deck is empty, rebuild it first
	 * from the original default rules (effectively reshuffling).
	 */
	select: function() {
		// If we've exhausted the deck, reshuffle all rules back in.
		if(this.deck.length == 0) {
			this.clearState();
		}
		// Pick a random index from the remaining cards in the deck.
		var index = com_watabou_tracery_Tracery.rng() * this.deck.length | 0;
		var rule = this.deck[index];
		// Remove the drawn card from the deck so it won't be picked again
		// until the next reshuffle.
		this.deck.splice(index,1);
		return rule;
	}
	/**
	 * Reset the deck to a fresh copy of all default rules.
	 * Uses slice() to create a shallow copy so the original array is untouched.
	 */
	,clearState: function() {
		this.deck = this.ruleSet.defaultRules.slice();
	}
	,__class__: com_watabou_tracery_DeckRuleSelector
});


// ─────────────────────────────────────────────────────────────────────────────
// Symbol
// ─────────────────────────────────────────────────────────────────────────────
// A grammar symbol (non-terminal) identified by a string key. Each symbol has
// a stack of RuleSets: the base rules are always at the bottom, and additional
// RuleSets can be pushed/popped at runtime (e.g. by actions in the grammar).
//
// When selectRule() is called, it delegates to the topmost RuleSet on the
// stack. If the stack is empty (should never happen with proper usage), it
// returns an error marker like "((key))".
//
// Constructor: Symbol(grammar, key, rules)
//   @param {Grammar} grammar — the owning grammar.
//   @param {string}  key     — the symbol's name (used in #key# references).
//   @param {RuleSet} rules   — the base RuleSet for this symbol.
// ─────────────────────────────────────────────────────────────────────────────

var com_watabou_tracery_Symbol = function(grammar,key,rules) {
	this.grammar = grammar;
	this.key = key;
	this.baseRules = rules;
	this.clearState();
};
$hxClasses["com.watabou.tracery.Symbol"] = com_watabou_tracery_Symbol;
com_watabou_tracery_Symbol.__name__ = "com.watabou.tracery.Symbol";
com_watabou_tracery_Symbol.prototype = {
	/**
	 * Reset the rule stack to contain only the base rules.
	 * Also clears the state of the base RuleSet's selector.
	 */
	clearState: function() {
		this.stack = [this.baseRules];
		this.baseRules.clearState();
	}
	/**
	 * Push a new set of raw rule strings onto the stack.
	 * The raw strings are wrapped in a new RuleSet before pushing.
	 *
	 * @param {string[]} rawRules — array of rule strings to push.
	 */
	,pushRules: function(rawRules) {
		this.pushRuleSet(new com_watabou_tracery_RuleSet(this.grammar,rawRules));
	}
	/**
	 * Push a pre-built RuleSet onto the stack.
	 *
	 * @param {RuleSet} rules — the RuleSet to push.
	 */
	,pushRuleSet: function(rules) {
		this.stack.push(rules);
	}
	/**
	 * Pop the topmost RuleSet off the stack. The base rules can never be
	 * popped (the stack always has at least one entry after clearState()).
	 */
	,popRules: function() {
		this.stack.pop();
	}
	/**
	 * Select a rule from the topmost RuleSet on the stack.
	 *
	 * @returns {string} A rule string, or "((key))" if the stack is empty.
	 */
	,selectRule: function() {
		if(this.stack.length == 0) {
			haxe_Log.trace("The rule stack for " + this.key + " is empty, too many pops?",{ fileName : "com/watabou/tracery/Symbol.hx", lineNumber : 37, className : "com.watabou.tracery.Symbol", methodName : "selectRule"});
			return "((" + this.key + "))";
		}
		return this.top().selectRule();
	}
	/**
	 * Return the topmost RuleSet on the stack without popping it.
	 *
	 * @returns {RuleSet} The current active RuleSet.
	 */
	,top: function() {
		return this.stack[this.stack.length - 1];
	}
	/**
	 * Serialize the symbol's rules to JSON. Currently returns null (stub).
	 *
	 * @returns {string} JSON string of the rules.
	 */
	,rulesToJSON: function() {
		return JSON.stringify(null);
	}
	,__class__: com_watabou_tracery_Symbol
};


// ─────────────────────────────────────────────────────────────────────────────
// ExtSymbol (External Symbol)
// ─────────────────────────────────────────────────────────────────────────────
// A symbol that generates its rule text dynamically via a callback function,
// rather than selecting from a static list of rules. This is useful for
// computed values like the current room name, random numbers, or any value
// that should be determined at expansion time.
//
// The generator function is called in place of selectRule() and should return
// a string.
//
// Constructor: ExtSymbol(grammar, key, generator)
//   @param {Grammar}  grammar   — the owning grammar.
//   @param {string}   key       — the symbol's name.
//   @param {Function} generator — a function() that returns a rule string.
//
// Inherits from Symbol.
// ─────────────────────────────────────────────────────────────────────────────

var com_watabou_tracery_ExtSymbol = function(grammar,key,generator) {
	// Initialize the parent Symbol with an empty RuleSet (unused since we
	// override selectRule).
	com_watabou_tracery_Symbol.call(this,grammar,key,new com_watabou_tracery_RuleSet(grammar,[]));
	this.generator = generator;
};
$hxClasses["com.watabou.tracery.ExtSymbol"] = com_watabou_tracery_ExtSymbol;
com_watabou_tracery_ExtSymbol.__name__ = "com.watabou.tracery.ExtSymbol";
com_watabou_tracery_ExtSymbol.__super__ = com_watabou_tracery_Symbol;
com_watabou_tracery_ExtSymbol.prototype = $extend(com_watabou_tracery_Symbol.prototype,{
	/**
	 * Override selectRule: instead of picking from a RuleSet, invoke the
	 * external generator function and return its result.
	 *
	 * @returns {string} The dynamically generated rule text.
	 */
	selectRule: function() {
		return this.generator();
	}
	,__class__: com_watabou_tracery_ExtSymbol
});


// ─────────────────────────────────────────────────────────────────────────────
// Grammar
// ─────────────────────────────────────────────────────────────────────────────
// The top-level grammar object. Owns:
//   - symbols:     a map of Symbol objects keyed by name.
//   - modifiers:   a map of modifier functions (e.g. capitalize, s, a).
//   - subgrammars: an array of fallback grammars searched when a symbol is not
//                  found in this grammar.
//   - flags:       an array of active flag strings, used by conditional rules
//                  (e.g. "flagName?-rule" only applies when flagName is set).
//   - defaultSelector: the RuleSelector class used by new RuleSets (default:
//                  RuleSelector, can be changed to DeckRuleSelector etc.).
//
// Constructor: Grammar(raw)
//   @param {Object} raw — a plain object mapping symbol names (strings) to
//                         arrays of rule strings, or a single rule string.
//
// Usage:
//   var g = new Grammar({ name: ["Alice","Bob"], weapon: ["sword","axe"] });
//   g.flatten("#name# wields a #weapon#");
//   // => "Alice wields a sword" (random)
// ─────────────────────────────────────────────────────────────────────────────

var com_watabou_tracery_Grammar = function(raw) {
	// Auto-incrementing ID for generating unique keys for inline choices.
	this.autoID = 0;
	// The default RuleSelector class to use when creating new RuleSets.
	this.defaultSelector = com_watabou_tracery_RuleSelector;
	// Map of modifier name -> modifier function.
	this.modifiers = new haxe_ds_StringMap();
	// Active flags used for conditional rule selection.
	this.flags = [];
	// Load the initial symbols from the raw definition object.
	this.loadFromRawObj(raw);
};
$hxClasses["com.watabou.tracery.Grammar"] = com_watabou_tracery_Grammar;
com_watabou_tracery_Grammar.__name__ = "com.watabou.tracery.Grammar";
com_watabou_tracery_Grammar.prototype = {
	/**
	 * Reset all symbols and clear all flags. Each symbol's rule stack is
	 * reset to its base rules, effectively undoing any runtime push/pop
	 * modifications.
	 */
	clearState: function() {
		// Iterate over all symbols and clear each one's state.
		var h = this.symbols.h;
		var symbol_h = h;
		var symbol_keys = Object.keys(h);
		var symbol_length = symbol_keys.length;
		var symbol_current = 0;
		while(symbol_current < symbol_length) {
			var symbol = symbol_h[symbol_keys[symbol_current++]];
			symbol.clearState();
		}
		// Clear all active flags.
		this.flags = [];
	}
	/**
	 * Merge a map of modifier functions into this grammar's modifiers.
	 *
	 * @param {Object} mods — a StringMap (or plain object) of name -> function.
	 */
	,addModifiers: function(mods) {
		var h = mods.h;
		var key_h = h;
		var key_keys = Object.keys(h);
		var key_length = key_keys.length;
		var key_current = 0;
		while(key_current < key_length) {
			var key = key_keys[key_current++];
			var v = mods.h[key];
			this.modifiers.h[key] = v;
		}
	}
	/**
	 * Load symbols from a raw plain-object definition. Each key becomes a
	 * symbol name; each value (string or array of strings) becomes its rules.
	 *
	 * @param {Object} raw — the raw grammar definition object, or null.
	 */
	,loadFromRawObj: function(raw) {
		this.raw = raw;
		this.symbols = new haxe_ds_StringMap();
		this.subgrammars = [];
		if(raw != null) {
			// Iterate over every key in the raw object.
			var _g = 0;
			var _g1 = Reflect.fields(raw);
			while(_g < _g1.length) {
				var key = _g1[_g];
				++_g;
				// Get the value for this key. If it's a string, wrap it in an array.
				var values = Reflect.field(raw,key);
				var rules = typeof(values) == "string" ? [values] : values;
				if(rules == null) {
					haxe_Log.trace(raw,{ fileName : "com/watabou/tracery/Grammar.hx", lineNumber : 51, className : "com.watabou.tracery.Grammar", methodName : "loadFromRawObj"});
					haxe_Log.trace(key,{ fileName : "com/watabou/tracery/Grammar.hx", lineNumber : 52, className : "com/watabou.tracery.Grammar", methodName : "loadFromRawObj"});
				}
				// Create a new Symbol with a RuleSet built from the raw rules.
				var this1 = this.symbols;
				var v = new com_watabou_tracery_Symbol(this,key,new com_watabou_tracery_RuleSet(this,rules));
				this1.h[key] = v;
			}
		}
	}
	/**
	 * Create a root TraceryNode for expanding a rule string.
	 * Type -1 means "expand me" (the node will figure out its children).
	 *
	 * @param {string} rule — the raw rule string to start expanding.
	 * @returns {TraceryNode} The root node of the parse tree.
	 */
	,createRoot: function(rule) {
		return new com_watabou_tracery_TraceryNode(this,null,0,{ type : -1, raw : rule});
	}
	/**
	 * Expand a rule string into a fully resolved TraceryNode tree.
	 *
	 * @param {string}  rule              — the rule string to expand.
	 * @param {boolean} [allowEscapeChars=false] — if true, keep backslash escapes
	 *                   in the output; if false, strip them.
	 * @returns {TraceryNode} The expanded root node (use .finishedText for output).
	 */
	,expand: function(rule,allowEscapeChars) {
		if(allowEscapeChars == null) {
			allowEscapeChars = false;
		}
		var root = this.createRoot(rule);
		root.expand();
		if(!allowEscapeChars) {
			root.clearEscapeChars();
		}
		return root;
	}
	/**
	 * Expand a rule string and return only the finished text as a string.
	 * This is the most common way to generate text from a grammar.
	 *
	 * @param {string}  rule              — the rule string to expand.
	 * @param {boolean} [allowEscapeChars=false] — if true, keep escape chars.
	 * @returns {string} The fully expanded text.
	 */
	,flatten: function(rule,allowEscapeChars) {
		if(allowEscapeChars == null) {
			allowEscapeChars = false;
		}
		return this.expand(rule,allowEscapeChars).finishedText;
	}
	/**
	 * Execute a grammar function command. Currently supports:
	 *   - "set FLAG"    — adds FLAG to the active flags list.
	 *   - "clear FLAG"  — adds FLAG to the active flags list (note: this appears
	 *                      to be a bug in the original; it should remove the flag).
	 *
	 * @param {string} f — the function string, e.g. "set darkMode".
	 */
	,execute: function(f) {
		// "set FLAG" — enable a flag for conditional rule selection.
		if(HxOverrides.substr(f,0,"set ".length) == "set ") {
			var flag = HxOverrides.substr(f,"set ".length,null);
			if(this.flags.indexOf(flag) == -1) {
				this.flags.push(flag);
			}
		// "clear FLAG" — supposed to disable a flag (but currently adds it).
		} else if(HxOverrides.substr(f,0,"clear ".length) == "clear ") {
			var flag = HxOverrides.substr(f,"clear ".length,null);
			if(this.flags.indexOf(flag) == -1) {
				this.flags.push(flag);
			}
		} else {
			haxe_Log.trace("Unknown function \"" + f + "\" is called",{ fileName : "com/watabou/tracery/Grammar.hx", lineNumber : 85, className : "com.watabou.tracery.Grammar", methodName : "execute"});
		}
	}
	/**
	 * Serialize the entire grammar to a JSON string. Each symbol becomes a
	 * key with its rules as the value.
	 *
	 * @returns {string} A JSON-formatted string representation of the grammar.
	 */
	,toJSON: function() {
		var symbolJSON = [];
		var h = this.symbols.h;
		var key_h = h;
		var key_keys = Object.keys(h);
		var key_length = key_keys.length;
		var key_current = 0;
		while(key_current < key_length) {
			var key = key_keys[key_current++];
			symbolJSON.push("\"" + key + "\": " + this.symbols.h[key].rulesToJSON());
		}
		return "{\n" + symbolJSON.join(",\n") + "\n}";
	}
	/**
	 * Push new rules onto a symbol. If the symbol doesn't exist yet, it is
	 * created. This allows runtime modification of grammar symbols (e.g. by
	 * NodeAction).
	 *
	 * @param {string}   key      — the symbol name.
	 * @param {string[]} rawRules — array of rule strings to push.
	 */
	,pushRules: function(key,rawRules) {
		if(Object.prototype.hasOwnProperty.call(this.symbols.h,key)) {
			this.symbols.h[key].pushRules(rawRules);
		} else {
			// Symbol doesn't exist yet — create it with these rules.
			var this1 = this.symbols;
			var v = new com_watabou_tracery_Symbol(this,key,new com_watabou_tracery_RuleSet(this,rawRules));
			this1.h[key] = v;
		}
	}
	/**
	 * Push a pre-built RuleSet onto a symbol. If the symbol doesn't exist,
	 * it is created.
	 *
	 * @param {string}  key   — the symbol name.
	 * @param {RuleSet} rules — the RuleSet to push.
	 */
	,pushRuleSet: function(key,rules) {
		if(Object.prototype.hasOwnProperty.call(this.symbols.h,key)) {
			this.symbols.h[key].pushRuleSet(rules);
		} else {
			var this1 = this.symbols;
			var v = new com_watabou_tracery_Symbol(this,key,rules);
			this1.h[key] = v;
		}
	}
	/**
	 * Pop the topmost RuleSet from a symbol's stack.
	 *
	 * @param {string} key — the symbol name.
	 */
	,popRules: function(key) {
		if(Object.prototype.hasOwnProperty.call(this.symbols.h,key)) {
			this.symbols.h[key].popRules();
		} else {
			haxe_Log.trace("Can't pop: no symbol for key " + key,{ fileName : "com/watabou/tracery/Grammar.hx", lineNumber : 114, className : "com/watabou.tracery.Grammar", methodName : "popRules"});
		}
	}
	/**
	 * Generate a unique key name and push rules under it. Used internally
	 * for inline choices like {a|b|c} — each choice set gets its own
	 * auto-generated symbol.
	 *
	 * @param {string[]} rules — the rules to register.
	 * @returns {string} The auto-generated key name (e.g. "_auto0", "_auto1", ...).
	 */
	,addAutoRules: function(rules) {
		var key = "_auto" + this.autoID++;
		this.pushRules(key,rules);
		return key;
	}
	/**
	 * "Fix" a symbol by expanding its own rules and then re-registering the
	 * result as a single static rule. Useful for resolving recursive references.
	 *
	 * @param {string} key — the symbol name to fix.
	 * @returns {string} The resolved value.
	 */
	,fix: function(key) {
		var value = this.flatten("#" + key + "#");
		this.pushRules(key,[value]);
		return value;
	}
	/**
	 * Select a rule for the given symbol key. Before selecting from the
	 * symbol itself, checks all active flags for conditional overrides
	 * (symbols named "FLAG?-key"). Falls back to subgrammars if the symbol
	 * is not found here.
	 *
	 * @param {string} key — the symbol name to select a rule for.
	 * @returns {string} The selected rule string, or "((key))" if no symbol found.
	 */
	,selectRule: function(key) {
		// Start with the primary symbol for this key.
		var symbol = this.symbols.h[key];
		// Check if any active flag provides an override for this symbol.
		// Override symbols are named "FLAG?-key" where FLAG is an active flag.
		var _g = 0;
		var _g1 = this.flags;
		while(_g < _g1.length) {
			var flag = _g1[_g];
			++_g;
			var sym = this.symbols.h["" + flag + "?-" + key];
			if(sym != null) {
				symbol = sym;
				break;
			}
		}
		// If we found a matching symbol, select a rule from it.
		if(symbol != null) {
			var rule = symbol.selectRule();
			if(rule != null) {
				return rule;
			}
		}
		// Fall back to subgrammars if the symbol wasn't found here.
		var _g = 0;
		var _g1 = this.subgrammars;
		while(_g < _g1.length) {
			var sub = _g1[_g];
			++_g;
			if(Object.prototype.hasOwnProperty.call(sub.symbols.h,key)) {
				return sub.symbols.h[key].selectRule();
			}
		}
		// No symbol found anywhere — return an error marker.
		haxe_Log.trace("No symbol for \"" + key + "\"",{ fileName : "com/watabou/tracery/Grammar.hx", lineNumber : 149, className : "com/watabou.tracery.Grammar", methodName : "selectRule"});
		return "((" + key + "))";
	}
	/**
	 * Validate a rule string. Supports conditional rules using the syntax:
	 *   "CONDITION?-ruleText"
	 *
	 * If CONDITION is a number, it's treated as a probability (0.0–1.0) and
	 * the rule is kept if a random roll is below the threshold.
	 *
	 * If CONDITION is a flag expression, it's evaluated with eval() — supports
	 * "&" (AND) and "!" (NOT) operators.
	 *
	 * @param {string} rule — the rule string to validate.
	 * @returns {string|null} The rule text if valid, or null if the condition fails.
	 */
	,validateRule: function(rule) {
		var i = rule.indexOf("?-");
		if(i == -1) {
			// No conditional — rule is always valid.
			return rule;
		} else {
			// Extract the condition part (before "?-").
			var cond = HxOverrides.substr(rule,0,i);
			var chance = parseFloat(cond);
			var valid;
			if(isNaN(chance)) {
				// Condition is a flag expression — evaluate it.
				valid = this.eval(cond);
			} else {
				// Condition is a probability threshold — roll against it.
				var chance1 = chance;
				if(chance1 == null) {
					chance1 = 0.5;
				}
				// Deterministic RNG: seed * 48271 mod 2^31, normalized to [0,1).
				valid = (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 < chance1;
			}
			if(valid) {
				// Condition passed — return the rule text after "?-".
				return HxOverrides.substr(rule,i + "?-".length,null);
			} else {
				// Condition failed — skip this rule.
				return null;
			}
		}
	}
	/**
	 * Evaluate a flag condition expression. Supports:
	 *   - Simple flag names: "darkMode" → true if darkMode is in flags.
	 *   - Negation: "!darkMode" → true if darkMode is NOT in flags.
	 *   - AND chains: "darkMode&hasKey" → true if both are set.
	 *
	 * @param {string} cond — the condition expression.
	 * @returns {boolean} Whether the condition is satisfied.
	 */
	,'eval': function(cond) {
		// Split on "&" to handle AND-ed conditions.
		var ands = cond.split("&");
		if(ands.length > 1) {
			// All AND conditions must be true.
			var _g = 0;
			while(_g < ands.length) {
				var and = ands[_g];
				++_g;
				if(!this.eval(and)) {
					return false;
				}
			}
			return true;
		}
		// Check for negation prefix "!".
		var not = cond.charAt(0) == "!";
		var flag = not ? HxOverrides.substr(cond,1,null) : cond;
		// Evaluate: true if flag is present XOR negation is active.
		var value = this.flags.indexOf(flag) != -1 != not;
		return value;
	}
	/**
	 * Register an external (dynamic) symbol backed by a generator function.
	 * The function is called each time the symbol needs a rule.
	 *
	 * @param {string}   key       — the symbol name.
	 * @param {Function} generator — a function() returning a rule string.
	 */
	,addExternal: function(key,generator) {
		var this1 = this.symbols;
		var v = new com_watabou_tracery_ExtSymbol(this,key,generator);
		this1.h[key] = v;
	}
	/**
	 * Manually set a flag in the active flags list.
	 *
	 * @param {string} flag — the flag name to enable.
	 */
	,setFlag: function(flag) {
		if(this.flags.indexOf(flag) == -1) {
			this.flags.push(flag);
		}
	}
	/**
	 * Remove a flag from the active flags list.
	 *
	 * @param {string} flag — the flag name to disable.
	 */
	,clearFlag: function(flag) {
		HxOverrides.remove(this.flags,flag);
	}
	/**
	 * Clear all active flags at once.
	 */
	,clearFlags: function() {
		this.flags = [];
	}
	,__class__: com_watabou_tracery_Grammar
};


// ─────────────────────────────────────────────────────────────────────────────
// ModsEngBasic — English Text Modifiers
// ─────────────────────────────────────────────────────────────────────────────
// A static utility class providing English-language text modifiers that can
// be applied to expanded symbol text via dot notation (e.g. #name.s.capitalize#).
//
// Modifiers are functions with the signature:
//   function(str, params) → string
//
// where `str` is the text to transform and `params` is an array of extra
// parameters from the modifier call (e.g. "replace(old,new)" → params = ["old","new"]).
//
// Available modifiers:
//   capitalize      — uppercase first character ("hello" → "Hello")
//   capitalizeAll   — uppercase first char of each word ("hello world" → "Hello World")
//   caps            — uppercase entire string ("hello" → "HELLO")
//   a               — prepend "a " or "an " ("apple" → "an apple", "cat" → "a cat")
//   s               — pluralize ("cat" → "cats", "box" → "boxes")
//   firstS          — pluralize only the first word of a phrase
//   possessive      — add possessive ('s or just ')
//   ed              — past tense ("walk" → "walked", "cry" → "cried")
//   ing             — present participle ("run" → "running", "make" → "making")
//   this            — "this" or "these" depending on plurality
//   they            — "it" or "they" depending on plurality
//   them            — "it" or "them" depending on plurality
//   is              — "is" or "are" depending on plurality
//   was             — "was" or "were" depending on plurality
//   replace(a, b)   — global find-and-replace of substring a with b
//
// Static helper methods:
//   isVowel(c)      — true if c is a, e, i, o, or u
//   isAlphaNum(c)   — true if c is a letter or digit
//   isPlural(str)   — heuristically determines if a word is plural (ends in s, not ss)
//   escapeRegExp(s) — escapes regex special characters in a string
//   nonCountable(w) — registers a word as uncountable (its plural is itself)
//   get()           — returns a StringMap of all modifier functions by name
// ─────────────────────────────────────────────────────────────────────────────

var com_watabou_tracery_ModsEngBasic = function() { };
$hxClasses["com.watabou.tracery.ModsEngBasic"] = com_watabou_tracery_ModsEngBasic;
com_watabou_tracery_ModsEngBasic.__name__ = "com.watabou.tracery.ModsEngBasic";

/**
 * Check if a character is a vowel (a, e, i, o, u).
 * Case-insensitive.
 *
 * @param {string} c — a single character.
 * @returns {boolean} True if c is a vowel.
 */
com_watabou_tracery_ModsEngBasic.isVowel = function(c) {
	return "ieaou".indexOf(c.toLowerCase()) != -1;
};

/**
 * Check if a character is alphanumeric (a-z, A-Z, or 0-9).
 *
 * @param {string} c — a single character.
 * @returns {boolean} True if c is a letter or digit.
 */
com_watabou_tracery_ModsEngBasic.isAlphaNum = function(c) {
	if(!(c >= "a" && c <= "z" || c >= "A" && c <= "Z")) {
		if(c >= "0") {
			return c <= "9";
		} else {
			return false;
		}
	} else {
		return true;
	}
};

/**
 * Heuristically determine if a word is plural by checking if it ends in "s"
 * but not "ss". Simple but effective for most English nouns.
 *
 * @param {string} str — the word to check (lowercased internally).
 * @returns {boolean} True if the word appears to be plural.
 */
com_watabou_tracery_ModsEngBasic.isPlural = function(str) {
	str = str.toLowerCase();
	if(HxOverrides.substr(str,-1,null) == "s") {
		return HxOverrides.substr(str,-2,null) != "ss";
	} else {
		return false;
	}
};

/**
 * Escape all regex special characters in a string so it can be used as a
 * literal pattern in a RegExp.
 *
 * @param {string} str — the string to escape.
 * @returns {string} The escaped string safe for use in RegExp.
 */
com_watabou_tracery_ModsEngBasic.escapeRegExp = function(str) {
	var _this_r = new RegExp("([.*+?^=!:${}()|\\[\\]/\\\\])","g".split("u").join(""));
	return str.replace(_this_r,"\\$1");
};

/**
 * Replace all occurrences of params[0] with params[1] in the input string.
 * Uses a case-sensitive global regex for replacement.
 *
 * @param {string} str    — the input string.
 * @param {string[]} params — [find, replace] — the substring to find and its replacement.
 * @returns {string} The string with all occurrences replaced.
 */
com_watabou_tracery_ModsEngBasic.replace = function(str,params) {
	var _this_r = new RegExp(com_watabou_tracery_ModsEngBasic.escapeRegExp(params[0]),"g".split("u").join(""));
	return str.replace(_this_r,params[1]);
};

/**
 * Capitalize the first letter of every word in the string.
 * Words are delimited by non-alphanumeric characters (and apostrophes).
 *
 * @param {string} str    — the input string.
 * @param {string[]} params — unused.
 * @returns {string} The string with each word capitalized.
 */
com_watabou_tracery_ModsEngBasic.capitalizeAll = function(str,params) {
	var result = "";
	var capNext = true;
	var _g = 0;
	var _g1 = str.length;
	while(_g < _g1) {
		var i = _g++;
		var ch = str.charAt(i);
		// Non-alphanumeric chars (except apostrophe) trigger word boundary.
		if(!com_watabou_tracery_ModsEngBasic.isAlphaNum(ch) && ch != "'") {
			capNext = true;
			result += ch;
		} else if(!capNext) {
			// Not at word start — keep lowercase.
			result += ch;
		} else {
			// At word start — uppercase.
			result += ch.toUpperCase();
			capNext = false;
		}
	}
	return result;
};

/**
 * Capitalize only the first character of the entire string.
 *
 * @param {string} str    — the input string.
 * @param {string[]} params — unused.
 * @returns {string} The string with the first character uppercased.
 */
com_watabou_tracery_ModsEngBasic.capitalize = function(str,params) {
	return str.charAt(0).toUpperCase() + HxOverrides.substr(str,1,null);
};

/**
 * Convert the entire string to uppercase.
 *
 * @param {string} str    — the input string.
 * @param {string[]} params — unused.
 * @returns {string} The uppercased string.
 */
com_watabou_tracery_ModsEngBasic.caps = function(str,params) {
	return str.toUpperCase();
};

/**
 * Prepend "a " or "an " to the string based on English article rules.
 * Handles the special case of "u" words (e.g. "unicorn" gets "a", but
 * "umbrella" gets "an") and words starting with vowels.
 *
 * @param {string} str    — the noun phrase.
 * @param {string[]} params — unused.
 * @returns {string} The noun phrase with the correct article prepended.
 */
com_watabou_tracery_ModsEngBasic.a = function(str,params) {
	if(str.length > 0) {
		// Special case: words starting with "u" followed by a consonant sound.
		// "unicorn" → "a unicorn" (starts with "yoo" sound), but
		// "umbrella" → "an umbrella" (starts with "uh" sound).
		// Heuristic: if the 3rd char is "i", treat as consonant-sound "u".
		if(str.charAt(0).toLowerCase() == "u") {
			if(str.length > 2) {
				if(str.charAt(2).toLowerCase() == "i") {
					return "a " + str;
				}
			}
		}
		// Standard vowel check: "a" for consonant starts, "an" for vowel starts.
		if(com_watabou_tracery_ModsEngBasic.isVowel(str.charAt(0))) {
			return "an " + str;
		}
	}
	return "a " + str;
};

/**
 * Pluralize only the first word of a multi-word phrase. Useful for phrases
 * like "a red sword" → "some red swords" (though this only handles the
 * suffix, not article changes).
 *
 * @param {string} str    — the input phrase.
 * @param {string[]} params — unused.
 * @returns {string} The phrase with the first word pluralized.
 */
com_watabou_tracery_ModsEngBasic.firstS = function(str,params) {
	var words = str.split(" ");
	if(words.length == 1) {
		return com_watabou_tracery_ModsEngBasic.s(words[0],null);
	} else {
		return com_watabou_tracery_ModsEngBasic.s(words[0],null) + " " + words.slice(1).join(" ");
	}
};

/**
 * Pluralize a word using common English rules:
 *   1. Check the plurals dictionary first (for irregular/custom plurals).
 *   2. Words ending in s, x, z → add "es" (e.g. "box" → "boxes").
 *   3. Words ending in y after a consonant → change to "ies" (e.g. "city" → "cities").
 *   4. Words ending in ch or sh → add "es" (e.g. "brush" → "brushes").
 *   5. Everything else → add "s".
 *
 * @param {string} str    — the word to pluralize.
 * @param {string[]} params — unused.
 * @returns {string} The pluralized word.
 */
com_watabou_tracery_ModsEngBasic.s = function(str,params) {
	// Check the plurals dictionary for irregular/custom forms.
	var h = com_watabou_tracery_ModsEngBasic.plurals.h;
	var _g_h = h;
	var _g_keys = Object.keys(h);
	var _g_length = _g_keys.length;
	var _g_current = 0;
	while(_g_current < _g_length) {
		var key = _g_keys[_g_current++];
		var _g1_key = key;
		var _g1_value = _g_h[key];
		var word = _g1_key;
		var plural = _g1_value;
		if(HxOverrides.substr(str,-word.length,null) == word) {
			return HxOverrides.substr(str,0,str.length - word.length) + plural;
		}
	}
	// Words ending in s, x, or z: add "es".
	var c = HxOverrides.substr(str,-1,null);
	if(c == "s" || c == "x" || c == "z") {
		return str + "es";
	}
	// Words ending in "y" after a consonant: replace "y" with "ies".
	if(c == "y" && "ieaou".indexOf(HxOverrides.substr(str,-2,1)) == -1) {
		return HxOverrides.substr(str,0,-1) + "ies";
	}
	// Words ending in "ch" or "sh": add "es".
	var cc = HxOverrides.substr(str,-2,null);
	if(cc == "ch" || cc == "sh") {
		return str + "es";
	}
	// Default: just add "s".
	return str + "s";
};

/**
 * Add a possessive suffix: "'s" for most words, just "'" for words ending
 * in "s" (e.g. "boss" → "boss'", "cat" → "cat's").
 *
 * @param {string} str    — the word.
 * @param {string[]} params — unused.
 * @returns {string} The possessive form.
 */
com_watabou_tracery_ModsEngBasic.possessive = function(str,params) {
	if(HxOverrides.substr(str,-1,null) == "s") {
		return str + "'";
	} else {
		return str + "'s";
	}
};

/**
 * Convert a verb to its simple past tense form:
 *   - Ends in e → just add "d" (e.g. "bake" → "baked")
 *   - Ends in h, s, x → add "ed" (e.g. "wash" → "washed")
 *   - Ends in y after a consonant → change to "ied" (e.g. "cry" → "cried")
 *   - Everything else → add "ed" (e.g. "walk" → "walked")
 *
 * @param {string} str    — the verb.
 * @param {string[]} params — unused.
 * @returns {string} The past tense form.
 */
com_watabou_tracery_ModsEngBasic.ed = function(str,params) {
	switch(HxOverrides.substr(str,-1,null)) {
	case "e":
		return str + "d";
	case "h":
		return str + "ed";
	case "s":
		return str + "ed";
	case "x":
		return str + "ed";
	case "y":
		// "y" after a consonant → "ied"; "y" after a vowel → just "d".
		if(!com_watabou_tracery_ModsEngBasic.isVowel(str.charAt(str.length - 2))) {
			return str.substring(0,str.length - 1) + "ied";
		} else {
			return str + "d";
		}
		break;
	default:
		return str + "ed";
	}
};

/**
 * Convert a verb to its present participle (gerund) form.
 *   - Ends in silent "e" → drop the "e" and add "ing" (e.g. "make" → "making")
 *   - Everything else → add "ing" (e.g. "run" → "running")
 *
 * @param {string} str    — the verb.
 * @param {string[]} params — unused.
 * @returns {string} The present participle form.
 */
com_watabou_tracery_ModsEngBasic.ing = function(str,params) {
	if(HxOverrides.substr(str,-1,null) == "e") {
		return str.substring(0,str.length - 1) + "ing";
	} else {
		return str + "ing";
	}
};

/**
 * Return "this" or "these" depending on whether the noun is plural.
 *
 * @param {string} str    — the noun to check.
 * @param {string[]} params — unused.
 * @returns {string} "this" for singular, "these" for plural.
 */
com_watabou_tracery_ModsEngBasic.thiss = function(str,params) {
	if(com_watabou_tracery_ModsEngBasic.isPlural(str)) {
		return "these";
	} else {
		return "this";
	}
};

/**
 * Return "it" or "they" depending on whether the noun is plural.
 *
 * @param {string} str    — the noun to check.
 * @param {string[]} params — unused.
 * @returns {string} "it" for singular, "they" for plural.
 */
com_watabou_tracery_ModsEngBasic.they = function(str,params) {
	if(com_watabou_tracery_ModsEngBasic.isPlural(str)) {
		return "they";
	} else {
		return "it";
	}
};

/**
 * Return "it" or "them" depending on whether the noun is plural.
 *
 * @param {string} str    — the noun to check.
 * @param {string[]} params — unused.
 * @returns {string} "it" for singular, "them" for plural.
 */
com_watabou_tracery_ModsEngBasic.them = function(str,params) {
	if(com_watabou_tracery_ModsEngBasic.isPlural(str)) {
		return "them";
	} else {
		return "it";
	}
};

/**
 * Return "is" or "are" depending on whether the noun is plural.
 *
 * @param {string} str    — the noun to check.
 * @param {string[]} params — unused.
 * @returns {string} "is" for singular, "are" for plural.
 */
com_watabou_tracery_ModsEngBasic.is = function(str,params) {
	if(com_watabou_tracery_ModsEngBasic.isPlural(str)) {
		return "are";
	} else {
		return "is";
	}
};

/**
 * Return "was" or "were" depending on whether the noun is plural.
 *
 * @param {string} str    — the noun to check.
 * @param {string[]} params — unused.
 * @returns {string} "was" for singular, "were" for plural.
 */
com_watabou_tracery_ModsEngBasic.was = function(str,params) {
	if(com_watabou_tracery_ModsEngBasic.isPlural(str)) {
		return "were";
	} else {
		return "was";
	}
};

/**
 * Register a word as uncountable so that its plural form is itself.
 * E.g. nonCountable("sheep") means "sheep".s() returns "sheep".
 *
 * @param {string} word — the word to mark as uncountable.
 */
com_watabou_tracery_ModsEngBasic.nonCountable = function(word) {
	com_watabou_tracery_ModsEngBasic.plurals.h[word] = word;
};

/**
 * Get a StringMap of all available modifier functions keyed by their names.
 * This is used by Grammar.addModifiers() to register the English modifiers.
 *
 * @returns {haxe_ds_StringMap} Map of modifier name → modifier function.
 */
com_watabou_tracery_ModsEngBasic.get = function() {
	var _g = new haxe_ds_StringMap();
	_g.h["replace"] = com_watabou_tracery_ModsEngBasic.replace;
	_g.h["possessive"] = com_watabou_tracery_ModsEngBasic.possessive;
	_g.h["capitalize"] = com_watabou_tracery_ModsEngBasic.capitalize;
	_g.h["capitalizeAll"] = com_watabou_tracery_ModsEngBasic.capitalizeAll;
	_g.h["caps"] = com_watabou_tracery_ModsEngBasic.caps;
	_g.h["firstS"] = com_watabou_tracery_ModsEngBasic.firstS;
	_g.h["s"] = com_watabou_tracery_ModsEngBasic.s;
	_g.h["a"] = com_watabou_tracery_ModsEngBasic.a;
	_g.h["ed"] = com_watabou_tracery_ModsEngBasic.ed;
	_g.h["ing"] = com_watabou_tracery_ModsEngBasic.ing;
	_g.h["this"] = com_watabou_tracery_ModsEngBasic.thiss;
	_g.h["they"] = com_watabou_tracery_ModsEngBasic.they;
	_g.h["them"] = com_watabou_tracery_ModsEngBasic.them;
	_g.h["is"] = com_watabou_tracery_ModsEngBasic.is;
	_g.h["was"] = com_watabou_tracery_ModsEngBasic.was;
	return _g;
};


// ─────────────────────────────────────────────────────────────────────────────
// NodeAction
// ─────────────────────────────────────────────────────────────────────────────
// Represents a grammar action parsed from the [target:rule] syntax within
// rule strings. Actions modify the grammar at expansion time.
//
// Three action types (determined by what follows the colon in the raw string):
//   Type 0 — PUSH:    "[target:rule]" — push "rule" onto the symbol "target".
//   Type 1 — POP:     "[target:POP]"  — pop the top rule set from "target".
//   Type 2 — EXECUTE: "[target]"      — execute "target" as a grammar function
//                                        (e.g. "set flagName" or "clear flagName").
//
// Constructor: NodeAction(node, raw)
//   @param {TraceryNode} node — the owning TraceryNode.
//   @param {string}      raw  — the raw action string (e.g. "weapon:sword" or "POP").
// ─────────────────────────────────────────────────────────────────────────────

var com_watabou_tracery_NodeAction = function(node,raw) {
	this.node = node;
	// Split on ":" to separate target from rule.
	var sections = raw.split(":");
	this.target = sections[0];
	if(sections.length == 1) {
		// No colon found — this is a function call (type 2).
		this.type = 2;
	} else {
		this.rule = sections[1];
		// If the rule is exactly "POP", this is a pop action (type 1).
		// Otherwise, it's a push action (type 0).
		this.type = this.rule == "POP" ? 1 : 0;
	}
};
$hxClasses["com.watabou.tracery.NodeAction"] = com_watabou_tracery_NodeAction;
com_watabou_tracery_NodeAction.__name__ = "com.watabou.tracery.NodeAction";
com_watabou_tracery_NodeAction.prototype = {
	/**
	 * Create an undo action for push operations. Push actions are undone by
	 * popping the same target symbol. Returns null for non-push actions.
	 *
	 * @returns {NodeAction|null} An undo action, or null if not applicable.
	 */
	createUndo: function() {
		if(this.type == 0) {
			return new com_watabou_tracery_NodeAction(this.node,this.target + ":POP");
		}
		return null;
	}
	/**
	 * Activate this action, modifying the grammar accordingly:
	 *   Type 0 (PUSH):  Parse the rule into comma-separated sections, expand each,
	 *                   then push the results onto the target symbol.
	 *   Type 1 (POP):   Pop the top rule set from the target symbol.
	 *   Type 2 (EXECUTE): Execute the target as a grammar function command.
	 */
	,activate: function() {
		var grammar = this.node.grammar;
		switch(this.type) {
		case 0:
			// PUSH: Split the rule on commas, expand each section, then push
			// the resulting rules onto the target symbol.
			var ruleSections = this.rule.split(",");
			var finishedRules = [];
			var _g = 0;
			while(_g < ruleSections.length) {
				var section = ruleSections[_g];
				++_g;
				// Expand each rule section into finished text.
				var n = new com_watabou_tracery_TraceryNode(grammar,null,0,{ type : -1, raw : section});
				n.expand();
				finishedRules.push(n.finishedText);
			}
			// Push the expanded rules onto the target symbol.
			grammar.pushRules(this.target,finishedRules);
			break;
		case 1:
			// POP: Remove the topmost rule set from the target symbol.
			grammar.popRules(this.target);
			break;
		case 2:
			// EXECUTE: Run the target string as a grammar function (e.g. "set flag").
			grammar.execute(this.target);
			break;
		}
	}
	/**
	 * Return a human-readable string representation of this action.
	 *
	 * @returns {string} Description of the action (e.g. "weapon:sword" or "function \"setFlag\"").
	 */
	,toString: function() {
		switch(this.type) {
		case 0:
			return "" + this.target + ":" + this.rule;
		case 1:
			return "" + this.target + ":POP";
		case 2:
			return "function \"" + this.target + "\"";
		default:
			return "((Unknown Action))";
		}
	}
	,__class__: com_watabou_tracery_NodeAction
};


// ─────────────────────────────────────────────────────────────────────────────
// RuleSet
// ─────────────────────────────────────────────────────────────────────────────
// An ordered collection of replacement rules for a single Symbol. Handles:
//   - Processing inline choices: "{a|b|c}" is compiled into a reference to
//     an auto-generated symbol containing ["a", "b", "c"] as rules.
//   - Lazy initialization of a RuleSelector on first selectRule() call.
//   - Validation of conditional rules via Grammar.validateRule().
//
// Constructor: RuleSet(grammar, raw)
//   @param {Grammar}    grammar — the owning grammar.
//   @param {string[]}   raw     — array of raw rule strings.
// ─────────────────────────────────────────────────────────────────────────────

var com_watabou_tracery_RuleSet = function(grammar,raw) {
	this.grammar = grammar;
	// Process each raw rule to handle inline choices like {a|b|c}.
	var _g = [];
	var _g1 = 0;
	while(_g1 < raw.length) {
		var rule = raw[_g1];
		++_g1;
		_g.push(this.process(rule));
	}
	// Store the processed rules as both raw and defaultRules.
	this.raw = _g;
	this.defaultRules = this.raw;
};
$hxClasses["com.watabou.tracery.RuleSet"] = com_watabou_tracery_RuleSet;
com_watabou_tracery_RuleSet.__name__ = "com.watabou.tracery.RuleSet";
com_watabou_tracery_RuleSet.prototype = {
	/**
	 * Process a single rule string to compile inline choices.
	 * Finds the first unescaped "{" and matches it with "}", splitting on "|"
	 * at the top level. The choice set is replaced with a reference to an
	 * auto-generated symbol (e.g. "#_auto0#").
	 *
	 * Handles nested braces by tracking depth.
	 *
	 * @param {string} rule — the raw rule string.
	 * @returns {string} The processed rule with inline choices replaced by references.
	 */
	process: function(rule) {
		// Find the first opening brace.
		var start = rule.indexOf("{");
		if(start == -1) {
			return rule;
		}
		var end = -1;
		var depth = 1;
		var choices = [];
		var choiceStart = start + 1;
		// Scan character by character to find the matching closing brace.
		var _g = start + 1;
		var _g1 = rule.length;
		while(_g < _g1) {
			var i = _g++;
			var ch = rule.charAt(i);
			if(ch == "|" && depth == 1) {
				// Top-level pipe: this is a choice separator.
				choices.push(rule.substring(choiceStart,i));
				choiceStart = i + 1;
			} else if(ch == "{") {
				// Nested opening brace — increase depth.
				++depth;
			} else if(ch == "}") {
				// Closing brace — decrease depth.
				if(--depth == 0) {
					// Found the matching close — grab the last choice.
					choices.push(rule.substring(choiceStart,i));
					end = i;
					break;
				}
			}
		}
		if(end != -1) {
			// We found a complete inline choice — compile it.
			var left = HxOverrides.substr(rule,0,start);
			var right = HxOverrides.substr(rule,end + 1,null);
			// Register the choices as an auto-generated symbol.
			// If there's only one choice, also include an empty string as a
			// fallback (so the symbol can produce nothing).
			var subRule = this.grammar.addAutoRules(choices.length == 1 ? [choices[0],""] : choices);
			// Replace the inline choice with a tag reference and process the rest.
			return "" + left + "#" + subRule + "#" + this.process(right);
		} else {
			// Unmatched brace — return the rule unchanged.
			return rule;
		}
	}
	/**
	 * Select a rule from this RuleSet. Lazily initializes a RuleSelector
	 * using the grammar's defaultSelector class. Keeps selecting until a
	 * non-null (valid) rule is found, skipping conditional rules that fail
	 * their conditions.
	 *
	 * @returns {string} A validated rule string.
	 */
	,selectRule: function() {
		// Lazily create the selector on first use.
		if(this.selector == null) {
			this.selector = Type.createInstance(this.grammar.defaultSelector,[this]);
		}
		// Keep trying until we get a valid (non-null) rule.
		// validateRule() returns null for conditional rules whose conditions fail.
		while(true) {
			var rule = this.grammar.validateRule(this.selector.select());
			if(rule != null) {
				return rule;
			}
		}
	}
	/**
	 * Replace the current selector with a new instance of the given class.
	 *
	 * @param {Function} cl — the RuleSelector class to instantiate.
	 */
	,assignSelector: function(cl) {
		this.selector = Type.createInstance(cl,[this]);
	}
	/**
	 * Clear the selector's state (e.g. reshuffle a DeckRuleSelector's deck).
	 */
	,clearState: function() {
		if(this.selector != null) {
			this.selector.clearState();
		}
	}
	,__class__: com_watabou_tracery_RuleSet
};


// ─────────────────────────────────────────────────────────────────────────────
// Tracery — Static Parser
// ─────────────────────────────────────────────────────────────────────────────
// Static utility class providing the core parsing logic for Tracery rule
// strings. Tokenizes a rule into sections:
//
//   Type 0 — Plain text (literal characters).
//   Type 1 — Tag: #symbol.modifier1.modifier2# (expands to resolved text).
//   Type 2 — Action: [target:rule] (modifies the grammar at expansion time).
//
// Also handles backslash escapes (\# to treat "#" as literal text).
//
// Static methods:
//   createGrammar(raw)  — convenience factory for creating a new Grammar.
//   parse(rule)         — tokenize a rule string into an array of sections.
//   parseTag(contents)  — parse the interior of a tag into symbol, modifiers,
//                          and preactions.
// ─────────────────────────────────────────────────────────────────────────────

var com_watabou_tracery_Tracery = function() { };
$hxClasses["com.watabou.tracery.Tracery"] = com_watabou_tracery_Tracery;
com_watabou_tracery_Tracery.__name__ = "com.watabou.tracery.Tracery";

/**
 * Convenience factory method to create a new Grammar from a raw definition.
 *
 * @param {Object} raw — the raw grammar definition (symbol → rules mapping).
 * @returns {Grammar} A new Grammar instance.
 */
com_watabou_tracery_Tracery.createGrammar = function(raw) {
	return new com_watabou_tracery_Grammar(raw);
};

/**
 * Parse the interior contents of a tag (the text between the # delimiters)
 * into its component parts: the symbol name, any modifiers, and any
 * pre-actions (actions that execute before the symbol is expanded).
 *
 * Example: "weapon.s.capitalize" →
 *   { symbol: "weapon", modifiers: ["s", "capitalize"], preactions: [] }
 *
 * Example: "[set darkMode]weapon.s" →
 *   { symbol: "weapon", modifiers: ["s"], preactions: ["set darkMode"] }
 *
 * @param {string} tagContents — the text inside #...# (without the # delimiters).
 * @returns {{ symbol: string|null, preactions: string[], postactions: string[], modifiers: string[] }}
 */
com_watabou_tracery_Tracery.parseTag = function(tagContents) {
	var parsed = { symbol : null, preactions : [], postactions : [], modifiers : []};
	// Use the main parser to tokenize the tag contents.
	var sections = com_watabou_tracery_Tracery.parse(tagContents);
	var symbolSection = null;
	var _g = 0;
	while(_g < sections.length) {
		var section = sections[_g];
		++_g;
		if(section.type == 0) {
			// Plain text section — this is the symbol name (with optional modifiers).
			if(symbolSection == null) {
				symbolSection = section.raw;
			} else {
				// Multiple plain text sections in a tag is an error.
				throw haxe_Exception.thrown("multiple main sections in " + tagContents);
			}
		} else {
			// Action section inside a tag — treat as a pre-action.
			parsed.preactions.push(section.raw);
		}
	}
	if(symbolSection != null) {
		// Split the symbol section on "." to separate symbol from modifiers.
		// E.g. "weapon.s.capitalize" → symbol="weapon", modifiers=["s","capitalize"]
		var components = symbolSection.split(".");
		parsed.symbol = components[0];
		parsed.modifiers = components.slice(1);
	}
	return parsed;
};

/**
 * Tokenize a Tracery rule string into an array of typed sections.
 *
 * Scans the string character by character, tracking:
//   - `#` toggles between plain text and tag mode (at depth 0).
//   - `[` and `]` delimit actions (with nesting depth tracking).
//   - `\` escapes the next character (so \# produces a literal "#").
//
 * Returns an array of { type, raw } objects:
//   type 0 — plain text
//   type 1 — tag contents (between # delimiters)
//   type 2 — action contents (between [ ] delimiters)
//
 * Empty sections are filtered out. Logs warnings for unclosed tags or
 * mismatched brackets.
 *
 * @param {string|null} rule — the rule string to parse.
 * @returns {{ type: number, raw: string }[]} Array of parsed sections.
 */
com_watabou_tracery_Tracery.parse = function(rule) {
	var depth = 0;        // Bracket nesting depth ([ ]).
	var inTag = false;    // Whether we're inside a #tag#.
	var sections = [];    // Accumulated parsed sections.
	var escaped = false;  // Whether the next character is escaped.
	var start = 0;        // Start index of the current section.
	var escapedSubstring = "";    // Accumulated text from escaped sequences.
	var lastEscapedChar = -1;     // Index of the last backslash (for reconstruction).

	// Null input produces an empty section list.
	if(rule == null) {
		var sections1 = [];
		return sections1;
	}

	/**
	 * Helper: create a section object from start/end indices and a type.
	 * Handles escaped characters by prepending any accumulated escaped text.
	 *
	 * @param {number} start — start index in the rule string.
	 * @param {number} end   — end index (exclusive).
	 * @param {number} type  — section type (0=text, 1=tag, 2=action).
	 */
	var createSection = function(start,end,type) {
		if(end - start < 1) {
			// Log warnings for empty tags or actions.
			if(type == 1) {
				haxe_Log.trace("" + start + ": empty tag",{ fileName : "com/watabou/tracery/Tracery.hx", lineNumber : 63, className : "com/watabou.tracery.Tracery", methodName : "parse"});
			}
			if(type == 2) {
				haxe_Log.trace("" + start + ": empty action",{ fileName : "com/watabou/tracery/Tracery.hx", lineNumber : 65, className : "com/watabou.tracery.Tracery", methodName : "parse"});
			}
		}
		// Reconstruct the raw text, preserving escaped characters.
		var rawSubstring = null;
		if(lastEscapedChar != -1) {
			rawSubstring = escapedSubstring + "\\" + rule.substring(lastEscapedChar + 1,end);
		} else {
			rawSubstring = rule.substring(start,end);
		}
		sections.push({ type : type, raw : rawSubstring});
		// Reset escaped state for the next section.
		lastEscapedChar = -1;
		escapedSubstring = "";
	};

	// Main character-by-character scanning loop.
	var _g = 0;
	var _g1 = rule.length;
	while(_g < _g1) {
		var i = _g++;
		if(!escaped) {
			var c = rule.charAt(i);
			switch(c) {
			case "#":
				// Hash toggles tag mode (only at bracket depth 0).
				if(depth == 0) {
					if(inTag) {
						// Closing a tag — emit the tag section.
						createSection(start,i,1);
						start = i + 1;
					} else {
						// Opening a tag — emit any preceding plain text.
						if(start < i) {
							createSection(start,i,0);
						}
						start = i + 1;
					}
					inTag = !inTag;
				}
				break;
			case "[":
				// Opening bracket starts an action (only at depth 0, not in tag).
				if(depth == 0 && !inTag) {
					if(start < i) {
						createSection(start,i,0);
					}
					start = i + 1;
				}
				++depth;
				break;
			case "\\":
				// Backslash escapes the next character.
				escaped = true;
				escapedSubstring += rule.substring(start,i);
				start = i + 1;
				lastEscapedChar = i;
				break;
			case "]":
				// Closing bracket ends an action.
				--depth;
				if(depth == 0 && !inTag) {
					createSection(start,i,2);
					start = i + 1;
				}
				break;
			}
		} else {
			// We just processed an escaped character — clear the escape flag.
			escaped = !escaped;
		}
	}
	// Emit any remaining plain text after the last section.
	if(start < rule.length) {
		createSection(start,rule.length,0);
	}
	// Warn about unclosed tags or mismatched brackets.
	if(inTag) {
		haxe_Log.trace("Unclosed tag",{ fileName : "com/watabou/tracery/Tracery.hx", lineNumber : 130, className : "com/watabou.tracery.Tracery", methodName : "parse"});
	}
	if(depth > 0) {
		haxe_Log.trace("Too many [",{ fileName : "com/watabou/tracery/Tracery.hx", lineNumber : 132, className : "com/watabou.tracery.Tracery", methodName : "parse"});
	}
	if(depth < 0) {
		haxe_Log.trace("Too many ]",{ fileName : "com/watabou/tracery/Tracery.hx", lineNumber : 134, className : "com/watabou.tracery.Tracery", methodName : "parse"});
	}
	// Filter out empty plain-text sections (type 0 with length 0).
	var _g = [];
	var _g1 = 0;
	var _g2 = sections;
	while(_g1 < _g2.length) {
		var v = _g2[_g1];
		++_g1;
		if(v.type != 0 || v.raw.length > 0) {
			_g.push(v);
		}
	}
	sections = _g;
	return sections;
};


// ─────────────────────────────────────────────────────────────────────────────
// TraceryNode
// ─────────────────────────────────────────────────────────────────────────────
// A single node in the Tracery parse/expand tree. Each node corresponds to
// one section produced by Tracery.parse():
//
//   Type 0 (plain text) — finishedText is just the raw text.
//   Type 1 (tag)        — expand: resolves #symbol.modifier# by selecting a
//                          rule from the grammar, expanding it recursively,
//                          then applying modifiers.
//   Type 2 (action)     — expand: activates the action (push/pop/execute),
//                          produces no output text.
//   Type -1 (root)      — expand: delegates to expandChildren on the raw text.
//
// The tree is built top-down: expand() on the root triggers expandChildren()
// on each node, which parses the child rule, creates child nodes, and
// recursively expands them.
//
// Constructor: TraceryNode(grammar, parent, childIndex, section)
//   @param {Grammar}     grammar    — the owning grammar.
//   @param {TraceryNode} parent     — the parent node (null for root).
//   @param {number}      childIndex — this node's index among its siblings.
//   @param {{ type: number, raw: string }} section — the parsed section data.
// ─────────────────────────────────────────────────────────────────────────────

var com_watabou_tracery_TraceryNode = function(grammar,parent,childIndex,section) {
	if(section.raw == null) {
		haxe_Log.trace("Empty input for node",{ fileName : "com/watabou/tracery/TraceryNode.hx", lineNumber : 35, className : "com.watabou.tracery.TraceryNode", methodName : "new"});
		section.raw = "";
	}
	this.grammar = grammar;
	this.parent = parent;
	// Depth is 0 for root, parent.depth + 1 for children.
	this.depth = parent != null ? parent.depth + 1 : 0;
	this.childIndex = childIndex;
	this.raw = section.raw;
	this.type = section.type;
	this.isExpanded = false;
};
$hxClasses["com.watabou.tracery.TraceryNode"] = com_watabou_tracery_TraceryNode;
com_watabou_tracery_TraceryNode.__name__ = "com.watabou.tracery.TraceryNode";
com_watabou_tracery_TraceryNode.prototype = {
	/**
	 * Return a human-readable debug string for this node.
	 *
	 * @returns {string} e.g. 'Node("hello" 0 d:2)'.
	 */
	toString: function() {
		return "Node(\"" + this.raw + "\" " + this.type + " d:" + this.depth + ")";
	}
	/**
	 * Parse a child rule string into sections, create a TraceryNode for each,
	 * and recursively expand them. Concatenates all children's finishedText
	 * to produce this node's finishedText.
	 *
	 * @param {string}  childRule        — the rule string to parse and expand.
	 * @param {boolean} preventRecursion — if true, children are created but NOT
	 *                   expanded (used to prevent infinite recursion).
	 */
	,expandChildren: function(childRule,preventRecursion) {
		this.children = [];
		this.finishedText = "";
		this.childRule = childRule;
		if(childRule != null) {
			// Parse the child rule into typed sections.
			var sections = com_watabou_tracery_Tracery.parse(childRule);
			var _g = 0;
			var _g1 = sections.length;
			while(_g < _g1) {
				var i = _g++;
				// Create a child node for each section.
				var child = new com_watabou_tracery_TraceryNode(this.grammar,this,i,sections[i]);
				this.children[i] = child;
				// Recursively expand unless recursion prevention is active.
				if(!preventRecursion) {
					child.expand(false);
				}
				// Accumulate the finished text from each child.
				this.finishedText += child.finishedText;
			}
		} else {
			haxe_Log.trace("No child rule provided, can't expand children",{ fileName : "com/watabou/tracery/TraceryNode.hx", lineNumber : 72, className : "com.watabou.tracery.TraceryNode", methodName : "expandChildren"});
		}
	}
	/**
	 * Expand this node based on its type:
	 *
	 *   Type 0 (plain text): Just use the raw text as-is.
	 *
	 *   Type 1 (tag #symbol.mod#): The main expansion logic:
	 *     1. Parse the tag to extract symbol name, modifiers, and pre-actions.
	 *     2. Create NodeAction objects for pre-actions.
	 *     3. Create undo actions for push-type pre-actions (for post-action reversal).
	 *     4. Activate all pre-actions.
	 *     5. Select a rule from the grammar for the resolved symbol.
	 *     6. Expand the selected rule into children.
	 *     7. Apply each modifier function in order.
	 *     8. Activate all post-actions (undo the pre-actions).
	 *
	 *   Type 2 (action [target:rule]): Create and activate a NodeAction.
	 *
	 *   Type -1 (root): Delegate to expandChildren with the raw text.
	 *
	 * @param {boolean} [preventRecursion=false] — if true, don't recurse into children.
	 */
	,expand: function(preventRecursion) {
		if(preventRecursion == null) {
			preventRecursion = false;
		}
		// Only expand once — subsequent calls are no-ops.
		if(!this.isExpanded) {
			this.isExpanded = true;
			switch(this.type) {
			case 0:
				// Plain text — just copy the raw text to finishedText.
				this.finishedText = this.raw;
				break;
			case 1:
				// Tag (#symbol.modifier#) — the main expansion case.
				var parsed = com_watabou_tracery_Tracery.parseTag(this.raw);
				this.symbol = parsed.symbol;
				this.modifiers = parsed.modifiers;

				// Convert raw preaction strings into NodeAction objects.
				var _g = [];
				var _g1 = 0;
				var _g2 = parsed.preactions;
				while(_g1 < _g2.length) {
					var pre = _g2[_g1];
					++_g1;
					_g.push(new com_watabou_tracery_NodeAction(this,pre));
				}
				this.preactions = _g;

				// Build post-actions: undo any push-type pre-actions.
				// This ensures the grammar state is restored after expansion.
				this.postaction = [];
				var _g = 0;
				var _g1 = this.preactions;
				while(_g < _g1.length) {
					var pre = _g1[_g];
					++_g;
					if(pre.type == 0) {
						this.postaction.push(pre.createUndo());
					}
				}

				// Execute all pre-actions (push rules, set flags, etc.).
				var _g = 0;
				var _g1 = this.preactions;
				while(_g < _g1.length) {
					var pre = _g1[_g];
					++_g;
					pre.activate();
				}

				// Select a rule from the grammar for this symbol.
				this.finishedText = this.raw;
				var selectedRule = this.grammar.selectRule(this.symbol);
				// Expand the selected rule into child nodes.
				this.expandChildren(selectedRule,preventRecursion);

				// Apply each modifier in sequence to the expanded text.
				var _g = 0;
				var _g1 = this.modifiers;
				while(_g < _g1.length) {
					var modName = _g1[_g];
					++_g;
					var modParams = [];
					// Check for modifier parameters in parentheses: mod(param1,param2)
					var parenthesis = modName.indexOf("(");
					if(parenthesis != -1) {
						modParams = modName.substring(parenthesis + 1,modName.indexOf(")")).split(",");
						modName = modName.substring(0,parenthesis);
					}
					// Look up the modifier function in the grammar's modifier map.
					var mod = this.grammar.modifiers.h[modName];
					if(mod == null) {
						// Missing modifier — append an error marker.
						haxe_Log.trace("Missing modifier " + modName,{ fileName : "com/watabou/tracery/TraceryNode.hx", lineNumber : 114, className : "com.watabou.tracery.TraceryNode", methodName : "expand"});
						this.finishedText += "((." + modName + "))";
					} else {
						// Apply the modifier function to transform the text.
						this.finishedText = mod(this.finishedText,modParams);
					}
				}

				// Execute post-actions (undo push operations) to restore grammar state.
				var _g = 0;
				var _g1 = this.postaction;
				while(_g < _g1.length) {
					var post = _g1[_g];
					++_g;
					post.activate();
				}
				break;
			case 2:
				// Action ([target:rule]) — create and activate the action.
				this.action = new com_watabou_tracery_NodeAction(this,this.raw);
				this.action.activate();
				// Actions produce no output text.
				this.finishedText = "";
				break;
			default:
				// Root node (type -1) — expand the raw text as children.
				this.expandChildren(this.raw,preventRecursion);
			}
		}
	}
	/**
	 * Remove backslash escape characters from the finished text.
	 * Currently a no-op (escapes are handled during parsing).
	 */
	,clearEscapeChars: function() {
	}
	,__class__: com_watabou_tracery_TraceryNode
};

// -- Static initializers relocated from runtime/base.js (modules/DECISIONS.md, Bug E) --
com_watabou_tracery_Grammar.COND = "?-";
com_watabou_tracery_Grammar.SET = "set ";
com_watabou_tracery_Grammar.CLEAR = "clear ";
com_watabou_tracery_ModsEngBasic.plurals = (function($this) {
	var $r;
	var _g = new haxe_ds_StringMap();
	_g.h["child"] = "children";
	_g.h["fish"] = "fish";
	$r = _g;
	return $r;
}(this));
com_watabou_tracery_NodeAction.PUSH = 0;
com_watabou_tracery_NodeAction.POP = 1;
com_watabou_tracery_NodeAction.FUNCTION = 2;
com_watabou_tracery_Tracery.rng = Math.random;
com_watabou_tracery_TraceryNode.PLAIN = 0;
com_watabou_tracery_TraceryNode.TAG = 1;
com_watabou_tracery_TraceryNode.ACTION = 2;
com_watabou_tracery_TraceryNode.RAW = -1;


// -- Window exports (per module-manifest.json) --
// See modules/DECISIONS.md, Bug B: these were private module-scope
// vars with no export/import/window assignment anywhere.
window.com_watabou_tracery_RuleSelector = com_watabou_tracery_RuleSelector;
window.com_watabou_tracery_DeckRuleSelector = com_watabou_tracery_DeckRuleSelector;
window.com_watabou_tracery_Symbol = com_watabou_tracery_Symbol;
window.com_watabou_tracery_ExtSymbol = com_watabou_tracery_ExtSymbol;
window.com_watabou_tracery_Grammar = com_watabou_tracery_Grammar;
window.com_watabou_tracery_ModsEngBasic = com_watabou_tracery_ModsEngBasic;
window.com_watabou_tracery_NodeAction = com_watabou_tracery_NodeAction;
window.com_watabou_tracery_RuleSet = com_watabou_tracery_RuleSet;
window.com_watabou_tracery_Tracery = com_watabou_tracery_Tracery;
window.com_watabou_tracery_TraceryNode = com_watabou_tracery_TraceryNode;



// ═══ END modules/tracery/tracery.js ═══
