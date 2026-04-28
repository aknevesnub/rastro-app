import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { Resend } from "resend";
import { prisma } from "../db";
import { authenticate, AuthRequest } from "../middleware/auth";

export const authRouter = Router();

const SALT_ROUNDS = 12;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Gera token aleatório seguro (URL-safe)
const genToken = () =>
  crypto.randomBytes(32).toString("base64url");

// Hash de token (armazena apenas hash no DB; só o usuário vê o original via email)
const hashToken = (t: string) =>
  crypto.createHash("sha256").update(t).digest("hex");

// Resend SDK (lazy-init para não quebrar se a chave não estiver presente)
let resendClient: Resend | null = null;
const getResend = () => {
  if (resendClient) return resendClient;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  resendClient = new Resend(key);
  return resendClient;
};

// Converte texto plano em HTML simples (preserva quebras + transforma URLs em links)
const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const textToHtml = (text: string) => {
  const escaped = escapeHtml(text);
  const linked = escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" style="color:#16a34a">$1</a>',
  );
  return `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:14px;line-height:1.6;color:#111;max-width:560px">${linked.replace(/\n/g, "<br>")}</div>`;
};

// Helper: envia email via Resend (log no console se a chave não estiver configurada)
const sendEmail = async (to: string, subject: string, body: string) => {
  const resend = getResend();
  if (!resend) {
    console.info(`[Email → ${to}] ${subject}\n${body}`);
    return;
  }
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || "Quem Produz <nao-responda@quemproduz.com>",
      to,
      subject,
      text: body,
      html: textToHtml(body),
    });
  } catch (err) {
    console.error(`[Email] Falha ao enviar para ${to}:`, err);
  }
};

// POST /api/auth/register
authRouter.post("/register", async (req, res) => {
  try {
    const { email, password, farmName, name, phone } = req.body;

    if (!email || !password || !farmName) {
      return res.status(400).json({
        error: "Campos obrigatórios: email, senha, nome da fazenda",
      });
    }

    if (typeof email !== "string" || email.length > 254) {
      return res.status(400).json({ error: "E-mail inválido" });
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ error: "E-mail inválido" });
    }

    if (typeof password !== "string" || password.length < 6 || password.length > 128) {
      return res
        .status(400)
        .json({ error: "Senha deve ter entre 6 e 128 caracteres" });
    }

    if (typeof farmName !== "string" || farmName.trim().length === 0) {
      return res.status(400).json({ error: "Nome da fazenda obrigatório" });
    }
    if (farmName.trim().length > 100) {
      return res
        .status(400)
        .json({ error: "Nome da fazenda: máx 100 caracteres" });
    }

    if (name !== undefined && (typeof name !== "string" || name.length > 100)) {
      return res.status(400).json({ error: "Nome: máx 100 caracteres" });
    }
    if (phone !== undefined && (typeof phone !== "string" || phone.length > 30)) {
      return res.status(400).json({ error: "Telefone: máx 30 caracteres" });
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (existing) {
      return res.status(409).json({ error: "E-mail já cadastrado" });
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    // Token de verificação de email (válido 24h)
    const verifyToken = genToken();
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        password: hashed,
        farmName: farmName.trim(),
        name: name?.trim(),
        phone: phone?.trim(),
        emailVerifyToken: hashToken(verifyToken),
        emailVerifyExpires: verifyExpires,
      },
      select: { id: true, email: true, farmName: true, name: true, emailVerified: true },
    });

    const verifyUrl = `${process.env.FRONTEND_URL?.split(",")[0] ?? "http://localhost:3000"}/?verify=${verifyToken}`;
    await sendEmail(
      user.email,
      "Confirme seu e-mail — Quem Produz",
      `Olá! Confirme seu cadastro clicando no link abaixo (válido por 24h):\n\n${verifyUrl}\n\nSe você não criou esta conta, ignore este e-mail.`
    );

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: "30d",
    });

    res.status(201).json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// POST /api/auth/login
authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "E-mail e senha obrigatórios" });
    }
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "E-mail e senha obrigatórios" });
    }
    if (email.length > 254 || password.length > 128) {
      return res.status(401).json({ error: "E-mail ou senha incorretos" });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { products: true, certs: true },
    });

    if (!user) {
      // Compara contra um hash dummy para tempo constante (evita user enumeration)
      await bcrypt.compare(password, "$2b$12$0000000000000000000000000000000000000000000000000000");
      return res.status(401).json({ error: "E-mail ou senha incorretos" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "E-mail ou senha incorretos" });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: "30d",
    });

    const { password: _p, emailVerifyToken: _v, passwordResetToken: _r, ...userWithoutSecrets } = user;
    res.json({ token, user: userWithoutSecrets });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// POST /api/auth/refresh
authRouter.post("/refresh", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "Token obrigatório" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      iat?: number;
    };

    // Verifica invalidação server-side
    if (payload.iat) {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { tokenInvalidAt: true },
      });
      if (user?.tokenInvalidAt && payload.iat * 1000 < user.tokenInvalidAt.getTime()) {
        return res.status(401).json({ error: "Sessão expirada" });
      }
    }

    const newToken = jwt.sign(
      { userId: payload.userId },
      process.env.JWT_SECRET!,
      { expiresIn: "30d" }
    );
    res.json({ token: newToken });
  } catch {
    res.status(401).json({ error: "Token inválido" });
  }
});

// POST /api/auth/logout — invalida tokens emitidos antes deste momento
authRouter.post("/logout", authenticate, async (req: AuthRequest, res) => {
  try {
    await prisma.user.update({
      where: { id: req.userId! },
      data: { tokenInvalidAt: new Date() },
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Erro interno" });
  }
});

// POST /api/auth/forgot-password — solicita reset de senha
authRouter.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ error: "E-mail inválido" });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    // Sempre retorna 200 mesmo se email não existir (anti-enumeration)
    if (!user) {
      return res.json({ ok: true });
    }

    const resetToken = genToken();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1h

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashToken(resetToken),
        passwordResetExpires: resetExpires,
      },
    });

    const resetUrl = `${process.env.FRONTEND_URL?.split(",")[0] ?? "http://localhost:3000"}/?reset=${resetToken}`;
    await sendEmail(
      user.email,
      "Redefinir sua senha — Quem Produz",
      `Recebemos um pedido para redefinir sua senha. Clique no link abaixo (válido por 1 hora):\n\n${resetUrl}\n\nSe você não solicitou, ignore este e-mail.`
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// POST /api/auth/reset-password — confirma reset com token
authRouter.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || typeof token !== "string" || !password || typeof password !== "string") {
      return res.status(400).json({ error: "Token e senha obrigatórios" });
    }
    if (password.length < 6 || password.length > 128) {
      return res.status(400).json({ error: "Senha deve ter entre 6 e 128 caracteres" });
    }

    const hashed = hashToken(token);
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashed,
        passwordResetExpires: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ error: "Token inválido ou expirado" });
    }

    const newHash = await bcrypt.hash(password, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: newHash,
        passwordResetToken: null,
        passwordResetExpires: null,
        tokenInvalidAt: new Date(), // invalida sessões antigas
      },
    });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// GET /api/auth/verify-email?token=... — confirma email
authRouter.get("/verify-email", async (req, res) => {
  try {
    const token = String(req.query.token || "");
    if (!token) return res.status(400).json({ error: "Token obrigatório" });

    const hashed = hashToken(token);
    const user = await prisma.user.findFirst({
      where: {
        emailVerifyToken: hashed,
        emailVerifyExpires: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ error: "Token inválido ou expirado" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpires: null,
      },
    });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// POST /api/auth/resend-verification — reenvia email de verificação
authRouter.post("/resend-verification", authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
    if (user.emailVerified) return res.json({ ok: true, alreadyVerified: true });

    const verifyToken = genToken();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifyToken: hashToken(verifyToken),
        emailVerifyExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const verifyUrl = `${process.env.FRONTEND_URL?.split(",")[0] ?? "http://localhost:3000"}/?verify=${verifyToken}`;
    await sendEmail(
      user.email,
      "Confirme seu e-mail — Quem Produz",
      `Confirme clicando no link abaixo (válido por 24h):\n\n${verifyUrl}`
    );

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Erro interno" });
  }
});

// DELETE /api/auth/account — apaga conta + arquivos (LGPD)
authRouter.delete("/account", authenticate, async (req: AuthRequest, res) => {
  try {
    const fs = await import("node:fs");
    const path = await import("node:path");

    // Coleta URLs de arquivos antes de deletar (uploads de documentos + fotos de lotes/práticas)
    const docs = await prisma.userDocument.findMany({
      where: { userId: req.userId },
      select: { url: true },
    });
    const photos = await prisma.lotPhoto.findMany({
      where: { lot: { userId: req.userId } },
      select: { url: true },
    });
    const practices = await prisma.userPractice.findMany({
      where: { userId: req.userId, photoUrl: { not: null } },
      select: { photoUrl: true },
    });

    const allUrls = [
      ...docs.map((d) => d.url),
      ...photos.map((p) => p.url),
      ...practices.map((p) => p.photoUrl).filter((u): u is string => !!u),
    ];

    // Deleta usuário (cascade limpa registros relacionados)
    await prisma.user.delete({ where: { id: req.userId! } });

    // Best-effort: remove arquivos do disco local com proteção contra path traversal
    const uploadsDir = path.resolve(process.cwd(), "uploads");
    const SAFE_NAME = /^[0-9]+-[a-z0-9]+\.[a-z0-9]+$/i;
    for (const url of allUrls) {
      try {
        const filename = path.basename(new URL(url).pathname);
        if (!SAFE_NAME.test(filename)) continue;
        const filePath = path.resolve(uploadsDir, filename);
        if (filePath.startsWith(uploadsDir + path.sep)) {
          fs.unlink(filePath, () => {});
        }
      } catch { /* url externa ou malformada */ }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("delete account error", err);
    res.status(500).json({ error: "Erro interno" });
  }
});
