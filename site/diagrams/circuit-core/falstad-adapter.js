import {ElectricalState} from './electrical-state.js';

export function exportFalstadCircuit(graph) {
    const lines=['$ 1 0.000005 10.20027730826997 50 5 50 5e-11'], bindings=[];
    // Hidden solver coordinates encode node identity, never visual placement.
    // A parabola gives distinct integer points with no three nodes collinear.
    const coordinates=new Map([...graph.nodes.keys()].map((id,i)=>[id,[80+24*i,80+8*i*i]]));
    for(const component of graph.components.values()) {
        if(component.terminals.length!==2) throw new Error('Unsupported solver port count: '+component.id);
        const xy=component.terminals.flatMap(id=>{
            const point=coordinates.get(id);
            if(!point) throw new Error('Missing solver node '+id);
            return point;
        }).join(' ');
        const p=component.parameters;
        const positive=(v)=>{if(!Number.isFinite(v)||v<=0) throw new Error('Invalid value for '+component.id);return v;};
        const initial=(v)=>{if(v===undefined)return 0;if(!Number.isFinite(v))throw new Error('Invalid initial state for '+component.id);return v;};
        let record;
        switch(component.type) {
            case 'wire': record='w '+xy+' 0'; break;
            case 'resistor': record='r '+xy+' 0 '+positive(p.resistance); break;
            case 'emf-source':
                if(!Number.isFinite(p.emf)) throw new Error('Invalid EMF.');
                record='v '+xy+' 0 0 40 '+p.emf+' 0 0 0.5'; break;
            case 'inductor': record='l '+xy+' 0 '+positive(p.inductance)+' '+initial(p.initialCurrent)+' 0'; break;
            case 'capacitor': record='c '+xy+' 0 '+positive(p.capacitance)+' '+initial(p.initialVoltage); break;
            case 'switch': record='s '+xy+' 0 '+(p.closed?0:1)+' false'; break;
            default: throw new Error('Unsupported solver component '+component.type);
        }
        lines.push(record);
        bindings.push(component);
    }
    return {text:lines.join('\n'),bindings};
}

export class FalstadAdapter {
    constructor(graph,{onstate=()=>{},onerror=()=>{},url=new URL('../vendor/circuitjs/engine.html',import.meta.url)}={}) {
        this.graph=graph; this.onstate=onstate; this.onerror=onerror; this.url=url;
        this.state=new ElectricalState({graphId:graph.id});
        this.disposed=false;
    }
    async start() {
        this.frame=document.createElement('iframe');
        this.frame.title='Circuit electrical engine'; this.frame.tabIndex=-1;
        this.frame.setAttribute('aria-hidden','true');
        Object.assign(this.frame.style,{position:'fixed',left:'-1200px',top:'0',width:'800px',height:'550px',border:'0',pointerEvents:'none'});
        document.body.appendChild(this.frame);
        const url=new URL(this.url); url.searchParams.set('running','false'); url.searchParams.set('hideMenu','true'); url.searchParams.set('hideSidebar','true');
        url.searchParams.set('lang','en');
        url.searchParams.set('cct',exportFalstadCircuit(this.graph).text);
        if (url.protocol === 'file:') {
            // srcdoc inherits the lesson origin, allowing the local solver API to be read.
            const base = new URL('./', url).href;
            this.frame.srcdoc = '<!doctype html><html><head><meta charset="utf-8">' +
                '<meta name="gwt:property" content="locale=en_UK"><base href="' + base + '"></head><body>' +
                '<script>window.PHYSICS_COURSE_SOLVER = true;</script><script src="lz-string.min.js"></script><script src="circuitjs1/circuitjs1.nocache.js"></script>' +
                '<iframe id="__gwt_historyFrame" tabindex="-1" style="width:0;height:0;border:0"></iframe></body></html>';
        } else {
            this.frame.src=url.href;
        }
        await new Promise((resolve,reject)=>{
            const deadline=Date.now()+20000;
            this.poll=setInterval(()=>{
                if(this.disposed) {clearInterval(this.poll);reject(new Error('Solver disposed'));return;}
                try {
                    const api=this.frame.contentWindow.CircuitJS1;
                    if(api) {clearInterval(this.poll);this.api=api;resolve();}
                    else if(Date.now()>deadline) {clearInterval(this.poll);reject(new Error('CircuitJS failed to start.'));}
                } catch(e) {clearInterval(this.poll);reject(e);}
            },50);
        });
        this.load();
        return this;
    }
    load() {
        if(!this.api||this.disposed) return;
        this.state.status='loading';
        const exported=exportFalstadCircuit(this.graph);
        this.bindings=exported.bindings;
        this.api.onanalyze=()=>{this.elements=Array.from(this.api.getElements());};
        this.api.onupdate=()=>this.read();
        this.api.importCircuit(exported.text,false);
        this.elements=Array.from(this.api.getElements());
        this.api.setSimRunning(true);
    }
    read() {
        if(this.disposed||!this.api.isRunning()||this.api.getTime()<=0) return;
        try {
            if(this.elements.length!==this.bindings.length) throw new Error('CircuitJS component mapping changed.');
            const state=new ElectricalState({graphId:this.graph.id,time:this.api.getTime()});
            this.elements.forEach((element,index)=>{
                const c=this.bindings[index];
                const v0=element.getVoltage(0),v1=element.getVoltage(1);
                state.setNodeVoltage(c.terminals[0],v0).setNodeVoltage(c.terminals[1],v1);
                state.setComponentState(c.id,{current:element.getCurrent(),voltage:v0-v1});
            });
            state.status='ready'; this.state=state; this.onstate(state);
        } catch(error) {this.state.status='error';this.onerror(error);}
    }
    dispose() {
        this.disposed=true; clearInterval(this.poll);
        if(this.api) {this.api.onupdate=null;this.api.onanalyze=null;this.api.setSimRunning(false);}
        this.frame?.remove();
    }
}
