import { Router } from "express";
import multer from "multer";
import path from "path";
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

    const base = process.env.API_URL ?? "http://localhost:4000";
    const url = `${base}/uploads/${req.file.filename}`;
    res.json({ url });
  }
);
