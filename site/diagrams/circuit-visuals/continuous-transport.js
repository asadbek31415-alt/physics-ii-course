import {CIRCUIT_VISUAL_STYLE} from './component-objects.js';
const wrap=(n,length)=>((n%length)+length)%length;
function randomGenerator(seed=42){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}

export class ContinuousTransportSystem {
    constructor({THREE,graph,visualObjects,routeId,electricalState=null,parent=null,count=1200,seed=42}){
        Object.assign(this,{THREE,graph,visualObjects,electricalState});
        this.route=graph.transportRoutes.get(routeId);
        if(!this.route||!this.route.closed)throw new Error('This transport adapter requires a connected, closed route.');
        this.segments=[];this.length=0;this.time=0;this.accumulator=0;this.particles=[];
        for(const segment of this.route.segments){
            const visual=visualObjects.get(segment.componentId);
            if(!visual)throw new Error('Missing visual '+segment.componentId);
            const length=visual.getTransportLength();
            if(!(length>0))throw new Error('Zero-length transport component.');
            this.segments.push({...segment,visual,start:this.length,length});this.length+=length;
        }
        this.resistors=[...visualObjects.values()].filter(v=>v.component.type==='resistor');
        this.crossings=Object.fromEntries(this.segments.map(s=>[s.componentId,0]));
        const T=THREE,rng=randomGenerator(seed),style=CIRCUIT_VISUAL_STYLE.particles;
        for(let i=0;i<count;i++){
            const s=(i+0.5)*this.length/count,base=this.point(s),frame=this.frame(s);
            const angle=rng()*Math.PI*2,laneRadius=Math.sqrt(rng())*0.42,radialScale=this.radiusAt(s)/0.43;
            const laneA=Math.cos(angle)*laneRadius,laneB=Math.sin(angle)*laneRadius;
            const p={id:i,seed:i+13,s,base,position:base.clone().addScaledVector(frame.normal,laneA*radialScale).addScaledVector(frame.binormal,laneB*radialScale),
                laneA,laneB,a:laneA*radialScale,b:laneB*radialScale,va:0,vb:0,velocity:new T.Vector3(),driftVelocity:new T.Vector3(),radius:style.radius,hits:0,laps:0,hitTime:-1};
            for(const resistor of this.resistors)if(resistor.contains(base))resistor.resolveMotion(p,p.position,p.position,1/120);
            const relative=p.position.clone().sub(base);p.a=relative.dot(frame.normal);p.b=relative.dot(frame.binormal);
            this.particles.push(p);
        }
        this.rng=rng;
        if(parent){
            this.mesh=new T.InstancedMesh(new T.SphereGeometry(style.radius,8,8),new T.MeshBasicMaterial({color:style.color}),count);
            this.mesh.frustumCulled=false;this.mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);parent.add(this.mesh);this.dummy=new T.Object3D();this.render();
        }
    }
    locate(s){
        const value=wrap(s,this.length);
        const segment=this.segments.find(item=>value<item.start+item.length)||this.segments.at(-1);
        return {segment,distance:value-segment.start};
    }
    point(s){const {segment,distance}=this.locate(s);return segment.visual.getTransportPointAt(segment.direction===1?distance/segment.length:1-distance/segment.length);}
    frame(s){
        const T=this.THREE,tangent=this.point(s+0.45).sub(this.point(s-0.45)).normalize();
        const normal=new T.Vector3(-tangent.y,tangent.x,0);
        if(normal.lengthSq()<1e-5)normal.set(1,0,0);
        normal.normalize();return {tangent,normal,binormal:new T.Vector3().crossVectors(tangent,normal).normalize()};
    }
    radiusAt(s){
        const {segment,distance}=this.locate(s);
        if(segment.visual.component.type==='resistor'){
            const entry=Math.min(distance,segment.length-distance),t=Math.min(1,Math.max(0,entry/1.35));
            return 0.43+(segment.visual.style.radius-0.16-0.43)*(t*t*(3-2*t));
        }
        return 0.43;
    }
    setElectricalState(state){
        if(state?.status==='ready'){
            const values=this.segments.map(s=>state.getCurrent(s.componentId)*s.direction);
            if(Math.max(...values)-Math.min(...values)>1e-7*Math.max(1,...values.map(Math.abs)))throw new Error('Series route has inconsistent solver currents.');
        }
        this.electricalState=state;
    }
    step(dt){
        const state=this.electricalState;
        const maxCurrent=state?.status==='ready'?Math.max(...this.segments.map(s=>Math.abs(state.getCurrent(s.componentId)))):0;
        const pieces=Math.max(1,Math.ceil(maxCurrent*CIRCUIT_VISUAL_STYLE.particles.speedPerAmp*dt/0.035));
        for(let i=0;i<pieces;i++)this.integrate(dt/pieces);
    }
    integrate(dt){
        this.time+=dt;
        for(const resistor of this.resistors)resistor.update(dt,this.time);
        const state=this.electricalState,ready=state?.status==='ready',style=CIRCUIT_VISUAL_STYLE.particles;
        for(const p of this.particles){
            const before=this.locate(p.s).segment;
            const amps=ready?state.getCurrent(before.componentId)*before.direction:0,speed=style.speedPerAmp*amps;
            const previousBase=p.base.clone(),start=p.position.clone(),oldRadius=this.radiusAt(p.s);
            const next=p.s+speed*dt;p.laps+=Math.floor(next/this.length);p.s=wrap(next,this.length);p.base.copy(this.point(p.s));
            const after=this.locate(p.s).segment;
            if(before!==after)this.crossings[before.componentId]+=Math.sign(speed);
            p.driftVelocity.copy(p.base).sub(previousBase).multiplyScalar(1/dt);
            const frame=this.frame(p.s),limit=this.radiusAt(p.s),expansion=limit/0.43;
            const inResistor=after.visual.component.type==='resistor';
            p.a*=limit/oldRadius;p.b*=limit/oldRadius;
            const damping=inResistor?4:10,stiffness=inResistor?2:14;
            p.va=p.va*Math.exp(-damping*dt)-(p.a-p.laneA*expansion)*stiffness*dt;
            p.vb=p.vb*Math.exp(-damping*dt)-(p.b-p.laneB*expansion)*stiffness*dt;
            const noise=(inResistor?style.thermalSpeed:0.08)*Math.sqrt(dt)*5;
            p.va+=(this.rng()-0.5)*noise;p.vb+=(this.rng()-0.5)*noise;
            p.a+=p.va*dt;p.b+=p.vb*dt;
            const radial=Math.hypot(p.a,p.b);
            if(radial>limit){
                const na=p.a/radial,nb=p.b/radial,outward=p.va*na+p.vb*nb;
                const reflected=Math.max(0,2*limit-radial);
                p.a=na*reflected;p.b=nb*reflected;
                if(outward>0){p.va-=1.8*outward*na;p.vb-=1.8*outward*nb;}
            }
            const desired=p.base.clone().addScaledVector(frame.normal,p.a).addScaledVector(frame.binormal,p.b);
            p.velocity.copy(frame.normal).multiplyScalar(p.va).addScaledVector(frame.binormal,p.vb);
            if(inResistor)after.visual.resolveMotion(p,start,desired,dt);
            const relative=desired.clone().sub(p.base);p.a=relative.dot(frame.normal);p.b=relative.dot(frame.binormal);
            p.va=p.velocity.dot(frame.normal);p.vb=p.velocity.dot(frame.binormal);
            p.position.copy(desired);
        }
    }
    update(dt){
        this.accumulator+=Math.min(Math.max(dt,0),0.05);
        while(this.accumulator>=1/120){this.step(1/120);this.accumulator-=1/120;}
        this.render();
    }
    render(){if(this.mesh){for(const p of this.particles){this.dummy.position.copy(p.position);this.dummy.updateMatrix();this.mesh.setMatrixAt(p.id,this.dummy.matrix);}this.mesh.instanceMatrix.needsUpdate=true;}}
    metrics(){
        const occupancy=Object.fromEntries(this.segments.map(s=>[s.componentId,0]));
        let maxOffset=0,minClearance=Infinity,maxRadiusOverrun=0;
        for(const p of this.particles){
            occupancy[this.locate(p.s).segment.componentId]++;
            maxOffset=Math.max(maxOffset,p.position.distanceTo(p.base));
            maxRadiusOverrun=Math.max(maxRadiusOverrun,Math.hypot(p.a,p.b)-this.radiusAt(p.s));
            for(const r of this.resistors)if(r.contains(p.position))minClearance=Math.min(minClearance,r.clearance(p.position,p.radius));
        }
        return {count:this.particles.length,occupancy,maxOffset,maxRadiusOverrun,minClearance,collisions:this.resistors.reduce((sum,r)=>sum+r.collisionCount,0),crossings:{...this.crossings}};
    }
    dispose(){this.mesh?.geometry.dispose();this.mesh?.material.dispose();this.mesh?.removeFromParent();}
}
