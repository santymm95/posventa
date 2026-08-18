import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { initializeDatabase } from "../db/init";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

const app = express();
const server = createServer(app);

// Configure body parser with larger size limit for file uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Database initialization promise cached per container lifecycle
let dbInitialized: Promise<void> | null = null;
const ensureDatabaseInitialized = () => {
  if (!dbInitialized) {
    dbInitialized = initializeDatabase().catch(err => {
      console.error("Failed to initialize database:", err);
      dbInitialized = null; // Reset to allow retry on next request
      throw err;
    });
  }
  return dbInitialized;
};

// Middleware to ensure DB is initialized before handling requests (except health check)
app.use(async (req, res, next) => {
  if (req.path === "/health") {
    return next();
  }
  try {
    await ensureDatabaseInitialized();
    next();
  } catch (err) {
    next(err);
  }
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, database: Boolean(process.env.DATABASE_URL) });
});

// OAuth callback under /api/oauth/callback
registerOAuthRoutes(app);

// tRPC API
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// development mode uses Vite, production mode uses static files
if (process.env.NODE_ENV === "development") {
  setupVite(app, server).catch(console.error);
} else {
  serveStatic(app);
}

// Error handling middleware to ensure we always return JSON instead of HTML on crash
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Unhandled server error:", err);
  res.status(err.status || 500).json({
    error: {
      json: {
        message: err.message || "Internal Server Error",
        code: -32603,
        data: {
          code: "INTERNAL_SERVER_ERROR",
          httpStatus: err.status || 500,
          stack: err.stack || "",
        },
      },
    },
  });
});

// Start standalone server only when NOT deploying as a serverless function on Vercel
if (!process.env.VERCEL) {
  (async () => {
    const preferredPort = parseInt(process.env.PORT || "3000");
    const port = await findAvailablePort(preferredPort);

    if (port !== preferredPort) {
      console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
    }

    server.listen(port, () => {
      console.log(`Server running on http://localhost:${port}/`);
    });
  })().catch(console.error);
}

export default app;
