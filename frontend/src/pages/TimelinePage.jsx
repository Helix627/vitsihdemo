/**
 * TRINETRA — Timeline (/timeline)
 *
 * The current backend contract exposes no timestamped events
 * (/stats, /graph, /vendor, /pgp, /search contain no date fields),
 * so this page renders the explicit empty state. The Timeline
 * component will populate automatically if the backend adds
 * timestamped data — no artificial dates are ever generated.
 */

import Timeline from "../components/Timeline";

export default function TimelinePage() {
  return (
    <div className="page-container">
      <div className="panel">
        <div className="panel__header">
          <span className="panel__title">Investigation Timeline</span>
          <span className="badge badge--neutral">No data source available</span>
        </div>
        <div className="panel__body">
          <Timeline events={null} />
        </div>
      </div>
    </div>
  );
}
