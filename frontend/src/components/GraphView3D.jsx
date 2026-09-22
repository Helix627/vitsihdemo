import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import ForceGraph3D from "react-force-graph-3d";
import * as THREE from "three";
import SpriteText from "three-spritetext";

// Shared geometry to avoid allocating hundreds of geometries in GPU memory
const SHARED_SPHERE_GEO = new THREE.SphereGeometry(1, 16, 16);

const NODE_COLORS = {
  vendor: "#10B981",
  alias: "#059669",
  username: "#8B5CF6",
  email: "#0284C7",
  bitcoin: "#F59E0B",
  monero: "#EA580C",
  pgp: "#F97316",
  telegram: "#06B6D4",
  discord: "#6366F1",
  forum_handle: "#64748B",
  onion: "#D946EF",
  origin_ip: "#EF4444",
  marketplace: "#EC4899",
  listings: "#64748B",
  product: "#3B82F6",
  category: "#14B8A6",
};

const EDGE_COLORS = {
  SAME_AS: "#10B981",
  SUGGESTION: "#F59E0B",
  PENDING: "#F59E0B",
  LIKELY_SAME_AS: "#EC4899",
  probabilistic_similarity: "#EC4899",
  RESOLVES_TO_ORIGIN: "#EF4444",
  ATTRIBUTION: "#EF4444",
  HOSTED_ON: "#D946EF",
  INFRASTRUCTURE: "#D946EF",
  HAS_EMAIL: "#0284C7",
  HAS_WALLET: "#F59E0B",
  HAS_BITCOIN: "#F59E0B",
  HAS_MONERO: "#EA580C",
  HAS_PGP: "#F97316",
  USES: "#8B5CF6",
};

const NODE_RADIUS = {
  marketplace: 13,
  vendor: 8.5,
  onion: 7,
  origin_ip: 7.5,
  alias: 5.5,
  username: 5.5,
  email: 5,
  bitcoin: 5,
  monero: 5,
  pgp: 5,
  default: 4.5,
};

const GraphView3D = ({
  graph,
  confidenceThreshold = 0.0,
  onNodeClick,
  selectedNodeId,
  focusRequest,
  theme = "dark",
  onFgReady,
}) => {
  const containerRef = useRef(null);
  const fgRef = useRef(null);
  const hoveredNodeRef = useRef(null);

  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [showLabels, setShowLabels] = useState(true);
  const [particleSpeed, setParticleSpeed] = useState(1);

  const isDark = theme === "dark";

  // Notify parent of 3D force graph instance if callback provided
  useEffect(() => {
    if (fgRef.current && onFgReady) {
      onFgReady(fgRef.current);
    }
  }, [onFgReady]);

  // Observe container dimensions for responsive fitting
  useEffect(() => {
    if (!containerRef.current) return;
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth || 800,
          height: containerRef.current.clientHeight || 600,
        });
      }
    };

    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Transform graph data from Cytoscape format into 3D Force Graph format
  const graphData = useMemo(() => {
    const rawNodes = graph.nodes || [];
    const rawEdges = graph.edges || [];

    const nodes = rawNodes.map((n) => {
      const data = n.data || {};
      const type = data.type || "unknown";
      const color = NODE_COLORS[type] || data.color || "#64748B";
      const radius = NODE_RADIUS[type] || NODE_RADIUS.default;

      return {
        ...data,
        id: data.id,
        label: data.label || data.id,
        type,
        color,
        radius,
      };
    });

    const links = rawEdges
      .filter((e) => {
        const data = e.data || {};
        const weight = parseFloat(data.confidence ?? data.weight ?? 1.0);
        return weight >= confidenceThreshold;
      })
      .map((e) => {
        const data = e.data || {};
        const rel = data.relation || data.type || "LINKED";
        const color = EDGE_COLORS[rel] || (isDark ? "#475569" : "#94a3b8");
        const confidence = parseFloat(data.confidence ?? data.weight ?? 1.0);

        return {
          ...data,
          source: data.source,
          target: data.target,
          relation: rel,
          color,
          confidence,
        };
      });

    return { nodes, links };
  }, [graph, confidenceThreshold, isDark]);

  // Set of node IDs that should be highlighted due to search or selection
  const highlightedNodeIds = useMemo(() => {
    const set = new Set();
    if (selectedNodeId) set.add(selectedNodeId);

    if (focusRequest) {
      if (focusRequest.id) set.add(focusRequest.id);
      if (Array.isArray(focusRequest.node_ids)) {
        focusRequest.node_ids.forEach((id) => set.add(id));
      }
      if (Array.isArray(focusRequest.vendor_ids)) {
        graphData.nodes.forEach((n) => {
          if (focusRequest.vendor_ids.includes(n.vendor_id)) set.add(n.id);
        });
      }
      const searchName = (focusRequest.username || focusRequest.label || "").trim().toLowerCase();
      if (searchName) {
        graphData.nodes.forEach((n) => {
          const u = (n.username || "").toLowerCase();
          const l = (n.label || "").toLowerCase();
          if (u === searchName || l === searchName) set.add(n.id);
        });
      }
    }
    return set;
  }, [selectedNodeId, focusRequest, graphData.nodes]);

  // High-performance in-place visual update for selection and focus (0 allocations!)
  useEffect(() => {
    graphData.nodes.forEach((node) => {
      const isSelected = highlightedNodeIds.has(node.id);
      const baseR = node.radius || 4.5;
      const targetR = isSelected ? baseR * 1.35 : baseR;

      if (node.__sphereMesh) {
        node.__sphereMesh.scale.set(targetR, targetR, targetR);
        if (node.__sphereMesh.material) {
          node.__sphereMesh.material.opacity = isSelected ? 1.0 : 0.9;
        }
      }
      if (node.__ringMesh) {
        node.__ringMesh.visible = isSelected;
        if (isSelected) {
          node.__ringMesh.material.color.setHex(0xa855f7);
        }
      }
      if (node.__sprite) {
        node.__sprite.textHeight = isSelected ? 4.2 : 3.0;
        node.__sprite.borderColor = isSelected ? "#a855f7" : node.color;
        node.__sprite.borderWidth = isSelected ? 1.4 : 0.8;
      }
    });
  }, [highlightedNodeIds, graphData.nodes]);

  // Handle label visibility toggle in-place without rebuilding objects
  useEffect(() => {
    graphData.nodes.forEach((node) => {
      if (node.__sprite) {
        node.__sprite.visible = showLabels;
      }
    });
  }, [showLabels, graphData.nodes]);

  // Handle Search / Focus Request Camera Flight
  useEffect(() => {
    if (!focusRequest || !fgRef.current || !graphData.nodes.length) return;

    let targetNode = null;
    if (focusRequest.id) {
      targetNode = graphData.nodes.find((n) => n.id === focusRequest.id);
    }
    if (!targetNode && Array.isArray(focusRequest.node_ids) && focusRequest.node_ids.length > 0) {
      targetNode = graphData.nodes.find((n) => focusRequest.node_ids.includes(n.id));
    }
    if (!targetNode && focusRequest.label) {
      const q = focusRequest.label.toLowerCase();
      targetNode = graphData.nodes.find(
        (n) => (n.label || "").toLowerCase() === q || (n.username || "").toLowerCase() === q
      );
    }

    if (targetNode && typeof targetNode.x === "number" && !isNaN(targetNode.x)) {
      const distance = 110;
      const hyp = Math.hypot(targetNode.x, targetNode.y, targetNode.z) || 1;
      const distRatio = 1 + distance / hyp;

      fgRef.current.cameraPosition(
        {
          x: targetNode.x * distRatio,
          y: targetNode.y * distRatio,
          z: targetNode.z * distRatio + 35,
        },
        { x: targetNode.x, y: targetNode.y, z: targetNode.z },
        1000
      );
    }
  }, [focusRequest, graphData.nodes]);

  // Stable node 3D Object Generator: Cached on node, shared geometry, zero allocations on hover/state
  const nodeThreeObject = useCallback(
    (node) => {
      if (node.__threeGroup) {
        return node.__threeGroup;
      }

      const baseRadius = node.radius || 4.5;
      const group = new THREE.Group();

      // Main Sphere using shared unit sphere scaled to radius
      const material = new THREE.MeshLambertMaterial({
        color: node.color,
        transparent: true,
        opacity: 0.92,
      });
      const sphere = new THREE.Mesh(SHARED_SPHERE_GEO, material);
      sphere.scale.set(baseRadius, baseRadius, baseRadius);
      group.add(sphere);
      node.__sphereMesh = sphere;

      // Orbital glow ring for focus/selected states
      const ringGeo = new THREE.RingGeometry(baseRadius + 1.8, baseRadius + 3.6, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xa855f7,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.visible = false;
      group.add(ring);
      node.__ringMesh = ring;

      // Sprite Label with custom styling
      const sprite = new SpriteText(node.label || node.id);
      sprite.color = isDark ? "#f8fafc" : "#0f172a";
      sprite.textHeight = 3.0;
      sprite.fontFace = "Space Grotesk, sans-serif";
      sprite.fontWeight = "600";
      sprite.backgroundColor = isDark ? "rgba(15, 23, 42, 0.85)" : "rgba(255, 255, 255, 0.92)";
      sprite.borderColor = node.color;
      sprite.borderWidth = 0.8;
      sprite.borderRadius = 4;
      sprite.padding = [3, 1.5];
      sprite.position.set(0, -(baseRadius + 3.5), 0);
      sprite.visible = showLabels;
      group.add(sprite);
      node.__sprite = sprite;

      node.__threeGroup = group;
      return group;
    },
    [isDark, showLabels]
  );

  // In-place direct Three.js Hover (no React state re-render, 60fps locked!)
  const handleNodeHover = useCallback(
    (node, prevNode) => {
      hoveredNodeRef.current = node;

      if (prevNode && prevNode.__sphereMesh) {
        const isSelected = highlightedNodeIds.has(prevNode.id);
        const r = isSelected ? (prevNode.radius || 4.5) * 1.35 : (prevNode.radius || 4.5);
        prevNode.__sphereMesh.scale.set(r, r, r);
        if (prevNode.__ringMesh) {
          prevNode.__ringMesh.visible = isSelected;
          if (isSelected) prevNode.__ringMesh.material.color.setHex(0xa855f7);
        }
      }

      if (node && node.__sphereMesh) {
        const r = (node.radius || 4.5) * 1.35;
        node.__sphereMesh.scale.set(r, r, r);
        if (node.__ringMesh) {
          node.__ringMesh.material.color.setHex(0x38bdf8);
          node.__ringMesh.visible = true;
        }
      }
    },
    [highlightedNodeIds]
  );

  // Click handler
  const handleNodeClick = useCallback(
    (node) => {
      if (onNodeClick) {
        onNodeClick(node);
      }

      if (fgRef.current && typeof node.x === "number") {
        const distance = 85;
        const hyp = Math.hypot(node.x, node.y, node.z) || 1;
        const distRatio = 1 + distance / hyp;

        fgRef.current.cameraPosition(
          { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
          { x: node.x, y: node.y, z: node.z },
          800
        );
      }
    },
    [onNodeClick]
  );

  // Fit to screen
  const handleFit = useCallback(() => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(800, 45);
    }
  }, []);

  // Reset Camera Position
  const handleResetCamera = useCallback(() => {
    if (fgRef.current) {
      fgRef.current.cameraPosition({ x: 0, y: 0, z: 260 }, { x: 0, y: 0, z: 0 }, 800);
    }
  }, []);

  // Background click to clear selection
  const handleBackgroundClick = useCallback(() => {
    if (onNodeClick) {
      onNodeClick(null);
    }
  }, [onNodeClick]);

  return (
    <div className="graph-shell-3d" ref={containerRef} style={{ position: "relative", width: "100%", height: "100%" }}>
      <ForceGraph3D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        backgroundColor={isDark ? "#090d16" : "#f1f5f9"}
        showNavInfo={false}
        // Nodes
        nodeThreeObject={nodeThreeObject}
        nodeThreeObjectExtend={false}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        // Links
        linkColor={(link) => link.color}
        linkWidth={(link) => (link.relation === "SAME_AS" ? 2.2 : 1.2)}
        linkOpacity={0.6}
        // High-performance particle configuration: only on high-value attribution links
        linkDirectionalParticles={(link) => {
          if (particleSpeed === 0) return 0;
          if (link.relation === "SAME_AS" || link.relation === "RESOLVES_TO_ORIGIN") return 2;
          if (link.confidence >= 0.85) return 1;
          return 0;
        }}
        linkDirectionalParticleSpeed={() => 0.005 * particleSpeed}
        linkDirectionalParticleWidth={(link) => (link.relation === "SAME_AS" ? 2.0 : 1.4)}
        linkDirectionalParticleColor={(link) => link.color}
        linkDirectionalArrowLength={3.0}
        linkDirectionalArrowRelPos={1}
        linkDirectionalArrowColor={(link) => link.color}
        // Physics and simulation performance controls
        onBackgroundClick={handleBackgroundClick}
        enableNodeDrag={true}
        warmupTicks={40}
        cooldownTicks={120}
        cooldownTime={3500}
        d3AlphaDecay={0.03}
        d3VelocityDecay={0.35}
      />

      {/* 3D Cosmic HUD Controls */}
      <div className="hud-3d-overlay">
        <div className="hud-3d-row">
          <button
            type="button"
            className={`btn-hud-3d ${showLabels ? "active" : ""}`}
            onClick={() => setShowLabels((prev) => !prev)}
            title="Toggle 3D Floating Entity Labels"
          >
            🏷️ Labels {showLabels ? "On" : "Off"}
          </button>

          <button
            type="button"
            className="btn-hud-3d"
            onClick={handleFit}
            title="Fit All Nodes in Field of View"
          >
            ⤢ Fit View
          </button>

          <button
            type="button"
            className="btn-hud-3d"
            onClick={handleResetCamera}
            title="Reset Camera Orientation to Center"
          >
            🎯 Reset Camera
          </button>

          <button
            type="button"
            className={`btn-hud-3d ${particleSpeed > 0 ? "active" : ""}`}
            onClick={() => setParticleSpeed((prev) => (prev === 0 ? 1 : prev === 1 ? 2 : 0))}
            title="Cycle Flow Particles Speed (Off / Normal / Fast)"
          >
            ⚡ Flow: {particleSpeed === 0 ? "Off" : particleSpeed === 1 ? "1x" : "2x"}
          </button>
        </div>

        <div className="hud-3d-stats-badge">
          <span>🪐 3D Cosmos:</span>
          <strong>{graphData.nodes.length}</strong> nodes &bull; <strong>{graphData.links.length}</strong> links
        </div>
      </div>
    </div>
  );
};

export default GraphView3D;
