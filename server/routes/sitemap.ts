import { Router } from "express";
import { prisma } from "../db";

export const sitemapRouter = Router();

const SITE_URL = (process.env.SITE_URL || "https://quemproduz.com").replace(/\/$/, "");

// Escapa caracteres reservados em XML
const xmlEscape = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const STATIC_ROUTES: { loc: string; changefreq: string; priority: string }[] = [
  { loc: "/", changefreq: "daily", priority: "1.0" },
  { loc: "/vitrine", changefreq: "daily", priority: "0.9" },
  { loc: "/cadastro", changefreq: "monthly", priority: "0.7" },
  { loc: "/planos", changefreq: "monthly", priority: "0.6" },
];

// GET /sitemap.xml — gerado dinamicamente com fazendas + lotes públicos
sitemapRouter.get("/sitemap.xml", async (_req, res) => {
  try {
    // Fazendas com perfil minimamente preenchido
    const farms = await prisma.user.findMany({
      where: {
        farmName: { not: null },
      },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    });

    // Lotes públicos (sem filtro de visibilidade — são públicos por padrão via QR)
    const lots = await prisma.lot.findMany({
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 10000,
    });

    const isoDate = (d: Date) => d.toISOString().split("T")[0];
    const today = isoDate(new Date());

    const urls: string[] = [];

    // Rotas estáticas
    for (const r of STATIC_ROUTES) {
      urls.push(
        `<url><loc>${xmlEscape(SITE_URL + r.loc)}</loc><lastmod>${today}</lastmod><changefreq>${r.changefreq}</changefreq><priority>${r.priority}</priority></url>`
      );
    }

    // Fazendas
    for (const f of farms) {
      urls.push(
        `<url><loc>${xmlEscape(`${SITE_URL}/fazenda/${f.id}`)}</loc><lastmod>${isoDate(f.updatedAt)}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`
      );
    }

    // Lotes
    for (const l of lots) {
      urls.push(
        `<url><loc>${xmlEscape(`${SITE_URL}/lote/${l.id}`)}</loc><lastmod>${isoDate(l.updatedAt)}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`
      );
    }

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls.join("\n") +
      `\n</urlset>\n`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600"); // 1h cache
    res.send(xml);
  } catch (err) {
    console.error("[sitemap] erro:", err);
    res.status(500).send("Erro ao gerar sitemap");
  }
});
