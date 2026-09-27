import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {CSS2DRenderer,CSS2DObject} from 'three/addons/renderers/CSS2DRenderer.js';
import {createEMFGraph} from './emf-topology.js';
import {FalstadAdapter} from '../circuit-core/falstad-adapter.js';
import {createCircuitVisualObjects} from '../circuit-visuals/component-objects.js';
import {ContinuousTransportSystem} from '../circuit-visuals/continuous-transport.js';

        // === UI TOGGLE ===
        window.toggleUI = () => {
            document.getElementById('ui-panel').classList.toggle('collapsed');
        };

        // === SETUP ===
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);
        const sceneContainer = document.getElementById('scene-container');

        const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
        camera.position.set(8, 5, 55);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        sceneContainer.appendChild(renderer.domElement);

        const labelRenderer = new CSS2DRenderer();
        labelRenderer.setSize(1, 1);
        labelRenderer.domElement.style.position = 'absolute';
        labelRenderer.domElement.style.top = '0px';
        labelRenderer.domElement.style.left = '0px';
        labelRenderer.domElement.style.pointerEvents = 'none';
        sceneContainer.appendChild(labelRenderer.domElement);

        function resizeRenderers() {
            const rect = sceneContainer.getBoundingClientRect();
            const width = Math.max(1, Math.floor(rect.width));
            const height = Math.max(1, Math.floor(rect.height));
            const narrowView = width < 700;
            camera.position.set(8, narrowView ? 6 : 5, narrowView ? 74 : 55);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            renderer.setSize(width, height, false);
            labelRenderer.setSize(width, height);
            controls.target.set(8, 0, 0);
            controls.update();
        }

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.enablePan = true; // Allow free panning too
        controls.target.set(8, 0, 0);
        controls.zoomSpeed = 0.55;
        controls.minDistance = 22;
        controls.maxDistance = 85;
        controls.update();

        // Lights
        scene.add(new THREE.AmbientLight(0xffffff, 0.2));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(10, 20, 10);
        scene.add(dirLight);

        // === CIRCUIT GROUP ===
        const circuit = new THREE.Group();
        circuit.position.x = 8;
        scene.add(circuit);


const graph=createEMFGraph();
const objects=createCircuitVisualObjects({THREE,graph,parent:circuit,CSS2DObject});
const flow=new ContinuousTransportSystem({THREE,graph,visualObjects:objects,routeId:'loop',parent:circuit});
const ui={
    emf:document.getElementById('slider-emf'),res:document.getElementById('slider-res'),
    current:document.getElementById('txt-cur'),resistance:document.getElementById('txt-res'),
    formula:document.getElementById('math-eq')
};
ui.current.textContent='...';
function renderFormula(){
    if(window.katex)window.katex.render("I = \\frac{\\mathcal{E}}{R}",ui.formula);
    else ui.formula.textContent='I = EMF / R';
}
renderFormula();
window.addEventListener('load',renderFormula,{once:true});
let paused=false,disposed=false,last=performance.now(),frameId=0;
const engine=new FalstadAdapter(graph,{
    onstate:state=>{
        flow.setElectricalState(state);
        for(const [id,object] of objects)object.setElectricalState(state.getComponentState(id));
        ui.current.textContent=state.getCurrent('resistor').toFixed(2)+' A';
        ui.current.removeAttribute('title');
    },
    onerror:error=>{
        ui.current.textContent='Unavailable';ui.current.title=error.message;
        flow.setElectricalState(null);console.error(error);
    }
});
let editTimer;
function updateParameters(){
    graph.getComponent('source').parameters.emf=Number(ui.emf.value);
    graph.getComponent('resistor').parameters.resistance=Number(ui.res.value);
    objects.get('source').setEMF(Number(ui.emf.value));
    objects.get('resistor').setResistance(Number(ui.res.value));
    ui.resistance.textContent=ui.res.value+' Ω';
    ui.current.textContent='...';flow.setElectricalState(null);
    clearTimeout(editTimer);editTimer=setTimeout(()=>engine.load(),80);
}
ui.emf.addEventListener('input',updateParameters);
ui.res.addEventListener('input',updateParameters);
function animate(now){
    if(disposed)return;
    const dt=Math.min(0.05,Math.max(0,(now-last)/1000));last=now;
    controls.update();if(!paused)flow.update(dt);
    renderer.render(scene,camera);labelRenderer.render(scene,camera);
    frameId=requestAnimationFrame(animate);
}
function visibility(){last=performance.now();if(engine.api)engine.api.setSimRunning(!document.hidden);}
document.addEventListener('visibilitychange',visibility);
window.addEventListener('resize',resizeRenderers);
window.addEventListener('orientationchange',resizeRenderers);
function dispose(){
    if(disposed)return;disposed=true;
    cancelAnimationFrame(frameId);clearTimeout(editTimer);engine.dispose();flow.dispose();
    for(const object of objects.values())object.dispose();
    controls.dispose();renderer.dispose();labelRenderer.domElement.remove();
    window.removeEventListener('resize',resizeRenderers);window.removeEventListener('orientationchange',resizeRenderers);
    document.removeEventListener('visibilitychange',visibility);
}
window.addEventListener('pagehide',dispose,{once:true});
// A restored bfcache page otherwise retains a disposed WebGL/solver instance.
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
if(new URLSearchParams(location.search).has('debug')){
    window.emfDebug={
        graph,objects,flow,engine,camera,controls,
        snapshot:()=>({electrical:engine.state.toJSON(),transport:flow.metrics()}),
        setParameters:(emf,resistance)=>{ui.emf.value=emf;ui.res.value=resistance;updateParameters();},
        setPaused:value=>{paused=value;},
        step:dt=>flow.update(dt),
        dispose
    };
}
resizeRenderers();frameId=requestAnimationFrame(animate);
engine.start().catch(error=>{ui.current.textContent='Unavailable';ui.current.title=error.message;console.error(error);});
