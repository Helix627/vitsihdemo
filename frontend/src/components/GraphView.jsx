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

const getLayoutConfig = (layoutName, nodeCount = 0) => {
  if (layoutName === "cose" || !layoutName) {
    // Adaptive iterations: fewer for larger graphs to avoid cose hanging the browser
    const numIter = nodeCount > 200 ? 150 : nodeCount > 100 ? 250 : 400;
    return {
      name: "cose",
      animate: false,
      fit: true,
      padding: 45,
      randomize: false,
      nodeRepulsion: (node) => {
        const type = node.data("type");
        if (type === "marketplace") return 8000;
        if (type === "vendor") return 5000;
        return 3500;
      },
      idealEdgeLength: (edge) => {
        const rel = edge.data("relation");
        if (rel === "LISTED_ON") return 90;
        if (rel === "RESOLVES_TO_ORIGIN" || rel === "HOSTED_ON") return 75;
        if (rel === "SAME_AS" || rel === "SUGGESTION") return 65;
        return 55;
      },
      edgeElasticity: () => 32,
      nestingFactor: 1.0,
      gravity: 0.75,
      gravityRange: 3.8,
      numIter,
      initialTemp: 1000,
      coolingFactor: 0.96,
      minTemp: 1.0,
    };
  }
  if (layoutName === "concentric") {
    return {
      name: "concentric",
      animate: false,
      fit: true,
      padding: 45,
      minNodeSpacing: 50,
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
      padding: 45,
      spacingFactor: 1.5,
      directed: false,
    };
  }
  if (layoutName === "circle") {
    return {
      name: "circle",
      animate: false,
      fit: true,
      padding: 45,
      spacingFactor: 1.3,
    };
  }
  return {
    name: layoutName,
    animate: false,
    fit: true,
    padding: 45,
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
  theme = "dark",
}) => {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const focusedNodeRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const isDark = theme === "dark";
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
            "font-family": "IBM Plex Sans, -apple-system, sans-serif",
            "font-weight": 600,
            color: isDark ? "#f8fafc" : "#0f172a",
            "text-valign": "center",
            "text-halign": "center",
            "text-outline-color": isDark ? "#0f172a" : "#ffffff",
            "text-outline-width": 2.5,
            width: "44px",
            height: "44px",
            "border-width": 2,
            "border-color": isDark ? "#334155" : "#cbd5e1",
          },
        },
        ...NODE_STYLES,
        {
          selector: "edge",
          style: {
            width: 1.5,
            "curve-style": "bezier",
            "line-color": isDark ? "#475569" : "#94a3b8",
            "target-arrow-color": isDark ? "#475569" : "#94a3b8",
            "target-arrow-shape": "triangle",
            "arrow-scale": 0.85,
            label: "data(label)",
            "font-size": "9px",
            "font-weight": 500,
            color: isDark ? "#cbd5e1" : "#475569",
            "text-rotation": "autorotate",
            "text-background-opacity": 0.85,
            "text-background-color": isDark ? "#0f172a" : "#ffffff",
            "text-background-padding": 2,
            "text-background-shape": "roundrectangle",
            "text-border-opacity": 0.4,
            "text-border-width": 1,
            "text-border-color": isDark ? "#334155" : "#e2e8f0",
          },
        },
        ...EDGE_STYLES,
        {
          selector: "node:selected",
          style: {
            "border-width": 4,
            "border-color": "#a855f7",
            "border-opacity": 1,
            "underlay-color": "#a855f7",
            "underlay-padding": 8,
            "underlay-opacity": 0.3,
          },
        },
        {
          selector: ".dimmed",
          style: {
            opacity: 0.12,
          },
        },
        {
          selector: ".highlighted",
          style: {
            opacity: 1,
            "border-width": 3,
            "border-color": "#a855f7",
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
      layout: getLayoutConfig(layout, elements.length),
      wheelSensitivity: 0.25,
      boxSelectionEnabled: false,
      textureOnViewport: true,
      hideEdgesOnViewport: true, // 60fps pan/zoom performance optimization
      pixelRatio: 1.25,
      minZoom: 0.12,
      maxZoom: 3.5,
    });

    cyRef.current = cy;
    if (onCyReady) onCyReady(cy);

    cy.ready(() => {
      cy.resize();
      cy.fit(undefined, 45);
    });

    cy.on("layoutstop", () => {
      cy.resize();
      cy.fit(undefined, 45);
    });

    // Apply persistent highlight on a node and its neighborhood
    const applyPersistentHighlight = (node) => {
      if (!node || !node.length) return;
      focusedNodeRef.current = node;
      cy.nodes().removeClass("search-focused");
      cy.elements().removeClass("highlighted");
      const neighborhood = node.neighborhood().add(node);
      cy.elements().addClass("dimmed");
      neighborhood.removeClass("dimmed").addClass("highlighted");
      node.addClass("search-focused");
      node.select();
    };

    // Clear all highlights
    const clearAllHighlights = () => {
      focusedNodeRef.current = null;
      cy.elements().removeClass("dimmed").removeClass("highlighted").removeClass("search-focused");
      cy.elements().unselect();
    };

    cy.on("tap", "node", (evt) => {
      const node = evt.target;
      applyPersistentHighlight(node);
      onNodeClick(node.data());
    });

    // Deselect on empty canvas click
    cy.on("tap", (evt) => {
      if (evt.target === cy) {
        clearAllHighlights();
      }
    });

    // Temporary hover highlight
    cy.on("mouseover", "node", (evt) => {
      const node = evt.target;
      const neighborhood = node.neighborhood().add(node);
      cy.elements().addClass("dimmed");
      neighborhood.removeClass("dimmed").addClass("highlighted");
    });

    // Restore persistent highlight on mouseout
    cy.on("mouseout", "node", () => {
      if (focusedNodeRef.current && cy.getElementById(focusedNodeRef.current.id()).length) {
        applyPersistentHighlight(focusedNodeRef.current);
      } else {
        cy.elements().removeClass("dimmed").removeClass("highlighted");
      }
    });

    return () => {
      cy.destroy();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph, onNodeClick, onCyReady]);

  // Lightweight theme patch — updates colors in-place WITHOUT destroying/rebuilding cy
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;
    const isDark = theme === "dark";
    cy.style()
      .selector("node")
      .style({ color: isDark ? "#f8fafc" : "#0f172a", "text-outline-color": isDark ? "#0f172a" : "#ffffff", "border-color": isDark ? "#334155" : "#cbd5e1" })
      .selector("edge")
      .style({ "line-color": isDark ? "#475569" : "#94a3b8", "target-arrow-color": isDark ? "#475569" : "#94a3b8", color: isDark ? "#cbd5e1" : "#475569", "text-background-color": isDark ? "#0f172a" : "#ffffff", "text-border-color": isDark ? "#334155" : "#e2e8f0" })
      .update();
  }, [theme]);

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
    const config = getLayoutConfig(layout, cy.nodes().length);
    const l = cy.layout({ ...config, animate: true, animationDuration: 450 });
    l.run();
  }, [layout]);

  // Instant Search Location & Camera Focus (Persisted until search is cleared)
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    if (!focusRequest) {
      focusedNodeRef.current = null;
      cy.elements().removeClass("dimmed").removeClass("highlighted").removeClass("search-focused");
      cy.elements().unselect();
      return;
    }

    // Find all target nodes belonging to this entity persona
    let target = cy.collection();

    // 1. Add all explicit node_ids (e.g. multiple vendor accounts across markets)
    if (focusRequest.node_ids && Array.isArray(focusRequest.node_ids)) {
      focusRequest.node_ids.forEach((nid) => {
        const found = cy.getElementById(nid);
        if (found.length) target = target.add(found);
      });
    }

    // 2. Add single ID if provided
    if (focusRequest.id) {
      const found = cy.getElementById(focusRequest.id);
      if (found.length) target = target.add(found);
    }

    // 3. Add any nodes matching vendor_ids array
    if (focusRequest.vendor_ids && Array.isArray(focusRequest.vendor_ids)) {
      focusRequest.vendor_ids.forEach((vid) => {
        const found = cy.nodes().filter((n) => n.data("vendor_id") === vid);
        if (found.length) target = target.add(found);
      });
    }

    // 4. Add any nodes with matching username or label (case-insensitive)
    const searchName = (focusRequest.username || focusRequest.label || "").trim().toLowerCase();
    if (searchName) {
      const matching = cy.nodes().filter((n) => {
        const u = (n.data("username") || "").toLowerCase();
        const l = (n.data("label") || "").toLowerCase();
        return u === searchName || l === searchName;
      });
      if (matching.length) target = target.add(matching);
    }

    // 5. Fallback for normalized_value or identity_id
    if (!target.length && focusRequest.normalized_value) {
      const found = cy.nodes().filter((n) => n.data("normalized_value") === focusRequest.normalized_value);
      if (found.length) target = target.add(found);
    }
    if (!target.length && focusRequest.identity_id) {
      const found = cy.nodes().filter((n) => n.data("identity_id") === focusRequest.identity_id);
      if (found.length) target = target.add(found);
    }

    if (target.length) {
      focusedNodeRef.current = target;

      // Highlight all persona nodes and their entire connected neighborhood across marketplaces!
      cy.nodes().removeClass("search-focused");
      cy.elements().removeClass("highlighted");
      const neighborhood = target.neighborhood().add(target);
      cy.elements().addClass("dimmed");
      neighborhood.removeClass("dimmed").addClass("highlighted");
      target.addClass("search-focused");

      // Select target collection
      cy.elements().unselect();
      target.select();

      // Smooth camera pan & fit to the complete unified cluster with optimal framing
      cy.stop(true, true);
      if (target.length > 1 || neighborhood.length > 4) {
        cy.animate({
          center: { eles: neighborhood },
          fit: { eles: neighborhood, padding: 80 },
          duration: 600,
          easing: "ease-in-out-cubic",
        });
      } else {
        cy.animate({
          center: { eles: target },
          zoom: 1.8,
          duration: 500,
          easing: "ease-in-out-cubic",
        });
      }
    }
  }, [focusRequest]);

  return (
    <div className="graph-shell">
      <div ref={containerRef} className="graph-canvas" />
    </div>
  );
};

export default GraphView;
