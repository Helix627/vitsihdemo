/**
 * TRINETRA — RelationshipGraph Page
 *
 * Hero feature. Full-screen investigation graph with:
 * - Graph toolbar (Fit, Reset, Center, Refresh, Layout, Clear, Fullscreen)
 * - Cytoscape visualization (GraphView) — instance created once, never
 *   remounted on layout change (GraphView re-runs layout via prop effect)
 * - Right-side NodeDetails inspector panel
 * - Search focus-entity flow: selects + centers node if present,
 *   otherwise reports "not present in the current graph"
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation, useNavigate as useRouterNavigate } from "react-router-dom";
import { useGraph } from "../hooks/useGraph";
import GraphView from "../components/GraphView";
import GraphControls from "../components/GraphControls";
import NodeDetails from "../components/NodeDetails";

export default function RelationshipGraph({ refreshSignal = 0 }) {
  const { data, loading, error, fetchGraph } = useGraph();
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedNodeData, setSelectedNodeData] = useState(null);
  const [layout, setLayout] = useState("cose");
  const [notice, setNotice] = useState(null);
  const cyRef = useRef(null);
  const location = useLocation();
  const routerNavigate = useRouterNavigate();

  // Fetch graph on mount and on topbar refresh
  useEffect(() => {
    fetchGraph();
  }, [fetchGraph, refreshSignal]);

  /* ── Selection handlers ── */
  const handleNodeSelect = useCallback((nodeId, nodeData) => {
    setSelectedNodeId(nodeId);
    setSelectedNodeData(nodeData);
    setNotice(null);
  }, []);

  const handleClearSelect = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedNodeData(null);
  }, []);

  /* ── Search focus-entity flow ──
     Consumes location.state.focusEntity once graph data is available:
     node exists -> select + center; absent -> explicit notice. */
  useEffect(() => {
    const focusEntity = location.state?.focusEntity;
    if (!focusEntity || !data || !cyRef.current) return;

    // Consume navigation state so it does not re-trigger
    routerNavigate(location.pathname, { replace: true, state: null });

    const cy = cyRef.current;
    const node = cy.getElementById(focusEntity.id);

    if (node && node.length > 0) {
      setSelectedNodeId(focusEntity.id);
      setSelectedNodeData(node.data());
      setNotice(null);
      cy.animate({
        center: { eles: node },
        zoom: Math.max(cy.zoom(), 1.5),
        duration: 500,
      });
    } else {
      setNotice(
        `"${focusEntity.label ?? focusEntity.id}" was found by search, but it is not present in the current graph.`
      );
    }
  }, [location.state, data, location.pathname, routerNavigate]);

  /* ── Cross-entity navigation from details panel ── */
  function handleOpenEntity(entityId) {
    const cy = cyRef.current;
    if (!cy || !entityId) return;
    const node = cy.getElementById(entityId);
    if (!node || node.length === 0) {
      setNotice(`"${entityId}" is not present in the current graph.`);
      return;
    }
    setSelectedNodeId(entityId);
    setSelectedNodeData(node.data());
    setNotice(null);
    cy.animate({
      center: { eles: node },
      zoom: Math.max(cy.zoom(), 1.5),
      duration: 400,
    });
  }

  /* ── Toolbar actions ── */
  function handleLayoutChange(newLayout) {
    setLayout(newLayout); // GraphView re-runs layout when this prop changes
  }

  function handleFit() {
    cyRef.current?.fit(undefined, 48);
  }

  function handleReset() {
    cyRef.current?.zoom(1);
    cyRef.current?.center();
  }

  function handleCenter() {
    if (!cyRef.current || !selectedNodeId) return;
    const node = cyRef.current.getElementById(selectedNodeId);
    if (node?.length) {
      cyRef.current.animate({ center: { eles: node }, zoom: 2, duration: 400 });
    }
  }

  function handleRefresh() {
    setSelectedNodeId(null);
    setSelectedNodeData(null);
    fetchGraph();
  }

  function handleClearSelection() {
    setSelectedNodeId(null);
    setSelectedNodeData(null);
  }

  function handleFullscreen() {
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  function handleFocusNode(nodeId) {
    if (!cyRef.current || !nodeId) return;
    const node = cyRef.current.getElementById(nodeId);
    if (node?.length) {
      cyRef.current.animate({ center: { eles: node }, zoom: 2, duration: 400 });
    }
  }

  function handleShowNeighbors(nodeId) {
    if (!cyRef.current || !nodeId) return;
    const node = cyRef.current.getElementById(nodeId);
    if (!node?.length) return;
    const neighborhood = node.closedNeighborhood();
    cyRef.current.elements().not(neighborhood).addClass("dimmed");
    neighborhood.removeClass("dimmed");
  }

  return (
    <div className="graph-page">
      <GraphControls
        onFit={handleFit}
        onReset={handleReset}
        onCenter={handleCenter}
        onRefresh={handleRefresh}
        onLayoutChange={handleLayoutChange}
        onClearSelection={handleClearSelection}
        onFullscreen={handleFullscreen}
        currentLayout={layout}
        hasSelection={!!selectedNodeId}
        loading={loading}
      />

      {/* Focus-entity / absence notice */}
      {notice && (
        <div className="graph-notice" role="status">
          <span>{notice}</span>
          <button
            className="graph-notice__close"
            onClick={() => setNotice(null)}
            aria-label="Dismiss notice"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Graph + Details panel */}
      <div className="graph-workspace">
        <div className="graph-main">
          <GraphView
            data={data}
            loading={loading}
            error={error}
            onRetry={fetchGraph}
            layout={layout}
            onNodeSelect={handleNodeSelect}
            onClearSelect={handleClearSelect}
            selectedNodeId={selectedNodeId}
            onCyReady={(cy) => { cyRef.current = cy; }}
          />
        </div>

        <div className="graph-details">
          <NodeDetails
            nodeId={selectedNodeId}
            nodeData={selectedNodeData}
            onFocusNode={handleFocusNode}
            onShowNeighbors={handleShowNeighbors}
            onOpenEntity={handleOpenEntity}
          />
        </div>
      </div>
    </div>
  );
}
