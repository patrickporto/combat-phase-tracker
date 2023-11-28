import { TEMPLATE_PATH } from "./constants";

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
        const sequence = [
            {
                sequenceId: 0,
                name: game.i18n.localize('OSECOMBATTRACKER.DeclareSpellsAndRetreats'),
                cssClass: 'ose-declare-spells-and-retreats',
            },
            {
                sequenceId: 1,
                name: game.i18n.localize('OSECOMBATTRACKER.Initiative'),
                cssClass: 'ose-initiative',
            },
            {
                sequenceId: 2,
                name: game.i18n.localize('OSECOMBATTRACKER.Movement'),
                cssClass: 'ose-movement',
            },
            {
                sequenceId: 3,
                name: game.i18n.localize('OSECOMBATTRACKER.MissileAttacks'),
                cssClass: 'ose-missile-attacks',
            },
            {
                sequenceId: 4,
                name: game.i18n.localize('OSECOMBATTRACKER.SpellCasting'),
                cssClass: 'ose-spell-casting',
            },
            {
                sequenceId: 5,
                name: game.i18n.localize('OSECOMBATTRACKER.MeleeAttacks'),
                cssClass: 'ose-melee-attacks',
            }
        ]
        data.turns = sequence
        data.combatants = []
        for (const combatant of data.combat?.combatants ?? []) {
            if (!combatant.visible) continue;
            data.combatants.push({
                id: combatant.id,
                name: combatant.name,
                img: await this._getCombatantThumbnail(combatant),
                owner: combatant.owner,
                defeated: combatant.defeated,
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
            sequenceId: 0,
            combatants: {},
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
            selectSequence(sequenceId) {
                this.sequenceId = sequenceId
            },
            nextSequence() {
                this.sequenceId++
                if (this.sequenceId > 5) {
                    this.sequenceId = 0
                    combat.nextRound()
                }
            },
            previousSequence() {
                this.sequenceId--
                if (this.sequenceId < 0) {
                    combat.previousRound()
                    this.sequenceId = 5
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
