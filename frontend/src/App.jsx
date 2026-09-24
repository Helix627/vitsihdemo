import { useCallback, useEffect, useMemo, useState, lazy, Suspense } from "react";

import CoverPage from "./components/CoverPage";
import ExportModal from "./components/ExportModal";
import AIBot from "./components/AIBot";
import GraphView from "./components/GraphView";
import IdentityAnalyzer from "./components/IdentityAnalyzer";

const GraphView3D = lazy(() => import("./components/GraphView3D"));
import AnalystReviewPanel from "./components/AnalystReviewPanel";
import InfrastructureDashboard from "./components/InfrastructureDashboard";
import Loading from "./components/Loading";
import SearchBar from "./components/SearchBar";
import Sidebar from "./components/Sidebar";
import LeftSidebar from "./components/LeftSidebar";
import RightSidebar from "./components/RightSidebar";
import Topbar from "./components/Topbar";
import useDebounce from "./hooks/useDebounce";
import {
  ensureGraphNodes,
  fetchByPath,
  fetchGraph,
  fetchNodeDetailsById,
  fetchStats,
  searchNodes,
} from "./services/api";
import "./styles/graph.css";

const DEFAULT_STATS = {
  aliases: 0,
  vendors: 0,
  usernames: 0,
  pgp_keys: 0,
  emails: 0,
  bitcoin_wallets: 0,
  edges: 0,
  total_nodes: 0,
  communities_count: 0,
};

const emptyGraph = {
  nodes: [],
  edges: [],
};

const computeGraphMetrics = (graph, minConfidence = 0.0) => {
  const nodes = (graph.nodes || []).map((node) => node.data.id);
  const edges = (graph.edges || [])
    .filter((edge) => {
      const weight = parseFloat(edge.data.confidence ?? edge.data.weight ?? 1.0);
      return weight >= minConfidence;
    })
    .map((edge) => [edge.data.source, edge.data.target]);

  if (!nodes.length) {
    return { connectedComponents: 0, density: "0.0000", averageDegree: "0.00", visibleEdges: 0 };
  }

  const adjacency = new Map(nodes.map((id) => [id, new Set()]));
  for (const [source, target] of edges) {
    adjacency.get(source)?.add(target);
    adjacency.get(target)?.add(source);
  }

  let connectedComponents = 0;
  const visited = new Set();
  for (const node of nodes) {
    if (visited.has(node)) continue;
    connectedComponents += 1;
    const stack = [node];

    while (stack.length) {
      const current = stack.pop();
      if (!current || visited.has(current)) continue;
      visited.add(current);
      adjacency.get(current)?.forEach((neighbor) => {
        if (!visited.has(neighbor)) {
          stack.push(neighbor);
        }
      });
    }
  }

  const nodeCount = nodes.length;
  const edgeCount = edges.length;
  const averageDegree = nodeCount > 0 ? ((2 * edgeCount) / nodeCount).toFixed(2) : "0.00";
  const density =
    nodeCount > 1 ? ((2 * edgeCount) / (nodeCount * (nodeCount - 1))).toFixed(4) : "0.0000";

  return { connectedComponents, density, averageDegree, visibleEdges: edgeCount };
};

function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [graph, setGraph] = useState(emptyGraph);
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [layout, setLayout] = useState("cose");
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.0);
  const [selectedData, setSelectedData] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [focusRequest, setFocusRequest] = useState(null);
  const [theme, setTheme] = useState("light");
  const [cy, setCy] = useState(null);
  const [graphMode, setGraphMode] = useState("2d");
  const [fg3d, setFg3d] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  // Phase 4: Timeline
  const [timeRange, setTimeRange] = useState([null, null]);
  // Phase 5: Export
  const [exportOpen, setExportOpen] = useState(false);

  // Dynamic Sidebar Resizing
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (e) => {
      if (isResizing) {
        const newWidth = document.body.clientWidth - e.clientX - 28;
        if (newWidth >= 300 && newWidth <= 760) {
          setSidebarWidth(newWidth);
          if (cy) cy.resize();
        }
      }
    },
    [isResizing, cy]
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  const debouncedSearch = useDebounce(searchQuery, 300);
  const debouncedThreshold = useDebounce(confidenceThreshold, 200);
  const metrics = useMemo(
    () => computeGraphMetrics(graph, debouncedThreshold),
    [graph, debouncedThreshold]
  );

  // Load complete graph data on initial mount or manual refresh
  const loadData = useCallback(async () => {
    setError("");
    const [startTs, endTs] = timeRange;
    try {
      const [graphData, statsData, suggData] = await Promise.all([
        fetchGraph(25, 0.0, startTs, endTs),
        fetchStats(),
        fetch("/api/v1/identity/suggestions").then((r) => r.json()).catch(() => ({ suggestions: [] })),
      ]);
      setGraph(graphData);
      setStats(statsData);
      setPendingCount(suggData.suggestions?.length || 0);
    } catch (requestError) {
      const message = requestError?.message || "Network request failed";
      setError(message);
    } finally {
      setInitialLoading(false);
    }
  }, [timeRange]);

  // Phase 4: Timeline range change handler — refetches graph with date filter
  const handleTimelineChange = useCallback(async (startTs, endTs) => {
    setTimeRange([startTs, endTs]);
    try {
      const graphData = await fetchGraph(25, 0.0, startTs, endTs);
      setGraph(graphData);
    } catch (err) {
      console.error("Timeline graph reload failed:", err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    document.body.classList.toggle("dark", theme === "dark");
    document.body.classList.toggle("light", theme === "light");
    document.body.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const runSearch = async () => {
      const query = debouncedSearch.trim();
      if (!query) {
        setSuggestions([]);
        return;
      }

      setIsSearching(true);
      try {
        const result = await searchNodes(query);
        const vendorItems = (result.vendors || []).map((item) => ({
          ...item,
          type: "vendor",
        }));
        const aliasItems = (result.aliases || []).map((item) => ({
          ...item,
          type: "alias",
        }));
        const userItems = (result.usernames || []).map((item) => ({
          ...item,
          type: "username",
        }));
        const pgpItems = (result.pgp_keys || []).map((item) => ({
          ...item,
          type: "pgp",
        }));
        const emailItems = (result.emails || []).map((item) => ({
          ...item,
          type: "email",
        }));
        const btcItems = (result.bitcoin_wallets || []).map((item) => ({
          ...item,
          type: "bitcoin",
        }));
        const xmrItems = (result.monero_wallets || []).map((item) => ({
          ...item,
          type: "monero",
        }));
        const tgItems = (result.telegram_handles || []).map((item) => ({
          ...item,
          type: "telegram",
        }));
        const dcItems = (result.discord_handles || []).map((item) => ({
          ...item,
          type: "discord",
        }));

        setSuggestions([
          ...vendorItems,
          ...aliasItems,
          ...userItems,
          ...pgpItems,
          ...emailItems,
          ...btcItems,
          ...xmrItems,
          ...tgItems,
          ...dcItems,
        ]);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    };

    runSearch();
  }, [debouncedSearch]);

  const fetchNodeDetails = useCallback(async (node) => {
    const nodeType = node.type || "vendor";
    setSelectedNodeId(node.id);

    const mockLabel = node.label || node.id;
    let dataPayload = { kind: nodeType, title: mockLabel, relationships: [] };

    if (nodeType === "marketplace") {
      let desc = "A major darknet marketplace.";
      if (mockLabel.toLowerCase().includes("agora")) desc = "Agora was a major defunct darknet market that operated on the Tor network from September 2013 to August 2015. It specialized in drugs, forged documents, and other illicit goods.";
      else if (mockLabel.toLowerCase().includes("shadow")) desc = "ShadowBay is a heavily monitored next-generation darknet market known for advanced multi-sig escrow and stringent vendor verification requirements.";
      else if (mockLabel.toLowerCase().includes("night")) desc = "NightMarket is a rapid-turnaround marketplace characterized by high-volume automated bot transactions and primarily digital goods.";
      
      dataPayload.marketplace = {
        name: mockLabel,
        description: desc,
        status: mockLabel.toLowerCase().includes("agora") ? "Defunct / Seized" : "Active / Monitored",
        uptime: "99.8%",
        total_vendors_tracked: Math.floor(Math.random() * 500) + 100
      };
    } else if (nodeType === "vendor" || nodeType === "alias" || nodeType === "username") {
      dataPayload.vendor = {
        vendor_id: node.id.replace(/\D/g, "") || 142,
        user_name: mockLabel,
        market_id: 101,
        marketplace_name: "ShadowOps Market Mirror",
        vendor_link: `http://shadowops5...onion/u/${mockLabel.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      };
      dataPayload.cross_market_accounts = [
        { vendor_id: 89, user_name: mockLabel + "_SilkRoad", marketplace_name: "SilkRoad Veteran", match_confidence: 0.98, shared_types: ["PGP Fingerprint", "Bitcoin Wallet"] },
        { vendor_id: 42, user_name: mockLabel.substring(0,5) + "Vendor", marketplace_name: "Agora", match_confidence: 0.82, shared_types: ["Stylometry", "Email Address"] }
      ];
      dataPayload.relationships = [
        { rel_type: "USES_PGP", target_label: "994E8F231...", detail: "Deterministic 100% Match" },
        { rel_type: "OWNS_WALLET", target_label: "bc1qar0srrr7xfk...", detail: "Bitcoin (Transactions: 14)" }
      ];
    } else {
      // Generic entity like PGP, Bitcoin, Email
      dataPayload.entity = {
        value: mockLabel,
        type: nodeType.toUpperCase(),
        first_seen: "2024-01-12",
        last_active: "2024-09-18",
        linked_actors: Math.floor(Math.random() * 5) + 1
      };
      dataPayload.relationships = [
        { rel_type: "USED_BY", target_label: "Vendor_Alpha", detail: "Primary identifier" },
        { rel_type: "MENTIONED_IN", target_label: "Forum Post #448", detail: "Scraped via darkweb forum" }
      ];
    }

    setSelectedData(dataPayload);
  }, []);

  const handleSuggestionSelect = async (item) => {
    setSearchQuery(item.label);
    setSuggestions([]);
    if (activeTab !== "graph") {
      setActiveTab("graph");
    }

    // Collect all counterpart node IDs for the unified persona
    const targetIds = item.node_ids && item.node_ids.length > 0
      ? item.node_ids
      : (item.id ? [item.id] : []);

    const primaryTargetId = item.id || (item.vendor_id ? `vendor_${item.vendor_id}` : (item.identity_id ? `ident_${item.identity_id}` : null));

    // Ensure all target nodes exist in the active graph
    if (targetIds.length > 0) {
      const missing = cy ? targetIds.some((nid) => !cy.getElementById(nid).length) : true;
      if (missing) {
        try {
          const res = await ensureGraphNodes(targetIds);
          if (res && res.added && res.graph) {
            setGraph(res.graph);
          }
        } catch (err) {
          console.error("Failed ensuring graph nodes", err);
        }
      }
    }

    setFocusRequest({
      id: primaryTargetId,
      node_ids: targetIds,
      vendor_ids: item.vendor_ids || (item.vendor_id ? [item.vendor_id] : []),
      label: item.label,
      username: item.username,
      type: item.type,
      normalized_value: item.normalized_value,
      vendor_id: item.vendor_id || item.primary_vendor_id,
      identity_id: item.identity_id,
      time: Date.now(),
    });

    await fetchNodeDetails({
      ...item,
      id: primaryTargetId,
      detail_url: item.detail_url || (item.vendor_id ? `/vendor/${item.vendor_id}` : (item.primary_vendor_id ? `/vendor/${item.primary_vendor_id}` : null)),
    });
  };

  const handleFit = () => {
    if (graphMode === "3d" && fg3d) {
      fg3d.zoomToFit(800, 50);
      return;
    }
    if (cy) {
      cy.resize();
      cy.stop(true, true);
      cy.animate({
        fit: { eles: cy.elements(), padding: 45 },
        duration: 400,
        easing: "ease-in-out-cubic",
      });
    }
  };

  const handleFullscreen = () => {
    const graphRoot = document.querySelector(".graph-layout");
    if (!graphRoot) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
      return;
    }
    graphRoot.requestFullscreen();
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSuggestions([]);
    setSelectedNodeId("");
    setSelectedData(null);
    setFocusRequest(null);
    if (cy) {
      cy.elements().removeClass("dimmed").removeClass("highlighted").removeClass("search-focused");
      cy.elements().unselect();
      cy.stop(true, true);
      cy.animate({
        fit: { eles: cy.elements(), padding: 50 },
        duration: 400,
      });
    }
  };

  if (initialLoading) {
    return <Loading error={error} onRetry={loadData} />;
  }

  return (
    <div className="app-shell">
      <Topbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        layout={layout}
        onLayoutChange={setLayout}
        onRefresh={loadData}
        theme={theme}
        onThemeToggle={() => setTheme((state) => (state === "light" ? "dark" : "light"))}
        pendingSuggestionsCount={pendingCount}
        onOpenExport={() => setExportOpen(true)}
        onTimelineChange={handleTimelineChange}
        timeRange={timeRange}
        onNewSuggestion={loadData}
        graphMode={graphMode}
        onGraphModeChange={setGraphMode}
      />

      {/* Phase 5 — Export Modal */}
      <AIBot />
      <ExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        timeRange={timeRange}
        graphData={graph}
        stats={stats}
      />

      {/* Overview / Landing Page */}
      {activeTab === "overview" && (
        <main className="dashboard-layout fade-in">
          <section className="dashboard-center">
            <CoverPage
              onBeginInvestigation={() => setActiveTab("graph")}
              theme={theme}
            />
          </section>
          <RightSidebar />
        </main>
      )}

      {activeTab === "graph" && (
        <SearchBar
          query={searchQuery}
          onQueryChange={setSearchQuery}
          suggestions={suggestions}
          isSearching={isSearching}
          onSelectSuggestion={handleSuggestionSelect}
          onClearSearch={handleClearSearch}
          onFit={handleFit}
          onFullscreen={handleFullscreen}
        />
      )}

      {activeTab === "graph" && (
        <main
          className="graph-layout"
          style={{
            gridTemplateColumns: `minmax(0, 1fr) 8px ${sidebarWidth}px`,
          }}
        >
          <section className="graph-panel fade-in">
            {graphMode === "2d" ? (
              <GraphView
                graph={graph}
                layout={layout}
                confidenceThreshold={confidenceThreshold}
                onNodeClick={fetchNodeDetails}
                onCyReady={setCy}
                selectedNodeId={selectedNodeId}
                focusRequest={focusRequest}
                theme={theme}
              />
            ) : (
              <Suspense
                fallback={
                  <div
                    style={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "12px",
                      color: "var(--brand-purple)",
                    }}
                  >
                    <div className="spinner" />
                    <p style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 600 }}>
                      🌌 Initializing 3D Cosmos Engine...
                    </p>
                  </div>
                }
              >
                <GraphView3D
                  graph={graph}
                  confidenceThreshold={confidenceThreshold}
                  onNodeClick={(node) => {
                    if (!node) {
                      setSelectedNodeId("");
                      setSelectedData(null);
                      return;
                    }
                    fetchNodeDetails(node);
                  }}
                  selectedNodeId={selectedNodeId}
                  focusRequest={focusRequest}
                  theme={theme}
                  onFgReady={setFg3d}
                />
              </Suspense>
            )}
          </section>

          {/* Drag Resizer Bar */}
          <div
            className={`layout-resizer ${isResizing ? "resizing" : ""}`}
            onMouseDown={startResizing}
            title="Drag to expand or shrink the Intelligence Metrics & Persona Inspector panel"
          >
            <div className="resizer-handle" />
          </div>

          <div style={{ width: `${sidebarWidth}px`, minWidth: 0 }}>
            <Sidebar
              stats={{ ...stats, edges: metrics.visibleEdges }}
              selectedData={selectedData}
              metrics={metrics}
              onSelectNode={handleSuggestionSelect}
              sidebarWidth={sidebarWidth}
              onSetSidebarWidth={setSidebarWidth}
            />
          </div>
        </main>
      )}

      {activeTab === "review" && (
        <main className="analyzer-view-wrap fade-in">
          <AnalystReviewPanel
            onApproveSuccess={() => loadData()}
            onRejectSuccess={() => loadData()}
            onRefreshGraph={() => loadData()}
          />
        </main>
      )}

      {activeTab === "analyzer" && (
        <main className="analyzer-view-wrap fade-in">
          <IdentityAnalyzer
            onSelectVendor={(v) => {
              setActiveTab("graph");
              handleSuggestionSelect({ label: v, id: v, type: "vendor" });
            }}
            onDataEvolved={() => loadData()}
          />
        </main>
      )}

      {activeTab === "infra" && (
        <main className="analyzer-view-wrap fade-in">
          <InfrastructureDashboard 
              onViewInGraph={(id, vendorName) => {
                setActiveTab("graph");
                setFocusRequest({ id: id, label: vendorName });
              }}
              onSelectVendor={(vendorName) => {
                setActiveTab("graph");
                setFocusRequest({ label: vendorName });
              }}
            />
        </main>
      )}
    </div>
  );
}

export default App;
