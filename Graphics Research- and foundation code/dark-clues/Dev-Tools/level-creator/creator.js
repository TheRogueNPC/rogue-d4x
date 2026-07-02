// ═══════════════════════════════════════════════════════════════════
// Dark Clues — Level Creator
//
// Visual grid editor for designing custom dungeon layouts.
// Rooms, connections, hero start, boss room — all exported as JSON
// that Rogue.Plan.loadFromJSON() can consume in-game.
//
// Usage:
//   1. Open Dev-Tools/level-creator/index.html in browser
//   2. Paint cells to define rooms (each color = one room)
//   3. Mark hero start ★ and optional boss room ♛
//   4. Assign a theme preset and optional per-room tags
//   5. Export JSON → choose either Spec JSON (LayoutSystem CLI) or
//      Plan JSON (direct Plan.loadFromJSON runtime import)
// ═══════════════════════════════════════════════════════════════════

(function() {
    'use strict';

    // ── State ────────────────────────────────────────────────────────
    var CELL_SIZE = 28;
    var ROOM_COLORS = [
        '#4488CC', '#CC4466', '#44CC88', '#CC8844', '#8844CC',
        '#44CCCC', '#CC4488', '#88CC44', '#4488CC', '#CC6644',
        '#66CC44', '#CC44AA', '#44AACC', '#AACC44', '#CC44CC',
    ];

    var state = {
        gridW: 16,
        gridH: 16,
        // cells[row][col] = roomId | -1 (unassigned) | -2 (blocked/wall)
        cells: [],
        rooms: [],           // { id, label, color, cells: [[r,c],...], heroStart: bool, boss: bool, spawn: [] }
        nextRoomId: 0,
        activeRoomId: -1,    // currently selected room for painting
        tool: 'paint',       // 'paint' | 'erase' | 'hero' | 'boss' | 'info'
        heroPos: null,       // [row, col] or null
        bossRoomId: -1,      // room id with boss spawn, or -1
        loadout: {           // character loadout (included in export)
            name: 'Detective',
            hpBonus: 0,
            stockBonus: 0,
            colorScheme: 'default'
        },
        dirty: true,
    };

    var canvas, ctx, legendEl, statusEl, outputEl, jsonOut;

    // ── Init ─────────────────────────────────────────────────────────
    function init() {
        canvas = document.getElementById('gridCanvas');
        ctx = canvas.getContext('2d');
        legendEl = document.getElementById('legend');
        statusEl = document.getElementById('status');
        outputEl = document.getElementById('output');
        jsonOut = document.getElementById('jsonOutput');

        // Load grid size from inputs
        var wIn = document.getElementById('gridW');
        var hIn = document.getElementById('gridH');
        wIn.value = state.gridW;
        hIn.value = state.gridH;

        initGrid();
        resizeCanvas();
        render();
        bindEvents();
        applyLoadoutToDOM();
        renderEncounters();
        loadEnemyManifest();

        setStatus('Ready — click cells to paint rooms. Select a room from the legend first.');
    }

    function initGrid() {
        state.cells = [];
        for (var r = 0; r < state.gridH; r++) {
            var row = [];
            for (var c = 0; c < state.gridW; c++) {
                row.push(-1);
            }
            state.cells.push(row);
        }
        // Create one default room
        if (state.rooms.length === 0) {
            createRoom('Room 0');
            state.activeRoomId = 0;
        }
        state.heroPos = null;
        state.bossRoomId = -1;
    }

    function resizeCanvas() {
        canvas.width = state.gridW * CELL_SIZE;
        canvas.height = state.gridH * CELL_SIZE;
    }

    function createRoom(label) {
        var id = state.nextRoomId++;
        var color = ROOM_COLORS[id % ROOM_COLORS.length];
        state.rooms.push({ id: id, label: label || 'Room ' + id, color: color, cells: [], heroStart: false, boss: false, spawn: [] });
        state.activeRoomId = id;
        renderLegend();
        return id;
    }

    // ── Rendering ────────────────────────────────────────────────────
    function render() {
        var w = state.gridW, h = state.gridH;
        var cs = CELL_SIZE;

        // Background
        ctx.fillStyle = '#111122';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid lines
        ctx.strokeStyle = '#222244';
        ctx.lineWidth = 0.5;
        for (var r = 0; r <= h; r++) {
            ctx.beginPath(); ctx.moveTo(0, r * cs); ctx.lineTo(w * cs, r * cs); ctx.stroke();
        }
        for (var c = 0; c <= w; c++) {
            ctx.beginPath(); ctx.moveTo(c * cs, 0); ctx.lineTo(c * cs, h * cs); ctx.stroke();
        }

        // Room fill
        for (var r = 0; r < h; r++) {
            for (var c = 0; c < w; c++) {
                var roomId = state.cells[r][c];
                if (roomId >= 0) {
                    var room = getRoom(roomId);
                    if (room) {
                        ctx.fillStyle = room.color;
                        ctx.globalAlpha = 0.6;
                        ctx.fillRect(c * cs + 1, r * cs + 1, cs - 2, cs - 2);
                        ctx.globalAlpha = 1;
                    }
                }
            }
        }

        // Cell borders (room edges = door candidates)
        ctx.lineWidth = 1;
        for (var r = 0; r < h; r++) {
            for (var c = 0; c < w; c++) {
                var roomId = state.cells[r][c];
                if (roomId < 0) continue;
                // Check 4 neighbours — if neighbor has different roomId, draw door-mark
                var neighbors = [[-1,0],[1,0],[0,-1],[0,1]];
                for (var n = 0; n < neighbors.length; n++) {
                    var nr = r + neighbors[n][0], nc = c + neighbors[n][1];
                    if (nr < 0 || nr >= h || nc < 0 || nc >= w) continue;
                    var nId = state.cells[nr][nc];
                    if (nId >= 0 && nId !== roomId) {
                        // Draw a door indicator on the shared edge
                        ctx.strokeStyle = '#ffff00';
                        ctx.lineWidth = 2.5;
                        var x1 = c * cs, y1 = r * cs, x2 = (c+1) * cs, y2 = (r+1) * cs;
                        if (neighbors[n][0] === -1) { // north
                            ctx.beginPath(); ctx.moveTo(x1 + 4, y1); ctx.lineTo(x2 - 4, y1); ctx.stroke();
                        } else if (neighbors[n][0] === 1) { // south
                            ctx.beginPath(); ctx.moveTo(x1 + 4, y2); ctx.lineTo(x2 - 4, y2); ctx.stroke();
                        } else if (neighbors[n][1] === -1) { // west
                            ctx.beginPath(); ctx.moveTo(x1, y1 + 4); ctx.lineTo(x1, y2 - 4); ctx.stroke();
                        } else if (neighbors[n][1] === 1) { // east
                            ctx.beginPath(); ctx.moveTo(x2, y1 + 4); ctx.lineTo(x2, y2 - 4); ctx.stroke();
                        }
                    }
                }
            }
        }

        // Room ID labels
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (var r = 0; r < h; r++) {
            for (var c = 0; c < w; c++) {
                var roomId = state.cells[r][c];
                if (roomId >= 0) {
                    var room = getRoom(roomId);
                    ctx.fillStyle = '#fff';
                    ctx.globalAlpha = 0.9;
                    ctx.fillText(roomId, c * cs + cs/2, r * cs + cs/2);
                    ctx.globalAlpha = 1;
                }
            }
        }

        // Hero marker
        if (state.heroPos) {
            var hr = state.heroPos[0], hc = state.heroPos[1];
            ctx.fillStyle = '#00ff00';
            ctx.font = 'bold 18px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('★', hc * cs + cs/2, hr * cs + cs/2);
        }

        // Boss marker
        if (state.bossRoomId >= 0) {
            var broom = getRoom(state.bossRoomId);
            if (broom && broom.cells.length > 0) {
                // Find center cell of boss room
                var sumR = 0, sumC = 0;
                for (var i = 0; i < broom.cells.length; i++) {
                    sumR += broom.cells[i][0];
                    sumC += broom.cells[i][1];
                }
                var br = Math.round(sumR / broom.cells.length);
                var bc = Math.round(sumC / broom.cells.length);
                ctx.fillStyle = '#ff4444';
                ctx.font = 'bold 18px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('♛', bc * cs + cs/2, br * cs + cs/2);
            }
        }

        // Active room highlight border
        if (state.activeRoomId >= 0) {
            ctx.strokeStyle = '#0ff';
            ctx.lineWidth = 2;
            for (var r = 0; r < h; r++) {
                for (var c = 0; c < w; c++) {
                    if (state.cells[r][c] === state.activeRoomId) {
                        ctx.strokeRect(c * cs + 1, r * cs + 1, cs - 2, cs - 2);
                    }
                }
            }
        }

        state.dirty = false;
    }

    function renderLegend() {
        legendEl.innerHTML = '';
        for (var i = 0; i < state.rooms.length; i++) {
            var room = state.rooms[i];
            var item = document.createElement('div');
            item.className = 'legend-item' + (room.id === state.activeRoomId ? ' selected' : '');
            item.dataset.roomId = room.id;

            var swatch = document.createElement('span');
            swatch.className = 'legend-swatch';
            swatch.style.background = room.color;
            item.appendChild(swatch);

            var idSpan = document.createElement('span');
            idSpan.className = 'legend-id';
            idSpan.textContent = room.id;
            item.appendChild(idSpan);

            var label = document.createElement('span');
            label.textContent = room.label + (room.boss ? ' ♛' : '') + (room.heroStart ? ' ★' : '');
            item.appendChild(label);

            var count = document.createElement('span');
            count.className = 'legend-count';
            count.textContent = room.cells.length + ' cells';
            item.appendChild(count);

            // Delete button
            if (state.rooms.length > 1) {
                var del = document.createElement('button');
                del.textContent = '×';
                del.style.cssText = 'background:none;border:none;color:#f44;cursor:pointer;font-size:13px;margin-left:4px;';
                del.title = 'Delete room';
                del.onclick = function(e) { e.stopPropagation(); deleteRoom(room.id); };
                item.appendChild(del);
            }

            item.onclick = function() {
                state.activeRoomId = parseInt(this.dataset.roomId);
                renderLegend();
                render();
                renderEncounters();
            };

            legendEl.appendChild(item);
        }
    }

    function getRoom(id) {
        for (var i = 0; i < state.rooms.length; i++) {
            if (state.rooms[i].id === id) return state.rooms[i];
        }
        return null;
    }

    function setStatus(msg) {
        statusEl.textContent = msg;
    }

    // ── Tools ────────────────────────────────────────────────────────
    window.setTool = function(tool) {
        state.tool = tool;
        document.querySelectorAll('.toolbar button').forEach(function(b) {
            b.classList.toggle('active', b.id === 'tool-' + tool);
        });
        canvas.style.cursor = tool === 'info' ? 'help' : tool === 'hero' ? 'cell' : 'crosshair';
        var msgs = { paint: 'Paint: click cells to add to active room', erase: 'Erase: click cells to remove from rooms',
            hero: '★ Click a cell to place hero start', boss: '♛ Click a room cell to mark boss lair',
            info: '🔍 Click a cell to see info' };
        setStatus(msgs[tool] || '');
    };

    window.newRoom = function() {
        createRoom('Room ' + state.nextRoomId);
        renderLegend();
        render();
        renderEncounters();
        setStatus('New room created (id=' + (state.nextRoomId - 1) + ') — paint cells onto it');
    };

    function deleteRoom(id) {
        if (state.rooms.length <= 1) { setStatus('Cannot delete last room'); return; }
        // Remove all cells belonging to this room
        for (var r = 0; r < state.gridH; r++) {
            for (var c = 0; c < state.gridW; c++) {
                if (state.cells[r][c] === id) state.cells[r][c] = -1;
            }
        }
        // Remove room
        for (var i = 0; i < state.rooms.length; i++) {
            if (state.rooms[i].id === id) {
                state.rooms.splice(i, 1);
                break;
            }
        }
        if (state.activeRoomId === id) {
            state.activeRoomId = state.rooms.length > 0 ? state.rooms[0].id : -1;
        }
        if (state.bossRoomId === id) state.bossRoomId = -1;
        rebuildRoomCellLists();
        renderLegend();
        render();
        renderEncounters();
        setStatus('Deleted room ' + id);
    }

    function rebuildRoomCellLists() {
        for (var i = 0; i < state.rooms.length; i++) {
            state.rooms[i].cells = [];
        }
        for (var r = 0; r < state.gridH; r++) {
            for (var c = 0; c < state.gridW; c++) {
                var id = state.cells[r][c];
                if (id >= 0) {
                    var room = getRoom(id);
                    if (room) room.cells.push([r, c]);
                }
            }
        }
    }

    window.clearAll = function() {
        for (var r = 0; r < state.gridH; r++) {
            for (var c = 0; c < state.gridW; c++) {
                state.cells[r][c] = -1;
            }
        }
        state.rooms = [];
        state.nextRoomId = 0;
        state.heroPos = null;
        state.bossRoomId = -1;
        createRoom('Room 0');
        renderLegend();
        render();
        renderEncounters();
        setStatus('Cleared — new default room created');
    };

    // ── Grid Resize ──────────────────────────────────────────────────
    window.resizeGrid = function() {
        var newW = parseInt(document.getElementById('gridW').value) || 16;
        var newH = parseInt(document.getElementById('gridH').value) || 16;
        newW = Math.max(4, Math.min(32, newW));
        newH = Math.max(4, Math.min(32, newH));
        document.getElementById('gridW').value = newW;
        document.getElementById('gridH').value = newH;

        var oldCells = state.cells;
        state.gridW = newW;
        state.gridH = newH;
        state.cells = [];
        for (var r = 0; r < newH; r++) {
            var row = [];
            for (var c = 0; c < newW; c++) {
                row.push((oldCells[r] && oldCells[r][c] !== undefined) ? oldCells[r][c] : -1);
            }
            state.cells.push(row);
        }
        rebuildRoomCellLists();
        resizeCanvas();
        render();
        renderLegend();
        setStatus('Resized to ' + newW + '×' + newH);
    };

    // ── Cell Click ───────────────────────────────────────────────────
    function getCellFromEvent(e) {
        var rect = canvas.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        var scaleX = canvas.width / rect.width;
        var scaleY = canvas.height / rect.height;
        var col = Math.floor(x * scaleX / CELL_SIZE);
        var row = Math.floor(y * scaleY / CELL_SIZE);
        if (row < 0 || row >= state.gridH || col < 0 || col >= state.gridW) return null;
        return [row, col];
    }

    function onCanvasClick(e) {
        var cell = getCellFromEvent(e);
        if (!cell) return;
        var r = cell[0], c = cell[1];
        var currentId = state.cells[r][c];

        switch (state.tool) {
            case 'paint': {
                if (state.activeRoomId < 0) { setStatus('No active room — create one first'); return; }
                if (currentId === state.activeRoomId) { setStatus('Cell already in room ' + currentId); return; }
                if (currentId >= 0) {
                    // Remove from old room
                    var oldRoom = getRoom(currentId);
                    if (oldRoom) {
                        var idx = -1;
                        for (var i = 0; i < oldRoom.cells.length; i++) {
                            if (oldRoom.cells[i][0] === r && oldRoom.cells[i][1] === c) { idx = i; break; }
                        }
                        if (idx >= 0) oldRoom.cells.splice(idx, 1);
                    }
                }
                state.cells[r][c] = state.activeRoomId;
                var room = getRoom(state.activeRoomId);
                if (room) room.cells.push([r, c]);
                render();
                renderLegend();
                break;
            }
            case 'erase': {
                if (currentId >= 0) {
                    var room = getRoom(currentId);
                    if (room) {
                        var idx = -1;
                        for (var i = 0; i < room.cells.length; i++) {
                            if (room.cells[i][0] === r && room.cells[i][1] === c) { idx = i; break; }
                        }
                        if (idx >= 0) room.cells.splice(idx, 1);
                    }
                    state.cells[r][c] = -1;
                    render();
                    renderLegend();
                    setStatus('Cleared cell ' + c + ',' + r);
                }
                break;
            }
            case 'hero': {
                state.heroPos = [r, c];
                // Mark which room has hero start
                for (var i = 0; i < state.rooms.length; i++) state.rooms[i].heroStart = false;
                if (currentId >= 0) {
                    var hRoom = getRoom(currentId);
                    if (hRoom) hRoom.heroStart = true;
                }
                render();
                renderLegend();
                setStatus('Hero start at ' + c + ',' + r + (currentId >= 0 ? ' (room ' + currentId + ')' : ' (unassigned)'));
                break;
            }
            case 'boss': {
                if (currentId < 0) { setStatus('Click a cell that belongs to a room'); return; }
                state.bossRoomId = currentId;
                for (var i = 0; i < state.rooms.length; i++) state.rooms[i].boss = (state.rooms[i].id === currentId);
                render();
                renderLegend();
                setStatus('Boss room: ' + currentId);
                break;
            }
            case 'info': {
                showCellInfo(r, c, currentId);
                break;
            }
        }
    }

    function onCanvasDrag(e) {
        if (state.tool !== 'paint' && state.tool !== 'erase') return;
        if (e.buttons !== 1) return;
        var cell = getCellFromEvent(e);
        if (!cell) return;
        var r = cell[0], c = cell[1];
        var currentId = state.cells[r][c];

        if (state.tool === 'paint') {
            if (currentId === state.activeRoomId) return;
            if (currentId >= 0) {
                var oldRoom = getRoom(currentId);
                if (oldRoom) {
                    var idx = -1;
                    for (var i = 0; i < oldRoom.cells.length; i++) {
                        if (oldRoom.cells[i][0] === r && oldRoom.cells[i][1] === c) { idx = i; break; }
                    }
                    if (idx >= 0) oldRoom.cells.splice(idx, 1);
                }
            }
            state.cells[r][c] = state.activeRoomId;
            var room = getRoom(state.activeRoomId);
            if (room) room.cells.push([r, c]);
        } else if (state.tool === 'erase' && currentId >= 0) {
            var room = getRoom(currentId);
            if (room) {
                var idx = -1;
                for (var i = 0; i < room.cells.length; i++) {
                    if (room.cells[i][0] === r && room.cells[i][1] === c) { idx = i; break; }
                }
                if (idx >= 0) room.cells.splice(idx, 1);
            }
            state.cells[r][c] = -1;
        }
        render();
        renderLegend();
    }

    // ── Cell Info Modal ──────────────────────────────────────────────
    function showCellInfo(r, c, roomId) {
        var overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

        var panel = document.createElement('div');
        panel.className = 'modal-panel';
        panel.innerHTML = '<h2>Cell ' + c + ', ' + r + '</h2>';

        var dl = document.createElement('dl');
        dl.className = 'cell-info';

        function addRow(label, val) {
            dl.innerHTML += '<dt>' + label + '</dt><dd>' + val + '</dd>';
        }

        addRow('Position', c + ', ' + r);
        addRow('Room', roomId >= 0 ? roomId : '— (unassigned)');
        if (roomId >= 0) {
            var room = getRoom(roomId);
            if (room) {
                addRow('Room Label', room.label);
                addRow('Room Cells', room.cells.length);
                addRow('Has Hero', room.heroStart ? 'Yes' : 'No');
                addRow('Boss Room', room.boss ? 'Yes' : 'No');
                // Find connections
                var cons = getRoomConnections(roomId);
                addRow('Connections', cons.length > 0 ? cons.join(', ') : 'none');
                // Spawn mobs from room
                addRow('Spawn Mobs', room.spawn && room.spawn.length ? room.spawn.join(', ') : 'default');
            }
        }
        panel.appendChild(dl);

        var closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.cssText = 'margin-top:10px;background:#111122;color:#ddd;border:1px solid #555;padding:4px 12px;cursor:pointer;font-family:Share Tech Regular,monospace;';
        closeBtn.onclick = function() { overlay.remove(); };
        panel.appendChild(closeBtn);

        overlay.appendChild(panel);
        document.body.appendChild(overlay);
    }

    // ── Connection Detection ─────────────────────────────────────────
    function getRoomConnections(roomId) {
        var connected = {};
        for (var r = 0; r < state.gridH; r++) {
            for (var c = 0; c < state.gridW; c++) {
                if (state.cells[r][c] === roomId) {
                    var neighbors = [[-1,0],[1,0],[0,-1],[0,1]];
                    for (var n = 0; n < neighbors.length; n++) {
                        var nr = r + neighbors[n][0], nc = c + neighbors[n][1];
                        if (nr < 0 || nr >= state.gridH || nc < 0 || nc >= state.gridW) continue;
                        var nId = state.cells[nr][nc];
                        if (nId >= 0 && nId !== roomId) connected[nId] = true;
                    }
                }
            }
        }
        return Object.keys(connected).map(Number);
    }

    // ── Export ───────────────────────────────────────────────────────
    window.exportJSON = function() {
        // Collect room data
        var roomData = [];
        for (var i = 0; i < state.rooms.length; i++) {
            var room = state.rooms[i];
            var cons = getRoomConnections(room.id);
            // Normalize cells to [col, row] (j, i) — game convention
            var cells = room.cells.map(function(c) { return [c[1], c[0]]; });
            // Detect shared edges for doors
            var doors = [];
            for (var ci = 0; ci < room.cells.length; ci++) {
                var rc = room.cells[ci][0], cc = room.cells[ci][1];
                var neighbors = [[-1,0],[1,0],[0,-1],[0,1]];
                var dirNames = ['NORTH', 'SOUTH', 'WEST', 'EAST'];
                for (var n = 0; n < neighbors.length; n++) {
                    var nr = rc + neighbors[n][0], nc = cc + neighbors[n][1];
                    if (nr < 0 || nr >= state.gridH || nc < 0 || nc >= state.gridW) continue;
                    var nId = state.cells[nr][nc];
                    if (nId >= 0 && nId !== room.id) {
                        doors.push({ to: nId, fromCell: [cc, rc], dir: dirNames[n] });
                    }
                }
            }
            // Deduplicate doors
            var seen = {};
            var uniqueDoors = [];
            for (var d = 0; d < doors.length; d++) {
                var key = doors[d].to + ':' + doors[d].dir + ':' + doors[d].fromCell[0] + ':' + doors[d].fromCell[1];
                if (!seen[key]) { seen[key] = true; uniqueDoors.push(doors[d]); }
            }

            roomData.push({
                id: room.id,
                label: room.label,
                cells: cells,
                connections: cons,
                doors: uniqueDoors,
                heroStart: room.heroStart || false,
                boss: room.boss || false,
                spawn: room.spawn || [],
                theme: room.theme || null,
                tags: room.tags || []
            });
        }

        readLoadoutFromDOM();

        var planTheme = (document.getElementById('theme-plan') || {}).value || 'default';
        var output = {
            version: 2,
            description: 'Dark Clues custom level — created with Level Creator',
            theme: planTheme,
            generator: 'Dev-Tools/level-creator/creator.js + Layout_System.js',
            gridW: state.gridW,
            gridH: state.gridH,
            heroStart: state.heroPos ? [state.heroPos[1], state.heroPos[0]] : [0, 0],
            bossRoomId: state.bossRoomId,
            rooms: roomData,
            character: {
                name: state.loadout.name,
                hpBonus: state.loadout.hpBonus,
                stockBonus: state.loadout.stockBonus,
                colorScheme: state.loadout.colorScheme
            }
        };

        jsonOut.value = JSON.stringify(output, null, 2);
        outputEl.style.display = 'block';
        jsonOut.style.display = '';
        setStatus('JSON exported (' + roomData.length + ' rooms, ' + state.gridW + '×' + state.gridH + ' grid)');
    };

    window.copyJSON = function() {
        jsonOut.select();
        document.execCommand('copy');
        setStatus('Copied to clipboard');
    };

    window.downloadJSON = function() {
        var blob = new Blob([jsonOut.value], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'plan.json';
        a.click();
        URL.revokeObjectURL(url);
        setStatus('Downloaded plan.json');
    };

    window.closeOutput = function() {
        outputEl.style.display = 'none';
    };

    // ── Import ───────────────────────────────────────────────────────
    window.importJSON = function(event) {
        var file = event.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function(e) {
            try {
                var data = JSON.parse(e.target.result);
                if (!data.rooms || !data.gridW || !data.gridH) {
                    setStatus('Invalid JSON — missing rooms, gridW, or gridH');
                    return;
                }
                loadFromData(data);
                setStatus('Imported ' + data.rooms.length + ' rooms from ' + file.name);
            } catch(err) {
                setStatus('Parse error: ' + err.message);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    function loadFromData(data) {
        state.gridW = data.gridW;
        state.gridH = data.gridH;
        document.getElementById('gridW').value = state.gridW;
        document.getElementById('gridH').value = state.gridH;

        // Clear and init cells
        state.cells = [];
        for (var r = 0; r < state.gridH; r++) {
            var row = [];
            for (var c = 0; c < state.gridW; c++) row.push(-1);
            state.cells.push(row);
        }

        state.rooms = [];
        state.nextRoomId = 0;
        state.heroPos = null;
        state.bossRoomId = -1;

        // Load rooms
        for (var i = 0; i < data.rooms.length; i++) {
            var rd = data.rooms[i];
            var id = state.nextRoomId++;
            var color = ROOM_COLORS[id % ROOM_COLORS.length];
            var cells = (rd.cells || []).map(function(c) { return [c[1], c[0]]; }); // [col,row] → [row,col]
            state.rooms.push({
                id: id,
                label: rd.label || 'Room ' + id,
                color: rd.color || color,
                cells: cells,
                heroStart: rd.heroStart || false,
                boss: rd.boss || false,
                spawn: rd.spawn || [],
                theme: rd.theme || null,
                tags: Array.isArray(rd.tags) ? rd.tags.slice() : []
            });
            // Populate grid cells
            for (var ci = 0; ci < cells.length; ci++) {
                state.cells[cells[ci][0]][cells[ci][1]] = id;
            }
            if (rd.boss) state.bossRoomId = id;
        }

        // Hero start
        if (data.heroStart) {
            state.heroPos = [data.heroStart[1], data.heroStart[0]];
        }

        // Load character if present
        if (data.character) {
            state.loadout.name = data.character.name || 'Detective';
            state.loadout.hpBonus = data.character.hpBonus || 0;
            state.loadout.stockBonus = data.character.stockBonus || 0;
            state.loadout.colorScheme = data.character.colorScheme || 'default';
        } else {
            state.loadout = { name: 'Detective', hpBonus: 0, stockBonus: 0, colorScheme: 'default' };
        }
        applyLoadoutToDOM();

        resizeCanvas();
        renderLegend();
        render();
        renderEncounters();
    }

    // ── Character Loadout ─────────────────────────────────────────────
    function applyLoadoutToDOM() {
        var l = state.loadout;
        document.getElementById('char-name').value = l.name;
        document.getElementById('char-hp').textContent = l.hpBonus;
        document.getElementById('char-stock').textContent = l.stockBonus;
        document.getElementById('char-theme').value = l.colorScheme;
    }

    function readLoadoutFromDOM() {
        state.loadout.name = document.getElementById('char-name').value || 'Detective';
        state.loadout.hpBonus = parseInt(document.getElementById('char-hp').textContent) || 0;
        state.loadout.stockBonus = parseInt(document.getElementById('char-stock').textContent) || 0;
        state.loadout.colorScheme = document.getElementById('char-theme').value || 'default';
    }

    window.charStat = function(type, delta) {
        var el = document.getElementById('char-' + type);
        var val = parseInt(el.textContent) + delta;
        val = Math.max(-1, Math.min(3, val));
        el.textContent = val;
        readLoadoutFromDOM();
    };

    window.resetLoadout = function() {
        state.loadout = { name: 'Detective', hpBonus: 0, stockBonus: 0, colorScheme: 'default' };
        applyLoadoutToDOM();
        setStatus('Character loadout reset to defaults');
    };

    // ── Encounters ────────────────────────────────────────────────────
    var ENEMY_MANIFEST = [];

    function loadEnemyManifest() {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '../../assets/enemies/manifest.json', true);
        xhr.onload = function() {
            if (xhr.status === 200) {
                try { ENEMY_MANIFEST = JSON.parse(xhr.responseText); } catch(e) { ENEMY_MANIFEST = []; }
            } else {
                ENEMY_MANIFEST = [];
            }
            populateEnemySelect();
        };
        xhr.onerror = function() {
            ENEMY_MANIFEST = [];
            populateEnemySelect();
        };
        xhr.send();
    }

    function populateEnemySelect() {
        var sel = document.getElementById('enemy-select');
        if (!sel) return;
        sel.innerHTML = '<option value="">-- Select Enemy --</option>';
        for (var i = 0; i < ENEMY_MANIFEST.length; i++) {
            var opt = document.createElement('option');
            opt.value = ENEMY_MANIFEST[i].name.toLowerCase();
            opt.textContent = ENEMY_MANIFEST[i].name;
            sel.appendChild(opt);
        }
    }

    function renderEncounters() {
        var panel = document.getElementById('encounter-room-panel');
        if (!panel) return;
        if (state.activeRoomId < 0) {
            panel.style.display = 'none';
            return;
        }
        var room = getRoom(state.activeRoomId);
        if (!room) {
            panel.style.display = 'none';
            return;
        }
        panel.style.display = 'block';
        document.getElementById('encounter-room-label').textContent = room.label;
        document.getElementById('encounter-room-id').textContent = '(id:' + room.id + ')';
        loadEnemyDataForRoom(room);
        renderSpawnList(room);
        renderThemePanel(room);
    }

    // ── Theme Panel ─────────────────────────────────────────────────
    function renderThemePanel(room) {
        var panel = document.getElementById('theme-room-panel');
        if (!panel) return;
        if (!room || state.activeRoomId < 0) { panel.style.display = 'none'; return; }
        panel.style.display = 'block';
        document.getElementById('theme-room-label').textContent = room.label || ('Room ' + (room.id != null ? room.id : ''));
        var sel = document.getElementById('theme-preset');
        if (sel) {
            var cur = room.theme || (room.tags && room.tags.length ? room.tags[0] : '');
            sel.value = cur || '';
        }
        var out = document.getElementById('theme-output');
        if (out) out.textContent = JSON.stringify({ theme: room.theme || null, tags: room.tags || [], spawn: room.spawn || [] }, null, 2);
    }

    window.setRoomTheme = function(preset) {
        var room = getRoom(state.activeRoomId);
        if (!room) return;
        room.theme = preset || null;
        renderThemePanel(room);
        setStatus('Theme set to ' + (preset || 'default'));
    };

    window.addRoomTag = function() {
        var room = getRoom(state.activeRoomId);
        if (!room) return;
        var input = document.getElementById('theme-tag-input');
        if (!input) return;
        var tag = (input.value || '').trim();
        if (!tag) return;
        if (!room.tags) room.tags = [];
        if (room.tags.indexOf(tag) === -1) room.tags.push(tag);
        input.value = '';
        renderThemePanel(room);
        setStatus('Tag added: ' + tag);
    };

    window.removeRoomTag = function(tag) {
        var room = getRoom(state.activeRoomId);
        if (!room || !room.tags) return;
        var idx = room.tags.indexOf(tag);
        if (idx >= 0) room.tags.splice(idx, 1);
        renderThemePanel(room);
    };



    function renderSpawnList(room) {
        var list = document.getElementById('spawn-list');
        list.innerHTML = '';
        var spawns = room.spawn || [];
        if (spawns.length === 0) {
            list.innerHTML = '<div style="color:#555;font-style:italic;padding:4px 0;">No enemies assigned — uses game default spawns</div>';
            return;
        }
        for (var i = 0; i < spawns.length; i++) {
            var key = spawns[i].toLowerCase();
            var eData = ENEMY_CACHE[key];
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:4px;padding:3px 4px;margin:2px 0;background:#1a1a33;';
            var glyph = document.createElement('span');
            glyph.textContent = eData ? (eData.glyph || '?') : '?';
            glyph.style.cssText = 'color:#f88;width:16px;text-align:center;font-size:13px;';
            row.appendChild(glyph);
            var nameEl = document.createElement('span');
            nameEl.textContent = eData ? eData.name : key;
            nameEl.style.cssText = 'color:#ddd;flex:1;';
            row.appendChild(nameEl);
            if (eData) {
                var stats = document.createElement('span');
                stats.textContent = 'HP:' + eData.hp + ' DMG:' + eData.damage;
                stats.style.cssText = 'color:#f88;font-size:10px;margin-right:4px;';
                row.appendChild(stats);
                var beh = document.createElement('span');
                beh.textContent = eData.state || '';
                beh.style.cssText = 'color:#888;font-size:10px;margin-right:4px;';
                row.appendChild(beh);
            } else {
                fetchEnemyData(key, function(data) {
                    if (data && state.activeRoomId >= 0) {
                        var r = getRoom(state.activeRoomId);
                        if (r) renderSpawnList(r);
                    }
                });
            }
            var del = document.createElement('button');
            del.textContent = 'x';
            del.style.cssText = 'background:none;border:none;color:#f44;cursor:pointer;font-size:11px;padding:0 4px;';
            del.title = 'Remove ' + key;
            del.onclick = (function(k) { return function() { removeSpawnFromRoom(k); }; })(key);
            row.appendChild(del);
            list.appendChild(row);
        }
    }

    var ENEMY_CACHE = {};

    function fetchEnemyData(key, callback) {
        if (ENEMY_CACHE[key]) { callback(ENEMY_CACHE[key]); return; }
        for (var i = 0; i < ENEMY_MANIFEST.length; i++) {
            if (ENEMY_MANIFEST[i].name.toLowerCase() === key) {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', '../../assets/enemies/' + ENEMY_MANIFEST[i].file, true);
                xhr.onload = function() {
                    if (xhr.status === 200) {
                        try {
                            var data = JSON.parse(xhr.responseText);
                            ENEMY_CACHE[data.name.toLowerCase()] = data;
                            callback(data);
                        } catch(e) { callback(null); }
                    } else { callback(null); }
                };
                xhr.onerror = function() { callback(null); };
                xhr.send();
                return;
            }
        }
        callback(null);
    }

    function loadEnemyDataForRoom(room) {
        var spawns = room.spawn || [];
        spawns.forEach(function(key) {
            fetchEnemyData(key, function(data) {
                if (data) ENEMY_CACHE[key] = data;
            });
        });
    }

    window.addSpawnToRoom = function() {
        var sel = document.getElementById('enemy-select');
        if (!sel || !sel.value) { setStatus('Select an enemy type first'); return; }
        var key = sel.value;
        var room = getRoom(state.activeRoomId);
        if (!room) { setStatus('No active room selected'); return; }
        if (!room.spawn) room.spawn = [];
        if (room.spawn.indexOf(key) >= 0) { setStatus('Enemy already assigned to this room'); return; }
        room.spawn.push(key);
        fetchEnemyData(key, function(data) {
            if (data) ENEMY_CACHE[key] = data;
            renderSpawnList(room);
        });
        renderSpawnList(room);
        setStatus('Added ' + key + ' to ' + room.label);
    };

    function removeSpawnFromRoom(key) {
        var room = getRoom(state.activeRoomId);
        if (!room || !room.spawn) return;
        var idx = room.spawn.indexOf(key);
        if (idx >= 0) room.spawn.splice(idx, 1);
        renderSpawnList(room);
        setStatus('Removed ' + key + ' from ' + room.label);
    }

    // ── Events ───────────────────────────────────────────────────────
    function bindEvents() {
        canvas.addEventListener('click', onCanvasClick);
        canvas.addEventListener('mousemove', onCanvasDrag);
        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            if (e.key === '1') setTool('paint');
            if (e.key === '2') setTool('erase');
            if (e.key === '3') setTool('hero');
            if (e.key === '4') setTool('boss');
            if (e.key === '5') setTool('info');
            if (e.key === 'r' || e.key === 'R') resizeGrid();
        });
    }

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
