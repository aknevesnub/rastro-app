import { Router } from "express";
import { prisma } from "../db";
import { authenticate, AuthRequest } from "../middleware/auth";

export const lotsRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// EUDR cutoff: commodities não podem vir de áreas desmatadas após esta data
const EUDR_CUTOFF = new Date("2020-12-31T23:59:59Z");

const VALID_STATUS = ["active", "harvested", "sold", "archived"] as const;

// Valida polígono GeoJSON-like: { type, coordinates: [[ [lng,lat], ... ]] }
// Aceita também array simples [[lng,lat], ...]
type Coord = [number, number];
const validatePolygon = (
  poly: unknown
): { ok: true; coords: Coord[] } | { ok: false; error: string } => {
  if (!poly) return { ok: false, error: "Polígono ausente" };

  let coords: unknown;
  if (Array.isArray(poly)) {
    coords = poly;
  } else if (typeof poly === "object" && poly !== null && "coordinates" in poly) {
    const c = (poly as { coordinates: unknown }).coordinates;
    // GeoJSON Polygon: coordinates é array de rings; pegamos o anel externo
    if (Array.isArray(c) && Array.isArray(c[0])) {
      coords = c[0];
    } else {
      coords = c;
    }
  } else {
    return { ok: false, error: "Polígono inválido" };
  }

  if (!Array.isArray(coords) || coords.length < 3) {
    return { ok: false, error: "Polígono precisa de pelo menos 3 pontos" };
  }
  if (coords.length > 1000) {
    return { ok: false, error: "Polígono excede 1000 pontos" };
  }

  const validated: Coord[] = [];
  for (const pt of coords) {
    if (!Array.isArray(pt) || pt.length < 2) {
      return { ok: false, error: "Ponto do polígono em formato inválido" };
    }
    const lng = Number(pt[0]);
    const lat = Number(pt[1]);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      return { ok: false, error: "Coordenada não numérica" };
    }
    if (lng < -180 || lng > 180) {
      return { ok: false, error: "Longitude fora do intervalo (-180, 180)" };
    }
    if (lat < -90 || lat > 90) {
      return { ok: false, error: "Latitude fora do intervalo (-90, 90)" };
    }
    validated.push([lng, lat]);
  }

  return { ok: true, coords: validated };
};

// Valida regras de conformidade EUDR
const validateEudrCompliance = (
  eudrCompliant: boolean,
  geoPolygon: unknown,
  harvestDate: string | undefined
): { ok: true } | { ok: false; error: string } => {
  if (!eudrCompliant) return { ok: true };

  // EUDR exige geolocalização do lote
  if (!geoPolygon) {
    return {
      ok: false,
      error:
        "EUDR: lotes conformes precisam de polígono georreferenciado. Adicione a localização antes.",
    };
  }
  const polyCheck = validatePolygon(geoPolygon);
  if (!polyCheck.ok) return polyCheck;

  // EUDR exige data de colheita após cutoff (proxy mínimo — verificação completa requer histórico de uso do solo)
  if (!harvestDate) {
    return {
      ok: false,
      error: "EUDR: data de colheita obrigatória para conformidade",
    };
  }
  const harvest = new Date(harvestDate);
  if (Number.isNaN(harvest.getTime())) {
    return { ok: false, error: "Data de colheita inválida" };
  }
  if (harvest < EUDR_CUTOFF) {
    return {
      ok: false,
      error: `EUDR: colheita deve ser após ${EUDR_CUTOFF.toISOString().slice(0, 10)} (data de corte do regulamento)`,
    };
  }

  return { ok: true };
};

// GET /api/lots/public/:id — público para QR code scan
lotsRouter.get("/public/:id", async (req, res) => {
  // Valida formato UUID antes de consultar (Prisma joga 500 em IDs malformados)
  if (!UUID_RE.test(req.params.id)) {
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
  if (!UUID_RE.test(req.params.id)) {
    return res.status(404).json({ error: "Lote não encontrado" });
  }
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

    if (typeof name !== "string" || !name.trim() || typeof crop !== "string" || !crop.trim()) {
      return res.status(400).json({ error: "Nome e cultura obrigatórios" });
    }
    if (name.length > 120) return res.status(400).json({ error: "Nome: máx 120 caracteres" });
    if (crop.length > 80) return res.status(400).json({ error: "Cultura: máx 80 caracteres" });
    if (notes !== undefined && notes !== null && (typeof notes !== "string" || notes.length > 2000)) {
      return res.status(400).json({ error: "Notas: máx 2000 caracteres" });
    }
    if (area !== undefined && area !== null) {
      const areaNum = parseFloat(area);
      if (!Number.isFinite(areaNum) || areaNum < 0 || areaNum > 1000000) {
        return res.status(400).json({ error: "Área inválida (0–1.000.000 ha)" });
      }
    }
    if (status !== undefined && !VALID_STATUS.includes(status)) {
      return res.status(400).json({ error: "Status inválido" });
    }
    if (photos && (!Array.isArray(photos) || photos.length > 10)) {
      return res.status(400).json({ error: "Máximo de 10 fotos por lote" });
    }

    // Valida polígono se enviado
    if (geoPolygon) {
      const polyCheck = validatePolygon(geoPolygon);
      if (polyCheck.ok === false) {
        return res.status(400).json({ error: polyCheck.error });
      }
    }

    // Valida regras EUDR
    const eudrCheck = validateEudrCompliance(!!eudrCompliant, geoPolygon, harvestDate);
    if (eudrCheck.ok === false) {
      return res.status(400).json({ error: eudrCheck.error });
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
  if (!UUID_RE.test(req.params.id)) {
    return res.status(404).json({ error: "Lote não encontrado" });
  }
  try {
    const existing = await prisma.lot.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: "Lote não encontrado" });

    const {
      name, crop, area, harvestDate, expiryDate,
      status, eudrCompliant, notes, geoPolygon, photos,
    } = req.body;

    if (name !== undefined && (typeof name !== "string" || name.length > 120)) {
      return res.status(400).json({ error: "Nome: máx 120 caracteres" });
    }
    if (crop !== undefined && (typeof crop !== "string" || crop.length > 80)) {
      return res.status(400).json({ error: "Cultura: máx 80 caracteres" });
    }
    if (notes !== undefined && notes !== null && typeof notes === "string" && notes.length > 2000) {
      return res.status(400).json({ error: "Notas: máx 2000 caracteres" });
    }
    if (area !== undefined && area !== null) {
      const areaNum = parseFloat(area);
      if (!Number.isFinite(areaNum) || areaNum < 0 || areaNum > 1000000) {
        return res.status(400).json({ error: "Área inválida (0–1.000.000 ha)" });
      }
    }
    if (status !== undefined && !VALID_STATUS.includes(status)) {
      return res.status(400).json({ error: "Status inválido" });
    }
    if (photos !== undefined && (!Array.isArray(photos) || photos.length > 10)) {
      return res.status(400).json({ error: "Máximo de 10 fotos por lote" });
    }
    if (geoPolygon !== undefined && geoPolygon !== null) {
      const polyCheck = validatePolygon(geoPolygon);
      if (polyCheck.ok === false) {
        return res.status(400).json({ error: polyCheck.error });
      }
    }

    // Recompõe estado final para validação EUDR (campos novos prevalecem)
    const finalEudr = eudrCompliant !== undefined ? !!eudrCompliant : existing.eudrCompliant;
    const finalPolygon = geoPolygon !== undefined ? geoPolygon : existing.geoPolygon;
    const finalHarvest = harvestDate !== undefined
      ? harvestDate
      : existing.harvestDate?.toISOString();
    const eudrCheck = validateEudrCompliance(finalEudr, finalPolygon, finalHarvest);
    if (eudrCheck.ok === false) {
      return res.status(400).json({ error: eudrCheck.error });
    }

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
  if (!UUID_RE.test(req.params.id)) {
    return res.status(404).json({ error: "Lote não encontrado" });
  }
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
