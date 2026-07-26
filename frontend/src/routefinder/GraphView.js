import React, { useRef, useEffect } from "react";
import * as d3 from "d3";

export default function GraphView({ districtData, pathResult }) {
  const ref = useRef();

  useEffect(() => {
    if (!districtData?.coords) return;
    const coords = districtData.coords;
    const width = 800;
    const height = 400;

    // Clear any previous render
    d3.select(ref.current).selectAll("*").remove();

    // Create SVG
    const svg = d3
      .select(ref.current)
      .attr("width", width)
      .attr("height", height)
      .style("background", "#fdfdfd")
      .style("border-radius", "10px");

    const keys = Object.keys(coords);
    const n = keys.length;

    // ✅ Fixed circular layout
    const radius = Math.min(width, height) / 2.5;
    const centerX = width / 2;
    const centerY = height / 2;

    const nodes = keys.map((k, i) => ({
      id: k,
      x: centerX + radius * Math.cos((2 * Math.PI * i) / n - Math.PI / 2),
      y: centerY + radius * Math.sin((2 * Math.PI * i) / n - Math.PI / 2),
    }));

    const links = keys.map((k, i) => ({
      source: k,
      target: keys[(i + 1) % n],
    }));

    // 🩶 Draw all base edges
    svg
      .selectAll(".edge")
      .data(links)
      .join("line")
      .attr("x1", (d) => nodes.find((n) => n.id === d.source).x)
      .attr("y1", (d) => nodes.find((n) => n.id === d.source).y)
      .attr("x2", (d) => nodes.find((n) => n.id === d.target).x)
      .attr("y2", (d) => nodes.find((n) => n.id === d.target).y)
      .attr("stroke", "#ccc")
      .attr("stroke-width", 1.8);

    // ❤️ Animate path (red route)
    const animatePath = async () => {
      if (!pathResult?.path || pathResult.path.length < 2) return;

      for (let i = 0; i < pathResult.path.length - 1; i++) {
        const s = nodes.find((n) => n.id === pathResult.path[i]);
        const t = nodes.find((n) => n.id === pathResult.path[i + 1]);
        if (s && t) {
          const line = svg
            .append("line")
            .attr("x1", s.x)
            .attr("y1", s.y)
            .attr("x2", s.x)
            .attr("y2", s.y)
            .attr("stroke", "red")
            .attr("stroke-width", 3)
            .attr("stroke-linecap", "round");

          // Animate drawing from start to target
          await line
            .transition()
            .duration(1000) // speed per segment (ms)
            .attr("x2", t.x)
            .attr("y2", t.y)
            .end();

          // Optional pulse effect at each node
          svg
            .append("circle")
            .attr("cx", t.x)
            .attr("cy", t.y)
            .attr("r", 0)
            .attr("fill", "red")
            .attr("opacity", 0.6)
            .transition()
            .duration(400)
            .attr("r", 10)
            .attr("opacity", 0)
            .remove();
        }
      }
    };

    animatePath();

    // 🔵 Draw nodes
    svg
      .selectAll(".node")
      .data(nodes)
      .join("circle")
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("r", 7)
      .attr("fill", "#007bff")
      .attr("stroke", "#003366")
      .attr("stroke-width", 1.5);

    // 🏷 Add labels
    svg
      .selectAll(".label")
      .data(nodes)
      .join("text")
      .attr("x", (d) => d.x + 10)
      .attr("y", (d) => d.y + 4)
      .text((d) => d.id)
      .attr("font-size", 11)
      .attr("font-weight", 600)
      .attr("fill", "#333");
  }, [districtData, pathResult]);

  return (
    <div className="graph-view-box">
      <h3>District Heritage Graph View</h3>
      <svg ref={ref}></svg>
    </div>
  );
}
