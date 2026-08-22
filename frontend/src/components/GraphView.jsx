import { useEffect, useRef } from "react";
import cytoscape from "cytoscape";

const NODE_STYLES = [
  { selector: "node[type = 'vendor']", style: { "background-color": "#10B981", shape: "ellipse" } },
  { selector: "node[type = 'alias']", style: { "background-color": "#059669", shape: "round-rectangle" } },
  { selector: "node[type = 'username']", style: { "background-color": "#8B5CF6", shape: "hexagon" } },
  { selector: "node[type = 'email']", style: { "background-color": "#0284C7", shape: "hexagon" } },
  { selector: "node[type = 'bitcoin']", style: { "background-color": "#F59E0B", shape: "round-rectangle" } },
  { selector: "node[type = 'pgp']", style: { "background-color": "#F97316", shape: "diamond" } },
  { selector: "node[type = 'marketplace']", style: { "background-color": "#EC4899", shape: "octagon", width: "65px", height: "65px" } },
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
    selector: "edge[relation = 'LIKELY_SAME_AS'], edge[relation = 'probabilistic_similarity']",
    style: { width: 2.5, "line-color": "#EC4899", "target-arrow-color": "#EC4899", "line-style": "dashed" },
  },
  {
    selector: "edge[relation = 'HAS_EMAIL']",
    style: { width: 1.8, "line-color": "#0284C7", "target-arrow-color": "#0284C7" },
  },
  {
    selector: "edge[relation = 'HAS_WALLET']",
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

const GraphView = ({ graph, layout, onNodeClick, onCyReady, selectedNodeId, focusRequest }) => {
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
            "transition-property": "background-color, line-color, target-arrow-color, opacity, border-width",
            "transition-duration": "0.2s",
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
      ],
      layout: {
        name: layout || "cose",
        animate: false,
      },
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

  // Layout update
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;
    const l = cy.layout({ name: layout || "cose", animate: true, animationDuration: 400 });
    l.run();
  }, [layout]);

  // Focus request
  useEffect(() => {
    if (!cyRef.current || !focusRequest?.id) return;
    const cy = cyRef.current;
    const target = cy.getElementById(focusRequest.id);
    if (target.length) {
      cy.animate({
        center: { eles: target },
        zoom: 1.5,
        duration: 400,
      });
      target.select();
    }
  }, [focusRequest]);

  return (
    <div className="graph-shell">
      <div ref={containerRef} className="graph-canvas" />
    </div>
  );
};

export default GraphView;
