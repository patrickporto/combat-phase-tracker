import { OSECombatTracker } from "./combat-tracker.js";
import { CANONICAL_NAME, TEMPLATE_PATH } from "./constants.js";
import "./combat-phase-tracker.css";
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
