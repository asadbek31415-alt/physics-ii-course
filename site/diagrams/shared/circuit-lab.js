(function attachCircuitLab(global) {
    const CIRCUIT_COLORS = {
        blue: 0x3b82f6,
        green: 0x4ade80,
        yellow: 0xfbbf24,
        orange: 0xfb923c,
        red: 0xef4444,
        wire: 0x344254
    };

    let libs = null;

    function configure(adapters) {
        libs = adapters;
        return api;
    }

    function requireLib(name) {
        if (!libs || !libs[name]) {
            throw new Error('CircuitLab is missing adapter: ' + name);
        }
        return libs[name];
    }

    function requireThree() {
        return requireLib('THREE');
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function toVector3(value) {
        const THREE = requireThree();
        return value instanceof THREE.Vector3
            ? value.clone()
            : new THREE.Vector3(value[0], value[1], value[2] || 0);
    }

    function createPolylineCurve(points) {
        const THREE = requireThree();
        const vectors = points.map((point) => toVector3(point));
        const path = new THREE.CurvePath();
        for (let i = 0; i < vectors.length - 1; i++) {
            path.add(new THREE.LineCurve3(vectors[i], vectors[i + 1]));
        }
        return path;
    }

    function createCircuitTopology({ nodes = {}, components = [] }) {
        const nodeVectors = {};
        Object.entries(nodes).forEach(([name, value]) => {
            nodeVectors[name] = toVector3(value);
        });

        return {
            nodes: nodeVectors,
            components: components.map((component) => ({ ...component })),
            getComponent(id) {
                return this.components.find((component) => component.id === id);
            },
            componentsOfType(type) {
                return this.components.filter((component) => component.type === type);
            }
        };
    }

    function computeNodeBalance({ source = 0, top = 0, bottom = 0, outgoing = null }) {
        const totalOut = outgoing == null ? top + bottom : outgoing;
        return source - totalOut;
    }

    function createCircuitScene({
        container,
        camera: cameraOptions = {},
        controls: controlOptions = {},
        circuit: circuitOptions = {},
        background = 0x000000
    }) {
        const THREE = requireThree();
        const OrbitControls = requireLib('OrbitControls');
        const CSS2DRenderer = requireLib('CSS2DRenderer');

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(background);

        const camera = new THREE.PerspectiveCamera(cameraOptions.fov || 42, 1, 0.1, cameraOptions.far || 120);
        const cameraPosition = cameraOptions.position || [0, 7, 16];
        camera.position.set(cameraPosition[0], cameraPosition[1], cameraPosition[2]);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
        container.appendChild(renderer.domElement);

        const labelRenderer = new CSS2DRenderer();
        labelRenderer.domElement.style.position = 'absolute';
        labelRenderer.domElement.style.inset = '0';
        labelRenderer.domElement.style.pointerEvents = 'none';
        container.appendChild(labelRenderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.enablePan = controlOptions.enablePan ?? true;
        controls.zoomSpeed = controlOptions.zoomSpeed ?? 0.55;
        controls.rotateSpeed = controlOptions.rotateSpeed ?? 0.55;
        controls.minDistance = controlOptions.minDistance ?? 7;
        controls.maxDistance = controlOptions.maxDistance ?? 32;
        const target = controlOptions.target || cameraOptions.target || [0, 0, 0];
        controls.target.set(target[0], target[1], target[2]);
        controls.update();

        scene.add(new THREE.AmbientLight(0xffffff, 0.34));
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
        keyLight.position.set(-3, 8, 7);
        scene.add(keyLight);
        const rimLight = new THREE.PointLight(CIRCUIT_COLORS.blue, 1.5, 28);
        rimLight.position.set(1.5, 3, 5);
        scene.add(rimLight);

        const circuit = new THREE.Group();
        const rotation = circuitOptions.rotation || [0, 0, 0];
        const position = circuitOptions.position || [0, 0, 0];
        circuit.rotation.set(rotation[0], rotation[1], rotation[2]);
        circuit.position.set(position[0], position[1], position[2]);
        scene.add(circuit);

        function resize() {
            const rect = container.getBoundingClientRect();
            const width = Math.max(1, Math.floor(rect.width));
            const height = Math.max(1, Math.floor(rect.height));
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
            renderer.setSize(width, height, false);
            labelRenderer.setSize(width, height);
            controls.update();
        }

        function render() {
            renderer.render(scene, camera);
            labelRenderer.render(scene, camera);
        }

        global.addEventListener('resize', resize);
        global.addEventListener('orientationchange', resize);

        return { scene, camera, renderer, labelRenderer, controls, circuit, resize, render };
    }

    function createWireNetwork({
        group,
        curves,
        pathNames = Object.keys(curves),
        wireRadius = 0.16,
        wireColor = CIRCUIT_COLORS.wire,
        glowColor = CIRCUIT_COLORS.blue,
        tubularSegments = 96,
        radialSegments = 16
    }) {
        const THREE = requireThree();
        const wireMat = new THREE.MeshPhysicalMaterial({
            color: wireColor,
            metalness: 0.2,
            roughness: 0.45,
            transparent: true,
            opacity: 0.12,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        const glowWireMat = new THREE.MeshBasicMaterial({
            color: glowColor,
            transparent: true,
            opacity: 0.055,
            depthWrite: false
        });

        const meshes = [];
        pathNames.forEach((name) => {
            const curve = curves[name];
            const glow = new THREE.Mesh(new THREE.TubeGeometry(curve, tubularSegments, wireRadius * 1.8, 12, false), glowWireMat);
            const wire = new THREE.Mesh(new THREE.TubeGeometry(curve, tubularSegments, wireRadius, radialSegments, false), wireMat);
            group.add(glow, wire);
            meshes.push({ name, glow, wire });
        });

        return { meshes, wireMat, glowWireMat };
    }

    function createWireCurvesFromTopology(topology, components = topology.components) {
        const curves = {};
        components.forEach((component) => {
            if (!component.path) return;
            curves[component.id] = createPolylineCurve(component.path.map((point) => {
                return typeof point === 'string' ? topology.nodes[point] : point;
            }));
        });
        return curves;
    }

    function createBatterySource({
        group,
        top,
        bottom,
        label = '12 V',
        radius = 0.66,
        capDepth = 0.18,
        bodyColor = 0x111111,
        positiveColor = CIRCUIT_COLORS.red,
        negativeColor = CIRCUIT_COLORS.blue
    }) {
        const THREE = requireThree();
        const axis = top.clone().sub(bottom);
        const height = axis.length();
        const center = bottom.clone().add(top).multiplyScalar(0.5);

        const batteryGroup = new THREE.Group();
        batteryGroup.position.copy(center);
        batteryGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.clone().normalize());
        group.add(batteryGroup);

        const body = new THREE.Mesh(
            new THREE.CylinderGeometry(radius, radius, height, 32),
            new THREE.MeshPhysicalMaterial({ color: bodyColor, metalness: 0.82, roughness: 0.22 })
        );
        batteryGroup.add(body);

        const capGeo = new THREE.CylinderGeometry(radius * 1.05, radius * 1.05, capDepth, 32);
        const positiveCap = new THREE.Mesh(capGeo, new THREE.MeshBasicMaterial({ color: positiveColor }));
        positiveCap.position.y = height / 2;
        const negativeCap = new THREE.Mesh(capGeo, new THREE.MeshBasicMaterial({ color: negativeColor }));
        negativeCap.position.y = -height / 2;
        batteryGroup.add(positiveCap, negativeCap);

        const labelObject = createCircuitLabel({
            text: label,
            className: 'battery-label',
            position: new THREE.Vector3(0, 0, radius + 0.12),
            parent: batteryGroup
        });

        return { group: batteryGroup, body, positiveCap, negativeCap, label: labelObject };
    }

    function createResistorObject({
        group,
        start,
        end,
        radius = 1.8,
        label = '',
        bodyColor = 0x7f3b34,
        opacity = 0.16,
        ringColor = 0x64748b
    }) {
        const THREE = requireThree();
        const axis = end.clone().sub(start);
        const length = axis.length();
        const center = start.clone().add(end).multiplyScalar(0.5);
        const resistorGroup = new THREE.Group();
        resistorGroup.position.copy(center);
        resistorGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.clone().normalize());
        group.add(resistorGroup);

        const shell = new THREE.Mesh(
            new THREE.CylinderGeometry(radius, radius, length, 36, 1, true),
            new THREE.MeshPhysicalMaterial({
                color: bodyColor,
                roughness: 0.65,
                metalness: 0.15,
                transparent: true,
                opacity,
                side: THREE.DoubleSide,
                depthWrite: false
            })
        );
        resistorGroup.add(shell);

        const ringMat = new THREE.MeshBasicMaterial({ color: ringColor, transparent: true, opacity: 0.35 });
        const ringGeo = new THREE.TorusGeometry(radius, 0.045, 8, 48);
        [-length / 2, length / 2].forEach((y) => {
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2;
            ring.position.y = y;
            resistorGroup.add(ring);
        });

        let labelObject = null;
        if (label) {
            labelObject = createCircuitLabel({
                text: label,
                className: 'scene-label',
                position: new THREE.Vector3(0, 0, radius + 0.32),
                parent: resistorGroup
            });
        }

        return { group: resistorGroup, shell, label: labelObject };
    }

    function createInductorObject({
        group,
        center,
        radius = 1.2,
        height = 4,
        turns = 8,
        wireRadius = 0.08,
        color = CIRCUIT_COLORS.blue,
        label = ''
    }) {
        const THREE = requireThree();
        class SolenoidCurve extends THREE.Curve {
            getPoint(t) {
                const angle = t * Math.PI * 2 * turns;
                return new THREE.Vector3(
                    Math.cos(angle) * radius,
                    (0.5 - t) * height,
                    Math.sin(angle) * radius
                );
            }
        }

        const inductorGroup = new THREE.Group();
        inductorGroup.position.copy(center);
        group.add(inductorGroup);

        const coil = new THREE.Mesh(
            new THREE.TubeGeometry(new SolenoidCurve(), Math.max(96, turns * 24), wireRadius, 8, false),
            new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 })
        );
        inductorGroup.add(coil);

        const core = new THREE.Mesh(
            new THREE.CylinderGeometry(radius * 0.7, radius * 0.7, height, 32),
            new THREE.MeshPhysicalMaterial({
                color: 0x444444,
                metalness: 0.9,
                roughness: 0.1,
                transparent: true,
                opacity: 0.2
            })
        );
        inductorGroup.add(core);

        let labelObject = null;
        if (label) {
            labelObject = createCircuitLabel({
                text: label,
                className: 'scene-label',
                position: new THREE.Vector3(0, height / 2 + 1, 0),
                parent: inductorGroup
            });
        }

        return { group: inductorGroup, coil, core, label: labelObject };
    }

    function createCircuitObjects({
        group,
        topology,
        components = topology.components,
        wireRadius = 0.16,
        showJunctions = true,
        labels = false
    }) {
        const THREE = requireThree();
        const curves = createWireCurvesFromTopology(topology, components);
        const conductorComponents = components.filter((component) => component.path);
        const wireObjects = createWireNetwork({
            group,
            curves,
            pathNames: conductorComponents.map((component) => component.id),
            wireRadius
        });
        const objects = { curves, wires: wireObjects, nodes: {}, components: {} };

        components.forEach((component) => {
            if (component.type === 'emf-source') {
                objects.components[component.id] = createBatterySource({
                    group,
                    top: topology.nodes[component.to],
                    bottom: topology.nodes[component.from],
                    label: component.label || '12 V',
                    radius: component.radius,
                    capDepth: component.capDepth
                });
            }
            if (component.type === 'resistor') {
                objects.components[component.id] = createResistorObject({
                    group,
                    start: topology.nodes[component.from],
                    end: topology.nodes[component.to],
                    radius: component.radius,
                    label: component.label || '',
                    opacity: component.opacity
                });
            }
            if (component.type === 'inductor') {
                objects.components[component.id] = createInductorObject({
                    group,
                    center: topology.nodes[component.at] || toVector3(component.center || [0, 0, 0]),
                    radius: component.radius,
                    height: component.height,
                    turns: component.turns,
                    wireRadius: component.wireRadius,
                    label: component.label || ''
                });
            }
        });

        if (showJunctions) {
            Object.entries(topology.nodes).forEach(([name, position]) => {
                const shouldShow = components.some((component) => component.junction === name)
                    || name.toLowerCase().includes('junction')
                    || name.toLowerCase().includes('node');
                if (!shouldShow) return;
                objects.nodes[name] = createJunction({
                    group,
                    position,
                    color: name.toLowerCase().includes('return') ? CIRCUIT_COLORS.blue : CIRCUIT_COLORS.green,
                    radius: 0.18,
                    glowRadius: 0.46
                });
                if (labels) {
                    createCircuitLabel({
                        text: labels[name] || name,
                        className: 'scene-label',
                        position: position.clone().add(new THREE.Vector3(0, 0.36, 0.04)),
                        parent: group
                    });
                }
            });
        }

        return objects;
    }

    function createCircuitLabel({ text, className = 'scene-label', position, parent }) {
        const CSS2DObject = requireLib('CSS2DObject');
        const div = document.createElement('div');
        div.className = className;
        div.textContent = text;
        const label = new CSS2DObject(div);
        label.position.copy(position);
        parent.add(label);
        return label;
    }

    function createJunction({
        group,
        position,
        color = CIRCUIT_COLORS.green,
        radius = 0.2,
        glowRadius = 0.52
    }) {
        const THREE = requireThree();
        const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(radius, 24, 16),
            new THREE.MeshBasicMaterial({ color })
        );
        sphere.position.copy(position);
        group.add(sphere);

        const glow = new THREE.Mesh(
            new THREE.SphereGeometry(glowRadius, 24, 16),
            new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity: 0.14,
                depthWrite: false
            })
        );
        glow.position.copy(position);
        group.add(glow);

        return { sphere, glow };
    }

    function createBranchGate({ group, curve, t = 0.5, color = CIRCUIT_COLORS.blue }) {
        const THREE = requireThree();
        const sleeve = new THREE.Mesh(
            new THREE.CylinderGeometry(0.29, 0.29, 0.62, 20, 1, true),
            new THREE.MeshPhysicalMaterial({
                color,
                metalness: 0.25,
                roughness: 0.45,
                transparent: true,
                opacity: 0.24,
                side: THREE.DoubleSide,
                depthWrite: false
            })
        );
        sleeve.position.copy(curve.getPointAt(t));
        sleeve.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), curve.getTangentAt(t).normalize());
        group.add(sleeve);
        return sleeve;
    }

    function createCurrentArrows({
        group,
        curves,
        specs,
        currentProvider,
        visibleProvider = () => true,
        zOffset = 0.28,
        baseLength = 0.42,
        currentScale = 0.13,
        headLength = 0.18,
        headWidth = 0.13
    }) {
        const THREE = requireThree();
        const arrowGroup = new THREE.Group();
        group.add(arrowGroup);

        function makeArrow(color) {
            const arrow = new THREE.ArrowHelper(
                new THREE.Vector3(1, 0, 0),
                new THREE.Vector3(),
                1,
                color,
                headLength,
                headWidth
            );
            arrow.line.material.transparent = true;
            arrow.line.material.opacity = 0.78;
            arrow.line.material.depthTest = false;
            arrow.line.material.depthWrite = false;
            arrow.line.renderOrder = 8;
            arrow.cone.material.transparent = true;
            arrow.cone.material.opacity = 0.9;
            arrow.cone.material.depthTest = false;
            arrow.cone.material.depthWrite = false;
            arrow.cone.renderOrder = 8;
            arrowGroup.add(arrow);
            return arrow;
        }

        const arrows = specs.map((spec) => ({
            ...spec,
            arrow: makeArrow(spec.color || CIRCUIT_COLORS.blue)
        }));

        function update() {
            const current = currentProvider();
            arrowGroup.visible = visibleProvider();
            arrows.forEach((item) => {
                const curve = curves[item.path];
                const value = typeof item.value === 'function' ? item.value(current) : current[item.current];
                const direction = curve.getTangentAt(item.t).normalize();
                if (value < 0) direction.multiplyScalar(-1);
                const position = curve.getPointAt(item.t).add(new THREE.Vector3(0, 0, zOffset));
                item.arrow.position.copy(position);
                item.arrow.setDirection(direction);
                item.arrow.setLength(baseLength + Math.abs(value || 0) * currentScale, headLength, headWidth);
                item.arrow.visible = Math.abs(value || 0) > 0.01;
            });
        }

        return { group: arrowGroup, arrows, update };
    }

    function normalForCurve(curve, t) {
        const THREE = requireThree();
        const tangent = curve.getTangentAt(clamp(t, 0, 1)).normalize();
        let normal = new THREE.Vector3(-tangent.y, tangent.x, 0);
        if (normal.lengthSq() < 0.001) normal.set(1, 0, 0);
        normal.normalize();
        return { tangent, normal, binormal: new THREE.Vector3(0, 0, 1) };
    }

    function pointNearCurve(curve, t, radius, angle, wobble = 0) {
        const point = curve.getPointAt(clamp(t, 0, 1));
        const frame = normalForCurve(curve, t);
        point.addScaledVector(frame.normal, Math.cos(angle) * radius);
        point.addScaledVector(frame.binormal, Math.sin(angle) * radius + wobble);
        return point;
    }

    function createFixedChargeFlow({
        group,
        curves,
        nodePosition,
        currentProvider,
        paths = {
            source: 'source',
            incoming: 'incoming',
            branches: ['top', 'bottom'],
            return: 'return'
        },
        particleCount = 720,
        baseNodeCount = 24,
        excessTolerance = 4,
        wireRadius = 0.16,
        particleRadius = 0.075,
        packetRate = 4.1,
        colors = CIRCUIT_COLORS
    }) {
        const THREE = requireThree();
        const pathNames = [paths.source, paths.incoming, ...paths.branches, paths.return].filter(Boolean);
        const pathLengths = Object.fromEntries(pathNames.map((name) => [name, curves[name].getLength()]));
        const laneRadius = Math.max(0.01, Math.min(
            wireRadius * 0.34,
            wireRadius - particleRadius - 0.012
        ));
        const particleGeo = new THREE.SphereGeometry(particleRadius, 8, 8);
        const blueParticleMat = new THREE.MeshBasicMaterial({
            color: colors.blue,
            transparent: true,
            opacity: 1,
            depthTest: false,
            depthWrite: false,
            toneMapped: false
        });
        const orangeParticleMat = new THREE.MeshBasicMaterial({
            color: colors.orange,
            transparent: true,
            opacity: 1,
            depthTest: false,
            depthWrite: false,
            toneMapped: false
        });

        const blueParticleMesh = new THREE.InstancedMesh(particleGeo, blueParticleMat, particleCount);
        const orangeParticleMesh = new THREE.InstancedMesh(particleGeo, orangeParticleMat, particleCount);
        [blueParticleMesh, orangeParticleMesh].forEach((mesh) => {
            mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            mesh.renderOrder = 5;
            mesh.frustumCulled = false;
            group.add(mesh);
        });

        const dummy = new THREE.Object3D();
        const particles = [];
        const state = {
            time: 0,
            displayIn: 0,
            displayOut: 0,
            balance: 0,
            release: Object.fromEntries(paths.branches.map((name) => [name, 0]))
        };
        let routeTicket = 0;

        function addPathParticles(path, count) {
            for (let i = 0; i < count; i++) {
                const seed = (i * 0.61803398875 + count * 0.137) % 1;
                particles.push({
                    mode: 'path',
                    path,
                    t: (i + 0.5) / Math.max(1, count),
                    angle: seed * Math.PI * 2,
                    radius: Math.sqrt(0.18 + seed * 0.7) * laneRadius,
                    seed
                });
            }
        }

        function addNodeParticles(count) {
            for (let i = 0; i < count; i++) {
                particles.push({
                    mode: 'node',
                    path: 'node',
                    t: 0,
                    angle: (i / Math.max(1, count)) * Math.PI * 2,
                    radius: Math.sqrt(0.12 + (i % 7) / 10) * wireRadius * 0.68,
                    seed: (i * 0.38196601125) % 1
                });
            }
        }

        function currentForPath(current, path) {
            if (path === paths.source || path === paths.incoming) return Math.max(0, current.source || 0);
            if (paths.return && path === paths.return) {
                return paths.branches.reduce((sum, branch) => sum + Math.max(0, current[branch] || 0), 0);
            }
            return Math.max(0, current[path] || 0);
        }

        function branchForRoute(current) {
            const weights = paths.branches.map((branch) => Math.max(0, current[branch] || 0));
            const total = weights.reduce((sum, value) => sum + value, 0);
            if (total <= 0.01) return null;

            const ticket = (routeTicket++ * 0.61803398875 + 0.17) % 1;
            let threshold = ticket * total;
            for (let i = 0; i < weights.length; i++) {
                threshold -= weights[i];
                if (threshold <= 0) return paths.branches[i];
            }
            return paths.branches[paths.branches.length - 1];
        }

        function reset() {
            particles.length = 0;
            routeTicket = 0;

            const current = currentProvider();
            const available = Math.max(0, particleCount - baseNodeCount);
            const flowPaths = [paths.source, paths.incoming, ...paths.branches, paths.return]
                .filter(Boolean)
                .filter((path, index, all) => all.indexOf(path) === index);
            const weights = flowPaths.map((path) => Math.max(0.12, currentForPath(current, path)) * pathLengths[path]);
            const weightTotal = weights.reduce((sum, value) => sum + value, 0) || 1;
            const counts = Object.fromEntries(flowPaths.map((path, i) => [path, Math.floor(available * weights[i] / weightTotal)]));
            let used = Object.values(counts).reduce((sum, value) => sum + value, 0);
            const fallbackPath = paths.incoming || paths.source || flowPaths[0];
            counts[fallbackPath] += Math.max(0, available - used);

            Object.entries(counts).forEach(([path, count]) => addPathParticles(path, count));
            addNodeParticles(baseNodeCount);
            paths.branches.forEach((branch) => {
                state.release[branch] = 0;
            });
            state.displayIn = 0;
            state.displayOut = 0;
            state.balance = 0;
        }

        function nodeParticles() {
            return particles.filter((particle) => particle.mode === 'node');
        }

        function finishPath(particle) {
            if (particle.path === paths.source) {
                particle.path = paths.incoming;
                particle.t = 0;
                return null;
            }
            if (particle.path === paths.incoming) {
                const branch = branchForRoute(currentProvider());
                particle.path = branch || paths.incoming;
                particle.t = 0;
                return branch ? 'arrived' : null;
            }
            if (paths.branches.includes(particle.path)) {
                particle.path = paths.return || paths.incoming;
                particle.t = 0;
                return null;
            }
            if (paths.return && particle.path === paths.return) {
                particle.path = paths.source || paths.incoming;
                particle.t = 0;
            }
            return null;
        }

        function update(dt) {
            const current = currentProvider();
            const nodeCount = nodeParticles().length;
            const branchOut = paths.branches.reduce((sum, branch) => sum + Math.max(0, current[branch] || 0), 0);
            state.balance = (current.source || 0) - branchOut;

            const pathCounts = Object.fromEntries(pathNames.map((name) => [name, 0]));
            particles.forEach((particle) => {
                if (particle.mode === 'path') pathCounts[particle.path] = (pathCounts[particle.path] || 0) + 1;
            });

            particles.forEach((particle) => {
                if (particle.mode !== 'path') return;
                const pathCurrent = currentForPath(current, particle.path);
                // Keep every marker moving through a bounded wire lane, even while a
                // slider is temporarily set to zero. The measured imbalance remains
                // visible in the UI rather than being represented by a visual pile.
                const visualCurrent = Math.max(pathCurrent, 0.18);
                const targetRate = visualCurrent * packetRate;
                const speed = targetRate / Math.max(1, pathCounts[particle.path] || 1);
                particle.t += speed * dt;

                while (particle.t >= 1 && particle.mode === 'path') {
                    particle.t -= 1;
                    finishPath(particle);
                }
            });

            const smoothing = 1 - Math.exp(-dt * 4.2);
            state.displayIn = lerp(state.displayIn, current.source || 0, smoothing);
            state.displayOut = lerp(state.displayOut, branchOut, smoothing);
        }

        function setParticleTransform(particle, nodeIndex, nodeCount, meshIndex) {
            let position;
            let scale = 1;
            let isOrange = false;

            if (particle.mode === 'path') {
                const wobble = Math.sin(state.time * 3 + particle.seed * 40) * 0.008;
                position = pointNearCurve(curves[particle.path], particle.t, particle.radius, particle.angle, wobble);
            } else {
                const ring = 0.12 + (nodeIndex % 13) * 0.018;
                const phase = particle.seed * Math.PI * 2 + state.time * 0.18;
                position = nodePosition.clone();
                position.x += Math.cos(phase) * ring;
                position.y += Math.sin(phase) * ring * 0.55;
                position.z += Math.sin(particle.seed * 22) * 0.18;
            }

            dummy.position.copy(position);
            dummy.scale.setScalar(isOrange ? 0.001 : scale);
            dummy.updateMatrix();
            blueParticleMesh.setMatrixAt(meshIndex, dummy.matrix);

            dummy.scale.setScalar(isOrange ? scale : 0.001);
            dummy.updateMatrix();
            orangeParticleMesh.setMatrixAt(meshIndex, dummy.matrix);
        }

        function render() {
            const stored = nodeParticles();
            let nodeIndex = 0;
            particles.forEach((particle, i) => {
                const index = particle.mode === 'node' ? nodeIndex++ : -1;
                setParticleTransform(particle, index, stored.length, i);
            });
            blueParticleMesh.instanceMatrix.needsUpdate = true;
            orangeParticleMesh.instanceMatrix.needsUpdate = true;
        }

        function setOpacity(value) {
            blueParticleMat.opacity = value;
            orangeParticleMat.opacity = value;
        }

        function metrics() {
            const stored = nodeParticles().length;
            return {
                total: particles.length,
                node: stored,
                excess: 0,
                displayIn: state.displayIn,
                displayOut: state.displayOut
            };
        }

        reset();

        return {
            state,
            particles,
            reset,
            update,
            render,
            setOpacity,
            metrics,
            nodeParticles
        };
    }

    const api = {
        configure,
        CIRCUIT_COLORS,
        clamp,
        lerp,
        toVector3,
        createPolylineCurve,
        createCircuitTopology,
        computeNodeBalance,
        createCircuitScene,
        createWireNetwork,
        createWireCurvesFromTopology,
        createBatterySource,
        createResistorObject,
        createInductorObject,
        createCircuitObjects,
        createCircuitLabel,
        createJunction,
        createBranchGate,
        createCurrentArrows,
        normalForCurve,
        pointNearCurve,
        createFixedChargeFlow
    };

    global.CircuitLab = api;
})(window);
