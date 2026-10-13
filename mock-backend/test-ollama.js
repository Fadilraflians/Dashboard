const http = require("node:http");

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434/api/generate";
const MODEL = process.env.OLLAMA_MODEL || "qwen2.5:7b";

async function main() {
  // Test Ollama connectivity
  const res = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, prompt: "Hai", stream: false }),
  });
  const data = await res.json();
  console.log("Ollama response:", JSON.stringify(data).slice(0, 200));
  process.exit(0);
}

main().catch((err) => {
  console.error("Ollama test failed:", err.message);
  process.exit(1);
});