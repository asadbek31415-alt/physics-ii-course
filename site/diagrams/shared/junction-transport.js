(function (root) {
    'use strict';

    // A moving density front satisfies continuity: its upstream growth speed is
    // (I_in - I_out) / (rho_queue - rho_free), while charges drift downstream.
    // Only a finite window is populated; excess charge upstream remains in Q.
    class JunctionTransport {
        constructor({ lengths, packetsPerCoulomb = 22, speedPerAmp = 0.6 } = {}) {
            this.lengths = { incoming: 12, top: 6.8, bottom: 6.8, feed: 4, ...lengths };
            this.packetsPerCoulomb = packetsPerCoulomb;
            this.speedPerAmp = speedPerAmp;
            this.baseDensity = 1 / speedPerAmp;
            this.queueDensity = this.baseDensity * 4;
            this.setCurrents(4, 2.4, 1.6);
            this.reset();
        }

        setCurrents(incoming, top, bottom) {
            if (![incoming, top, bottom].every(n => Number.isFinite(n) && n >= 0)) throw new Error('Currents must be finite and nonnegative.');
            const outgoing = top + bottom;
            const difference = Math.abs(incoming - outgoing) < 1e-9 ? 0 : incoming - outgoing;
            const feed = Math.max(0, -difference);
            const accumulation = Math.max(0, difference);
            const mode = accumulation > 0 ? 'accumulation' : feed > 0 ? 'supplemented' : 'balanced';
            const modeChanged = this.mode !== mode;
            this.mode = mode;
            this.currents = { incoming, top, bottom, outgoing, feed, accumulation };
            this.deficits = { top: 0, bottom: 0 };
            if (modeChanged && this.particles) this.reset();
            return modeChanged;
        }

        random() {
            this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
            return this.seed / 4294967296;
        }

        makeParticle(path, s = 0) {
            const angle = this.random() * Math.PI * 2;
            const radius = Math.sqrt(this.random()) * (path === 'feed' ? 0.085 : 0.255);
            return { id: this.nextId++, path, s, a: Math.cos(angle) * radius, b: Math.sin(angle) * radius, queued: false };
        }

        reset() {
            this.seed = 42;
            this.nextId = 0;
            this.time = 0;
            this.accumulatedCharge = 0;
            this.queueLength = 0;
            this.particles = [];
            this.emission = { incoming: 0, feed: 0.5 };
            this.deficits = { top: 0, bottom: 0 };
            this.crossings = { incoming: 0, feed: 0, top: 0, bottom: 0 };
            this.spawned = 0;
            this.exited = 0;
            for (const path of ['incoming', 'top', 'bottom', 'feed']) {
                if (path === 'feed' && this.currents.feed === 0) continue;
                const count = Math.floor(this.packetsPerCoulomb * this.lengths[path] * this.baseDensity);
                for (let i = 0; i < count; i++) this.particles.push(this.makeParticle(path, (i + 0.5) * this.lengths[path] / count));
            }
            this.initialCount = this.particles.length;
        }

        chooseRoute() {
            if (this.currents.outgoing === 0) return null;
            let selected = null;
            for (const key of ['top', 'bottom']) {
                this.deficits[key] += this.currents[key] / this.currents.outgoing;
                if (this.currents[key] > 0 && (selected === null || this.deficits[key] > this.deficits[selected])) selected = key;
            }
            this.deficits[selected] -= 1;
            return selected;
        }

        step(dt) {
            if (!(dt > 0)) return;
            const current = this.currents;
            const growth = current.accumulation / (this.queueDensity - this.baseDensity);
            const front = this.lengths.incoming - this.queueLength;
            this.time += dt;
            this.accumulatedCharge += current.accumulation * dt;
            this.queueLength = this.accumulatedCharge / (this.queueDensity - this.baseDensity);

            // When the front passes the visible window's inlet, its local flux is
            // I_out. The imposed I_in continues farther upstream, outside the view.
            const freeDuration = growth > 0 ? Math.max(0, Math.min(dt, front / growth)) : dt;
            const enteringCharge = {
                incoming: current.incoming * freeDuration + current.outgoing * (dt - freeDuration),
                feed: current.feed * dt
            };
            for (const path of ['incoming', 'feed']) {
                this.emission[path] += enteringCharge[path] * this.packetsPerCoulomb;
                while (this.emission[path] >= 1) {
                    this.emission[path] -= 1;
                    this.particles.push(this.makeParticle(path));
                    this.spawned++;
                }
            }

            const active = [];
            for (const particle of this.particles) {
                const input = particle.path === 'incoming' || particle.path === 'feed';
                let speed = this.speedPerAmp * current[particle.path];
                if (particle.path === 'incoming' && this.mode === 'accumulation') {
                    const slowSpeed = current.outgoing / this.queueDensity;
                    const timeToFront = Math.max(0, (front - particle.s) / (speed + growth));
                    if (timeToFront <= dt) {
                        particle.s += speed * timeToFront + slowSpeed * (dt - timeToFront);
                        particle.queued = true;
                        speed = slowSpeed;
                    } else {
                        particle.s += speed * dt;
                    }
                } else {
                    particle.s += speed * dt;
                }

                if (particle.s >= this.lengths[particle.path]) {
                    if (input) {
                        const branch = this.chooseRoute();
                        if (branch === null) {
                            particle.s = this.lengths[particle.path] - 1e-9;
                        } else {
                            const remainingTime = speed > 0 ? (particle.s - this.lengths[particle.path]) / speed : 0;
                            this.crossings[particle.path]++;
                            particle.path = branch;
                            particle.s = remainingTime * this.speedPerAmp * current[branch];
                            particle.queued = false;
                            this.crossings[branch]++;
                        }
                    } else {
                        this.exited++;
                        continue;
                    }
                }
                active.push(particle);
            }
            this.particles = active;
        }

        metrics() {
            const queued = this.particles.filter(p => p.queued).length;
            const visibleCharge = Math.min(this.accumulatedCharge, (this.queueDensity - this.baseDensity) * this.lengths.incoming);
            return {
                count: this.particles.length, queued, charge: this.accumulatedCharge,
                queueLength: this.queueLength, offscreenCharge: this.accumulatedCharge - visibleCharge,
                initial: this.initialCount, spawned: this.spawned, exited: this.exited, crossings: { ...this.crossings },
                conservationError: this.initialCount + this.spawned - this.exited - this.particles.length
            };
        }
    }

    if (typeof module !== 'undefined' && module.exports) module.exports = { JunctionTransport };
    else root.JunctionTransport = JunctionTransport;
})(typeof window === 'undefined' ? this : window);
