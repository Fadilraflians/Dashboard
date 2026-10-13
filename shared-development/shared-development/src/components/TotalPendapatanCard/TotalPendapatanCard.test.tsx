import React from "react";
import { render, screen } from "@testing-library/react";
import TotalPendapatanCard from "./TotalPendapatanCard";

describe("TotalPendapatanCard", () => {
  it("menampilkan label dan nilai terformat sebagai Rupiah", () => {
    render(<TotalPendapatanCard value={10000} />);
    expect(screen.getByText("Total Pendapatan")).toBeInTheDocument();
    expect(screen.getByText(/Rp.*10\.000/)).toBeInTheDocument();
  });

  it("menampilkan delta positif dengan tanda naik", () => {
    render(<TotalPendapatanCard value={5000} delta={12.4} />);
    expect(screen.getByText(/▲\s*12\.4%/)).toBeInTheDocument();
  });

  it("menampilkan delta negatif dengan tanda turun", () => {
    render(<TotalPendapatanCard value={5000} delta={-3.2} />);
    expect(screen.getByText(/▼\s*3\.2%/)).toBeInTheDocument();
  });

  it("menyembunyikan nilai saat loading (menampilkan shimmer)", () => {
    const { container } = render(
      <TotalPendapatanCard value={9999} loading />,
    );
    // Nilai tidak dirender saat loading.
    expect(screen.queryByText(/Rp.*9\.999/)).not.toBeInTheDocument();
    // Ada elemen shimmer (aria-hidden).
    expect(container.querySelector("[aria-hidden]")).toBeInTheDocument();
  });

  it("tidak menampilkan delta jika prop delta tidak diberikan", () => {
    render(<TotalPendapatanCard value={1000} />);
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });
});
