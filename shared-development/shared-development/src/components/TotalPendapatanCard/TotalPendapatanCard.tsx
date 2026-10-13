import React from "react";
import styles from "./TotalPendapatanCard.module.css";

export interface TotalPendapatanCardProps {
  /** Raw amount in IDR; the card formats it as currency. */
  value: number;
  /** Period-over-period delta in %. Positive = up (green), negative = down. */
  delta?: number;
  /** Loading state — shows a shimmer in place of the value. */
  loading?: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * "Total Pendapatan" card — standalone, self-contained. Label, icon, color and
 * currency formatting are fixed inside this component. The consuming MFE only
 * supplies the raw `value` (and optional `delta`) from its own API.
 */
export default function TotalPendapatanCard({
  value,
  delta,
  loading = false,
}: TotalPendapatanCardProps) {
  const hasDelta = typeof delta === "number";
  const up = (delta ?? 0) >= 0;

  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <span className={styles.icon}>
          <i className="pi pi-wallet" />
        </span>
        {hasDelta && (
          <span className={`${styles.delta} ${up ? styles.up : styles.down}`}>
            {up ? "▲" : "▼"} {Math.abs(delta as number)}%
          </span>
        )}
      </div>

      <p className={styles.label}>Total Pendapatan</p>
      {loading ? (
        <span className={styles.skeleton} aria-hidden />
      ) : (
        <p className={styles.value}>{formatCurrency(value)}</p>
      )}
    </div>
  );
}
