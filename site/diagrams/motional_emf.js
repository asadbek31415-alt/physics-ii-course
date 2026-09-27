'use strict';

const { SlidingBarModel } = window.SlidingBarPhysics;
const model = new SlidingBarModel();
const viewport = document.getElementById('viewport');
const element = (id) => document.getElementById(id);
const format = (value, units) => (Math.abs(value) < 0.005 ? '0.00' : Math.abs(value).toFixed(2)) + ' ' + units;
const signed = (value, units) => (Math.abs(value) < 0.005 ? '0.00' : (value > 0 ? '+' : '−') + Math.abs(value).toFixed(2)) + ' ' + units;

document.querySelectorAll('[data-tex]').forEach((node) => {
    window.katex.render(node.dataset.tex, node, { throwOnError: false, output: 'htmlAndMathml' });
});

const stages = {
    1: {
        title: 'Magnetic force on charges',
        given: 'A bar moves through an externally supplied, static field. Free charges move with the bar.',
        law: '\\mathbf{F}_{mag}=q(\\mathbf{v}\\times\\mathbf{B})',
        lawText: 'This is the established Lorentz force law. It tells us the physical push on each charge.',
        result: '\\mathbf{f}_{mag}/q=\\mathbf{v}\\times\\mathbf{B}',
        resultText: 'For rightward motion and B into the page, positive charges are pushed upward in the bar.'
    },
    2: {
        title: 'The bar becomes a voltage source',
        given: 'The bar has length h. The rails are present, but the circuit is open so current cannot flow.',
        law: '\\mathcal{E}=\\oint \\mathbf{f}_s\\cdot d\\mathbf{l}',
        lawText: 'EMF is the source work per unit charge around the loop. Here the source push is v × B in the moving bar.',
        result: '|\\mathcal{E}|=Bh|v|',
        resultText: 'Charge separation creates a potential difference across the bar. Voltage exists even though I = 0.'
    },
    3: {
        title: 'Closing the circuit produces current',
        given: 'The resistor R closes the loop. The moving bar still supplies the same EMF.',
        law: 'I=\\mathcal{E}/R',
        lawText: 'This is the circuit relation for the ideal source and load. Resistance determines current, not the generated EMF.',
        result: 'P=I^2R',
        resultText: 'Current flows around the loop, and mechanical work supplied to the bar becomes heat in the resistor.'
    },
    4: {
        title: 'The flux rule is the same result',
        given: 'The field is constant, but the moving bar changes the enclosed area A = hx.',
        law: '\\Phi_B=B_zA,\\qquad \\mathcal{E}=-d\\Phi_B/dt',
        lawText: 'This is the compact flux description. The changing boundary is caused by motion of the conductor.',
        result: '\\mathcal{E}=-B_z h v',
        resultText: 'The flux rule reproduces the Lorentz-force result. Flux itself can be nonzero while EMF is zero when v = 0.'
    }
};

let stage = 1;
let renderer;
try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
} catch (error) {
    element('render-error').hidden = false;
    throw error;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x080a0b);
renderer.domElement.setAttribute('aria-label', 'Sliding conducting bar on fixed rails in a magnetic field');
renderer.domElement.setAttribute('role', 'img');
viewport.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-6.6, 6.6, 5, -5, 0.1, 100);
camera.position.set(0, 0, 20);
scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const light = new THREE.DirectionalLight(0xffffff, 0.9);
light.position.set(-3, 5, 10);
scene.add(light);

const LEFT = -4.2;
const RIGHT = 4.8;
const HALF_HEIGHT = 1.8;
const SCALE = 3.6;
const silver = new THREE.MeshStandardMaterial({ color: 0xb3c2cb, metalness: 0.65, roughness: 0.3 });
const brass = new THREE.MeshStandardMaterial({ color: 0xeebd55, metalness: 0.5, roughness: 0.28 });
const dark = new THREE.MeshStandardMaterial({ color: 0x303a3e, metalness: 0.3, roughness: 0.5 });
const vector = (x, y, z = 0) => new THREE.Vector3(x, y, z);

function wire(a, b, material = silver, radius = 0.075, parent = scene) {
    const delta = b.clone().sub(a);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), 12), material);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(vector(0, 1), delta.normalize());
    parent.add(mesh);
    return mesh;
}

function line(points, color, parent = scene) {
    const result = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color }));
    parent.add(result);
    return result;
}

const fluxArea = new THREE.Mesh(new THREE.PlaneGeometry(1, 2 * HALF_HEIGHT),
    new THREE.MeshBasicMaterial({ color: 0x24596b, transparent: true, opacity: 0.4 }));
fluxArea.position.z = -0.3;
scene.add(fluxArea);

const crosses = new THREE.Group();
const dots = new THREE.Group();
const fieldMaterial = new THREE.LineBasicMaterial({ color: 0x397760 });
for (let x = -3.65; x < 4.6; x += 0.86) {
    for (let y = -1.28; y < 1.5; y += 0.85) {
        const symbol = new THREE.Group();
        const ringPoints = Array.from({ length: 33 }, (_, i) => {
            const angle = i * Math.PI / 16;
            return vector(x + 0.14 * Math.cos(angle), y + 0.14 * Math.sin(angle), -0.1);
        });
        const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ringPoints), fieldMaterial);
        symbol.add(ring);
        symbol.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
            vector(x - 0.075, y - 0.075, -0.1), vector(x + 0.075, y + 0.075, -0.1),
            vector(x - 0.075, y + 0.075, -0.1), vector(x + 0.075, y - 0.075, -0.1)
        ]), fieldMaterial));
        crosses.add(symbol);
        dots.add(ring.clone());
        const dot = new THREE.Mesh(new THREE.CircleGeometry(0.04, 10), new THREE.MeshBasicMaterial({ color: 0x69b897 }));
        dot.position.set(x, y, -0.1);
        dots.add(dot);
    }
}
scene.add(crosses, dots);

for (const y of [-HALF_HEIGHT, HALF_HEIGHT]) {
    wire(vector(LEFT, y), vector(RIGHT, y));
    for (const x of [LEFT, RIGHT]) {
        const support = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.38, 0.15), dark);
        support.position.set(x, y, -0.15);
        scene.add(support);
    }
}
wire(vector(LEFT, -HALF_HEIGHT), vector(LEFT, -1.35));
wire(vector(LEFT, -0.25), vector(LEFT, 0.38));
wire(vector(LEFT, 1.28), vector(LEFT, HALF_HEIGHT));
const loadMaterial = new THREE.MeshStandardMaterial({ color: 0xbdb6a1, roughness: 0.8 });
const load = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.1, 0.24), loadMaterial);
load.position.set(LEFT, -0.8, 0.05);
scene.add(load);
const meter = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.18, 40), dark);
meter.rotation.x = Math.PI / 2;
meter.position.set(LEFT, 0.83, 0.03);
scene.add(meter);
const meterFace = new THREE.Mesh(new THREE.CircleGeometry(0.36, 40), new THREE.MeshBasicMaterial({ color: 0x182c28 }));
meterFace.position.set(LEFT, 0.83, 0.14);
scene.add(meterFace);

const rod = new THREE.Group();
const bar = new THREE.Mesh(new THREE.BoxGeometry(0.23, 4, 0.25), brass);
bar.position.z = 0.13;
rod.add(bar);
for (const y of [-HALF_HEIGHT, HALF_HEIGHT]) {
    const contact = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.26, 0.25), brass);
    contact.position.set(0, y, 0.23);
    rod.add(contact);
}
scene.add(rod);

const xDimension = line([vector(LEFT, -2.45), vector(0, -2.45)], 0x55616a);
line([vector(LEFT, -2.32), vector(LEFT, -2.58)], 0x55616a);
const xTick = line([vector(0, -2.32), vector(0, -2.58)], 0x55616a);
line([vector(5.35, -HALF_HEIGHT), vector(5.35, HALF_HEIGHT)], 0x55616a);
for (const y of [-HALF_HEIGHT, HALF_HEIGHT]) line([vector(5.22, y), vector(5.48, y)], 0x55616a);

const velocityArrow = new THREE.ArrowHelper(vector(1, 0), vector(0, 2.45, 0.1), 1.2, 0x74c9f1, 0.23, 0.15);
scene.add(velocityArrow);
const forceArrows = [-1.2, -0.6, 0, 0.6, 1.2].map((y) => {
    const arrow = new THREE.ArrowHelper(vector(0, 1), vector(0, y, 0.45), 0.38, 0xf293b5, 0.12, 0.08);
    scene.add(arrow);
    return arrow;
});
const electricArrow = new THREE.ArrowHelper(vector(0, -1), vector(0, 0, 0.46), 0.65, 0xb4a3f5, 0.16, 0.1);
scene.add(electricArrow);
const currentArrows = Array.from({ length: 30 }, () => {
    const arrow = line([vector(-0.14, -0.10), vector(0, 0), vector(-0.14, 0.10)], 0xffdc75);
    arrow.position.z = 0.38;
    return arrow;
});
let currentTravel = 0;
let history = [];
const labels = Object.fromEntries(Array.from(element('scene-labels').children).map((node) => [node.id, node]));

function placeLabel(id, x, y, value) {
    const node = labels[id];
    const point = vector(x, y, 0.5).project(camera);
    node.style.left = (point.x + 1) * viewport.clientWidth / 2 + 'px';
    node.style.top = (1 - point.y) * viewport.clientHeight / 2 + 'px';
    if (value !== undefined) node.textContent = value;
}

function renderEquation(id, tex) {
    window.katex.render(tex, element(id), { throwOnError: false, displayMode: true, output: 'htmlAndMathml' });
}

function setStage(nextStage) {
    stage = nextStage;
    const copy = stages[stage];
    document.querySelector('.simulation').dataset.stage = String(stage);
    document.querySelectorAll('.stages button').forEach((button) => {
        const selected = Number(button.dataset.step) === stage;
        button.setAttribute('aria-selected', String(selected));
        button.tabIndex = selected ? 0 : -1;
    });
    document.querySelector('#lesson-panel').setAttribute('aria-labelledby', 'stage-' + stage);
    element('given-text').textContent = copy.given;
    element('law-heading').textContent = stage === 4 ? 'Established result' : 'Established law';
    element('law-text').textContent = copy.lawText;
    element('result-text').textContent = copy.resultText;
    renderEquation('law-equation', copy.law);
    renderEquation('result-equation', copy.result);
    document.querySelectorAll('[data-from]').forEach((node) => node.classList.toggle('is-hidden', Number(node.dataset.from) > stage));
    element('scene-title').textContent = copy.title;
    element('force-key').textContent = stage === 4 ? 'Shaded area: the moving loop boundary' : 'Pink: magnetic force per positive charge';
    element('observation-title').textContent = stage === 1 ? 'Watch the cause' : stage === 2 ? 'Voltage before current' : stage === 3 ? 'The circuit result' : 'Two descriptions, one EMF';
    element('observation-text').textContent = stage === 1
        ? 'The arrow on each positive charge points along v × B. This is the physical cause established by the Lorentz law.'
        : stage === 2
            ? 'The force separates charge in the bar. That separation is the source of a voltage; the open circuit makes the distinction visible.'
            : stage === 3
                ? 'Closing the loop lets the source push charges everywhere. The resistor receives the electrical power supplied by the mechanical drive.'
                : 'The bar motion changes A = hx. The graph makes the derivative visible: the induced EMF is the negative slope of flux.';
    renderState(model.state(), 0);
}

function drawHistory() {
    const canvas = element('history');
    if (!canvas || stage < 4) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(width * scale));
    canvas.height = Math.max(1, Math.floor(height * scale));
    const ctx = canvas.getContext('2d');
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = '#34383b';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2); ctx.stroke();
    if (history.length < 2) return;
    const maxFlux = Math.max(1, ...history.map((point) => Math.abs(point.flux)));
    const maxEmf = Math.max(0.2, ...history.map((point) => Math.abs(point.emf)));
    const draw = (key, color, max) => {
        ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
        history.forEach((point, index) => {
            const x = index / (history.length - 1) * width;
            const y = height / 2 - point[key] / max * (height * 0.4);
            if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
    };
    draw('flux', '#80c6d7', maxFlux);
    draw('emf', '#ffdc75', maxEmf);
}

function renderState(state, dt) {
    const width = state.x * SCALE;
    const barX = LEFT + width;
    rod.position.x = barX;
    fluxArea.scale.x = width;
    fluxArea.position.x = LEFT + width / 2;
    crosses.visible = model.field > 0 && !model.fieldReversed;
    dots.visible = model.field > 0 && model.fieldReversed;
    xDimension.geometry.attributes.position.setXYZ(1, barX, -2.45, 0);
    xDimension.geometry.attributes.position.needsUpdate = true;
    xTick.position.x = barX;
    velocityArrow.position.x = barX;
    velocityArrow.setDirection(vector(Math.sign(state.velocity) || 1, 0));
    velocityArrow.setLength(0.25 + Math.abs(state.velocity) * 1.15, 0.2, 0.14);
    velocityArrow.visible = Math.abs(state.velocity) > 0.01;

    const forceSign = Math.sign(state.emf) || 1;
    forceArrows.forEach((arrow, index) => {
        arrow.position.x = barX;
        arrow.setDirection(vector(0, forceSign, 0));
        arrow.visible = stage <= 2 && Math.abs(state.velocity) > 0.01;
        arrow.position.y = [-1.2, -0.6, 0, 0.6, 1.2][index];
    });
    electricArrow.position.x = barX;
    electricArrow.setDirection(vector(0, -forceSign, 0));
    electricArrow.visible = stage === 2 && Math.abs(state.emf) > 0.005;

    const spacing = 0.9;
    currentTravel = (currentTravel + state.current * dt * 3) % spacing;
    currentArrows.forEach((arrow, i) => {
        const segment = i < 10 ? 0 : i < 20 ? 1 : i < 25 ? 2 : 3;
        const index = segment < 2 ? i % 10 : (i - 20) % 5;
        const forward = segment === 0 || segment === 2;
        const offset = ((forward ? currentTravel : -currentTravel) % spacing + spacing) % spacing;
        const distance = index * spacing + offset;
        const horizontal = segment < 2;
        const x = horizontal ? LEFT + distance : segment === 2 ? barX : LEFT;
        const y = horizontal ? (segment === 0 ? -HALF_HEIGHT : HALF_HEIGHT) : -HALF_HEIGHT + distance;
        const angle = [0, Math.PI, Math.PI / 2, -Math.PI / 2][segment];
        const overLoad = segment === 3 && y > -1.45 && y < 1.4;
        arrow.visible = stage >= 3 && model.closed && distance < (horizontal ? width : 2 * HALF_HEIGHT)
            && Math.abs(state.current) > 0.002 && !overLoad;
        arrow.position.set(x, y, 0.4);
        arrow.rotation.z = angle + (state.current < 0 ? Math.PI : 0);
    });
    loadMaterial.color.set(0xbdb6a1).lerp(new THREE.Color(0xff8645), Math.min(1, state.power / 1.2));
    load.material.opacity = model.closed ? 1 : 0.45;
    load.material.transparent = !model.closed;

    placeLabel('rod-label', barX, 3.25, model.moving ? 'Moving conductor' : 'Held conductor');
    placeLabel('rail-label', -2.8, 2.2);
    placeLabel('area-label', LEFT + width / 2, 0);
    placeLabel('length-label', 5.35, 0);
    placeLabel('distance-label', LEFT + width / 2, -2.83, 'x = ' + state.x.toFixed(2) + ' m');
    placeLabel('velocity-label', barX, -3.55, 'v = ' + format(state.velocity, 'm/s') + (Math.abs(state.velocity) < 0.005 ? '' : state.velocity > 0 ? ' →' : ' ←'));
    const sign = Math.abs(state.emf) < 0.005 ? '' : state.emf > 0 ? '+' : '−';
    placeLabel('top-polarity', barX + 0.4, 1.4, sign);
    placeLabel('bottom-polarity', barX + 0.4, -1.4, sign === '+' ? '−' : sign === '−' ? '+' : '');
    placeLabel('ammeter-label', LEFT, 0.83);
    placeLabel('load-label', LEFT, -0.8);
    placeLabel('magnetic-label', barX + 0.7, 0.8, stage <= 2 ? 'v × B' : '');
    placeLabel('electric-label', barX + 0.7, -0.8, stage === 2 ? 'E' : '');
    placeLabel('switch-label', LEFT + 0.72, -0.05, model.closed ? '' : 'Open circuit');
    labels['magnetic-label'].style.display = stage <= 2 && Math.abs(state.velocity) > 0.01 ? '' : 'none';
    labels['electric-label'].style.display = stage === 2 && Math.abs(state.emf) > 0.005 ? '' : 'none';
    labels['switch-label'].style.display = !model.closed && stage >= 3 ? '' : 'none';

    element('area').textContent = format(state.area, 'm²');
    element('flux').textContent = signed(state.flux, 'Wb');
    element('voltage').textContent = format(state.emf, 'V');
    element('current').textContent = format(state.current, 'A');
    element('power').textContent = format(state.power, 'W');
    element('field-direction').textContent = model.field === 0 ? 'B = 0 (field off)' : model.fieldReversed ? '⊙ B out of the page' : '⊗ B into the page';
    element('current-direction').textContent = stage < 3 ? '' : !model.closed ? 'Circuit open: no current' : Math.abs(state.current) < 0.002 ? 'No induced current' : state.current > 0 ? '↺ Current: counterclockwise' : '↻ Current: clockwise';
    element('flux-rate').textContent = 'dΦ/dt = ' + signed(-state.emf, 'Wb/s');
    element('signed-emf').textContent = 'ℰ = ' + signed(state.emf, 'V');
    if (stage >= 4 && dt > 0) {
        history.push({ flux: state.flux, emf: state.emf });
        if (history.length > 120) history.shift();
    }
    drawHistory();
    renderer.render(scene, camera);
}

function setMotion(moving) {
    model.moving = moving;
    element('moving').setAttribute('aria-pressed', String(moving));
    element('held').setAttribute('aria-pressed', String(!moving));
    renderState(model.state(), 0);
}

document.querySelectorAll('.stages button').forEach((button) => {
    button.addEventListener('click', () => setStage(Number(button.dataset.step)));
});
element('moving').addEventListener('click', () => setMotion(true));
element('held').addEventListener('click', () => setMotion(false));
element('closed').addEventListener('change', (event) => { model.closed = event.target.checked; renderState(model.state(), 0); });
element('field').addEventListener('input', (event) => { model.field = Number(event.target.value); element('field-value').textContent = model.field.toFixed(1) + ' T'; renderState(model.state(), 0); });
element('reverse').addEventListener('change', (event) => { model.fieldReversed = event.target.checked; renderState(model.state(), 0); });
element('speed').addEventListener('input', (event) => { model.peakSpeed = Number(event.target.value); element('speed-value').textContent = model.peakSpeed.toFixed(1) + ' m/s'; });
element('resistance').addEventListener('input', (event) => { model.resistance = Number(event.target.value); element('resistance-value').textContent = model.resistance.toFixed(1) + ' Ω'; renderState(model.state(), 0); });
document.querySelectorAll('.stages button').forEach((button) => button.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); setStage(Math.min(4, stage + 1)); element('stage-' + stage).focus(); }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); setStage(Math.max(1, stage - 1)); element('stage-' + stage).focus(); }
}));
element('resistance-value').textContent = model.resistance.toFixed(1) + ' Ω';

function resize() {
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    const aspect = width / height;
    const viewWidth = Math.max(13.2, 9.8 * aspect);
    const viewHeight = viewWidth / aspect;
    camera.left = -viewWidth / 2; camera.right = viewWidth / 2; camera.top = viewHeight / 2; camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    renderState(model.state(), 0);
}
new ResizeObserver(resize).observe(viewport);
setStage(1);
resize();

let previousTime;
function animate(time) {
    const dt = previousTime === undefined ? 0 : Math.min(0.05, (time - previousTime) / 1000);
    previousTime = time;
    const state = model.advance(document.hidden ? 0 : dt);
    renderState(state, document.hidden ? 0 : dt);
    requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
