import nextEnv from "@next/env";
import { validateEnv } from "./env-management/index.js";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

validateEnv();
