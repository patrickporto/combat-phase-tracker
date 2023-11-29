import { OSECombatTracker } from "./combat-tracker.js";
import { CANONICAL_NAME, TEMPLATE_PATH } from "./constants.js";
import "./ose-combat-tracker.css";
import { combatTrackerPhases } from "./phases.js";

const api = {
    combatTrackerPhases,
}

Hooks.on('init', async () => {
    if (!game.modules.get("petitevue-lib")?.active) {
        ui.notifications.error("PetiteVue is not installed or not active. Please install and activate it to use this module.")
        return
    }
    game.modules.get(CANONICAL_NAME).api = api
    CONFIG.ui.combat = OSECombatTracker;
    CONFIG.ui.combat.combatTrackerPhases = api.combatTrackerPhases
    await loadTemplates({
        combatants: `${TEMPLATE_PATH}/combatants.html`,
        placeholders: `${TEMPLATE_PATH}/placeholders.html`,
    });
    Hooks.callAll(`${CANONICAL_NAME}.init`, api);
});

Hooks.on(`${CANONICAL_NAME}.init`, async ({ combatTrackerPhases }) => {
    combatTrackerPhases.add({
        name: 'OSECOMBATTRACKER.DeclareSpellsAndRetreats',
        cssClass: 'ose-declare-spells-and-retreats',
        controls: [
            {
                content: '<i class="fas fa-magic">',
                tooltip: 'Declare Spells',
                onClick({ combatant, addCombatantCssClass, removeCombatantCssClass }) {
                    const declareSpells = combatant.getFlag(CANONICAL_NAME, 'declareSpells') ?? false
                    combatant.setFlag(CANONICAL_NAME, 'declareSpells', !declareSpells)
                    if (declareSpells) {
                        addCombatantCssClass(combatant.id, 'declare-spells')
                    } else {
                        removeCombatantCssClass(combatant.id, 'declare-spells')
                    }
                },
                onActivate({ combat }) {
                    for (const combatant of combat.combatants) {
                        combatant.setFlag(CANONICAL_NAME, 'declareSpells', false)
                    }
                }
            }
        ]
    })
    combatTrackerPhases.add({
        name: 'OSECOMBATTRACKER.Initiative',
        cssClass: 'ose-initiative',
        showPlaceholders: true,
        async onActivate({ combat, createPlaceholder }) {
            let friendly = new Roll('1d6')
            let hostile = new Roll('1d6')
            await Promise.all([
                friendly.roll(),
                hostile.roll()
            ])
            while (friendly.total === hostile.total) {
                friendly = new Roll('1d6')
                hostile = new Roll('1d6')
                await Promise.all([
                    friendly.roll(),
                    hostile.roll()
                ])
            }
            combat.setFlag(CANONICAL_NAME, 'initiative', {
                friendly: friendly.total,
                hostile: hostile.total,
            })
            await Promise.all([
                friendly.toMessage({
                    flavor: 'Friendly Initiative'
                }),
                hostile.toMessage({
                    flavor: 'Hostile Initiative'
                }),
            ])
            createPlaceholder({
                name: 'Friendly',
                details: friendly.total,
                cssClass: 'ose-friendly-initiative',
            })
            createPlaceholder({
                name: 'Hostile',
                details: hostile.total,
                cssClass: 'ose-hostile-initiative',
            })
        }
    })
    combatTrackerPhases.add({
        name: 'OSECOMBATTRACKER.WinningActs',
        cssClass: 'ose-winning-acts',
        getCombatants(combat) {
            const initiative = combat.getFlag(CANONICAL_NAME, 'initiative')
            if (!initiative) {
                return []
            }
            const winner = initiative.friendly > initiative.hostile ? CONST.TOKEN_DISPOSITIONS.FRIENDLY : CONST.TOKEN_DISPOSITIONS.HOSTILE

            return combat.combatants.filter(c => c.token.disposition === winner)
        },
        subPhases: [
            {
                name: 'OSECOMBATTRACKER.Movement',
                cssClass: 'ose-movement',
            },
            {
                name: 'OSECOMBATTRACKER.MissileAttacks',
                cssClass: 'ose-missile-attacks',
            },
            {
                name: 'OSECOMBATTRACKER.SpellCasting',
                cssClass: 'ose-spell-casting',
            },
            {
                name: 'OSECOMBATTRACKER.MeleeAttacks',
                cssClass: 'ose-melee-attacks',
            }
        ]
    })
    combatTrackerPhases.add({
        name: 'OSECOMBATTRACKER.OtherSidesAct',
        cssClass: 'ose-winning-acts',
        getCombatants(combat) {
            const initiative = combat.getFlag(CANONICAL_NAME, 'initiative')
            if (!initiative) {
                return []
            }
            const winner = initiative.friendly > initiative.hostile ? CONST.TOKEN_DISPOSITIONS.FRIENDLY : CONST.TOKEN_DISPOSITIONS.HOSTILE

            return combat.combatants.filter(c => c.token.disposition !== winner)
        },
        subPhases: [
            {
                name: 'OSECOMBATTRACKER.Movement',
                cssClass: 'ose-movement',
            },
            {
                name: 'OSECOMBATTRACKER.MissileAttacks',
                cssClass: 'ose-missile-attacks',
            },
            {
                name: 'OSECOMBATTRACKER.SpellCasting',
                cssClass: 'ose-spell-casting',
            },
            {
                name: 'OSECOMBATTRACKER.MeleeAttacks',
                cssClass: 'ose-melee-attacks',
            }
        ]
    })
});
