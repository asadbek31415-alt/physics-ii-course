# Circuit Architecture: First Migration

## Opening the Course

On Windows, open `Start Course.cmd` in the project root. It starts the local-only
Node.js server and opens the course over HTTP. Keep its terminal window open.
The server tries port 4189, then the next free port if necessary.

Do not open the lesson directly with a `file://` URL: browsers block its local
ES modules and same-origin electrical-engine access. The simulator now displays
an explicit startup message in that case. Math formatting is optional and cannot
prevent the circuit from starting if KaTeX is unavailable.

## Offline Bundle

The course `vendor` folder contains local copies of the runtime libraries used by
the lessons: Three.js (module and legacy builds), OrbitControls, KaTeX, MathJax,
Matter.js, Tween.js and the module shim. Lesson HTML references were rewritten to
these local files; remote font stylesheets were removed so system fallback fonts
are used offline. The CircuitJS engine is also bundled locally.

Offline means no internet connection is needed after the project has been copied
to the computer. It still requires Node.js to serve the files over localhost,
because browser security blocks JavaScript modules when an HTML file is opened
directly with `file://`.

## Active Scope

`diagrams/battery_emf.html` is the first migrated simulator. Its existing HTML,
controls, camera, lighting, component dimensions and layout are retained.
Other lessons still use their existing implementations. Do not switch them to
this system until their individual migration and visual checks are complete.

## Ownership

1. `circuit-lessons/emf-topology.js` supplies a source-neutral `CircuitGraph`.
2. `falstad-adapter.js` serializes it into a private, same-origin CircuitJS runtime.
3. CircuitJS's official JavaScript interface supplies signed currents, terminal
   voltages, node voltages and solver time. There is no local Ohm-law fallback.
4. `ElectricalState` holds validated snapshots. Missing values are errors, not zero.
5. `circuit-visuals/component-objects.js` owns component geometry, materials,
   dimensions, lattice layout, contact response and common visual constants.
6. `circuit-visuals/continuous-transport.js` owns the circuit-wide marker pool and
   traversal. Components never independently create or delete moving markers.
7. `circuit-lessons/emf-loop.js` connects the original scene and controls to those
   modules. Lesson UI and camera remain outside the shared objects.

Current is positive from component terminal 0 to terminal 1. A route segment can
reverse that orientation with `direction: -1`. The EMF loop depicts conventional
current. Its 1,200 markers retain identity through all components, including the
source, and remain distributed throughout the loop when current changes sign.

The hidden solver coordinates encode node identity independently of 3D visual
positions. Moving or overlapping rendered components cannot short circuit nodes.

## Animation Contract

Electrical current controls longitudinal route speed. Local thermal motion,
boundary reflections and lattice contact normals control transverse deflection.
Atoms and their collision centers share the same small heat-dependent vibration.
Resistor atom spacing leaves clearance for finite-sized markers. Atoms brighten
after contact; charges remain blue in this first steady-state lesson.

This is a solver-driven visualization, not a microscopic Drude solver. Contact
resolution preserves longitudinal flux and redirects the transverse motion; it
does not claim a free, fully elastic 3D collision trajectory. Marker density and
speed are illustrative, not literal electron density or drift-speed measurements.
Animation time is wall-clock presentation time, distinct from CircuitJS time.

The reusable transport currently accepts one closed series route with consistent
solver currents. It rejects inconsistent branch currents instead of synthesizing
extra particles. It is not the future KCL junction transport implementation.

## Import Boundary

`importFalstadCircuit()` supports wires, resistors, inductors, capacitors, DC voltage
sources and simple switches. It translates values and endpoint connectivity into
neutral fields, returning source-only display records separately. It rejects
unknown electrical element types, non-DC sources and malformed values.

This is a limited importer, not complete CircuitJS file compatibility. Ground,
controlled sources, composite devices, editable scopes, arbitrary integration
flags and editor routing are not implemented. Imported topology does not yet
automatically produce visual transport routes or a student-facing circuit editor.

The first host reloads CircuitJS when a DC control changes. This resets solver time
and is appropriate for this steady DC loop. Before migrating RL/RC controls,
implement state-preserving parameter updates and a deliberate transient time-scale
policy. Do not reuse DC reloads to animate switching transients.

## Next Migrations

1. Review this EMF loop against its original appearance and contact readability.
2. Migrate the other steady resistor lesson using these same objects, retaining
   each host's controls, camera and dimensions through explicit style parameters.
3. Migrate inductors with CircuitJS transients and continuous coil traversal.
   `InductorObject` is currently an unintegrated prototype, not a validated lesson.
4. Add junction routing from branch currents. Educational accumulation must have
   a defined electrical storage model; particle crowding must not solve currents.
5. Add capacitor electrode storage. Individual carriers must never traverse the
   dielectric. The capacitor and junction visual classes deliberately throw until
   their migration is implemented, rather than drawing misleading placeholders.

## Verification

From the course root, with Node.js available:

```powershell
node --test diagrams/circuit-core/tests/core.test.mjs
$env:THREE_MODULE = 'C:\path\to\three-r160.module.mjs'
node --test diagrams/circuit-core/tests/transport.test.mjs
```

The transport test explicitly skips without `THREE_MODULE`. It tests persistent
identity and occupancy, zero/reversed/maximum current, connected ports, bounds and
sampled atom penetration. Test snapshots are fixtures only, never production
electrical solvers. The lesson retains its existing Three.js r160 import map.

For browser checks, install/provide `playwright` and `pngjs` to Node (or set
`NODE_PATH` to their existing dependency directory). Run a local HTTP server over
the course and set `CIRCUIT_TEST_URL` to its `diagrams/battery_emf.html?debug` URL:

```powershell
node diagrams/circuit-core/tests/browser.test.cjs
```

The browser check uses Edge, verifies the real CircuitJS current, camera controls,
desktop/mobile framing and moving canvas pixels, and stores screenshots in the
OS temporary directory. `?debug` exposes inspection helpers, not a student UI.

See `diagrams/vendor/circuitjs/README.md` for runtime provenance and licensing.
