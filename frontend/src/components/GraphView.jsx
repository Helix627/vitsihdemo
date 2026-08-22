/**
 * TRINETRA — GraphView
 *
 * Core Cytoscape.js visualization component.
 *
 * Key rules:
 * - Cytoscape instance created ONCE per mount (useRef + useEffect)
 * - Instance destroyed on cleanup (no memory leaks)
 * - Elements updated cleanly when data changes (no full recreate)
 * - Layout only runs on: initial load, user layout change, explicit refresh
 * - Hover: highlight neighbors, dim others
 * - Click: select node, notify parent
 */

import { useEffect, useRef, useCallback } from "react";
import cytoscape from "cytoscape";
import { buildCytoscapeStylesheet, buildLayoutConfig, applyNodeHighlight, applyHoverHighlight, clearHighlight } from "../utils/graphUtils";
import GraphLegend from "./GraphLegend";
import { LoadingSpinner } from "./LoadingState";
import ErrorState from "./ErrorState";

export default function GraphView({
  data,            // { nodes, edges }
  loading,
  error,
  onRetry,
  layout,          // current layout id string
  onNodeSelect,    // (nodeId, nodeData) => void
  onClearSelect,   // () => void — called when bg clicked
  selectedNodeId,  // string | null
  highlightNodeId, // node to pan/highlight (from search)
  onCyReady,       // (cy) => void — exposes cy instance to parent
}) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const layoutRef = useRef(layout);
  const currentSelectRef = useRef(selectedNodeId);

  // Track layout and selection refs without causing re-renders
  useEffect(() => { layoutRef.current = layout; }, [layout]);
  useEffect(() => { currentSelectRef.current = selectedNodeId; }, [selectedNodeId]);

  /* ── Initialize Cytoscape ONCE ── */
  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      style: buildCytoscapeStylesheet(),
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: true,
      autounselectify: false,
      wheelSensitivity: 0.3,
    });

    cyRef.current = cy;
    onCyReady?.(cy);

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Update elements when data changes ── */
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !data) return;

    const elements = [
      ...data.nodes,
      ...data.edges,
    ];

    cy.batch(() => {
      cy.elements().remove();
      cy.add(elements);
    });

    // Run initial layout
    runLayout(cy, layoutRef.current, data.nodes.length);
  }, [data]);

  /* ── Re-run layout when layout prop changes ── */
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !data) return;
    runLayout(cy, layout, data.nodes.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  /* ── Handle search highlight (pan + zoom to node) ── */
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !highlightNodeId) return;

    const target = cy.getElementById(highlightNodeId);
    if (!target || target.length === 0) return;

    cy.elements().removeClass("search-match");
    target.addClass("search-match");

    cy.animate({
      center: { eles: target },
      zoom: 2,
      duration: 500,
      easing: "ease-in-out-cubic",
    });
  }, [highlightNodeId]);

  /* ── Apply selection highlight when selectedNodeId changes ── */
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    if (selectedNodeId) {
      applyNodeHighlight(cy, selectedNodeId);
    } else {
      clearHighlight(cy);
    }
  }, [selectedNodeId]);

  /* ── Attach Cytoscape event listeners ── */
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    // Node click → select + notify parent
    function handleNodeClick(evt) {
      const node = evt.target;
      const id = node.data("id");
      const nodeData = node.data();
      applyNodeHighlight(cy, id);
      onNodeSelect?.(id, nodeData);
    }

    // Background click → deselect
    function handleBgClick() {
      clearHighlight(cy);
      onClearSelect?.();
    }

    // Hover on node → dim others temporarily
    function handleMouseOver(evt) {
      if (currentSelectRef.current) return; // don't override active selection
      applyHoverHighlight(cy, evt.target.data("id"));
    }

    // Mouse leave → restore if no persistent selection
    function handleMouseOut() {
      if (currentSelectRef.current) return;
      clearHighlight(cy);
    }

    cy.on("tap", "node", handleNodeClick);
    cy.on("tap", handleBgClick);
    cy.on("mouseover", "node", handleMouseOver);
    cy.on("mouseout", "node", handleMouseOut);

    return () => {
      cy.off("tap", "node", handleNodeClick);
      cy.off("tap", handleBgClick);
      cy.off("mouseover", "node", handleMouseOver);
      cy.off("mouseout", "node", handleMouseOut);
    };
  }, [onNodeSelect, onClearSelect]);

  /* ── Node count badge ── */
  const nodeCount = data
    ? `${data.nodes.length} nodes · ${data.edges.length} edges`
    : null;

  return (
    <div className="graph-container">
      {/* Cytoscape mount target */}
      <div id="cy" ref={containerRef} aria-label="Relationship graph" />

      {/* Loading overlay */}
      {loading && (
        <div className="graph-loading">
          <LoadingSpinner />
          <p className="graph-loading__text">Loading graph data…</p>
        </div>
      )}

      {/* Error overlay */}
      {!loading && error && (
        <div className="graph-loading">
          <ErrorState message={error.message} onRetry={onRetry} />
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && data && data.nodes.length === 0 && (
        <div className="graph-loading">
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            No graph data available.
          </p>
        </div>
      )}

      {/* Legend */}
      {!loading && !error && data && data.nodes.length > 0 && (
        <GraphLegend />
      )}

      {/* Node count */}
      {nodeCount && !loading && !error && (
        <div className="graph-node-count">{nodeCount}</div>
      )}

      {/* Zoom controls */}
      <div className="graph-zoom-controls">
        <button
          className="graph-zoom-btn"
          onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 1.2)}
          title="Zoom in"
          aria-label="Zoom in"
        >+</button>
        <button
          className="graph-zoom-btn"
          onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 0.8)}
          title="Zoom out"
          aria-label="Zoom out"
        >−</button>
      </div>
    </div>
  );
}

/* Helper — run layout on cy instance */
function runLayout(cy, layoutId, nodeCount) {
  if (!cy || cy.nodes().length === 0) return;
  const config = buildLayoutConfig(layoutId, nodeCount);
  const layout = cy.layout(config);
  layout.run();
}
