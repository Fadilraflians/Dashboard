import React from "react";

export interface MetricCardWidgetProps {
  label: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  icon?: string;
  color?: string;
}

/**
 * Ultra-modern metric card with icon, value, and percentage badge.
 */
export default function MetricCardWidget({
  label,
  value,
  change,
  isPositive = true,
  icon = "pi pi-chart-bar",
  color = "#6366F1",
}: MetricCardWidgetProps) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid rgba(0,0,0,0.06)",
        borderRadius: "24px",
        padding: "20px 24px",
        boxShadow: "0 10px 30px -10px rgba(0,0,0,0.08)",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        minWidth: "200px",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "52px",
          height: "52px",
          borderRadius: "14px",
          background: `${color}1A`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <i className={icon} style={{ color, fontSize: "1.4rem" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.78rem", color: "#64748B", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {label}
        </div>
        <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0F172A", marginTop: "2px" }}>
          {value}
        </div>
        {change && (
          <div
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              color: isPositive ? "#10B981" : "#EF4444",
              marginTop: "4px",
            }}
          >
            {isPositive ? "▲" : "▼"} {change}
          </div>
        )}
      </div>
    </div>
  );
}