import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";

import { authRouter } from "./routes/auth";
import { farmsRouter } from "./routes/farms";
import { lotsRouter } from "./routes/lots";
import { photosRouter } from "./routes/photos";
import { practicesRouter } from "./routes/practices";
import { webhookRouter } from "./routes/webhook";

const app = express();
const PORT = Number(process.env.PORT) || 4000;

// ── Security headers ──────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // permite servir /uploads
  })
);

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(",")
      : ["http://localhost:3000", "http://localhost:4173"],
    credentials: true,
  })
);

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use(
  "/api/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Muitas tentativas. Tente novamente em 15 minutos.",
    },
  })
);

app.use(
  "/api",
  rateLimit({
    windowMs: 60 * 1000, // 1 min
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// ── Static uploads ────────────────────────────────────────────────────────────
// Em produção, mover para S3/Cloudflare R2 e remover esta linha
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/farms", farmsRouter);
app.use("/api/lots", lotsRouter);
app.use("/api/photos", photosRouter);
app.use("/api/practices", practicesRouter);
app.use("/api/webhook", webhookRouter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) =>
  res.json({ ok: true, env: process.env.NODE_ENV })
);

// ── 404 catch-all ─────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Rota não encontrada" }));

app.listen(PORT, () => {
  console.log(`🌱 Rastro API → http://localhost:${PORT}`);
});

export default app;
