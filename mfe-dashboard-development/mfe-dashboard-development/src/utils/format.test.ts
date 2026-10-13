import { formatCurrency, formatNumber, getColor } from "./index";

describe("formatCurrency", () => {
  it("memformat angka menjadi Rupiah tanpa desimal", () => {
    // Intl pakai NBSP/format id-ID; cek bagian penting saja agar stabil.
    const out = formatCurrency(10000);
    expect(out).toContain("Rp");
    expect(out).toContain("10.000");
  });

  it("menangani nol", () => {
    expect(formatCurrency(0)).toContain("0");
  });
});

describe("formatNumber", () => {
  it("memberi pemisah ribuan gaya id-ID", () => {
    expect(formatNumber(1234567)).toBe("1.234.567");
  });
});

describe("getColor", () => {
  it("mengembalikan hex untuk key yang dikenal", () => {
    expect(getColor("brandCore")).toBe("#4f46e5");
  });

  it("fallback ke hitam untuk key tak dikenal", () => {
    // @ts-expect-error — sengaja key invalid untuk menguji fallback.
    expect(getColor("tidakAda")).toBe("#000000");
  });
});
