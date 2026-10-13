import React from "react";

export interface PieChartWidgetProps {
  data: { name: string; value: number; color?: string }[];
  title?: string;
}

const PALETTE = ["#6366F1","#06B6D4","#10B981","#F59E0B","#F43F5E","#8B5CF6"];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function slicePath(cx: number, cy: number, outerR: number, innerR: number, startAngle: number, endAngle: number) {
  const o1 = polarToCartesian(cx, cy, outerR, startAngle);
  const o2 = polarToCartesian(cx, cy, outerR, endAngle);
  const i1 = polarToCartesian(cx, cy, innerR, endAngle);
  const i2 = polarToCartesian(cx, cy, innerR, startAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M${o1.x},${o1.y} A${outerR},${outerR} 0 ${large} 1 ${o2.x},${o2.y} L${i1.x},${i1.y} A${innerR},${innerR} 0 ${large} 0 ${i2.x},${i2.y} Z`;
}

export default function PieChartWidget({ data, title }: PieChartWidgetProps) {
  if (!data || data.length === 0) return null;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = 130, cy = 110, outerR = 95, innerR = 35;

  let angle = 0;
  const slices = data.map((d, i) => {
    const sweep = (d.value / total) * 356;
    const start = angle;
    angle += sweep + 2;
    return { ...d, start, end: angle - 2, color: d.color ?? PALETTE[i % PALETTE.length] };
  });

  return (
    <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: "24px", padding: "24px", boxShadow: "0 10px 30px -10px rgba(0,0,0,0.08)", width: "100%", boxSizing: "border-box" }}>
      {title && <h3 style={{ margin: "0 0 14px", fontSize: "1rem", fontWeight: 700, color: "#0F172A" }}>{title}</h3>}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
        <svg viewBox="0 0 260 220" width={220} height={200} style={{ flexShrink: 0 }}>
          {slices.map((s, i) => (
            <path key={i} d={slicePath(cx, cy, outerR, innerR, s.start, s.end)} fill={s.color} opacity={0.9} />
          ))}
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {slices.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.78rem" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
              <span style={{ color: "#475569", fontWeight: 500 }}>{s.name}</span>
              <span style={{ color: "#94A3B8", marginLeft: "auto", paddingLeft: 8 }}>
                {((s.value / total) * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
