const mysql = require("mysql2");
const http = require("node:http");

const PORT = Number(process.env.MOCK_BACKEND_PORT || 3200);
const HOST = process.env.MOCK_BACKEND_HOST || "127.0.0.1";

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "dashboard_db",
  connectionLimit: 5,
  connectTimeout: 5000,
});

// ── Mock fallback data ────────────────────────────────────────────────────────

const mockData = {
  "dashboard/summary": {
    success: true,
    data: {
      totalPendapatan: 1250000000,
      totalTransaksi: 4523,
      totalUser: 1234,
      pertumbuhan: 12.5,
      period: "2026-10",
    },
  },
  "dashboard/transactions": {
    success: true,
    data: {
      data: [
        { id: "TXN-001", date: "2026-10-10", amount: 2500000, status: "success", user: "dev@bni.co.id" },
        { id: "TXN-002", date: "2026-10-10", amount: 1800000, status: "pending", user: "admin@bni.co.id" },
        { id: "TXN-003", date: "2026-10-09", amount: 3200000, status: "success", user: "user@bni.co.id" },
        { id: "TXN-004", date: "2026-10-09", amount: 950000, status: "failed", user: "test@bni.co.id" },
        { id: "TXN-005", date: "2026-10-08", amount: 4100000, status: "success", user: "dev@bni.co.id" },
      ],
      total: 5,
      page: 1,
      limit: 10,
    },
  },
  "roles/list": {
    success: true,
    data: {
      data: [
        { id: "role-1", name: "Super Admin", description: "Full access", userCount: 2 },
        { id: "role-2", name: "Admin", description: "Admin access", userCount: 5 },
        { id: "role-3", name: "User", description: "Regular user", userCount: 120 },
        { id: "role-4", name: "Viewer", description: "Read-only", userCount: 34 },
      ],
      total: 4,
      page: 1,
      limit: 10,
    },
  },
  "users/list": {
    success: true,
    data: {
      data: [
        { id: "user-1", name: "Dev User", email: "dev@bni.co.id", role: "Super Admin", status: "active" },
        { id: "user-2", name: "Admin User", email: "admin@bni.co.id", role: "Admin", status: "active" },
        { id: "user-3", name: "Regular User", email: "user@bni.co.id", role: "User", status: "active" },
      ],
      total: 3,
      page: 1,
      limit: 10,
    },
  },
};

// ── SQL map for standard GET routes ──────────────────────────────────────────

const SQL_MAP = {
  "dashboard/summary": "SELECT * FROM dashboard_summary LIMIT 1",
  "dashboard/transactions":
    "SELECT id, order_id as reference, customer_name as customer, platform as channel, grand_total as amount, CASE WHEN order_status = 'Completed' THEN 'SUCCESS' WHEN order_status = 'Pending' THEN 'PENDING' WHEN order_status = 'Returned' THEN 'FAILED' ELSE 'PENDING' END as status, order_date as date FROM dummydataexcel_fashion_2025_3 LIMIT 10",
  "roles/list":
    "SELECT id, name as code, name, description, 'User' as userType, 1 as isActive, 5 as permissionCount, NOW() as createdAt FROM roles LIMIT 10",
  "users/list": "SELECT * FROM users LIMIT 10",
};

// ── Allowed SQL validator (whitelist-only approach) ───────────────────────────
// Only SELECT statements against the fashion table are permitted.

const ALLOWED_TABLE = "dummydataexcel_fashion_2025_3";
const ALLOWED_COLS = new Set([
  "order_id", "customer_name", "product_name", "category", "platform",
  "qty", "unit_price", "grand_total", "order_status", "order_date", "stock",
]);

/**
 * Validates that a SQL string is a safe SELECT-only query against
 * the permitted table. Returns { ok: true } or { ok: false, reason }.
 */
function validateSql(sql) {
  if (!sql || typeof sql !== "string") return { ok: false, reason: "SQL kosong." };
  const normalized = sql.trim().replace(/\s+/g, " ");

  // Must start with SELECT
  if (!/^SELECT\s/i.test(normalized))
    return { ok: false, reason: "Hanya SELECT yang diizinkan." };

  // Must not contain DML/DDL
  if (/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|REPLACE|MERGE|EXEC|EXECUTE|CALL|GRANT|REVOKE)\b/i.test(normalized))
    return { ok: false, reason: "DML/DDL tidak diizinkan." };

  // Must reference the allowed table
  if (!normalized.toLowerCase().includes(ALLOWED_TABLE.toLowerCase()))
    return { ok: false, reason: `Hanya kueri ke tabel ${ALLOWED_TABLE} yang diizinkan.` };

  // Must not contain subquery to other tables (simple check)
  const fromMatches = normalized.match(/FROM\s+([`"]?[\w]+[`"]?)/gi) || [];
  for (const fm of fromMatches) {
    const tbl = fm.replace(/FROM\s+/i, "").replace(/[`"]/g, "").toLowerCase();
    if (tbl !== ALLOWED_TABLE.toLowerCase() && tbl !== "") {
      return { ok: false, reason: `Akses ke tabel "${tbl}" tidak diizinkan.` };
    }
  }

  return { ok: true };
}

// ── DB helpers ────────────────────────────────────────────────────────────────

function queryDb(sql) {
  return new Promise((resolve) => {
    pool.query(sql, (err, results) => {
      if (err) {
        console.error("[mock-backend] SQL error:", err.message);
        resolve(null);
      } else {
        resolve(results);
      }
    });
  });
}

function resolveRoute(pathname) {
  return pathname.replace(/^\/api\//, "").replace(/\/$/, "");
}

// ── Read full request body ────────────────────────────────────────────────────

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

// ── Standard GET route handler ────────────────────────────────────────────────

async function buildResponse(pathname) {
  const route = resolveRoute(pathname);
  const sql = SQL_MAP[route];
  const fallback = mockData[route];

  if (sql) {
    const results = await queryDb(sql);
    if (results) {
      let body;
      if (route === "dashboard/transactions" || route === "roles/list") {
        body = { success: true, data: results };
      } else if (route === "dashboard/summary") {
        const row = results[0] || {};
        body = {
          success: true,
          data: {
            stats: [
              { id: "revenue", label: "Total Pendapatan", value: Number(row.totalPendapatan || 0), unit: "IDR", delta: 12.4, colorKey: "brandCore", icon: "pi pi-wallet" },
              { id: "transactions", label: "Transaksi", value: Number(row.totalTransaksi || 0), unit: "count", delta: 8.1, colorKey: "accentCore", icon: "pi pi-arrow-right-arrow-left" },
              { id: "users", label: "Pengguna Aktif", value: Number(row.totalUser || 0), unit: "count", delta: -2.3, colorKey: "blueCore", icon: "pi pi-users" },
              { id: "success-rate", label: "Tingkat Keberhasilan", value: 98, unit: "percent", delta: 1.2, colorKey: "greenCore", icon: "pi pi-check-circle" },
            ],
            chart: {
              labels: ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"],
              series: [42, 58, 51, 74, 66, 39, 47],
            },
          },
        };
      } else {
        body = Array.isArray(results)
          ? { success: true, data: { data: results, total: results.length, page: 1, limit: 10 } }
          : { success: true, data: results[0] || results };
      }
      return { status: 200, body };
    }
  }

  if (fallback) return { status: 200, body: fallback };

  return {
    status: 404,
    body: { success: false, message: "No mock for " + pathname, status: 404 },
  };
}

// ── AI query handler (POST /api/ai/query) ─────────────────────────────────────
// Called by the Next.js AI chat route to execute Text-to-SQL queries.

async function handleAiQuery(req, res) {
  let payload;
  try {
    payload = await readBody(req);
  } catch {
    const err = JSON.stringify({ success: false, message: "Invalid JSON" });
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(err);
    return;
  }

  const { sql, question } = payload;
  console.log(`[mock-backend] [ai/query] question="${(question || "").slice(0, 80)}" sql="${(sql || "").slice(0, 120)}"`);

  // Validate
  const validation = validateSql(sql);
  if (!validation.ok) {
    console.warn("[mock-backend] [ai/query] SQL rejected:", validation.reason);
    const body = JSON.stringify({ success: false, message: validation.reason, rows: [] });
    res.writeHead(400, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) });
    res.end(body);
    return;
  }

  // Execute
  const results = await queryDb(sql);

  if (results === null) {
    // DB error — return empty rows so the shell can use sample data
    const body = JSON.stringify({
      success: false,
      message: "Database query failed.",
      rows: [],
    });
    res.writeHead(500, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) });
    res.end(body);
    return;
  }

  // Serialize BigInt / Decimal values that JSON.stringify chokes on
  const rows = JSON.parse(
    JSON.stringify(results, (_key, val) =>
      typeof val === "bigint" ? Number(val) : val,
    ),
  );

  const body = JSON.stringify({ success: true, rows, total: rows.length });
  res.writeHead(200, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
    "Access-Control-Allow-Origin": "*",
  });
  res.end(body);
}

// ── HTTP server ───────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${HOST}:${PORT}`);

  // POST /api/ai/query — Text-to-SQL endpoint for the AI chat route
  if (req.method === "POST" && url.pathname === "/api/ai/query") {
    await handleAiQuery(req, res);
    return;
  }

  // All other routes — standard GET mock handler
  const { status, body } = await buildResponse(url.pathname);
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(json),
    "Access-Control-Allow-Origin": "*",
  });
  res.end(json);
});

server.listen(PORT, HOST, () => {
  console.log(`[mock-backend] listening on http://${HOST}:${PORT}`);
  console.log(`[mock-backend] MySQL: ${process.env.MYSQL_HOST || "127.0.0.1"}:${process.env.MYSQL_PORT || 3306}/${process.env.MYSQL_DATABASE || "dashboard_db"}`);
  console.log(`[mock-backend] AI endpoint: POST http://${HOST}:${PORT}/api/ai/query`);
});

server.on("error", (err) => {
  console.error("[mock-backend] error:", err.message);
  process.exit(1);
});
