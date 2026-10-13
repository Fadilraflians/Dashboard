"use client";

/**
 * UnifiedDashboardCanvas
 *
 * Renders ALL dashboard items — both MFE-originated cards and AI-generated
 * widgets — on a single shared canvas where everything is position:absolute
 * and can be freely dragged anywhere (up or down) without pushing other items.
 *
 * Architecture:
 *  - MFE dashboard (mfe-dashboard-development) mounts inside a hidden host div.
 *    It emits its card data via window.__dashboardData__ event.
 *  - AI widgets come from WidgetContext (localStorage-persisted).
 *  - Both sets are stored in one unified layout state, persisted to localStorage.
 *  - Every item renders as position:absolute inside a single <div>.
 */

import React, {
  useEffect, useRef, useState, useCallback, useLayoutEffect,
} from "react";
import { LazyMFE } from "@/components/LazyMFE";
import { useWidgets } from "@/context/WidgetContext";
import type { WidgetConfig, ComponentName } from "@/context/WidgetContext";
import type { MfeDescriptor } from "@/types";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CanvasLayout {
  x: number; y: number; w: number; h: number;
}

export interface CanvasItem {
  id: string;
  kind: "mfe" | "ai";
  layout: CanvasLayout;
  visible: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "unified_canvas_v2";
const MIN_W = 160, MIN_H = 100;

// MFE items and their default positions
const MFE_DEFAULTS: CanvasItem[] = [
  { id: "mfe-main", kind: "mfe", visible: true, layout: { x: 0, y: 0, w: 1120, h: 620 } },
];

// ── First-fit slot packing (mirrors WidgetContext.findFreeSlot) ───────────────

interface Rect { x: number; y: number; w: number; h: number; }

const CANVAS_W = 1120;
const GAP = 16;

function rectsOverlap(a: Rect, b: Rect): boolean {
  return !(
    a.x + a.w + GAP <= b.x ||
    b.x + b.w + GAP <= a.x ||
    a.y + a.h + GAP <= b.y ||
    b.y + b.h + GAP <= a.y
  );
}

function findFreeSlot(existing: Rect[], w: number, h: number): { x: number; y: number } {
  const ySet = new Set<number>([0]);
  for (const e of existing) ySet.add(e.y + e.h + GAP);
  const ys = Array.from(ySet).sort((a, b) => a - b);

  for (const y of ys) {
    const xSet = new Set<number>([0]);
    for (const e of existing) {
      if (e.y < y + h && e.y + e.h > y) xSet.add(e.x + e.w + GAP);
    }
    const xs = Array.from(xSet).sort((a, b) => a - b);
    for (const x of xs) {
      if (x + w > CANVAS_W) continue;
      const candidate: Rect = { x, y, w, h };
      if (!existing.some((e) => rectsOverlap(candidate, e))) return { x, y };
    }
  }
  const maxY = existing.reduce((m, e) => Math.max(m, e.y + e.h + GAP), 0);
  return { x: 0, y: maxY };
}

function aiDefault(widget: WidgetConfig, existing: Rect[]): CanvasItem {
  const sizeMap: Partial<Record<ComponentName, { w: number; h: number }>> = {
    MetricCardWidget:    { w: 280, h: 130 },
    BarChartWidget:      { w: 520, h: 320 },
    LineChartWidget:     { w: 520, h: 320 },
    AreaChartWidget:     { w: 520, h: 320 },
    PieChartWidget:      { w: 420, h: 300 },
    DoughnutChartWidget: { w: 420, h: 300 },
    ScatterChartWidget:  { w: 520, h: 320 },
    TableWidget:         { w: 700, h: 360 },
  };
  const { w, h } = sizeMap[widget.componentName] ?? { w: 480, h: 300 };
  const { x, y } = findFreeSlot(existing, w, h);
  return {
    id: widget.id, kind: "ai", visible: true,
    layout: { x, y, w, h },
  };
}

function loadCanvasItems(mfeDefaults: CanvasItem[]): CanvasItem[] {
  if (typeof window === "undefined") return mfeDefaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return mfeDefaults;
    const saved: CanvasItem[] = JSON.parse(raw);
    return mfeDefaults.map((d) => {
      const s = saved.find((s) => s.id === d.id);
      return s ? { ...d, layout: s.layout, visible: s.visible } : d;
    });
  } catch { return mfeDefaults; }
}

function saveCanvasItems(items: CanvasItem[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
}

function totalCanvasH(items: CanvasItem[]) {
  return items.filter((i) => i.visible).reduce(
    (m, i) => Math.max(m, i.layout.y + i.layout.h + 40), 400,
  );
}

// ── DraggableBox ───────────────────────────────────────────────────────────────

interface DraggableBoxProps {
  id: string;
  title: string;
  icon?: string;
  layout: CanvasLayout;
  onLayoutChange: (id: string, l: CanvasLayout) => void;
  onClose: (id: string) => void;
  children: React.ReactNode;
  minW?: number;
  minH?: number;
  noPadding?: boolean;
}

function DraggableBox({
  id, title, icon, layout, onLayoutChange, onClose, children,
  minW = MIN_W, minH = MIN_H, noPadding = false,
}: DraggableBoxProps) {
  const { x, y, w, h } = layout;
  const boxRef      = useRef<HTMLDivElement>(null);
  const dragging    = useRef(false);
  const resizing    = useRef(false);
  const dragStart   = useRef({ mx: 0, my: 0, ox: 0, oy: 0 });
  const resizeStart = useRef({ mx: 0, my: 0, ow: 0, oh: 0 });
  const [raised, setRaised] = useState(false);

  // ── Drag ──
  const startDrag = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
    e.preventDefault();
    dragging.current = true;
    setRaised(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: x, oy: y };

    const move = (ev: MouseEvent) => {
      if (!dragging.current || !boxRef.current) return;
      const nx = Math.max(0, dragStart.current.ox + ev.clientX - dragStart.current.mx);
      const ny = Math.max(0, dragStart.current.oy + ev.clientY - dragStart.current.my);
      boxRef.current.style.left = `${nx}px`;
      boxRef.current.style.top  = `${ny}px`;
    };
    const up = (ev: MouseEvent) => {
      dragging.current = false;
      setRaised(false);
      onLayoutChange(id, {
        x: Math.max(0, dragStart.current.ox + ev.clientX - dragStart.current.mx),
        y: Math.max(0, dragStart.current.oy + ev.clientY - dragStart.current.my),
        w, h,
      });
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup",   up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup",   up);
  }, [id, x, y, w, h, onLayoutChange]);

  // ── Resize ──
  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizing.current = true;
    resizeStart.current = { mx: e.clientX, my: e.clientY, ow: w, oh: h };

    const move = (ev: MouseEvent) => {
      if (!resizing.current || !boxRef.current) return;
      const nw = Math.max(minW, resizeStart.current.ow + ev.clientX - resizeStart.current.mx);
      const nh = Math.max(minH, resizeStart.current.oh + ev.clientY - resizeStart.current.my);
      boxRef.current.style.width  = `${nw}px`;
      boxRef.current.style.height = `${nh}px`;
    };
    const up = (ev: MouseEvent) => {
      resizing.current = false;
      onLayoutChange(id, {
        x, y,
        w: Math.max(minW, resizeStart.current.ow + ev.clientX - resizeStart.current.mx),
        h: Math.max(minH, resizeStart.current.oh + ev.clientY - resizeStart.current.my),
      });
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup",   up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup",   up);
  }, [id, x, y, w, h, minW, minH, onLayoutChange]);

  return (
    <div
      ref={boxRef}
      data-canvas-item="true"
      style={{
        position: "absolute",
        left: x, top: y, width: w, height: h,
        display: "flex", flexDirection: "column",
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        boxShadow: raised ? "0 20px 60px -10px rgba(0,0,0,0.2)" : "0 2px 12px -2px rgba(0,0,0,0.08)",
        overflow: "hidden",
        userSelect: "none",
        transition: "box-shadow 0.18s ease",
        zIndex: raised ? 50 : 1,
        boxSizing: "border-box",
      }}
    >
      {/* ── Drag handle (title bar) ── */}
      <div
        onMouseDown={startDrag}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "7px 10px 7px 12px",
          background: "linear-gradient(135deg,rgba(99,102,241,0.05),rgba(139,92,246,0.03))",
          borderBottom: "1px solid rgba(0,0,0,0.05)",
          cursor: "grab", flexShrink: 0,
          minHeight: 34,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
          {/* Drag dots */}
          {[1, 0.5, 0.25].map((o, i) => (
            <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#6366f1", opacity: o, flexShrink: 0 }} />
          ))}
          {icon && <i className={`pi ${icon}`} style={{ fontSize: "0.82rem", color: "#6366f1", marginLeft: 5 }} />}
          <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#374151", marginLeft: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {title}
          </span>
        </div>

        {/* Close button — hidden, shown on hover via CSS */}
        <button
          data-no-drag="true"
          data-canvas-close="true"
          onClick={() => onClose(id)}
          title="Sembunyikan"
          style={{
            border: "none", background: "rgba(239,68,68,0.08)", color: "#ef4444",
            borderRadius: "50%", width: 22, height: 22,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontSize: "0.68rem",
            opacity: 0, transition: "opacity 0.15s, background 0.15s",
            flexShrink: 0,
          }}
          className="canvasCloseBtn"
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.2)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.08)"; }}
        >
          <i className="pi pi-times" />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: noPadding ? "hidden" : "auto", minHeight: 0, padding: noPadding ? 0 : "0" }}>
        {children}
      </div>

      {/* Resize grip */}
      <div
        data-no-drag="true"
        onMouseDown={startResize}
        style={{
          position: "absolute", right: 0, bottom: 0,
          width: 20, height: 20, cursor: "nwse-resize",
          display: "flex", alignItems: "flex-end", justifyContent: "flex-end",
          padding: "3px", zIndex: 5,
        }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <circle cx="8" cy="8" r="1.2" fill="#94A3B8" />
          <circle cx="4" cy="8" r="1.2" fill="#CBD5E1" />
          <circle cx="8" cy="4" r="1.2" fill="#CBD5E1" />
        </svg>
      </div>
    </div>
  );
}

// ── IsolatedAiWidget ─────────────────────────────────────────────────────────
// (same isolation pattern as DashboardWidgetGrid — sharedUi's own React root)

type MfeContainerType = {
  init: (s: unknown) => Promise<void> | void;
  get: (m: string) => Promise<() => { default: unknown }>;
};

const MODULE_MAP: Record<ComponentName, string> = {
  MetricCardWidget: "./MetricCardWidget", BarChartWidget: "./BarChartWidget",
  LineChartWidget: "./LineChartWidget",   AreaChartWidget: "./AreaChartWidget",
  PieChartWidget: "./PieChartWidget",     DoughnutChartWidget: "./DoughnutChartWidget",
  ScatterChartWidget: "./ScatterChartWidget", TableWidget: "./TableWidget",
};

let _containerP: Promise<MfeContainerType> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _componentCache = new Map<string, React.ComponentType<any>>();

function getSharedUrl() {
  if (typeof window !== "undefined") {
    const w = window as unknown as { __MFE_RUNTIME__?: { sharedUrl?: string } };
    if (w.__MFE_RUNTIME__?.sharedUrl) return w.__MFE_RUNTIME__.sharedUrl;
  }
  return process.env.NEXT_PUBLIC_SHARED_URL || "http://localhost:9000";
}

async function getSharedContainer(): Promise<MfeContainerType> {
  if (_containerP) return _containerP;
  _containerP = new Promise<MfeContainerType>((resolve, reject) => {
    const existing = (window as Record<string, unknown>)["sharedUi"] as MfeContainerType | undefined;
    if (existing && typeof existing.get === "function") {
      loadSharedReactDom(existing).catch(() => {});
      resolve(existing);
      return;
    }
    const s = document.createElement("script");
    s.src = `${getSharedUrl()}/remoteEntry.js`;
    s.async = true; s.crossOrigin = "anonymous";
    s.onload = async () => {
      const c = (window as Record<string, unknown>)["sharedUi"] as MfeContainerType | undefined;
      if (!c) { reject(new Error("sharedUi not found")); return; }
      try { const r = c.init({}) as Promise<void> | void; if (r && typeof (r as Promise<void>).then === "function") await (r as Promise<void>); } catch {}
      loadSharedReactDom(c).catch(() => {});
      resolve(c);
    };
    s.onerror = () => reject(new Error("remoteEntry load failed"));
    document.head.appendChild(s);
  });
  return _containerP;
}

async function loadSharedReactDom(c: MfeContainerType) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (window as any).__sharedUiRender === "function") return;
  try { const f = await c.get("./reactdom"); f(); } catch {}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadSharedComponent(name: ComponentName): Promise<React.ComponentType<any>> {
  if (_componentCache.has(name)) return _componentCache.get(name)!;
  const container = await getSharedContainer();
  const factory   = await container.get(MODULE_MAP[name]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Component = (factory() as { default: React.ComponentType<any> }).default;
  _componentCache.set(name, Component);
  return Component;
}

interface AiWidgetContentProps { widget: WidgetConfig; }

function AiWidgetContent({ widget }: AiWidgetContentProps) {
  const hostRef   = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const alive     = useRef(true);
  const [ready, setReady] = useState(false);
  const [err,   setErr]   = useState<string | null>(null);

  useEffect(() => {
    alive.current = true;
    const host = hostRef.current;
    if (!host) return;

    (async () => {
      try {
        const Comp = await loadSharedComponent(widget.componentName);
        if (!alive.current || !host) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const w = window as any;
        for (let i = 0; i < 40; i++) {
          if (typeof w.__sharedUiRender === "function") break;
          await new Promise((r) => setTimeout(r, 100));
        }
        if (!alive.current || !host) return;
        if (typeof w.__sharedUiRender !== "function") throw new Error("render helper unavailable");
        if (alive.current) setReady(true);
        await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
        if (!alive.current || !host) return;
        w.__sharedUiRender(host, Comp, widget.data as Record<string, unknown>);
        cleanupRef.current = () => { if (typeof w.__sharedUiUnmount === "function") w.__sharedUiUnmount(host); };
      } catch (e) {
        if (alive.current) { setErr((e as Error).message); setReady(true); }
      }
    })();

    return () => {
      alive.current = false;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widget.id, widget.componentName]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !ready || err) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const Comp = _componentCache.get(widget.componentName);
    if (!Comp || typeof w.__sharedUiRender !== "function") return;
    w.__sharedUiRender(host, Comp, widget.data as Record<string, unknown>);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widget.data]);

  if (err) return <div style={{ padding: 12, color: "#ef4444", fontSize: "0.8rem" }}>{err}</div>;
  if (!ready) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
      <i className="pi pi-spin pi-spinner" style={{ fontSize: 20, color: "#6366f1" }} />
    </div>
  );
  return <div ref={hostRef} style={{ position: "absolute", inset: 0, overflow: "hidden" }} />;
}

// ── Main UnifiedDashboardCanvas ───────────────────────────────────────────────

interface Props {
  remote: MfeDescriptor;
  sharedUrl?: string;
}

export default function UnifiedDashboardCanvas({ remote, sharedUrl }: Props) {
  const { activeWidgets, removeWidget, updateLayout } = useWidgets();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // ── MFE item layout ──
  const [mfeItems, setMfeItems] = useState<CanvasItem[]>(() => loadCanvasItems(MFE_DEFAULTS));
  useEffect(() => { saveCanvasItems(mfeItems); }, [mfeItems]);

  const handleMfeLayout = useCallback((id: string, l: CanvasLayout) => {
    setMfeItems((prev) => prev.map((i) => i.id === id ? { ...i, layout: l } : i));
  }, []);

  const handleMfeClose = useCallback((id: string) => {
    setMfeItems((prev) => prev.map((i) => i.id === id ? { ...i, visible: false } : i));
  }, []);

  const handleAiRemove = useCallback((id: string) => removeWidget(id), [removeWidget]);
  const handleAiLayout = useCallback((id: string, l: CanvasLayout) => {
    updateLayout(id, { x: l.x, y: l.y, w: l.w, h: l.h });
  }, [updateLayout]);

  // Ensure every AI widget has a layout
  useEffect(() => {
    activeWidgets.forEach((w) => {
      if (!w.layout) {
        const existing: Rect[] = [
          ...mfeItems.filter((i) => i.visible).map((i) => i.layout),
          ...activeWidgets.filter((o) => o.id !== w.id && o.layout).map((o) => o.layout!),
        ];
        updateLayout(w.id, aiDefault(w, existing).layout);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWidgets.length]);

  if (!mounted) return null;

  // ── All hidden items (MFE + AI) for restore button ──
  const hiddenMfe  = mfeItems.filter((i) => !i.visible);
  const hiddenAi   = activeWidgets.filter((w) => w.layout && false); // AI items are removed, not hidden
  const hiddenCount = hiddenMfe.length + hiddenAi.length;

  const restoreAll = useCallback(() => {
    setMfeItems((prev) => prev.map((i) => ({ ...i, visible: true })));
  }, []);

  // Canvas total height
  const mfeH = mfeItems.filter((i) => i.visible)
    .reduce((m, i) => Math.max(m, i.layout.y + i.layout.h + 24), 0);
  const aiH = activeWidgets
    .filter((w) => w.layout)
    .reduce((m, w) => Math.max(m, (w.layout!.y) + (w.layout!.h) + 24), 0);
  const canvasHeight = Math.max(mfeH, aiH, 400);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {/* Restore button */}
      {hiddenCount > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <button
            onClick={restoreAll}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 14px", border: "1px solid #6366f1", borderRadius: 20, background: "#fff", color: "#6366f1", fontSize: "0.76rem", fontWeight: 600, cursor: "pointer" }}
          >
            <i className="pi pi-refresh" />
            Tampilkan kembali ({hiddenCount})
          </button>
        </div>
      )}

      {/* ── ONE unified canvas for all items ── */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: canvasHeight,
          // No background, no border — transparent so page bg shows through
        }}
      >
        {/* ── MFE dashboard item ── */}
        {mfeItems.filter((i) => i.visible).map((item) => (
          <DraggableBox
            key={item.id}
            id={item.id}
            title="Dashboard"
            icon="pi-th-large"
            layout={item.layout}
            onLayoutChange={handleMfeLayout}
            onClose={handleMfeClose}
            minW={400}
            minH={300}
            noPadding
          >
            <LazyMFE
              scope={remote.scope}
              module={remote.module}
              url={remote.url}
              sharedUrl={sharedUrl}
            />
          </DraggableBox>
        ))}

        {/* ── AI-generated widget items ── */}
        {activeWidgets.map((widget, idx) => {
          const layout = widget.layout ?? aiDefault(widget, idx).layout;
          return (
            <DraggableBox
              key={widget.id}
              id={widget.id}
              title={widget.title || widget.componentName.replace("Widget", "")}
              icon="pi-chart-bar"
              layout={layout}
              onLayoutChange={(id, l) => handleAiLayout(id, l)}
              onClose={(id) => handleAiRemove(id)}
              minW={200}
              minH={120}
              noPadding
            >
              <AiWidgetContent widget={widget} />
            </DraggableBox>
          );
        })}
      </div>

      {/* Global CSS for hover-reveal close buttons */}
      <style>{`
        [data-canvas-item]:hover .canvasCloseBtn { opacity: 1 !important; }
        [data-canvas-item] { transition: box-shadow 0.18s ease; }
      `}</style>
    </div>
  );
}
