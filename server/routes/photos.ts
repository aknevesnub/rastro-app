import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "node:fs";
import { authenticate, AuthRequest } from "../middleware/auth";

export const photosRouter = Router();

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

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
      cb(new Error("Tipo de arquivo não permitido. Use JPEG, PNG ou WebP."));
    }
  },
});

// Verifica magic bytes reais do arquivo (não confia no Content-Type do header)
// Protege contra upload de arquivos maliciosos com Content-Type falso
const checkMagicBytes = (filePath: string): boolean => {
  const buf = Buffer.alloc(12);
  let fd: number | null = null;
  try {
    fd = fs.openSync(filePath, "r");
    fs.readSync(fd, buf, 0, 12, 0);
    // JPEG: FF D8 FF
    if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return true;
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47 &&
        buf[4] === 0x0D && buf[5] === 0x0A && buf[6] === 0x1A && buf[7] === 0x0A) return true;
    // WebP: RIFF????WEBP
    if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
        buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return true;
    return false;
  } catch {
    return false;
  } finally {
    if (fd !== null) try { fs.closeSync(fd); } catch { /**/ }
  }
};

// POST /api/photos — upload de uma foto
// Para S3/R2: trocar o storage acima por multer-s3
photosRouter.post(
  "/",
  authenticate,
  upload.single("photo"),
  (req: AuthRequest, res) => {
    if (!req.file) {
      return res
        .status(400)
        .json({ error: "Arquivo inválido ou muito grande (máx 5 MB)" });
    }

    // Valida conteúdo real do arquivo via magic bytes
    if (!checkMagicBytes(req.file.path)) {
      fs.unlink(req.file.path, () => { /* limpa arquivo rejeitado */ });
      return res
        .status(400)
        .json({ error: "Arquivo rejeitado: conteúdo não é uma imagem JPEG, PNG ou WebP válida" });
    }

    const base = process.env.API_URL ?? "http://localhost:4000";
    const url = `${base}/uploads/${req.file.filename}`;
    res.json({ url });
  }
);
