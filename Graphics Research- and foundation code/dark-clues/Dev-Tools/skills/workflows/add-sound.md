# Workflow: Add Custom Sound Effects

## Prerequisites
- Read `modules/IN_OUT_GLOSSARY.md` §1 (Asset Pipeline — Sounds)
- Read `modules/core/audio.js` — understand the Sounds manager

## Steps

### 1. Prepare your audio file

- Format: `.ogg` (Vorbis) — required for web playback
- Duration: keep short (< 5 seconds for SFX, any length for ambient)
- Sample rate: 44100 Hz recommended
- Channels: mono or stereo

### 2. Place the file

Copy your `.ogg` file to `assets/`:
```
dark-clues/assets/your_sound.ogg
```

### 3. Register in asset manifest

In `SevenDRL.js`, find the manifest JSON string (around line 3498).
Add your sound entry:

```json
{
    "id": "your_sound",
    "type": "sound",
    "size": 12345,
    "path": "assets/your_sound.ogg"
}
```

**Note:** The manifest is embedded as a JSON string in the compiled bundle.
If you're working with the extracted modules, you'll need to also update
the original `SevenDRL.js` manifest.

### 4. Play the sound

**One-shot SFX:**
```js
com_watabou_sevendrl_Sounds.event("your_sound");

// With volume (0.0 - 1.0):
com_watabou_sevendrl_Sounds.event("your_sound", 0.5);

// With pitch offset (-12 to +12 semitones):
com_watabou_sevendrl_Sounds.event("your_sound", 1.0, 3);  // 3 semitones up
```

**Ambient loop:**
```js
// Start ambient (loops with fade-in):
com_watabou_sevendrl_Sounds.enviro("your_ambient");

// Stop ambient (fades out):
com_watabou_sevendrl_Sounds.enviro(null);
```

### 5. Common sound hook points

| Event | Where to call | File |
|-------|---------------|------|
| Hero moves | `Hero.getCloser()` | `characters.js` |
| Hero attacks | `ActionAttack.engage()` | `actions.js` |
| Mob attacks | `StateChasing.engage()` | `states.js` |
| Clue collected | `Clue.playJingle()` | `characters.js` |
| Hero dies | `Hero.die()` | `characters.js` |
| Boss dies | `Boss.die()` | `characters.js` |
| Game starts | `GameScene` constructor | `scenes.js` |
| Game over | `GameScene.onGameOver()` | `scenes.js` |
| New room | `Hero.setPos()` → `roomChanged` signal | `characters.js` |
| Card drawn | `Hero.pullCard()` → `cardChanged` signal | `characters.js` |

### 6. Pitch-shifting (advanced)

The `Sounds` class caches pitch-shifted variants of each sound (-12 to +12
semitones). This is used for the clue jingle (random pitch) and attack sounds
(random offset).

To use pitch-shifting:
```js
// Play at +3 semitones (higher pitch):
Sounds.event("clue_note", 1.0, 3);

// Play at -5 semitones (lower pitch):
Sounds.event("clue_note", 1.0, -5);
```

### 7. Test

Refresh the browser. Trigger the event where you added the sound.
Check the console for asset loading errors.

## Reference
- `IN_OUT_GLOSSARY.md` §1 — sound asset table
- `modules/core/audio.js` — Sounds.event(), Sounds.enviro(), Sounds.getResampled()
- `assets/` — audio files
