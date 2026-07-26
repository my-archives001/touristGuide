import React, { useEffect, useState } from "react";
import DistrictSelector from "./DistrictSelector";
import PlanRoute from "./PlanRoute";
import PathFinder from "./PathFinder";
import MapView from "./MapView";
import GraphView from "./GraphView";
import { routeService } from "../services/apiService";

export default function RoutePage() {
  const [districts, setDistricts] = useState([]);
  const [district, setDistrict] = useState(null);
  const [districtData, setDistrictData] = useState(null);
  const [planResult, setPlanResult] = useState(null);
  const [pathResult, setPathResult] = useState(null);
  const [viewMode, setViewMode] = useState("map");
  const [startPlace, setStartPlace] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch all districts
  useEffect(() => {
    routeService.getDistricts()
      .then(setDistricts)
      .catch((err) => console.error("Error loading districts:", err));
  }, []);

  // Fetch district data when selected
  useEffect(() => {
    if (!district) return;
    setPlanResult(null);
    setPathResult(null);
    setStartPlace("");

    routeService.getDistrictData(district)
      .then(setDistrictData)
      .catch((err) => console.error("Error fetching district data:", err));
  }, [district]);

  const handlePlanRoute = () => {
    if (!district || !startPlace) return;
    setLoading(true);
    routeService.planRoute(district, startPlace)
      .then((plan) => setPlanResult(plan))
      .catch((err) => console.error("Error planning route:", err))
      .finally(() => setLoading(false));
  };

  return (
    <div className="app-container">
      <div className="left-column">
        <h2>Heritage Route Planner</h2>

        <div className="card selector">
          <DistrictSelector
            districts={districts}
            value={district}
            onChange={setDistrict}
          />
        </div>

        {districtData && (
          <div className="card">
            <div className="selector">
              <label>Start </label>
              <select
                value={startPlace}
                onChange={(e) => setStartPlace(e.target.value)}
              >
                <option value="">Select a Start Place</option>
                {Object.keys(districtData.coords).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <button className='btn'
              disabled={!startPlace || loading}
              onClick={handlePlanRoute}
              style={{ marginTop: "8px" }}
            >
              {loading ? 'Planning...' : 'Plan Route'}
            </button>
          </div>
        )}

        {planResult && (
          <>
            <div className="card">
              <PlanRoute planResult={planResult} />
            </div>

            <div className="card">
              <PathFinder
                district={district}
                nodes={Object.keys(districtData.coords || {})}
                setPathResult={setPathResult}
              />
              {pathResult && (
                <div className="card path-result">
                  <h3>Path Result</h3>
                  <p>
                    <strong>Distance:</strong> {pathResult.total_distance_km} km <br />
                    <strong>Estimated Time:</strong>{" "}
                    {pathResult.estimated_time_minutes} mins <br />
                    <strong>Path:</strong>{" "}
                    {pathResult.path?.join(" → ") || "No path found"}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="right-column">
        {district && (
          <>
            <div className="view-toggle">
              <button
                className={viewMode === "map" ? "active" : ""}
                onClick={() => setViewMode("map")}
              >
                🗺️ Map View
              </button>
              <button
                className={viewMode === "graph" ? "active" : ""}
                onClick={() => setViewMode("graph")}
              >
                🧩 Graph View
              </button>
            </div>

            <div className="visual-container">
              {viewMode === "map" ? (
                <MapView
                  district={district}
                  districtData={districtData}
                  planResult={planResult}
                  pathResult={pathResult}
                />
              ) : (
                <GraphView
                  districtData={districtData}
                  planResult={planResult}
                  pathResult={pathResult}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}