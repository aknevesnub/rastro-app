import { Router } from "express";
import path from "path";
import fs from "node:fs";
import { prisma } from "../db";
import { authenticate, AuthRequest } from "../middleware/auth";

export const practicesRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Apaga arquivo do disco com proteção contra path traversal
const safeDeleteFile = (url: string | null | undefined) => {
  if (!url) return;
  try {
    const filename = path.basename(new URL(url).pathname);
    const SAFE_NAME = /^[0-9]+-[a-z0-9]+\.[a-z0-9]+$/i;
    if (!SAFE_NAME.test(filename)) return;
    const uploadsDir = path.resolve(process.cwd(), "uploads");
    const filePath = path.resolve(uploadsDir, filename);
    if (filePath.startsWith(uploadsDir + path.sep)) {
      fs.unlink(filePath, () => {});
    }
  } catch { /* url externa */ }
};

// GET /api/practices — todas as práticas declaradas pelo usuário autenticado
practicesRouter.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const practices = await prisma.userPractice.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
    });
    res.json(practices);
  } catch {
    res.status(500).json({ error: "Erro interno" });
  }
});

// POST /api/practices — criar/upsert (única por userId+key)
practicesRouter.post("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const { category, key, name, active, startDate, photoUrl, notes } = req.body;

    if (!category?.trim() || !key?.trim() || !name?.trim()) {
      return res.status(400).json({ error: "category, key e name são obrigatórios" });
    }
    if (String(category).length > 50) return res.status(400).json({ error: "category: máx 50 caracteres" });
    if (String(key).length > 80) return res.status(400).json({ error: "key: máx 80 caracteres" });
    if (String(name).length > 120) return res.status(400).json({ error: "name: máx 120 caracteres" });
    if (notes !== undefined && String(notes ?? "").length > 1000)
      return res.status(400).json({ error: "notes: máx 1000 caracteres" });

    const data = {
      userId: req.userId!,
      category: category.trim(),
      key: key.trim(),
      name: name.trim(),
      active: active ?? true,
      startDate: startDate ? new Date(startDate) : null,
      photoUrl: photoUrl ?? null,
      notes: notes?.trim() ?? null,
      updatedAt: new Date(),
    };

    const practice = await prisma.userPractice.upsert({
      where: { userId_key: { userId: req.userId!, key: data.key } },
      update: {
        category: data.category,
        name: data.name,
        active: data.active,
        startDate: data.startDate,
        photoUrl: data.photoUrl,
        notes: data.notes,
        updatedAt: data.updatedAt,
      },
      create: data,
    });

    res.status(201).json(practice);
  } catch (err) {
    console.error("create practice error", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// PUT /api/practices/:id — atualizar
practicesRouter.put("/:id", authenticate, async (req: AuthRequest, res) => {
  if (!UUID_RE.test(req.params.id)) {
    return res.status(404).json({ error: "Prática não encontrada" });
  }
  try {
    const existing = await prisma.userPractice.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: "Prática não encontrada" });

    const { name, active, startDate, photoUrl, notes } = req.body;

    if (name !== undefined && String(name).length > 120)
      return res.status(400).json({ error: "name: máx 120 caracteres" });
    if (notes !== undefined && String(notes ?? "").length > 1000)
      return res.status(400).json({ error: "notes: máx 1000 caracteres" });

    // Se foto antiga foi substituída, apaga do disco
    if (photoUrl !== undefined && existing.photoUrl && existing.photoUrl !== photoUrl) {
      safeDeleteFile(existing.photoUrl);
    }

    const updated = await prisma.userPractice.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(active !== undefined && { active: Boolean(active) }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(photoUrl !== undefined && { photoUrl }),
        ...(notes !== undefined && { notes: notes?.trim() ?? null }),
        updatedAt: new Date(),
      },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Erro interno" });
  }
});

// DELETE /api/practices/:id
practicesRouter.delete("/:id", authenticate, async (req: AuthRequest, res) => {
  if (!UUID_RE.test(req.params.id)) {
    return res.status(404).json({ error: "Prática não encontrada" });
  }
  try {
    const existing = await prisma.userPractice.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: "Prática não encontrada" });

    safeDeleteFile(existing.photoUrl);
    await prisma.userPractice.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Erro interno" });
  }
});
