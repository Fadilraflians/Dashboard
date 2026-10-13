// Mock responses (served when no session / backend). Referenced by
// ServerUrlMap entries that set `mock`.

export const DASHBOARD_SUMMARY = {
  success: true,
  message: "OK",
  data: {
    stats: [
      { id: "revenue", label: "Total Pendapatan", value: 128450000, unit: "IDR", delta: 12.4, colorKey: "brandCore", icon: "pi pi-wallet" },
      { id: "transactions", label: "Transaksi", value: 3284, unit: "count", delta: 8.1, colorKey: "accentCore", icon: "pi pi-arrow-right-arrow-left" },
      { id: "users", label: "Pengguna Aktif", value: 1920, unit: "count", delta: -2.3, colorKey: "blueCore", icon: "pi pi-users" },
      { id: "success-rate", label: "Tingkat Keberhasilan", value: 98, unit: "percent", delta: 1.2, colorKey: "greenCore", icon: "pi pi-check-circle" },
    ],
    chart: {
      labels: ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"],
      series: [42, 58, 51, 74, 66, 39, 47],
    },
  },
};

export const DASHBOARD_TRANSACTIONS = {
  success: true,
  message: "OK",
  data: [
    { id: "1", reference: "TRX-2026-0001", customer: "Budi Santoso", channel: "Mobile", amount: 1250000, status: "SUCCESS", date: "2026-09-09T08:12:00.000Z" },
    { id: "2", reference: "TRX-2026-0002", customer: "Siti Aminah", channel: "Web", amount: 480000, status: "PENDING", date: "2026-09-09T09:03:00.000Z" },
    { id: "3", reference: "TRX-2026-0003", customer: "Andi Wijaya", channel: "ATM", amount: 2100000, status: "SUCCESS", date: "2026-09-09T09:45:00.000Z" },
    { id: "4", reference: "TRX-2026-0004", customer: "Dewi Lestari", channel: "Mobile", amount: 75000, status: "FAILED", date: "2026-09-09T10:20:00.000Z" },
    { id: "5", reference: "TRX-2026-0005", customer: "Rudi Hartono", channel: "Web", amount: 5600000, status: "SUCCESS", date: "2026-09-09T11:05:00.000Z" },
  ],
};
