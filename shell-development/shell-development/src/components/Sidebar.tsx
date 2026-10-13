"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SHELL_MENUS } from "@/lib/menu";
import { useWidgets } from "@/context/WidgetContext";
import type { WidgetConfig } from "@/context/WidgetContext";
import "./sidebar.css";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  widgetConfig?: WidgetConfig | null;
}

// ── Widget mini-preview badge shown in the chat bubble ────────────────────────

function WidgetBadge({ widget }: { widget: WidgetConfig }) {
  const iconMap: Record<string, string> = {
    MetricCardWidget:    "pi-chart-bar",
    BarChartWidget:      "pi-chart-bar",
    LineChartWidget:     "pi-chart-line",
    AreaChartWidget:     "pi-chart-line",
    PieChartWidget:      "pi-chart-pie",
    DoughnutChartWidget: "pi-chart-pie",
    ScatterChartWidget:  "pi-prime",
    TableWidget:         "pi-table",
  };
  const icon = iconMap[widget.componentName] ?? "pi-chart-bar";

  return (
    <div className="sidebarWidgetBadge">
      <div className="sidebarWidgetBadgeIcon">
        <i className={`pi ${icon}`} />
      </div>
      <div className="sidebarWidgetBadgeText">
        <span className="sidebarWidgetBadgeLabel">{widget.componentName}</span>
        <span className="sidebarWidgetBadgeTitle">{widget.title}</span>
      </div>
      <i className="pi pi-arrow-up-right sidebarWidgetBadgeArrow" />
    </div>
  );
}

// ── Sidebar component ─────────────────────────────────────────────────────────

const INITIAL_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "Halo! Saya **Aigovtech**. Tanya saya tentang data fashion 2025 — misalnya:\n• \"Tampilkan bar chart penjualan per platform\"\n• \"Berapa total pendapatan bulan ini?\"\n• \"Buat line chart tren penjualan perbulan\"",
};

export default function Sidebar() {
  const pathname = usePathname();
  const { addWidget } = useWidgets();

  const [mode, setMode] = useState<"menu" | "chat">("menu");
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);

  const scrollRef  = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  // Auto-resize textarea (max 100px)
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 100) + "px";
    }
  }, [input]);

  const clearChat = useCallback(() => {
    setMessages([INITIAL_MESSAGE]);
    setInput("");
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || typing) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const reply: string =
        data.reply || data.response || "Maaf, tidak ada respons.";

      // ── Normalise widgetConfig (new format → WidgetContext format) ───────
      // New format has: chartType, componentName, xKey, yKey, color, data[]
      // WidgetContext needs: componentName, type, title, data (component props)
      let widgetConfig: WidgetConfig | null = null;
      const raw = data.widgetConfig;
      if (raw && typeof raw === "object") {
        // componentName is always present (set by route.ts)
        const componentName = (raw.componentName as string) ?? "MetricCardWidget";
        const widgetType: "chart" | "metric_card" | "table" =
          raw.type === "card" ? "metric_card"
          : raw.type === "table" ? "table"
          : "chart";

        let props: Record<string, unknown> = {};

        if (widgetType === "metric_card") {
          // Legacy props are stored in _legacy field
          const leg = (raw._legacy ?? {}) as Record<string, unknown>;
          props = {
            label:      leg.label      ?? raw.title ?? "",
            value:      leg.value      ?? "",
            change:     leg.change     ?? "",
            isPositive: leg.isPositive ?? true,
            icon:       leg.icon       ?? "pi pi-chart-bar",
            color:      leg.color      ?? "#6366F1",
          };
        } else if (widgetType === "table") {
          props = {
            data:    Array.isArray(raw.data) ? raw.data : [],
            columns: Array.isArray(raw.columns) ? raw.columns : [],
            title:   String(raw.title ?? ""),
          };
        } else {
          // Chart: pass data + optional extras (color, centerValue, etc.)
          const { data: _d, componentName: _c, type: _t, chartType: _ct,
                  xKey: _x, yKey: _y, interactive: _i, interactivityConfig: _ic,
                  id: _id, title: _title, _legacy: _l, ...extras } = raw;
          props = {
            data:  Array.isArray(raw.data) ? raw.data : [],
            title: String(raw.title ?? ""),
            color: (raw.color as string) ?? "#6366F1",
            ...extras,
          };
        }

        widgetConfig = {
          id:            String(raw.id ?? `widget-${Date.now()}`),
          type:          widgetType,
          title:         String(raw.title ?? ""),
          componentName: componentName as WidgetConfig["componentName"],
          data:          props,
        };
      }

      // Inject widget into the dashboard grid
      if (widgetConfig) {
        addWidget(widgetConfig);
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply, widgetConfig },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ Gagal terhubung: ${
            err instanceof Error ? err.message : String(err)
          }`,
          widgetConfig: null,
        },
      ]);
    } finally {
      setTyping(false);
    }
  }, [input, typing, messages, addWidget]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    },
    [send],
  );

  const switchToMenu = useCallback(() => {
    setMode("menu");
    setInput("");
  }, []);

  // ── Render helper: format markdown-lite (bold + bullet) ─────────────────────
  function renderContent(content: string) {
    const lines = content.split("\n");
    return lines.map((line, i) => {
      // Bold: **text**
      const formatted = line.replace(
        /\*\*(.+?)\*\*/g,
        (_, t) => `<strong>${t}</strong>`,
      );
      // Bullet
      const isBullet = /^[•\-]\s/.test(line);
      return (
        <span
          key={i}
          style={{
            display: "block",
            paddingLeft: isBullet ? "4px" : 0,
          }}
          dangerouslySetInnerHTML={{ __html: formatted }}
        />
      );
    });
  }

  // ── CHAT MODE ───────────────────────────────────────────────────────────────
  if (mode === "chat") {
    return (
      <aside className="sidebar sidebar--chat">
        {/* ── Top header ── */}
        <div className="sidebarChatHeader">
          {/* Back button */}
          <button
            className="sidebarBackBtn"
            onClick={switchToMenu}
            aria-label="Kembali ke menu"
          >
            <i className="pi pi-arrow-left" />
            <span>Menu</span>
          </button>

          {/* AI card header */}
          <div className="sidebarAiCard">
            <div className="sidebarAiCardLeft">
              <div className="sidebarAiAvatar">
                <i className="pi pi-spark" />
              </div>
              <div className="sidebarAiInfo">
                <span className="sidebarAiName">AiGovtech</span>
                <span className="sidebarAiStatus">
                  <span className="sidebarAiDot" />
                  Analysis &amp; Q&amp;A
                </span>
              </div>
            </div>
            <button
              className="sidebarClearBtn"
              onClick={clearChat}
              title="Hapus percakapan"
            >
              <i className="pi pi-trash" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* ── Chat body ── */}
        <div className="sidebarChatBody" ref={scrollRef}>
          {messages.map((m, i) => (
            <div
              key={i}
              className={`sidebarChatMsg sidebarChatMsg-${m.role}`}
            >
              <div className="sidebarChatAvatar">
                {m.role === "assistant" ? (
                  <i className="pi pi-spark" />
                ) : (
                  <i className="pi pi-user" />
                )}
              </div>
              <div className="sidebarChatBubble">
                <div className="sidebarChatText">
                  {renderContent(m.content)}
                </div>
                {/* Widget badge — only on assistant messages with a widget */}
                {m.role === "assistant" && m.widgetConfig && (
                  <WidgetBadge widget={m.widgetConfig} />
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {typing && (
            <div className="sidebarChatMsg sidebarChatMsg-assistant">
              <div className="sidebarChatAvatar">
                <i className="pi pi-spark" />
              </div>
              <div className="sidebarChatBubble">
                <div className="sidebarChatText sidebarChatTyping">
                  <span className="sidebarChatDot" />
                  <span className="sidebarChatDot" />
                  <span className="sidebarChatDot" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Bottom fixed input ── */}
        <div className="sidebarChatInputWrap">
          <div className="sidebarChatInputRow">
            <textarea
              ref={textareaRef}
              className="sidebarChatTextarea"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask about the chart..."
              rows={1}
              aria-label="Chat input"
            />
            <button
              className="sidebarChatSend"
              onClick={send}
              disabled={!input.trim() || typing}
              aria-label="Kirim pesan"
            >
              {typing ? (
                <i className="pi pi-spin pi-spinner" />
              ) : (
                <i className="pi pi-send" />
              )}
            </button>
          </div>
          <p className="sidebarChatHint">
            Press <kbd>Enter</kbd> to send, <kbd>Shift+Enter</kbd> for new line
          </p>
        </div>
      </aside>
    );
  }

  // ── MENU MODE ───────────────────────────────────────────────────────────────
  return (
    <aside className="sidebar">
      <nav className="sidebarNav">
        <span className="sidebarLabel">Menu</span>
        {SHELL_MENUS.map((menu) => {
          const active =
            pathname === menu.href ||
            pathname.startsWith(menu.href + "/");

          if (menu.key === "aigovtech") {
            return (
              <button
                key={menu.key}
                className={`sidebarItem${active ? " sidebarItemActive" : ""}`}
                onClick={() => setMode("chat")}
              >
                <i className={menu.icon} />
                <span>{menu.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={menu.key}
              href={menu.href}
              className={`sidebarItem${active ? " sidebarItemActive" : ""}`}
            >
              <i className={menu.icon} />
              <span>{menu.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
