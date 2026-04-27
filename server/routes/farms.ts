import { Router } from "express";
import { prisma } from "../db";
import { authenticate, AuthRequest } from "../middleware/auth";

export const farmsRouter = Router();

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

    const { password, ...safe } = user;
    res.json(safe);
  } catch {
    res.status(500).json({ error: "Erro interno" });
  }
});

// GET /api/farms/:id — perfil público por ID
farmsRouter.get("/:id", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        ...PUBLIC_SELECT,
        lots: {
          select: { id: true, name: true, crop: true, area: true, eudrCompliant: true, status: true },
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
      products, certs,
      // NOTA: `plan` NÃO aceito aqui — só muda via webhook de pagamento
    } = req.body;

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

    const { password, ...safe } = user;
    res.json(safe);
  } catch {
    res.status(500).json({ error: "Erro interno" });
  }
});

// DELETE /api/farms/me — LGPD: apagar conta e todos os dados
farmsRouter.delete("/me", authenticate, async (req: AuthRequest, res) => {
  try {
    await prisma.user.delete({ where: { id: req.userId } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Erro interno" });
  }
});
