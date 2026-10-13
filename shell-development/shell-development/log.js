import { createLogger, format, transports } from "winston";
import "winston-daily-rotate-file";

// ─── Structured Log Format (mirrors template-bgn) ───
// Every log line has exactly 9 brackets:
// [timestamp] [LEVEL] [user] [flow] [method] [service] [status] [message] [duration]
//
// Source code writes natural strings; the formatter parses them into fixed
// slots. Flow tags: request/response (backend calls), incoming/outgoing (route
// handlers), internal-req/internal-res (API->API), transform, process.
// User tag: " @name" (authenticated) or " ?name" (unauthenticated attempt).

function getAutoUser(msg) {
  const authMatch = msg.match(/(?:^| )@(\S+)/);
  if (authMatch) return { name: authMatch[1], authenticated: true };
  const attemptMatch = msg.match(/(?:^| )\?(\S+)/);
  if (attemptMatch) return { name: attemptMatch[1], authenticated: false };
  return null;
}

function stripUserTag(msg) {
  return msg.replace(/(?:^| )[@?]\S+/, "").replace(/^ /, "");
}

const c = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  underline: "\x1b[4m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgRed: "\x1b[41m",
};

const userColors = [
  "\x1b[38;5;213m", "\x1b[38;5;208m", "\x1b[38;5;141m", "\x1b[38;5;81m",
  "\x1b[38;5;120m", "\x1b[38;5;217m", "\x1b[38;5;183m", "\x1b[38;5;222m",
  "\x1b[38;5;159m", "\x1b[38;5;174m", "\x1b[38;5;114m", "\x1b[38;5;203m",
];

function hashUsername(username) {
  let hash = 2166136261;
  for (let i = 0; i < username.length; i++) {
    hash ^= username.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % userColors.length;
}

function getUserColor(username) {
  return userColors[hashUsername(username)];
}

const levelColors = { info: c.green, warn: c.yellow, error: c.red, debug: c.dim };

const SYMBOL_TO_FLOW = {
  ">>": "request", "<<": "response", "=>": "incoming", "<=": "outgoing",
  ":>": "internal-req", "<:": "internal-res", "~~": "transform", "--": "process",
};
const KNOWN_FLOWS = new Set([
  "request", "response", "incoming", "outgoing",
  "internal-req", "internal-res", "transform", "process",
]);
const HTTP_METHODS = new Set(["POST", "GET", "PUT", "DELETE", "PATCH"]);

function parseStructured(msg) {
  const segments = [];
  let remaining = msg;

  while (remaining.length > 0) {
    remaining = remaining.trimStart();
    if (!remaining) break;

    if (remaining.startsWith("[")) {
      const end = remaining.indexOf("]");
      if (end === -1) {
        segments.push({ type: "text", value: remaining });
        break;
      }
      segments.push({ type: "bracket", value: remaining.slice(1, end) });
      remaining = remaining.slice(end + 1);
    } else {
      const nextBracket = remaining.indexOf("[");
      if (nextBracket === -1) {
        segments.push({ type: "text", value: remaining.trim() });
        break;
      }
      const text = remaining.slice(0, nextBracket).trim();
      if (text) segments.push({ type: "text", value: text });
      remaining = remaining.slice(nextBracket);
    }
  }

  let flow = "process";
  let method = "";
  let service = "";
  let status = "";
  let duration = "";
  const msgParts = [];

  let startIdx = 0;
  if (segments.length > 0 && segments[0].type === "bracket") {
    const val = segments[0].value;
    if (val in SYMBOL_TO_FLOW) {
      flow = SYMBOL_TO_FLOW[val];
      startIdx = 1;
    } else if (KNOWN_FLOWS.has(val)) {
      flow = val;
      startIdx = 1;
    }
  }

  let methodFound = false;
  let serviceFound = false;
  let statusFound = false;
  let durationFound = false;

  for (let i = startIdx; i < segments.length; i++) {
    const seg = segments[i];

    if (!methodFound && seg.type === "bracket" && HTTP_METHODS.has(seg.value)) {
      method = seg.value;
      methodFound = true;
      continue;
    }
    if (
      !serviceFound &&
      seg.type === "bracket" &&
      /^[A-Za-z][A-Za-z0-9_-]*$/.test(seg.value) &&
      !HTTP_METHODS.has(seg.value) &&
      !KNOWN_FLOWS.has(seg.value)
    ) {
      service = seg.value;
      serviceFound = true;
      continue;
    }
    if (!statusFound && seg.type === "bracket" && /^\d{3}$/.test(seg.value)) {
      status = seg.value;
      statusFound = true;
      continue;
    }
    if (!durationFound && seg.type === "bracket" && /^\d+ms$/.test(seg.value)) {
      duration = seg.value;
      durationFound = true;
      continue;
    }
    if (seg.type === "bracket") {
      msgParts.push(`[${seg.value}]`);
    } else {
      msgParts.push(seg.value);
    }
  }

  const message = msgParts.join(" ").trim();
  return { flow, method, service, status, message, duration };
}

function colorizeMessage(text) {
  const jsonPlaceholders = [];
  let result = text.replace(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, (match) => {
    const idx = jsonPlaceholders.length;
    jsonPlaceholders.push(`\x1b[38;5;245m\x1b[1m${match}${c.reset}`);
    return `\uFFFDJSON${idx}\uFFFD`;
  });

  result = result
    .replace(/\[([A-Za-z][A-Za-z0-9_-]*)\]/g, `${c.cyan}[$1]${c.reset}`)
    .replace(/<(https?:\/\/[^>]+)>/g, `${c.blue}${c.underline}<$1>${c.reset}`)
    .replace(/\(([^)]{0,500}?\w: [^)]{0,500})\)/g, (_m, inner) => {
      const colored = inner.replace(
        /"([^"]*)"/g,
        `${c.reset}${c.white}${c.bold}"$1"${c.reset}${c.dim}`,
      );
      return `${c.dim}(${colored})${c.reset}`;
    })
    .replace(/"([^"]*)"/g, `${c.white}${c.bold}"$1"${c.reset}`);

  result = result.replace(/\uFFFDJSON(\d+)\uFFFD/g, (_m, idx) =>
    jsonPlaceholders[parseInt(idx)],
  );
  return result;
}

function colorizeStatus(code) {
  const n = parseInt(code, 10);
  if (n >= 200 && n < 300) return `${c.green}${code}${c.reset}`;
  if (n >= 400 && n < 500) return `${c.yellow}${code}${c.reset}`;
  if (n >= 500) return `${c.bgRed}${c.white}${code}${c.reset}`;
  return code;
}

const plainFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.printf(({ timestamp, level, message: msg }) => {
    const raw = String(msg);
    const user = getAutoUser(raw);
    const stripped = stripUserTag(raw);
    const { flow, method, service, status, message, duration } =
      parseStructured(stripped);
    const userPart = user
      ? `[${user.authenticated ? "@" : "?"}${user.name}]`
      : "[]";
    return `[${timestamp}] [${level.toUpperCase()}] ${userPart} [${flow}] [${method}] [${service}] [${status}] [${message}] [${duration}]`;
  }),
);

const coloredFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.printf(({ timestamp, level, message: msg }) => {
    const lc = levelColors[level] || c.white;
    const ts = `${c.dim}[${timestamp}]${c.reset}`;
    const lv = `${lc}${c.bold}[${level.toUpperCase()}]${c.reset}`;
    const raw = String(msg);
    const user = getAutoUser(raw);
    const stripped = stripUserTag(raw);
    const { flow, method, service, status, message, duration } =
      parseStructured(stripped);
    const uc = user ? getUserColor(user.name) : "";
    const prefix = user ? (user.authenticated ? "@" : "?") : "";
    const userPart = user
      ? `${uc}${c.bold}[${prefix}${user.name}]${c.reset}`
      : `${c.dim}[]${c.reset}`;
    const flowPart = `${c.cyan}[${flow}]${c.reset}`;
    const methodPart = method
      ? `${c.magenta}${c.bold}[${method}]${c.reset}`
      : `${c.dim}[]${c.reset}`;
    const servicePart = service
      ? `[${c.cyan}${service}${c.reset}]`
      : `${c.dim}[]${c.reset}`;
    const statusPart = status ? `[${colorizeStatus(status)}]` : `${c.dim}[]${c.reset}`;
    const msgPart = message ? `[${colorizeMessage(message)}]` : `${c.dim}[]${c.reset}`;
    const durPart = duration
      ? `${c.yellow}[${duration}]${c.reset}`
      : `${c.dim}[]${c.reset}`;
    return `${ts} ${lv} ${userPart} ${flowPart} ${methodPart} ${servicePart} ${statusPart} ${msgPart} ${durPart}`;
  }),
);

const dailyRotate = new transports.DailyRotateFile({
  filename: "template-shell_%DATE%.log",
  datePattern: "DD-MM-YYYY",
  maxFiles: "14d",
  dirname: "./logs/",
  format: plainFormat,
});

export const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  transports: [
    new transports.Console({ format: coloredFormat }),
    dailyRotate,
  ],
});
