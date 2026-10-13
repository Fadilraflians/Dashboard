import React from "react";
import styles from "./TransaksiCard.module.css";

export interface TransaksiCardProps {
  /** Raw transaction count; the card formats it with thousands separators. */
  value: number;
  /** Period-over-period delta in %. Positive = up (green), negative = down. */
  delta?: number;
  /** Loading state — shows a shimmer in place of the value. */
  loading?: boolean;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

/**
 * "Transaksi" card — standalone, self-contained. Label, icon, color and number
 * formatting are fixed inside this component. The consuming MFE only supplies
 * the raw `value` (and optional `delta`) from its own API.
 */
export default function TransaksiCard({
  value,
  delta,
  loading = false,
}: TransaksiCardProps) {
  const hasDelta = typeof delta === "number";
  const up = (delta ?? 0) >= 0;

  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <span className={styles.icon}>
          <i className="pi pi-arrow-right-arrow-left" />
        </span>
        {hasDelta && (
          <span className={`${styles.delta} ${up ? styles.up : styles.down}`}>
            {up ? "▲" : "▼"} {Math.abs(delta as number)}%
          </span>
        )}
      </div>

      <p className={styles.label}>Transaksi</p>
      {loading ? (
        <span className={styles.skeleton} aria-hidden />
      ) : (
        <p className={styles.value}>{formatNumber(value)}</p>
      )}
    </div>
  );
}
