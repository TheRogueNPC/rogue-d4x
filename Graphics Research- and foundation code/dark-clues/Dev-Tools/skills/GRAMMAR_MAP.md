# Grammar Map — Tracery (clue text generation)

The clue text system (`modules/tracery/tracery.js`) is a Tracery-style
context-free grammar engine. This is the syntax reference; for the
runtime workflow (testing rules live, persisting them, the `addClueRule()`
shorthand) see `Dev-Tools/skills/workflows/iterate-clues.md` — that doc
covers *how to use it*, this one covers *what the syntax means*.

## Where it lives

```
Clue.grammar  (static, one shared instance for all clues)
  = new Grammar(JSON.parse(Assets.getText("clues")))   // loads assets/clues.json
  grammar.defaultSelector = DeckRuleSelector             // no-repeat-until-exhausted draws
  grammar.addModifiers(ModsEngBasic.get())               // English text modifiers, see below

Per-clue: this.text = Clue.grammar.flatten("#clue#")     // root symbol is "#clue#"
```

`assets/clues.json` is a plain object: `{ "symbolName": ["rule one", "rule two", ...], ... }`.
The top-level `"clue"` key is the entry point every clue expands from.

## Symbol syntax

| Syntax | Meaning |
|---|---|
| `#name#` | Expand symbol `name` — picks one rule from its RuleSet and recursively expands any symbols inside it |
| `{a\|b\|c}` | Inline choice — compiled into an auto-named sub-symbol at parse time, picks one of `a`/`b`/`c` |
| `#name.modifier#` | Expand `name`, then pipe the result through `modifier` (dot-chainable: `#name.capitalize.s#`) |
| `[target:rule]` | Action — push `rule` onto symbol `target`'s rule stack for the rest of this expansion (see Actions below) |
| `set flagName` / `clear flagName` | Action shorthand — sets/clears a grammar flag (see Conditional rules below) |

## Conditional / weighted rules

A rule string can be prefixed with `CONDITION?-`:

```
"0.3?-a rare golden idol"      // numeric condition → probability: ~30% chance this rule is even considered
"hasKey?-the locked door creaks open"   // non-numeric condition → flag expression
"hasKey&!isDark?-you can see the lock"  // flag expressions support & (AND) and ! (NOT)
```

How it's evaluated (`Grammar.validateRule`, tracery.js):
1. Text before `?-` is parsed with `parseFloat`.
2. If it's a valid number → treated as a probability threshold (0.0–1.0); a
   deterministic RNG roll (`Random.seed * 48271 % 2^31`, normalized) decides
   whether the rule is kept for this expansion.
3. If it's NOT a number → treated as a flag expression and evaluated with
   `Grammar.eval()` (supports `&` and `!`).
4. If the condition fails, the rule is skipped entirely for that draw — it
   doesn't get picked, not even with 0% weight wasted.

Flags can also gate an **entire alternate symbol**, not just one rule —
`Grammar.selectRule()` checks every active flag for a symbol literally named
`"FLAG?-key"` before falling back to `key` itself. So `set spooky` followed
by content under symbol `"spooky?-clue"` overrides the normal `"clue"` rules
while that flag is active.

## English modifiers (`ModsEngBasic`, registered by default)

Available via `#symbol.modifierName#` on any clue symbol:

| Modifier | Effect |
|---|---|
| `capitalize` | Capitalize the first letter |
| `capitalizeAll` | Capitalize every word |
| `caps` | Same as capitalize (alias) |
| `a` | Prefix with "a"/"an" as appropriate |
| `s` | Pluralize |
| `firstS` | Pluralize, capitalizing only the first letter after |
| `possessive` | Add possessive `'s` |
| `ed` | Past tense |
| `ing` | Present participle |
| `is` / `was` | Verb-form helpers |
| `they` / `them` / `thiss` | Pronoun substitution helpers |

## Selection strategy: DeckRuleSelector

`Clue.grammar.defaultSelector = DeckRuleSelector` means every symbol draws
rules like a shuffled deck — every rule is used once before any repeats,
reshuffling only when the deck empties. This is why repeatedly rerolling
clues (`DBG.rerollClues()`) doesn't show the same flavor text back-to-back
even though selection looks random.

## Runtime API (what you call from console/mods)

```js
var Clue = ModLoader.resolve("com.watabou.sevendrl.characters.Clue");
var grammar = Clue.grammar;          // the shared instance

grammar.pushRules("clue", ["a new rule"]);   // add to a symbol's rule set
grammar.flatten("#clue#");                    // expand a rule string to finished text (read-only test, doesn't affect Clue.text)
grammar.fix("clue");                          // expand AND lock the result for this symbol (subsequent #clue# calls return the same text)
grammar.clearState();                          // reset deck/flag state (called automatically on Clue.reset())
```

Full hands-on workflow (test in console, persist to JSON, the
`addClueRule()` shorthand, building entirely new symbol sets): see
`Dev-Tools/skills/workflows/iterate-clues.md`.

## Reference

- `modules/tracery/tracery.js` — full annotated source (Symbol, RuleSet,
  RuleSelector/DeckRuleSelector, Grammar, NodeAction, TraceryNode, Tracery,
  ModsEngBasic — every class is commented inline)
- `assets/clues.json` — the actual rule data
- `Dev-Tools/mods/change-clues.js` — runtime injection example + `addClueRule()`
