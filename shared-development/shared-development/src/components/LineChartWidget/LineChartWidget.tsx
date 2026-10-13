import React, { useState } from "react";

export interface LineChartDataPoint {
  name: string;
  value: number;
}

export interface LineChartSeries {
  name: string;
  data: LineChartDataPoint[];
  color?: string;
}

export interface LineChartWidgetProps {
  data?: LineChartDataPoint[];
  series?: LineChartSeries[];
  title?: string;
  color?: string;
  xLabel?: string;
  yLabel?: string;
}

const SERIES_PALETTE = [
  "#8B5CF6", "#06B6D4", "#10B981", "#F59E0B",
  "#F43F5E", "#3B82F6", "#EC4899", "#14B8A6",
  "#84CC16", "#6366F1",
];

function fmtY(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)         return `${(v / 1_000).toFixed(0)}K`;
  return String(Math.round(v));
}

function fmtFull(v: number): string {
  return Number.isInteger(v) ? v.toLocaleString("id-ID") : v.toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

interface ActivePoint {
  si: number;
  pi: number;
}

export default function LineChartWidget({
  data,
  series,
  title,
  color = "#8B5CF6",
  xLabel,
  yLabel,
}: LineChartWidgetProps) {
  const [selected, setSelected] = useState<ActivePoint | null>(null);
  const [hovered, setHovered] = useState<ActivePoint | null>(null);
  const active = hovered ?? selected;

  const useSeries = Array.isArray(series) && series.length > 0;
  const chartSeries: { name: string; data: LineChartDataPoint[]; color: string }[] = useSeries
    ? series.map((s, i) => ({
        name: s.name,
        data: s.data,
        color: s.color ?? SERIES_PALETTE[i % SERIES_PALETTE.length],
      }))
    : [{ name: title ?? "Series 1", data: data ?? [], color }];

  const allData = chartSeries.flatMap((s) => s.data);
  if (!allData.length) return null;

  const allVals = allData.map((d) => d.value);
  const minV = Math.min(...allVals);
  const maxV = Math.max(...allVals);
  const range = maxV - minV || 1;
  const W = 480, H = 260;
  const PAD = { top: 20, right: 16, bottom: 44, left: 64 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top  - PAD.bottom;

  const xLabels = chartSeries[0].data.map((d) => d.name);
  const xStep = iW / Math.max(xLabels.length - 1, 1);
  const toX = (i: number) => PAD.left + i * xStep;
  const toY = (v: number) => PAD.top + iH - ((v - minV) / range) * iH;

  const TICKS = 4;
  const yTicks = Array.from({ length: TICKS + 1 }, (_, i) => {
    const v = minV + (range * i) / TICKS;
    return { y: toY(v), label: fmtY(v) };
  });

  const step = Math.ceil(xLabels.length / 8);

  const isActive = (si: number, pi: number) =>
    active !== null && active.si === si && active.pi === pi;

  return (
    <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: "24px", padding: "24px", boxShadow: "0 10px 30px -10px rgba(0,0,0,0.08)", width: "100%", boxSizing: "border-box" }}>
      {title && <h3 style={{ margin: "0 0 14px", fontSize: "1rem", fontWeight: 700, color: "#0F172A" }}>{title}</h3>}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block", overflow: "visible" }}>
        {yTicks.map((t, i) => (
          <line key={i} x1={PAD.left} x2={W - PAD.right} y1={t.y} y2={t.y} stroke="#F1F5F9" strokeWidth={1} />
        ))}
        {chartSeries.map((s, si) => {
          const line = s.data.map((d, i) =>
            `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(d.value).toFixed(1)}`
          ).join(" ");
          const gradId = `lg-${s.color.replace("#", "")}-${si}`;
          return (
            <g key={si}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={s.color} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <path
                d={line + ` L${toX(s.data.length - 1).toFixed(1)},${(PAD.top + iH).toFixed(1)} L${PAD.left.toFixed(1)},${(PAD.top + iH).toFixed(1)} Z`}
                fill={`url(#${gradId})`}
              />
              <path d={line} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              {s.data.map((d, pi) => {
                const activeNow = isActive(si, pi);
                return (
                  <g key={pi}>
                    {/* Invisible larger hit target */}
                    <circle
                      cx={toX(pi)} cy={toY(d.value)} r={10}
                      fill="transparent"
                      style={{ cursor: "pointer" }}
                      onClick={() => setSelected(selected && selected.si === si && selected.pi === pi ? null : { si, pi })}
                      onMouseEnter={() => setHovered({ si, pi })}
                      onMouseLeave={() => setHovered(null)}
                    />
                    <circle
                      cx={toX(pi)} cy={toY(d.value)}
                      r={activeNow ? 5.5 : 3.5}
                      fill={s.color} stroke="#fff"
                      strokeWidth={activeNow ? 3 : 2}
                      style={{ cursor: "pointer", transition: "r 0.15s" }}
                      onClick={() => setSelected(selected && selected.si === si && selected.pi === pi ? null : { si, pi })}
                      onMouseEnter={() => setHovered({ si, pi })}
                      onMouseLeave={() => setHovered(null)}
                    />
                  </g>
                );
              })}
            </g>
          );
        })}
        {xLabels.map((lbl, i) => {
          if (i % step !== 0 && i !== xLabels.length - 1) return null;
          return <text key={i} x={toX(i)} y={H - 22} textAnchor="middle" fontSize={11} fill="#94A3B8">{lbl}</text>;
        })}
        {yTicks.map((t, i) => (
          <text key={i} x={PAD.left - 8} y={t.y + 4} textAnchor="end" fontSize={11} fill="#94A3B8">{t.label}</text>
        ))}
        {xLabel && (
          <text x={PAD.left + iW / 2} y={H - 4} textAnchor="middle" fontSize={11} fill="#64748B" fontWeight={600}>{xLabel}</text>
        )}
        {yLabel && (
          <text x={14} y={PAD.top + iH / 2} textAnchor="middle" fontSize={11} fill="#64748B" fontWeight={600} transform={`rotate(-90 14 ${PAD.top + iH / 2})`}>{yLabel}</text>
        )}

        {/* Tooltip for active point */}
        {active !== null && chartSeries[active.si] && chartSeries[active.si].data[active.pi] && (() => {
          const s = chartSeries[active.si];
          const d = s.data[active.pi];
          const cx = toX(active.pi);
          const cy = toY(d.value);
          const seriesText = s.name;
          const nameText = d.name.length > 16 ? d.name.slice(0, 15) + "…" : d.name;
          const valueText = fmtFull(d.value);
          const tw = Math.max(90, Math.max(seriesText.length, nameText.length, valueText.length) * 7 + 24);
          const th = 50;
          let tx = cx - tw / 2;
          if (tx < PAD.left) tx = PAD.left;
          if (tx + tw > W - PAD.right) tx = W - PAD.right - tw;
          let ty = cy - th - 12;
          let pointerUp = true;
          if (ty < PAD.top) { ty = cy + 12; pointerUp = false; }
          return (
            <g pointerEvents="none">
              <rect x={tx} y={ty} width={tw} height={th} rx={8} fill="#0F172A" opacity={0.92} />
              <text x={tx + tw / 2} y={ty + 15} textAnchor="middle" fontSize={10} fill={s.color} fontWeight={700}>{seriesText}</text>
              <text x={tx + tw / 2} y={ty + 29} textAnchor="middle" fontSize={10} fill="#CBD5E1">{nameText}</text>
              <text x={tx + tw / 2} y={ty + 43} textAnchor="middle" fontSize={12} fill="#ffffff" fontWeight={700}>{valueText}</text>
              {pointerUp ? (
                <polygon points={`${cx - 5},${ty + th} ${cx + 5},${ty + th} ${cx},${ty + th + 5}`} fill="#0F172A" opacity={0.92} />
              ) : (
                <polygon points={`${cx - 5},${ty} ${cx + 5},${ty} ${cx},${ty - 5}`} fill="#0F172A" opacity={0.92} />
              )}
            </g>
          );
        })()}
      </svg>
      {useSeries && chartSeries.length > 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "12px" }}>
          {chartSeries.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", color: "#475569" }}>
              <span style={{ width: 12, height: 3, borderRadius: 2, background: s.color }} />
              {s.name}
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: "8px", fontSize: "0.72rem", color: "#94A3B8" }}>
        Klik titik pada grafik untuk melihat detail nilai.
      </div>
    </div>
  );
}
