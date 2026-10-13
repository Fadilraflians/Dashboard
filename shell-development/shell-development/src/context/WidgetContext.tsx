"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";

// ── Types ────────────────────────────────────────────────────────────────────

export type WidgetType = "chart" | "metric_card" | "table";

export type ComponentName =
  | "MetricCardWidget"
  | "BarChartWidget"
  | "LineChartWidget"
  | "AreaChartWidget"
  | "PieChartWidget"
  | "DoughnutChartWidget"
  | "ScatterChartWidget"
  | "TableWidget";

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  componentName: ComponentName;
  /** Raw data injected directly into the component as props. */
  data: Record<string, unknown>;
  /** Position and size for drag-and-resize layout */
  layout?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

export interface WidgetContextValue {
  activeWidgets: WidgetConfig[];
  addWidget: (widget: WidgetConfig) => void;
  removeWidget: (id: string) => void;
  clearWidgets: () => void;
  updateLayout: (id: string, layout: NonNullable<WidgetConfig["layout"]>) => void;
}

// ── localStorage helpers ─────────────────────────────────────────────────────

const STORAGE_KEY = "aigovtech_widgets_v1";

// ── Default sizes per widget type (must match MFE dashboard's DEFAULT_SIZE) ──

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

function loadFromStorage(): WidgetConfig[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Basic validation — ensure each item has required fields
    return parsed.filter(
      (w) =>
        w &&
        typeof w.id === "string" &&
        typeof w.componentName === "string" &&
        typeof w.title === "string" &&
        w.data !== null &&
        typeof w.data === "object",
    ) as WidgetConfig[];
  } catch {
    return [];
  }
}

function saveToStorage(widgets: WidgetConfig[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

// ── Context ──────────────────────────────────────────────────────────────────

const WidgetContext = createContext<WidgetContextValue | null>(null);

export function WidgetProvider({ children }: { children: ReactNode }) {
  // Initialise from localStorage on first render (client only)
  const [activeWidgets, setActiveWidgets] = useState<WidgetConfig[]>(() =>
    loadFromStorage(),
  );

  // Persist to localStorage whenever widgets change and notify the MFE so it
  // can refresh its widget list (the MFE reads widgets from the same key).
  useEffect(() => {
    saveToStorage(activeWidgets);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("aigovtech:widgets-updated"));
    }
  }, [activeWidgets]);

  const addWidget = useCallback((widget: WidgetConfig) => {
    setActiveWidgets((prev) => {
      const exists = prev.some((w) => w.id === widget.id);
      // Auto-assign layout if not provided: stack below existing widgets
      const size = DEFAULT_SIZE[widget.componentName] ?? { w: 480, h: 300 };
      const withLayout: WidgetConfig = widget.layout
        ? widget
        : {
            ...widget,
            layout: {
              x: 0,
              y: prev.length * 320,
              ...size,
            },
          };
      const next = exists
        ? prev.map((w) => (w.id === widget.id ? withLayout : w))
        : [...prev, withLayout];
      return next;
    });
  }, []);

  const removeWidget = useCallback((id: string) => {
    setActiveWidgets((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const clearWidgets = useCallback(() => {
    setActiveWidgets([]);
  }, []);

  const updateLayout = useCallback(
    (id: string, layout: NonNullable<WidgetConfig["layout"]>) => {
      setActiveWidgets((prev) =>
        prev.map((w) => (w.id === id ? { ...w, layout } : w)),
      );
    },
    [],
  );

  // Listen for actions dispatched by the MFE dashboard canvas (close / drag /
  // resize) so both the shell state and the MFE stay in sync.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onRemove = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      if (id) removeWidget(id);
    };
    const onUpdateLayout = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string; layout: NonNullable<WidgetConfig["layout"]> }>).detail;
      if (detail?.id && detail?.layout) updateLayout(detail.id, detail.layout);
    };

    window.addEventListener("aigovtech:remove-widget", onRemove as EventListener);
    window.addEventListener("aigovtech:update-layout", onUpdateLayout as EventListener);
    return () => {
      window.removeEventListener("aigovtech:remove-widget", onRemove as EventListener);
      window.removeEventListener("aigovtech:update-layout", onUpdateLayout as EventListener);
    };
  }, [removeWidget, updateLayout]);

  return (
    <WidgetContext.Provider
      value={{ activeWidgets, addWidget, removeWidget, clearWidgets, updateLayout }}
    >
      {children}
    </WidgetContext.Provider>
  );
}

export function useWidgets(): WidgetContextValue {
  const ctx = useContext(WidgetContext);
  if (!ctx) {
    throw new Error("useWidgets must be used within a WidgetProvider");
  }
  return ctx;
}
