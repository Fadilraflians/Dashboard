// Reusable env value type definitions: { pattern, label }
// Priority in the schema: an explicit `pattern` overrides a `type` reference.

export const ENV_TYPES = {
  string: { pattern: /.*/, label: "string" },
  boolean: { pattern: /^(true|false)$/, label: "boolean (true|false)" },
  number: { pattern: /^\d+$/, label: "number" },
  integer: { pattern: /^\d+$/, label: "integer" },
  url: { pattern: /^https?:\/\/.+/, label: "url (http/https)" },
  "url-optional": { pattern: /^(https?:\/\/.+)?$/, label: "optional url" },
  host: { pattern: /^[\w.-]+$/, label: "host" },
  secret: { pattern: /^.{16,}$/, label: "secret (min 16 chars)" },
  "node-env": {
    pattern: /^(development|production|test)$/,
    label: "node-env (development|production|test)",
  },
};
