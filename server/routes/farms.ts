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
  createdAt: true,
  products: true,
  certs: true,
};

// GET /api/farms — lista pública de fazendas (landing page)
farmsRouter.get("/", async (_req, res) => {
  try {
    const farms = await prisma.user.findMany({
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
      include: { products: true, certs: true },
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
      products, certs,
    } = req.body;

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
