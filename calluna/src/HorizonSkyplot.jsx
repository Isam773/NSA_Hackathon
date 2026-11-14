import React, { useState } from "react";

export default function HorizonSkyplot({ horizon360, timeline, timeIndex, setTimeIndex }) {
const [internalIdx, setInternalIdx] = useState(0)
  const currentIdx = timeIndex !== undefined ? timeIndex : internalIdx
  const updateIdx = setTimeIndex || setInternalIdx

  if (!horizon360 || !timeline || timeline.length === 0) return null;

  const current = timeline[currentIdx];
  const size = 260;
  const center = size / 2;
  const maxR = 105;

  // Conversion (Azimut, Élévation) -> coordonnées (X, Y) sur le disque
  // Zénith (90°) au centre, Horizon théorique (0°) sur le cercle extérieur
  const polarToXY = (azDeg, elDeg) => {
    const clampedEl = Math.max(-5, Math.min(90, elDeg));
    const r = maxR * ((90 - clampedEl) / 90);
    const rad = (azDeg * Math.PI) / 180;
    return {
      x: center + r * Math.sin(rad),
      y: center - r * Math.cos(rad),
    };
  };

  // Construction du polygone du relief (les cratères alentours)
  const buildReliefPath = () => {
    let outerCircle = `M ${center} ${center - maxR} A ${maxR} ${maxR} 0 1 0 ${center} ${center + maxR} A ${maxR} ${maxR} 0 1 0 ${center} ${center - maxR} Z `;
    let innerPoints = [];
    for (let az = 0; az < 360; az++) {
      const el = horizon360[az] || 0;
      const pt = polarToXY(az, el);
      innerPoints.push(`${az === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`);
    }
    return outerCircle + innerPoints.join(" ") + " Z";
  };

  const sunPos = polarToXY(current.soleil_az, current.soleil_el);
  const earthPos = polarToXY(current.terre_az, current.terre_el);

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span>LOCAL SKY & HORIZON MASK</span>
        <span style={styles.date}>{current.date}</span>
      </div>

      <svg width={size} height={size} style={{ display: "block", margin: "0 auto" }}>
        {/* Fond du ciel */}
        <circle cx={center} cy={center} r={maxR} fill="#0b1021" stroke="#334155" strokeWidth="1.5" />
        {/* Cercles d'élévation (30° et 60°) */}
        <circle cx={center} cy={center} r={maxR * (60 / 90)} fill="none" stroke="#1e293b" strokeDasharray="3,3" />
        <circle cx={center} cy={center} r={maxR * (30 / 90)} fill="none" stroke="#1e293b" strokeDasharray="3,3" />

        {/* Silhouette des montagnes/cratères LOLA */}
        <path d={buildReliefPath()} fill="rgba(120, 113, 108, 0.55)" fillRule="evenodd" stroke="#a8a29e" strokeWidth="1" />

        {/* Points cardinaux */}
        <text x={center} y={14} fill="#94a3b8" fontSize="11" textAnchor="middle">N</text>
        <text x={center} y={size - 5} fill="#94a3b8" fontSize="11" textAnchor="middle">S</text>
        <text x={size - 8} y={center + 4} fill="#94a3b8" fontSize="11" textAnchor="middle">E</text>
        <text x={8} y={center + 4} fill="#94a3b8" fontSize="11" textAnchor="middle">O</text>

        {/* Position de la Terre (si au-dessus de -5°) */}
        {current.terre_el > -5 && (
          <g>
            <circle
              cx={earthPos.x}
              cy={earthPos.y}
              r={6}
              fill={current.terre_ok ? "#38bdf8" : "#475569"}
              stroke="#fff"
              strokeWidth="1.5"
            />
            <text x={earthPos.x + 9} y={earthPos.y + 3} fill="#38bdf8" fontSize="10">Terre</text>
          </g>
        )}

        {/* Position du Soleil (si au-dessus de -5°) */}
        {current.soleil_el > -5 && (
          <g>
            <circle
              cx={sunPos.x}
              cy={sunPos.y}
              r={7}
              fill={current.soleil_ok ? "#facc15" : "#713f12"}
              stroke={current.soleil_ok ? "#fef08a" : "#a16207"}
              strokeWidth="2"
            />
            <text x={sunPos.x + 10} y={sunPos.y + 3} fill="#facc15" fontSize="10">Soleil</text>
          </g>
        )}
      </svg>

      {/* Statuts instantanés */}
      <div style={styles.statusRow}>
        <span style={{ color: current.soleil_ok ? "#4ade80" : "#f87171" }}>
          ☀ {current.soleil_ok ? "VISIBLE" : "MASKED"} ({current.soleil_el.toFixed(1)}°)
        </span>
        <span style={{ color: current.terre_ok ? "#38bdf8" : "#f87171" }}>
          🌍 {current.terre_ok ? "LIAISON OK" : "COMMUNICATION LOST"} ({current.terre_el.toFixed(1)}°)
        </span>
      </div>

      {/* Curseur temporel */}
      <input
        type="range"
        min={0}
        max={timeline.length - 1}
        value={currentIdx}
        onChange={(e) => setTimeIndex(Number(e.target.value))}
        style={{ width: "100%", marginTop: "8px", cursor: "pointer" }}
      />
    </div>
  );
}

const styles = {
  card: {
    position: "absolute",
    bottom: "20px",
    right: "20px",
    width: "290px",
    backgroundColor: "rgba(15, 23, 42, 0.88)",
    backdropFilter: "blur(8px)",
    border: "1px solid #334155",
    borderRadius: "12px",
    padding: "12px",
    color: "#f8fafc",
    fontFamily: "monospace",
    zIndex: 10,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "11px",
    color: "#94a3b8",
    marginBottom: "6px",
  },
  date: { color: "#e2e8f0", fontWeight: "bold" },
  statusRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "11px",
    marginTop: "6px",
    fontWeight: "bold",
  },
};