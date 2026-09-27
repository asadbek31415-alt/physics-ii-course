import {CircuitGraph} from './circuit-graph.js';

const TYPES={w:'wire',r:'resistor',l:'inductor',c:'capacitor',v:'emf-source',s:'switch'};
const nonElectrical=new Set(['o','38','h','x']);

// This first importer supports two-terminal R/L/C/DC/switch circuits. It fails
// closed on unknown electrical elements; plotting records remain in metadata.
export function importFalstadCircuit(text,{id='imported',coordinateScale=1}={}) {
    if (!Number.isFinite(coordinateScale)||coordinateScale<=0) throw new Error('Invalid coordinate scale.');
    const graph=new CircuitGraph({id,source:{kind:'falstad'}});
    const records=[],warnings=[];
    const number=(fields,index,line)=>{
        if(fields[index]===undefined||!Number.isFinite(Number(fields[index]))) throw new Error('Invalid number on Falstad line '+line);
        return Number(fields[index]);
    };
    String(text).split(/\r?\n/).forEach((line,index)=>{
        if(!line.trim()||line.trim().startsWith('#')) return;
        const f=line.trim().split(/\s+/), code=f[0], n=index+1;
        if(code==='$'||nonElectrical.has(code)) { records.push({line:n,text:line}); return; }
        if(!TYPES[code]) throw new Error('Unsupported electrical element '+code+' on line '+n);
        const xy=[1,2,3,4].map(i=>number(f,i,n));
        number(f,5,n);
        const terminals=[xy.slice(0,2),xy.slice(2)].map(([x,y])=>{
            const nodeId='n_'+x+'_'+y;
            if(!graph.getNode(nodeId)) graph.addNode({id:nodeId,position:[x*coordinateScale,-y*coordinateScale,0]});
            return nodeId;
        });
        const parameters={};
        if(code==='r') parameters.resistance=number(f,6,n);
        if(code==='l') { parameters.inductance=number(f,6,n); parameters.initialCurrent=number(f,7,n); }
        if(code==='c') { parameters.capacitance=number(f,6,n); parameters.initialVoltage=number(f,7,n); }
        if(code==='v') {
            if(number(f,6,n)!==0) throw new Error('Only DC voltage sources are supported by this importer.');
            parameters.emf=number(f,8,n)+number(f,9,n);
        }
        if(code==='s') parameters.closed=number(f,6,n)===0;
        for(const key of ['resistance','inductance','capacitance']) if(key in parameters&&parameters[key]<=0) throw new Error('Invalid '+key+' on line '+n);
        graph.addComponent({id:TYPES[code]+'_'+graph.components.size,type:TYPES[code],terminals,parameters,metadata:{sourceLine:n}});
    });
    return {graph,warnings,sourceRecords:records};
}
