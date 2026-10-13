import { createServer } from "node:net";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.REDIS_PORT || 6380);
const HOST = process.env.REDIS_HOST || "127.0.0.1";

// Simple in-memory store with TTL support
const store = new Map(); // key -> { value, expiresAt }

// Periodic cleanup
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (v.expiresAt && v.expiresAt < now) store.delete(k);
  }
}, 30000);

function parseCommand(buf) {
  // Parse RESP protocol
  const str = buf.toString();
  const lines = str.split(/\r\n/);
  if (lines[0].startsWith("*")) {
    const count = parseInt(lines[0].slice(1));
    const args = [];
    let idx = 1;
    for (let i = 0; i < count; i++) {
      // line format: $<len>\r\n<value>
      const lenLine = lines[idx++];
      const len = parseInt(lenLine.slice(1));
      args.push(lines[idx++].slice(0, len));
    }
    return args;
  }
  // Inline command fallback
  return str.trim().split(/\s+/);
}

function encodeResp(value) {
  if (value === null || value === undefined) return "$-1\r\n";
  if (Array.isArray(value)) {
    let s = `*${value.length}\r\n`;
    for (const v of value) s += encodeResp(v);
    return s;
  }
  const str = String(value);
  return `$${str.length}\r\n${str}\r\n`;
}

function handleCommand(args, respond) {
  const cmd = args[0]?.toUpperCase();
  switch (cmd) {
    case "PING":
      return respond(encodeResp("PONG"));
    case "SET": {
      const [key, value] = args.slice(1);
      const exIdx = args.indexOf("EX");
      const pxIdx = args.indexOf("PX");
      let expiresAt = null;
      if (exIdx >= 0) {
        const seconds = parseInt(args[exIdx + 1]);
        expiresAt = Date.now() + seconds * 1000;
      } else if (pxIdx >= 0) {
        const ms = parseInt(args[pxIdx + 1]);
        expiresAt = Date.now() + ms;
      }
      store.set(key, { value, expiresAt });
      return respond(encodeResp("OK"));
    }
    case "GET": {
      const rec = store.get(args[1]);
      if (!rec || (rec.expiresAt && rec.expiresAt < Date.now())) {
        store.delete(args[1]);
        return respond(encodeResp(null));
      }
      return respond(encodeResp(rec.value));
    }
    case "DEL": {
      const keys = args.slice(1);
      let deleted = 0;
      for (const k of keys) {
        if (store.has(k)) { store.delete(k); deleted++; }
      }
      return respond(encodeResp(deleted));
    }
    case "EXISTS": {
      let count = 0;
      for (const k of args.slice(1)) {
        const rec = store.get(k);
        if (rec && (!rec.expiresAt || rec.expiresAt >= Date.now())) count++;
      }
      return respond(encodeResp(count));
    }
    case "EXPIRE": {
      const [key, seconds] = args.slice(1);
      const rec = store.get(key);
      if (!rec) return respond(encodeResp(0));
      rec.expiresAt = Date.now() + parseInt(seconds) * 1000;
      return respond(encodeResp(1));
    }
    case "TTL": {
      const rec = store.get(args[1]);
      if (!rec) return respond(encodeResp(-2));
      if (!rec.expiresAt) return respond(encodeResp(-1));
      const remaining = Math.ceil((rec.expiresAt - Date.now()) / 1000);
      return respond(encodeResp(Math.max(0, remaining)));
    }
    case "KEYS": {
      const pattern = args[1];
      const matches = [];
      const now = Date.now();
      for (const [k, v] of store.entries()) {
        if (v.expiresAt && v.expiresAt < now) continue;
        // Simple glob: * matches anything
        const re = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
        if (re.test(k)) matches.push(k);
      }
      return respond(encodeResp(matches));
    }
    case "FLUSHALL": {
      store.clear();
      return respond(encodeResp("OK"));
    }
    case "QUIT":
      return respond(encodeResp("OK"));
    default:
      return respond(encodeResp(`-ERR unknown command '${cmd}'`));
  }
}

const server = createServer((socket) => {
  let buffer = "";
  socket.on("data", (data) => {
    buffer += data.toString();
    // Process all complete commands in buffer
    while (buffer.length > 0) {
      const args = parseCommand(buffer);
      if (!args || args.length === 0) break;
      // Estimate consumed bytes
      const str = buffer;
      const lines = str.split(/\r\n/);
      if (lines[0].startsWith("*")) {
        const count = parseInt(lines[0].slice(1));
        const consumed = 1 + count * 2;
        buffer = lines.slice(consumed).join("\r\n");
        if (buffer.startsWith("\r\n")) buffer = buffer.slice(2);
      } else {
        const idx = str.indexOf("\r\n");
        buffer = idx >= 0 ? str.slice(idx + 2) : "";
      }
      handleCommand(args, (resp) => socket.write(resp));
    }
  });
  socket.on("error", () => {});
});

server.listen(PORT, HOST, () => {
  console.log(`[mock-redis] listening on ${HOST}:${PORT}`);
});

server.on("error", (err) => {
  console.error("[mock-redis] error:", err.message);
  process.exit(1);
});