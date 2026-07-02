# WORKFLOWS — Step-by-Step Procedures

**These documents are your instruction manual.** Follow them exactly. Do not deviate.

## Before You Do Anything

1. **Read `.PROJECT_RULES.md`** — The law. Non-negotiable.
2. **Choose your workflow below**
3. **Follow it step-by-step**
4. **When done, validate** — `node .strict/validate.js full`

## Workflow Guides

### [`RUNNING_GAME.md`](./RUNNING_GAME.md)
Start here if you want to play the game or test changes.
- Start web server
- Open in browser
- Debug if needed
- Use debug console

### [`ADDING_FEATURE.md`](./ADDING_FEATURE.md)
Follow this when modifying game logic.
- Plan the change
- Find dependencies
- Update dependent files
- Validate
- Commit

### [`CREATING_MOD.md`](./CREATING_MOD.md)  
Use this to extend the game without editing core files.
- Create mod file
- Use ModLoader API
- Register in manifest
- Test changes

### `FIXING_BUG.md` (Not yet created — use ADDING_FEATURE.md as template)

### `VALIDATING_CODE.md` (Not yet created — validation is automated)

## Quick Decision Tree

**I want to...**

→ **Play the game**  
   Run: `RUNNING_GAME.md`

→ **Add/change game logic**  
   Run: `ADDING_FEATURE.md`

→ **Extend game without touching core**  
   Run: `CREATING_MOD.md`

→ **Fix a bug**  
   Run: `ADDING_FEATURE.md` (same process)

→ **Understand architecture**  
   Read: `docs/ARCHITECTURE.md`

## Essential Commands

```bash
# Before ANY change
node .strict/validate.js full

# After finishing a feature
node .strict/analyze-deps.js
node .strict/validate.js full

# Before committing
node .strict/validate.js full
git diff --name-only | grep -v "src/modules"  # Should be empty

# Find what uses a class
node .strict/find-usage.js "ClassName"
```

## Rules That Prevent Corruption

✅ **YOU CAN:**
- Edit files in `src/modules/`
- Create mods in `src/mods/`
- Run validator scripts
- Read any documentation

❌ **YOU CANNOT:**
- Edit `.LOCKED/` files
- Edit `runtime/base.js`
- Create circular dependencies
- Commit without validation

## Common Mistakes

| Mistake | Why It's Wrong | How to Avoid |
|---------|---|---|
| Edit SevenDRL.js | It's compiled; get overwritten | Edit modules instead |
| Skip validation | Breaks the project | Run `validate.js full` |
| Create circular import | Infinite loop | Check `analyze-deps.js` |
| Don't update callers | Code breaks | Use `find-usage.js` |
| Commit without checking | Corrupts Git history | Always validate first |

## Support

**Confused?**
1. Re-read `.PROJECT_RULES.md`
2. Follow the workflow exactly
3. Run the validator

**Still confused?**
1. Read the error message
2. Search the codebase
3. Use `find-usage.js` to trace the issue

**Validator failing?**
1. Read the error carefully
2. Fix the specific issue
3. Re-run validator
4. If still stuck: ask for help with the exact error message

---

**Remember:** These workflows exist to prevent your changes from breaking the game. Follow them and everything works. Skip them and you corrupt the project.

**No exceptions.**
