import { OSECombatTracker } from "./combat-tracker.js";
import { MODULE_NAME } from "./constants.js";
import "./ose-combat-tracker.css";

Hooks.on('init', async () => {
    if (!game.modules.get("petitevue-lib")?.active) {
        ui.notifications.error("PetiteVue is not installed or not active. Please install and activate it to use this module.")
        return
    }
    CONFIG.ui.combat = OSECombatTracker;
    console.log(`${MODULE_NAME} | Initializing ${MODULE_NAME}`);
});
