import { TEMPLATE_PATH } from "./constants";
import { combatTrackerPhases } from "./phases";
import { phaseEvents } from "./phase-events";

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
            currentPhase: phases[0],
            currentSubPhase: {},
            combatants: {},
            phases: phases,
            get currentPhaseIndex() {
                return this.phases.findIndex(p => p.id === this.currentPhase.id)
            },
            get currentSubPhases() {
                return Object.values(this.currentPhase?.subPhases ?? [])
            },
            get currentSubPhaseIndex() {
                return this.currentSubPhases.findIndex(p => p.id === this.currentSubPhase.id)
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
            updateCombatants(combatants) {
                this.combatants = {}
                for (const combatant of combatants) {
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
            get phaseApi() {
                return {
                    updateCombatants: this.updateCombatants,
                    combat,
                }
            },
            changePhase(newPhase) {
                this.currentPhase = newPhase
                phaseEvents.call(`changePhase`, {
                    ...this.phaseApi,
                    phase: newPhase,
                    currentSubPhase: this.currentSubPhase,
                })
            },
            changeSubPhase(newSubPhase) {
                if (!newSubPhase) {
                    this.currentSubPhase = {}
                    return
                }
                this.currentSubPhase = newSubPhase
                phaseEvents.call(`changeSubPhase`, {
                    ...this.phaseApi,
                    phase: this.currentPhase,
                    currentSubPhase: newSubPhase,
                })
            },
            selectPhase(phaseId) {
                const selectedPhase = this.phases.find(p => p.id === phaseId)
                this.changeSubPhase(selectedPhase?.subPhases?.[0])
                this.changePhase(selectedPhase)
            },
            selectSubPhase(subPhaseId) {
                this.changeSubPhase(this.currentSubPhases.find(p => p.id === subPhaseId))
            },
            nextSubPhase() {
                if (!this.currentSubPhases.length || this.currentSubPhaseIndex + 1 > this.currentSubPhases.length - 1) {
                    this.nextPhase()
                    return
                }
                const nextSubPhase = this.currentSubPhases[this.currentSubPhaseIndex + 1]
                this.changeSubPhase(nextSubPhase)
            },
            previousSubPhase() {
                if (!this.currentSubPhases.length || this.currentSubPhaseIndex - 1 < 0) {
                    this.previousPhase()
                    return
                }
                const previousSubPhase = this.currentSubPhases?.[this.currentSubPhaseIndex - 1]
                this.changeSubPhase(previousSubPhase)
            },
            nextPhase() {
                if (this.currentPhaseIndex + 1 > this.phases.length - 1) {
                    combat.nextRound()
                    const nextPhase = this.phases[0]
                    this.changeSubPhase(Object.values(nextPhase.subPhases || [])[0])
                    this.changePhase(nextPhase)
                    return
                }
                const nextPhase = this.phases[this.currentPhaseIndex + 1]
                this.changeSubPhase(Object.values(nextPhase.subPhases || [])[0])
                this.changePhase(nextPhase)
            },
            previousPhase() {
                if (this.currentPhaseIndex - 1 < 0) {
                    combat.previousRound()
                    const previousPhase = this.phases[this.phases.length - 1]
                    const previousSubPhases = Object.values(previousPhase.subPhases || [])
                    this.changeSubPhase(Object.values(previousSubPhases || [])?.[previousSubPhases.length - 1])
                    this.changePhase(previousPhase)
                    return
                }
                const previousPhase = this.phases[this.currentPhaseIndex - 1]
                const previousSubPhases = Object.values(previousPhase.subPhases || [])
                this.changeSubPhase(Object.values(previousSubPhases || [])?.[previousSubPhases.length - 1])
                this.changePhase(previousPhase)
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
