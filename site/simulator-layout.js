(function () {
    'use strict';

    var panelSelectors = [
        '#ui-panel', '#ui-container', '#ui-sidebar', '#sidebar', '#ui-layer', '#control-panel',
        '#ui',
        '#controls', '.sidebar', '.control-panel', '.controls', '.ui-container', '.ui-layer',
        '.ui-overlay', '.side-panel', '.controls-box'
    ];
    var stageSelectors = [
        '#scene-container', '#canvas-container', '#canvas-wrapper', '#scene-stage',
        '#stage', '.scene-container', '.canvas-container', '.canvas-wrapper',
        '.canvas-area', '.scene-wrap', '#container'
    ];

    function firstMatch(selectors, root) {
        for (var i = 0; i < selectors.length; i += 1) {
            var node = root.querySelector(selectors[i]);
            if (node) return node;
        }
        return null;
    }

    function containsCanvas(node) {
        return node && (node.matches('canvas') || node.querySelector('canvas, [data-renderer], .webgl') !== null);
    }

    function closestSharedParent(first, second, root) {
        var parent = first && first.parentElement;
        while (parent && parent !== root) {
            if (parent.contains(second)) return parent;
            parent = parent.parentElement;
        }
        return root;
    }

    function markDirectChild(root, node, attribute) {
        var direct = node;
        while (direct && direct.parentElement && direct.parentElement !== root) direct = direct.parentElement;
        if (!direct || direct.parentElement !== root) return null;
        direct.setAttribute(attribute, 'true');
        return direct;
    }

    function installStyles() {
        if (document.getElementById('shared-simulator-layout')) return;
        var style = document.createElement('style');
        style.id = 'shared-simulator-layout';
        style.textContent = [
            '[data-simulator-layout-root] {',
            '  display: grid !important;',
            '  grid-template-columns: minmax(230px, clamp(230px, 28vw, 340px)) minmax(0, 1fr) !important;',
            '  grid-template-rows: minmax(0, 1fr) !important;',
            '  width: 100% !important;',
            '  height: 100vh !important;',
            '  height: 100dvh !important;',
            '  max-height: 100dvh !important;',
            '  min-width: 0 !important;',
            '  min-height: 0 !important;',
            '  overflow: hidden !important;',
            '}',
            '[data-simulator-layout-root] > [data-simulator-panel] {',
            '  position: relative !important;',
            '  inset: auto !important;',
            '  top: auto !important;',
            '  right: auto !important;',
            '  bottom: auto !important;',
            '  left: auto !important;',
            '  transform: none !important;',
            '  grid-column: 1 !important;',
            '  grid-row: 1 !important;',
            '  width: auto !important;',
            '  min-width: 0 !important;',
            '  min-height: 0 !important;',
            '  max-width: none !important;',
            '  max-height: none !important;',
            '  height: auto !important;',
            '  overflow-y: auto !important;',
            '  overflow-x: hidden !important;',
            '  scrollbar-width: thin;',
            '  scrollbar-color: rgba(96, 165, 250, 0.65) rgba(15, 23, 42, 0.45);',
            '}',
            '[data-simulator-layout-root] > [data-simulator-panel].ui-container,',
            '[data-simulator-layout-root] > [data-simulator-panel]#ui-container {',
            '  display: flex !important;',
            '  flex-direction: column !important;',
            '  align-items: stretch !important;',
            '  justify-content: flex-start !important;',
            '  gap: 8px !important;',
            '}',
            '[data-simulator-layout-root] > [data-simulator-panel]::-webkit-scrollbar { width: 8px; }',
            '[data-simulator-layout-root] > [data-simulator-panel]::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.45); }',
            '[data-simulator-layout-root] > [data-simulator-panel]::-webkit-scrollbar-thumb { background: rgba(96, 165, 250, 0.65); border-radius: 999px; }',
            '[data-simulator-layout-root] > [data-simulator-stage] {',
            '  position: relative !important;',
            '  inset: auto !important;',
            '  grid-column: 2 !important;',
            '  grid-row: 1 !important;',
            '  width: auto !important;',
            '  height: auto !important;',
            '  min-width: 0 !important;',
            '  min-height: 0 !important;',
            '  overflow: hidden !important;',
            '}',
            '[data-simulator-layout-root] > [data-simulator-stage] canvas {',
            '  display: block !important;',
            '  width: 100% !important;',
            '  height: 100% !important;',
            '  max-width: 100%;',
            '  max-height: 100%;',
            '  object-fit: contain;',
            '}',
            '[data-simulator-layout-root] > canvas[data-simulator-stage] {',
            '  width: 100% !important;',
            '  height: 100% !important;',
            '  object-fit: contain;',
            '}',
            '[data-simulator-layout-root] > [data-simulator-stage] iframe {',
            '  width: 100% !important;',
            '  height: 100% !important;',
            '  border: 0;',
            '}',
            '[data-simulator-layout-root] [data-simulator-panel] input,',
            '[data-simulator-layout-root] [data-simulator-panel] button,',
            '[data-simulator-layout-root] [data-simulator-panel] select {',
            '  touch-action: manipulation;',
            '}',
            '[data-simulator-layout-root] > [data-simulator-stage],',
            '[data-simulator-layout-root] > [data-simulator-stage] canvas {',
            '  touch-action: none;',
            '}',
            '@media (max-width: 760px) {',
            '  [data-simulator-layout-root] {',
            '    grid-template-columns: minmax(0, 1fr) !important;',
            '    grid-template-rows: minmax(300px, 1fr) auto !important;',
            '    overflow: hidden !important;',
            '  }',
            '  [data-simulator-layout-root] > [data-simulator-stage] {',
            '    grid-column: 1 !important;',
            '    grid-row: 1 !important;',
            '  }',
            '  [data-simulator-layout-root] > [data-simulator-panel] {',
            '    grid-column: 1 !important;',
            '    grid-row: 2 !important;',
            '    max-height: min(46vh, 480px) !important;',
            '    padding: max(10px, 2vw) !important;',
            '  }',
            '}'
        ].join('\n');
        document.head.appendChild(style);
    }

    function setup() {
        var panel = firstMatch(panelSelectors, document);
        var stage = firstMatch(stageSelectors, document);
        var knownStage = !!stage;
        if (stage && panel && stage.contains(panel)) {
            var nestedCanvas = stage.querySelector('canvas');
            if (nestedCanvas && nestedCanvas.parentElement === stage) stage = nestedCanvas;
        }
        if (!stage) {
            var canvas = document.querySelector('canvas');
            stage = canvas;
        }
        if (!panel || !stage || panel === stage || (!containsCanvas(stage) && !knownStage)) return;

        var root = closestSharedParent(panel, stage, document.body);
        var panelChild = markDirectChild(root, panel, 'data-simulator-panel');
        var stageChild = markDirectChild(root, stage, 'data-simulator-stage');
        if (!panelChild || !stageChild || panelChild === stageChild) return;

        root.setAttribute('data-simulator-layout-root', 'true');
        document.documentElement.classList.add('simulator-layout-page');
        document.body.classList.add('simulator-layout-page');
        installStyles();

        if (typeof ResizeObserver === 'function') {
            var observer = new ResizeObserver(function () {
                window.dispatchEvent(new Event('resize'));
            });
            observer.observe(stageChild);
        }
        window.dispatchEvent(new Event('resize'));
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
    else setup();
}());
