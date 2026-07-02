// ═══════════════════════════════════════════════════════════════════
// Dev-Tools/mods/loader.js — Mod bootstrapper & hook toolkit
//
// CRITICAL ARCHITECTURE (from debugging):
//   1. SevenDRL.js is wrapped in an IIFE — $hxClasses is NOT global.
//      All var declarations are scoped inside that closure.
//   2. Classes are exported to window via the $hxClasses dump at the
//      end of the inner IIFE (after ApplicationMain.main()), then
//      copied to window by the outer lime.embed wrapper.
//   3. lime.embed() runs ALL game initialization synchronously.
//      Mod patches are applied AFTER it returns (see index.html).
//   4. Some methods (spawnMobs, spawnClues) run in the constructor,
//      BEFORE patches take effect. Hook the turn loop (proceed)
//      or user-triggered methods (onClick) for reliable capture.
//   5. flush() wraps loop body in an IIFE to avoid closure-sharing.
//      Always use let/IIFE when creating closures in loops.
// ═══════════════════════════════════════════════════════════════════

(function() {
    'use strict';

    function warn(msg) {
        if (window.devLog) window.devLog('[ModLoader] ' + msg);
    }

    window.ModLoader = {
        ready: false,
        patches: [],

        // ── Resolution ────────────────────────────────────────────
        // Haxe classes live on window as flattened names:
        //   "com.watabou.sevendrl.SevenDRL" → window.com_watabou_sevendrl_SevenDRL
        resolve: function(name) {
            return window[name.replace(/\./g, '_')];
        },

        // ── Method Validation ─────────────────────────────────────
        // Check whether a method exists on a class prototype BEFORE hooking.
        // Prevents the "createPlan doesn't exist" bug.
        validateMethod: function(className, method) {
            var cls = ModLoader.resolve(className);
            if (!cls) return { ok: false, reason: 'Class not on window (not exported yet? wrong name?)' };
            if (!cls.prototype) return { ok: false, reason: 'Class has no prototype (abstract? enum?)' };
            if (typeof cls.prototype[method] !== 'function') {
                var available = Object.getOwnPropertyNames(cls.prototype).filter(function(k) { return typeof cls.prototype[k] === 'function'; });
                return { ok: false, reason: 'Method "' + method + '" not found', available: available };
            }
            return { ok: true };
        },

        // ── Method Listing ────────────────────────────────────────
        // List all available methods on a class (own + inherited).
        listMethods: function(className) {
            var cls = ModLoader.resolve(className);
            if (!cls) return 'Class not found: ' + className;
            var methods = [];
            var proto = cls.prototype;
            while (proto) {
                Object.getOwnPropertyNames(proto).forEach(function(k) {
                    if (k !== 'constructor' && typeof proto[k] === 'function' && methods.indexOf(k) === -1) {
                        methods.push(k);
                    }
                });
                proto = Object.getPrototypeOf(proto);
            }
            return methods;
        },

        // ── Class Inspection ──────────────────────────────────────
        // Return metadata about a Haxe class.
        inspect: function(className) {
            var cls = ModLoader.resolve(className);
            if (!cls) return 'Class not found';
            var info = {
                name: cls.__name__ || className,
                superclass: cls.__super__ ? (cls.__super__.__name__ || '?') : null,
                isInterface: !!cls.__isInterface__,
                isEnum: !!cls.__isEnum__,
                statics: [],
                methods: ModLoader.listMethods(className)
            };
            for (var k in cls) {
                if (k !== 'prototype' && k !== '__name__' && k !== '__super__' && k !== '__isInterface__' && k !== '__isEnum__' && k !== '__class__' && typeof cls[k] === 'function') {
                    info.statics.push(k);
                }
            }
            return info;
        },

        // ── Fuzzy Search ──────────────────────────────────────────
        // Find Haxe classes matching a substring.
        find: function(pattern) {
            var results = [];
            var re = new RegExp(pattern, 'i');
            for (var key in window) {
                if (key.indexOf('com_watabou_') === 0 || key.indexOf('openfl_') === 0 || key.indexOf('lime_') === 0 || key.indexOf('msignal_') === 0 || key.indexOf('haxe_') === 0) {
                    var name = key.split('_').join('.');
                    if (re.test(name)) results.push(name);
                }
            }
            return results.sort();
        },

        // ── Hook: after(fn) ───────────────────────────────────────
        // Shorthand: run fn(this, result, args) after original method.
        after: function(className, method, fn) {
            ModLoader.hook(className, method, null, fn);
        },

        // ── Hook: before(fn) ──────────────────────────────────────
        // Shorthand: run fn(this, args) before original method.
        before: function(className, method, fn) {
            ModLoader.hook(className, method, fn, null);
        },

        // ── Hook: replace(fn) ─────────────────────────────────────
        // Shorthand: completely replace a method. fn receives (orig, this, args).
        replace: function(className, method, fn) {
            ModLoader.hook(className, method, function() {
                return fn(this, arguments);
            }, function(result) {
                // suppress the original call
                this.__suppressOrig = true;
            });
        },

        // ── Core Hook ─────────────────────────────────────────────
        // Monkey-patch a prototype method, preserving the original.
        // before(this, args) — runs BEFORE original, can mutate args
        // after(this, result, args) — runs AFTER original, gets result
        // If class/method not available yet, queues for later.
        // IMPORTANT: Verify method exists FIRST with validateMethod()!
        hook: function(className, method, before, after) {
            var cls = ModLoader.resolve(className);
            if (!cls || !cls.prototype) {
                ModLoader.patches.push({ className: className, method: method, before: before, after: after });
                return;
            }
            if (typeof cls.prototype[method] !== 'function') {
                warn('HOOK SKIPPED: ' + className + '.' + method + '() — method not found on prototype');
                return;
            }
            var orig = cls.prototype[method];
            var patchFn = function() {
                var args = arguments;
                var _this = this;
                if (before) { before.apply(_this, args); }
                if (this.__suppressOrig) { delete this.__suppressOrig; return; }
                var result = orig ? orig.apply(_this, args) : undefined;
                if (after) { after.call(_this, result, args); }
                return result;
            };
            cls.prototype[method] = patchFn;
        },

        // ── Batch Hooks ───────────────────────────────────────────
        // Register multiple hooks at once:
        //   ModLoader.addHooks({
        //     'com...SevenDRL': {
        //       proceed: { after: fn },
        //       gameOver: { before: fn }
        //     },
        //     'com...Hero': {
        //       act: { after: fn }
        //     }
        //   });
        addHooks: function(spec) {
            for (var className in spec) {
                var methods = spec[className];
                for (var method in methods) {
                    var cfg = methods[method];
                    ModLoader.hook(className, method, cfg.before || null, cfg.after || null);
                }
            }
        },

        // ── Flush (apply deferred patches) ────────────────────────
        // Called from index.html AFTER lime.embed() exports classes.
        // Uses IIFE to avoid JS closure-sharing bug in the loop!
        //
        // MAX_RETRIES: a patch targeting a method that genuinely doesn't
        // exist (typo, removed method, vestigial hook from an old design)
        // can never resolve — without a cap, this retried forever every
        // 500ms, logging "FLUSH SKIPPED" + "Deferred: N patches pending"
        // indefinitely for the whole session and burying every other log
        // line. Now it gives up after 10 tries (~5s) with ONE clear message
        // instead of spamming, and the patch is dropped from the queue.
        FLUSH_MAX_RETRIES: 10,
        flush: function() {
            var remaining = [];
            for (var i = 0; i < ModLoader.patches.length; i++) {
                var p = ModLoader.patches[i];
                p.__retries = (p.__retries || 0) + 1;
                var cls = ModLoader.resolve(p.className);
                if (cls && cls.prototype) {
                    (function(patch) {
                        if (typeof cls.prototype[patch.method] !== 'function') {
                            if (patch.__retries >= ModLoader.FLUSH_MAX_RETRIES) {
                                warn('GAVE UP after ' + patch.__retries + ' tries: ' + patch.className + '.' + patch.method + '() — method never appeared on prototype. Dropping this hook.');
                                return;
                            }
                            remaining.push(patch);
                            return;
                        }
                        var orig = cls.prototype[patch.method];
                        cls.prototype[patch.method] = function() {
                            var args = arguments;
                            var _this = this;
                            if (patch.before) { patch.before.apply(_this, args); }
                            if (this.__suppressOrig) { delete this.__suppressOrig; return; }
                            var result = orig ? orig.apply(_this, args) : undefined;
                            if (patch.after) { patch.after.call(_this, result, args); }
                            return result;
                        };
                    })(p);
                } else {
                    if (p.__retries >= ModLoader.FLUSH_MAX_RETRIES) {
                        warn('GAVE UP after ' + p.__retries + ' tries: ' + p.className + '.' + p.method + '() — class never appeared on window. Dropping this hook.');
                        continue;
                    }
                    remaining.push(p);
                }
            }
            ModLoader.patches = remaining;
            if (remaining.length > 0) {
                warn('Deferred: ' + remaining.length + ' patches still pending (class not available yet)');
                setTimeout(ModLoader.flush, 500);
            }
        },

        // ── Manual Class Injection ────────────────────────────────
        // If a Haxe class is NOT on window (seen in some patterns),
        // manually extract it and register on window.
        register: function(fullName) {
            // Try: window properties matching the pattern
            var flatName = fullName.replace(/\./g, '_');
            if (window[flatName]) return window[flatName];

            // Try: fish through $hx_exports patterns
            if (window.lime) {
                // Some classes are nested under lime namespaces
            }
            warn('Cannot register ' + fullName + ' — class not found on window');
            return null;
        }
    };

    if (window.devLog) window.devLog('[ModLoader] v2 — toolkit loaded (validate, list, after/before/replace, addHooks)');
})();