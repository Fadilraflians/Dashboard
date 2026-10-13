"use client";

/**
 * DashboardWidgetGrid
 *
 * Free-form canvas where every AI widget can be:
 *  • Dragged freely by its title bar
 *  • Resized horizontally and vertically by the resize handle (bottom-right corner)
 *
 * Each widget is rendered in an isolated DOM node via window.__sharedUiRender
 * (sharedUi's own ReactDOM.createRoot) to avoid the two-React-instance problem.
 */

import React, {
  useEffect, useRef, useState, useCallback, useLayoutEffect,
} from "react";
import { useWidgets } from "@/context/WidgetContext";
import type { WidgetConfig, ComponentName } from "@/context/WidgetContext";

// ─── MF container types ───────────────────────────────────────────────────────
type MfeContainer = {
  init: (scope: unknown) => Promise<void> | void;
  get: (module: string) => Promise<() => { default: unknown }>;
};

// ─── Widget module map ────────────────────────────────────────────────────────
const MODULE_MAP: Record<ComponentName, string> = {
  MetricCardWidget:    "./MetricCardWidget",
  BarChartWidget:      "./BarChartWidget",
  LineChartWidget:     "./LineChartWidget",
  AreaChartWidget:     "./AreaChartWidget",
  PieChartWidget:      "./PieChartWidget",
  DoughnutChartWidget: "./DoughnutChartWidget",
  ScatterChartWidget:  "./ScatterChartWidget",
  TableWidget:         "./TableWidget",
};

// ─── Default sizes per widget type ───────────────────────────────────────────
const DEFAULT_SIZE: Record<ComponentName, { w: number; h: number }> = {
  MetricCardWidget:    { w: 280, h: 130 },
  BarChartWidget:      { w: 520, h: 320 },
  LineChartWidget:     { w: 520, h: 320 },
  AreaChartWidget:     { w: 520, h: 320 },
  PieChartWidget:      { w: 420, h: 300 },
  DoughnutChartWidget: { w: 420, h: 300 },
  ScatterChartWidget:  { w: 520, h: 320 },
  TableWidget:         { w: 700, h: 360 },
};

// ─── Singletons for MF loading ────────────────────────────────────────────────
let containerPromise: Promise<MfeContainer> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const componentCache = new Map<string, React.ComponentType<any>>();

function getSharedUrl() {
  let url: string;
  if (typeof window !== "undefined") {
    const w = window as unknown as { __MFE_RUNTIME__?: { sharedUrl?: string } };
    if (w.__MFE_RUNTIME__?.sharedUrl) url = w.__MFE_RUNTIME__.sharedUrl;
    else url = process.env.NEXT_PUBLIC_SHARED_URL || "http://localhost:9000";
  } else {
    url = process.env.NEXT_PUBLIC_SHARED_URL || "http://localhost:9000";
  }
  // SHARED_URL may already include /remoteEntry.js; strip it so the
  // caller can append /remoteEntry.js once without doubling it.
  return url.replace(/\/remoteEntry\.js\/?$/, "");
}

function isStale() {
  if (!containerPromise) return false;
  const c = (window as Record<string, unknown>)["sharedUi"] as MfeContainer | undefined;
  return !c || typeof c.get !== "function";
}

async function getContainer(): Promise<MfeContainer> {
  if (isStale()) {
    containerPromise = null;
    componentCache.clear();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__sharedUiRender = undefined;
  }
  if (containerPromise) return containerPromise;

  containerPromise = new Promise<MfeContainer>((resolve, reject) => {
    // ── Already loaded by mfe-dashboard or a previous call ──────────────────
    const existing = (window as Record<string, unknown>)["sharedUi"] as MfeContainer | undefined;
    if (existing && typeof existing.get === "function") {
      loadRemoteReactDom(existing).catch(() => {});
      resolve(existing);
      return;
    }

    // ── Check if remoteEntry script already in <head> (avoid duplicate inject) ──
    const sharedUrl = getSharedUrl();
    const scriptSrc = `${sharedUrl}/remoteEntry.js`;
    const existing_script = document.querySelector(`script[src="${scriptSrc}"]`);

    if (existing_script) {
      // Script tag exists but window.sharedUi not ready yet — poll for it
      let attempts = 0;
      const poll = setInterval(() => {
        const c = (window as Record<string, unknown>)["sharedUi"] as MfeContainer | undefined;
        if (c && typeof c.get === "function") {
          clearInterval(poll);
          loadRemoteReactDom(c).catch(() => {});
          resolve(c);
        } else if (++attempts > 50) {
          clearInterval(poll);
          // Script exists but container never appeared — remove and re-inject
          existing_script.remove();
          containerPromise = null;
          resolve(getContainer()); // retry fresh
        }
      }, 100);
      return;
    }

    // ── Inject fresh script ──────────────────────────────────────────────────
    const script = document.createElement("script");
    script.src = scriptSrc;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = async () => {
      const container = (window as Record<string, unknown>)["sharedUi"] as MfeContainer | undefined;
      if (!container) {
        // Script loaded but container not on window — try polling
        let a = 0;
        const p = setInterval(() => {
          const c = (window as Record<string, unknown>)["sharedUi"] as MfeContainer | undefined;
          if (c && typeof c.get === "function") {
            clearInterval(p);
            loadRemoteReactDom(c).catch(() => {});
            resolve(c);
          } else if (++a > 20) {
            clearInterval(p);
            reject(new Error("sharedUi not found after script load"));
          }
        }, 100);
        return;
      }
      try {
        const r = container.init({}) as Promise<void> | void;
        if (r && typeof (r as Promise<void>).then === "function") await (r as Promise<void>);
      } catch { /* already initialised */ }
      loadRemoteReactDom(container).catch(() => {});
      resolve(container);
    };
    script.onerror = () => {
      // Remove failed script so next call can retry
      script.remove();
      containerPromise = null;
      reject(new Error(`remoteEntry load failed from ${scriptSrc}`));
    };
    document.head.appendChild(script);
  });

  return containerPromise;
}

async function loadRemoteReactDom(container: MfeContainer) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (window as any).__sharedUiRender === "function") return;
  try { const f = await container.get("./reactdom"); f(); } catch { /* not exposed */ }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadComponent(name: ComponentName): Promise<React.ComponentType<any>> {
  if (isStale()) { containerPromise = null; componentCache.clear(); }
  if (componentCache.has(name)) return componentCache.get(name)!;
  const container = await getContainer();
  const factory = await container.get(MODULE_MAP[name]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Component = (factory() as { default: React.ComponentType<any> }).default;
  componentCache.set(name, Component);
  return Component;
}

// ─── IsolatedContent: mounts sharedUi component into isolated DOM ─────────────
interface IsolatedContentProps {
  widget: WidgetConfig;
  hostRef: React.RefObject<HTMLDivElement | null>;
}

function IsolatedContent({ widget, hostRef }: IsolatedContentProps) {
  const [error, setError]   = useState<string | null>(null);
  const [ready, setReady]   = useState(false);
  const cleanupRef          = useRef<(() => void) | null>(null);
  const mountedRef          = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const host = hostRef.current;
    if (!host) return;

    (async () => {
      try {
        const Component = await loadComponent(widget.componentName);
        if (!mountedRef.current || !host) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const w = window as any;
        for (let i = 0; i < 40; i++) {
          if (typeof w.__sharedUiRender === "function") break;
          await new Promise((r) => setTimeout(r, 100));
        }
        if (!mountedRef.current || !host) return;

        if (typeof w.__sharedUiRender !== "function") {
          throw new Error("sharedUi render helper unavailable");
        }

        if (mountedRef.current) setReady(true);

        // Two rAFs: let browser commit display:block and do layout pass
        await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
        if (!mountedRef.current || !host) return;

        w.__sharedUiRender(host, Component, widget.data as Record<string, unknown>);
        cleanupRef.current = () => {
          if (typeof w.__sharedUiUnmount === "function") w.__sharedUiUnmount(host);
        };
      } catch (e) {
        if (mountedRef.current) { setError((e as Error).message); setReady(true); }
      }
    })();

    return () => {
      mountedRef.current = false;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widget.id, widget.componentName]);

  // Re-render on data change
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !ready) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const Component = componentCache.get(widget.componentName);
    if (!Component || typeof w.__sharedUiRender !== "function") return;
    w.__sharedUiRender(host, Component, widget.data as Record<string, unknown>);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widget.data]);

  if (error) {
    return (
      <div style={{ padding: "12px 16px", color: "#ef4444", fontSize: "0.82rem" }}>
        <strong>{widget.title}</strong>
        <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "0.74rem" }}>{error}</p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <i className="pi pi-spin pi-spinner" style={{ fontSize: 22, color: "#6366f1" }} />
      </div>
    );
  }

  return null;
}

// ─── DraggableWidget ─────────────────────────────────────────────────────────
interface DraggableWidgetProps {
  widget: WidgetConfig;
  onRemove: (id: string) => void;
  onLayoutChange: (id: string, layout: NonNullable<WidgetConfig["layout"]>) => void;
  canvasRef: React.RefObject<HTMLDivElement | null>;
}

const MIN_W = 200, MIN_H = 120;

function DraggableWidget({ widget, onRemove, onLayoutChange, canvasRef }: DraggableWidgetProps) {
  const layout = widget.layout ?? { x: 0, y: 0, ...DEFAULT_SIZE[widget.componentName] };
  const { x, y, w, h } = layout;

  const isDragging  = useRef(false);
  const isResizing  = useRef(false);
  const dragStart   = useRef({ mx: 0, my: 0, wx: 0, wy: 0 });
  const resizeStart = useRef({ mx: 0, my: 0, ww: 0, wh: 0 });
  const boxRef      = useRef<HTMLDivElement>(null);
  const hostRef     = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // Animate in
  useLayoutEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── Drag ──
  const onDragMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-resize]")) return;
    e.preventDefault();
    isDragging.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, wx: x, wy: y };

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = ev.clientX - dragStart.current.mx;
      const dy = ev.clientY - dragStart.current.my;
      const nx = Math.max(0, dragStart.current.wx + dx);
      const ny = Math.max(0, dragStart.current.wy + dy);
      if (boxRef.current) {
        boxRef.current.style.left = `${nx}px`;
        boxRef.current.style.top  = `${ny}px`;
      }
    };
    const onUp = (ev: MouseEvent) => {
      isDragging.current = false;
      const dx = ev.clientX - dragStart.current.mx;
      const dy = ev.clientY - dragStart.current.my;
      onLayoutChange(widget.id, {
        x: Math.max(0, dragStart.current.wx + dx),
        y: Math.max(0, dragStart.current.wy + dy),
        w, h,
      });
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
  }, [x, y, w, h, widget.id, onLayoutChange]);

  // ── Resize ──
  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isResizing.current = true;
    resizeStart.current = { mx: e.clientX, my: e.clientY, ww: w, wh: h };

    const onMove = (ev: MouseEvent) => {
      if (!isResizing.current) return;
      const nw = Math.max(MIN_W, resizeStart.current.ww + ev.clientX - resizeStart.current.mx);
      const nh = Math.max(MIN_H, resizeStart.current.wh + ev.clientY - resizeStart.current.my);
      if (boxRef.current) {
        boxRef.current.style.width  = `${nw}px`;
        boxRef.current.style.height = `${nh}px`;
      }
    };
    const onUp = (ev: MouseEvent) => {
      isResizing.current = false;
      const nw = Math.max(MIN_W, resizeStart.current.ww + ev.clientX - resizeStart.current.mx);
      const nh = Math.max(MIN_H, resizeStart.current.wh + ev.clientY - resizeStart.current.my);
      onLayoutChange(widget.id, { x, y, w: nw, h: nh });
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
  }, [x, y, w, h, widget.id, onLayoutChange]);

  return (
    <div
      ref={boxRef}
      data-widget-box="true"
      style={{
        position: "absolute",
        left: x, top: y,
        width: w, height: h,
        opacity:   visible ? 1 : 0,
        transform: visible ? "scale(1)" : "scale(0.96)",
        transition: "opacity 0.25s ease, transform 0.25s ease",
        display: "flex",
        flexDirection: "column",
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(0,0,0,0.07)",
        borderRadius: "18px",
        boxShadow: "0 8px 32px -8px rgba(0,0,0,0.12)",
        overflow: "hidden",
        userSelect: "none",
        zIndex: 1,
      }}
      onMouseDown={() => {
        if (boxRef.current) boxRef.current.style.zIndex = "10";
      }}
      onMouseUp={() => {
        if (boxRef.current) boxRef.current.style.zIndex = "1";
      }}
    >
      {/* ── Title bar (drag handle) ── */}
      <div
        onMouseDown={onDragMouseDown}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px 8px 14px",
          background: "linear-gradient(135deg,rgba(99,102,241,0.06),rgba(139,92,246,0.04))",
          borderBottom: "1px solid rgba(0,0,0,0.05)",
          cursor: "grab",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1", flexShrink: 0 }} />
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {widget.title || widget.componentName.replace("Widget", "")}
          </span>
        </div>
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => onRemove(widget.id)}
          title="Hapus widget"
          className="widgetCloseBtn"
          style={{
            border: "none", background: "rgba(239,68,68,0.1)", color: "#ef4444",
            borderRadius: "50%", width: 22, height: 22,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", flexShrink: 0, fontSize: "0.7rem",
            // Hidden by default — shown via CSS :hover on parent
            opacity: 0,
            transition: "opacity 0.18s ease, background 0.15s",
          }}
        >
          <i className="pi pi-times" />
        </button>
      </div>

      {/* ── Widget content area ── */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative", minHeight: 0 }}>
        {/* Loading / error states rendered by IsolatedContent when hostRef not ready */}
        <IsolatedContent widget={widget} hostRef={hostRef} />
        {/* sharedUi React root mounts here */}
        <div
          ref={hostRef}
          style={{ position: "absolute", inset: 0, overflow: "hidden" }}
        />
      </div>

      {/* ── Resize handle (bottom-right corner) ── */}
      <div
        data-resize="true"
        onMouseDown={onResizeMouseDown}
        style={{
          position: "absolute",
          right: 0, bottom: 0,
          width: 22, height: 22,
          cursor: "nwse-resize",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "flex-end",
          padding: "3px",
          zIndex: 5,
        }}
      >
        {/* Resize grip dots */}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="9" cy="9" r="1.5" fill="#94A3B8" />
          <circle cx="5" cy="9" r="1.5" fill="#CBD5E1" />
          <circle cx="9" cy="5" r="1.5" fill="#CBD5E1" />
        </svg>
      </div>
    </div>
  );
}

// ─── DashboardWidgetGrid ──────────────────────────────────────────────────────

export default function DashboardWidgetGrid() {
  const { activeWidgets, removeWidget, updateLayout } = useWidgets();

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const canvasRef = useRef<HTMLDivElement>(null);

  const handleRemove = useCallback((id: string) => removeWidget(id), [removeWidget]);
  const handleLayoutChange = useCallback(
    (id: string, layout: NonNullable<WidgetConfig["layout"]>) => updateLayout(id, layout),
    [updateLayout],
  );

  if (!mounted || activeWidgets.length === 0) return null;

  // Height just enough to contain all widgets — no visual separator
  const canvasH = activeWidgets.reduce((max, w) => {
    const ly = w.layout?.y ?? 0;
    const lh = w.layout?.h ?? DEFAULT_SIZE[w.componentName].h;
    return Math.max(max, ly + lh + 24);
  }, 200);

  return (
    // No margin, no border, no background — flows seamlessly with MFE content above
    <div
      ref={canvasRef}
      style={{
        position: "relative",
        width: "100%",
        height: canvasH,
      }}
    >
      {activeWidgets.map((widget) => (
        <DraggableWidget
          key={widget.id}
          widget={widget}
          onRemove={handleRemove}
          onLayoutChange={handleLayoutChange}
          canvasRef={canvasRef}
        />
      ))}
    </div>
  );
}
