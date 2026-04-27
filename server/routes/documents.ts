import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "node:fs";
import { prisma } from "../db";
import { authenticate, AuthRequest } from "../middleware/auth";

export const documentsRouter = Router();

const ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_TYPES = [
  "car",
  "ccir",
  "itr",
  "matricula",
  "licenca_ambiental",
  "outorga_agua",
  "projeto_tecnico",
  "outro",
];

const storage = multer.diskStorage({
  destination: path.join(process.cwd(), "uploads"),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = Date.now() + "-" + Math.random().toString(36).slice(2);
    cb(null, safe + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de arquivo não permitido. Use PDF, JPEG, PNG ou WebP."));
    }
  },
});

// Verifica magic bytes — protege contra arquivos maliciosos com Content-Type falso
const checkMagicBytes = (filePath: string): boolean => {
  const buf = Buffer.alloc(12);
  let fd: number | null = null;
  try {
    fd = fs.openSync(filePath, "r");
    fs.readSync(fd, buf, 0, 12, 0);
    // PDF: 25 50 44 46 (%PDF)
    if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return true;
    // JPEG: FF D8 FF
    if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return true;
    // PNG
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47 &&
        buf[4] === 0x0D && buf[5] === 0x0A && buf[6] === 0x1A && buf[7] === 0x0A) return true;
    // WebP
    if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
        buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return true;
    return false;
  } catch {
    return false;
  } finally {
    if (fd !== null) try { fs.closeSync(fd); } catch { /**/ }
  }
};

// GET /api/documents — listar documentos do usuário autenticado
documentsRouter.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const docs = await prisma.userDocument.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
    });
    res.json(docs);
  } catch {
    res.status(500).json({ error: "Erro interno" });
  }
});

// POST /api/documents — upload + criar registro
documentsRouter.post(
  "/",
  authenticate,
  upload.single("file"),
  async (req: AuthRequest, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Arquivo inválido ou muito grande (máx 10 MB)" });
    }

    if (!checkMagicBytes(req.file.path)) {
      fs.unlink(req.file.path, () => { /* limpa rejeitado */ });
      return res.status(400).json({ error: "Arquivo rejeitado: conteúdo não corresponde a PDF/JPEG/PNG/WebP" });
    }

    try {
      const { type, name, expiresAt, notes } = req.body;

      if (!type || !ALLOWED_TYPES.includes(String(type))) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: "Tipo de documento inválido" });
      }
      if (!name?.trim()) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: "name é obrigatório" });
      }
      if (String(name).length > 160) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: "name: máx 160 caracteres" });
      }
      if (notes !== undefined && String(notes ?? "").length > 1000) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: "notes: máx 1000 caracteres" });
      }

      const base = process.env.API_URL ?? "http://localhost:4000";
      const url = `${base}/uploads/${req.file.filename}`;

      const doc = await prisma.userDocument.create({
        data: {
          userId: req.userId!,
          type: String(type),
          name: String(name).trim(),
          url,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          notes: notes?.trim() ?? null,
          updatedAt: new Date(),
        },
      });

      res.status(201).json(doc);
    } catch (err) {
      console.error("create document error", err);
      if (req.file) fs.unlink(req.file.path, () => {});
      res.status(500).json({ error: "Erro interno" });
    }
  }
);

// PUT /api/documents/:id — editar metadados (não troca arquivo)
documentsRouter.put("/:id", authenticate, async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.userDocument.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: "Documento não encontrado" });

    const { name, expiresAt, notes } = req.body;

    if (name !== undefined && String(name).length > 160)
      return res.status(400).json({ error: "name: máx 160 caracteres" });
    if (notes !== undefined && String(notes ?? "").length > 1000)
      return res.status(400).json({ error: "notes: máx 1000 caracteres" });

    const updated = await prisma.userDocument.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        ...(notes !== undefined && { notes: notes?.trim() ?? null }),
        updatedAt: new Date(),
      },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Erro interno" });
  }
});

// DELETE /api/documents/:id — remove arquivo do disco e o registro
documentsRouter.delete("/:id", authenticate, async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.userDocument.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: "Documento não encontrado" });

    // Tenta apagar arquivo físico (best-effort)
    try {
      const filename = path.basename(new URL(existing.url).pathname);
      const filePath = path.join(process.cwd(), "uploads", filename);
      fs.unlink(filePath, () => {});
    } catch { /* url inválida — só apaga o registro */ }

    await prisma.userDocument.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Erro interno" });
  }
});
