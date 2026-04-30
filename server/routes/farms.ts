import { Router } from "express";
import path from "path";
import fs from "node:fs";
import { prisma } from "../db";
import { authenticate, AuthRequest } from "../middleware/auth";

export const farmsRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Remove campos sensíveis do objeto user antes de serializar
const stripSecrets = <T extends Record<string, unknown>>(u: T) => {
  const {
    password: _p,
    emailVerifyToken: _v,
    emailVerifyExpires: _ve,
    passwordResetToken: _r,
    passwordResetExpires: _re,
    tokenInvalidAt: _ti,
    ...safe
  } = u;
  return safe;
};

const PUBLIC_SELECT = {
  id: true,
  farmName: true,
  name: true,
  location: true,
  area: true,
  description: true,
  logoUrl: true,
  coverUrl: true,
  logoTransform: true,
  coverTransform: true,
  plan: true,
  profileMode: true,
  createdAt: true,
  products: true,
  certs: true,
  practices: {
    where: { active: true },
    select: { id: true, category: true, key: true, name: true, startDate: true, photoUrl: true, notes: true },
    orderBy: { createdAt: "desc" as const },
  },
};

// GET /api/farms — lista pública de fazendas (landing page)
farmsRouter.get("/", async (_req, res) => {
  try {
    const farms = await prisma.user.findMany({
      where: { isPublic: true },   // zero-trust: nunca expõe quem optou por privacidade
      select: {
        ...PUBLIC_SELECT,
        lots: { select: { id: true, eudrCompliant: true, area: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(farms);
  } catch {
    res.status(500).json({ error: "Erro interno" });
  }
});

// GET /api/farms/me — perfil autenticado
farmsRouter.get("/me", authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        products: true,
        certs: true,
        practices: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

    res.json(stripSecrets(user));
  } catch {
    res.status(500).json({ error: "Erro interno" });
  }
});

// GET /api/farms/:id — perfil público por ID
farmsRouter.get("/:id", async (req, res) => {
  if (!UUID_RE.test(req.params.id)) {
    return res.status(404).json({ error: "Fazenda não encontrada" });
  }
  try {
    const user = await prisma.user.findFirst({
      where: { id: req.params.id, isPublic: true },
      select: {
        ...PUBLIC_SELECT,
        lots: {
          select: {
            id: true,
            name: true,
            crop: true,
            area: true,
            eudrCompliant: true,
            status: true,
            geoPolygon: true,
            harvestDate: true,
            expiryDate: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) return res.status(404).json({ error: "Fazenda não encontrada" });
    res.json(user);
  } catch {
    res.status(500).json({ error: "Erro interno" });
  }
});

// PUT /api/farms/me — atualizar perfil
farmsRouter.put("/me", authenticate, async (req: AuthRequest, res) => {
  try {
    const {
      farmName, name, phone, location, area, description,
      logoUrl, coverUrl, logoTransform, coverTransform,
      isPublic,    // produtor pode controlar visibilidade
      profileMode, // "commodity" | "produto" — direciona apresentação do perfil público
      products, certs,
      // NOTA: `plan` NÃO aceito aqui — só muda via webhook de pagamento
    } = req.body;

    // Whitelist de profileMode (não confiar no que vem do cliente)
    if (profileMode !== undefined && profileMode !== "commodity" && profileMode !== "produto") {
      return res.status(400).json({ error: "profileMode inválido" });
    }

    // Validação de tamanho dos campos livres
    if (farmName !== undefined && String(farmName).trim().length > 100)
      return res.status(400).json({ error: "Nome da fazenda: máx 100 caracteres" });
    if (name !== undefined && String(name ?? "").trim().length > 100)
      return res.status(400).json({ error: "Nome: máx 100 caracteres" });
    if (phone !== undefined && String(phone ?? "").trim().length > 20)
      return res.status(400).json({ error: "Telefone: máx 20 caracteres" });
    if (location !== undefined && String(location ?? "").length > 200)
      return res.status(400).json({ error: "Localização: máx 200 caracteres" });
    if (description !== undefined && String(description ?? "").length > 2000)
      return res.status(400).json({ error: "Descrição: máx 2000 caracteres" });
    if (Array.isArray(products) && products.length > 20)
      return res.status(400).json({ error: "Máximo de 20 produtos" });
    if (Array.isArray(certs) && certs.length > 20)
      return res.status(400).json({ error: "Máximo de 20 certificações" });
    if (Array.isArray(products) && products.some((p) => typeof p !== "string" || p.length > 80))
      return res.status(400).json({ error: "Cada produto: texto até 80 caracteres" });
    if (Array.isArray(certs) && certs.some((c) => typeof c !== "string" || c.length > 80))
      return res.status(400).json({ error: "Cada certificação: texto até 80 caracteres" });
    if (area !== undefined && area !== null) {
      const areaNum = parseFloat(area);
      if (!Number.isFinite(areaNum) || areaNum < 0 || areaNum > 1000000)
        return res.status(400).json({ error: "Área inválida (0–1.000.000 ha)" });
    }
    // Limita tamanho serializado dos transforms (anti-DoS via JSON enorme)
    const tooBig = (j: unknown) => j !== null && j !== undefined && JSON.stringify(j).length > 4096;
    if (tooBig(logoTransform) || tooBig(coverTransform))
      return res.status(400).json({ error: "Transform de imagem excede o limite" });

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(farmName !== undefined && { farmName: farmName.trim() }),
        ...(name !== undefined && { name: name?.trim() }),
        ...(phone !== undefined && { phone: phone?.trim() }),
        ...(location !== undefined && { location }),
        ...(area !== undefined && { area: area ? parseFloat(area) : null }),
        ...(description !== undefined && { description }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(coverUrl !== undefined && { coverUrl }),
        ...(logoTransform !== undefined && { logoTransform }),
        ...(coverTransform !== undefined && { coverTransform }),
        ...(isPublic !== undefined && { isPublic: Boolean(isPublic) }),
        ...(profileMode !== undefined && { profileMode }),
      },
    });

    if (Array.isArray(products)) {
      await prisma.userProduct.deleteMany({ where: { userId: req.userId } });
      if (products.length > 0) {
        await prisma.userProduct.createMany({
          data: products.map((n: string) => ({ userId: req.userId!, name: n })),
        });
      }
    }

    if (Array.isArray(certs)) {
      await prisma.userCert.deleteMany({ where: { userId: req.userId } });
      if (certs.length > 0) {
        await prisma.userCert.createMany({
          data: certs.map((n: string) => ({ userId: req.userId!, name: n })),
        });
      }
    }

    res.json(stripSecrets(user));
  } catch {
    res.status(500).json({ error: "Erro interno" });
  }
});

// DELETE /api/farms/me — LGPD: apagar conta + arquivos do disco
farmsRouter.delete("/me", authenticate, async (req: AuthRequest, res) => {
  try {
    // Coleta arquivos antes do cascade
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

    await prisma.user.delete({ where: { id: req.userId } });

    // Best-effort: remove arquivos do disco com proteção contra path traversal
    const uploadsDir = path.resolve(process.cwd(), "uploads");
    const SAFE_NAME = /^[0-9]+-[a-z0-9]+\.[a-z0-9]+$/i;
    const allUrls = [
      ...docs.map((d) => d.url),
      ...photos.map((p) => p.url),
      ...practices.map((p) => p.photoUrl).filter((u): u is string => !!u),
    ];
    for (const url of allUrls) {
      try {
        const filename = path.basename(new URL(url).pathname);
        if (!SAFE_NAME.test(filename)) continue;
        const filePath = path.resolve(uploadsDir, filename);
        if (filePath.startsWith(uploadsDir + path.sep)) {
          fs.unlink(filePath, () => {});
        }
      } catch { /* url externa */ }
    }

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Erro interno" });
  }
});
