import React, { useState } from "react";

export interface BarChartWidgetProps {
  data: { name: string; value: number }[];
  title?: string;
  color?: string;
  xLabel?: string;
  yLabel?: string;
}

function fmtY(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)         return `${(v / 1_000).toFixed(0)}K`;
  return String(Math.round(v));
}

function fmtFull(v: number): string {
  return Number.isInteger(v) ? v.toLocaleString("id-ID") : v.toLocaleString("id-ID", { maximumFractionDigits: 2 });
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

/** Pure-SVG rounded bar chart — interactive (click / hover bars to see values) */
export default function BarChartWidget({
  data,
  title,
  color = "#3B82F6",  // Blue per spec
  xLabel,
  yLabel,
}: BarChartWidgetProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const active = hovered !== null ? hovered : selected;

  if (!data || data.length === 0) return null;

  const W = 480, H = 260;
  const PAD = { top: 16, right: 16, bottom: 44, left: 64 };
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
          const isActive = active === i;
          // SVG path with rounded top-left and top-right corners
          const path = bh <= r
            ? `M${x},${y + bh} V${y + r} a${r},${r} 0 0 1 ${r},${-r} h${barW - 2 * r} a${r},${r} 0 0 1 ${r},${r} V${y + bh} Z`
            : `M${x},${y + bh} V${y + r} a${r},${r} 0 0 1 ${r},${-r} h${barW - 2 * r} a${r},${r} 0 0 1 ${r},${r} V${y + bh} Z`;
          return (
            <g key={i}>
              {/* Invisible wider hit area for easier clicking */}
              <rect
                x={x - 2} y={y - 2} width={barW + 4} height={bh + 4}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onClick={() => setSelected(selected === i ? null : i)}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
              <path
                d={path} fill={fill} opacity={isActive ? 1 : 0.9}
                style={{ cursor: "pointer", transition: "opacity 0.15s" }}
                onClick={() => setSelected(selected === i ? null : i)}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            </g>
          );
        })}

        {/* X labels — skip if too many bars */}
        {data.map((d, i) => {
          const skip = Math.ceil(data.length / 8);
          if (i % skip !== 0 && i !== data.length - 1) return null;
          const labelX = toX(i) + barW / 2;
          const label = d.name.length > 10 ? d.name.slice(0, 9) + "…" : d.name;
          return (
            <text key={i} x={labelX} y={H - 22} textAnchor="middle" fontSize={10} fill="#94A3B8">{label}</text>
          );
        })}

        {/* Y labels */}
        {yTicks.map((t, i) => (
          <text key={i} x={PAD.left - 8} y={t.y + 4} textAnchor="end" fontSize={11} fill="#94A3B8">{t.label}</text>
        ))}

        {xLabel && (
          <text x={PAD.left + iW / 2} y={H - 4} textAnchor="middle" fontSize={11} fill="#64748B" fontWeight={600}>{xLabel}</text>
        )}
        {yLabel && (
          <text x={14} y={PAD.top + iH / 2} textAnchor="middle" fontSize={11} fill="#64748B" fontWeight={600} transform={`rotate(-90 14 ${PAD.top + iH / 2})`}>{yLabel}</text>
        )}

        {/* Tooltip for active bar */}
        {active !== null && data[active] && (() => {
          const d = data[active];
          const cx = toX(active) + barW / 2;
          const topY = PAD.top + iH - toH(d.value);
          const valueText = fmtFull(d.value);
          const nameText = d.name.length > 16 ? d.name.slice(0, 15) + "…" : d.name;
          const tw = Math.max(80, Math.max(valueText.length, nameText.length) * 7 + 24);
          const th = 38;
          let tx = cx - tw / 2;
          if (tx < PAD.left) tx = PAD.left;
          if (tx + tw > W - PAD.right) tx = W - PAD.right - tw;
          const ty = Math.max(4, topY - th - 10);
          return (
            <g pointerEvents="none">
              <rect x={tx} y={ty} width={tw} height={th} rx={8} fill="#0F172A" opacity={0.92} />
              <text x={tx + tw / 2} y={ty + 15} textAnchor="middle" fontSize={10} fill="#CBD5E1" fontWeight={600}>{nameText}</text>
              <text x={tx + tw / 2} y={ty + 30} textAnchor="middle" fontSize={12} fill="#ffffff" fontWeight={700}>{valueText}</text>
              <polygon points={`${cx - 5},${ty + th} ${cx + 5},${ty + th} ${cx},${ty + th + 5}`} fill="#0F172A" opacity={0.92} />
            </g>
          );
        })()}
      </svg>
      <div style={{ marginTop: "8px", fontSize: "0.72rem", color: "#94A3B8" }}>
        Klik bar untuk melihat detail nilai.
      </div>
    </div>
  );
}
