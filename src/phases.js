class CombatTrackerPhases {
    constructor() {
        this._phases = {};
    }

    add(phase) {
        const id = foundry.utils.randomID()
        this._phases[id] = {
            id,
            ...phase
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
