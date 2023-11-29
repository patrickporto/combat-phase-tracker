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
            user: game.user,
            currentPhase: phases[0],
            currentSubPhase: {},
            combatants: {},
            combatantCssClass: {},
            placeholders: {},
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
            get currentPhaseControls() {
                if (this.currentSubPhase?.controls) {
                    return this.currentSubPhase?.controls
                }
                return this.currentPhase?.controls ?? []
            },
            getSubPhaseCssClass(subPhaseId) {
                const subPhase = this.currentSubPhases.find(p => p.id === subPhaseId)
                let subPhaseCssClass = {
                    active: this.currentSubPhase.id === subPhaseId,
                }
                if (typeof subPhase?.cssClass === 'string') {
                    subPhaseCssClass[subPhase?.cssClass] = true
                } else {
                    subPhaseCssClass = {
                        ...subPhaseCssClass,
                        ...subPhase?.cssClass ?? {}
                    }
                }
                return subPhaseCssClass
            },
            async mount() {
                await this.updateCombatants(combat.combatants)
            },
            createPlaceholder(placeholder) {
                const placeholderId = foundry.utils.randomID()
                this.placeholders[placeholderId] = placeholder
            },
            addCombatantCssClass(combatantId, cssClass) {
                if (!this.combatantCssClass[combatantId]) {
                    this.combatantCssClass[combatantId] = {}
                }
                this.combatantCssClass[combatantId][cssClass] = true
            },
            removeCombatantCssClass(combatantId, cssClass) {
                if (!this.combatantCssClass[combatantId]) {
                    this.combatantCssClass[combatantId] = {}
                }
                this.combatantCssClass[combatantId][cssClass] = false
            },
            toggleCombatantCssClass(combatantId, cssClass) {
                if (!this.combatantCssClass[combatantId]) {
                    this.combatantCssClass[combatantId] = {}
                }
                this.combatantCssClass[combatantId][cssClass] = !this.combatantCssClass[combatantId][cssClass]
            },
            async updateCombatants(combatants) {
                this.combatants = {}
                for (const combatant of combatants) {
                    const cssClass = {
                        hidden: combatant.hidden,
                        defeated: combatant.defeated,
                        ...this.combatantCssClass[combatant.id] ?? {}
                    }
                    this.combatants[combatant.id] = {
                        id: combatant.id,
                        name: combatant.name,
                        owner: combatant.owner,
                        defeated: combatant.defeated,
                        img: await combatTracker._getCombatantThumbnail(combatant),
                        hidden: combatant.hidden,
                        canPing: (combatant.sceneId === canvas.scene?.id) && game.user.hasPermission("PING_CANVAS"),
                        cssClass,
                    }
                }
            },
            handleControlClick(control, combatantId) {
                const combatant = combat.combatants.get(combatantId)
                control.onClick({
                    ...this.phaseApi,
                    combatant,
                })
            },
            get phaseApi() {
                return {
                    createPlaceholder: this.createPlaceholder,
                    combat,
                    addCombatantCssClass: this.addCombatantCssClass,
                    removeCombatantCssClass: this.removeCombatantCssClass,
                    toggleCombatantCssClass: this.toggleCombatantCssClass,
                }
            },
            async changePhase(newPhase) {
                this.placeholders = {}
                combatTrackerPhases.call(`deactivatePhase.${this.currentPhase.id}`, {
                    ...this.phaseApi,
                })
                this.currentPhase = newPhase
                if (newPhase.getCombatants) {
                    await this.updateCombatants(newPhase.getCombatants(combat))
                } else {
                    await this.updateCombatants(combat.combatants)
                }
                combatTrackerPhases.call(`activatePhase.${this.currentPhase.id}`, {
                    ...this.phaseApi,
                })
            },
            async changeSubPhase(newSubPhase) {
                this.placeholders = {}
                combatTrackerPhases.call(`deactivateSubPhase.${this.currentSubPhase.id}`, {
                    ...this.phaseApi,
                })
                if (!newSubPhase) {
                    this.currentSubPhase = {}
                    return
                }
                this.currentSubPhase = newSubPhase
                if (newSubPhase.getCombatants) {
                    await this.updateCombatants(newSubPhase.getCombatants(combat))
                } else if (this.currentPhase.getCombatants) {
                    await this.updateCombatants(this.currentPhase.getCombatants(combat))
                } else {
                    await this.updateCombatants(combat.combatants)
                }
                combatTrackerPhases.call(`activateSubPhase.${this.currentSubPhase.id}`, {
                    ...this.phaseApi,
                })
            },
            async selectPhase(phaseId) {
                const selectedPhase = this.phases.find(p => p.id === phaseId)
                await this.changeSubPhase(selectedPhase?.subPhases?.[0])
                await this.changePhase(selectedPhase)
            },
            async selectSubPhase(subPhaseId) {
                await this.changeSubPhase(this.currentSubPhases.find(p => p.id === subPhaseId))
            },
            async nextSubPhase() {
                if (!this.currentSubPhases.length || this.currentSubPhaseIndex + 1 > this.currentSubPhases.length - 1) {
                    this.nextPhase()
                    return
                }
                const nextSubPhase = this.currentSubPhases[this.currentSubPhaseIndex + 1]
                await this.changeSubPhase(nextSubPhase)
            },
            async previousSubPhase() {
                if (!this.currentSubPhases.length || this.currentSubPhaseIndex - 1 < 0) {
                    this.previousPhase()
                    return
                }
                const previousSubPhase = this.currentSubPhases?.[this.currentSubPhaseIndex - 1]
                await this.changeSubPhase(previousSubPhase)
            },
            async nextPhase() {
                if (this.currentPhaseIndex + 1 > this.phases.length - 1) {
                    combat.nextRound()
                    const nextPhase = this.phases[0]
                    await this.changeSubPhase(Object.values(nextPhase.subPhases || [])[0])
                    await this.changePhase(nextPhase)
                    return
                }
                const nextPhase = this.phases[this.currentPhaseIndex + 1]
                await this.changeSubPhase(Object.values(nextPhase.subPhases || [])[0])
                await this.changePhase(nextPhase)
            },
            async previousPhase() {
                if (this.currentPhaseIndex - 1 < 0) {
                    combat.previousRound()
                    const previousPhase = this.phases[this.phases.length - 1]
                    const previousSubPhases = Object.values(previousPhase.subPhases || [])
                    await this.changeSubPhase(Object.values(previousSubPhases || [])?.[previousSubPhases.length - 1])
                    await this.changePhase(previousPhase)
                    return
                }
                const previousPhase = this.phases[this.currentPhaseIndex - 1]
                const previousSubPhases = Object.values(previousPhase.subPhases || [])
                await this.changeSubPhase(Object.values(previousSubPhases || [])?.[previousSubPhases.length - 1])
                await this.changePhase(previousPhase)
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
