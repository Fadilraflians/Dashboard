// Domain: dashboard — client-side service definitions (types + url + mock).
// Add a new domain by creating src/services/<domain>/index.ts with the same
// shape and registering it in src/services/index.ts.

export interface DashboardStat {
  id: string;
  label: string;
  value: number;
  unit: string;
  delta: number;
  colorKey: string;
  icon: string;
}

export interface DashboardSummaryResponse {
  success: boolean;
  message?: string;
  data: {
    stats: DashboardStat[];
    chart: { labels: string[]; series: number[] };
  };
}

export interface TransactionRow {
  id: string;
  reference: string;
  customer: string;
  channel: string;
  amount: number;
  status: "SUCCESS" | "PENDING" | "FAILED";
  date: string;
}

export interface DashboardTransactionsResponse {
  success: boolean;
  message?: string;
  data: TransactionRow[];
}

// Per-service request/response mapping for this domain.
export interface DashboardServiceMapping {
  dashboardSummary: { body?: undefined; response: DashboardSummaryResponse };
  dashboardTransactions: {
    body?: undefined;
    response: DashboardTransactionsResponse;
  };
}

// serviceKey -> BFF path (/api/<path>).
export const dashboardUrls: Record<keyof DashboardServiceMapping, string> = {
  dashboardSummary: "/api/dashboard/summary",
  dashboardTransactions: "/api/dashboard/transactions",
};

// Mock fallback (used when the BFF/backend is unreachable in dev).
export const dashboardMocks = {
  dashboardSummary: {
    success: true,
    message: "OK",
    data: {
      stats: [
        { id: "revenue", label: "Total Pendapatan", value: 128_450_000, unit: "IDR", delta: 12.4, colorKey: "brandCore", icon: "pi pi-wallet" },
        { id: "transactions", label: "Transaksi", value: 3_284, unit: "count", delta: 8.1, colorKey: "accentCore", icon: "pi pi-arrow-right-arrow-left" },
        { id: "users", label: "Pengguna Aktif", value: 1_920, unit: "count", delta: -2.3, colorKey: "blueCore", icon: "pi pi-users" },
        { id: "success-rate", label: "Tingkat Keberhasilan", value: 98, unit: "percent", delta: 1.2, colorKey: "greenCore", icon: "pi pi-check-circle" },
      ],
      chart: {
        labels: ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"],
        series: [42, 58, 51, 74, 66, 39, 47],
      },
    },
  } satisfies DashboardSummaryResponse,
  dashboardTransactions: {
    success: true,
    message: "OK",
    data: [
      { id: "1", reference: "TRX-2026-0001", customer: "Budi Santoso", channel: "Mobile", amount: 1_250_000, status: "SUCCESS", date: "2026-09-09T08:12:00.000Z" },
      { id: "2", reference: "TRX-2026-0002", customer: "Siti Aminah", channel: "Web", amount: 480_000, status: "PENDING", date: "2026-09-09T09:03:00.000Z" },
      { id: "3", reference: "TRX-2026-0003", customer: "Andi Wijaya", channel: "ATM", amount: 2_100_000, status: "SUCCESS", date: "2026-09-09T09:45:00.000Z" },
      { id: "4", reference: "TRX-2026-0004", customer: "Dewi Lestari", channel: "Mobile", amount: 75_000, status: "FAILED", date: "2026-09-09T10:20:00.000Z" },
      { id: "5", reference: "TRX-2026-0005", customer: "Rudi Hartono", channel: "Web", amount: 5_600_000, status: "SUCCESS", date: "2026-09-09T11:05:00.000Z" },
    ],
  } satisfies DashboardTransactionsResponse,
} as const;
