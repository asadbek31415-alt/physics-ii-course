import {CircuitGraph} from '../circuit-core/circuit-graph.js';

export function createEMFGraph(){
    const graph=new CircuitGraph({id:'emf-loop'});
    const nodes={
        batteryBottom:[-14,-4,0],batteryTop:[-14,4,0],
        leftBottomCorner:[-14,-6,0],leftTopCorner:[-14,6,0],
        resistorBottom:[14,-4,0],resistorTop:[14,4,0],
        rightBottomCorner:[14,-6,0],rightTopCorner:[14,6,0]
    };
    for(const [id,position] of Object.entries(nodes))graph.addNode({id,position});
    graph.addComponent({id:'source',type:'emf-source',terminals:['batteryBottom','batteryTop'],parameters:{emf:12}});
    graph.addComponent({id:'resistor',type:'resistor',terminals:['resistorTop','resistorBottom'],parameters:{resistance:10}});
    const wires=[
        ['leftTopStub','batteryTop','leftTopCorner'],['topWire','leftTopCorner','rightTopCorner'],
        ['rightTopStub','rightTopCorner','resistorTop'],['rightBottomStub','resistorBottom','rightBottomCorner'],
        ['bottomWire','rightBottomCorner','leftBottomCorner'],['leftBottomStub','leftBottomCorner','batteryBottom']
    ];
    for(const [id,from,to] of wires)graph.addComponent({id,type:'wire',terminals:[from,to]});
    graph.addTransportRoute({id:'loop',closed:true,segments:['source','leftTopStub','topWire','rightTopStub','resistor','rightBottomStub','bottomWire','leftBottomStub'].map(componentId=>({componentId,direction:1}))});
    return graph;
}

