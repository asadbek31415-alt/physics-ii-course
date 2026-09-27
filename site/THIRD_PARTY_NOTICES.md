# Third-Party Notices

This audit lists third-party resources that are identifiable from the repository. Do not claim these materials as original course authorship.

## Identified Resources

- MathJax: local files under `course_files/vendor/mathjax/`; used for mathematical rendering. License should be preserved from the upstream MathJax distribution.
- KaTeX: local files under `course_files/vendor/katex/`; used for mathematical rendering/fonts. License should be preserved from the upstream KaTeX distribution.
- Three.js: local files under `course_files/vendor/three/` and `course_files/vendor/three-legacy/`; used for 3D rendering and controls. License should be preserved from the upstream Three.js distribution.
- Matter.js: `course_files/vendor/matter.min.js`; physics engine library. Upstream license notice should be verified and preserved.
- es-module-shims: `course_files/vendor/es-module-shims.js`; module-loading compatibility library. Upstream license notice should be verified and preserved.
- tween.umd.js: `course_files/vendor/tween.umd.js`; tweening/animation helper. Upstream license notice should be verified and preserved.
- CircuitJS/Falstad runtime: `course_files/diagrams/vendor/circuitjs/`; local same-origin copy of CircuitJS resources. The included README identifies GNU GPL v2 or later and notes corresponding-source obligations before public release packaging.
- Right-hand GLB model: `course_files/public/models/right_hand.glb`; attribution file credits Hand-Math by bizzkoot and Rigged Hand by Elena FF on Sketchfab, Creative Commons Attribution-ShareAlike 4.0 International.

## Uncertain Items

- HTML diagrams, simulator pages, PDFs, generated screenshots, and course-specific visualizations should be reviewed before public release to confirm which are original course materials and which derive from external sources.
- The files under `course_files/assets/` and `course_files/diagrams/shared/` need a final provenance pass before v1.0.
