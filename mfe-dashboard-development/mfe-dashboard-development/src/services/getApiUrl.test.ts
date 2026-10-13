import { getApiUrl } from "./index";

// __APP_KEY__ is provided by jest.setup.ts (globalThis) = "dashboardBok".

describe("getApiUrl", () => {
  it("membangun path same-origin /mfe-api/<APP_KEY>/<path>", () => {
    expect(getApiUrl("dashboardSummary")).toBe(
      "/mfe-api/dashboardBok/dashboard/summary",
    );
  });

  it("menghapus prefix /api/ dari path BFF", () => {
    // dashboardTransactions = "/api/dashboard/transactions"
    expect(getApiUrl("dashboardTransactions")).toBe(
      "/mfe-api/dashboardBok/dashboard/transactions",
    );
  });
});
