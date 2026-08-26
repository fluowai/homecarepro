import path from "path";
import fs from "fs";
import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { createServer as createViteServer } from "vite";
import { createApp, logEvent } from "./src/server/app";

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
      headers: { "User-Agent": "homecare-pro-server" },
    },
  });
  logEvent("INFO", "Gemini AI initialized successfully");
} else {
  logEvent("WARN", "GEMINI_API_KEY not set. AI features will use fallback responses.");
}

// ── Express App ─────────────────────────────────────────────────
const app = createApp({
  supabaseAdmin,
  ai,
  isProduction,
  asaasWebhookToken: process.env.ASAAS_WEBHOOK_TOKEN,
  appUrl: APP_URL,
  appBaseDomain: APP_BASE_DOMAIN,
});

// ── Server Start ────────────────────────────────────────────────
const startServer = async () => {
  if (!isProduction) {
    logEvent("INFO", "Starting in development mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    logEvent("INFO", "Starting in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, {
      index: false,
      maxAge: "1y",
      etag: true,
      lastModified: true,
    }));
    app.get("*", (req, res) => {
      if (req.path.startsWith("/assets/")) {
        return res.status(404).send("Not Found");
      }
      
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        let indexHtml = fs.readFileSync(indexPath, "utf8");
        const nonce = res.locals.cspNonce;
        const envScript = `<script nonce="${nonce}">window.__ENV__ = ${JSON.stringify({
          VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
          VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
          VITE_APP_BASE_DOMAIN: process.env.APP_BASE_DOMAIN || process.env.VITE_APP_BASE_DOMAIN || "homecare.wootech.com.br",
          VITE_PUBLIC_VAPID_KEY: process.env.VITE_PUBLIC_VAPID_KEY || "",
        })}</script>`;
        indexHtml = indexHtml.replace("</head>", `${envScript}</head>`);
        
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        
        res.send(indexHtml);
      } else {
        res.status(404).send("Not Found");
      }
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    logEvent("INFO", `HomeCare Pro Server running on http://0.0.0.0:${PORT}`, { env: NODE_ENV });
  });

  const shutdown = () => {
    logEvent("INFO", "Server shutting down...");
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
};

startServer().catch((err) => {
  logEvent("ERROR", "Failed to start server", { error: err.message });
  process.exit(1);
});
