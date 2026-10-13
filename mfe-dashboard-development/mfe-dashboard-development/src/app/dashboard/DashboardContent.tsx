import React, { useEffect, useRef, useState, useCallback } from "react";
import { getMfeContext } from "@/lib/mfeContext";
import { clientLog } from "@/lib/clientLog";
import styles from "./dashboard.module.css";

// ── AI widget types (mirrors shell's WidgetConfig) ────────────────────────────

type ComponentName =
  | "MetricCardWidget"
  | "BarChartWidget"
  | "LineChartWidget"
  | "AreaChartWidget"
  | "PieChartWidget"
  | "DoughnutChartWidget"
  | "ScatterChartWidget"
  | "TableWidget";

interface WidgetLayout { x: number; y: number; w: number; h: number; }

interface WidgetConfig {
  id: string;
  type: string;
  title: string;
  componentName: ComponentName;
  data: Record<string, unknown>;
  layout?: WidgetLayout;
}

const STORAGE_KEY = "aigovtech_widgets_v1";
const MIN_W = 200, MIN_H = 120;

const DEFAULT_SIZE: Record<ComponentName, { w: number; h: number }> = {
  MetricCardWidget:    { w: 300, h: 140 },
  BarChartWidget:      { w: 540, h: 340 },
  LineChartWidget:     { w: 540, h: 340 },
  AreaChartWidget:     { w: 540, h: 340 },
  PieChartWidget:      { w: 440, h: 320 },
  DoughnutChartWidget: { w: 440, h: 320 },
  ScatterChartWidget:  { w: 540, h: 340 },
  TableWidget:         { w: 720, h: 380 },
};

function loadWidgets(): WidgetConfig[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const widgets = parsed.filter(
      (w) =>
        w &&
        typeof w.id === "string" &&
        typeof w.componentName === "string" &&
        typeof w.title === "string" &&
        w.data !== null &&
        typeof w.data === "object",
    ) as WidgetConfig[];

    // One-time normalization: widgets created before per-component default
    // sizes were introduced all got 480x300. Reset MetricCardWidget (and any
    // widget still matching the old default) to its proper component size so
    // cards don't have huge empty gaps.
    const LEGACY_DEFAULT = { w: 480, h: 300 };
    let changed = false;
    const normalized = widgets.map((w) => {
      const def = DEFAULT_SIZE[w.componentName];
      if (!def) return w;
      if (
        w.layout &&
        w.layout.w === LEGACY_DEFAULT.w &&
        w.layout.h === LEGACY_DEFAULT.h
      ) {
        changed = true;
        return { ...w, layout: { ...w.layout, w: def.w, h: def.h } };
      }
      return w;
    });

    if (changed) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    }

    return normalized;
  } catch {
    return [];
  }
}

// ── Widget renderer ───────────────────────────────────────────────────────────
//
// Each AI widget references a sharedUi component by name. We dynamic-import the
// actual component from sharedUi (react/react-dom are shared singletons, so
// rendering it directly in this MFE's tree is safe — no two-React problem).
//
// IMPORTANT: every import path must be a STRING LITERAL. Using a variable
// (import(MODULE_MAP[name])) triggers webpack's "Critical dependency: the
// request of a dependency is an expression" warning and the MF remote chunks
// fail to load at runtime. So we map each name to its own lazy import.

const WIDGET_LOADERS: Record<ComponentName, () => Promise<{ default: unknown }>> = {
  MetricCardWidget:    () => import("sharedUi/MetricCardWidget"),
  BarChartWidget:      () => import("sharedUi/BarChartWidget"),
  LineChartWidget:     () => import("sharedUi/LineChartWidget"),
  AreaChartWidget:     () => import("sharedUi/AreaChartWidget"),
  PieChartWidget:      () => import("sharedUi/PieChartWidget"),
  DoughnutChartWidget: () => import("sharedUi/DoughnutChartWidget"),
  ScatterChartWidget:  () => import("sharedUi/ScatterChartWidget"),
  TableWidget:         () => import("sharedUi/TableWidget"),
};

interface AiWidgetRendererProps {
  widget: WidgetConfig;
}

function AiWidgetRenderer({ widget }: AiWidgetRendererProps) {
  const [Comp, setComp] = useState<React.ComponentType<Record<string, unknown>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setComp(null);
    setError(null);
    const startedAt = Date.now();
    WIDGET_LOADERS[widget.componentName]()
      .then((mod) => {
        if (!active) return;
        const def = mod?.default as unknown;
        if (typeof def !== "function") {
          clientLog({ level: "error", category: "LOAD_SHARED", event: "WIDGET_COMP_FAIL", service: `SHARED:${widget.componentName}`, app: "dashboardBok", durationMs: Date.now() - startedAt, message: `Komponen "${widget.componentName}" tidak valid` });
          setError(`Komponen "${widget.componentName}" tidak tersedia.`);
          return;
        }
        setComp(() => def as React.ComponentType<Record<string, unknown>>);
      })
      .catch((err) => {
        if (!active) return;
        clientLog({ level: "error", category: "LOAD_SHARED", event: "WIDGET_LOAD_FAIL", service: `SHARED:${widget.componentName}`, app: "dashboardBok", durationMs: Date.now() - startedAt, message: err instanceof Error ? err.message : String(err) });
        setError(`Gagal memuat komponen "${widget.componentName}".`);
      });
    return () => { active = false; };
  }, [widget.componentName]);

  if (error) {
    return (
      <div style={{ padding: "1rem", color: "#b91c1c", fontSize: "0.85rem" }}>
        <i className="pi pi-exclamation-triangle" style={{ marginRight: 6 }} />
        {error}
      </div>
    );
  }

  if (!Comp) {
    return (
      <div style={{ padding: "1rem", color: "#94a3b8", fontSize: "0.85rem" }}>
        <i className="pi pi-spin pi-spinner" style={{ marginRight: 6 }} />
        Memuat komponen…
      </div>
    );
  }

  return <Comp {...widget.data} />;
}

// ── DraggablePanel: drag + resize + close ─────────────────────────────────────

interface DraggablePanelProps {
  id: string;
  title: string;
  layout: WidgetLayout;
  onLayoutChange: (id: string, l: WidgetLayout) => void;
  onClose: (id: string) => void;
  children: React.ReactNode;
}

function DraggablePanel({
  id, title, layout, onLayoutChange, onClose, children,
}: DraggablePanelProps) {
  const { x, y, w, h } = layout;
  const boxRef       = useRef<HTMLDivElement>(null);
  const isDragging   = useRef(false);
  const isResizing   = useRef(false);
  const dragStart    = useRef({ mx: 0, my: 0, wx: 0, wy: 0 });
  const resizeStart  = useRef({ mx: 0, my: 0, ww: 0, wh: 0 });
  const [raised, setRaised] = useState(false);

  const onTitleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-close],[data-resize]")) return;
    e.preventDefault();
    isDragging.current = true;
    setRaised(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, wx: x, wy: y };

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current || !boxRef.current) return;
      const nx = Math.max(0, dragStart.current.wx + ev.clientX - dragStart.current.mx);
      const ny = Math.max(0, dragStart.current.wy + ev.clientY - dragStart.current.my);
      boxRef.current.style.left = `${nx}px`;
      boxRef.current.style.top  = `${ny}px`;
    };
    const onUp = (ev: MouseEvent) => {
      isDragging.current = false;
      setRaised(false);
      onLayoutChange(id, {
        x: Math.max(0, dragStart.current.wx + ev.clientX - dragStart.current.mx),
        y: Math.max(0, dragStart.current.wy + ev.clientY - dragStart.current.my),
        w, h,
      });
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [id, x, y, w, h, onLayoutChange]);

  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isResizing.current = true;
    resizeStart.current = { mx: e.clientX, my: e.clientY, ww: w, wh: h };

    const onMove = (ev: MouseEvent) => {
      if (!isResizing.current || !boxRef.current) return;
      const nw = Math.max(MIN_W, resizeStart.current.ww + ev.clientX - resizeStart.current.mx);
      const nh = Math.max(MIN_H, resizeStart.current.wh + ev.clientY - resizeStart.current.my);
      boxRef.current.style.width  = `${nw}px`;
      boxRef.current.style.height = `${nh}px`;
    };
    const onUp = (ev: MouseEvent) => {
      isResizing.current = false;
      onLayoutChange(id, {
        x, y,
        w: Math.max(MIN_W, resizeStart.current.ww + ev.clientX - resizeStart.current.mx),
        h: Math.max(MIN_H, resizeStart.current.wh + ev.clientY - resizeStart.current.my),
      });
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [id, x, y, w, h, onLayoutChange]);

  return (
    <div
      ref={boxRef}
      className={styles.draggableBox}
      style={{
        left: x, top: y, width: w, height: h,
        boxShadow: raised
          ? "0 16px 48px -8px rgba(0,0,0,0.18)"
          : "0 4px 20px -4px rgba(0,0,0,0.10)",
        zIndex: raised ? 20 : 1,
      }}
    >
      <div className={styles.dragHandle} onMouseDown={onTitleMouseDown}>
        <div className={styles.dragHandleLeft}>
          <span className={styles.dragDot} />
          <span className={styles.dragDot} style={{ opacity: 0.5 }} />
          <span className={styles.dragDot} style={{ opacity: 0.3 }} />
          <span className={styles.dragTitle}>{title}</span>
        </div>
        <button
          data-close="true"
          className={styles.closeBtn}
          onClick={() => onClose(id)}
          title="Hapus widget"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <i className="pi pi-times" />
        </button>
      </div>

      <div className={styles.draggableContent}>
        {children}
      </div>

      <div
        data-resize="true"
        className={styles.resizeHandle}
        onMouseDown={onResizeMouseDown}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="9" cy="9" r="1.5" fill="#94A3B8" />
          <circle cx="5" cy="9" r="1.5" fill="#CBD5E1" />
          <circle cx="9" cy="5" r="1.5" fill="#CBD5E1" />
        </svg>
      </div>
    </div>
  );
}

// ── Canvas height helper ──────────────────────────────────────────────────────

function canvasH(widgets: WidgetConfig[]) {
  return widgets.reduce(
    (m, w) => Math.max(m, (w.layout?.y ?? 0) + (w.layout?.h ?? 300) + 40),
    480,
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DashboardContent() {
  const ctx = getMfeContext();
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => loadWidgets());

  // Re-read widgets whenever the shell notifies us (new AI widget added, etc.)
  useEffect(() => {
    const refresh = () => setWidgets(loadWidgets());
    window.addEventListener("aigovtech:widgets-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("aigovtech:widgets-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  // Notify the shell to remove a widget (shell owns the source of truth).
  const handleClose = useCallback((id: string) => {
    window.dispatchEvent(new CustomEvent("aigovtech:remove-widget", { detail: { id } }));
  }, []);

  // Notify the shell of a drag/resize so the layout persists in localStorage.
  const handleLayoutChange = useCallback((id: string, layout: WidgetLayout) => {
    window.dispatchEvent(
      new CustomEvent("aigovtech:update-layout", { detail: { id, layout } }),
    );
    // Optimistically update local state for snappy UX.
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, layout } : w)),
    );
  }, []);

  // Ensure every widget has a layout (default size if missing).
  const withLayout = widgets.map((w) => ({
    ...w,
    layout: w.layout ?? { x: 0, y: 0, ...DEFAULT_SIZE[w.componentName] },
  }));

  return (
    <div className={styles.container}>
      {ctx && (
        <div className={styles.contextBanner}>
          <i className="pi pi-user" />
          <span>Masuk sebagai <strong>{ctx.name}</strong> ({ctx.role}) — aplikasi <strong>{ctx.app}</strong></span>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1rem" }}>
        <div className={styles.pageHeader} style={{ margin: 0 }}>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSubtitle}>
            {withLayout.length > 0
              ? `${withLayout.length} widget — geser atau ubah ukuran secara bebas.`
              : "Gunakan asisten AI untuk membuat widget di sini."}
          </p>
        </div>
      </div>

      {withLayout.length === 0 ? (
        <div
          style={{
            minHeight: 320,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem",
            color: "#94a3b8",
            border: "1px dashed #cbd5e1",
            borderRadius: 14,
          }}
        >
          <i className="pi pi-sparkles" style={{ fontSize: "2rem" }} />
          <p style={{ margin: 0, fontSize: "0.95rem" }}>Belum ada widget.</p>
          <p style={{ margin: 0, fontSize: "0.8rem" }}>
            Tanyakan sesuatu pada AI (misal. "tampilkan penjualan per bulan") untuk membuat widget.
          </p>
        </div>
      ) : (
        <div className={styles.freeCanvas} style={{ height: canvasH(withLayout) }}>
          {withLayout.map((w) => (
            <DraggablePanel
              key={w.id}
              id={w.id}
              title={w.title}
              layout={w.layout!}
              onLayoutChange={handleLayoutChange}
              onClose={handleClose}
            >
              <AiWidgetRenderer widget={w} />
            </DraggablePanel>
          ))}
        </div>
      )}
    </div>
  );
}
