import React from "react";
import { getCode128Bars } from "../utils/barcode.js";

/** Real Code 128-B SVG, generated entirely in the browser. */
export default function Code128Barcode({ value, className = "", height = 64 }) {
  if (!value) return null;
  const { bars, width } = getCode128Bars(value);
  return (
    <svg
      id="variant-barcode-svg"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Code 128 barcode ${value}`}
      shapeRendering="crispEdges"
      style={{ display: "block", width: "100%", maxWidth: "420px", height: "auto", background: "#fff" }}
    >
      <rect x="0" y="0" width={width} height={height} fill="#fff" />
      {bars.map((bar, index) => (
        <rect key={index} x={bar.x} y="2" width={bar.width} height={height - 4} fill="#111827" />
      ))}
    </svg>
  );
}
