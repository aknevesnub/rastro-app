import { Router } from "express";
import { prisma } from "../db";
import { authenticate, AuthRequest } from "../middleware/auth";

export const lotsRouter = Router();

// GET /api/lots/public/:id — público para QR code scan
lotsRouter.get("/public/:id", async (req, res) => {
  // Valida formato UUID antes de consultar (Prisma joga 500 em IDs malformados)
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(req.params.id)) {
    return res.status(404).json({ error: "Lote não encontrado" });
  }
  try {
    const lot = await prisma.lot.findUnique({
      where: { id: req.params.id },
      include: {
        photos: { orderBy: { position: "asc" } },
        user: {
          select: {
            id: true,
            farmName: true,
            location: true,
            area: true,
            logoUrl: true,
            logoTransform: true,
            certs: true,
            products: true,
          },
        },
      },
    });

    if (!lot) return res.status(404).json({ error: "Lote não encontrado" });
    res.json(lot);
  } catch (err) {
    console.error("public lot error", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// GET /api/lots — lotes do usuário autenticado
lotsRouter.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const lots = await prisma.lot.findMany({
      where: { userId: req.userId },
      include: { photos: { orderBy: { position: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(lots);
  } catch {
    res.status(500).json({ error: "Erro interno" });
  }
});

// GET /api/lots/:id — lote específico (autenticado)
lotsRouter.get("/:id", authenticate, async (req: AuthRequest, res) => {
  try {
    const lot = await prisma.lot.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { photos: { orderBy: { position: "asc" } } },
    });

    if (!lot) return res.status(404).json({ error: "Lote não encontrado" });
    res.json(lot);
  } catch {
    res.status(500).json({ error: "Erro interno" });
  }
});

// POST /api/lots — criar lote
lotsRouter.post("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const {
      name, crop, area, harvestDate, expiryDate,
      status, eudrCompliant, notes, geoPolygon, photos,
    } = req.body;

    if (!name?.trim() || !crop?.trim()) {
      return res.status(400).json({ error: "Nome e cultura obrigatórios" });
    }

    if (photos && photos.length > 10) {
      return res.status(400).json({ error: "Máximo de 10 fotos por lote" });
    }

    const lot = await prisma.lot.create({
      data: {
        userId: req.userId!,
        name: name.trim(),
        crop: crop.trim(),
        area: area ? parseFloat(area) : null,
        harvestDate: harvestDate ? new Date(harvestDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        status: status || "active",
        eudrCompliant: eudrCompliant ?? false,
        notes: notes?.trim(),
        geoPolygon: geoPolygon ?? null,
        photos: photos?.length
          ? {
              create: photos.map(
                (p: { url: string; transform?: object }, i: number) => ({
                  url: p.url,
                  transform: p.transform ?? null,
                  position: i,
                })
              ),
            }
          : undefined,
      },
      include: { photos: { orderBy: { position: "asc" } } },
    });

    await prisma.event.create({
      data: {
        userId: req.userId!,
        lotId: lot.id,
        type: "lot_created",
        message: `Lote "${name}" criado`,
      },
    });

    res.status(201).json(lot);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// PUT /api/lots/:id — atualizar lote
lotsRouter.put("/:id", authenticate, async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.lot.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: "Lote não encontrado" });

    const {
      name, crop, area, harvestDate, expiryDate,
      status, eudrCompliant, notes, geoPolygon, photos,
    } = req.body;

    await prisma.lot.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(crop !== undefined && { crop: crop.trim() }),
        ...(area !== undefined && { area: area ? parseFloat(area) : null }),
        ...(harvestDate !== undefined && { harvestDate: harvestDate ? new Date(harvestDate) : null }),
        ...(expiryDate !== undefined && { expiryDate: expiryDate ? new Date(expiryDate) : null }),
        ...(status !== undefined && { status }),
        ...(eudrCompliant !== undefined && { eudrCompliant }),
        ...(notes !== undefined && { notes: notes?.trim() }),
        ...(geoPolygon !== undefined && { geoPolygon }),
      },
    });

    if (Array.isArray(photos)) {
      await prisma.lotPhoto.deleteMany({ where: { lotId: req.params.id } });
      if (photos.length > 0) {
        await prisma.lotPhoto.createMany({
          data: photos.map(
            (p: { url: string; transform?: object }, i: number) => ({
              lotId: req.params.id,
              url: p.url,
              transform: p.transform ?? null,
              position: i,
            })
          ),
        });
      }
    }

    const result = await prisma.lot.findUnique({
      where: { id: req.params.id },
      include: { photos: { orderBy: { position: "asc" } } },
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// DELETE /api/lots/:id
lotsRouter.delete("/:id", authenticate, async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.lot.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: "Lote não encontrado" });

    await prisma.lot.delete({ where: { id: req.params.id } });

    await prisma.event.create({
      data: {
        userId: req.userId!,
        type: "lot_deleted",
        message: `Lote "${existing.name}" removido`,
      },
    });

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Erro interno" });
  }
});

// GET /api/lots/events — histórico de atividades
lotsRouter.get("/events/all", authenticate, async (req: AuthRequest, res) => {
  try {
    const events = await prisma.event.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(events);
  } catch {
    res.status(500).json({ error: "Erro interno" });
  }
});
