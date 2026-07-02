# New Developer Start Here

Welcome to Dark Clues. **Read this first.**

---

## What is Dark Clues?

A JavaScript roguelike built by monkey-patching a Haxe-compiled game called SevenDRL.js.

- **You write mods**, not core game code.
- **ModLoader** hooks your mods into the running game.
- **SevenDRL.js** is the compiled game (read-only, never edit).
- **modules/** is a read-only reference mirror of the compiled code.

---

## The 10-Minute Quickstart

1. **Read this (5 min):**
   - `ENTRY_POINT.md` — what loads when, what to edit, what not to touch

2. **Understand the pattern (3 min):**
   - `ONBOARDING.md` sections: Architecture, Critical Facts, Your First 30 Minutes

3. **Add a test feature (2 min):**
   ```bash
   node Dev-Tools/scripts/generate-feature.js mob "TestMob" 2 0xFF0000 "Test"
   # Edit Dev-Tools/mods/test-mob.js
   # Uncomment in Dev-Tools/mods/manifest.js
   # Reload browser (Ctrl+Shift+R)
   # Type in console: DBG.mobs()
   ```

You're done. You've shipped a feature.

---

## Three Documents, Three Purposes

### 1. ENTRY_POINT.md (5 min read)
**Answer:** "What loads when? What can I edit? What can't I touch?"

- Boot sequence (Dev-Tools/index.html → SevenDRL.js → ModLoader → lime.embed → your mods)
- What you can edit (Dev-Tools/mods/, Dev-Tools/skills/, assets/)
- What you CAN'T edit (SevenDRL.js, modules/, runtime/base.js, bare index.html)
- Why each matters
- Timeline of when things load

**Start here if:** You're confused about the architecture or unsure what to edit.

### 2. ONBOARDING.md (20-30 min read)
**Answer:** "How do I start contributing without breaking things?"

- Full architecture explanation (30 seconds → detailed → examples)
- Critical rules you must memorize (8 rules)
- Essential docs (bookmark 8 of them)
- Your first 30 minutes (walkthrough)
- Gotchas (what breaks and why)
- Development workflow (every feature, every time)
- Troubleshooting checklist

**Start here if:** You're a new dev joining the project.

### 3. AI_SYSTEM_PROMPTS.md (Copy into Claude/ChatGPT)
**Answer:** "How do I initialize an AI to work on this project?"

- Primary system prompt (sets up an AI with all the rules, APIs, gotchas)
- Feature-specific prompts (when adding mobs, abilities, encounters, UI)
- How to use (copy-paste, custom instructions, etc.)

**Use this if:** You're delegating work to an AI assistant.

---

## The Full Doc Ecosystem

### For Understanding
- `ENTRY_POINT.md` — entry point & load order
- `ONBOARDING.md` — architecture & critical rules
- `SYSTEM_MAP.md` — full boot sequence with diagrams
- `OPENFL_LIME_SURFACES.md` — every OpenFL/Lime class available

### For Doing
- `QUICK_START.md` — 5-minute patterns
- `Dev-Tools/skills/workflows/add-*.md` — per-feature guides (15 of them)
- `SCRIPTING_REFERENCE.md` — feature generator, progression, content packs
- `modding.md` — ModLoader deep dive

### For Debugging
- `debugging.md` — errors, DBG commands, troubleshooting
- `GLOBALS_REFERENCE.md` — what's on `window`, when to access
- `SIGNALS_REFERENCE.md` — game events, hooks

### For APIs
- `API_REFERENCE.md` — frequently-used Lime/OpenFL classes
- `OPENFL_LIME_SURFACES.md` — complete surface exposure

---

## Your Reading Order

### Day 1: Orientation (30 min)
1. This file (NEW_DEVELOPER_START_HERE.md) — 5 min
2. ENTRY_POINT.md — 5 min
3. ONBOARDING.md critical facts + first 30 minutes — 10 min
4. QUICK_START.md — 5 min
5. Run the test mob example — 5 min

**You are now dangerous.** You can add features without breaking things.

### Week 1: Learn the Patterns (1-2 hours)
- ONBOARDING.md full read — 20 min
- Pick a feature type from `workflows/add-*.md` and read it — 15 min
- Implement your first real feature using that workflow — 30-60 min
- Read the gotchas section of ONBOARDING.md — 10 min

**You now understand the patterns.**

### As Needed: Deep Dives
- `SYSTEM_MAP.md` — when understanding boot sequence matters
- `modding.md` — when you need advanced ModLoader patterns
- `OPENFL_LIME_SURFACES.md` — when you need an API not in API_REFERENCE.md
- `debugging.md` — when something breaks

---

## The Golden Rule

**Everything you do goes in a mod.**

Don't edit:
- SevenDRL.js (compiled bundle, never)
- modules/ (read-only reference)
- runtime/base.js (Haxe runtime)
- Bare index.html (testing only)

Do edit:
- Dev-Tools/mods/*.js (your features)
- Dev-Tools/skills/*.md (documentation)
- assets/ (game content)

---

## Quick Reference

| Question | Doc | Time |
|---|---|---|
| What loads when? | ENTRY_POINT.md | 5 min |
| How do I start? | ONBOARDING.md | 20 min |
| How do I add X? | workflows/add-*.md | 10-20 min |
| What's this error? | debugging.md | 5 min |
| How does ModLoader work? | modding.md | 10 min |
| What's on window? | GLOBALS_REFERENCE.md | 10 min |
| Game events? | SIGNALS_REFERENCE.md | 10 min |
| What OpenFL classes exist? | OPENFL_LIME_SURFACES.md | reference |
| Setting up AI to help? | AI_SYSTEM_PROMPTS.md | copy-paste |

---

## The Feature Generator (Your Swiss Army Knife)

Scaffold any feature in 30 seconds:

```bash
node Dev-Tools/scripts/generate-feature.js mob "Name" 2 0xFF0000 "Desc"
node Dev-Tools/scripts/generate-feature.js ability "Name" 70 2 "Desc"
node Dev-Tools/scripts/generate-feature.js encounter "Name" 1 5 "large" "Desc"
node Dev-Tools/scripts/generate-feature.js pickup "Name" "type" "Desc"
```

Then:
1. Edit the generated file (change SWAP points)
2. Uncomment in manifest.js
3. Reload
4. Test with DBG commands

Done in ~3 minutes per feature.

---

## You're Ready

- ✓ Architecture understood (SevenDRL.js + mods)
- ✓ Know what to edit (Dev-Tools/mods/)
- ✓ Know what not to touch (SevenDRL.js, modules/)
- ✓ Have the docs bookmarked
- ✓ Know how to generate features
- ✓ Know how to test (DBG commands)

**Start contributing.** Pick a workflow doc, follow it, ship a feature.

---

## Next Steps

1. Read ENTRY_POINT.md (5 min)
2. Read ONBOARDING.md (20 min)
3. Pick a feature from workflows/ and implement it
4. Bookmark essential docs for reference
5. Contribute

---

Version: 2026-06-24 | Last updated after comprehensive documentation overhaul
