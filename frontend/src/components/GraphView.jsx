import { useEffect, useRef } from "react";
import cytoscape from "cytoscape";

const NODE_STYLES = [
  { selector: "node[type = 'vendor']", style: { "background-color": "#10B981", shape: "ellipse" } },
  { selector: "node[type = 'alias']", style: { "background-color": "#059669", shape: "round-rectangle" } },
  { selector: "node[type = 'username']", style: { "background-color": "#8B5CF6", shape: "hexagon" } },
  { selector: "node[type = 'email']", style: { "background-color": "#0284C7", shape: "hexagon" } },
  { selector: "node[type = 'bitcoin']", style: { "background-color": "#F59E0B", shape: "round-rectangle" } },
  { selector: "node[type = 'monero']", style: { "background-color": "#EA580C", shape: "round-rectangle" } },
  { selector: "node[type = 'pgp']", style: { "background-color": "#F97316", shape: "diamond" } },
  { selector: "node[type = 'telegram']", style: { "background-color": "#06B6D4", shape: "round-rectangle" } },
  { selector: "node[type = 'discord']", style: { "background-color": "#6366F1", shape: "round-rectangle" } },
  { selector: "node[type = 'forum_handle']", style: { "background-color": "#64748B", shape: "hexagon" } },
  { selector: "node[type = 'onion']", style: { "background-color": "#D946EF", shape: "barrel" } },
  { selector: "node[type = 'origin_ip']", style: { "background-color": "#EF4444", shape: "round-rectangle", "border-color": "#DC2626", "border-width": 3 } },
  { selector: "node[type = 'marketplace']", style: { "background-color": "#EC4899", shape: "octagon", width: "76px", height: "76px", "font-size": "12px", "font-weight": "bold" } },
  { selector: "node[id = 'market_agora']", style: { "background-color": "#EC4899", "border-color": "#BE185D", "border-width": 3 } },
  { selector: "node[id = 'market_shadowbay']", style: { "background-color": "#8B5CF6", "border-color": "#6D28D9", "border-width": 3 } },
  { selector: "node[id = 'market_nightmarket']", style: { "background-color": "#06B6D4", "border-color": "#0891B2", "border-width": 3 } },
  { selector: "node[market_id = 101]", style: { "border-color": "#8B5CF6", "border-width": 3 } },
  { selector: "node[market_id = 102]", style: { "border-color": "#06B6D4", "border-width": 3 } },
  { selector: "node[type = 'listings']", style: { "background-color": "#64748B", shape: "rectangle" } },
  { selector: "node[type = 'product']", style: { "background-color": "#3B82F6", shape: "ellipse" } },
  { selector: "node[type = 'category']", style: { "background-color": "#14B8A6", shape: "round-rectangle" } },
];

const EDGE_STYLES = [
  {
    selector: "edge[relation = 'SAME_AS']",
    style: { width: 3.5, "line-color": "#10B981", "target-arrow-color": "#10B981", "line-style": "solid" },
  },
  {
    selector: "edge[relation = 'SUGGESTION'], edge[status = 'PENDING']",
    style: { width: 3.0, "line-color": "#F59E0B", "target-arrow-color": "#F59E0B", "line-style": "dashed" },
  },
  {
    selector: "edge[relation = 'LIKELY_SAME_AS'], edge[relation = 'probabilistic_similarity']",
    style: { width: 2.5, "line-color": "#EC4899", "target-arrow-color": "#EC4899", "line-style": "dashed" },
  },
  {
    selector: "edge[relation = 'RESOLVES_TO_ORIGIN'], edge[type = 'ATTRIBUTION']",
    style: { width: 3.0, "line-color": "#EF4444", "target-arrow-color": "#EF4444", "line-style": "dashed" },
  },
  {
    selector: "edge[relation = 'HOSTED_ON'], edge[type = 'INFRASTRUCTURE']",
    style: { width: 2.2, "line-color": "#D946EF", "target-arrow-color": "#D946EF" },
  },
  {
    selector: "edge[relation = 'HAS_EMAIL']",
    style: { width: 1.8, "line-color": "#0284C7", "target-arrow-color": "#0284C7" },
  },
  {
    selector: "edge[relation = 'HAS_WALLET'], edge[relation = 'HAS_BITCOIN'], edge[relation = 'HAS_MONERO']",
    style: { width: 1.8, "line-color": "#F59E0B", "target-arrow-color": "#F59E0B" },
  },
  {
    selector: "edge[relation = 'HAS_PGP']",
    style: { width: 1.8, "line-color": "#F97316", "target-arrow-color": "#F97316" },
  },
  {
    selector: "edge[relation = 'USES']",
    style: { width: 1.8, "line-color": "#8B5CF6", "target-arrow-color": "#8B5CF6" },
  },
];

const getLayoutConfig = (layoutName) => {
  if (layoutName === "cose" || !layoutName) {
    return {
      name: "cose",
      animate: false,
      fit: true,
      padding: 60,
      randomize: false,
      // Strong repulsion to keep clusters distinct and open
      nodeRepulsion: (node) => {
        const type = node.data("type");
        if (type === "marketplace") return 4500000;
        if (type === "vendor") return 1800000;
        return 1200000;
      },
      // Longer ideal edges to give nodes ample breathing room
      idealEdgeLength: (edge) => {
        const rel = edge.data("relation");
        if (rel === "LISTED_ON") return 220;
        if (rel === "RESOLVES_TO_ORIGIN" || rel === "HOSTED_ON") return 140;
        if (rel === "SAME_AS" || rel === "SUGGESTION") return 120;
        return 90;
      },
      edgeElasticity: () => 15,
      nestingFactor: 0.8,
      gravity: 0.08,        // Soft gravity so clusters expand outward instead of crushing inward
      gravityRange: 4.5,
      numIter: 500,
      coolingFactor: 0.98,
      minTemp: 1.0,
    };
  }
  if (layoutName === "concentric") {
    return {
      name: "concentric",
      animate: false,
      fit: true,
      padding: 60,
      minNodeSpacing: 60,
      concentric: (node) => {
        if (node.data("type") === "marketplace") return 10;
        if (node.data("type") === "vendor") return 6;
        return 2;
      },
      levelWidth: () => 1,
    };
  }
  if (layoutName === "breadthfirst") {
    return {
      name: "breadthfirst",
      animate: false,
      fit: true,
      padding: 60,
      spacingFactor: 1.75,
      directed: false,
    };
  }
  if (layoutName === "circle") {
    return {
      name: "circle",
      animate: false,
      fit: true,
      padding: 60,
      spacingFactor: 1.5,
    };
  }
  return {
    name: layoutName,
    animate: false,
    fit: true,
    padding: 60,
  };
};

const GraphView = ({
  graph,
  layout,
  confidenceThreshold = 0.0,
  onNodeClick,
  onCyReady,
  selectedNodeId,
  focusRequest,
}) => {
  const containerRef = useRef(null);
  const cyRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const elements = [...(graph.nodes || []), ...(graph.edges || [])];

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "font-size": "11px",
            "font-family": "IBM Plex Sans, sans-serif",
            "font-weight": 600,
            color: "#0f172a",
            "text-valign": "center",
            "text-halign": "center",
            "text-outline-color": "#ffffff",
            "text-outline-width": 2,
            width: "44px",
            height: "44px",
            "border-width": 2,
            "border-color": "#ffffff",
          },
        },
        ...NODE_STYLES,
        {
          selector: "edge",
          style: {
            width: 1.5,
            "curve-style": "bezier",
            "line-color": "#94a3b8",
            "target-arrow-color": "#94a3b8",
            "target-arrow-shape": "triangle",
            "arrow-scale": 0.9,
            label: "data(label)",
            "font-size": "9px",
            color: "#64748b",
            "text-rotation": "autorotate",
            "text-background-opacity": 0.8,
            "text-background-color": "#ffffff",
            "text-background-padding": 2,
          },
        },
        ...EDGE_STYLES,
        {
          selector: "node:selected",
          style: {
            "border-width": 4,
            "border-color": "#2563eb",
            "border-opacity": 1,
          },
        },
        {
          selector: ".dimmed",
          style: {
            opacity: 0.15,
          },
        },
        {
          selector: ".highlighted",
          style: {
            opacity: 1,
            "border-width": 3,
            "border-color": "#2563eb",
          },
        },
        {
          selector: ".search-focused",
          style: {
            "border-width": 5,
            "border-color": "#38bdf8",
            "border-opacity": 1,
            "underlay-color": "#38bdf8",
            "underlay-padding": 12,
            "underlay-opacity": 0.45,
            "z-index": 9999,
          },
        },
      ],
      layout: getLayoutConfig(layout),
    });

    cyRef.current = cy;
    if (onCyReady) onCyReady(cy);

    cy.on("tap", "node", (evt) => {
      const node = evt.target;
      onNodeClick(node.data());
    });

    // Neighborhood highlight on mouseover
    cy.on("mouseover", "node", (evt) => {
      const node = evt.target;
      const neighborhood = node.neighborhood().add(node);
      cy.elements().addClass("dimmed");
      neighborhood.removeClass("dimmed").addClass("highlighted");
    });

    cy.on("mouseout", "node", () => {
      cy.elements().removeClass("dimmed").removeClass("highlighted");
    });

    return () => {
      cy.destroy();
    };
  }, [graph, onNodeClick, onCyReady]);

  // Dynamic In-Place Edge Filtering (Instant, 60fps, no graph rebuilding!)
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    cy.batch(() => {
      cy.edges().forEach((edge) => {
        const weight = parseFloat(edge.data("confidence") ?? edge.data("weight") ?? 1.0);
        if (weight < confidenceThreshold) {
          edge.style("display", "none");
        } else {
          edge.style("display", "element");
        }
      });
    });
  }, [confidenceThreshold]);

  // Dynamic Layout Dispatcher
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;
    const config = getLayoutConfig(layout);
    const l = cy.layout({ ...config, animate: true, animationDuration: 450 });
    l.run();
  }, [layout]);

  // Instant Search Location & Camera Focus
  useEffect(() => {
    if (!cyRef.current || !focusRequest) return;
    const cy = cyRef.current;

    // Find target by ID or fallback attributes
    let target = focusRequest.id ? cy.getElementById(focusRequest.id) : cy.collection();
    if (!target.length && focusRequest.label) {
      target = cy.nodes().filter((n) => n.data("label") === focusRequest.label || n.data("username") === focusRequest.label);
    }
    if (!target.length && focusRequest.normalized_value) {
      target = cy.nodes().filter((n) => n.data("normalized_value") === focusRequest.normalized_value);
    }
    if (!target.length && focusRequest.identity_id) {
      target = cy.nodes().filter((n) => n.data("identity_id") === focusRequest.identity_id);
    }
    if (!target.length && focusRequest.vendor_id) {
      target = cy.nodes().filter((n) => n.data("vendor_id") === focusRequest.vendor_id);
    }

    if (target.length) {
      // Clear previous focus classes
      cy.nodes().removeClass("search-focused");
      cy.elements().removeClass("dimmed").removeClass("highlighted");

      // Highlight target and its immediate neighborhood
      const neighborhood = target.neighborhood().add(target);
      cy.elements().addClass("dimmed");
      neighborhood.removeClass("dimmed").addClass("highlighted");
      target.addClass("search-focused");

      // Select target
      cy.elements().unselect();
      target.select();

      // Smooth camera pan & zoom directly to the located entity
      cy.stop(true, true);
      cy.animate({
        center: { eles: target },
        zoom: 1.8,
        duration: 500,
        easing: "ease-in-out-cubic",
      });
    }
  }, [focusRequest]);

  return (
    <div className="graph-shell">
      <div ref={containerRef} className="graph-canvas" />
    </div>
  );
};

export default GraphView;
