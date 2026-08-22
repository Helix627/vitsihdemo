/**
 * TRINETRA — Graph Utilities
 *
 * Helpers for Cytoscape styling, layout configuration, and
 * graph element manipulation. No intelligence is fabricated here.
 */

/* =========================================================
   Node Type Configuration
   Architected to support future node types via this map.
   ========================================================= */

export const NODE_TYPE_CONFIG = {
  vendor: {
    shape: "ellipse",
    color: "#2e7d32",
    background: "#e8f5e9",
    borderColor: "#2e7d32",
    label: "Vendor",
  },
  pgp: {
    shape: "diamond",
    color: "#ef6c00",
    background: "#fff3e0",
    borderColor: "#ef6c00",
    label: "PGP Key",
  },
  // Default for unknown future types
  unknown: {
    shape: "rectangle",
    color: "#5f6368",
    background: "#f5f7fa",
    borderColor: "#9aa0a6",
    label: "Entity",
  },
};

/**
 * Get node config for a given type, falling back to 'unknown'.
 */
export function getNodeConfig(type) {
  return NODE_TYPE_CONFIG[type] ?? NODE_TYPE_CONFIG.unknown;
}

/* =========================================================
   Cytoscape Stylesheet
   ========================================================= */

export function buildCytoscapeStylesheet() {
  return [
    // Base node style
    {
      selector: "node",
      style: {
        "font-family": "Inter, system-ui, sans-serif",
        "font-size": "11px",
        "font-weight": "500",
        "label": "data(label)",
        "text-valign": "bottom",
        "text-halign": "center",
        "text-margin-y": "6px",
        "color": "#1a1d23",
        "text-outline-width": "2px",
        "text-outline-color": "#f8f9fc",
        "width": "36px",
        "height": "36px",
        "border-width": "2px",
        "border-opacity": 1,
        "background-opacity": 1,
        "overlay-opacity": 0,
        "transition-property": "opacity, border-width, width, height",
        "transition-duration": "150ms",
      },
    },
    // Vendor nodes
    {
      selector: "node[type='vendor']",
      style: {
        "shape": "ellipse",
        "background-color": NODE_TYPE_CONFIG.vendor.background,
        "border-color": NODE_TYPE_CONFIG.vendor.borderColor,
        "width": "38px",
        "height": "38px",
      },
    },
    // PGP nodes
    {
      selector: "node[type='pgp']",
      style: {
        "shape": "diamond",
        "background-color": NODE_TYPE_CONFIG.pgp.background,
        "border-color": NODE_TYPE_CONFIG.pgp.borderColor,
        "width": "32px",
        "height": "32px",
      },
    },
    // Unknown node types
    {
      selector: "node[type='unknown']",
      style: {
        "shape": "rectangle",
        "background-color": NODE_TYPE_CONFIG.unknown.background,
        "border-color": NODE_TYPE_CONFIG.unknown.borderColor,
      },
    },
    // Base edge style
    {
      selector: "edge",
      style: {
        "width": "1.5px",
        "line-color": "#c5cae9",
        "target-arrow-color": "#c5cae9",
        "target-arrow-shape": "triangle",
        "curve-style": "bezier",
        "arrow-scale": 0.8,
        "opacity": 0.9,
        "overlay-opacity": 0,
        "transition-property": "opacity, line-color, width",
        "transition-duration": "150ms",
      },
    },
    // Selected node
    {
      selector: "node.selected",
      style: {
        "border-color": "#1565c0",
        "border-width": "3px",
        "width": "44px",
        "height": "44px",
        "background-color": "#e3f2fd",
        "color": "#0d47a1",
        "font-weight": "700",
        "text-outline-color": "#e3f2fd",
        "z-index": 999,
      },
    },
    // Highlighted neighbor nodes
    {
      selector: "node.highlighted",
      style: {
        "border-width": "2.5px",
        "opacity": 1,
        "z-index": 100,
      },
    },
    // Dimmed nodes (unrelated when something is selected)
    {
      selector: "node.dimmed",
      style: {
        "opacity": 0.2,
      },
    },
    // Dimmed edges
    {
      selector: "edge.dimmed",
      style: {
        "opacity": 0.08,
      },
    },
    // Highlighted edges (connected to selected)
    {
      selector: "edge.highlighted",
      style: {
        "line-color": "#90caf9",
        "target-arrow-color": "#90caf9",
        "width": "2.5px",
        "opacity": 1,
        "z-index": 100,
      },
    },
    // Search result match
    {
      selector: "node.search-match",
      style: {
        "border-color": "#f57c00",
        "border-width": "3px",
        "background-color": "#fff3e0",
      },
    },
  ];
}

/* =========================================================
   Layout Configurations
   ========================================================= */

export const AVAILABLE_LAYOUTS = [
  { id: "cose", label: "Force-directed (Cose)" },
  { id: "breadthfirst", label: "Breadth-first" },
  { id: "circle", label: "Circular" },
  { id: "grid", label: "Grid" },
];

export function buildLayoutConfig(layoutId, nodeCount = 0) {
  const base = {
    animate: nodeCount < 200,
    animationDuration: 400,
    fit: true,
    padding: 48,
  };

  switch (layoutId) {
    case "breadthfirst":
      return {
        name: "breadthfirst",
        ...base,
        directed: false,
        spacingFactor: 1.4,
      };
    case "circle":
      return {
        name: "circle",
        ...base,
        spacingFactor: 1.2,
      };
    case "grid":
      return {
        name: "grid",
        ...base,
        spacingFactor: 1.3,
      };
    case "cose":
    default:
      return {
        name: "cose",
        ...base,
        nodeRepulsion: () => 6000,
        idealEdgeLength: () => 100,
        edgeElasticity: () => 100,
        gravity: 0.25,
        numIter: 1000,
        randomize: true,
      };
  }
}

/* =========================================================
   Highlight Helpers
   ========================================================= */

/**
 * Apply selection highlighting to a clicked node.
 * - selected node: .selected class
 * - neighbors: .highlighted
 * - connected edges: .highlighted
 * - everything else: .dimmed
 */
export function applyNodeHighlight(cy, nodeId) {
  clearHighlight(cy);

  const targetNode = cy.getElementById(nodeId);
  if (!targetNode || targetNode.length === 0) return;

  const connectedEdges = targetNode.connectedEdges();
  const neighborNodes = targetNode.neighborhood("node");

  // Dim all first
  cy.elements().addClass("dimmed");

  // Un-dim and highlight target
  targetNode.removeClass("dimmed").addClass("selected");

  // Un-dim and highlight neighbors
  neighborNodes.removeClass("dimmed").addClass("highlighted");

  // Un-dim and highlight connected edges
  connectedEdges.removeClass("dimmed").addClass("highlighted");
}

/**
 * Apply hover highlighting (lighter than selection).
 */
export function applyHoverHighlight(cy, nodeId) {
  const targetNode = cy.getElementById(nodeId);
  if (!targetNode || targetNode.length === 0) return;

  const connectedEdges = targetNode.connectedEdges();
  const neighborNodes = targetNode.neighborhood("node");

  cy.elements().addClass("dimmed");
  targetNode.removeClass("dimmed");
  neighborNodes.removeClass("dimmed");
  connectedEdges.removeClass("dimmed").addClass("highlighted");
}

/**
 * Remove all highlighting classes.
 */
export function clearHighlight(cy) {
  cy.elements().removeClass("dimmed highlighted selected search-match");
}

/* =========================================================
   Graph Metrics (derived from loaded graph — not backend stats)
   ========================================================= */

/**
 * Compute basic metrics from the Cytoscape instance.
 * These are graph-derived, NOT backend statistics.
 */
export function computeGraphMetrics(cy) {
  if (!cy) return null;
  const nodes = cy.nodes();
  const edges = cy.edges();

  const vendorCount = nodes.filter("[type='vendor']").length;
  const pgpCount = nodes.filter("[type='pgp']").length;

  return {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    vendorNodes: vendorCount,
    pgpNodes: pgpCount,
  };
}

/**
 * Extract the entity type and numeric ID from a node ID string.
 * e.g. "vendor_12" → { type: "vendor", numericId: "12" }
 * e.g. "pgp_3" → { type: "pgp", numericId: "3" }
 */
export function parseNodeId(nodeId) {
  if (!nodeId) return { type: "unknown", numericId: null };
  const match = String(nodeId).match(/^([a-z_]+?)_(\d+.*)$/i);
  if (match) {
    return { type: match[1], numericId: match[2] };
  }
  return { type: "unknown", numericId: nodeId };
}
