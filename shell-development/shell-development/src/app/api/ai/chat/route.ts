import { NextRequest, NextResponse } from "next/server";
import { logger } from "../../../../../log.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OLLAMA_URL    = process.env.OLLAMA_URL      || "http://127.0.0.1:11434/api/generate";
const MODEL         = process.env.OLLAMA_MODEL    || "qwen2.5:7b";
const AI_BACKEND    = process.env.AI_BACKEND_URL  || "http://127.0.0.1:3200/api/ai/query";

const TBL = "dummydataexcel_fashion_2025_3";

// ── Types ─────────────────────────────────────────────────────────────────────

type ChartIntent =
  | "bar" | "line" | "area" | "pie" | "doughnut"
  | "scatter" | "table" | "metric" | null;

type ChartType =
  | "line_chart" | "area_chart" | "bar_chart"
  | "pie_chart"  | "doughnut_chart"
  | "table_widget" | "card_widget";

// ── Dimension map: user words → actual DB column + friendly label ─────────────
// Covers every categorical column in the table.

interface DimDef {
  col: string;
  label: string;
  keywords: RegExp;
}

const DIMENSIONS: DimDef[] = [
  { col: "material",        label: "Kategori",          keywords: /\b(material|kategori|category|jenis\s+produk)\b/ },
  { col: "payment_method",  label: "Metode Pembayaran", keywords: /\b(payment|pembayaran|metode\s*bayar|cara\s*bayar)\b/ },
  { col: "platform",        label: "Platform",          keywords: /\b(platform|channel|marketplace|market\s*place)\b/ },
  { col: "gender",          label: "Gender",            keywords: /\b(gender|jenis\s*kelamin)\b/ },
  { col: "size",            label: "Ukuran",            keywords: /\b(size|ukuran)\b/ },
  { col: "city",            label: "Kota",              keywords: /\b(city|kota|kabupaten)\b/ },
  { col: "product_name",    label: "Produk",            keywords: /\b(produk|product|nama\s*produk|barang)\b/ },
  { col: "order_status",    label: "Status Order",      keywords: /\b(status|order\s*status|status\s*order)\b/ },
  { col: "customer_name",   label: "Pelanggan",         keywords: /\b(customer|pelanggan|nama\s*pelanggan|konsumen)\b/ },
  { col: "customer_rating", label: "Rating Pelanggan",  keywords: /\b(rating|customer\s*rating|rating\s*pelanggan|skor)\b/ },
  { col: "order_id",        label: "Order ID",          keywords: /\b(order\s*id|id\s*order|no\s*order|nomor\s*order)\b/ },
];

// ── Metric map: user words → SQL expression + friendly label ──────────────────
// Covers every numeric column in the table.

interface MetricDef {
  expr: string;
  label: string;
  keywords: RegExp;
  isCurrency: boolean;
}

const METRICS: MetricDef[] = [
  { expr: "SUM(grand_total)",        label: "Total Penjualan",      keywords: /\b(penjualan|pendapatan|revenue|omset|grand\s*total|total\s*penjualan)\b/, isCurrency: true },
  { expr: "SUM(total_sales)",        label: "Total Sales",          keywords: /\b(total\s*sales|sales)\b/, isCurrency: true },
  { expr: "SUM(subtotal)",           label: "Total Subtotal",       keywords: /\b(subtotal|sub\s*total)\b/, isCurrency: true },
  { expr: "SUM(discount_amount)",    label: "Total Diskon (Rp)",    keywords: /\b(discount\s*amount|jumlah\s*diskon|nominal\s*diskon|diskon\s*rupiah)\b/, isCurrency: true },
  { expr: "SUM(shipping_fee)",       label: "Total Ongkir",         keywords: /\b(shipping|ongkir|ongkos\s*kirim|biaya\s*kirim)\b/, isCurrency: true },
  { expr: "SUM(unit_price)",         label: "Total Harga",          keywords: /\b(unit\s*price|harga\s*satuan|total\s*harga)\b/, isCurrency: true },
  { expr: "SUM(quantity)",           label: "Total Quantity",       keywords: /\b(quantity|qty|kuantitas|jumlah\s*barang|total\s*qty)\b/, isCurrency: false },
  { expr: "COUNT(*)",                label: "Jumlah Transaksi",     keywords: /\b(transaksi|order|jumlah\s*order|total\s*order)\b/, isCurrency: false },
  { expr: "AVG(grand_total)",        label: "Rata-rata Penjualan",  keywords: /\b(rata[-\s]*rata|average|avg).*(penjualan|pendapatan|revenue|omset|grand\s*total)|\b(penjualan|pendapatan).*(rata[-\s]*rata|average|avg)\b/, isCurrency: true },
  { expr: "AVG(unit_price)",         label: "Rata-rata Harga",      keywords: /\b(harga|price|unit\s*price).*(rata[-\s]*rata|average|avg)|\b(rata[-\s]*rata|average|avg).*(harga|price)\b/, isCurrency: true },
  { expr: "AVG(discount_percent)",   label: "Rata-rata Diskon (%)", keywords: /\b(diskon|discount\s*percent|discount).*(rata[-\s]*rata|average|avg)|\b(rata[-\s]*rata|average|avg).*(diskon|discount\s*percent|discount)\b/, isCurrency: false },
  { expr: "AVG(customer_rating)",    label: "Rata-rata Rating",     keywords: /\b(rata[-\s]*rata|average|avg).*(rating)|\b(rating).*(rata[-\s]*rata|average|avg)\b/, isCurrency: false },
  { expr: "COUNT(DISTINCT product_name)",  label: "Total Produk",    keywords: /\b(total\s*produk|jumlah\s*produk)\b/, isCurrency: false },
  { expr: "COUNT(DISTINCT customer_name)", label: "Total Pelanggan", keywords: /\b(total\s*pelanggan|jumlah\s*pelanggan)\b/, isCurrency: false },
];

// ── Time keywords ─────────────────────────────────────────────────────────────

const TIME_RE = /\b(bulan|bulanan|perbulan|per\s*bulan|tren|trend|waktu|monthly|per\s*month|harian|per\s*hari|tahunan)\b/;

// ── Helpers ───────────────────────────────────────────────────────────────────

function pickDimension(text: string): DimDef | null {
  const t = text.toLowerCase();
  for (const d of DIMENSIONS) if (d.keywords.test(t)) return d;
  return null;
}

function pickMetric(text: string): MetricDef {
  const t = text.toLowerCase();
  for (const m of METRICS) if (m.keywords.test(t)) return m;
  if (/\b(berapa|total|jumlah|sum|nominal)\b/.test(t)) return METRICS[0];
  return METRICS[6]; // COUNT(*)
}

function hasTime(text: string): boolean {
  return TIME_RE.test(text.toLowerCase());
}

// Returns true if the user's question mentions anything the AI understands
// (any dimension, metric, time word, or chart/table keyword). If false,
// the data the user asks about is not in our database.
function hasKnownTerm(text: string): boolean {
  const t = text.toLowerCase();
  for (const d of DIMENSIONS) if (d.keywords.test(t)) return true;
  for (const m of METRICS) if (m.keywords.test(t)) return true;
  if (TIME_RE.test(t)) return true;
  if (/\b(chart|grafik|tabel|table|bar|line|area|pie|doughnut|donut|scatter|card|widget|batang|garis)\b/.test(t)) return true;
  return false;
}

// ── Intent detection ──────────────────────────────────────────────────────────

function detectIntent(text: string): ChartIntent {
  const t = text.toLowerCase();
  if (/bar\s*chart|barchart|grafik\s*batang|chart\s*batang|\bbatang\b/.test(t))   return "bar";
  if (/line\s*chart|linechart|grafik\s*garis|chart\s*garis/.test(t))   return "line";
  if (/area\s*chart|areachart|grafik\s*area|chart\s*area/.test(t))     return "area";
  if (/donut|doughnut|donat|ring/.test(t))                              return "doughnut";
  if (/pie\s*chart|piechart|grafik\s*pie|chart\s*pie|\bpie\b/.test(t)) return "pie";
  if (/scatter|titik|korelasi/.test(t))                                 return "scatter";
  if (/tabel|table|list\s*data|daftar\s*data/.test(t))                  return "table";
  if (TIME_RE.test(t))                                                  return "line";
  if (/berapa|total|jumlah|rata[-\s]*rata|average|avg|revenue|pendapatan|produk|transaksi|harga|pelanggan|penjualan|omset|diskon|quantity|qty|sales|subtotal|ongkir|rating/.test(t))
    return "metric";
  return null;
}

// ── SQL builder ───────────────────────────────────────────────────────────────

interface SqlResult {
  sql: string;
  isMultiSeries: boolean;
  dimension?: DimDef;
  metric: MetricDef;
  xLabel: string;
  yLabel: string;
}

function buildSql(intent: ChartIntent, question: string): SqlResult | null {
  if (!intent) return null;
  const dim  = pickDimension(question);
  const met  = pickMetric(question);
  const time = hasTime(question);

  // ── Multi-series: dimension + time (e.g. "kategori per bulan") ────────────
  if (dim && time && (intent === "line" || intent === "area" || intent === "bar")) {
    const sql = `SELECT ${dim.col} AS series_name, DATE_FORMAT(order_date,'%b %Y') AS month, ${met.expr} AS value FROM ${TBL} GROUP BY ${dim.col}, DATE_FORMAT(order_date,'%Y-%m'), DATE_FORMAT(order_date,'%b %Y') ORDER BY DATE_FORMAT(order_date,'%Y-%m'), ${dim.col} LIMIT 120`;
    return {
      sql, isMultiSeries: true, dimension: dim, metric: met,
      xLabel: "Bulan", yLabel: met.label,
    };
  }

  // ── Metric (card) ──────────────────────────────────────────────────────────
  if (intent === "metric") {
    return {
      sql: `SELECT ${met.expr} AS value, '${met.label}' AS label FROM ${TBL}`,
      isMultiSeries: false, metric: met,
      xLabel: "", yLabel: "",
    };
  }

  // ── Time-series single (no dimension) ──────────────────────────────────────
  if (time && (intent === "line" || intent === "area" || intent === "bar")) {
    const sql = `SELECT DATE_FORMAT(order_date,'%b %Y') AS name, ${met.expr} AS value FROM ${TBL} GROUP BY DATE_FORMAT(order_date,'%Y-%m'), DATE_FORMAT(order_date,'%b %Y') ORDER BY DATE_FORMAT(order_date,'%Y-%m') LIMIT 12`;
    return {
      sql, isMultiSeries: false, metric: met,
      xLabel: "Bulan", yLabel: met.label,
    };
  }

  // ── Line / Area by dimension (no time) ─────────────────────────────────────
  // Fix: previously returned null → no widget shown. Now charts the dimension
  // on the X axis with the chosen metric on the Y axis.
  if (intent === "line" || intent === "area") {
    if (dim) {
      const sql = `SELECT ${dim.col} AS name, ${met.expr} AS value FROM ${TBL} GROUP BY ${dim.col} ORDER BY value DESC LIMIT 12`;
      return { sql, isMultiSeries: false, metric: met, xLabel: dim.label, yLabel: met.label };
    }
    // No dimension specified → default to platform breakdown
    return {
      sql: `SELECT platform AS name, ${met.expr} AS value FROM ${TBL} GROUP BY platform ORDER BY value DESC LIMIT 8`,
      isMultiSeries: false, metric: met, xLabel: "Platform", yLabel: met.label,
    };
  }

  // ── Bar by dimension (no time) ─────────────────────────────────────────────
  if (intent === "bar") {
    if (dim) {
      const sql = `SELECT ${dim.col} AS name, ${met.expr} AS value FROM ${TBL} GROUP BY ${dim.col} ORDER BY value DESC LIMIT 10`;
      return { sql, isMultiSeries: false, metric: met, xLabel: dim.label, yLabel: met.label };
    }
    return {
      sql: `SELECT platform AS name, ${met.expr} AS value FROM ${TBL} GROUP BY platform ORDER BY value DESC LIMIT 8`,
      isMultiSeries: false, metric: met, xLabel: "Platform", yLabel: met.label,
    };
  }

  // ── Pie / Doughnut by dimension ────────────────────────────────────────────
  if (intent === "pie" || intent === "doughnut") {
    if (dim) {
      const sql = `SELECT ${dim.col} AS name, ${met.expr === "COUNT(*)" ? "COUNT(*)" : met.expr} AS value FROM ${TBL} GROUP BY ${dim.col} ORDER BY value DESC LIMIT 8`;
      return { sql, isMultiSeries: false, metric: met, xLabel: dim.label, yLabel: met.label };
    }
    return {
      sql: `SELECT platform AS name, COUNT(*) AS value FROM ${TBL} GROUP BY platform ORDER BY value DESC LIMIT 6`,
      isMultiSeries: false, metric: METRICS[6], xLabel: "Platform", yLabel: "Jumlah",
    };
  }

  // ── Scatter ────────────────────────────────────────────────────────────────
  if (intent === "scatter") {
    return {
      sql: `SELECT CAST(unit_price AS DECIMAL(15,2)) AS x, CAST(quantity AS DECIMAL(10,2)) AS y, CAST(grand_total AS DECIMAL(15,2)) AS z FROM ${TBL} LIMIT 60`,
      isMultiSeries: false, metric: met, xLabel: "Harga", yLabel: "Quantity",
    };
  }

  // ── Table ──────────────────────────────────────────────────────────────────
  if (intent === "table") {
    return {
      sql: `SELECT order_id, customer_name, product_name, platform, quantity, unit_price, grand_total, order_status, order_date FROM ${TBL} ORDER BY order_date DESC LIMIT 20`,
      isMultiSeries: false, metric: met, xLabel: "", yLabel: "",
    };
  }

  return null;
}

// ── Map intent → chartType ────────────────────────────────────────────────────

function intentToChartType(intent: ChartIntent): ChartType {
  const map: Record<Exclude<ChartIntent, null>, ChartType> = {
    bar:      "bar_chart",
    line:     "line_chart",
    area:     "area_chart",
    pie:      "pie_chart",
    doughnut: "doughnut_chart",
    scatter:  "bar_chart",
    table:    "table_widget",
    metric:   "card_widget",
  };
  return intent ? map[intent] : "card_widget";
}

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

// ── Pivot multi-series rows → series[] ────────────────────────────────────────

function pivotToSeries(
  rows: Record<string, unknown>[],
  dimLabel: string,
): { name: string; data: { name: string; value: number }[] }[] {
  const monthOrder: string[] = [];
  const seriesMap = new Map<string, Map<string, number>>();

  for (const r of rows) {
    const sName = String(r.series_name ?? "");
    const month = String(r.month ?? "");
    const val   = Number(r.value ?? 0);
    if (!month) continue;
    if (!monthOrder.includes(month)) monthOrder.push(month);
    if (!seriesMap.has(sName)) seriesMap.set(sName, new Map());
    seriesMap.get(sName)!.set(month, val);
  }

  return Array.from(seriesMap.entries()).map(([sName, monthMap]) => ({
    name: sName || dimLabel,
    data: monthOrder.map((m) => ({ name: m, value: monthMap.get(m) ?? 0 })),
  }));
}

// ── Build widget config ───────────────────────────────────────────────────────

const CARD_ICONS: Record<string, string> = {
  "Total Penjualan":      "pi pi-wallet",
  "Rata-rata Penjualan":  "pi pi-chart-line",
  "Total Quantity":       "pi pi-box",
  "Jumlah Transaksi":     "pi pi-arrow-right-arrow-left",
  "Rata-rata Harga":      "pi pi-tag",
  "Rata-rata Diskon (%)": "pi pi-percentage",
  "Total Produk":         "pi pi-box",
  "Total Pelanggan":      "pi pi-users",
  "Total Sales":          "pi pi-chart-bar",
  "Total Subtotal":       "pi pi-calculator",
  "Total Diskon (Rp)":    "pi pi-percentage",
  "Total Ongkir":         "pi pi-truck",
  "Total Harga":          "pi pi-tag",
  "Rata-rata Rating":     "pi pi-star",
};

const CARD_COLORS: Record<string, string> = {
  "Total Penjualan":      "#6366F1",
  "Rata-rata Penjualan":  "#06B6D4",
  "Total Quantity":       "#10B981",
  "Jumlah Transaksi":     "#8B5CF6",
  "Rata-rata Harga":      "#F59E0B",
  "Rata-rata Diskon (%)": "#F43F5E",
  "Total Produk":         "#EC4899",
  "Total Pelanggan":      "#14B8A6",
  "Total Sales":          "#3B82F6",
  "Total Subtotal":       "#84CC16",
  "Total Diskon (Rp)":    "#F43F5E",
  "Total Ongkir":         "#A855F7",
  "Total Harga":          "#F59E0B",
  "Rata-rata Rating":     "#EAB308",
};

function buildWidgetConfig(
  intent: ChartIntent,
  question: string,
  sqlRes: SqlResult,
  rows: Record<string, unknown>[],
  widgetId: string,
): Record<string, unknown> {
  const chartType     = intentToChartType(intent);
  const componentName = chartTypeToComponentName(chartType);
  const title = extractTitle(question);
  const { xLabel, yLabel } = sqlRes;

  const interactivityConfig = { enableTooltip: true, enableClick: true, action: "SHOW_DETAIL" };

  // ── Card widget ─────────────────────────────────────────────────────────
  if (intent === "metric") {
    const row    = rows[0] || {};
    const rawVal = Number(row.value ?? 0);
    const label  = String(row.label ?? title);
    const isCurrency = sqlRes.metric.isCurrency;
    const formatted = isCurrency
      ? "Rp " + rawVal.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
      : rawVal.toLocaleString("id-ID");
    const icon  = CARD_ICONS[label]  ?? "pi pi-chart-bar";
    const color = CARD_COLORS[label] ?? "#6366F1";
    return {
      id: widgetId, type: "card", chartType, componentName, title: label,
      xKey: "label", yKey: "value", interactive: false, interactivityConfig,
      data: [{ label, value: formatted, icon, color, isPositive: true }],
      _legacy: { label, value: formatted, change: "", isPositive: true, icon, color },
    };
  }

  // ── Table widget ────────────────────────────────────────────────────────
  if (intent === "table") {
    const keys    = rows.length > 0 ? Object.keys(rows[0]) : [];
    const columns = keys.map((k) => ({ key: k, header: k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) }));
    return {
      id: widgetId, type: "table", chartType, componentName, title,
      xKey: "order_id", yKey: "grand_total", interactive: true, interactivityConfig,
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

  // ── Multi-series (line/area/bar by dimension + time) ────────────────────
  if (sqlRes.isMultiSeries && rows.length > 0) {
    const series = pivotToSeries(rows, sqlRes.dimension?.label ?? "Seri");
    return {
      id: widgetId, type: "chart", chartType: "line_chart", componentName: "LineChartWidget", title,
      xKey: "name", yKey: "value", interactive: true, interactivityConfig,
      color: "#8B5CF6",
      series, xLabel, yLabel,
      data: [],
    };
  }

  // ── Pie / Doughnut ──────────────────────────────────────────────────────
  if (intent === "pie" || intent === "doughnut") {
    const COLORS = ["#6366F1","#06B6D4","#10B981","#F59E0B","#F43F5E","#8B5CF6","#EC4899","#14B8A6"];
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
      data: formattedData, xLabel, yLabel, ...extra,
    };
  }

  // ── Bar / Line / Area (single series) ───────────────────────────────────
  const chartData = rows.map((r) => ({
    name:  String(r.name  ?? ""),
    value: Number(r.value ?? 0),
  }));
  const colorMap: Partial<Record<ChartType, string>> = {
    line_chart: "#8B5CF6", area_chart: "#10B981", bar_chart: "#3B82F6",
  };
  return {
    id: widgetId, type: "chart", chartType, componentName, title,
    xKey: "name", yKey: "value", interactive: true, interactivityConfig,
    color: colorMap[chartType] ?? "#6366F1",
    data: chartData, xLabel, yLabel,
  };
}

function extractTitle(question: string): string {
  const cleaned = question
    .replace(/buatkan|tampilkan|tunjukkan|buat|tolong|saya|mau|minta|chart|widget|grafik|tabel|per bulan|perbulan|bulanan|berdasarkan/gi, "")
    .trim();
  return (cleaned.charAt(0).toUpperCase() + cleaned.slice(1)) || "Analisis Data";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

  // ── Check if the user's question is about data we actually have ──────────
  if (!hasKnownTerm(lastUserMsg)) {
    return NextResponse.json({
      success: true,
      reply: "Maaf, data tersebut tidak ada di database kami. Coba tanyakan seputar penjualan, produk, pelanggan, platform, metode pembayaran, status order, kota, gender, ukuran, rating, atau grafik/tabel lainnya.",
      widgetConfig: null,
    });
  }

  const intent  = detectIntent(lastUserMsg);
  const sqlRes  = intent ? buildSql(intent, lastUserMsg) : null;

  let widgetConfig: Record<string, unknown> | null = null;
  let dbSummary = "";

  if (sqlRes) {
    try {
      const dbRes = await fetch(AI_BACKEND, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: sqlRes.sql, question: lastUserMsg }),
        signal: AbortSignal.timeout(10000),
      });
      if (dbRes.ok) {
        const dbData = await dbRes.json();
        const rows: Record<string, unknown>[] = dbData.rows ?? dbData.data ?? [];
        widgetConfig = buildWidgetConfig(intent, lastUserMsg, sqlRes, rows, `widget-${Date.now()}`);
        dbSummary    = summarise(rows, intent);
        logger.info(`[ai/chat] rows=${rows.length} intent=${intent} chartType=${widgetConfig.chartType}`);
      } else {
        dbSummary = `DB error ${(await dbRes.json()).message ?? ""}`;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[ai/chat] DB query failed: ${msg}`);
      return NextResponse.json({
        success: false,
        reply: "Maaf, tidak dapat terhubung ke database. Pastikan mock-backend (port 3200) dan MySQL sedang berjalan.",
        widgetConfig: null,
      });
    }
  }

  // Ollama prompt
  const systemCtx = `Kamu adalah Aigovtech, asisten analitik data fashion 2025.
Jawab dalam Bahasa Indonesia yang informatif dan singkat.
${sqlRes?.sql ? `SQL: ${sqlRes.sql}` : ""}
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
