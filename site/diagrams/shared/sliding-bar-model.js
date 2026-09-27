(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.SlidingBarPhysics = api;
}(typeof globalThis === 'object' ? globalThis : this, function () {
    'use strict';

    class SlidingBarModel {
        constructor() {
            this.field = 0.8;
            this.fieldReversed = false;
            this.peakSpeed = 0.6;
            this.resistance = 2;
            this.length = 1;
            this.center = 1.4;
            this.amplitude = 0.9;
            this.phase = 0;
            this.moving = true;
            this.closed = true;
        }

        advance(dt) {
            if (!Number.isFinite(dt) || dt < 0) throw new RangeError('Time step must be nonnegative.');
            if (this.moving) this.phase = (this.phase + dt * this.peakSpeed / this.amplitude) % (2 * Math.PI);
            return this.state();
        }

        state() {
            const x = this.center + this.amplitude * Math.sin(this.phase);
            const velocity = this.moving ? this.peakSpeed * Math.cos(this.phase) : 0;
            // Positive flux points out of the page; positive current is counterclockwise.
            const bz = this.fieldReversed ? this.field : -this.field;
            const area = this.length * x;
            const flux = bz * area;
            const emf = -bz * this.length * velocity;
            const current = this.closed ? emf / this.resistance : 0;
            return { x, velocity, bz, area, flux, emf, current, power: current * current * this.resistance };
        }
    }

    return { SlidingBarModel };
}));
