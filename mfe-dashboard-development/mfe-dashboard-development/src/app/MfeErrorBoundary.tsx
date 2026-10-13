import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Error boundary inside the MFE's own React root. Because it runs within the
 * MFE bundle, it can display the REAL error message (the shell would otherwise
 * only see an opaque cross-origin "Script error."). Useful during development.
 */
export class MfeErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[MFE] render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
          <h3 style={{ color: "#b91c1c", margin: "0 0 8px" }}>
            MFE gagal dirender
          </h3>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 8,
              padding: 12,
              fontSize: 12,
              color: "#7f1d1d",
              overflow: "auto",
            }}
          >
            {this.state.error.message}
            {"\n\n"}
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default MfeErrorBoundary;
