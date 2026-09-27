/**
 * Source-neutral circuit topology. Falstad, a future editor, and handwritten
 * lesson configurations all produce this shape before visuals are created.
 */
export class CircuitGraphError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CircuitGraphError';
    }
}

function clonePoint(point) {
    if (Array.isArray(point)) return [...point];
    if (point && typeof point === 'object') return { ...point };
    return point;
}

function cloneValue(value) {
    if (Array.isArray(value)) return value.map(cloneValue);
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneValue(item)]));
    }
    return value;
}

function requireId(value, label) {
    if (!value || typeof value !== 'string') {
        throw new CircuitGraphError(`${label} must be a non-empty string.`);
    }
}

export class CircuitGraph {
    constructor({ id = 'circuit', source = { kind: 'lesson' } } = {}) {
        this.id = id;
        this.source = cloneValue(source);
        this.nodes = new Map();
        this.components = new Map();
        this.transportRoutes = new Map();
    }

    addNode({ id, position = null, metadata = {} }) {
        requireId(id, 'Node id');
        if (this.nodes.has(id)) throw new CircuitGraphError(`Duplicate node id: ${id}.`);
        this.nodes.set(id, { id, position: clonePoint(position), metadata: cloneValue(metadata) });
        return this;
    }

    addComponent({ id, type, terminals = [], parameters = {}, visual = {}, metadata = {} }) {
        requireId(id, 'Component id');
        requireId(type, 'Component type');
        if (this.components.has(id)) throw new CircuitGraphError(`Duplicate component id: ${id}.`);
        if (!Array.isArray(terminals) || terminals.length < 2) {
            throw new CircuitGraphError(`Component ${id} must connect at least two terminals.`);
        }
        terminals.forEach((nodeId) => {
            if (!this.nodes.has(nodeId)) throw new CircuitGraphError(`Component ${id} references missing node ${nodeId}.`);
        });
        this.components.set(id, {
            id,
            type,
            terminals: [...terminals],
            parameters: cloneValue(parameters),
            visual: cloneValue(visual),
            metadata: cloneValue(metadata)
        });
        return this;
    }

    addTransportRoute({ id, segments, closed = false, metadata = {} }) {
        requireId(id, 'Transport route id');
        if (this.transportRoutes.has(id)) throw new CircuitGraphError(`Duplicate transport route id: ${id}.`);
        if (!Array.isArray(segments) || segments.length === 0) {
            throw new CircuitGraphError(`Transport route ${id} needs at least one segment.`);
        }
        const normalized = segments.map((segment, index) => {
            if (!segment || !this.components.has(segment.componentId)) {
                throw new CircuitGraphError(`Transport route ${id} segment ${index} references an unknown component.`);
            }
            if (segment.direction !== undefined && ![1, -1].includes(segment.direction)) {
                throw new CircuitGraphError(`Invalid direction in route ${id}.`);
            }
            if (this.components.get(segment.componentId).type === 'capacitor') {
                throw new CircuitGraphError('Carriers cannot cross a capacitor dielectric. Electrode storage is not migrated yet.');
            }
            return {
                componentId: segment.componentId,
                direction: segment.direction === -1 ? -1 : 1,
                lane: segment.lane || null
            };
        });
        const ends = normalized.map((segment) => {
            const terminals = [...this.components.get(segment.componentId).terminals];
            if (terminals.length !== 2) throw new CircuitGraphError('A transport segment needs two ports.');
            return segment.direction === 1 ? terminals : terminals.reverse();
        });
        ends.forEach((pair, index) => {
            const next = index + 1 < ends.length ? ends[index + 1] : closed ? ends[0] : null;
            if (next && pair[1] !== next[0]) throw new CircuitGraphError(`Disconnected transport route ${id} at segment ${index}.`);
        });
        this.transportRoutes.set(id, { id, segments: normalized, closed: Boolean(closed), metadata: cloneValue(metadata) });
        return this;
    }

    getNode(id) {
        return this.nodes.get(id) || null;
    }

    getComponent(id) {
        return this.components.get(id) || null;
    }

    componentsOfType(type) {
        return [...this.components.values()].filter((component) => component.type === type);
    }

    connectionsFor(nodeId) {
        return [...this.components.values()].filter((component) => component.terminals.includes(nodeId));
    }

    toJSON() {
        return {
            id: this.id,
            source: cloneValue(this.source),
            nodes: [...this.nodes.values()].map(cloneValue),
            components: [...this.components.values()].map(cloneValue),
            transportRoutes: [...this.transportRoutes.values()].map(cloneValue)
        };
    }

    static fromJSON(data) {
        const graph = new CircuitGraph({ id: data.id, source: data.source });
        (data.nodes || []).forEach((node) => graph.addNode(node));
        (data.components || []).forEach((component) => graph.addComponent(component));
        (data.transportRoutes || []).forEach((route) => graph.addTransportRoute(route));
        return graph;
    }
}
