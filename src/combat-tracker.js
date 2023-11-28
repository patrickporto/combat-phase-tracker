import { TEMPLATE_PATH } from "./constants";
import { combatTrackerPhases } from "./phases";

export class OSECombatTracker extends CombatTracker {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            template: `${TEMPLATE_PATH}/combat-tracker.html`,
            classes: [
                ...super.defaultOptions.classes,
                'ose-combat-tracker'
            ],
        });
    }

    async getData(options = {}) {
        const data = await super.getData(options);
        data.turns = Object.values(combatTrackerPhases.phases)
        data.combatants = []
        for (const combatant of data.combat?.combatants ?? []) {
            if (!combatant.visible) continue;
            data.combatants.push({
                id: combatant.id,
                name: combatant.name,
                img: await this._getCombatantThumbnail(combatant),
                owner: combatant.owner,
                defeated: combatant.defeated,
                hidden: combatant.hidden,
                canPing: (combatant.sceneId === canvas.scene?.id) && game.user.hasPermission("PING_CANVAS")
            })
        }
        return data;
    }
    _onCombatantHoverIn(event) {
        event.preventDefault();
        if (!canvas.ready) return;
    }

    createScope() {
        const combatTracker = this
        const combat = combatTracker.viewed

        return {
            $delimiters: ['[[', ']]'],
            combat,
            phaseId: 0,
            combatants: {},
            phases: this._phases,
            mount() {
                for (const combatant of combat?.combatants ?? []) {
                    this.combatants[combatant.id] = {
                        id: combatant.id,
                        name: combatant.name,
                        owner: combatant.owner,
                        defeated: combatant.defeated,
                        hidden: combatant.hidden,
                        canPing: (combatant.sceneId === canvas.scene?.id) && game.user.hasPermission("PING_CANVAS")
                    }
                }
            },
            selectPhase(phaseIndex) {
                this.phaseId = phaseIndex
            },
            nextPhase() {
                this.phaseId++
                if (this.phaseId > this.phases.length - 1) {
                    this.phaseId = 0
                    combat.nextRound()
                }
            },
            previousPhase() {
                this.phaseId--
                if (this.phaseId < 0) {
                    combat.previousRound()
                    this.phaseId = this.phases.length - 1
                }
            },
            toggleHidden(combatantId) {
                const combatant = combat.combatants.get(combatantId)
                combatant.update({ hidden: !combatant.hidden })
            },
            toggleDefeated(combatantId) {
                const combatant = combat.combatants.get(combatantId)
                combatTracker._onToggleDefeatedStatus(combatant);
            },
            pingCombatant(combatantId) {
                const combatant = combat.combatants.get(combatantId)
                combatTracker._onPingCombatant(combatant)
            }
        };
    }

    async activateListeners(html) {
        super.activateListeners(html);
        if (!this._app) {
            const { createApp } = game.modules.get('petitevue-lib').api
            const scope = await this.createScope()
            this._app = createApp(scope)
        }
        this._app.mount(".ose-combat-tracker")
    }
}
