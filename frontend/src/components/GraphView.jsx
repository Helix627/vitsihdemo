import { useEffect, useMemo, useRef } from "react";
import CytoscapeComponent from "react-cytoscapejs";

const GraphView = ({
  graph,
  layout,
  onNodeClick,
  onCyReady,
  selectedNodeId,
  focusRequest,
}) => {
  const cyRef = useRef(null);

  const elements = useMemo(
    () => [...graph.nodes, ...graph.edges],
    [graph.nodes, graph.edges],
  );

  const style = useMemo(
    () => [
      {
        selector: "node",
        style: {
          width: 40,
          height: 40,
          "background-color": "data(color)",
          "border-color": "#2E7D32",
          "border-width": 2,
          shape: "data(shape)",
          label: "data(label)",
          color: "#1f2937",
          "font-size": 10,
          "text-wrap": "wrap",
          "text-max-width": 80,
          "text-valign": "bottom",
          "text-margin-y": 6,
          "text-outline-width": 0,
        },
      },
      {
        selector: "node[type = 'pgp']",
        style: {
          width: 30,
          height: 30,
          "border-color": "#E65100",
        },
      },
      {
        selector: "edge",
        style: {
          width: 2,
          "line-color": "#BDBDBD",
          "curve-style": "bezier",
          "target-arrow-shape": "none",
          opacity: 0.85,
        },
      },
      {
        selector: ".faded",
        style: {
          opacity: 0.15,
        },
      },
      {
        selector: ".selected",
        style: {
          "background-color": "#2196F3",
          "border-color": "#0D47A1",
          "border-width": 4,
        },
      },
      {
        selector: ".neighbor",
        style: {
          opacity: 1,
          "line-color": "#90A4AE",
          "background-color": "#66BB6A",
        },
      },
      {
        selector: ".highlight-edge",
        style: {
          width: 3,
          "line-color": "#607D8B",
          opacity: 1,
        },
      },
      {
        selector: ".flash",
        style: {
          "overlay-color": "#2196F3",
          "overlay-padding": 12,
          "overlay-opacity": 0.2,
        },
      },
    ],
    [],
  );

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) {
      return;
    }

    cy.layout({ name: layout, animate: true, fit: true, padding: 50 }).run();
  }, [layout, elements]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) {
      return;
    }

    cy.nodes().removeClass("selected");
    if (!selectedNodeId) {
      return;
    }

    const selected = cy.getElementById(selectedNodeId);
    if (selected.length) {
      selected.addClass("selected");
    }
  }, [selectedNodeId]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !focusRequest?.id) {
      return;
    }

    const node = cy.getElementById(focusRequest.id);
    if (!node.length) {
      return;
    }

    cy.animate(
      {
        center: { eles: node },
        zoom: 1.4,
      },
      {
        duration: 450,
      },
    );

    node.addClass("flash selected");
    setTimeout(() => node.removeClass("flash"), 650);
  }, [focusRequest]);

  const handleCyInit = (cy) => {
    cyRef.current = cy;
    onCyReady(cy);

    cy.on("mouseover", "node", (event) => {
      const node = event.target;

      cy.elements().addClass("faded");
      node.removeClass("faded");
      node.connectedEdges().removeClass("faded").addClass("highlight-edge");
      node.neighborhood().removeClass("faded").addClass("neighbor");
    });

    cy.on("mouseout", "node", () => {
      cy.elements().removeClass("faded neighbor highlight-edge");
    });

    cy.on("tap", "node", (event) => {
      const node = event.target;
      onNodeClick(node.data());
    });

    cy.on("dbltap", "node", (event) => {
      const node = event.target;
      const neighborhood = node.closedNeighborhood();
      cy.elements().addClass("faded");
      neighborhood.removeClass("faded");
      neighborhood.connectedEdges().addClass("highlight-edge");
      cy.animate({ fit: { eles: neighborhood, padding: 40 } }, { duration: 300 });
    });
  };

  return (
    <div className="graph-shell">
      <CytoscapeComponent
        className="graph-canvas"
        elements={elements}
        stylesheet={style}
        cy={handleCyInit}
        wheelSensitivity={0.15}
        minZoom={0.3}
        maxZoom={2.5}
        userZoomingEnabled
        userPanningEnabled
        boxSelectionEnabled
      />
    </div>
  );
};

export default GraphView;
