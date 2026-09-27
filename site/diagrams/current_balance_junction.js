import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const { createCircuitScene, createCircuitLabel } = window.CircuitLab.configure({ THREE, OrbitControls, CSS2DRenderer, CSS2DObject });
const container = document.getElementById('scene-container');
const ui = Object.fromEntries(['sourceSlider', 'topSlider', 'bottomSlider', 'sourceValue', 'topValue', 'bottomValue', 'balancedBtn', 'pileBtn', 'pauseBtn', 'resetBtn', 'balanceEquation', 'balanceValue', 'storedValue', 'statusText'].map(id => [id, document.getElementById(id)]));
const vector = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const curves = {
    incoming: new THREE.LineCurve3(vector(-12, 0), vector(0, 0)),
    top: new THREE.CubicBezierCurve3(vector(0, 0), vector(2.1, 0), vector(1.8, 2.2), vector(6, 2.2)),
    bottom: new THREE.CubicBezierCurve3(vector(0, 0), vector(2.1, 0), vector(1.8, -2.2), vector(6, -2.2)),
    feed: new THREE.CubicBezierCurve3(vector(-0.65, 4.1), vector(-0.65, 1.6), vector(-0.7, 0), vector(0, 0))
};
const lab = createCircuitScene({ container, background: 0x050505, camera: { fov: 40, position: [0, 1.5, 18], target: [0, 0.45, 0] }, controls: { enablePan: false, minDistance: 12, maxDistance: 35 } });
lab.controls.enableZoom = false;
lab.controls.minAzimuthAngle = -0.3;
lab.controls.maxAzimuthAngle = 0.3;
lab.controls.minPolarAngle = Math.PI / 2 - 0.3;
lab.controls.maxPolarAngle = Math.PI / 2 + 0.15;
const wires = {};

function frame(curve, t) {
    const tangent = curve.getTangentAt(t).normalize();
    return { center: curve.getPointAt(t), normal: vector(-tangent.y, tangent.x).normalize() };
}

// The guide and particles share a curve and local frame, including through bends.
for (const [name, curve] of Object.entries(curves)) {
    const group = new THREE.Group();
    const radius = name === 'feed' ? 0.15 : 0.34;
    const material = new THREE.LineBasicMaterial({ color: name === 'feed' ? 0xc3aa61 : 0x909090, transparent: true, opacity: name === 'feed' ? 0.32 : 0.22 });
    for (let lane = 0; lane < 10; lane++) {
        const angle = lane / 10 * Math.PI * 2;
        const points = [];
        for (let i = 0; i <= 100; i++) {
            const { center, normal } = frame(curve, i / 100);
            points.push(center.addScaledVector(normal, radius * Math.cos(angle)).add(vector(0, 0, radius * Math.sin(angle))));
        }
        group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
    }
    for (const t of [0, 1]) {
        if (name === 'incoming' || ((name === 'top' || name === 'bottom') && t === 0) || (name === 'feed' && t === 1)) continue;
        const { center, normal } = frame(curve, t);
        const points = Array.from({ length: 33 }, (_, i) => center.clone().addScaledVector(normal, radius * Math.cos(i / 32 * Math.PI * 2)).add(vector(0, 0, radius * Math.sin(i / 32 * Math.PI * 2))));
        group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
    }
    lab.circuit.add(group);
    wires[name] = group;
}

const labels = {};
const labelPositions = { incoming: [-4.3, 0.82, 0], top: [4.2, 3.05, 0], bottom: [4.2, -3.05, 0], feed: [-2.35, 3.4, 0] };
const symbols = { incoming: 'I_{\\mathrm{in}}', top: 'I_1', bottom: 'I_2', feed: 'I_{\\mathrm{add}}' };
const arrows = {};
for (const [name, position] of Object.entries(labelPositions)) {
    const label = createCircuitLabel({ text: '', className: 'current-label', position: vector(...position), parent: lab.circuit });
    label.element.dataset.wire = name;
    labels[name] = label;
    const t = name === 'feed' ? 0.3 : name === 'incoming' ? 0.7 : 0.58;
    const { center, normal } = frame(curves[name], t);
    const arrow = new THREE.ArrowHelper(curves[name].getTangentAt(t), center.addScaledVector(normal, name === 'bottom' ? -0.6 : 0.6), 0.65, name === 'feed' ? 0xfbbf24 : 0x929eae, 0.18, 0.12);
    lab.circuit.add(arrow);
    arrows[name] = arrow;
}

const flow = new window.JunctionTransport({ lengths: Object.fromEntries(Object.entries(curves).map(([name, curve]) => [name, curve.getLength()])) });
const capacity = 6000;
const charges = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.039, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), capacity);
charges.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
charges.frustumCulled = false;
lab.circuit.add(charges);
const dummy = new THREE.Object3D();
const blue = new THREE.Color(0x3b82f6);
const orange = new THREE.Color(0xfb923c);
const feedBlue = new THREE.Color(0x7db0ff);
let paused = false;
let accumulator = 0;
let lastTime = performance.now();
let lastCharge = '';
let lastStatus = '';

function math(element, tex) { window.katex.render(tex, element, { throwOnError: false }); }
document.querySelectorAll('[data-tex]').forEach(element => math(element, element.dataset.tex));

function refreshReadings() {
    const { charge, offscreenCharge } = flow.metrics();
    const formatted = charge.toFixed(1);
    if (lastCharge !== formatted) {
        math(ui.storedValue, `Q = ${formatted}\\,\\mathrm{C}`);
        lastCharge = formatted;
    }
    const current = flow.currents;
    const status = offscreenCharge > 0 ? 'Buildup continues upstream, beyond the view'
        : current.accumulation > 0.001 ? 'Moving charge builds up toward the left'
        : current.feed > 0.001 ? 'Top wire supplies the missing current'
        : charge > 0 ? 'Stored charge is constant' : 'No charge buildup';
    if (status !== lastStatus) { ui.statusText.textContent = status; lastStatus = status; }
    const feedVisible = current.feed > 0.001;
    wires.feed.visible = feedVisible;
    labels.feed.visible = feedVisible;
}

function syncUi() {
    const current = flow.currents;
    const accumulating = current.accumulation > 0.001;
    document.body.dataset.mode = accumulating ? 'accumulation' : 'balanced';
    ui.balancedBtn.classList.toggle('active', !accumulating);
    ui.pileBtn.classList.toggle('active', accumulating);
    ui.balancedBtn.setAttribute('aria-pressed', String(!accumulating));
    ui.pileBtn.setAttribute('aria-pressed', String(accumulating));
    for (const [input, output, name] of [['sourceSlider', 'sourceValue', 'incoming'], ['topSlider', 'topValue', 'top'], ['bottomSlider', 'bottomValue', 'bottom']]) {
        ui[input].value = current[name];
        ui[input].setAttribute('aria-valuetext', `${current[name].toFixed(1)} amperes`);
        ui[output].textContent = `${current[name].toFixed(1)} A`;
    }
    for (const [name, label] of Object.entries(labels)) {
        math(label.element, `${symbols[name]} = ${current[name].toFixed(1)}\\,\\mathrm{A}`);
        arrows[name].visible = current[name] > 0.001;
        arrows[name].setLength(0.4 + 0.1 * current[name], 0.16, 0.11);
    }
    math(ui.balanceEquation, current.feed > 0.001 ? 'I_{\\mathrm{in}}+I_{\\mathrm{add}}=I_1+I_2' : accumulating ? 'I_{\\mathrm{in}}>I_1+I_2' : 'I_{\\mathrm{in}}=I_1+I_2');
    math(ui.balanceValue, `\\frac{dQ}{dt}=${current.accumulation.toFixed(1)}\\,\\mathrm{C/s}`);
    refreshReadings();
}

function setPaused(value) {
    paused = value;
    ui.pauseBtn.textContent = paused ? 'Play' : 'Pause';
    ui.pauseBtn.setAttribute('aria-label', paused ? 'Resume simulation' : 'Pause simulation');
}

function reset() {
    flow.reset();
    accumulator = 0;
    setPaused(false);
    syncUi();
}

ui.balancedBtn.addEventListener('click', () => { flow.setCurrents(4, 2.4, 1.6); reset(); });
ui.pileBtn.addEventListener('click', () => { flow.setCurrents(5, 1.8, 1.2); reset(); });
ui.pauseBtn.addEventListener('click', () => setPaused(!paused));
ui.resetBtn.addEventListener('click', reset);
for (const input of [ui.sourceSlider, ui.topSlider, ui.bottomSlider]) input.addEventListener('input', () => {
    const changedMode = flow.setCurrents(Number(ui.sourceSlider.value), Number(ui.topSlider.value), Number(ui.bottomSlider.value));
    if (changedMode) {
        accumulator = 0;
        setPaused(false);
    }
    syncUi();
});

function fitCamera() {
    lab.resize();
    const distance = Math.max(8.6, 14 / lab.camera.aspect) / (2 * Math.tan(THREE.MathUtils.degToRad(lab.camera.fov / 2)));
    lab.camera.position.copy(lab.controls.target).add(vector(0, 0.07, 1).normalize().multiplyScalar(distance));
    lab.controls.minDistance = distance;
    lab.controls.maxDistance = distance;
    lab.controls.update();
}
new ResizeObserver(fitCamera).observe(container);

function drawCharges() {
    charges.count = flow.particles.length;
    flow.particles.forEach((particle, index) => {
        const t = THREE.MathUtils.clamp(particle.s / flow.lengths[particle.path], 0, 1);
        const { center, normal } = frame(curves[particle.path], t);
        dummy.position.copy(center).addScaledVector(normal, particle.a).add(vector(0, 0, particle.b));
        dummy.updateMatrix();
        charges.setMatrixAt(index, dummy.matrix);
        charges.setColorAt(index, particle.queued ? orange : particle.path === 'feed' ? feedBlue : blue);
    });
    charges.instanceMatrix.needsUpdate = true;
    if (charges.instanceColor) charges.instanceColor.needsUpdate = true;
}

function animate(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    if (!paused && !document.hidden) {
        accumulator += dt;
        while (accumulator >= 1 / 120) {
            flow.step(1 / 120);
            accumulator -= 1 / 120;
        }
    }
    refreshReadings();
    drawCharges();
    lab.controls.update();
    lab.render();
    requestAnimationFrame(animate);
}

syncUi();
fitCamera();
requestAnimationFrame(animate);
