import { createServer } from "http";
import { parse, fileURLToPath } from "url";
import next from "next";
import { logger } from "./log.js";
import { customNextConfig } from "./custom-config.js";
import fs from "fs";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dev = process.env.NODE_ENV !== "production";

if (!dev) {
  const configPath = resolve(__dirname, "./.next/required-server-files.json");

  if (fs.existsSync(configPath)) {
    try {
      const { config } = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(config);
    } catch (error) {
      console.error("Error reading required-server-files.json:", error);
    }
  }
}

const app = next({ dev, conf: customNextConfig });
const handle = app.getRequestHandler();
const port = process.env.SERVER_PORT || 3000;

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);

    const exceptionPath =
      !req.url.includes("next") && !req.url.includes("favicon.ico");

    const start = Date.now();

    if (exceptionPath) {
      logger.info(`[CAT:SHELL] [incoming] [Server] [${req.method}] <${req.url}>`);
    }

    res.on("finish", () => {
      if (exceptionPath) {
        const duration = Date.now() - start;

        if (res.statusCode >= 400) {
          logger.error(
            `[CAT:SHELL] [outgoing] [Server] [${req.method}] <${req.url}> [${res.statusCode}] "${res.statusMessage}" [${duration}ms]`,
          );
        } else {
          logger.info(
            `[CAT:SHELL] [outgoing] [Server] [${req.method}] <${req.url}> [${res.statusCode}] "${res.statusMessage}" [${duration}ms]`,
          );
        }
      }
    });

    handle(req, res, parsedUrl).catch(() => {
      const duration = Date.now() - start;
      logger.error(
        `[CAT:SHELL] [outgoing] [Server] [${req.method}] <${req.url}> [${res.statusCode}] [${duration}ms]`,
      );
      res.statusCode = 500;
      res.end("Internal Server Error");
    });
  });

  server.listen(port, async () => {
    console.log(`> Ready on port ${port}`);
  });
});
