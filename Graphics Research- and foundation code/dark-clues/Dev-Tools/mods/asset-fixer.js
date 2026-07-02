// ═══════════════════════════════════════════════════════════════════
// MOD: asset-fixer.js — Fix baked-in asset paths for Dev-Tools subdir
// SevenDRL.js registers assets as "assets/ambience.ogg", but when
// loaded from Dev-Tools/index.html those paths resolve to
// Dev-Tools/assets/ — files are at ../assets/.
//
// Patches Lime's AssetLibrary.load to prefix with "../" for any path
// that starts with "assets/".
// ═══════════════════════════════════════════════════════════════════

(function() {
    // Only needed when loaded from Dev-Tools/ subdirectory
    if (document.location.href.indexOf('Dev-Tools/') === -1 &&
        document.location.href.indexOf('Dev-Tools%2F') === -1) return;

    var ASSET_PREFIX = '../';

    function tryPatch() {
        if (typeof lime === 'undefined' || !lime.utils || !lime.utils.AssetLibrary) return false;

        var proto = lime.utils.AssetLibrary.prototype;
        if (proto._dcFixed) return true;
        proto._dcFixed = true;

        var orig = proto.load;
        proto.load = function(path) {
            // For relative asset paths starting with "assets/" (baked into SevenDRL.js),
            // prefix with "../" so they resolve from the parent dir instead of Dev-Tools/
            if (typeof path === 'string' && path.indexOf('assets/') === 0) {
                path = ASSET_PREFIX + path;
            }
            // Also for "Assets/" (capital A — font files) — same fix
            if (typeof path === 'string' && path.indexOf('Assets/') === 0) {
                path = ASSET_PREFIX + path;
            }
            return orig.call(this, path);
        };

        console.log('[asset-fixer] patched asset paths with prefix "' + ASSET_PREFIX + '"');
        return true;
    }

    // Retry until lime is available
    var timer = setInterval(function() {
        if (tryPatch()) clearInterval(timer);
    }, 100);
})();