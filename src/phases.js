class CombatTrackerPhases {
    constructor() {
        this._phases = {};
    }

    add(phase) {
        const id = foundry.utils.randomID()
        const subPhases = phase.subPhases?.map(subPhase => {
            const subPhaseId = foundry.utils.randomID()
            return {
                id: subPhaseId,
                ...subPhase
            }
        })
        this._phases[id] = {
            ...phase,
            id,
            subPhases,
        };
    }

    get phases() {
        return this._phases;
    }

    get(id) {
        return this._phases[id];
    }
}

export const combatTrackerPhases = new CombatTrackerPhases();
