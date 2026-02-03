import "dotenv/config";
import express from "express";
import cors, { type CorsOptions } from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import session from "express-session";
import pg from "pg";
import PgSession from "connect-pg-simple";
import path from "path";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";

import { config } from "./config";
import { authRouter } from "./auth/routes";
import { ensureAdminUser } from "./auth/seedAdmin";
import { feedRouter } from "./feed/routes";
import { adminRouter } from "./admin/routes";
import { khipuRouter } from "./khipu/routes";
import { profileRouter } from "./profile/routes";
import { servicesRouter } from "./services/routes";
import { messagesRouter } from "./messages/routes";
import { creatorRouter } from "./creator/routes";
import { billingRouter } from "./billing/routes";
import { notificationsRouter } from "./notifications/routes";
import { KhipuError } from "./khipu/client";
import { statsRouter } from "./stats/routes";
import { prisma } from "./db";

const app = express();

app.set("trust proxy", 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

const corsOrigins = Array.from(new Set([
  "https://uzeed.cl",
  "https://www.uzeed.cl",
  ...config.corsOrigin.split(",").map((s) => s.trim()).filter(Boolean)
]));

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (corsOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("CORS_NOT_ALLOWED"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-Request-Id"],
  exposedHeaders: ["X-Request-Id"]
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false
}));

app.use(cookieParser());

app.use((req, res, next) => {
  const requestId = req.header("x-request-id") || randomUUID();
  (req as any).requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
});

// JSON body, except for webhook where we need raw body for signature
app.use((req, res, next) => {
  if (req.path.startsWith("/webhooks/khipu")) {
    express.raw({ type: "application/json" })(req, res, (err) => {
      if (err) return next(err);
      (req as any).rawBody = req.body;
      try {
        req.body = JSON.parse((req.body as Buffer).toString("utf8"));
      } catch {
        req.body = {};
      }
      return next();
    });
  } else {
    express.json({ limit: "2mb" })(req, res, next);
  }
});

const pgPool = new pg.Pool({ connectionString: config.databaseUrl });
const PgStore = PgSession(session);

app.use(
  session({
    name: "uzeed_session",
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: config.env !== "development",
      domain: config.cookieDomain,
      maxAge: 1000 * 60 * 60 * 24 * 30
    },
    store: new PgStore({ pool: pgPool, tableName: "session", createTableIfMissing: true })
  })
);

app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/ready", async (_req, res) => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "DB_NOT_READY" });
  }
});
app.get("/version", (_req, res) => res.json({ sha: process.env.GIT_SHA || "unknown", env: config.env }));

// static uploads
app.use(
  "/uploads",
  (req, res, next) => {
    const origin = req.headers.origin;
    // For media, we do not need credentials. Keep a strict allowlist to avoid surprises in prod.
    if (origin && corsOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-Request-Id");
    res.setHeader("Access-Control-Expose-Headers", "Accept-Ranges, Content-Range, Content-Length");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  },
  express.static(path.resolve(config.storageDir), {
    maxAge: "1h",
    setHeaders: (res) => {
      // Ensure Range requests for videos work behind proxies.
      res.setHeader("Accept-Ranges", "bytes");
    }
  })
);

app.use("/auth", authRouter);
app.use("/", feedRouter);
app.use("/admin", adminRouter);
app.use("/", khipuRouter);
app.use("/", profileRouter);
app.use("/", servicesRouter);
app.use("/", messagesRouter);
app.use("/", creatorRouter);
app.use("/", billingRouter);
app.use("/", notificationsRouter);
app.use("/", statsRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const requestId = (_req as any).requestId;
  const errorPayload = {
    level: "error",
    requestId,
    route: _req.originalUrl,
    message: err?.message || "Unknown error",
    code: err?.code
  };
  console.error(JSON.stringify(errorPayload));
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2021" || err.code === "P2022") {
      return res.status(500).json({ error: "DB_SCHEMA_MISMATCH" });
    }
  }
  if (err instanceof KhipuError) {
    const hint = err.status === 404
      ? "Khipu devolvió 404. Revisa KHIPU_BASE_URL (prod vs sandbox) y que apunte a la API correcta."
      : undefined;
    return res.status(502).json({ error: "KHIPU_ERROR", status: err.status, message: err.message, hint });
  }
  if (typeof err?.message === "string" && err.message.startsWith("Khipu")) {
    return res.status(502).json({ error: "KHIPU_ERROR" });
  }
  if (err?.message === "CORS_NOT_ALLOWED") {
    return res.status(403).json({ error: "CORS_NOT_ALLOWED" });
  }
  if (err?.message === "INVALID_FILE_TYPE") {
    return res.status(400).json({ error: "INVALID_FILE_TYPE" });
  }
  if (err?.message === "FILE_TOO_LARGE") {
    return res.status(400).json({ error: "FILE_TOO_LARGE" });
  }
  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "FILE_TOO_LARGE" });
  }
  res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
});

async function logDatabaseDiagnostics(): Promise<string[]> {
  let tableNames: string[] = [];
  try {
    const dbUrl = new URL(config.databaseUrl);
    const schema = dbUrl.searchParams.get("schema") || "public";
    console.log("[db] url", {
      host: dbUrl.hostname,
      port: dbUrl.port,
      database: dbUrl.pathname.replace("/", ""),
      schema
    });
  } catch (err) {
    console.warn("[db] invalid DATABASE_URL", err);
  }

  try {
    const info = await prisma.$queryRawUnsafe<
      Array<{ current_database: string; current_schema: string; version: string }>
    >("SELECT current_database(), current_schema(), version();");
    console.log("[db] info", info[0]);
  } catch (err) {
    console.warn("[db] info query failed", err);
  }

  try {
    const tables = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
      "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;"
    );
    tableNames = tables.map((t) => t.tablename);
    console.log("[db] tables", tableNames);
  } catch (err) {
    console.warn("[db] tables query failed", err);
  }

  try {
    const migrations = await prisma.$queryRawUnsafe<
      Array<{ migration_name: string; finished_at: Date | null }>
    >('SELECT migration_name, finished_at FROM "_prisma_migrations" ORDER BY finished_at DESC;');
    console.log("[db] prisma migrations", migrations);
  } catch (err) {
    console.warn("[db] prisma migrations query failed", err);
  }
  return tableNames;
}

process.on("unhandledRejection", (err) => {
  console.error("[api] unhandledRejection", err);
});

process.on("uncaughtException", (err) => {
  console.error("[api] uncaughtException", err);
});

ensureAdminUser()
  .catch((err) => console.error("[api] admin seed failed", err))
  .finally(async () => {
    const tables = await logDatabaseDiagnostics();
    const expectedTables = ["User", "Post", "Media", "ProfileMedia", "ServiceMedia", "PaymentIntent", "Notification"];
    const missing = expectedTables.filter((t) => !tables.includes(t));
    if (missing.length) {
      console.error("[db] missing tables", missing);
      process.exit(1);
    }
    app.listen(config.port, () => {
      console.log(`[api] listening on :${config.port}`);
    });
  });
