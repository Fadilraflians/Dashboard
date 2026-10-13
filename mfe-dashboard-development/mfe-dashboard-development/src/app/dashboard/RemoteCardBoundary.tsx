import React, { Suspense } from "react";
import styles from "./dashboard.module.css";

interface Props {
  /** Label shown in the error fallback so the user knows which card failed. */
  name: string;
  children: React.ReactNode;
}

interface State {
  failed: boolean;
}

/**
 * Isolates ONE remote card. If the shared remote (sharedUi) is down or the
 * component fails to load/render, only this card shows a compact fallback —
 * the rest of the dashboard (other cards, chart, table) keeps working.
 *
 * React.lazy + Suspense alone does NOT catch a failed remote load; the error
 * propagates up and breaks the whole tree. This Error Boundary contains it.
 */
export class RemoteCardBoundary extends React.Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error(`[dashboard] remote card "${this.props.name}" failed:`, error);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className={styles.cardError}>
          <i className="pi pi-exclamation-triangle" />
          <div>
            <p className={styles.cardErrorTitle}>{this.props.name}</p>
            <p className={styles.cardErrorMsg}>
              Komponen bersama tidak tersedia.
            </p>
          </div>
        </div>
      );
    }

    return (
      <Suspense
        fallback={
          <div className={styles.cardLoading}>
            <i className="pi pi-spin pi-spinner" />
          </div>
        }
      >
        {this.props.children}
      </Suspense>
    );
  }
}

export default RemoteCardBoundary;
