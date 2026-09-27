// Shared visual vocabulary. Scene, camera and lesson controls stay in the host.
export const CIRCUIT_VISUAL_STYLE={
    wire:{radius:0.6,color:0x344254,opacity:0.12,glowColor:0x3b82f6,glowOpacity:0.055},
    resistor:{radius:2,ionRadius:0.3,maxIons:400,shellColor:0x7f3b34,shellOpacity:0.16},
    battery:{radius:2.5,capDepth:0.5,bodyColor:0x111111,positiveColor:0xef4444,negativeColor:0x3b82f6},
    particles:{count:1200,radius:0.15,color:0x3b82f6,speedPerAmp:3.84,thermalSpeed:0.7,scatter:0.08}
};
const unit=(n)=>{const v=Math.sin(n*127.1)*43758.5453;return v-Math.floor(v);};

export class CircuitVisualObject {
    constructor({THREE,graph,component,style={},CSS2DObject}) {
        Object.assign(this,{THREE,graph,component,CSS2DObject});
        this.style=style; this.group=new THREE.Group();
        const points=component.terminals.map(id=>new THREE.Vector3(...graph.getNode(id).position));
        this.start=points[0];this.end=points[1];
        this.curve=new THREE.LineCurve3(this.start,this.end);
    }
    build(parent){parent.add(this.group);return this;}
    setElectricalState(state){this.electricalState=state;}
    getTransportCurve(){return this.curve;}
    getTransportLength(){return this.curve.getLength();}
    getTransportPointAt(t,target=new this.THREE.Vector3()){return target.copy(this.curve.getPointAt(t));}
    align(){
        const T=this.THREE;
        this.group.position.copy(this.start).add(this.end).multiplyScalar(0.5);
        this.group.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),this.end.clone().sub(this.start).normalize());
    }
    dispose(){
        this.group.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}o.element?.remove();});
        this.group.removeFromParent();
    }
}

export class WireObject extends CircuitVisualObject {
    build(parent){
        const T=this.THREE,s={...CIRCUIT_VISUAL_STYLE.wire,...this.style};this.style=s;
        if(this.component.visual.path){
            this.curve=new T.CurvePath();
            const pts=this.component.visual.path.map(p=>new T.Vector3(...p));
            for(let i=1;i<pts.length;i++)this.curve.add(new T.LineCurve3(pts[i-1],pts[i]));
        }
        this.mesh=new T.Mesh(new T.TubeGeometry(this.curve,96,s.radius,16,false),new T.MeshPhysicalMaterial({color:s.color,metalness:0.2,roughness:0.45,transparent:true,opacity:s.opacity,side:T.DoubleSide,depthWrite:false}));
        this.glow=new T.Mesh(new T.TubeGeometry(this.curve,96,s.radius*1.8,12,false),new T.MeshBasicMaterial({color:s.glowColor,transparent:true,opacity:s.glowOpacity,depthWrite:false}));
        this.group.add(this.glow,this.mesh);return super.build(parent);
    }
}

export class BatteryObject extends CircuitVisualObject {
    build(parent){
        const T=this.THREE,s={...CIRCUIT_VISUAL_STYLE.battery,...this.style},length=this.getTransportLength();this.style=s;this.align();
        this.body=new T.Mesh(new T.CylinderGeometry(s.radius,s.radius,length,32),new T.MeshPhysicalMaterial({color:s.bodyColor,metalness:0.82,roughness:0.22}));
        const caps=new T.CylinderGeometry(s.radius*1.05,s.radius*1.05,s.capDepth,32);
        this.positiveCap=new T.Mesh(caps,new T.MeshBasicMaterial({color:s.positiveColor}));
        this.negativeCap=new T.Mesh(caps,new T.MeshBasicMaterial({color:s.negativeColor}));
        this.positiveCap.position.y=length/2;this.negativeCap.position.y=-length/2;
        this.group.add(this.body,this.positiveCap,this.negativeCap);
        if(this.CSS2DObject){
            const element=document.createElement('div');element.className='battery-label';
            this.label=new this.CSS2DObject(element);this.label.position.set(0,0,s.radius+0.12);this.group.add(this.label);
        }
        this.setEMF(this.component.parameters.emf);
        return super.build(parent);
    }
    setEMF(value){if(this.label)this.label.element.textContent=value+' V';}
}

export class ResistorObject extends CircuitVisualObject {
    build(parent){
        const T=this.THREE,s={...CIRCUIT_VISUAL_STYLE.resistor,...this.style};this.style=s;this.align();
        this.length=this.getTransportLength();this.ions=[];this.collisionCount=0;
        this.inverse=this.group.quaternion.clone().invert();
        this.shell=new T.Mesh(new T.CylinderGeometry(s.radius,s.radius,this.length,36,1,true),new T.MeshPhysicalMaterial({color:s.shellColor,roughness:0.65,metalness:0.15,transparent:true,opacity:s.shellOpacity,side:T.DoubleSide,depthWrite:false}));
        this.group.add(this.shell);
        const ringMat=new T.MeshBasicMaterial({color:0x64748b,transparent:true,opacity:0.35});
        for(const y of [-this.length/2,this.length/2]){
            const ring=new T.Mesh(new T.TorusGeometry(s.radius,0.045,8,48),ringMat);ring.rotation.x=Math.PI/2;ring.position.y=y;this.group.add(ring);
        }
        this.ionsMesh=new T.InstancedMesh(new T.SphereGeometry(s.ionRadius,12,12),new T.MeshStandardMaterial({color:0xffffff,metalness:0.3,roughness:0.7}),s.maxIons);
        this.ionsMesh.frustumCulled=false;this.ionsMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);this.group.add(this.ionsMesh);
        this.dummy=new T.Object3D();this.cold=new T.Color(0x333333);this.hot=new T.Color(0xe85d55);this.color=new T.Color();
        this.setResistance(this.component.parameters.resistance);return super.build(parent);
    }
    setResistance(value){
        this.resistance=value;
        const T=this.THREE,s=this.style;
        const density=Math.max(0,Math.min(1,value/50));
        // Non-overlapping, staggered lattice, inset from both terminals.
        const sites=[];let index=0;
        const spacing=(s.ionRadius+CIRCUIT_VISUAL_STYLE.particles.radius)*2+0.08;
        for(let y=-this.length/2+1.45;y<=this.length/2-1.45;y+=spacing){
            const stagger=(index++%2)*spacing/2;
            for(let x=-s.radius+spacing;x<s.radius-spacing/2;x+=spacing){
                for(let z=-s.radius+spacing;z<s.radius-spacing/2;z+=spacing){
                    const xx=x+stagger,zz=z-stagger*0.5;
                    if(Math.hypot(xx,zz)<s.radius-s.ionRadius-0.15*2-0.10)sites.push({base:new T.Vector3(xx,y,zz),rank:unit(sites.length+23)});
                }
            }
        }
        sites.sort((a,b)=>a.rank-b.rank);
        const ionCount=Math.min(s.maxIons,Math.max(0,Math.round(sites.length*density)));
        this.ions=sites.slice(0,ionCount).map((site,i)=>({...site,center:site.base.clone(),heat:0,phase:unit(i+3)*Math.PI*2}));
        this.ionsMesh.count=this.ions.length;this.update(0,0);
    }
    update(dt,time){
        this.clock=time;
        for(let i=0;i<this.ions.length;i++){
            const ion=this.ions[i];ion.heat*=Math.exp(-4.3*dt);
            const amount=0.025*ion.heat;
            ion.center.set(ion.base.x+Math.sin(time*18+ion.phase)*amount,ion.base.y+Math.cos(time*15+ion.phase)*amount,ion.base.z+Math.sin(time*21+ion.phase)*amount);
            this.dummy.position.copy(ion.center);this.dummy.updateMatrix();this.ionsMesh.setMatrixAt(i,this.dummy.matrix);
            this.ionsMesh.setColorAt(i,this.color.copy(this.cold).lerp(this.hot,ion.heat));
        }
        this.ionsMesh.instanceMatrix.needsUpdate=true;if(this.ionsMesh.instanceColor)this.ionsMesh.instanceColor.needsUpdate=true;
    }
    local(point){return point.clone().sub(this.group.position).applyQuaternion(this.inverse);}
    contains(point,margin=0.6){const q=this.local(point);return Math.abs(q.y)<this.length/2+margin&&Math.hypot(q.x,q.z)<this.style.radius+margin;}
    resolveMotion(p,start,end,dt){
        const T=this.THREE,q=this.local(end);
        const contact=this.style.ionRadius+p.radius+0.006;
        // The solver owns longitudinal flux. Contact normals scatter markers in
        // the cross-section without making a visual collision an electrical jam.
        for(let pass=0;pass<5;pass++){
            let changed=false;
            for(const ion of this.ions){
                const dy=q.y-ion.center.y;if(Math.abs(dy)>=contact)continue;
                const disk=Math.sqrt(contact*contact-dy*dy),dx=q.x-ion.center.x,dz=q.z-ion.center.z;
                const radial=Math.hypot(dx,dz);if(radial>=disk)continue;
                let nx=dx,nz=dz;
                if(radial<1e-6){nx=Math.cos(p.seed*2.399);nz=Math.sin(p.seed*2.399);}
                const norm=Math.hypot(nx,nz);nx/=norm;nz/=norm;
                q.x=ion.center.x+nx*(disk+0.001);q.z=ion.center.z+nz*(disk+0.001);
                const normal=new T.Vector3(q.x-ion.center.x,dy,q.z-ion.center.z).normalize().applyQuaternion(this.group.quaternion);
                const vn=p.velocity.clone().add(p.driftVelocity).dot(normal);
                if(vn<0)p.velocity.addScaledVector(normal,-1.5*vn);
                p.velocity.addScaledVector(new T.Vector3(-nz,0,nx).applyQuaternion(this.group.quaternion),(unit(p.seed+this.collisionCount)-0.5)*CIRCUIT_VISUAL_STYLE.particles.scatter);
                if(p.lastHit!==ion||p.hitTime<this.clock-0.04){
                    ion.heat=Math.min(1,ion.heat+0.5);this.collisionCount++;p.hits++;
                    p.lastHit=ion;p.hitTime=this.clock;
                }
                changed=true;
            }
            if(!changed)break;
        }
        end.copy(q).applyQuaternion(this.group.quaternion).add(this.group.position);
    }
    clearance(point,radius){
        const p=this.local(point);let value=Infinity;
        for(const ion of this.ions)value=Math.min(value,p.distanceTo(ion.center)-this.style.ionRadius-radius);
        return value;
    }
}

// Subsequent lessons opt in only after their geometry/transport tests pass.
// A missing implementation must never silently draw an electrically wrong item.
export class InductorObject extends CircuitVisualObject {
    constructor(options){
        super(options);const T=this.THREE,{radius=1.2,turns=8}=this.style;
        const axis=this.end.clone().sub(this.start),length=axis.length();
        const rotation=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),axis.clone().normalize());
        const start=this.start.clone();
        class CoilCurve extends T.Curve {getPoint(t,target=new T.Vector3()){
            const taper=Math.sin(Math.PI*t),angle=t*turns*Math.PI*2;
            return target.set(radius*taper*Math.cos(angle),length*t,radius*taper*Math.sin(angle)).applyQuaternion(rotation).add(start);
        }}
        this.curve=new CoilCurve();
    }
    build(parent){const T=this.THREE;this.group.add(new T.Mesh(new T.TubeGeometry(this.curve,512,this.style.wireRadius||0.08,12,false),new T.MeshBasicMaterial({color:0x3b82f6})));return super.build(parent);}
}
export class CapacitorObject extends CircuitVisualObject {build(){throw new Error('Capacitor electrode transport is awaiting its incremental migration.');}}
export class JunctionObject extends CircuitVisualObject {build(){throw new Error('Junction routing is awaiting its incremental migration.');}}

export function createCircuitVisualObjects({THREE,graph,parent,CSS2DObject,componentStyles={}}){
    const types={wire:WireObject,resistor:ResistorObject,'emf-source':BatteryObject,inductor:InductorObject,capacitor:CapacitorObject,junction:JunctionObject};
    const objects=new Map();
    for(const component of graph.components.values()){
        const Type=types[component.type];if(!Type)throw new Error('Unsupported visual component '+component.type);
        objects.set(component.id,new Type({THREE,graph,component,CSS2DObject,style:componentStyles[component.id]||component.visual.style||{}}).build(parent));
    }
    return objects;
}
