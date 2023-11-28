import { OSECombatTracker } from "./combat-tracker.js";
import { CANONICAL_NAME } from "./constants.js";
import "./ose-combat-tracker.css";
import { combatTrackerPhases } from "./phases.js";

const api = {
    combatTrackerPhases
}

Hooks.on('init', async () => {
    if (!game.modules.get("petitevue-lib")?.active) {
        ui.notifications.error("PetiteVue is not installed or not active. Please install and activate it to use this module.")
        return
    }
    game.modules.get(CANONICAL_NAME).api = api
    CONFIG.ui.combat = OSECombatTracker;
    CONFIG.ui.combat.combatTrackerPhases = api.combatTrackerPhases
});
Hooks.on('setup', async () => {
    Hooks.callAll(`${CANONICAL_NAME}.setup`, api);
});


Hooks.on(`${CANONICAL_NAME}.setup`, async ({ combatTrackerPhases }) => {
    combatTrackerPhases.add({
        name: game.i18n.localize('OSECOMBATTRACKER.DeclareSpellsAndRetreats'),
        cssClass: 'ose-declare-spells-and-retreats',
    })
    combatTrackerPhases.add({
        name: game.i18n.localize('OSECOMBATTRACKER.Initiative'),
        cssClass: 'ose-initiative',
    })
    combatTrackerPhases.add({
        name: game.i18n.localize('OSECOMBATTRACKER.Movement'),
        cssClass: 'ose-movement',
    })
    combatTrackerPhases.add({
        name: game.i18n.localize('OSECOMBATTRACKER.MissileAttacks'),
        cssClass: 'ose-missile-attacks',
    })
    combatTrackerPhases.add({
        name: game.i18n.localize('OSECOMBATTRACKER.SpellCasting'),
        cssClass: 'ose-spell-casting',
    })
    combatTrackerPhases.add({
        name: game.i18n.localize('OSECOMBATTRACKER.MeleeAttacks'),
        cssClass: 'ose-melee-attacks',
    })
});
