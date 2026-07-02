(function ($hx_exports, $global) { "use strict";
  var seen = {};
  function expose(name, fn) {
    if (seen[name]) return fn;
    seen[name] = true;
    var prev = $global[name];
    $global[name] = fn;
    $hx_exports[name] = fn;
    return prev;
  }
  function init() {
    if ($global.js_Boot) expose('js_Boot', $global.js_Boot);
    if ($global.haxe_IMap) expose('haxe_IMap', $global.haxe_IMap);
    if ($global.haxe_Exception) expose('haxe_Exception', $global.haxe_Exception);
    if ($global.openfl_events_EventDispatcher) expose('openfl_events_EventDispatcher', $global.openfl_events_EventDispatcher);
    if ($global.lime_app_Module) expose('lime_app_Module', $global.lime_app_Module);
    if ($global.openfl_display_IBitmapDrawable) expose('openfl_display_IBitmapDrawable', $global.openfl_display_IBitmapDrawable);
    if ($global.lime) {
      try { $global.lime.embed("SevenDRL", "openfl-content", 0, 0, { parameters: {} }); }
      catch (e) { if (window.console && console.log) console.log("lime_embed_err " + (e && e.message ? e.message : String(e))); }
    } else if (window.console && console.log) {
      console.log("lime not exposed; compat cannot embed yet");
    }
  }
  if (document.readyState === 'complete') init();
  else window.addEventListener('DOMContentLoaded', init);
})(window, window);
