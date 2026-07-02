# WORKFLOW: Adding a Game Feature

**Every feature addition must follow these steps. No shortcuts.**

## Step 1: Plan the Feature

Before writing code, fill in this checklist:

- [ ] What file will I edit? (modules/core/XYZ.js)
- [ ] What classes/functions will I need to modify?
- [ ] What other files depend on those classes?
- [ ] Could this create a circular dependency?

**Check dependencies:**
```bash
node .strict/find-usage.js "ClassIModifying"
```

This shows every place that uses the class you're changing.

## Step 2: Create/Edit File

Edit **ONLY** files in `src/modules/`:
- `src/modules/core/` — game logic
- `src/modules/watabou/` — utilities

**DO NOT:**
- Edit `.LOCKED/` files
- Edit runtime files
- Create new files outside src/modules/

## Step 3: Update All Dependents

If you changed a class API:

```bash
node .strict/find-usage.js "YourClassName"
```

Update **EVERY** file in the list.

## Step 4: Validate

```bash
# Check your file
node .strict/validate.js src/modules/core/myfile.js

# Check all files
node .strict/validate.js full
```

**Must pass with no errors.** If validator says "❌", fix it before proceeding.

## Step 5: Generate Fresh Dependencies

```bash
node .strict/analyze-deps.js
```

This updates the dependency graph. Important for future changes.

## Step 6: Commit

Only if all validation passes:

```bash
git add src/modules/
git add .dependencies/
git commit -m "Feature: [description]"
```

## Common Patterns

### Adding a New Method to a Class

1. Add method to class:
```javascript
// In src/modules/core/characters.js
com_watabou_sevendrl_characters_Hero.prototype = {
  // ... existing methods ...
  myNewMethod: function() {
    // Implementation
  }
};
```

2. Find all uses:
```bash
node .strict/find-usage.js "Hero"
```

3. No updates needed unless callers depend on this method existing

### Changing Existing Method Signature

1. Change the method:
```javascript
// BEFORE
,act: function() { ... }

// AFTER
,act: function(param1, param2) { ... }
```

2. Find all callers:
```bash
node .strict/find-usage.js "\.act\("
```

3. Update EVERY caller with new signature

4. Run validator:
```bash
node .strict/validate.js full
```

### Adding a New Import

1. Add import to your file:
```javascript
import "./watabou/utils.js";
```

2. Check if allowed:
```bash
node .strict/validate.js src/modules/core/myfile.js check-deps
```

3. If validator says "❌ Circular", **REMOVE IT**. Do not use this import.

## Troubleshooting

**Validator says "Circular dependency":**
- You are importing something that eventually imports you
- Find alternative approach or use a different pattern
- Ask: "Can I pass this as a parameter instead of importing?"

**Validator says "Syntax error":**
- Use `node --check src/modules/core/myfile.js` to see exactly where
- Fix the syntax error
- Re-run validator

**"File depends on this" but I didn't see it in search:**
- Run find-usage again: `node .strict/find-usage.js "YourClass"`
- Manually search the code for alternative names
- Update those files

## Before Committing

```bash
# Final check
node .strict/validate.js full

# If that passes:
git status
# Make sure you're ONLY touching src/modules/ files
# Do NOT commit any .LOCKED/ files

git add src/modules/
git commit -m "Feature: [clear description]"
```

---

**Key Rule:** If validator fails, you cannot commit. No exceptions.
