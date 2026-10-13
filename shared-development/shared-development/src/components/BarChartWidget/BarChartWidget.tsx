import React from "react";

export interface BarChartWidgetProps {
  data: { name: string; value: number }[];
  title?: string;
  color?: string;
}

function fmtY(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)         return `${(v / 1_000).toFixed(0)}K`;
  return String(Math.round(v));
}

// Rounded-bar palette — each bar gets a different colour, cycling through this list
const PALETTE = [
  "#3B82F6",  // Blue (primary, per spec)
  "#8B5CF6",  // Violet
  "#06B6D4",  // Cyan
  "#10B981",  // Emerald
  "#F59E0B",  // Amber
  "#F43F5E",  // Rose
  "#EC4899",  // Pink
  "#14B8A6",  // Teal
  "#6366F1",  // Indigo
  "#84CC16",  // Lime
];

/** Pure-SVG rounded bar chart */
export default function BarChartWidget({
  data,
  title,
  color = "#3B82F6",  // Blue per spec
}: BarChartWidgetProps) {
  if (!data || data.length === 0) return null;

  const W = 480, H = 240;
  const PAD = { top: 16, right: 16, bottom: 36, left: 56 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top  - PAD.bottom;

  const vals = data.map((d) => d.value);
  const maxV = Math.max(...vals) || 1;

  const gap  = Math.max(4, Math.floor(iW / data.length * 0.18));
  const barW = (iW - gap * (data.length - 1)) / data.length;
  const toX  = (i: number) => PAD.left + i * (barW + gap);
  const toH  = (v: number) => Math.max(2, (v / maxV) * iH);

  const TICKS = 4;
  const yTicks = Array.from({ length: TICKS + 1 }, (_, i) => {
    const v = (maxV * i) / TICKS;
    return { y: PAD.top + iH - (v / maxV) * iH, label: fmtY(v) };
  });

  return (
    <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: "24px", padding: "24px", boxShadow: "0 10px 30px -10px rgba(0,0,0,0.08)", width: "100%", boxSizing: "border-box" }}>
      {title && <h3 style={{ margin: "0 0 14px", fontSize: "1rem", fontWeight: 700, color: "#0F172A" }}>{title}</h3>}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block", overflow: "visible" }}>
        {/* Grid lines */}
        {yTicks.map((t, i) => (
          <line key={i} x1={PAD.left} x2={W - PAD.right} y1={t.y} y2={t.y} stroke="#F1F5F9" strokeWidth={1} />
        ))}

        {/* Bars — rounded top corners */}
        {data.map((d, i) => {
          const bh   = toH(d.value);
          const x    = toX(i);
          const y    = PAD.top + iH - bh;
          const fill = PALETTE[i % PALETTE.length];
          const r    = Math.min(6, barW / 2);
          // SVG path with rounded top-left and top-right corners
          const path = bh <= r
            ? `M${x},${y + bh} V${y + r} a${r},${r} 0 0 1 ${r},${-r} h${barW - 2 * r} a${r},${r} 0 0 1 ${r},${r} V${y + bh} Z`
            : `M${x},${y + bh} V${y + r} a${r},${r} 0 0 1 ${r},${-r} h${barW - 2 * r} a${r},${r} 0 0 1 ${r},${r} V${y + bh} Z`;
          return <path key={i} d={path} fill={fill} opacity={0.9} />;
        })}

        {/* X labels — skip if too many bars */}
        {data.map((d, i) => {
          const skip = Math.ceil(data.length / 8);
          if (i % skip !== 0 && i !== data.length - 1) return null;
          const labelX = toX(i) + barW / 2;
          // Truncate long labels
          const label = d.name.length > 10 ? d.name.slice(0, 9) + "…" : d.name;
          return (
            <text key={i} x={labelX} y={H - 4} textAnchor="middle" fontSize={10} fill="#94A3B8">{label}</text>
          );
        })}

        {/* Y labels */}
        {yTicks.map((t, i) => (
          <text key={i} x={PAD.left - 6} y={t.y + 4} textAnchor="end" fontSize={11} fill="#94A3B8">{t.label}</text>
        ))}
      </svg>
    </div>
  );
}
