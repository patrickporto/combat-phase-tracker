import { CANONICAL_NAME, TEMPLATE_PATH } from "./constants";
import { PHASE_SCOPE, combatTrackerPhases } from "./phases";

const COMBATANT_TYPE = {
    COMBATANT: 'combatant',
    PLACEHOLDER: 'placeholder',
}

export class CombatPhaseTracker extends CombatTracker {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            template: `${TEMPLATE_PATH}/combat-tracker.html`,
            classes: [
                ...super.defaultOptions.classes,
                'combat-phase-tracker'
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

    createScope(html) {
        const combatTracker = this
        const combat = combatTracker.viewed

        return {
            $delimiters: ['[[', ']]'],
            user: game.user,
            currentPhase: combatTrackerPhases.initial,
            currentSubPhase: {},
            combatants: {},
            placeholders: {},
            turnCssClass: {},
            phases: combatTrackerPhases.phases,
            COMBATANT_TYPE,
            get turns() {
                const combatants = this.combatants
                const placeholders = this.placeholders
                return Object.values(combatants).concat(...Object.values(placeholders))
            },
            get currentPhaseIndex() {
                return this.phases.findIndex(p => p.id === this.currentPhase.id)
            },
            get currentSubPhases() {
                return Object.values(this.currentPhase?.subPhases ?? [])
            },
            get currentSubPhaseIndex() {
                return this.currentSubPhases.findIndex(p => p.id === this.currentSubPhase.id)
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
                Hooks.on('combatRound', () => {
                    combatTrackerPhases.removePhasesByScope(PHASE_SCOPE.ROUND)
                    this.phases = combatTrackerPhases.phases
                    this.currentPhase = combatTrackerPhases.initial
                })
                Hooks.on(`${CANONICAL_NAME}.createPhase`, () => {
                    this.phases = combatTrackerPhases.phases
                })
                if (this.currentSubPhase.getCombatants) {
                    await this.updateCombatants(this.currentSubPhase.getCombatants(combat))
                } else if (this.currentPhase.getCombatants) {
                    await this.updateCombatants(this.currentPhase.getCombatants(combat))
                } else {
                    await this.updateCombatants(combat?.combatants ?? [])
                }
                Hooks.callAll(`renderCombatTracker`, combatTracker, html, this.user)
            },
            createPlaceholder(placeholder) {
                const placeholderId = foundry.utils.randomID()
                const newPlaceholder = {
                    ...placeholder,
                    id: placeholderId,
                    type: COMBATANT_TYPE.PLACEHOLDER,
                    cssClass: ['placeholder', placeholder.cssClass].join(' '),
                }
                this.placeholders[placeholderId] = newPlaceholder
                return newPlaceholder
            },
            removePlaceholders() {
                this.placeholders = {}
            },
            addTurnCssClass(combatantId, cssClass) {
                if (!this.turnCssClass[combatantId]) {
                    this.turnCssClass[combatantId] = {}
                }
                this.turnCssClass[combatantId][cssClass] = true
            },
            removeTurnCssClass(combatantId, cssClass) {
                if (!this.turnCssClass[combatantId]) {
                    this.turnCssClass[combatantId] = {}
                }
                this.turnCssClass[combatantId][cssClass] = false
            },
            toggleTurnCssClass(combatantId, cssClass) {
                if (!this.turnCssClass[combatantId]) {
                    this.turnCssClass[combatantId] = {}
                }
                this.turnCssClass[combatantId][cssClass] = !this.turnCssClass[combatantId][cssClass]
            },
            async updateCombatants(combatants) {
                this.combatants = {}
                for (const combatant of combatants) {
                    const cssClass = {
                        hidden: combatant.hidden,
                        defeated: combatant.defeated,
                        combatant: true,
                        ...this.turnCssClass[combatant.id] ?? {}
                    }
                    const resource = combatant.permission >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER ? combatant.resource : null;
                    this.combatants[combatant.id] = {
                        id: combatant.id,
                        type: COMBATANT_TYPE.COMBATANT,
                        name: combatant.name,
                        owner: combatant.owner,
                        defeated: combatant.defeated,
                        initiative: combatant.initiative,
                        hasRolled: combatant.initiative !== null,
                        hasResource: resource !== null,
                        resource: resource,
                        img: await combatTracker._getCombatantThumbnail(combatant),
                        hidden: combatant.hidden,
                        canPing: (combatant.sceneId === canvas.scene?.id) && game.user.hasPermission("PING_CANVAS"),
                        cssClass,
                    }
                }
            },
            async handleControlClick(control, combatantId) {
                const combatant = combat.combatants.get(combatantId)
                control.onClick && control.onClick({
                    ...await this.getPhaseApi(),
                    combatant,
                })
            },
            async handleControlMount(control, combatantId) {
                const combatant = combat.combatants.get(combatantId)
                control.onMount && control.onMount({
                    ...await this.getPhaseApi(),
                    combatant,
                })
            },
            async getPhaseApi() {
                const { combat } = await combatTracker.getData()
                return {
                    turns: Object.values(this.turns),
                    createPlaceholder: this.createPlaceholder,
                    combat: combat,
                    addTurnCssClass: this.addTurnCssClass,
                    removeTurnCssClass: this.removeTurnCssClass,
                    toggleTurnCssClass: this.toggleTurnCssClass,
                    phases: combatTrackerPhases,
                }
            },
            async changePhase(newPhase) {
                this.removePlaceholders()
                const phaseApi = await this.getPhaseApi()
                combatTrackerPhases.call(`deactivatePhase.${this.currentPhase.id}`, phaseApi)
                Hooks.callAll(`${CANONICAL_NAME}.deactivatePhase`, this.currentPhase, phaseApi)
                this.currentPhase = newPhase
                if (newPhase.getCombatants) {
                    await this.updateCombatants(newPhase.getCombatants(combat))
                } else {
                    await this.updateCombatants(combat.combatants)
                }
                this.scrollToPhase(newPhase.id)
                combatTrackerPhases.call(`activatePhase.${this.currentPhase.id}`, phaseApi)
                Hooks.callAll(`${CANONICAL_NAME}.activatePhase`, newPhase, phaseApi)
            },
            async changeSubPhase(newSubPhase) {
                this.removePlaceholders()
                const phaseApi = await this.getPhaseApi()
                combatTrackerPhases.call(`deactivateSubPhase.${this.currentSubPhase.id}`, phaseApi)
                Hooks.callAll(`${CANONICAL_NAME}.deactivateSubPhase`, this.currentSubPhase, phaseApi)
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
                combatTrackerPhases.call(`activateSubPhase.${this.currentSubPhase.id}`, phaseApi)
                Hooks.callAll(`${CANONICAL_NAME}.activateSubPhase`, newSubPhase, phaseApi)
                Hooks.callAll(`renderCombatTracker`, combatTracker, html, this.user)
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
            },
            rollInitiative(combatantId) {
                combatTracker.rollInitiative([combatantId])
            },
            scrollToPhase(phaseId) {
                const phaseElement = document.querySelector(`.phase[data-phase-id="${phaseId}"]`)
                if (!phaseElement) {
                    return
                }
                phaseElement.scrollIntoView()
            },
            localize(key, ...args) {
                if (!key) {
                    return ''
                }
                return game.i18n.format(key, args)
            }
        };
    }

    async activateListeners(html) {
        super.activateListeners(html);
        if (!this._app) {
            const { createApp } = game.modules.get('petitevue-lib').api
            const scope = this.createScope(html)
            this._app = createApp(scope)
        }
        this._app.mount(".combat-phase-tracker")
    }

    _getEntryContextOptions() {
        return [
            {
                name: "COMBAT.CombatantUpdate",
                icon: '<i class="fas fa-edit"></i>',
                callback: this._onConfigureCombatant.bind(this)
            },
            {
                name: "COMBAT.CombatantRemove",
                icon: '<i class="fas fa-trash"></i>',
                callback: li => {
                    const combatant = this.viewed.combatants.get(li.data("combatant-id"));
                    if (combatant) return combatant.delete();
                }
            }
        ];
    }
}
