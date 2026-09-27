import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// Setup Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
camera.position.set(5, 5, 5);

// --- PHYSICS PARAMETERS ---
const B_COLOR = 0x00aaff; // Blue for Magnetic
const E_COLOR = 0xffcc00; // Gold/Yellow for Induced Electric
const SOURCE_COLOR = 0xff3300; // Red for -dB/dt
let time = 0;

// --- 1. THE MAGNETIC FIELD (B) ---
// Represented as a central cylinder of arrows
const bArrows = new THREE.Group();
const gridRes = 4;
for (let x = -1; x <= 1; x += 0.6) {
    for (let z = -1; z <= 1; z += 0.6) {
        if (Math.sqrt(x*x + z*z) > 1.1) continue;
        const arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x, -1, z), 2, B_COLOR, 0.2, 0.1);
        bArrows.add(arrow);
    }
}
scene.add(bArrows);

// --- 2. THE INDUCED ELECTRIC FIELD (E) ---
// Represented as concentric rings of arrows (Analogy to Magnetostatics)
const eArrows = new THREE.Group();
const createERing = (radius, count, yPos) => {
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const pos = new THREE.Vector3(x, yPos, z);
        // Tangential direction
        const dir = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle));
        const arrow = new THREE.ArrowHelper(dir, pos, 0.5, E_COLOR, 0.15, 0.1);
        eArrows.add(arrow);
    }
};
createERing(1.8, 12, 0); // Inner ring
createERing(2.8, 18, 0); // Outer ring
scene.add(eArrows);

// --- 3. SOURCE TERM INDICATOR (-dB/dt) ---
const sourceArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1.5, 0), 3, SOURCE_COLOR, 0.4, 0.2);
scene.add(sourceArrow);

// Add a floor grid for perspective
const grid = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
grid.position.y = -1.1;
scene.add(grid);

// Labels (Simple simulation of UI)
const createLabel = (text, color) => {
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.color = color;
    div.style.fontFamily = 'serif';
    div.style.fontSize = '1.2rem';
    div.innerText = text;
    document.body.appendChild(div);
    return div;
};
const labelB = createLabel('B-Field (Oscillating Flux)', '#00aaff');
const labelE = createLabel('Induced E-Field (Curly)', '#ffcc00');
const labelSource = createLabel('Source: -∂B/∂t', '#ff3300');

// Animation Loop
function animate() {
    requestAnimationFrame(animate);
    time += 0.02;

    // Physics Calculations
    // B(t) = sin(t)
    const bValue = Math.sin(time);
    // Source = -dB/dt = -cos(t)
    const sourceValue = -Math.cos(time);

    // Update B Field Visualization
    bArrows.children.forEach(arrow => {
        arrow.scale.set(1, Math.abs(bValue), 1);
        arrow.setDirection(new THREE.Vector3(0, Math.sign(bValue) || 1, 0));
        arrow.line.material.opacity = Math.abs(bValue) + 0.2;
    });

    // Update Source Vector (-dB/dt)
    sourceArrow.scale.set(1, Math.abs(sourceValue), 1);
    sourceArrow.setDirection(new THREE.Vector3(0, Math.sign(sourceValue) || 1, 0));

    // Update Induced E Field
    // According to Lenz's Law, E swirls around the source vector
    eArrows.children.forEach(arrow => {
        const radius = Math.sqrt(arrow.position.x**2 + arrow.position.z**2);
        // E field strength drops with 1/r outside the source (Biot-Savart analogy)
        const magnitude = (Math.abs(sourceValue) * 1.5) / radius;
        arrow.setLength(magnitude, 0.15, 0.1);
        
        // Direction follows Right Hand Rule relative to the SOURCE (-dB/dt)
        const angle = Math.atan2(arrow.position.z, arrow.position.x);
        const dir = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle));
        arrow.setDirection(dir.multiplyScalar(Math.sign(sourceValue)));
        
        arrow.line.material.opacity = magnitude + 0.1;
    });

    // Label positioning
    labelB.style.top = '20px'; labelB.style.left = '20px';
    labelSource.style.top = '50px'; labelSource.style.left = '20px';
    labelE.style.top = '80px'; labelE.style.left = '20px';

    renderer.render(scene, camera);
}

animate();