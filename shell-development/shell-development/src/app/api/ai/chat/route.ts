import { NextRequest, NextResponse } from "next/server";
import { logger } from "../../../../../log.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OLLAMA_URL    = process.env.OLLAMA_URL      || "http://127.0.0.1:11434/api/generate";
const MODEL         = process.env.OLLAMA_MODEL    || "qwen2.5:7b";
const AI_BACKEND    = process.env.AI_BACKEND_URL  || "http://127.0.0.1:3200/api/ai/query";

// ── Actual columns: city, customer_name, customer_rating, discount_amount,
//    discount_percent, gender, grand_total, id, material, order_date, order_id,
//    order_status, payment_method, platform, product_name, quantity,
//    shipping_fee, size, subtotal, total_sales, unit_price

// ── Types ─────────────────────────────────────────────────────────────────────

type ChartIntent =
  | "bar" | "line" | "area" | "pie" | "doughnut"
  | "scatter" | "table" | "metric" | null;

// chartType in the new widgetConfig format
type ChartType =
  | "line_chart" | "area_chart" | "bar_chart"
  | "pie_chart"  | "doughnut_chart"
  | "table_widget" | "card_widget";

// ── Intent detection ──────────────────────────────────────────────────────────

function detectIntent(text: string): ChartIntent {
  const t = text.toLowerCase();
  if (/bar\s*chart|barchart|grafik\s*batang|chart\s*batang/.test(t))   return "bar";
  if (/line\s*chart|linechart|grafik\s*garis|chart\s*garis/.test(t))   return "line";
  if (/area\s*chart|areachart|grafik\s*area|chart\s*area/.test(t))     return "area";
  if (/donut|doughnut|donat|ring/.test(t))                              return "doughnut";
  if (/pie\s*chart|piechart|grafik\s*pie|chart\s*pie|\bpie\b/.test(t)) return "pie";
  if (/scatter|titik|korelasi/.test(t))                                 return "scatter";
  if (/tabel|table|list\s*data|daftar\s*data/.test(t))                  return "table";
  if (/tren|trend|perbulan|per\s*bulan|bulanan/.test(t))                return "line";
  if (/berapa|total|jumlah|rata[-\s]*rata|average|avg|revenue|pendapatan|produk|transaksi|harga|pelanggan/.test(t))
    return "metric";
  return null;
}

// ── SQL builder ───────────────────────────────────────────────────────────────

function buildSql(intent: ChartIntent, question: string): string {
  const t   = question.toLowerCase();
  const tbl = "dummydataexcel_fashion_2025_3";

  if (intent === "metric") {
    if (/rata[-\s]*rata|average|avg/.test(t)) {
      if (/penjualan|pendapatan|revenue|omset|grand_total|total/.test(t))
        return `SELECT ROUND(AVG(grand_total),0) AS value, 'Rata-rata Penjualan' AS label FROM ${tbl} WHERE order_status='Completed'`;
      if (/harga|price|unit_price/.test(t))
        return `SELECT ROUND(AVG(unit_price),0) AS value, 'Rata-rata Harga' AS label FROM ${tbl}`;
      if (/quantity|qty|kuantitas/.test(t))
        return `SELECT ROUND(AVG(quantity),2) AS value, 'Rata-rata Quantity' AS label FROM ${tbl}`;
      if (/diskon|discount/.test(t))
        return `SELECT ROUND(AVG(discount_percent),2) AS value, 'Rata-rata Diskon (%)' AS label FROM ${tbl}`;
      return `SELECT ROUND(AVG(grand_total),0) AS value, 'Rata-rata Transaksi' AS label FROM ${tbl}`;
    }
    if (/pendapatan|revenue|omset/.test(t))
      return `SELECT SUM(grand_total) AS value, 'Total Pendapatan' AS label FROM ${tbl} WHERE order_status='Completed'`;
    if (/penjualan|total_sales/.test(t))
      return `SELECT SUM(grand_total) AS value, 'Total Penjualan' AS label FROM ${tbl}`;
    if (/transaksi|order/.test(t))
      return `SELECT COUNT(*) AS value, 'Total Transaksi' AS label FROM ${tbl}`;
    if (/produk/.test(t))
      return `SELECT COUNT(DISTINCT product_name) AS value, 'Total Produk' AS label FROM ${tbl}`;
    if (/harga|price/.test(t))
      return `SELECT ROUND(AVG(unit_price),2) AS value, 'Rata-rata Harga' AS label FROM ${tbl}`;
    if (/pelanggan|customer/.test(t))
      return `SELECT COUNT(DISTINCT customer_name) AS value, 'Total Pelanggan' AS label FROM ${tbl}`;
    if (/diskon|discount/.test(t))
      return `SELECT ROUND(AVG(discount_percent),2) AS value, 'Rata-rata Diskon (%)' AS label FROM ${tbl}`;
    return `SELECT COUNT(*) AS value, 'Total Transaksi' AS label FROM ${tbl}`;
  }

  // Area by non-time dimension (kategori/material/platform/kota)
  // Must be checked BEFORE the time-series block which also catches intent==="area"
  if (intent === "area" && /material|kategori|category/.test(t))
    return `SELECT material AS name, SUM(grand_total) AS value FROM ${tbl} GROUP BY material ORDER BY value DESC LIMIT 8`;
  if (intent === "area" && /platform|channel/.test(t))
    return `SELECT platform AS name, SUM(grand_total) AS value FROM ${tbl} GROUP BY platform ORDER BY value DESC LIMIT 6`;
  if (intent === "area" && /kota|city/.test(t))
    return `SELECT city AS name, SUM(grand_total) AS value FROM ${tbl} GROUP BY city ORDER BY value DESC LIMIT 8`;
  if (intent === "area" && /gender/.test(t))
    return `SELECT gender AS name, COUNT(*) AS value FROM ${tbl} GROUP BY gender`;

  // Time-series (line / area / bar by month)
  if (
    intent === "line" || intent === "area" ||
    (intent === "bar" && /bulan|bulanan|perbulan|per\s*bulan|tren|trend|waktu/.test(t))
  ) {
    const col = /pendapatan|revenue|omset|penjualan|grand_total/.test(t)
      ? "SUM(grand_total)"
      : /quantity|qty|kuantitas/.test(t) ? "SUM(quantity)" : "COUNT(*)";
    return `SELECT DATE_FORMAT(order_date,'%b %Y') AS name, ${col} AS value FROM ${tbl} GROUP BY DATE_FORMAT(order_date,'%Y-%m'),DATE_FORMAT(order_date,'%b %Y') ORDER BY MIN(order_date) LIMIT 12`;
  }

  if (intent === "bar") {
    if (/platform|channel|marketplace/.test(t))
      return `SELECT platform AS name, SUM(grand_total) AS value FROM ${tbl} GROUP BY platform ORDER BY value DESC LIMIT 8`;
    if (/produk|product/.test(t))
      return `SELECT product_name AS name, SUM(grand_total) AS value FROM ${tbl} GROUP BY product_name ORDER BY value DESC LIMIT 10`;
    if (/gender/.test(t))
      return `SELECT gender AS name, COUNT(*) AS value FROM ${tbl} GROUP BY gender ORDER BY value DESC`;
    if (/payment|pembayaran/.test(t))
      return `SELECT payment_method AS name, COUNT(*) AS value FROM ${tbl} GROUP BY payment_method ORDER BY value DESC LIMIT 8`;
    if (/material/.test(t))
      return `SELECT material AS name, SUM(grand_total) AS value FROM ${tbl} GROUP BY material ORDER BY value DESC LIMIT 8`;
    if (/ukuran|size/.test(t))
      return `SELECT size AS name, COUNT(*) AS value FROM ${tbl} GROUP BY size ORDER BY value DESC LIMIT 8`;
    if (/kota|city/.test(t))
      return `SELECT city AS name, SUM(grand_total) AS value FROM ${tbl} GROUP BY city ORDER BY value DESC LIMIT 10`;
    if (/kategori|category/.test(t))
      return `SELECT material AS name, SUM(grand_total) AS value FROM ${tbl} GROUP BY material ORDER BY value DESC LIMIT 8`;
    return `SELECT platform AS name, SUM(grand_total) AS value FROM ${tbl} GROUP BY platform ORDER BY value DESC LIMIT 8`;
  }

  if (intent === "pie" || intent === "doughnut") {
    if (/status/.test(t))
      return `SELECT order_status AS name, COUNT(*) AS value FROM ${tbl} GROUP BY order_status ORDER BY value DESC`;
    if (/platform|channel/.test(t))
      return `SELECT platform AS name, SUM(grand_total) AS value FROM ${tbl} GROUP BY platform ORDER BY value DESC LIMIT 6`;
    if (/gender/.test(t))
      return `SELECT gender AS name, COUNT(*) AS value FROM ${tbl} GROUP BY gender ORDER BY value DESC`;
    if (/payment|pembayaran/.test(t))
      return `SELECT payment_method AS name, COUNT(*) AS value FROM ${tbl} GROUP BY payment_method ORDER BY value DESC LIMIT 6`;
    if (/material|kategori|category/.test(t))
      return `SELECT material AS name, COUNT(*) AS value FROM ${tbl} GROUP BY material ORDER BY value DESC LIMIT 6`;
    if (/ukuran|size/.test(t))
      return `SELECT size AS name, COUNT(*) AS value FROM ${tbl} GROUP BY size ORDER BY value DESC LIMIT 6`;
    if (/produk|product/.test(t))
      return `SELECT product_name AS name, SUM(grand_total) AS value FROM ${tbl} GROUP BY product_name ORDER BY value DESC LIMIT 6`;
    if (/kota|city/.test(t))
      return `SELECT city AS name, COUNT(*) AS value FROM ${tbl} GROUP BY city ORDER BY value DESC LIMIT 6`;
    return `SELECT platform AS name, SUM(grand_total) AS value FROM ${tbl} GROUP BY platform ORDER BY value DESC LIMIT 6`;
  }

  if (intent === "scatter")
    return `SELECT CAST(unit_price AS DECIMAL(15,2)) AS x, CAST(quantity AS DECIMAL(10,2)) AS y, CAST(grand_total AS DECIMAL(15,2)) AS z FROM ${tbl} LIMIT 60`;

  if (intent === "table")
    return `SELECT order_id, customer_name, product_name, platform, quantity, unit_price, grand_total, order_status, order_date FROM ${tbl} ORDER BY order_date DESC LIMIT 20`;

  return `SELECT COUNT(*) AS value, 'Total Transaksi' AS label FROM ${tbl}`;
}

// ── Map intent → new chartType ────────────────────────────────────────────────

function intentToChartType(intent: ChartIntent): ChartType {
  const map: Record<Exclude<ChartIntent, null>, ChartType> = {
    bar:      "bar_chart",
    line:     "line_chart",
    area:     "area_chart",
    pie:      "pie_chart",
    doughnut: "doughnut_chart",
    scatter:  "bar_chart",    // scatter uses bar_chart widget as fallback
    table:    "table_widget",
    metric:   "card_widget",
  };
  return intent ? map[intent] : "card_widget";
}

// Map new chartType → componentName (for WidgetContext / DashboardWidgetGrid)
function chartTypeToComponentName(chartType: ChartType): string {
  const map: Record<ChartType, string> = {
    line_chart:     "LineChartWidget",
    area_chart:     "AreaChartWidget",
    bar_chart:      "BarChartWidget",
    pie_chart:      "PieChartWidget",
    doughnut_chart: "DoughnutChartWidget",
    table_widget:   "TableWidget",
    card_widget:    "MetricCardWidget",
  };
  return map[chartType];
}

// ── Determine xKey / yKey ─────────────────────────────────────────────────────

function getKeys(intent: ChartIntent, question: string): { xKey: string; yKey: string } {
  const t = question.toLowerCase();
  if (intent === "metric") return { xKey: "label", yKey: "value" };
  if (intent === "table")  return { xKey: "order_id", yKey: "grand_total" };
  if (intent === "scatter") return { xKey: "x", yKey: "y" };
  // All chart intents use name/value from GROUP BY queries
  const yKey = /quantity|qty|kuantitas/.test(t) ? "value" : "value";
  return { xKey: "name", yKey };
}

// ── Build new-format widgetConfig ─────────────────────────────────────────────

function buildWidgetConfig(
  intent: ChartIntent,
  question: string,
  rows: Record<string, unknown>[],
  widgetId: string,
): Record<string, unknown> {
  const chartType     = intentToChartType(intent);
  const componentName = chartTypeToComponentName(chartType);
  const { xKey, yKey } = getKeys(intent, question);
  const title = extractTitle(question);

  const interactivityConfig = {
    enableTooltip: true,
    enableClick:   true,
    action:        "SHOW_DETAIL",
  };

  // ── Card widget ─────────────────────────────────────────────────────────
  if (intent === "metric") {
    const row     = rows[0] || {};
    const rawVal  = Number(row.value ?? 0);
    const labelDb = String(row.label ?? title);
    const q       = question.toLowerCase();
    const isAvg   = /rata[-\s]*rata|average|avg/.test(q);
    const isCurrency = /penjualan|pendapatan|revenue|omset|harga|price/.test(q);
    const formatted  = isCurrency
      ? "Rp " + rawVal.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
      : rawVal.toLocaleString("id-ID");
    const icon  = isAvg ? "pi pi-chart-line"
      : /transaksi|order/.test(q) ? "pi pi-arrow-right-arrow-left"
      : /pelanggan|customer/.test(q) ? "pi pi-users"
      : /produk/.test(q) ? "pi pi-box"
      : "pi pi-wallet";
    return {
      id: widgetId,
      type: "card",
      chartType,
      componentName,
      title: labelDb,
      xKey, yKey,
      interactive: false,
      interactivityConfig,
      data: [{ label: labelDb, value: formatted, icon, color: isAvg ? "#06B6D4" : "#6366F1", isPositive: true }],
      // Legacy props for MetricCardWidget
      _legacy: { label: labelDb, value: formatted, change: "", isPositive: true, icon, color: isAvg ? "#06B6D4" : "#6366F1" },
    };
  }

  // ── Table widget ────────────────────────────────────────────────────────
  if (intent === "table") {
    const keys    = rows.length > 0 ? Object.keys(rows[0]) : [];
    const columns = keys.map((k) => ({ key: k, header: k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) }));
    return {
      id: widgetId, type: "table", chartType, componentName, title,
      xKey, yKey, interactive: true, interactivityConfig,
      data: rows, columns,
    };
  }

  // ── Scatter ─────────────────────────────────────────────────────────────
  if (intent === "scatter") {
    return {
      id: widgetId, type: "chart", chartType: "bar_chart", componentName: "ScatterChartWidget",
      title, xKey: "x", yKey: "y", interactive: true, interactivityConfig,
      data: rows, xLabel: "Harga", yLabel: "Quantity",
    };
  }

  // ── Pie / Doughnut ───────────────────────────────────────────────────────
  if (intent === "pie" || intent === "doughnut") {
    const COLORS = ["#6366F1","#06B6D4","#10B981","#F59E0B","#F43F5E","#8B5CF6"];
    const formattedData = rows.map((r, i) => ({
      name:  String(r.name  ?? ""),
      value: Number(r.value ?? 0),
      color: COLORS[i % COLORS.length],
    }));
    const total = formattedData.reduce((s, r) => s + r.value, 0);
    const extra = intent === "doughnut"
      ? { centerValue: total.toLocaleString("id-ID"), centerLabel: "Total" }
      : {};
    return {
      id: widgetId, type: "chart", chartType, componentName, title,
      xKey: "name", yKey: "value", interactive: true, interactivityConfig,
      data: formattedData, ...extra,
    };
  }

  // ── Bar / Line / Area ────────────────────────────────────────────────────
  const chartData = rows.map((r) => ({
    name:  String(r.name  ?? ""),
    value: Number(r.value ?? 0),
  }));

  // Color spec from directive
  const colorMap: Partial<Record<ChartType, string>> = {
    line_chart:  "#8B5CF6",  // Violet
    area_chart:  "#10B981",  // Emerald green
    bar_chart:   "#3B82F6",  // Blue
  };

  return {
    id: widgetId, type: "chart", chartType, componentName, title,
    xKey: "name", yKey: "value",
    interactive: true, interactivityConfig,
    color: colorMap[chartType] ?? "#6366F1",
    data: chartData,
  };
}

function extractTitle(question: string): string {
  const cleaned = question
    .replace(/buatkan|tampilkan|tunjukkan|buat|tolong|saya|mau|minta|chart|widget|grafik|tabel/gi, "")
    .trim();
  return (cleaned.charAt(0).toUpperCase() + cleaned.slice(1)) || "Analisis Data";
}

// ── Sample data fallback ──────────────────────────────────────────────────────

function getSampleData(intent: ChartIntent): Record<string, unknown>[] {
  if (intent === "metric")   return [{ value: 128450000, label: "Total Pendapatan" }];
  if (intent === "scatter")  return Array.from({ length: 20 }, (_, i) => ({ x: 50000 + i * 15000, y: 1 + i % 10, z: 100000 + i * 20000 }));
  if (intent === "table")    return [
    { order_id: "ORD-001", customer_name: "Budi Santoso", product_name: "Kemeja Batik",  platform: "Tokopedia", quantity: 2, unit_price: 125000, grand_total: 250000, order_status: "Completed", order_date: "2025-01-15" },
    { order_id: "ORD-002", customer_name: "Sari Dewi",    product_name: "Dress Floral",  platform: "Shopee",    quantity: 1, unit_price: 185000, grand_total: 185000, order_status: "Pending",   order_date: "2025-01-14" },
  ];
  if (intent === "pie" || intent === "doughnut") return [
    { name: "Shopee", value: 4200 }, { name: "Tokopedia", value: 3800 },
    { name: "TikTok Shop", value: 2100 }, { name: "Lazada", value: 1900 },
  ];
  const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  return months.map((m) => ({ name: m, value: Math.floor(Math.random() * 50000000) + 10000000 }));
}

function summarise(rows: Record<string, unknown>[], intent: ChartIntent): string {
  if (!rows || rows.length === 0) return "Tidak ada data.";
  if (intent === "metric") { const r = rows[0]; return `Nilai: ${r.value}, Label: ${r.label}`; }
  return `${rows.length} baris. Contoh: ${rows.slice(0, 3).map((r) => JSON.stringify(r)).join(", ")}`;
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: { messages?: { role: string; content: string }[] };
  try { body = await request.json(); }
  catch { return NextResponse.json({ success: false, message: "Invalid body" }, { status: 400 }); }

  const messages = body.messages ?? [];
  if (!messages.length) return NextResponse.json({ success: false, message: "Messages required" }, { status: 400 });

  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  logger.info(`[ai/chat] question="${lastUserMsg.slice(0, 80)}"`);

  const intent = detectIntent(lastUserMsg);
  const sql    = intent ? buildSql(intent, lastUserMsg) : null;

  let widgetConfig: Record<string, unknown> | null = null;
  let dbSummary = "";

  if (sql) {
    try {
      const dbRes = await fetch(AI_BACKEND, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql, question: lastUserMsg }),
        signal: AbortSignal.timeout(10000),
      });
      if (dbRes.ok) {
        const dbData = await dbRes.json();
        const rows: Record<string, unknown>[] = dbData.rows ?? dbData.data ?? [];
        widgetConfig = buildWidgetConfig(intent, lastUserMsg, rows, `widget-${Date.now()}`);
        dbSummary    = summarise(rows, intent);
        logger.info(`[ai/chat] rows=${rows.length} intent=${intent} chartType=${widgetConfig.chartType}`);
      } else {
        dbSummary = `DB error ${(await dbRes.json()).message ?? ""}`;
      }
    } catch (err) {
      dbSummary    = "DB tidak tersedia, pakai data sampel.";
      widgetConfig = buildWidgetConfig(intent, lastUserMsg, getSampleData(intent), `widget-sample-${Date.now()}`);
    }
  }

  // Ollama prompt
  const systemCtx = `Kamu adalah Aigovtech, asisten analitik data fashion 2025.
Jawab dalam Bahasa Indonesia yang informatif dan singkat.
${sql       ? `SQL: ${sql}` : ""}
${dbSummary ? `Data: ${dbSummary}` : ""}
${widgetConfig ? `Widget: ${widgetConfig.chartType} — "${widgetConfig.title}"` : ""}
Berikan insight 2-3 kalimat. Jangan ulangi SQL.`;

  const prompt = systemCtx + "\n\n" +
    messages.slice(-8).map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n") +
    "\nAssistant:";

  let reply = "";
  try {
    const up = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, prompt, stream: false }),
      signal: AbortSignal.timeout(120000),
    });
    if (up.ok) { const d = await up.json(); reply = d.response || d.message?.content || ""; }
    else reply = widgetConfig ? `Widget "${widgetConfig.title}" ditambahkan.` : "AI tidak tersedia.";
  } catch {
    reply = widgetConfig ? `Widget **${widgetConfig.title}** ditambahkan ke dashboard.` : "AI tidak tersedia.";
  }

  return NextResponse.json({ success: true, reply, widgetConfig: widgetConfig ?? null });
}
