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

        const phases = Object.values(combatTrackerPhases.phases)

        return {
            $delimiters: ['[[', ']]'],
            combat,
            selectedPhase: phases[0],
            combatants: {},
            phases: phases,
            get currentPhaseIndex() {
                return this.phases.findIndex(p => p.id === this.selectedPhase.id)
            },
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
            selectPhase(phaseId) {
                this.selectedPhase = this.phases.find(p => p.id === phaseId)
            },
            nextPhase() {
                if (this.currentPhaseIndex + 1 > this.phases.length - 1) {
                    this.selectedPhase = this.phases[0]
                    combat.nextRound()
                    return
                }
                this.selectedPhase = this.phases[this.currentPhaseIndex + 1]
            },
            previousPhase() {
                if (this.currentPhaseIndex - 1 < 0) {
                    combat.previousRound()
                    this.selectedPhase = this.phases[this.phases.length - 1]
                    return
                }
                this.selectedPhase = this.phases[this.currentPhaseIndex - 1]
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
