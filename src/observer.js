export class Observer {
    constructor() {
        this._listeners = {};
    }

    on(name, fn) {
        if (!this._listeners[name]) {
            this._listeners[name] = [];
        }
        this._listeners[name].push(fn);
    }

    off(name, fn) {
        if (!this._listeners[name]) return;
        this._listeners[name] = this._listeners[name].filter(f => f !== fn);
    }

    async call(name, data) {
        if (!this._listeners[name]) return;
        for (const fn of this._listeners[name]) {
            await fn(data);
        }
    }
}
