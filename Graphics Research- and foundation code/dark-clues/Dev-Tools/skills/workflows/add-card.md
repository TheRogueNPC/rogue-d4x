# Workflow: Modify/Extend Action-Card Damage

`runtime/base.js`/`modules/core/actions.js` are read-only reference mirrors —
editing them does nothing at runtime (see `SYSTEM_MAP.md`). And **you cannot
safely add a real 4th `ActionCard` enum value** — it's baked into compiled
indices in three places (`ActionDeck` construction, the damage switch inside
`ActionAttack.engage()`, `CardIndicator.setCard()`'s pin visuals), all
inside `SevenDRL.js`. `ActionCard` is also a Haxe *enum* (registered in
`$hxEnums`, not `$hxClasses`), so it's never even exported onto `window` the
way classes are — confirmed live: `window.com_watabou_sevendrl_ActionCard`
is `undefined`. Compare card values via `card._hx_index` (0=WEAK, 1=NORMAL,
2=STRONG) instead of trying to resolve the enum.

## The real interception point

`ActionAttack.engage()` itself isn't hookable at the granularity you'd want
— the damage value is computed deep inside an **async closure** (the attack
animation's `onComplete` callback), not at a method boundary `ModLoader` can
wrap with before/after. It always ends with `ch.damage(dmg)`, so hook the
TARGET's `damage(value)` method instead — a before-hook can read and rescale
`arguments[0]` right before it's applied, regardless of how the caller
computed it. `ability.js` already uses this exact pattern for its own
damage-penalty hook.

## Steps

### 1. Copy the template

`Dev-Tools/mods/add-card.js` is a working example: STRONG cards (index 2)
get a 25% chance to crit for +2 damage.

```js
ModLoader.hook('com.watabou.sevendrl.characters.Mob', 'damage', function(value) {
    var hero = window.hero;
    if (hero && hero.card && hero.card._hx_index === 2 && Math.random() < 0.25) {
        arguments[0] = value + 2;
        if (window.__eventLogAdd) window.__eventLogAdd('Critical hit! +2 bonus damage');
    }
}, null);
```

Hook `'com.watabou.sevendrl.characters.Hero'` too if you also want the
modifier to apply when mobs attack the hero (same method name, same pattern,
opposite direction).

### 2. Visual feedback (optional)

`CardIndicator` has no `.tf` — it's `pin1`/`pin2`/`pin3` (`StatePin`
instances, each with a `.light` child sprite you can fade). Monkey-patch
`setCard()`:

```js
var CardIndicator = ModLoader.resolve('com.watabou.sevendrl.visuals.CardIndicator');
var _origSetCard = CardIndicator.prototype.setCard;
CardIndicator.prototype.setCard = function(card) {
    _origSetCard.call(this, card);
    if (card && card._hx_index === 2 && this.pin3 && this.pin3.light) {
        this.pin3.light.set_alpha(0.6);
    }
};
```

### 3. A genuinely new resource instead of a new card

If what you actually want is a new *mechanic* (not a damage tweak to an
existing card), don't fight the enum — layer a parallel system on top, the
same way `ability-pickup.js` added a whole per-type charge economy
(`window.__abilityCharges`) without touching `ActionCard` at all. See
`add-ability.md` for that pattern.

### 4. Test

Enable the mod (uncomment in `manifest.js`), Ctrl+Shift+R, fight something
with a STRONG card drawn and watch the event log for crit messages.

## Reference
- `Dev-Tools/mods/add-card.js` — working template
- `Dev-Tools/mods/ability.js` — the original `Hero.damage` before/after hook this pattern is based on
- `modules/IN_OUT_GLOSSARY.md` §6 — card system pipeline (damage formula table)
