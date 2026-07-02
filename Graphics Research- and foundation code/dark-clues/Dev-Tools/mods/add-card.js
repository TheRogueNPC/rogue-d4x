// ═══════════════════════════════════════════════════════════════════
// MOD: add-card.js — Boost/modify action-card damage
// Cards are drawn each turn; they determine attack damage.
// Default: WEAK=1, NORMAL=2, STRONG=3 (ActionCard._hx_index 0/1/2).
//
// You CANNOT safely add a real 4th ActionCard enum value — it's baked
// into compiled indices in at least 3 places (ActionDeck construction,
// the damage switch inside ActionAttack.engage()'s async onComplete
// callback, and CardIndicator.setCard()'s pin visuals), and engage()
// itself isn't hookable at the granularity needed: the damage value is
// computed deep inside an async closure (the attack animation's
// onComplete callback), not at a method boundary ModLoader can wrap.
//
// The correct interception point is the TARGET's damage(value) method —
// engage() always ends with `ch.damage(dmg)`, so a BEFORE-hook there can
// read/rescale `arguments[0]` right before it's applied, regardless of
// how the caller computed it. This is the same pattern ability.js
// already uses successfully for its own damage-penalty hook.
// ═══════════════════════════════════════════════════════════════════

(function() {
    'use strict';

    // Example: STRONG cards (index 2) have a 25% chance to crit for +2.
    ModLoader.hook('com.watabou.sevendrl.characters.Mob', 'damage', function(value) {
        var hero = window.hero;
        if (hero && hero.card && hero.card._hx_index === 2 && Math.random() < 0.25) {
            arguments[0] = value + 2;
            if (window.__eventLogAdd) window.__eventLogAdd('Critical hit! +2 bonus damage');
        }
    }, null);

    // ── Extend the card indicator visual for the crit chance (optional) ──
    // CardIndicator has no .tf — it has pin1/pin2/pin3 (StatePin instances).
    // ActionCard is a Haxe *enum*, registered in $hxEnums, not $hxClasses —
    // it's never dumped onto `window` the way classes are (confirmed live:
    // window.com_watabou_sevendrl_ActionCard is undefined even after boot).
    // Compare card._hx_index directly instead (0=WEAK, 1=NORMAL, 2=STRONG —
    // the same raw indices the native damage switch in ActionAttack.engage()
    // itself branches on).
    var CardIndicator = ModLoader.resolve('com.watabou.sevendrl.visuals.CardIndicator');
    if (CardIndicator && CardIndicator.prototype.setCard) {
        var _origSetCard = CardIndicator.prototype.setCard;
        CardIndicator.prototype.setCard = function(card) {
            _origSetCard.call(this, card);
            if (card && card._hx_index === 2 && this.pin3 && this.pin3.light) {
                this.pin3.light.set_alpha(0.6); // dimmer glow hints at the crit chance
            }
        };
    }

    if (window.devLog) window.devLog('[mod:add-card] loaded — STRONG cards have a 25% crit chance for +2 damage');
})();
