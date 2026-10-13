import React from "react";

export interface ScatterChartWidgetProps {
  data: { x: number; y: number; z?: number }[];
  title?: string;
  xLabel?: string;
  yLabel?: string;
  color?: string;
}

function fmtY(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
  return String(Math.round(v));
}

export default function ScatterChartWidget({
  data, title, xLabel, yLabel, color = "#6366F1",
}: ScatterChartWidgetProps) {
  if (!data || data.length === 0) return null;

  const W = 480, H = 240;
  const PAD = { top: 16, right: 16, bottom: 36, left: 56 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top  - PAD.bottom;

  const xs = data.map((d) => d.x), ys = data.map((d) => d.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs) || 1;
  const minY = Math.min(...ys), maxY = Math.max(...ys) || 1;
  const zs = data.map((d) => d.z ?? 1), maxZ = Math.max(...zs) || 1;

  const toX = (v: number) => PAD.left + ((v - minX) / (maxX - minX || 1)) * iW;
  const toY = (v: number) => PAD.top  + iH - ((v - minY) / (maxY - minY || 1)) * iH;
  const toR = (z: number) => 3 + (z / maxZ) * 7;

  const TICKS = 4;
  const yTicks = Array.from({ length: TICKS + 1 }, (_, i) => {
    const v = minY + ((maxY - minY) * i) / TICKS;
    return { y: toY(v), label: fmtY(v) };
  });

  return (
    <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: "24px", padding: "24px", boxShadow: "0 10px 30px -10px rgba(0,0,0,0.08)", width: "100%", boxSizing: "border-box" }}>
      {title && <h3 style={{ margin: "0 0 14px", fontSize: "1rem", fontWeight: 700, color: "#0F172A" }}>{title}</h3>}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block", overflow: "visible" }}>
        {yTicks.map((t, i) => <line key={i} x1={PAD.left} x2={W - PAD.right} y1={t.y} y2={t.y} stroke="#F1F5F9" strokeWidth={1} />)}
        {data.map((d, i) => (
          <circle key={i} cx={toX(d.x)} cy={toY(d.y)} r={toR(d.z ?? 1)} fill={color} fillOpacity={0.7} stroke={color} strokeWidth={1} strokeOpacity={0.4} />
        ))}
        {yTicks.map((t, i) => <text key={i} x={PAD.left - 6} y={t.y + 4} textAnchor="end" fontSize={11} fill="#94A3B8">{t.label}</text>)}
        {xLabel && <text x={W / 2} y={H} textAnchor="middle" fontSize={11} fill="#94A3B8">{xLabel}</text>}
        {yLabel && <text x={12} y={H / 2} textAnchor="middle" fontSize={11} fill="#94A3B8" transform={`rotate(-90,12,${H / 2})`}>{yLabel}</text>}
      </svg>
    </div>
  );
}
