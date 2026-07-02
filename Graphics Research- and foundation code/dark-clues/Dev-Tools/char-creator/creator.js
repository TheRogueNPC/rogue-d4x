(function() {
    'use strict';

    var GLYPHS = '@ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#$%&?!=+*';

    // ── Character State ────────────────────────────────────────────
    var state = {
        name: 'Detective',
        hpBonus: 0,
        stockBonus: 0,
        colorScheme: 'default',
        glyph: '@',
        visuals: []
    };

    // ── Enemy State ────────────────────────────────────────────────
    var enemyState = {
        name: 'Phantom',
        hp: 3,
        damage: 2,
        state: 'wandering',
        glyph: '?'
    };

    // ── Tab Switching ──────────────────────────────────────────────
    window.switchTab = function(tab) {
        document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
        document.querySelectorAll('.tab-content').forEach(function(tc) { tc.classList.remove('active'); });
        document.querySelector('.tab[data-tab="' + tab + '"]').classList.add('active');
        document.getElementById('tab-' + tab).classList.add('active');
        updatePreview();
    };

    // ── Character Stats ────────────────────────────────────────────
    window.charStat = function(type, delta) {
        var el = document.getElementById('char-' + type);
        var val = parseInt(el.textContent) + delta;
        val = Math.max(-3, Math.min(5, val));
        el.textContent = val;
        updateCharState();
        updatePreview();
    };

    function updateCharState() {
        state.name = document.getElementById('char-name').value || 'Detective';
        state.hpBonus = parseInt(document.getElementById('char-hp').textContent) || 0;
        state.stockBonus = parseInt(document.getElementById('char-stock').textContent) || 0;
        state.colorScheme = document.getElementById('char-theme').value || 'default';
    }

    // ── Enemy Stats ────────────────────────────────────────────────
    window.enemyStat = function(type, delta) {
        var el = document.getElementById('enemy-' + type);
        var val = parseInt(el.textContent) + delta;
        val = type === 'hp' ? Math.max(1, Math.min(20, val)) : Math.max(1, Math.min(20, val));
        el.textContent = val;
        updateEnemyState();
        updatePreview();
    };

    function updateEnemyState() {
        enemyState.name = document.getElementById('enemy-name').value || 'Phantom';
        enemyState.hp = parseInt(document.getElementById('enemy-hp').textContent) || 3;
        enemyState.damage = parseInt(document.getElementById('enemy-dmg').textContent) || 2;
        enemyState.state = document.getElementById('enemy-state').value || 'wandering';
    }

    // ── Glyph Grid Builder ─────────────────────────────────────────
    function buildGlyphGrid(gridId, targetState) {
        var grid = document.getElementById(gridId);
        if (!grid) return;
        grid.innerHTML = '';
        for (var gi = 0; gi < GLYPHS.length; gi++) {
            var g = document.createElement('div');
            g.className = 'glyph-cell' + (GLYPHS[gi] === targetState.glyph ? ' selected' : '');
            g.textContent = GLYPHS[gi];
            g.dataset.glyph = GLYPHS[gi];
            g.onclick = (function(glyph) {
                return function() {
                    grid.querySelectorAll('.glyph-cell').forEach(function(el) { el.classList.remove('selected'); });
                    this.classList.add('selected');
                    targetState.glyph = glyph;
                    updatePreview();
                };
            })(GLYPHS[gi]);
            grid.appendChild(g);
        }
    }

    // ── Preview ────────────────────────────────────────────────────
    function updatePreview() {
        var activeTab = document.querySelector('.tab.active');
        var isEnemy = activeTab && activeTab.dataset.tab === 'enemy';

        if (isEnemy) {
            document.getElementById('p-name').textContent = enemyState.name;
            document.getElementById('p-stats').innerHTML =
                '<span style="color:#f44;">HP ' + enemyState.hp + '</span> · ' +
                '<span style="color:#f88;">DMG ' + enemyState.damage + '</span> · ' +
                '<span style="color:#888;">' + enemyState.state + '</span>' +
                (enemyState.glyph !== '@' ? ' [' + enemyState.glyph + ']' : '');
            document.getElementById('p-visuals').innerHTML = '';
            document.getElementById('char-preview').className = 'enemy-card';
            var st = document.getElementById('p-stats');
            var est = document.createElement('div');
            est.className = 'estate';
            est.textContent = 'Behavior: ' + enemyState.state;
            st.appendChild(est);
        } else {
            document.getElementById('p-name').textContent = state.name;
            var glyphPreview = state.glyph !== '@' ? ' [' + state.glyph + ']' : '';
            document.getElementById('p-stats').textContent =
                'HP +' + state.hpBonus + ' · Stock +' + state.stockBonus + ' · ' +
                state.colorScheme.charAt(0).toUpperCase() + state.colorScheme.slice(1) + glyphPreview;
            document.getElementById('char-preview').className = 'char-card';

            var pv = document.getElementById('p-visuals');
            pv.innerHTML = '';
            for (var i = 0; i < state.visuals.length; i++) {
                var v = state.visuals[i];
                if (v.type === 'png' || v.type === 'svg') {
                    var img = document.createElement('img');
                    img.src = v.data;
                    img.style.cssText = 'max-width:120px;max-height:120px;display:inline-block;margin:4px;border:1px solid #333;';
                    img.title = v.name;
                    pv.appendChild(img);
                } else if (v.type === 'json') {
                    var pre = document.createElement('pre');
                    pre.style.cssText = 'font-size:10px;color:#ddd;max-height:60px;overflow:hidden;text-align:left;margin:4px;';
                    try {
                        var parsed = JSON.parse(v.data);
                        pre.textContent = JSON.stringify(parsed, null, 1).slice(0, 200);
                    } catch(e) {
                        pre.textContent = v.data.slice(0, 200);
                    }
                    pv.appendChild(pre);
                }
            }
        }
    }

    // ── Visual File Upload ─────────────────────────────────────────
    window.handleFiles = function(files) {
        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            var ext = file.name.split('.').pop().toLowerCase();
            if (ext !== 'png' && ext !== 'svg' && ext !== 'json') continue;

            var reader = new FileReader();
            reader.fileName = file.name;
            reader.fileType = ext;

            if (ext === 'json') {
                reader.onload = function(e) {
                    state.visuals.push({
                        type: 'json',
                        name: e.target.fileName,
                        data: e.target.result
                    });
                    renderVisuals();
                    updatePreview();
                    setStatus('Added JSON: ' + e.target.fileName);
                };
                reader.readAsText(file);
            } else {
                reader.onload = function(e) {
                    state.visuals.push({
                        type: e.target.fileType,
                        name: e.target.fileName,
                        data: e.target.result
                    });
                    renderVisuals();
                    updatePreview();
                    setStatus('Added ' + e.target.fileType.toUpperCase() + ': ' + e.target.fileName);
                };
                reader.readAsDataURL(file);
            }
        }
    };

    var dropZone = document.getElementById('drop-zone');
    if (dropZone) {
        dropZone.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.classList.remove('dragover');
        });
        dropZone.addEventListener('drop', function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.classList.remove('dragover');
            window.handleFiles(e.dataTransfer.files);
        });
    }

    function renderVisuals() {
        var list = document.getElementById('visual-list');
        list.innerHTML = '';
        if (state.visuals.length === 0) {
            dropZone.classList.remove('has-files');
            return;
        }
        dropZone.classList.add('has-files');
        for (var i = 0; i < state.visuals.length; i++) {
            var v = state.visuals[i];
            var item = document.createElement('div');
            item.className = 'visual-item' + (v.type === 'json' ? ' json-item' : '');

            if (v.type === 'png' || v.type === 'svg') {
                var img = document.createElement('img');
                img.src = v.data;
                item.appendChild(img);
            } else if (v.type === 'json') {
                var pre = document.createElement('pre');
                try {
                    var parsed = JSON.parse(v.data);
                    pre.textContent = JSON.stringify(parsed, null, 1).slice(0, 300);
                } catch(e) {
                    pre.textContent = v.data.slice(0, 300);
                }
                item.appendChild(pre);
            }

            var nameEl = document.createElement('div');
            nameEl.className = 'vname';
            nameEl.textContent = v.name;
            item.appendChild(nameEl);

            var typeEl = document.createElement('div');
            typeEl.className = 'vtype';
            typeEl.textContent = v.type.toUpperCase();
            item.appendChild(typeEl);

            var del = document.createElement('button');
            del.className = 'vdel';
            del.textContent = '×';
            del.onclick = (function(idx) {
                return function() {
                    state.visuals.splice(idx, 1);
                    renderVisuals();
                    updatePreview();
                    setStatus('Removed visual');
                };
            })(i);
            item.appendChild(del);

            list.appendChild(item);
        }
    }

    // ── Character Export/Import/Reset ──────────────────────────────
    window.exportCharacter = function() {
        updateCharState();
        var output = {
            name: state.name,
            hpBonus: state.hpBonus,
            stockBonus: state.stockBonus,
            colorScheme: state.colorScheme,
            glyph: state.glyph || '@',
            visuals: state.visuals.map(function(v) {
                return { type: v.type, name: v.name, data: v.data };
            })
        };
        var el = document.getElementById('json-output');
        el.value = JSON.stringify(output, null, 2);
        document.getElementById('export-area').style.display = 'block';
        setStatus('Character exported (' + output.visuals.length + ' visual(s))');
    };

    window.copyJSON = function() {
        var el = document.getElementById('json-output');
        el.select();
        document.execCommand('copy');
        setStatus('Copied to clipboard');
    };

    window.downloadJSON = function() {
        var name = state.name.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'detective';
        var blob = new Blob([document.getElementById('json-output').value], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = name + '.json';
        a.click();
        URL.revokeObjectURL(url);
        setStatus('Downloaded ' + name + '.json');
    };

    window.closeExport = function() {
        document.getElementById('export-area').style.display = 'none';
    };

    window.importCharacterFile = function(event) {
        var file = event.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function(e) {
            try {
                var data = JSON.parse(e.target.result);
                importCharacter(data);
            } catch(err) {
                setStatus('Import error: ' + err.message);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    function importCharacter(data) {
        state.name = data.name || 'Detective';
        state.hpBonus = data.hpBonus || 0;
        state.stockBonus = data.stockBonus || 0;
        state.colorScheme = data.colorScheme || 'default';
        state.glyph = data.glyph || '@';
        state.visuals = data.visuals || [];

        document.getElementById('char-name').value = state.name;
        document.getElementById('char-hp').textContent = state.hpBonus;
        document.getElementById('char-stock').textContent = state.stockBonus;
        document.getElementById('char-theme').value = state.colorScheme;
        buildGlyphGrid('glyph-grid-ch', state);
        renderVisuals();
        updatePreview();
        setStatus('Imported character: ' + state.name);
    }

    window.resetCharacter = function() {
        state.name = 'Detective';
        state.hpBonus = 0;
        state.stockBonus = 0;
        state.colorScheme = 'default';
        state.glyph = '@';
        state.visuals = [];

        document.getElementById('char-name').value = 'Detective';
        document.getElementById('char-hp').textContent = '0';
        document.getElementById('char-stock').textContent = '0';
        document.getElementById('char-theme').value = 'default';
        buildGlyphGrid('glyph-grid-ch', state);
        renderVisuals();
        updatePreview();
        setStatus('Reset to defaults');
    };

    // ── Enemy Export/Import/Reset ──────────────────────────────────
    window.exportEnemy = function() {
        updateEnemyState();
        var output = {
            name: enemyState.name,
            hp: enemyState.hp,
            damage: enemyState.damage,
            state: enemyState.state,
            glyph: enemyState.glyph || '?'
        };
        var el = document.getElementById('enemy-json-output');
        el.value = JSON.stringify(output, null, 2);
        document.getElementById('export-enemy-area').style.display = 'block';
        document.getElementById('btn-copy-enemy').style.display = '';
        setEnemyStatus('Enemy exported');
    };

    window.copyEnemyJSON = function() {
        var el = document.getElementById('enemy-json-output');
        el.select();
        document.execCommand('copy');
        setEnemyStatus('Copied to clipboard');
    };

    window.downloadEnemyJSON = function() {
        var name = enemyState.name.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'phantom';
        var blob = new Blob([document.getElementById('enemy-json-output').value], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = name + '.json';
        a.click();
        URL.revokeObjectURL(url);
        setEnemyStatus('Downloaded ' + name + '.json');
    };

    window.closeEnemyExport = function() {
        document.getElementById('export-enemy-area').style.display = 'none';
        document.getElementById('btn-copy-enemy').style.display = 'none';
    };

    window.importEnemyFile = function(event) {
        var file = event.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function(e) {
            try {
                var data = JSON.parse(e.target.result);
                importEnemy(data);
            } catch(err) {
                setEnemyStatus('Import error: ' + err.message);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    function importEnemy(data) {
        enemyState.name = data.name || 'Phantom';
        enemyState.hp = data.hp || 3;
        enemyState.damage = data.damage || 2;
        enemyState.state = data.state || 'wandering';
        enemyState.glyph = data.glyph || '?';

        document.getElementById('enemy-name').value = enemyState.name;
        document.getElementById('enemy-hp').textContent = enemyState.hp;
        document.getElementById('enemy-dmg').textContent = enemyState.damage;
        document.getElementById('enemy-state').value = enemyState.state;
        buildGlyphGrid('glyph-grid-en', enemyState);
        updatePreview();
        setEnemyStatus('Imported enemy: ' + enemyState.name);
    }

    window.resetEnemy = function() {
        enemyState.name = 'Phantom';
        enemyState.hp = 3;
        enemyState.damage = 2;
        enemyState.state = 'wandering';
        enemyState.glyph = '?';

        document.getElementById('enemy-name').value = 'Phantom';
        document.getElementById('enemy-hp').textContent = '3';
        document.getElementById('enemy-dmg').textContent = '2';
        document.getElementById('enemy-state').value = 'wandering';
        buildGlyphGrid('glyph-grid-en', enemyState);
        updatePreview();
        setEnemyStatus('Reset to defaults');
    };

    // ── Status ─────────────────────────────────────────────────────
    function setStatus(msg) {
        var el = document.getElementById('status');
        if (el) el.textContent = msg;
    }

    function setEnemyStatus(msg) {
        var el = document.getElementById('status-enemy');
        if (el) el.textContent = msg;
    }

    // ── Init ───────────────────────────────────────────────────────
    function init() {
        buildGlyphGrid('glyph-grid-ch', state);
        buildGlyphGrid('glyph-grid-en', enemyState);
        updatePreview();

        document.getElementById('char-name').addEventListener('input', function() {
            updateCharState();
            updatePreview();
        });
        document.getElementById('char-theme').addEventListener('change', function() {
            updateCharState();
            updatePreview();
        });
        document.getElementById('enemy-name').addEventListener('input', function() {
            updateEnemyState();
            updatePreview();
        });
        document.getElementById('enemy-state').addEventListener('change', function() {
            updateEnemyState();
            updatePreview();
        });

        setStatus('Ready — configure your character and add visuals');
        setEnemyStatus('Define a new enemy type');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
