import { Observer } from "./observer"

class CombatTrackerPhases {
    constructor() {
        this._phases = {};
        this._observer = new Observer();
    }

    add(phase) {
        const id = foundry.utils.randomID()
        const subPhases = phase.subPhases?.map(subPhase => {
            const subPhaseId = foundry.utils.randomID()
            if (subPhase.onActivate) {
                this._observer.on(`activateSubPhase.${subPhaseId}`, subPhase.onActivate)
            }
            if (subPhase.onDeactivate) {
                this._observer.on(`deactivateSubPhase.${subPhaseId}`, subPhase.onDeactivate)
            }
            return {
                id: subPhaseId,
                ...subPhase
            }
        })
        if (phase.onActivate) {
            this._observer.on(`activatePhase.${id}`, phase.onActivate)
        }
        if (phase.onDeactivate) {
            this._observer.on(`deactivatePhase.${id}`, phase.onDeactivate)
        }
        this._phases[id] = {
            ...phase,
            id,
            subPhases,
        };
    }

    on(eventName, callback) {
        this._observer.on(eventName, callback)
    }

    async call(eventName, payload) {
        await this._observer.call(eventName, payload)
    }

    get phases() {
        return this._phases;
    }

    get(id) {
        return this._phases[id];
    }
}

export const combatTrackerPhases = new CombatTrackerPhases();
