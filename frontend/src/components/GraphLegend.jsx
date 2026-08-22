/**
 * TRINETRA — GraphLegend
 * Compact, unobtrusive legend overlaid on the graph.
 */

import { NODE_TYPE_CONFIG } from "../utils/graphUtils";

export default function GraphLegend() {
  return (
    <div className="graph-legend">
      <p className="graph-legend__title">Legend</p>

      <div className="graph-legend__item">
        <div className="graph-legend__symbol">
          <div
            className="graph-legend__dot"
            style={{ background: NODE_TYPE_CONFIG.vendor.background, border: `1.5px solid ${NODE_TYPE_CONFIG.vendor.borderColor}` }}
          />
        </div>
        <span>Vendor</span>
      </div>

      <div className="graph-legend__item">
        <div className="graph-legend__symbol">
          <div
            className="graph-legend__diamond"
            style={{ background: NODE_TYPE_CONFIG.pgp.background, border: `1.5px solid ${NODE_TYPE_CONFIG.pgp.borderColor}` }}
          />
        </div>
        <span>PGP Key</span>
      </div>

      <div className="graph-legend__item">
        <div className="graph-legend__symbol">
          <div className="graph-legend__line" />
        </div>
        <span>Relationship</span>
      </div>

      <div className="graph-legend__item">
        <div className="graph-legend__symbol">
          <div
            className="graph-legend__dot"
            style={{ background: "#e3f2fd", border: "2px solid #1565c0" }}
          />
        </div>
        <span>Selected</span>
      </div>

      <div className="graph-legend__item">
        <div className="graph-legend__symbol">
          <div
            className="graph-legend__dot"
            style={{ background: "#e8eaed", opacity: 0.35 }}
          />
        </div>
        <span>Dimmed</span>
      </div>
    </div>
  );
}
