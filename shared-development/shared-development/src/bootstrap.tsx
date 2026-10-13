import React from "react";
import { createRoot } from "react-dom/client";
import TotalPendapatanCard from "./components/TotalPendapatanCard/TotalPendapatanCard";
import TransaksiCard from "./components/TransaksiCard/TransaksiCard";
import MetricCardWidget from "./components/MetricCardWidget/MetricCardWidget";
import BarChartWidget from "./components/BarChartWidget/BarChartWidget";
import LineChartWidget from "./components/LineChartWidget/LineChartWidget";
import AreaChartWidget from "./components/AreaChartWidget/AreaChartWidget";
import PieChartWidget from "./components/PieChartWidget/PieChartWidget";
import DoughnutChartWidget from "./components/DoughnutChartWidget/DoughnutChartWidget";
import ScatterChartWidget from "./components/ScatterChartWidget/ScatterChartWidget";
import TableWidget from "./components/TableWidget/TableWidget";

import "primeicons/primeicons.css";
import "./styles/theme.css";
import "./styles/demo.css";

// ── Sample data ───────────────────────────────────────────────────────────────

const monthlyData = [
  { name: "Jan", value: 12400000 },
  { name: "Feb", value: 18700000 },
  { name: "Mar", value: 15200000 },
  { name: "Apr", value: 22100000 },
  { name: "Mei", value: 28900000 },
  { name: "Jun", value: 24500000 },
  { name: "Jul", value: 31200000 },
  { name: "Agu", value: 27800000 },
  { name: "Sep", value: 35100000 },
  { name: "Okt", value: 29600000 },
  { name: "Nov", value: 38400000 },
  { name: "Des", value: 42100000 },
];

const platformData = [
  { name: "Shopee", value: 42000000 },
  { name: "Tokopedia", value: 38000000 },
  { name: "TikTok Shop", value: 21000000 },
  { name: "Lazada", value: 19000000 },
  { name: "Bukalapak", value: 8000000 },
];

const statusData = [
  { name: "Completed", value: 3850, color: "#10B981" },
  { name: "Pending", value: 620, color: "#F59E0B" },
  { name: "Returned", value: 210, color: "#F43F5E" },
  { name: "Cancelled", value: 90, color: "#8B5CF6" },
];

const scatterData = Array.from({ length: 40 }, (_, i) => ({
  x: 50000 + i * 12000 + Math.floor(Math.random() * 20000),
  y: 1 + Math.floor(Math.random() * 12),
  z: 100000 + i * 15000,
}));

const tableColumns = [
  { key: "order_id", header: "Order ID" },
  { key: "customer_name", header: "Pelanggan" },
  { key: "product_name", header: "Produk" },
  { key: "platform", header: "Platform" },
  { key: "grand_total", header: "Total" },
  { key: "order_status", header: "Status" },
];

const tableData = [
  { order_id: "ORD-001", customer_name: "Budi Santoso", product_name: "Kemeja Batik Modern", platform: "Shopee", grand_total: "Rp 285.000", order_status: "completed" },
  { order_id: "ORD-002", customer_name: "Sari Dewi", product_name: "Dress Floral Summer", platform: "Tokopedia", grand_total: "Rp 195.000", order_status: "pending" },
  { order_id: "ORD-003", customer_name: "Ahmad Reza", product_name: "Celana Chino Slim", platform: "TikTok Shop", grand_total: "Rp 245.000", order_status: "completed" },
  { order_id: "ORD-004", customer_name: "Putri Indah", product_name: "Blazer Formal", platform: "Lazada", grand_total: "Rp 420.000", order_status: "failed" },
  { order_id: "ORD-005", customer_name: "Eko Prasetyo", product_name: "Kaos Oversize", platform: "Shopee", grand_total: "Rp 125.000", order_status: "completed" },
];

// ── Section heading helper ────────────────────────────────────────────────────

function SectionHeading({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ margin: "2.5rem 0 1rem" }}>
      <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>{title}</h2>
      <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#64748b" }}>{sub}</p>
    </div>
  );
}

// ── Demo gallery ──────────────────────────────────────────────────────────────

function Demo() {
  return (
    <div className="demoWrap">
      <h1 className="demoTitle">Shared UI — Widget Gallery</h1>
      <p className="demoSub">
        Semua komponen chart dan card yang diekspos via Module Federation (port 9000).
        Dirender otomatis di Dashboard saat chatbot AI merespons dengan widgetConfig.
      </p>

      {/* ── Stat Cards ── */}
      <SectionHeading title="Metric Card Widgets" sub="Dipakai untuk angka agregat (total, rata-rata, count)" />
      <div className="demoGrid">
        <TotalPendapatanCard value={128450000} delta={12.4} />
        <TransaksiCard value={3284} delta={8.1} />
        <MetricCardWidget label="Total Produk" value="1.248" change="+5.2%" isPositive icon="pi pi-box" color="#10B981" />
        <MetricCardWidget label="Total Pelanggan" value="4.721" change="-1.3%" isPositive={false} icon="pi pi-users" color="#F43F5E" />
      </div>

      {/* ── Line Chart ── */}
      <SectionHeading title="Line Chart Widget" sub="Tren penjualan bulanan — type=monotone, stroke 3px, active glow dot" />
      <LineChartWidget data={monthlyData} title="Tren Penjualan Bulanan" color="#6366F1" />

      {/* ── Area Chart ── */}
      <SectionHeading title="Area Chart Widget" sub="Smooth area dengan SVG gradient fill (opacity 0.4 → 0.05)" />
      <AreaChartWidget data={monthlyData} title="Area Pendapatan per Bulan" color="#06B6D4" />

      {/* ── Bar Chart ── */}
      <SectionHeading title="Bar Chart Widget" sub="Rounded bar (radius 8px) per platform" />
      <BarChartWidget data={platformData} title="Penjualan per Platform" color="#10B981" />

      {/* ── Pie + Doughnut ── */}
      <SectionHeading title="Pie & Doughnut Chart Widgets" sub="Distribusi status order" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
        <PieChartWidget data={statusData} title="Distribusi Status Order (Pie)" />
        <DoughnutChartWidget
          data={statusData}
          title="Distribusi Status Order (Donut)"
          centerValue="4.770"
          centerLabel="Total"
        />
      </div>

      {/* ── Scatter Chart ── */}
      <SectionHeading title="Scatter Chart Widget" sub="Korelasi harga vs qty — titik transparan 80%" />
      <ScatterChartWidget data={scatterData} title="Korelasi Harga vs Qty" xLabel="Harga (Rp)" yLabel="Qty" color="#F59E0B" />

      {/* ── Table Widget ── */}
      <SectionHeading title="Table Widget" sub="Data table modern — header sticky, row hover, badge status otomatis" />
      <TableWidget data={tableData} columns={tableColumns} title="Tabel Transaksi Terbaru" />

      {/* ── Dark mode toggle ── */}
      <div style={{ marginTop: "2.5rem", paddingTop: "1.5rem", borderTop: "1px solid #e2e8f0" }}>
        <button
          type="button"
          className="demoToggle"
          onClick={() => {
            const el = document.documentElement;
            if (el.dataset.theme === "dark") delete el.dataset.theme;
            else el.dataset.theme = "dark";
          }}
        >
          Toggle dark mode
        </button>
      </div>
    </div>
  );
}

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(<Demo />);
}
