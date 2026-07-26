import React, { useState } from "react";
import { routeService } from "../services/apiService";

export default function PathFinder({district, nodes, setPathResult}){
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [loading, setLoading] = useState(false);

  const findPath = async () => {
    if(!district || !start || !end) return alert("Select district and both places");
    if(start === end) return alert("Start and end places must be different");
    setLoading(true);
    try {
      const data = await routeService.findPath(district, start, end);
      if (data.error) {
        alert(data.error);
        return;
      }
      setPathResult(data);
    } catch (err) {
      console.error("Error finding path:", err);
      alert("Failed to find path. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="path-finder card">
      <h3>Get Travel Route</h3>
      <div className="controls">
        <select value={start} onChange={e=>setStart(e.target.value)}>
          <option value="">From</option>
          {nodes && nodes.map(n=> <option key={n} value={n}>{n}</option>)}
        </select>
        <select value={end} onChange={e=>setEnd(e.target.value)}>
          <option value="">To</option>
          {nodes && nodes.map(n=> <option key={n} value={n}>{n}</option>)}
        </select>
        <button onClick={findPath} disabled={loading}>
          {loading ? 'Finding...' : 'Find Path'}
        </button>
      </div>
    </div>
  );
}
