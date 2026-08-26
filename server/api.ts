import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { createApp, logEvent } from "../src/server/app";

// ── Environment Validation ──────────────────────────────────────
dotenv.config();

const REQUIRED_ENV_VARS = [
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

const missingVars = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  console.error(`[FATAL] Missing required environment variables: ${missingVars.join(", ")}`);
  console.error("Set them in your .env file or export them before starting the server.");
  process.exit(1);
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const PORT = parseInt(process.env.PORT || "3000", 10);
const APP_URL = process.env.APP_URL || "http://localhost:3000";
const APP_BASE_DOMAIN = process.env.APP_BASE_DOMAIN || "localhost";
const NODE_ENV = process.env.NODE_ENV || "development";
const isProduction = NODE_ENV === "production";

// ── Supabase Admin Client (server-side only) ────────────────────
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Gemini AI (optional) ────────────────────────────────────────
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: { "User-Agent": "homecare-pro-api-server" },
    },
  });
  logEvent("INFO", "Gemini AI initialized successfully");
} else {
  logEvent("WARN", "GEMINI_API_KEY not set. AI features will use fallback responses.");
}

// ── Express App (API routes only, no static frontend serving) ───
const app = createApp({
  supabaseAdmin,
  ai,
  isProduction,
  asaasWebhookToken: process.env.ASAAS_WEBHOOK_TOKEN,
  appUrl: APP_URL,
  appBaseDomain: APP_BASE_DOMAIN,
});

// ── Server Start ────────────────────────────────────────────────
const server = app.listen(PORT, "0.0.0.0", () => {
  logEvent("INFO", `HomeCare Pro API Server running on http://0.0.0.0:${PORT}`, { env: NODE_ENV });
});

const shutdown = () => {
  logEvent("INFO", "API Server shutting down...");
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

process.on("uncaughtException", (err) => {
  logEvent("ERROR", "Uncaught exception", { error: err.message, stack: err.stack });
  shutdown();
});

process.on("unhandledRejection", (reason) => {
  logEvent("ERROR", "Unhandled rejection", { reason: String(reason) });
});
