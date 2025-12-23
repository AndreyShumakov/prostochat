/**
 * 3D Event Graph Visualization
 * Opens a popup window with interactive 3D force-directed graph
 */

/**
 * Open 3D graph view in a new window
 */
function openGraphView() {
    try {
        // Prepare graph data from events
        const graphData = buildGraphData();

        console.log('Graph data:', graphData.nodes.length, 'nodes,', graphData.links.length, 'links');

        // Test JSON serialization
        const jsonTest = JSON.stringify(graphData);
        console.log('JSON size:', jsonTest.length, 'bytes');

        // Open popup window
        const popup = window.open('', 'EventGraph', 'width=1200,height=800,scrollbars=no,resizable=yes');

        if (!popup) {
            alert('Popup blocked! Please allow popups for this site.');
            return;
        }

        // Write the graph HTML
        popup.document.write(generateGraphHTML(graphData));
        popup.document.close();
    } catch (err) {
        console.error('Graph error:', err);
        alert('Error building graph: ' + err.message);
    }
}

/**
 * Build graph data from Memory events
 * Groups events by base for clustering
 */
function buildGraphData() {
    const events = Memory.getAllEvents();
    const nodes = [];
    const links = [];
    const nodeMap = new Map();

    // Color scheme by event type
    const typeColors = {
        'Event': '#ff6b6b',
        'Instance': '#4ecdc4',
        'Individual': '#45b7d1',
        'Model': '#96ceb4',
        'SetModel': '#ffeaa7',
        'Attribute': '#dfe6e9',
        'Relation': '#a29bfe',
        'Role': '#fd79a8',
        'Delete': '#636e72',
        'default': '#74b9ff'
    };

    // Generate colors for each unique base (for clustering visualization)
    const bases = [...new Set(events.map(e => e.base))];
    const baseColors = {};
    bases.forEach((base, i) => {
        const hue = (i * 137.5) % 360; // Golden angle for color distribution
        baseColors[base] = `hsl(${hue}, 70%, 50%)`;
    });

    // Assign cluster IDs (numeric) for force simulation
    const baseToCluster = {};
    bases.forEach((base, i) => {
        baseToCluster[base] = i;
    });

    // Create nodes
    events.forEach((event, index) => {
        const isGenesis = checkIsGenesisId(event.id);
        const isBootstrap = event.id && event.id.startsWith('bootstrap_');
        const isThesaurus = event.id && event.id.startsWith('thesaurus_');

        let group = 'user';
        if (isGenesis) group = 'genesis';
        else if (isBootstrap) group = 'bootstrap';
        else if (isThesaurus) group = 'thesaurus';

        const node = {
            id: event.id,
            name: `${event.base}:${event.type}`,
            val: isGenesis ? 3 : (isBootstrap || isThesaurus ? 1.5 : 2),
            color: typeColors[event.type] || typeColors.default,
            baseColor: baseColors[event.base], // Color by base for clustering view
            group: group,
            cluster: baseToCluster[event.base], // Numeric cluster ID for force
            base: event.base, // Keep base for clustering
            event: event
        };

        nodes.push(node);
        nodeMap.set(event.id, node);
    });

    // Create links from cause relationships (now handles arrays per BSL spec)
    events.forEach(event => {
        const causes = Array.isArray(event.cause) ? event.cause : (event.cause ? [event.cause] : []);
        causes.forEach(causeId => {
            if (causeId && nodeMap.has(causeId)) {
                links.push({
                    source: event.id,
                    target: causeId,
                    color: 'rgba(255,255,255,0.2)'
                });
            }
        });
    });

    // Add invisible clustering links between nodes with same base
    // This helps the force simulation group them together
    const baseGroups = {};
    nodes.forEach(node => {
        if (!baseGroups[node.base]) baseGroups[node.base] = [];
        baseGroups[node.base].push(node.id);
    });

    // Create cluster links (low strength, invisible)
    Object.values(baseGroups).forEach(groupNodes => {
        if (groupNodes.length > 1) {
            // Connect each node to the first node in the group (star topology)
            const hub = groupNodes[0];
            for (let i = 1; i < groupNodes.length; i++) {
                links.push({
                    source: groupNodes[i],
                    target: hub,
                    color: 'rgba(0,0,0,0)', // Invisible
                    isClusterLink: true
                });
            }
        }
    });

    return { nodes, links, bases, baseColors };
}

/**
 * Generate HTML for the graph popup window
 */
function generateGraphHTML(graphData) {
    const dataJson = JSON.stringify(graphData);

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Event Graph - Prostochat</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background: #1a1a2e;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        #graph { width: 100vw; height: 100vh; }

        .controls {
            position: fixed;
            top: 10px;
            left: 10px;
            z-index: 100;
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            max-width: 400px;
        }

        .controls button, .controls select {
            padding: 6px 12px;
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            color: white;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }

        .controls button:hover {
            background: rgba(255,255,255,0.2);
        }

        .info-panel {
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 15px;
            border-radius: 8px;
            max-width: 350px;
            font-size: 12px;
            display: none;
            z-index: 100;
        }

        .info-panel.visible { display: block; }

        .info-panel h3 {
            margin-bottom: 10px;
            color: #4ecdc4;
            word-break: break-all;
        }

        .info-panel .field {
            margin-bottom: 6px;
        }

        .info-panel .label {
            color: #888;
            margin-right: 5px;
        }

        .info-panel .value {
            color: #fff;
            word-break: break-all;
        }

        .legend {
            position: fixed;
            bottom: 10px;
            left: 10px;
            background: rgba(0,0,0,0.7);
            padding: 10px;
            border-radius: 8px;
            font-size: 11px;
            color: white;
            z-index: 100;
        }

        .legend-item {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 4px;
        }

        .legend-color {
            width: 12px;
            height: 12px;
            border-radius: 50%;
        }

        .stats {
            position: fixed;
            bottom: 10px;
            right: 10px;
            background: rgba(0,0,0,0.7);
            padding: 10px;
            border-radius: 8px;
            font-size: 11px;
            color: white;
            z-index: 100;
        }
    </style>
</head>
<body>
    <div id="graph"></div>

    <div class="controls">
        <button onclick="resetCamera()">Reset View</button>
        <button onclick="toggleLabels()">Labels</button>
        <button onclick="toggleColorMode()">Color: <span id="color-mode">Type</span></button>
        <button onclick="toggleClustering()">Cluster: <span id="cluster-mode">ON</span></button>
        <select id="filter-group" onchange="filterByGroup(this.value)">
            <option value="">All Groups</option>
            <option value="genesis">Genesis</option>
            <option value="bootstrap">Bootstrap</option>
            <option value="thesaurus">Thesaurus</option>
            <option value="user">User</option>
        </select>
        <select id="filter-type" onchange="filterByType(this.value)">
            <option value="">All Types</option>
            <option value="Event">Event</option>
            <option value="Instance">Instance</option>
            <option value="Individual">Individual</option>
            <option value="Model">Model</option>
            <option value="SetModel">SetModel</option>
            <option value="Attribute">Attribute</option>
            <option value="Relation">Relation</option>
        </select>
        <select id="filter-base" onchange="filterByBase(this.value)">
            <option value="">All Bases</option>
        </select>
    </div>

    <div class="info-panel" id="info-panel">
        <h3 id="info-title"></h3>
        <div class="field"><span class="label">ID:</span><span class="value" id="info-id"></span></div>
        <div class="field"><span class="label">Base:</span><span class="value" id="info-base"></span></div>
        <div class="field"><span class="label">Type:</span><span class="value" id="info-type"></span></div>
        <div class="field"><span class="label">Value:</span><span class="value" id="info-value"></span></div>
        <div class="field"><span class="label">Cause:</span><span class="value" id="info-cause"></span></div>
        <div class="field"><span class="label">Model:</span><span class="value" id="info-model"></span></div>
        <div class="field"><span class="label">Actor:</span><span class="value" id="info-actor"></span></div>
    </div>

    <div class="legend">
        <div class="legend-item"><div class="legend-color" style="background:#ff6b6b"></div>Event</div>
        <div class="legend-item"><div class="legend-color" style="background:#4ecdc4"></div>Instance</div>
        <div class="legend-item"><div class="legend-color" style="background:#45b7d1"></div>Individual</div>
        <div class="legend-item"><div class="legend-color" style="background:#96ceb4"></div>Model</div>
        <div class="legend-item"><div class="legend-color" style="background:#ffeaa7"></div>SetModel</div>
        <div class="legend-item"><div class="legend-color" style="background:#a29bfe"></div>Relation</div>
    </div>

    <div class="stats" id="stats"></div>

    <script src="https://unpkg.com/3d-force-graph@1.70.0/dist/3d-force-graph.min.js"></script>
    <script>
        const graphData = ${dataJson};
        let showLabels = false;
        let colorByBase = false;
        let clusteringEnabled = true;
        let currentFilter = { group: '', type: '', base: '' };

        // Populate base filter dropdown
        const baseSelect = document.getElementById('filter-base');
        graphData.bases.forEach(base => {
            const opt = document.createElement('option');
            opt.value = base;
            opt.textContent = base;
            baseSelect.appendChild(opt);
        });

        // Initialize graph - clustering via invisible links between same-base nodes
        const Graph = ForceGraph3D()
            (document.getElementById('graph'))
            .graphData(graphData)
            .nodeLabel(node => node.name)
            .nodeColor(node => colorByBase ? node.baseColor : node.color)
            .nodeVal(node => node.val)
            .nodeOpacity(0.9)
            .linkColor(link => link.isClusterLink ? 'rgba(0,0,0,0)' : link.color)
            .linkWidth(link => link.isClusterLink ? 0 : 0.5)
            .linkOpacity(link => link.isClusterLink ? 0 : 0.3)
            .linkDirectionalArrowLength(link => link.isClusterLink ? 0 : 3)
            .linkDirectionalArrowRelPos(1)
            .backgroundColor('#1a1a2e')
            .onNodeClick(node => showNodeInfo(node))
            .onNodeHover(node => {
                document.body.style.cursor = node ? 'pointer' : 'default';
            });

        // Node text labels
        Graph.nodeThreeObject(node => {
            if (!showLabels) return null;
            const sprite = new SpriteText(node.name);
            sprite.color = '#ffffff';
            sprite.textHeight = 4;
            sprite.backgroundColor = 'rgba(0,0,0,0.5)';
            sprite.padding = 1;
            return sprite;
        });

        // Update stats
        document.getElementById('stats').innerHTML =
            'Nodes: ' + graphData.nodes.length + '<br>Links: ' + graphData.links.length;

        function resetCamera() {
            Graph.cameraPosition({ x: 0, y: 0, z: 500 }, { x: 0, y: 0, z: 0 }, 1000);
        }

        function toggleLabels() {
            showLabels = !showLabels;
            Graph.nodeThreeObject(node => {
                if (!showLabels) return null;
                const sprite = new SpriteText(node.name);
                sprite.color = '#ffffff';
                sprite.textHeight = 4;
                sprite.backgroundColor = 'rgba(0,0,0,0.5)';
                sprite.padding = 1;
                return sprite;
            });
        }

        function filterByGroup(group) {
            currentFilter.group = group;
            applyFilters();
        }

        function filterByType(type) {
            currentFilter.type = type;
            applyFilters();
        }

        function filterByBase(base) {
            currentFilter.base = base;
            applyFilters();
        }

        function toggleColorMode() {
            colorByBase = !colorByBase;
            document.getElementById('color-mode').textContent = colorByBase ? 'Base' : 'Type';
            Graph.nodeColor(node => colorByBase ? node.baseColor : node.color);
        }

        function toggleClustering() {
            clusteringEnabled = !clusteringEnabled;
            document.getElementById('cluster-mode').textContent = clusteringEnabled ? 'ON' : 'OFF';
            // Rebuild graph with/without cluster links
            applyFilters();
        }

        function applyFilters() {
            const filteredNodes = graphData.nodes.filter(node => {
                if (currentFilter.group && node.group !== currentFilter.group) return false;
                if (currentFilter.type && node.event.type !== currentFilter.type) return false;
                if (currentFilter.base && node.base !== currentFilter.base) return false;
                return true;
            });

            const nodeIds = new Set(filteredNodes.map(n => n.id));

            const filteredLinks = graphData.links.filter(link => {
                // Skip cluster links if clustering disabled
                if (!clusteringEnabled && link.isClusterLink) return false;
                const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                return nodeIds.has(sourceId) && nodeIds.has(targetId);
            });

            Graph.graphData({ nodes: filteredNodes, links: filteredLinks });

            document.getElementById('stats').innerHTML =
                'Nodes: ' + filteredNodes.length + '<br>Links: ' + filteredLinks.length +
                (currentFilter.base ? '<br>Base: ' + currentFilter.base : '');
        }

        function showNodeInfo(node) {
            const panel = document.getElementById('info-panel');
            const event = node.event;

            // Handle cause as array (BSL A2, A3)
            const causes = Array.isArray(event.cause) ? event.cause : (event.cause ? [event.cause] : []);
            const causeText = causes.length > 0 ? causes.join(', ') : '-';

            document.getElementById('info-title').textContent = node.name;
            document.getElementById('info-id').textContent = event.id;
            document.getElementById('info-base').textContent = event.base;
            document.getElementById('info-type').textContent = event.type;
            document.getElementById('info-value').textContent =
                typeof event.value === 'object' ? JSON.stringify(event.value) : event.value;
            document.getElementById('info-cause').textContent = causeText;
            document.getElementById('info-model').textContent = event.model || '-';
            document.getElementById('info-actor').textContent = event.actor || '-';

            panel.classList.add('visible');

            // Highlight connected nodes (handles cause array)
            const causeSet = new Set(causes);
            Graph.nodeColor(n => {
                if (n.id === node.id) return '#ffffff';
                if (causeSet.has(n.id)) return '#00ff00'; // Parent nodes (cause)
                // Check if this node is caused by the selected node
                const isChild = graphData.links.some(l => {
                    const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
                    const targetId = typeof l.target === 'object' ? l.target.id : l.target;
                    return sourceId === n.id && targetId === node.id && !l.isClusterLink;
                });
                if (isChild) return '#ffff00'; // Child nodes
                // Highlight same base with subtle color
                if (n.base === node.base && n.id !== node.id) return '#88ccff';
                return colorByBase ? n.baseColor : n.color;
            });
        }

        // Close info panel on background click
        document.getElementById('graph').addEventListener('click', (e) => {
            if (e.target.tagName === 'CANVAS') {
                // Reset colors after a delay (respects current color mode)
                setTimeout(() => {
                    Graph.nodeColor(node => colorByBase ? node.baseColor : node.color);
                    document.getElementById('info-panel').classList.remove('visible');
                }, 100);
            }
        });

        // SpriteText helper
        class SpriteText {
            constructor(text) {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                ctx.font = '48px Arial';
                const textWidth = ctx.measureText(text).width;

                canvas.width = textWidth + 20;
                canvas.height = 60;

                ctx.fillStyle = this.backgroundColor || 'transparent';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                ctx.font = '48px Arial';
                ctx.fillStyle = this.color || 'white';
                ctx.fillText(text, 10, 45);

                const texture = new THREE.CanvasTexture(canvas);
                const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
                const sprite = new THREE.Sprite(spriteMaterial);

                sprite.scale.set(canvas.width / 10, canvas.height / 10, 1);

                return sprite;
            }
        }
    </script>
</body>
</html>`;
}

// Check if ID is genesis (local helper to avoid conflict with global isGenesisId)
function checkIsGenesisId(id) {
    // Use global function if available
    if (typeof window.isGenesisId === 'function') {
        return window.isGenesisId(id);
    }
    // Fallback - check common genesis IDs
    const genesisIds = ['Event', 'Delete', 'Instance', 'Actor', 'Concept', 'Model',
                        'Individual', 'Attribute', 'Relation', 'Role', 'Restriction'];
    return genesisIds.includes(id);
}
