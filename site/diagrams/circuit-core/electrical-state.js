// Positive component current runs from terminal 0 to terminal 1, in amperes.
export class ElectricalState {
    constructor({graphId, time=0, source='CircuitJS'}={}) {
        this.graphId=graphId;
        this.time=time;
        this.source=source;
        this.status='loading';
        this.nodeVoltages=new Map();
        this.componentStates=new Map();
    }
    setNodeVoltage(id, value) {
        if (!Number.isFinite(value)) throw new Error('Non-finite node voltage: '+id);
        this.nodeVoltages.set(id,value);
        return this;
    }
    setComponentState(id, {current,voltage,power=null}) {
        if (![current,voltage].every(Number.isFinite)) throw new Error('Invalid solver state: '+id);
        this.componentStates.set(id,Object.freeze({current,voltage,power}));
        return this;
    }
    getComponentState(id) {
        if (!this.componentStates.has(id)) throw new Error('No solved state for '+id);
        return this.componentStates.get(id);
    }
    getCurrent(id) { return this.getComponentState(id).current; }
    getNodeVoltage(id) {
        if (!this.nodeVoltages.has(id)) throw new Error('No solved voltage for '+id);
        return this.nodeVoltages.get(id);
    }
    toJSON() { return {graphId:this.graphId,time:this.time,source:this.source,status:this.status,nodeVoltages:Object.fromEntries(this.nodeVoltages),componentStates:Object.fromEntries(this.componentStates)}; }
}
