import React from "react";

export interface TableWidgetColumn {
  key: string;
  header: string;
  width?: string;
  render?: (row: Record<string, unknown>) => React.ReactNode;
}

export interface TableWidgetProps {
  data: Record<string, unknown>[];
  columns: TableWidgetColumn[];
  title?: string;
  emptyMessage?: string;
  maxRows?: number;
}

function statusBadge(value: string): { label: string; color: string } {
  const v = String(value).toLowerCase();
  if (v === "success" || v === "completed" || v === "active") return { label: String(value), color: "#10B981" };
  if (v === "pending" || v === "warning") return { label: String(value), color: "#F59E0B" };
  if (v === "failed" || v === "returned" || v === "inactive" || v === "danger") return { label: String(value), color: "#EF4444" };
  return { label: String(value), color: "#64748B" };
}

export default function TableWidget({ data, columns, title, emptyMessage = "Tidak ada data.", maxRows = 10 }: TableWidgetProps) {
  const rows = data.slice(0, maxRows);

  return (
    <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: "24px", padding: "24px", boxShadow: "0 10px 30px -10px rgba(0,0,0,0.08)", overflow: "hidden" }}>
      {title && <h3 style={{ margin: "0 0 16px", fontSize: "1rem", fontWeight: 700, color: "#0F172A" }}>{title}</h3>}
      <div style={{ overflowX: "auto", maxHeight: 400, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ background: "#F8FAFC" }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    padding: "12px 14px",
                    textAlign: "left",
                    fontWeight: 700,
                    color: "#475569",
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                    fontSize: "0.72rem",
                    whiteSpace: "nowrap",
                    position: "sticky",
                    top: 0,
                    background: "#F8FAFC",
                    borderBottom: "2px solid #E2E8F0",
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: "24px", textAlign: "center", color: "#94A3B8" }}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, ri) => (
                <tr
                  key={ri}
                  style={{
                    borderBottom: "1px solid #F1F5F9",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#F8FAFC"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                >
                  {columns.map((col) => {
                    const val = row[col.key];
                    const cell = col.render ? col.render(row) : val;
                    const badge = typeof val === "string" && (val === "success" || val === "pending" || val === "failed" || val === "completed" || val === "returned" || val === "active" || val === "inactive")
                      ? statusBadge(val)
                      : null;
                    return (
                      <td
                        key={col.key}
                        style={{ padding: "12px 14px", color: "#334155", whiteSpace: "nowrap" }}
                      >
                        {badge ? (
                          <span style={{ background: badge.color + "22", color: badge.color, padding: "3px 10px", borderRadius: "20px", fontSize: "0.72rem", fontWeight: 600, display: "inline-block" }}>
                            {badge.label}
                          </span>
                        ) : (
                          cell as React.ReactNode
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}