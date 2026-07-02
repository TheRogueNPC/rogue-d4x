// Audio loader wrapper for Dark Clues
(function() {
    var originalLoad = null;
    
    function patchAssetLoading() {
        // Patch the asset loading to use MP3 instead of OGG
        if (typeof window.openfl !== 'undefined' && typeof window.openfl.ContentLoader !== 'undefined') {
            originalLoad = window.openfl.ContentLoader.load;
            
            window.openfl.ContentLoader.load = function(url) {
                if (url && url.endsWith('.ogg')) {
                    var mp3Url = url.replace('.ogg', '.mp3');
                    console.log('Loading MP3 instead of OGG: ' + url + ' -> ' + mp3Url);
                    return originalLoad.call(this, mp3Url);
                }
                return originalLoad.call(this, url);
            };
        }
    }
    
    // Apply the patch when the page loads
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        patchAssetLoading();
    } else {
        window.addEventListener('DOMContentLoaded', patchAssetLoading);
    }
})();