# WORKFLOW: Running the Game

**This is a step-by-step guide. Follow it exactly. Do not skip steps.**

## Prerequisites
- Node.js installed
- Python 3 installed
- Web browser

## Steps

### 1. Validate the Project
```bash
cd dark-clues
node .strict/validate.js full
```

**Expected output:**
```
✓ ALL CHECKS PASSED
```

If validation fails, **STOP**. Do not proceed. Read error messages and fix issues.

### 2. Start Web Server

Choose ONE option:

**Option A: Python (Recommended)**
```bash
python3 -m http.server 8000
```

**Option B: Node.js**
```bash
npx http-server
```

**Option C: Node built-in (v18.13+)**
```bash
node --experimental-default-type=module -e "
  const http = require('http');
  const fs = require('fs');
  const path = require('path');
  
  http.createServer((req, res) => {
    const file = path.join('.', req.url === '/' ? 'dev.html' : req.url);
    res.setHeader('Content-Type', req.url.endsWith('.js') ? 'application/javascript' : 'text/html; charset=utf-8');
    try {
      res.end(fs.readFileSync(file));
    } catch (e) {
      res.statusCode = 404;
      res.end('404 Not Found');
    }
  }).listen(8000);
  
  console.log('Server running: http://localhost:8000');
"
```

### 3. Open in Browser

Navigate to: **`http://localhost:8000/entry-points/dev.html`**

### 4. Verify Game Loads

Check browser console (`F12` → Console tab) for:

✓ No red error messages  
✓ Hero appears on the map  
✓ Game is playable (can move, attack)  

### 5. Debug If Needed

**If game doesn't load:**

**Error: "Cannot read property 'lime'"**
- Wait 3 seconds
- Refresh page
- Check that `runtime/base.js` loaded (check Network tab in DevTools)

**Error: "Module not found"**
- Run validator: `node .strict/validate.js full`
- Check .workflows/ for what you're trying to do
- Read the error message carefully

**Blank screen:**
- Open DevTools (F12)
- Check Console tab for errors
- Check Network tab - are all files loading?
- Try different entry point: `entry-points/stable.html`

### 6. Using Debug Console

Once game is running, open DevTools console and type:

```javascript
// Check game state
DBG.status()

// List alive mobs
DBG.mobs()

// Print ASCII grid
DBG.grid()

// Heal hero
DBG.heal()

// Deal damage
DBG.damage(1)

// Skip to next level
DBG.nextLevel()
```

## Common Issues

| Issue | Solution |
|-------|----------|
| Port 8000 in use | Use different port: `python3 -m http.server 9000` |
| Blank screen | Refresh page, check DevTools console |
| Module errors | Run `node .strict/validate.js full` |
| "lime not defined" | Wait for page load, refresh |
| Performance lag | Close DevTools, disable inspector mod |

## Next Steps

- **To make changes:** Read `.workflows/ADDING_FEATURE.md`
- **To create mods:** Read `.workflows/CREATING_MOD.md`
- **To understand code:** Read `docs/ARCHITECTURE.md`

---

**Remember:** If you encounter an error, READ THE ERROR MESSAGE CAREFULLY. It tells you exactly what's wrong.
