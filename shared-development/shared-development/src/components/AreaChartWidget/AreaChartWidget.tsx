import React from "react";

export interface AreaChartWidgetProps {
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

/** Pure-SVG area chart */
export default function AreaChartWidget({
  data,
  title,
  color = "#10B981",   // Emerald green per spec
}: AreaChartWidgetProps) {
  if (!data || data.length === 0) return null;

  const W = 480, H = 240;
  const PAD = { top: 16, right: 16, bottom: 32, left: 56 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top  - PAD.bottom;

  const vals  = data.map((d) => d.value);
  const minV  = Math.min(...vals);
  const maxV  = Math.max(...vals);
  const range = maxV - minV || 1;

  const xStep = iW / Math.max(data.length - 1, 1);
  const toX   = (i: number) => PAD.left + i * xStep;
  const toY   = (v: number) => PAD.top  + iH - ((v - minV) / range) * iH;

  const line = data.map((d, i) =>
    `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(d.value).toFixed(1)}`
  ).join(" ");

  const area =
    line +
    ` L${toX(data.length - 1).toFixed(1)},${(PAD.top + iH).toFixed(1)}` +
    ` L${PAD.left.toFixed(1)},${(PAD.top + iH).toFixed(1)} Z`;

  const gradId = `ag-${color.replace("#", "")}`;

  const TICKS = 4;
  const yTicks = Array.from({ length: TICKS + 1 }, (_, i) => {
    const v = minV + (range * i) / TICKS;
    return { y: toY(v), label: fmtY(v) };
  });

  const step = Math.ceil(data.length / 8);

  return (
    <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: "24px", padding: "24px", boxShadow: "0 10px 30px -10px rgba(0,0,0,0.08)", width: "100%", boxSizing: "border-box" }}>
      {title && <h3 style={{ margin: "0 0 14px", fontSize: "1rem", fontWeight: 700, color: "#0F172A" }}>{title}</h3>}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0.03} />
          </linearGradient>
        </defs>
        {yTicks.map((t, i) => <line key={i} x1={PAD.left} x2={W - PAD.right} y1={t.y} y2={t.y} stroke="#F1F5F9" strokeWidth={1} />)}
        <path d={area} fill={`url(#${gradId})`} />
        <path d={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => (
          <circle key={i} cx={toX(i)} cy={toY(d.value)} r={3.5} fill={color} stroke="#fff" strokeWidth={2} />
        ))}
        {data.map((d, i) => {
          if (i % step !== 0 && i !== data.length - 1) return null;
          return <text key={i} x={toX(i)} y={H - 4} textAnchor="middle" fontSize={11} fill="#94A3B8">{d.name}</text>;
        })}
        {yTicks.map((t, i) => (
          <text key={i} x={PAD.left - 6} y={t.y + 4} textAnchor="end" fontSize={11} fill="#94A3B8">{t.label}</text>
        ))}
      </svg>
    </div>
  );
}
