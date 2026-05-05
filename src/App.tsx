import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from "react";
import { BrowserRouter, useLocation, useNavigate, useParams } from "react-router-dom";
import { paymentService } from "./services/payment";
import type { PlanTier } from "./services/payment";
import * as api from "./services/api";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import QRCode from "qrcode";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  ChevronLeft, Home, Map as MapIcon, FileText, User,
  Camera, Bell, Plus, Image as ImageIcon, QrCode,
  CheckCircle2, Sprout, ShieldCheck, Share2,
  Leaf, Tractor, MapPin, ChevronRight, Globe,
  LogOut, FileCheck, FileBarChart, Trash2,
  X, Check, AlertCircle, Edit2, Download, ArrowDown,
  TrendingUp, Users, Award, ChevronDown,
  Sun, Moon,
  Landmark, AlertTriangle, ExternalLink, BadgeCheck, Search,
  Layers, Ruler, Send,
} from "lucide-react";

// ─────────────────────────────────────────────
// Hooks utilitários
// ─────────────────────────────────────────────

// Fecha overlay/modal com tecla ESC
function useEscapeKey(handler: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handler();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handler, enabled]);
}

// Bloqueia scroll do body enquanto modal aberto
function useBodyScrollLock(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [enabled]);
}

// ─────────────────────────────────────────────
// SEO: atualiza <title>, <meta description>, OG e Twitter por rota
// ─────────────────────────────────────────────

const SEO_DEFAULT_OG = "https://quemproduz.com/og-default.png";

type SEOProps = {
  title: string;
  description: string;
  path?: string;          // ex: "/vitrine"
  image?: string;         // og:image absoluta
  type?: "website" | "article" | "profile";
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];  // Schema.org structured data
};

function setMetaByName(name: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}
function setMetaByProp(prop: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[property="${prop}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", prop);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}
function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}
function setJsonLd(data: Record<string, unknown> | Record<string, unknown>[] | null) {
  // Remove existentes da rota anterior
  document.head.querySelectorAll('script[type="application/ld+json"][data-route]').forEach(s => s.remove());
  if (!data) return;
  const items = Array.isArray(data) ? data : [data];
  for (const item of items) {
    const s = document.createElement("script");
    s.type = "application/ld+json";
    s.setAttribute("data-route", "true");
    s.textContent = JSON.stringify(item);
    document.head.appendChild(s);
  }
}

function useSEO({ title, description, path, image, type = "website", noindex, jsonLd }: SEOProps) {
  useEffect(() => {
    const fullTitle = /quem\s*produz/i.test(title) ? title : `${title} — Quem Produz`;
    const url = `https://quemproduz.com${path ?? (typeof window !== "undefined" ? window.location.pathname : "/")}`;
    const ogImage = image || SEO_DEFAULT_OG;

    document.title = fullTitle;
    setMetaByName("description", description);
    setMetaByName("robots", noindex ? "noindex, nofollow" : "index, follow");
    setCanonical(url);

    setMetaByProp("og:type", type);
    setMetaByProp("og:title", fullTitle);
    setMetaByProp("og:description", description);
    setMetaByProp("og:url", url);
    setMetaByProp("og:image", ogImage);

    setMetaByName("twitter:card", "summary_large_image");
    setMetaByName("twitter:title", fullTitle);
    setMetaByName("twitter:description", description);
    setMetaByName("twitter:image", ogImage);

    setJsonLd(jsonLd ?? null);
  }, [title, description, path, image, type, noindex, JSON.stringify(jsonLd ?? null)]);
}

// ─────────────────────────────────────────────
// i18n
// ─────────────────────────────────────────────

type Lang = "pt" | "en" | "es" | "zh";

const TRANSLATIONS = {
  pt: {
    nav_farms: "Fazendas",
    nav_how: "Como funciona",
    nav_benefits: "Benefícios",
    nav_login: "Entrar",
    nav_signup: "Criar perfil",
    hero_tag: "500+ fazendas já na vitrine global",
    hero_line1: "Sua fazenda",
    hero_line2: "merece",
    hero_line3: "ser vista",
    hero_sub: "Crie seu perfil em 5 minutos. Organize lotes com QR rastreável, mostre sua produção para compradores no Brasil e na Europa — sem burocracia.",
    hero_cta_farms: "Explorar fazendas",
    hero_cta_producer: "Criar minha vitrine",
    hero_cta_buyer: "Sou comprador / trader",
    hero_stat1: "fazendas",
    hero_stat2: "rastreados",
    hero_stat3: "países",
    farms_title: "Fazendas na vitrine",
    farms_sub: "Produtores que já aparecem para compradores no Brasil e no mundo",
    farms_area: "ha",
    farms_lots: "lotes",
    farms_eudr: "Docs",
    farms_view: "Ver perfil",
    farms_empty_title: "Seja o primeiro",
    farms_empty_sub: "Nenhuma fazenda cadastrada ainda. Registre a sua.",
    how_title: "Sua vitrine em 5 minutos",
    how_tag: "Simples e rápido",
    how_steps: [
      { n: "01", t: "Crie seu perfil", d: "Nome da fazenda, produtos, localização e foto. Em 2 minutos." },
      { n: "02", t: "Cadastre seus lotes", d: "Área ~estimada, culturas, datas e mapeamento da propriedade." },
      { n: "03", t: "Gere QR e link", d: "Cada lote tem QR rastreável e link público para compartilhar." },
      { n: "04", t: "Receba propostas", d: "Compradores encontram sua fazenda e mandam propostas direto no app." },
    ],
    benefits_title: "Por que Quem Produz",
    benefits_tag: "Benefícios",
    benefits: [
      { t: "Vitrine da sua fazenda", d: "Perfil público profissional para impressionar compradores e parceiros no mundo todo." },
      { t: "Receba propostas", d: "Compradores e traders encontram você e mandam propostas direto no app." },
      { t: "Mercado Europeu", d: "Apareça para compradores da UE que exigem rastreabilidade de origem." },
      { t: "QR Rastreável", d: "Do campo ao comprador final com um escaneamento." },
      { t: "Inventário Digital", d: "Registre maquinário e insumos certificados — o que o satélite não captura." },
      { t: "Multilíngue", d: "Plataforma em 4 idiomas — sua fazenda visível para o mundo." },
    ],
    footer_cta: "Mostre sua fazenda para o mundo",
    footer_sub: "500+ produtores já têm vitrine digital. Grátis para começar.",
    footer_btn: "Criar minha vitrine",
  },
  en: {
    nav_farms: "Farms",
    nav_how: "How it works",
    nav_benefits: "Benefits",
    nav_login: "Sign in",
    nav_signup: "Create profile",
    hero_tag: "Origin traceability",
    hero_line1: "The digital",
    hero_line2: "showcase",
    hero_line3: "of farming",
    hero_sub: "The digital showcase for your farm. Organize lots, generate traceable QR codes and show your production to buyers worldwide.",
    hero_cta_farms: "Browse farms",
    hero_cta_producer: "Create my showcase",
    hero_cta_buyer: "I'm a buyer / trader",
    hero_stat1: "farms",
    hero_stat2: "compliance",
    hero_stat3: "countries",
    farms_title: "Registered farms",
    farms_sub: "Producers with organized digital traceability",
    farms_area: "ha",
    farms_lots: "lots",
    farms_eudr: "EUDR",
    farms_view: "View profile",
    farms_empty_title: "Be the first",
    farms_empty_sub: "No farms registered yet. Register yours.",
    how_title: "How it works",
    how_tag: "Simple & fast",
    how_steps: [
      { n: "01", t: "Create profile", d: "Register your farm with logo, photos and location." },
      { n: "02", t: "Register lots", d: "Add crops, area, dates and map the property." },
      { n: "03", t: "Generate QR", d: "Each lot gets a traceable QR for buyers." },
      { n: "04", t: "Export reports", d: "EUDR and ESG reports ready for EU export." },
    ],
    benefits_title: "Why Quem Produz",
    benefits_tag: "Benefits",
    benefits: [
      { t: "EUDR Compliance", d: "Automatic documentation for EU Regulation 2023/1115." },
      { t: "Green Credit", d: "Access sustainable credit lines with your traceability." },
      { t: "European Market", d: "EU buyers find and verify your farm." },
      { t: "Traceable QR", d: "From field to end consumer with a single scan." },
      { t: "Area Mapping", d: "Delimit your property with PRODES/INPE verification." },
      { t: "Multilingual", d: "Platform in 4 languages for global reach." },
    ],
    footer_cta: "Register your farm for free",
    footer_sub: "Join producers already accessing the global market.",
    footer_btn: "Get started",
  },
  es: {
    nav_farms: "Fincas",
    nav_how: "Cómo funciona",
    nav_benefits: "Beneficios",
    nav_login: "Entrar",
    nav_signup: "Crear perfil",
    hero_tag: "Trazabilidad de origen",
    hero_line1: "El escaparate",
    hero_line2: "digital",
    hero_line3: "del agro",
    hero_sub: "La vitrina digital de tu finca. Organiza lotes, genera QR rastreables y muestra tu producción a compradores de todo el mundo.",
    hero_cta_farms: "Ver fincas",
    hero_cta_producer: "Crear mi vitrina",
    hero_cta_buyer: "Soy comprador / trader",
    hero_stat1: "fincas",
    hero_stat2: "conformidad",
    hero_stat3: "países",
    farms_title: "Fincas registradas",
    farms_sub: "Productores con trazabilidad digital organizada",
    farms_area: "ha",
    farms_lots: "lotes",
    farms_eudr: "EUDR",
    farms_view: "Ver perfil",
    farms_empty_title: "Sé el primero",
    farms_empty_sub: "No hay fincas registradas todavía. Registra la tuya.",
    how_title: "Cómo funciona",
    how_tag: "Simple y rápido",
    how_steps: [
      { n: "01", t: "Crea el perfil", d: "Registra tu finca con logo, fotos y ubicación." },
      { n: "02", t: "Registra lotes", d: "Agrega cultivos, área, fechas y mapea la propiedad." },
      { n: "03", t: "Genera QR", d: "Cada lote recibe un QR trazable para compradores." },
      { n: "04", t: "Exporta informes", d: "Informes EUDR y ESG listos para exportación UE." },
    ],
    benefits_title: "Por qué Quem Produz",
    benefits_tag: "Beneficios",
    benefits: [
      { t: "Cumplimiento EUDR", d: "Documentación automática para el Reglamento UE 2023/1115." },
      { t: "Crédito Verde", d: "Accede a líneas de crédito sostenibles con tu trazabilidad." },
      { t: "Mercado Europeo", d: "Compradores de la UE encuentran y verifican tu finca." },
      { t: "QR Trazable", d: "Del campo al consumidor final con un escaneo." },
      { t: "Mapa de Área", d: "Delimita tu propiedad con verificación PRODES/INPE." },
      { t: "Multilingüe", d: "Plataforma en 4 idiomas para alcance global." },
    ],
    footer_cta: "Registra tu finca gratis",
    footer_sub: "Únete a productores que ya acceden al mercado global.",
    footer_btn: "Empezar ahora",
  },
  zh: {
    nav_farms: "农场",
    nav_how: "运作方式",
    nav_benefits: "优势",
    nav_login: "登录",
    nav_signup: "创建档案",
    hero_tag: "产地溯源",
    hero_line1: "农业的",
    hero_line2: "数字",
    hero_line3: "展示窗口",
    hero_sub: "我们将巴西农村生产者与全球买家连接起来，提供透明度、EUDR合规性和完整溯源。",
    hero_cta_farms: "浏览农场",
    hero_cta_producer: "创建我的展示",
    hero_cta_buyer: "我是买家 / 贸易商",
    hero_stat1: "农场",
    hero_stat2: "合规",
    hero_stat3: "国家",
    farms_title: "已认证农场",
    farms_sub: "具有认证溯源和EUDR合规性的生产者",
    farms_area: "公顷",
    farms_lots: "地块",
    farms_eudr: "EUDR",
    farms_view: "查看档案",
    farms_empty_title: "成为第一个",
    farms_empty_sub: "目前还没有注册的农场，注册您的农场。",
    how_title: "运作方式",
    how_tag: "简单快速",
    how_steps: [
      { n: "01", t: "创建档案", d: "用标志、照片和位置注册您的农场。" },
      { n: "02", t: "注册地块", d: "添加作物、面积、日期并绘制地图。" },
      { n: "03", t: "生成二维码", d: "每个地块获得一个可追溯的买家二维码。" },
      { n: "04", t: "导出报告", d: "准备好EUDR和ESG报告供欧盟出口。" },
    ],
    benefits_title: "为什么选择 Quem Produz",
    benefits_tag: "优势",
    benefits: [
      { t: "EUDR合规", d: "欧盟法规2023/1115的自动文档。" },
      { t: "绿色信贷", d: "通过溯源获得可持续信贷额度。" },
      { t: "欧洲市场", d: "欧盟买家找到并验证您的农场。" },
      { t: "可追溯二维码", d: "从田间到最终消费者，一次扫描即可。" },
      { t: "区域测绘", d: "通过PRODES/INPE验证划定您的财产。" },
      { t: "多语言", d: "4种语言平台，覆盖全球。" },
    ],
    footer_cta: "免费注册您的农场",
    footer_sub: "加入已经进入全球市场的生产者。",
    footer_btn: "立即开始",
  },
} as const;

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "pt", setLang: () => {} });

// ─────────────────────────────────────────────
// Theme
// ─────────────────────────────────────────────
type Theme = "dark" | "light";
const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void }>({ theme: "dark", toggleTheme: () => {} });

const useLang = () => {
  const { lang } = useContext(LangContext);
  return TRANSLATIONS[lang];
};

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface Lot {
  id: string;
  apiId?: string;      // UUID do Supabase (preenchido depois do sync)
  name: string;
  crop: string;
  area: string;
  date: string;        // Data de plantio
  colheita?: string;   // Data de colheita
  variedade?: string;  // Cultivar / variedade
  destino?: string;    // Destino / comprador declarado
  tipo: number;
  status: "ativo" | "colhendo" | "colhido";
  notes: string;
  photos: string[];
  photoTransforms?: LogoTransform[];
  mapPoints: [number, number][];
}

interface LogoTransform { scale: number; x: number; y: number; }

type UserRole = "produtor" | "comprador" | "trader" | "cooperativa" | "outro";

interface AppUser {
  role?: UserRole;
  farmName: string;
  name: string;
  email: string;
  phone: string;
  history: string;
  password: string;
  products: string[];
  certs: string[];
  description: string;
  logo?: string;
  logoTransform?: LogoTransform;
  cover?: string;
  coverTransform?: LogoTransform;
  location?: string;
  // Governança — Regularidade Legal
  car?: string;           // Número do CAR (Cadastro Ambiental Rural)
  ccir?: string;          // CCIR — Certificado de Cadastro de Imóvel Rural
  matricula?: string;     // Número da matrícula no cartório de registro de imóveis
  nirf?: string;          // NIRF/ITR (Cadastro de Imóvel Rural)
  cnpj?: string;          // CNPJ ou CPF do produtor rural
  semEmbargo?: boolean;   // Sem embargo IBAMA/SEMA/órgão ambiental
  semTrabalhoEscravo?: boolean; // Não consta na lista CETE/MTE
  // Governança — Conformidade Ambiental
  reservaLegal?: boolean; // Reserva Legal averbada no CAR
  appArea?: boolean;      // APP delimitada e preservada
  outorgaAgua?: boolean;  // Outorga de uso de água (irrigação)
  biome?: string;         // Bioma: Amazônia | Cerrado | Mata Atlântica | Caatinga | Pampa | Pantanal
  praticasSustentaveis?: string[]; // Plantio direto, rotação de culturas, cobertura morta, etc.
  // Governança — Rastreabilidade
  projetoTecnico?: boolean; // Projeto técnico/proposta com eng. agrônomo
  // Governança — ESG / Crédito
  garantia?: string;      // Tipo de garantia: "penhor" | "hipoteca" | "aval" | ""
  inventarioGHG?: boolean; // Inventário de emissões de GHG realizado
  // Subscription
  plan?: PlanTier;
  trialEndsAt?: string;   // ISO date — quando o trial de 30 dias termina (ativado ao escolher plano pago durante lançamento)
  // Visibilidade pública
  isPublic?: boolean; // default true — aparecer no mapa e vitrine da landing
  // Sede da fazenda
  farmPin?: [number, number]; // coordenada GPS da sede principal
  // Modo do perfil público — define a hierarquia de seções
  // "commodity": fazenda de grãos/café verde/gado — prova sobre narrativa (EUDR, certs, área)
  // "produto":   fazenda de produto envasado/processado — narrativa sobre prova (história, produtos, terroir)
  profileMode?: "commodity" | "produto";
}

interface AppEvent {
  id: string;
  title: string;
  date: string;
  type: "lote" | "foto" | "doc" | "update";
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

// ─────────────────────────────────────────────
// Plans
// ─────────────────────────────────────────────

interface PlanFeatures {
  qrCode: boolean;
  reportExport: boolean;
  governanceScore: boolean;
  creditLines: boolean;
  apiAccess: boolean;
  multiUser: boolean;
}

interface PlanConfig {
  id: PlanTier;
  name: string;
  price: number;          // BRL/month, 0 = free
  description: string;
  badge?: string;
  highlights: string[];
  limits: { lots: number };  // -1 = unlimited
  features: PlanFeatures;
}

const PLANS: Record<PlanTier, PlanConfig> = {
  free: {
    id: "free", name: "Gratuito", price: 0,
    description: "Para começar a rastrear",
    highlights: ["1 lote cadastrado", "Perfil público da fazenda", "Mapa GIS básico", "QR Code interno"],
    limits: { lots: 1 },
    features: { qrCode: false, reportExport: false, governanceScore: false, creditLines: false, apiAccess: false, multiUser: false },
  },
  pro: {
    id: "pro", name: "Pro", price: 79,
    description: "Para produtores ativos",
    badge: "Mais popular",
    highlights: ["Lotes ilimitados", "QR Code rastreável público", "Autodeclarações EUDR, ESG e Governança", "Score de organização completo", "Linhas de crédito verde"],
    limits: { lots: -1 },
    features: { qrCode: true, reportExport: true, governanceScore: true, creditLines: true, apiAccess: false, multiUser: false },
  },
  business: {
    id: "business", name: "Business", price: 199,
    description: "Cooperativas e traders",
    highlights: ["Tudo do Pro", "Múltiplos usuários", "Acesso à API REST", "Integração com ERPs", "Suporte prioritário"],
    limits: { lots: -1 },
    features: { qrCode: true, reportExport: true, governanceScore: true, creditLines: true, apiAccess: true, multiUser: true },
  },
};

// Hook — the single source of truth for plan checks in any component
// Considera "trial expirado" → rebaixa pra free automaticamente (sem cartão = sem cobrança)
const usePlan = () => {
  const { user } = useContext(AppContext);
  const storedTier: PlanTier = (user?.plan ?? "free");

  // Trial info
  const now = Date.now();
  const trialEnd = user?.trialEndsAt ? new Date(user.trialEndsAt).getTime() : null;
  const onTrial = storedTier !== "free" && trialEnd !== null && trialEnd > now;
  const trialExpired = storedTier !== "free" && trialEnd !== null && trialEnd <= now;
  const trialDaysLeft = trialEnd && trialEnd > now ? Math.ceil((trialEnd - now) / 86400000) : 0;

  // Tier efetivo: rebaixa pra free se trial expirou
  const tier: PlanTier = trialExpired ? "free" : storedTier;
  const plan = PLANS[tier];
  const can = (f: keyof PlanFeatures): boolean => plan.features[f];
  const canAddLot = (currentCount: number): boolean =>
    plan.limits.lots === -1 || currentCount < plan.limits.lots;

  return { tier, plan, can, canAddLot, onTrial, trialExpired, trialDaysLeft, trialEndsAt: user?.trialEndsAt };
};

// ─────────────────────────────────────────────
// Security utilities
// ─────────────────────────────────────────────

// Hash de senha com PBKDF2 + salt por usuário (SubtleCrypto nativo)
// Formato armazenado: "pbkdf2:<16-byte salt hex>:<32-byte hash hex>"
// Cada usuário tem seu próprio salt — protege contra ataques de rainbow table
// mesmo que dois usuários compartilhem o mesmo dispositivo.
const hashPassword = async (plain: string): Promise<string> => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, "0")).join("");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(plain), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" }, key, 256);
  const hashHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, "0")).join("");
  return `pbkdf2:${saltHex}:${hashHex}`;
};

// Verificar senha — suporta novo formato e formatos legados para migração
const verifyPassword = async (plain: string, stored: string): Promise<boolean> => {
  // Novo formato: "pbkdf2:<saltHex>:<hashHex>"
  if (stored.startsWith("pbkdf2:")) {
    const parts = stored.split(":");
    if (parts.length !== 3) return false;
    const salt = new Uint8Array(parts[1].match(/.{2}/g)!.map(h => parseInt(h, 16)));
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(plain), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" }, key, 256);
    const hash = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, "0")).join("");
    return hash === parts[2];
  }
  // Legado: PBKDF2 com salt global do dispositivo (rastro_salt)
  const storedSalt = localStorage.getItem("rastro_salt");
  if (storedSalt) {
    const salt = new Uint8Array(JSON.parse(storedSalt));
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(plain), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" }, key, 256);
    const hash = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, "0")).join("");
    if (hash === stored) return true;
  }
  // Legado: SHA-256 sem salt (muito antigo)
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(plain));
  const sha256Hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  return sha256Hash === stored;
};

// Rate limiter em memória para login (5 tentativas → bloqueio 60s)
const loginAttempts = { count: 0, blockedUntil: 0 };
const checkRateLimit = (): string | null => {
  const now = Date.now();
  if (loginAttempts.blockedUntil > now) {
    const secs = Math.ceil((loginAttempts.blockedUntil - now) / 1000);
    return `Muitas tentativas. Aguarde ${secs}s.`;
  }
  loginAttempts.count++;
  if (loginAttempts.count >= 5) {
    loginAttempts.blockedUntil = now + 60_000;
    loginAttempts.count = 0;
    return "Muitas tentativas. Aguarde 60s.";
  }
  return null;
};
const resetRateLimit = () => { loginAttempts.count = 0; loginAttempts.blockedUntil = 0; };

// Valida MIME real de imagem (não confia só na extensão)
const validateImageMime = (dataUrl: string) =>
  /^data:image\/(jpeg|jpg|png|webp|gif);base64,/.test(dataUrl);

// Validação de email RFC-compliant (sem deps)
const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());

// Limite de tamanho de arquivo (5MB)
const MAX_FILE_BYTES = 5 * 1024 * 1024;

// Limite de fotos por lote
const MAX_PHOTOS_PER_LOT = 10;

// Escaping HTML para evitar XSS em document.write dos relatórios
const esc = (s: string | undefined | null): string =>
  (s ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// Proposals
// ─────────────────────────────────────────────

interface Proposal {
  id: string;
  fromEmail: string;
  fromName: string;
  fromCompany: string;
  fromRole: UserRole;
  toFarmName: string;
  products: string[];
  volume: string;
  message: string;
  status: "pendente" | "aceita" | "recusada";
  createdAt: string;
}

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────

interface AppCtx {
  user: AppUser | null;
  lots: Lot[];
  events: AppEvent[];
  proposals: Proposal[];
  currentLotId: string | null;
  viewingFarmId: string | null;        // ID da fazenda sendo visualizada (vitrine pública)
  toasts: Toast[];
  saveUser: (d: AppUser) => boolean;
  addLot: (l: Omit<Lot, "id">) => string;
  updateLot: (id: string, d: Partial<Lot>) => void;
  deleteLot: (id: string) => void;
  addPhotoToLot: (lotId: string, photo: string) => void;
  deleteAccount: () => void;
  logout: () => void;
  // Limpa lotes/eventos/propostas em memória + localStorage (sem mexer em token/user)
  // Usado por login e register pra evitar herdar dados da sessão anterior.
  clearLocalSession: () => void;
  setCurrentLotId: (id: string | null) => void;
  setViewingFarmId: (id: string | null) => void;
  addToast: (msg: string, type?: Toast["type"]) => void;
  removeToast: (id: string) => void;
  sendProposal: (p: Omit<Proposal, "id" | "createdAt" | "status">) => void;
  updateProposalStatus: (id: string, status: Proposal["status"]) => void;
}

const AppContext = createContext<AppCtx>({} as AppCtx);

// Detecta se o backend está disponível (VITE_API_URL definido)
const API_ENABLED = !!import.meta.env.VITE_API_URL;

// Mapeia ApiUser (formato do backend) → AppUser (formato local)
// Mantém campos de governança/EUDR locais (não estão no schema do Supabase ainda).
const mergeApiUserIntoLocal = (apiUser: api.ApiUser, local: AppUser | null): AppUser => ({
  ...(local ?? { history: "", password: "", products: [], certs: [], description: "", farmName: "", name: "", email: "", phone: "" }),
  farmName: apiUser.farmName,
  name: apiUser.name ?? "",
  email: apiUser.email,
  phone: apiUser.phone ?? "",
  location: apiUser.location ?? local?.location,
  description: apiUser.description ?? local?.description ?? "",
  history: apiUser.description ?? local?.history ?? "",
  logo: apiUser.logoUrl ?? local?.logo,
  cover: apiUser.coverUrl ?? local?.cover,
  logoTransform: apiUser.logoTransform ?? local?.logoTransform,
  coverTransform: apiUser.coverTransform ?? local?.coverTransform,
  products: (apiUser.products ?? []).map(p => p.name).length > 0 ? (apiUser.products ?? []).map(p => p.name) : (local?.products ?? []),
  certs: (apiUser.certs ?? []).map(c => c.name).length > 0 ? (apiUser.certs ?? []).map(c => c.name) : (local?.certs ?? []),
  profileMode: apiUser.profileMode ?? local?.profileMode,
  password: local?.password ?? "", // senha fica no servidor; localmente vazio
});

const store = (key: string, data: unknown): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch {
    // Se falhou por armazenamento cheio, tenta sem imagens
    try {
      const slim = JSON.parse(JSON.stringify(data, (k, v) =>
        (k === "logo" || k === "cover" || k === "photos" || k === "photoTransforms") ? undefined : v
      ));
      localStorage.setItem(key, JSON.stringify(slim));
      return true;
    } catch { return false; }
  }
};

const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [lots, setLots] = useState<Lot[]>([]);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [currentLotId, setCurrentLotId] = useState<string | null>(null);
  const [viewingFarmId, setViewingFarmId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    try {
      const u = localStorage.getItem("rastro_user");
      const l = localStorage.getItem("rastro_lots");
      const e = localStorage.getItem("rastro_events");
      const p = localStorage.getItem("rastro_proposals");
      if (u) setUser(JSON.parse(u));
      if (l) setLots(JSON.parse(l));
      if (e) setEvents(JSON.parse(e));
      if (p) setProposals(JSON.parse(p));
    } catch { /* ignore */ }

    // Se o backend está disponível e há token salvo, busca user + lotes atualizados
    if (API_ENABLED && api.token.get()) {
      api.farms.me()
        .then(apiUser => {
          setUser(prev => {
            const merged = mergeApiUserIntoLocal(apiUser, prev);
            store("rastro_user", merged);
            return merged;
          });
        })
        .catch(() => {
          // Token inválido/expirado — limpa
          api.token.clear();
        });

      // Hidrata lotes do banco (faz merge com locais por apiId)
      api.lots.list()
        .then(async apiLots => {
          // Backfill: lotes locais sem apiId precisam ser sincronizados agora
          const localRaw = localStorage.getItem("rastro_lots");
          const localLots: Lot[] = localRaw ? JSON.parse(localRaw) : [];
          const unsynced = localLots.filter(l => !l.apiId);

          const backfilled: { localId: string; apiId: string }[] = [];
          for (const l of unsynced) {
            try {
              const created = await api.lots.create({
                name: l.name,
                crop: l.crop,
                area: l.area ? parseFloat(l.area) : undefined,
                status: l.status,
                notes: l.notes,
                geoPolygon: l.mapPoints?.length ? l.mapPoints.map(([lat, lng]) => ({ lat, lng })) : undefined,
              });
              backfilled.push({ localId: l.id, apiId: created.id });
            } catch (err) {
              console.warn("Falha ao sincronizar lote local", l.id, err);
            }
          }

          // Recarrega depois do backfill para incluir os recém-sincronizados
          const finalApiLots = backfilled.length > 0 ? await api.lots.list() : apiLots;

          setLots(prev => {
            // Lotes do banco preferem; mescla com locais que ainda n\u00e3o sincronizaram
            const fromApi: Lot[] = finalApiLots.map(a => ({
              id: a.id, // usa o UUID do banco
              apiId: a.id,
              name: a.name,
              crop: a.crop,
              area: a.area?.toString() ?? "",
              date: a.createdAt ?? "",
              colheita: a.harvestDate ?? undefined,
              tipo: 0,
              status: (a.status as Lot["status"]) ?? "ativo",
              notes: a.notes ?? "",
              photos: (a.photos ?? []).map(p => p.url),
              photoTransforms: (a.photos ?? []).map(p => p.transform as LogoTransform).filter(Boolean),
              mapPoints: (a.geoPolygon as { lat: number; lng: number }[] | undefined)?.map(g => [g.lat, g.lng] as [number, number]) ?? [],
            }));
            const localOnly = prev.filter(l => !l.apiId && !backfilled.find(b => b.localId === l.id));
            const combined = [...fromApi, ...localOnly];
            store("rastro_lots", combined);
            return combined;
          });
        })
        .catch(() => { /* silencioso \u2014 mant\u00e9m localStorage */ });
    }
  }, []);

  const saveUser = (d: AppUser): boolean => {
    setUser(d);
    const ok = store("rastro_user", d);
    // Background sync ao Supabase (campos b\u00e1sicos)
    if (API_ENABLED && api.token.get()) {
      api.farms.update({
        farmName: d.farmName,
        name: d.name,
        phone: d.phone,
        location: d.location,
        description: d.description || d.history,
        logoUrl: d.logo,
        coverUrl: d.cover,
        logoTransform: d.logoTransform,
        coverTransform: d.coverTransform,
        profileMode: d.profileMode,
        products: d.products,
        certs: d.certs,
      }).catch(() => { /* silencioso \u2014 localStorage j\u00e1 salvou */ });
    }
    return ok;
  };

  const addLot = (lot: Omit<Lot, "id">): string => {
    const id = Date.now().toString();
    const newLots = [...lots, { ...lot, id }];
    setLots(newLots); store("rastro_lots", newLots);
    const ev: AppEvent = { id: Date.now().toString(), title: `Novo lote: ${lot.name}`, date: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }), type: "lote" };
    const ne = [ev, ...events]; setEvents(ne); store("rastro_events", ne);

    // Background sync ao Supabase
    if (API_ENABLED && api.token.get()) {
      api.lots.create({
        name: lot.name,
        crop: lot.crop,
        area: lot.area ? parseFloat(lot.area) : undefined,
        status: lot.status,
        notes: lot.notes,
        geoPolygon: lot.mapPoints?.length ? lot.mapPoints.map(([lat, lng]) => ({ lat, lng })) : undefined,
      }).then(apiLot => {
        // Salva o apiId no lote local
        setLots(prev => {
          const updated = prev.map(l => l.id === id ? { ...l, apiId: apiLot.id } : l);
          store("rastro_lots", updated);
          return updated;
        });
      }).catch(() => { /* silencioso */ });
    }
    return id;
  };

  const updateLot = (id: string, d: Partial<Lot>) => {
    const newLots = lots.map(l => l.id === id ? { ...l, ...d } : l);
    setLots(newLots); store("rastro_lots", newLots);
    const lot = newLots.find(l => l.id === id);
    const ev: AppEvent = { id: Date.now().toString(), title: `Atualizado: ${lot?.name}`, date: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }), type: "update" };
    const ne = [ev, ...events]; setEvents(ne); store("rastro_events", ne);

    // Background sync ao Supabase (se j\u00e1 tem apiId)
    if (API_ENABLED && api.token.get() && lot?.apiId) {
      api.lots.update(lot.apiId, {
        name: lot.name,
        crop: lot.crop,
        area: lot.area ? parseFloat(lot.area) : undefined,
        status: lot.status,
        notes: lot.notes,
        geoPolygon: lot.mapPoints?.length ? lot.mapPoints.map(([lat, lng]) => ({ lat, lng })) : undefined,
      }).catch(() => { /* silencioso */ });
    }
  };

  const deleteLot = (id: string) => {
    const lot = lots.find(l => l.id === id);
    const newLots = lots.filter(l => l.id !== id);
    setLots(newLots); store("rastro_lots", newLots);
    if (lot) {
      const ev: AppEvent = { id: Date.now().toString(), title: `Lote removido: ${lot.name}`, date: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }), type: "update" };
      const ne = [ev, ...events]; setEvents(ne); store("rastro_events", ne);
      // Background sync ao Supabase
      if (API_ENABLED && api.token.get() && lot.apiId) {
        api.lots.remove(lot.apiId).catch(() => { /* silencioso */ });
      }
    }
  };

  const addPhotoToLot = (lotId: string, photo: string) => {
    const lot = lots.find(l => l.id === lotId);
    if (!lot) return;
    if ((lot.photos?.length ?? 0) >= MAX_PHOTOS_PER_LOT) return; // limite de fotos
    if (!validateImageMime(photo)) return; // valida MIME
    const newLots = lots.map(l => l.id === lotId ? { ...l, photos: [...(l.photos || []), photo] } : l);
    setLots(newLots); store("rastro_lots", newLots);
    const ev: AppEvent = { id: Date.now().toString(), title: `Foto: ${lot.name}`, date: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }), type: "foto" };
    const ne = [ev, ...events]; setEvents(ne); store("rastro_events", ne);

    // Background upload pro backend (que persiste no /uploads ou Supabase Storage)
    if (API_ENABLED && api.token.get()) {
      // Converte data URL em File pra fazer upload
      try {
        const [meta, b64] = photo.split(",");
        const mime = meta.match(/data:(.+);base64/)?.[1] ?? "image/jpeg";
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const file = new File([bytes], `photo-${Date.now()}.jpg`, { type: mime });
        api.photos.upload(file).then(url => {
          // Substitui o data URL pela URL do servidor (mais leve no localStorage)
          setLots(prev => {
            const updated = prev.map(l => {
              if (l.id !== lotId) return l;
              const newPhotos = [...(l.photos || [])];
              const idx = newPhotos.lastIndexOf(photo);
              if (idx >= 0) newPhotos[idx] = url;
              return { ...l, photos: newPhotos };
            });
            store("rastro_lots", updated);
            return updated;
          });
        }).catch(() => { /* silencioso \u2014 fica em base64 local */ });
      } catch { /* convers\u00e3o falhou \u2014 continua em base64 local */ }
    }
  };

  const sendProposal = (p: Omit<Proposal, "id" | "createdAt" | "status">) => {
    const newP: Proposal = { ...p, id: Date.now().toString(), createdAt: new Date().toISOString(), status: "pendente" };
    const updated = [newP, ...proposals];
    setProposals(updated); store("rastro_proposals", updated);
  };

  const updateProposalStatus = (id: string, status: Proposal["status"]) => {
    const updated = proposals.map(p => p.id === id ? { ...p, status } : p);
    setProposals(updated); store("rastro_proposals", updated);
  };

  // Reseta dados por-sessão (lotes, eventos, propostas) sem afetar token/user.
  // Útil em login/register para evitar que dados de uma sessão anterior contaminem
  // a nova fazenda (ex: backfill de lotes locais sem apiId em conta nova).
  const clearLocalSession = () => {
    setLots([]);
    setEvents([]);
    setProposals([]);
    ["rastro_lots", "rastro_events", "rastro_proposals", "rastro_lgpd"].forEach(k => localStorage.removeItem(k));
  };

  const logout = () => {
    // Best-effort: invalida sessão no servidor antes de limpar local
    if (API_ENABLED && api.token.get()) {
      api.auth.logout().catch(() => { /* falha silenciosa: prossegue logout local */ });
    }
    setUser(null);
    clearLocalSession();
    localStorage.removeItem("rastro_user");
    if (API_ENABLED) api.token.clear();
  };

  // LGPD art. 18 — direito de exclusão
  const deleteAccount = () => {
    if (API_ENABLED && api.token.get()) {
      // Tenta apagar no servidor (best-effort; falha silenciosa não bloqueia)
      api.auth.deleteAccount().catch(() => {});
      api.token.clear();
    }
    ["rastro_user", "rastro_lots", "rastro_events", "rastro_lgpd", "rastro_proposals"].forEach(k => localStorage.removeItem(k));
    setUser(null); setLots([]); setEvents([]); setProposals([]);
  };

  const addToast = (msg: string, type: Toast["type"] = "success") => {
    const id = Date.now().toString();
    setToasts(p => [...p, { id, message: msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3200);
  };
  const removeToast = (id: string) => setToasts(p => p.filter(t => t.id !== id));

  return (
    <AppContext.Provider value={{ user, saveUser, lots, addLot, updateLot, deleteLot, addPhotoToLot, deleteAccount, events, proposals, logout, clearLocalSession, currentLotId, setCurrentLotId, viewingFarmId, setViewingFarmId, toasts, addToast, removeToast, sendProposal, updateProposalStatus }}>
      {children}
    </AppContext.Provider>
  );
};

// ─────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────

const resizeImage = (dataUrl: string, maxW = 800, maxH = 600): Promise<string> =>
  new Promise(res => {
    const img = new Image();
    img.onload = () => {
      let { width: w, height: h } = img;
      if (w > maxW) { h = (h * maxW) / w; w = maxW; }
      if (h > maxH) { w = (w * maxH) / h; h = maxH; }
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d")!.drawImage(img, 0, 0, w, h);
      res(c.toDataURL("image/jpeg", 0.78));
    };
    img.src = dataUrl;
  });

const doShare = async (url: string, title: string, addToast: (m: string) => void) => {
  try {
    if (navigator.share) { await navigator.share({ title, url }); }
    else { await navigator.clipboard.writeText(url); addToast("Link copiado!"); }
  } catch { try { await navigator.clipboard.writeText(url); addToast("Link copiado!"); } catch { addToast("Não foi possível compartilhar"); } }
};

const downloadHTML = (html: string, filename: string) => {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};

const openEUDR = (user: AppUser, lots: Lot[]) => {
  const totalArea = lots.reduce((a, l) => a + (Number(l.area) || 0), 0);
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>EUDR — ${esc(user.farmName)}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;max-width:780px;margin:0 auto;padding:40px;color:#111}
.badge{display:inline-block;background:#000;color:#fff;padding:4px 12px;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin-bottom:16px}
h1{font-size:28px;font-weight:900;text-transform:uppercase;letter-spacing:-1px;margin-bottom:6px}
.sub{color:#555;font-size:13px;margin-bottom:24px}h2{font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;margin:28px 0 12px;color:#555;border-bottom:1px solid #eee;padding-bottom:8px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:14px 0}.card{border:1px solid #ddd;padding:14px}
.cl{font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:5px}.cv{font-size:17px;font-weight:bold}
table{width:100%;border-collapse:collapse;margin:14px 0}th{background:#000;color:#fff;padding:10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px}
td{padding:10px;border-bottom:1px solid #eee;font-size:13px}.ok{color:#166534;font-weight:bold}
.ok-box{background:#f0fdf4;border:1px solid #166534;padding:14px;margin:14px 0}
.decl{font-size:13px;line-height:1.8;border-left:3px solid #000;padding-left:14px;margin:14px 0}
.footer{margin-top:36px;padding-top:14px;border-top:1px solid #ddd;font-size:11px;color:#999}
.btn{display:inline-block;margin-top:20px;padding:12px 24px;background:#000;color:#fff;border:none;cursor:pointer;font-weight:bold;font-size:12px;text-transform:uppercase;letter-spacing:1px}
@media print{.no-print{display:none}}</style></head><body>
<div class="badge">Quem Produz — Autodeclaração EUDR</div>
<h1>${esc(user.farmName)}</h1>
<p class="sub">Produtor: ${esc(user.name)} | Emitido em: ${new Date().toLocaleDateString("pt-BR", { year: "numeric", month: "long", day: "numeric" })}</p>
<div style="background:#fff8e1;border:1px solid #f59e0b;padding:14px;margin:14px 0;font-size:12px;line-height:1.7;color:#7c4d00">
<strong>⚠ Importante:</strong> Este documento é uma <strong>autodeclaração do produtor</strong> e não substitui auditoria oficial, verificação por satélite (PRODES/INPE) ou due diligence exigida pela legislação EUDR. O Quem Produz é uma ferramenta de organização e rastreabilidade — os dados aqui registrados são de responsabilidade exclusiva do produtor rural.
</div>
<h2>Propriedade</h2>
<div class="grid">
<div class="card"><div class="cl">Área Total (estimativa)</div><div class="cv">~${totalArea} ha</div></div>
<div class="card"><div class="cl">Lotes</div><div class="cv">${lots.length}</div></div>
<div class="card"><div class="cl">E-mail</div><div class="cv" style="font-size:13px">${esc(user.email)}</div></div>
<div class="card"><div class="cl">Telefone</div><div class="cv" style="font-size:13px">${esc(user.phone)}</div></div>
</div>
<h2>Lotes Declarados</h2>
<table><thead><tr><th>Lote</th><th>Cultura</th><th>Área est. (ha)</th><th>Plantio</th></tr></thead><tbody>
${lots.map(l => `<tr><td><strong>${esc(l.name)}</strong></td><td>${esc(l.crop)}</td><td>~${esc(l.area)}</td><td>${l.date ? new Date(l.date + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</td></tr>`).join("")}
${lots.length === 0 ? '<tr><td colspan="4" style="text-align:center;color:#999;padding:20px">Nenhum lote cadastrado</td></tr>' : ""}
</tbody></table>
<h2>Declaração do Produtor</h2>
<p class="decl">Eu, <strong>${esc(user.name || user.farmName)}</strong>, declaro, sob minha responsabilidade, que as informações registradas neste documento são verídicas e que as produções foram obtidas de áreas não associadas ao desmatamento ou degradação florestal após 31/12/2020. Esta declaração é de minha exclusiva responsabilidade e não foi verificada por terceiros.</p>
<div class="footer">Gerado por Quem Produz | ${new Date().toLocaleString("pt-BR")} | Autodeclaração do produtor — não constitui certificação oficial. Área calculada a partir de registros digitais com margem de erro estimada de 1–3 ha.</div>
<div class="no-print"><button class="btn" onclick="window.print()">Imprimir / Salvar PDF</button></div>
</body></html>`;
  downloadHTML(html, `EUDR_${esc(user.farmName)}_${new Date().toISOString().slice(0,10)}.html`);
};

const openESG = (user: AppUser, lots: Lot[]) => {
  const totalArea = lots.reduce((a, l) => a + (Number(l.area) || 0), 0);
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>ESG — ${esc(user.farmName)}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;max-width:780px;margin:0 auto;padding:40px;color:#111}
.badge{display:inline-block;background:#166534;color:#fff;padding:4px 12px;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin-bottom:16px}
h1{font-size:28px;font-weight:900;text-transform:uppercase;letter-spacing:-1px;margin-bottom:6px}h2{font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;margin:28px 0 12px;color:#555;border-bottom:1px solid #eee;padding-bottom:8px}
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin:14px 0}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:14px 0}
.card{border:1px solid #ddd;padding:14px;text-align:center}.cl{font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:5px}.cv{font-size:22px;font-weight:900}
.e{background:#f0fdf4;border:1px solid #bbf7d0;padding:14px;margin-bottom:10px}p{font-size:13px;line-height:1.8;color:#333}
.footer{margin-top:36px;padding-top:14px;border-top:1px solid #ddd;font-size:11px;color:#999}
.btn{display:inline-block;margin-top:20px;padding:12px 24px;background:#166534;color:#fff;border:none;cursor:pointer;font-weight:bold;font-size:12px;text-transform:uppercase;letter-spacing:1px}
@media print{.no-print{display:none}}</style></head><body>
<div class="badge">Quem Produz — Autodeclaração ESG</div>
<h1>${esc(user.farmName)}</h1>
<p style="color:#555;font-size:13px;margin-bottom:24px">Produtor: ${esc(user.name)} | Emitido em: ${new Date().toLocaleDateString("pt-BR", { year: "numeric", month: "long", day: "numeric" })}</p>
<div style="background:#fff8e1;border:1px solid #f59e0b;padding:14px;margin:14px 0;font-size:12px;line-height:1.7;color:#7c4d00">
<strong>⚠ Importante:</strong> Este é um <strong>relatório de autodeclaração</strong> com base nas informações fornecidas pelo produtor. Não substitui auditoria ESG independente, certificação de terceiros ou verificação por satélite. Os dados são de responsabilidade exclusiva do produtor rural.
</div>
<h2>Indicadores Declarados</h2>
<div class="grid3">
<div class="card"><div class="cl">Área (estimativa)</div><div class="cv">~${totalArea}</div><div class="cl">hectares</div></div>
<div class="card"><div class="cl">Lotes</div><div class="cv">${lots.length}</div><div class="cl">registrados</div></div>
<div class="card"><div class="cl">Práticas</div><div class="cv">${(user as AppUser & { praticasSustentaveis?: string[] }).praticasSustentaveis?.length || 0}</div><div class="cl">declaradas</div></div>
</div>
<h2>E — Ambiental (Autodeclarado)</h2>
<div class="e"><strong>Rastreabilidade de origem</strong> — ${lots.length} lote(s) registrado(s) digitalmente</div>
<div class="e"><strong>Produção documentada</strong> — ~${totalArea} ha com histórico digital de safras</div>
${(user as AppUser & { praticasSustentaveis?: string[] }).praticasSustentaveis?.length ? `<div class="e"><strong>Práticas sustentáveis declaradas</strong> — ${(user as AppUser & { praticasSustentaveis?: string[] }).praticasSustentaveis!.join(", ")}</div>` : ""}
<h2>S — Social (Autodeclarado)</h2>
<p>${esc(user.farmName)} adota rastreabilidade digital da produção, contribuindo para transparência da cadeia produtiva e facilitando relações de confiança com compradores e parceiros.</p>
<h2>G — Governança (Autodeclarado)</h2>
<p>A gestão utiliza o sistema Quem Produz para organização digital de lotes, registro de safras e geração de documentação para apresentação a compradores. As informações aqui contidas são autodeclaradas pelo produtor.</p>
<div class="footer">Gerado por Quem Produz | ${new Date().toLocaleString("pt-BR")} | Autodeclaração do produtor — não constitui certificação oficial. Área calculada com margem de erro estimada de 1–3 ha.</div>
<div class="no-print"><button class="btn" onclick="window.print()">Imprimir / Salvar PDF</button></div>
</body></html>`;
  downloadHTML(html, `ESG_${esc(user.farmName)}_${new Date().toISOString().slice(0,10)}.html`);
};

const DOC_TYPE_LABELS: Record<string, string> = {
  car: "CAR — Cadastro Ambiental Rural",
  ccir: "CCIR — Certificado de Cadastro de Imóvel Rural",
  itr: "ITR — Imposto Territorial Rural",
  matricula: "Matrícula do imóvel",
  licenca_ambiental: "Licença ambiental",
  outorga_agua: "Outorga de uso da água",
  projeto_tecnico: "Projeto técnico",
  outro: "Outro",
};

// Gera HTML de imagem de satélite (Esri World Imagery) com polígono do lote desenhado por cima.
// Usa endpoint público de exportação (sem chave de API).
const lotSatelliteHTML = (lot: Lot, width = 600, height = 400): string => {
  const pts = lot.mapPoints || [];
  if (pts.length < 2) return "";

  // BBox dos pontos
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const [lat, lng] of pts) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }

  // Padding 30% pra o polígono não colar nas bordas
  const padLat = Math.max((maxLat - minLat) * 0.3, 0.001);
  const padLng = Math.max((maxLng - minLng) * 0.3, 0.001);
  minLat -= padLat; maxLat += padLat;
  minLng -= padLng; maxLng += padLng;

  // Ajusta aspect ratio do bbox pra bater com a imagem (evita distorção)
  const imgAspect = width / height;
  // Em latitudes brasileiras, 1° lat ≈ 1° lng * cos(lat) — compensação simples
  const cosLat = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180);
  const bboxLatHeight = maxLat - minLat;
  const bboxLngWidth = (maxLng - minLng) * cosLat;
  const bboxAspect = bboxLngWidth / bboxLatHeight;

  if (bboxAspect < imgAspect) {
    // Bbox mais alto que a imagem → expande horizontalmente
    const targetLngWidth = bboxLatHeight * imgAspect / cosLat;
    const extra = (targetLngWidth - (maxLng - minLng)) / 2;
    minLng -= extra; maxLng += extra;
  } else {
    // Bbox mais largo → expande verticalmente
    const targetLatHeight = bboxLngWidth / imgAspect;
    const extra = (targetLatHeight - bboxLatHeight) / 2;
    minLat -= extra; maxLat += extra;
  }

  const url = `https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export?bbox=${minLng},${minLat},${maxLng},${maxLat}&bboxSR=4326&imageSR=4326&size=${width},${height}&format=jpg&f=image`;

  // Mapeia pontos do polígono pra coordenadas da imagem (px)
  const polyPx = pts.map(([lat, lng]) => {
    const x = ((lng - minLng) / (maxLng - minLng)) * width;
    const y = (1 - (lat - minLat) / (maxLat - minLat)) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  // Centro pra mostrar embaixo
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  return `
<div style="position:relative;width:100%;max-width:${width}px;margin:8px 0">
  <img src="${url}" alt="Imagem de satélite do lote" style="width:100%;display:block;border:1px solid #ccc" />
  <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"
    style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none">
    <polygon points="${polyPx}" fill="rgba(15,138,48,0.25)" stroke="#0AEF43" stroke-width="2.5" />
  </svg>
  <div style="font-size:10px;color:#666;margin-top:4px">
    Centro aproximado: ${centerLat.toFixed(5)}, ${centerLng.toFixed(5)} · Imagem: Esri World Imagery
  </div>
</div>`;
};

const openDossie = (
  user: AppUser,
  lots: Lot[],
  practices: api.ApiPractice[],
  documents: api.ApiDocument[]
) => {
  const totalArea = lots.reduce((a, l) => a + (Number(l.area) || 0), 0);
  const eudrCount = lots.filter(l => (l as Lot & { eudrCompliant?: boolean }).eudrCompliant).length;
  const activePractices = practices.filter(p => p.active);
  const today = new Date();
  const expiringSoon = documents.filter(d => {
    if (!d.expiresAt) return false;
    const exp = new Date(d.expiresAt);
    const days = (exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 60;
  });
  const expired = documents.filter(d => {
    if (!d.expiresAt) return false;
    return new Date(d.expiresAt).getTime() < today.getTime();
  });

  // Agrupa práticas por categoria
  const practicesByCat: Record<string, api.ApiPractice[]> = {};
  for (const p of activePractices) {
    if (!practicesByCat[p.category]) practicesByCat[p.category] = [];
    practicesByCat[p.category].push(p);
  }
  const catLabels: Record<string, string> = {
    solo: "Manejo do solo",
    biodiversidade: "Biodiversidade",
    pecuaria: "Pecuária",
    agua: "Recursos hídricos",
    insumos: "Insumos",
    residuos: "Resíduos",
  };

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Dossiê — ${esc(user.farmName)}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;max-width:820px;margin:0 auto;padding:40px;color:#111}
.badge{display:inline-block;background:#166534;color:#fff;padding:4px 12px;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin-bottom:16px}
h1{font-size:28px;font-weight:900;text-transform:uppercase;letter-spacing:-1px;margin-bottom:6px}
.sub{color:#555;font-size:13px;margin-bottom:24px}
h2{font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;margin:28px 0 12px;color:#555;border-bottom:1px solid #eee;padding-bottom:8px}
h3{font-size:13px;font-weight:bold;margin:16px 0 8px;color:#222}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:14px 0}
.grid4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin:14px 0}
.card{border:1px solid #ddd;padding:14px}
.cl{font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:5px}
.cv{font-size:17px;font-weight:bold}
table{width:100%;border-collapse:collapse;margin:14px 0}
th{background:#000;color:#fff;padding:10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px}
td{padding:10px;border-bottom:1px solid #eee;font-size:13px;vertical-align:top}
.warn{background:#fff8e1;border:1px solid #f59e0b;padding:14px;margin:14px 0;font-size:12px;line-height:1.7;color:#7c4d00}
.alert{background:#fef2f2;border:1px solid #b91c1c;padding:14px;margin:14px 0;font-size:12px;line-height:1.7;color:#7f1d1d}
.ok{color:#166534;font-weight:bold}
.muted{color:#777;font-size:12px}
.tag{display:inline-block;background:#f4f4f4;border:1px solid #ddd;padding:3px 8px;font-size:11px;border-radius:4px;margin:2px}
.decl{font-size:13px;line-height:1.8;border-left:3px solid #166534;padding-left:14px;margin:14px 0;background:#f0fdf4;padding:16px}
.footer{margin-top:36px;padding-top:14px;border-top:1px solid #ddd;font-size:11px;color:#999}
.btn{display:inline-block;margin-top:20px;padding:12px 24px;background:#166534;color:#fff;border:none;cursor:pointer;font-weight:bold;font-size:12px;text-transform:uppercase;letter-spacing:1px}
@media print{.no-print{display:none}body{padding:20px}}
</style></head><body>
<div class="badge">Quem Produz — Dossiê de Boas Práticas</div>
<h1>${esc(user.farmName)}</h1>
<p class="sub">Produtor: ${esc(user.name || "—")} | Emitido em: ${today.toLocaleDateString("pt-BR", { year: "numeric", month: "long", day: "numeric" })}</p>

<div class="warn">
<strong>⚠ Autodeclaração:</strong> Este dossiê reúne <strong>informações declaradas pelo produtor</strong> sobre práticas adotadas e documentos disponíveis. Não substitui auditoria, certificação por terceiros ou análise de crédito. Serve como vitrine de transparência e organização da fazenda. As informações são de responsabilidade exclusiva do produtor rural.
</div>

<h2>Visão Geral</h2>
<div class="grid4">
<div class="card"><div class="cl">Área estimada</div><div class="cv">~${totalArea} ha</div></div>
<div class="card"><div class="cl">Lotes</div><div class="cv">${lots.length}</div></div>
<div class="card"><div class="cl">Práticas</div><div class="cv">${activePractices.length}</div></div>
<div class="card"><div class="cl">Documentos</div><div class="cv">${documents.length}</div></div>
</div>

${expired.length > 0 ? `<div class="alert"><strong>⚠ ${expired.length} documento(s) vencido(s):</strong> ${expired.map(d => esc(d.name)).join(", ")}</div>` : ""}
${expiringSoon.length > 0 ? `<div class="warn"><strong>⏰ ${expiringSoon.length} documento(s) vencendo em até 60 dias:</strong> ${expiringSoon.map(d => `${esc(d.name)} (${new Date(d.expiresAt!).toLocaleDateString("pt-BR")})`).join(", ")}</div>` : ""}

<h2>Identificação</h2>
<div class="grid">
<div class="card"><div class="cl">Localização</div><div class="cv" style="font-size:13px">${esc(user.location || "—")}</div></div>
<div class="card"><div class="cl">E-mail</div><div class="cv" style="font-size:13px">${esc(user.email)}</div></div>
<div class="card"><div class="cl">Telefone</div><div class="cv" style="font-size:13px">${esc(user.phone || "—")}</div></div>
<div class="card"><div class="cl">Lotes em conformidade EUDR</div><div class="cv">${eudrCount} / ${lots.length}</div></div>
</div>

<h2>Boas Práticas Declaradas (${activePractices.length})</h2>
${activePractices.length === 0 ? `<p class="muted">Nenhuma prática declarada ainda.</p>` :
Object.keys(practicesByCat).map(cat => `
<h3>${esc(catLabels[cat] || cat)}</h3>
<table><thead><tr><th style="width:30%">Prática</th><th style="width:20%">Desde</th><th>Observação</th></tr></thead><tbody>
${practicesByCat[cat].map(p => `<tr>
<td><strong>${esc(p.name)}</strong></td>
<td>${p.startDate ? new Date(p.startDate).toLocaleDateString("pt-BR") : "—"}</td>
<td>${esc(p.notes || "—")}</td>
</tr>`).join("")}
</tbody></table>
`).join("")
}

<h2>Lotes (${lots.length})</h2>
${lots.length === 0 ? `<p class="muted">Nenhum lote cadastrado.</p>` : `
<table><thead><tr><th>Lote</th><th>Cultura</th><th>Área (ha)</th><th>Plantio</th><th>EUDR</th></tr></thead><tbody>
${lots.map(l => `<tr>
<td><strong>${esc(l.name)}</strong></td>
<td>${esc(l.crop)}</td>
<td>~${esc(l.area)}</td>
<td>${l.date ? new Date(l.date + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</td>
<td>${(l as Lot & { eudrCompliant?: boolean }).eudrCompliant ? '<span class="ok">✓ Sim</span>' : '<span class="muted">—</span>'}</td>
</tr>`).join("")}
</tbody></table>`}

${(() => {
  const lotsWithGeo = lots.filter(l => l.mapPoints && l.mapPoints.length >= 3);
  if (lotsWithGeo.length === 0) return "";
  return `
<h2>Imagens de Satélite dos Lotes</h2>
<p class="muted" style="margin-bottom:14px">Imagens da Esri World Imagery com o polígono declarado pelo produtor desenhado por cima.</p>
${lotsWithGeo.map(l => `
<div style="page-break-inside:avoid;margin:18px 0;padding:14px;border:1px solid #ddd">
  <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;flex-wrap:wrap;gap:8px">
    <h3 style="margin:0;font-size:14px">${esc(l.name)}</h3>
    <span style="font-size:11px;color:#666">${esc(l.crop)} · ~${esc(l.area)} ha${(l as Lot & { eudrCompliant?: boolean }).eudrCompliant ? ' · <span class="ok">✓ EUDR</span>' : ''}</span>
  </div>
  ${lotSatelliteHTML(l)}
</div>`).join("")}`;
})()}

<h2>Documentos da Propriedade (${documents.length})</h2>
${documents.length === 0 ? `<p class="muted">Nenhum documento anexado.</p>` : `
<table><thead><tr><th>Tipo</th><th>Nome / Identificador</th><th>Validade</th><th>Observação</th></tr></thead><tbody>
${documents.map(d => {
  let validity = "—";
  if (d.expiresAt) {
    const exp = new Date(d.expiresAt);
    const dStr = exp.toLocaleDateString("pt-BR");
    if (exp.getTime() < today.getTime()) validity = `<span style="color:#b91c1c;font-weight:bold">${dStr} (vencido)</span>`;
    else validity = dStr;
  }
  return `<tr>
<td><strong>${esc(DOC_TYPE_LABELS[d.type] || d.type)}</strong></td>
<td>${esc(d.name)}</td>
<td>${validity}</td>
<td>${esc(d.notes || "—")}</td>
</tr>`;
}).join("")}
</tbody></table>`}

<h2>Declaração do Produtor</h2>
<p class="decl">Eu, <strong>${esc(user.name || user.farmName)}</strong>, declaro, sob minha responsabilidade, que as informações registradas neste dossiê são verídicas e refletem o que é praticado na fazenda. Esta é uma <strong>autodeclaração</strong> de boas práticas e organização documental, e não constitui certificação oficial, auditoria por terceiros ou aprovação de crédito. As informações aqui contidas são de minha exclusiva responsabilidade.</p>

<div class="footer">Gerado por Quem Produz | ${today.toLocaleString("pt-BR")} | Autodeclaração do produtor — não constitui certificação oficial. Área calculada a partir de registros digitais com margem de erro estimada de 1–3 ha.</div>
<div class="no-print"><button class="btn" onclick="window.print()">Imprimir / Salvar PDF</button></div>
</body></html>`;
  downloadHTML(html, `Dossie_${esc(user.farmName)}_${today.toISOString().slice(0, 10)}.html`);
};

// ─────────────────────────────────────────────
// UI Primitives
// ─────────────────────────────────────────────

// ─── Banner LGPD — aparece 1 vez, leve, sem popup bloqueante ───
const LGPDBanner = () => {
  const [visible, setVisible] = useState(() => !localStorage.getItem("rastro_lgpd"));
  if (!visible) return null;
  const accept = () => { localStorage.setItem("rastro_lgpd", "1"); setVisible(false); };
  return (
    <div style={{ position: "fixed", bottom: 72, left: 0, right: 0, zIndex: 9000, display: "flex", justifyContent: "center", padding: "0 16px", pointerEvents: "none" }}>
      <div style={{ background: "#111", border: "1px solid rgba(224,255,34,0.3)", borderRadius: 16, padding: "14px 18px", maxWidth: 480, width: "100%", display: "flex", alignItems: "center", gap: 12, pointerEvents: "auto", fontFamily: "var(--font-sans)" }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Seus dados ficam <strong style={{ color: "#E0FF22" }}>apenas no seu dispositivo</strong>. Usamos cookies mínimos. Ao continuar, você aceita a{" "}
            <span style={{ color: "#E0FF22" }}>Política de Privacidade</span> em conformidade com a LGPD.
          </span>
        </div>
        <button onClick={accept} style={{ background: "#E0FF22", border: "none", color: "#0A0A0A", fontFamily: "var(--font-sans)", fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", padding: "8px 16px", borderRadius: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
          Entendi
        </button>
      </div>
    </div>
  );
};

// ─── Paywall Modal ────────────────────────────────────────────────────────────
const PaywallModal = ({ feature, description, onClose, onUpgrade }: {
  feature: string; description?: string; onClose: () => void; onUpgrade: () => void;
}) => (
  <div className="fixed inset-0 z-[2000] bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
    <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      className="bg-bg border border-accent/30 w-full max-w-sm p-6 rounded-3xl">
      <div className="flex items-start justify-between mb-5">
        <div className="w-10 h-10 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-center">
          <TrendingUp size={18} className="text-accent" strokeWidth={1.5} />
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-text transition-colors"><X size={18} /></button>
      </div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-accent mb-1">Recurso Pro</p>
      <h3 className="text-lg font-black uppercase tracking-tight text-text mb-2">{feature}</h3>
      <p className="text-[11px] text-white/50 mb-6 leading-relaxed">
        {description ?? "Este recurso requer o plano Pro ou superior. Desbloqueie lotes ilimitados, relatórios EUDR/ESG e score de governança completo."}
      </p>
      <Btn full onClick={onUpgrade} icon={ChevronRight}>Ver planos</Btn>
      <button onClick={onClose} className="w-full mt-3 text-[9px] font-bold uppercase tracking-widest text-white/40 hover:text-white/60 transition-colors py-2">
        Agora não
      </button>
    </motion.div>
  </div>
);

const ToastContainer = () => {
  const { toasts, removeToast } = useContext(AppContext);
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 w-[calc(100%-32px)] max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id} initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest border rounded-2xl ${t.type === "success" ? "bg-accent text-bg border-accent" : t.type === "error" ? "bg-red-500 text-white border-red-500" : "bg-bg text-text border-white/30"}`}>
            {t.type === "success" && <Check size={13} />}
            {t.type === "error" && <AlertCircle size={13} />}
            {t.type === "info" && <AlertCircle size={13} />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => removeToast(t.id)} className="opacity-70 hover:opacity-100"><X size={13} /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

const ThemeToggle = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  return (
    <button onClick={toggleTheme} className="w-9 h-9 flex items-center justify-center text-white/40 hover:text-accent transition-colors" aria-label="Alternar tema">
      {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
};

const TopBar = ({ title, onBack, right }: { title: string; onBack?: () => void; right?: React.ReactNode }) => (
  <div className="sticky top-0 z-50 bg-bg text-text border-b border-white/10">
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-4 flex items-center">
      {onBack && <button onClick={onBack} className="mr-4 text-text hover:text-accent transition-colors"><ChevronLeft size={24} /></button>}
      <h1 className="text-base md:text-lg font-extrabold uppercase tracking-tight flex-1 truncate">{title}</h1>
      {right && <div>{right}</div>}
    </div>
  </div>
);

const NAV_ITEMS = [
  { icon: Home, label: "Início", s: 3 },
  { icon: Sprout, label: "Produção", s: 7 },
  { icon: MapIcon, label: "Mapa", s: 8 },
  { icon: FileText, label: "Docs", s: 11 },
  { icon: Leaf, label: "Práticas", s: 14 },
  { icon: User, label: "Perfil", s: 4 },
];

// Mobile bottom nav
const BottomNav = ({ active, onNav }: { active: number; onNav: (s: number) => void }) => (
  <div className="md:hidden fixed bottom-0 left-0 right-0 z-[1000]">
    {/* Blur backdrop */}
    <div className="absolute inset-0 bg-bg/90 backdrop-blur-xl border-t border-white/8 rounded-t-[28px]" />
    <div className="relative flex justify-around items-end px-2 pt-2 pb-safe">
      {NAV_ITEMS.map((item, i) => {
        const isActive = active === item.s;
        const Icon = item.icon;
        return (
          <button
            key={i}
            onClick={() => onNav(item.s)}
            className="flex flex-col items-center gap-[3px] py-1.5 px-1 min-w-[44px] relative"
          >
            <motion.div
              className={`flex items-center justify-center w-11 h-8 rounded-xl transition-colors duration-200 ${isActive ? "bg-accent/12" : "bg-transparent"}`}
              animate={{ y: isActive ? -1 : 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <Icon
                size={18}
                strokeWidth={isActive ? 2 : 1.5}
                className={`transition-colors duration-200 ${isActive ? "text-accent" : "text-white/35"}`}
              />
            </motion.div>
            <span className={`text-[8.5px] tracking-[0.08em] uppercase leading-none transition-colors duration-200 ${isActive ? "text-accent font-semibold" : "text-white/30 font-medium"}`}>
              {item.label}
            </span>
            {isActive && (
              <motion.div
                layoutId="nav-dot"
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-accent rounded-full"
                transition={{ duration: 0.2, ease: "easeOut" }}
              />
            )}
          </button>
        );
      })}
    </div>
  </div>
);

// Desktop sidebar nav
const SidebarNav = ({ active, onNav, onLogout }: { active: number; onNav: (s: number) => void; onLogout: () => void }) => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { tier } = usePlan();
  return (
  <aside className="hidden md:flex flex-col bg-bg border-r border-white/10 self-start sticky top-0 h-screen z-40 w-16 lg:w-56 shrink-0">
    {/* Logo */}
    <div className="h-16 border-b border-white/10 flex items-center justify-center lg:justify-start lg:px-5 shrink-0">
      <Logo className="hidden lg:block" />
      <Sprout size={22} className="lg:hidden text-accent" />
    </div>
    {/* Nav items */}
    <nav className="flex-1 py-3 overflow-y-auto flex flex-col gap-0.5">
      {NAV_ITEMS.map((item, i) => {
        const isActive = active === item.s;
        const Icon = item.icon;
        return (
          <div key={i} className="px-2 lg:px-3">
            <button onClick={() => onNav(item.s)}
              className={`w-full flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-3 py-2.5 rounded-xl transition-all duration-200 relative group ${isActive ? "bg-accent/10 text-accent" : "text-white/35 hover:text-white/70 hover:bg-white/4"}`}>
              {isActive && <motion.span layoutId="sidebar-indicator" className="absolute left-0 top-2 bottom-2 w-[3px] bg-accent rounded-r-full" transition={{ duration: 0.2 }} />}
              <Icon size={17} strokeWidth={isActive ? 2 : 1.5} className="shrink-0 ml-1" />
              <span className={`hidden lg:block text-[10px] uppercase tracking-[0.1em] leading-none ${isActive ? "font-bold" : "font-medium"}`}>{item.label}</span>
            </button>
          </div>
        );
      })}
    </nav>
    {/* Plan badge + upgrade CTA */}
    {tier === "free" && (
      <div className="px-3 pb-2 shrink-0">
        <button onClick={() => onNav(15)}
          className="w-full flex items-center justify-center lg:justify-start gap-2 px-3 py-2.5 bg-accent/10 border border-accent/20 hover:border-accent/60 transition-all rounded-2xl group">
          <TrendingUp size={14} className="text-accent shrink-0" strokeWidth={1.5} />
          <span className="hidden lg:block text-[9px] font-black uppercase tracking-widest text-accent">Upgrade Pro</span>
        </button>
      </div>
    )}
    {tier !== "free" && (
      <div className="px-3 pb-2 shrink-0">
        <div className="flex items-center justify-center lg:justify-start gap-2 px-3 py-2 border border-white/10 rounded-2xl">
          <BadgeCheck size={13} className="text-accent shrink-0" />
          <span className="hidden lg:block text-[9px] font-black uppercase tracking-widest text-accent">{PLANS[tier].name}</span>
        </div>
      </div>
    )}
    {/* Theme toggle + Logout */}
    <div className="border-t border-white/10 shrink-0">
      <button onClick={toggleTheme} className="w-full flex items-center justify-center lg:justify-start lg:px-5 py-3.5 text-white/35 hover:text-accent transition-colors group">
        <div className="w-9 h-9 flex items-center justify-center group-hover:bg-white/5 transition-colors">
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </div>
        <span className="hidden lg:block ml-3 text-[10px] font-bold uppercase tracking-widest">{theme === "dark" ? "Modo claro" : "Modo escuro"}</span>
      </button>
      <button onClick={onLogout} className="w-full flex items-center justify-center lg:justify-start lg:px-5 py-3.5 text-white/35 hover:text-accent transition-colors group">
        <div className="w-9 h-9 flex items-center justify-center group-hover:bg-white/5 transition-colors">
          <LogOut size={17} />
        </div>
        <span className="hidden lg:block ml-3 text-[10px] font-bold uppercase tracking-widest">Sair</span>
      </button>
    </div>
  </aside>
  );
};

// Tamanhos máximos por tipo de input — alinhados com validações do servidor
const FIELD_MAX_LENGTH: Record<string, number> = {
  email: 254,
  password: 128,
  tel: 30,
  url: 500,
  number: 12,
  text: 200,
};

const Field = ({ label, placeholder, tall, type = "text", value, onChange, error, maxLength, autoComplete }: { label: string; placeholder?: string; tall?: boolean; type?: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void; error?: string; maxLength?: number; autoComplete?: string }) => {
  const ml = maxLength ?? (tall ? 2000 : FIELD_MAX_LENGTH[type] ?? 200);
  return (
  <div className="mb-5">
    <label className="block text-[10px] font-bold uppercase tracking-widest text-accent mb-2">{label}</label>
    {tall ? (
      <textarea value={value} onChange={onChange} maxLength={ml} className={`w-full px-4 py-3 border bg-transparent focus:bg-white/5 focus:ring-1 focus:ring-accent transition-all text-sm text-text resize-none h-24 rounded-2xl placeholder-white/30 ${error ? "border-red-500" : "border-white/20 focus:border-accent"}`} placeholder={placeholder} />
    ) : (
      <input type={type} value={value} onChange={onChange} maxLength={ml} autoComplete={autoComplete} className={`w-full px-4 py-3 border bg-transparent focus:bg-white/5 focus:ring-1 focus:ring-accent transition-all text-sm text-text rounded-2xl placeholder-white/30 ${error ? "border-red-500" : "border-white/20 focus:border-accent"}`} placeholder={placeholder} />
    )}
    {error && <p className="text-[10px] text-red-400 mt-1 font-bold uppercase tracking-widest">{error}</p>}
  </div>
  );
};

const Logo = ({ className = "", height = 38 }: { className?: string; height?: number }) => {
  const { theme } = useContext(ThemeContext);
  return (
    <img
      src={theme === "light" ? "/logo-dark.svg" : "/logo-light.svg"}
      alt="Quem Produz"
      className={`w-auto object-contain ${className}`}
      style={{ height }}
    />
  );
};

const Btn = ({ children, onClick, full, outline, small, icon: Icon, disabled }: { children: React.ReactNode; onClick?: () => void; full?: boolean; outline?: boolean; small?: boolean; icon?: React.ElementType; disabled?: boolean }) => (
  <motion.button whileTap={{ scale: disabled ? 1 : 0.98 }} onClick={disabled ? undefined : onClick}
    className={`flex items-center justify-center gap-3 font-black uppercase tracking-widest transition-all rounded-2xl ${full ? "w-full" : ""} ${small ? "px-4 py-2.5 text-[10px]" : "px-6 py-4 text-xs"} ${outline ? "bg-transparent text-accent border border-accent hover:bg-accent/10" : "bg-accent text-bg hover:bg-accent/90"} ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}>
    {Icon && <Icon size={small ? 15 : 17} />}
    {children}
  </motion.button>
);

const StatCard = ({ n, l, icon: Icon }: { n: string; l: string; icon: React.ElementType }) => (
  <div className="bg-transparent border border-white/10 p-4 text-center flex flex-col items-center justify-center rounded-2xl">
    <div className="text-accent mb-3"><Icon size={18} strokeWidth={2} /></div>
    <div className="text-2xl font-black text-text leading-none mb-1">{n}</div>
    <div className="text-[9px] text-white/60 font-bold uppercase tracking-widest">{l}</div>
  </div>
);

// Image uploader: hidden file input triggered by click
const ImgUploader = ({ value, onChange, className, children }: { value?: string; onChange: (b64: string) => void; className?: string; children: React.ReactNode }) => {
  const ref = useRef<HTMLInputElement>(null);
  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (!f.type.startsWith("image/")) { e.target.value = ""; return; }
    if (f.size > MAX_FILE_BYTES) { alert("Imagem muito grande. Máximo 5MB."); e.target.value = ""; return; }
    const reader = new FileReader();
    reader.onloadend = async () => { onChange(await resizeImage(reader.result as string)); };
    reader.readAsDataURL(f);
    e.target.value = "";
  };
  return (
    <>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handle} />
      <div onClick={() => ref.current?.click()} className={`cursor-pointer ${className || ""}`}>{children}</div>
    </>
  );
};

// ─── Helper: aplica logoTransform como CSS transform na imagem ───
const LogoImg = ({ src, transform, style, className }: {
  src: string; transform?: LogoTransform; style?: React.CSSProperties; className?: string;
}) => {
  const t = transform ?? { scale: 1, x: 0, y: 0 };
  return (
    <img src={src} alt="logo" className={className}
      style={{ width: "100%", height: "100%", objectFit: "cover",
        transform: `translate(${t.x}px, ${t.y}px) scale(${t.scale})`,
        transformOrigin: "center", ...style }} />
  );
};

// ─── Editor de logo: arrastar + zoom ───
const LogoCropEditor = ({ src, transform, onSave, onClose }: {
  src: string; transform?: LogoTransform;
  onSave: (t: LogoTransform) => void; onClose: () => void;
}) => {
  const [scale, setScale] = useState(transform?.scale ?? 1);
  const [x, setX] = useState(transform?.x ?? 0);
  const [y, setY] = useState(transform?.y ?? 0);
  const dragStart = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const PREVIEW = 280;
  useEscapeKey(onClose);
  useBodyScrollLock();

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { px: e.clientX, py: e.clientY, ox: x, oy: y };
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    const maxOffset = (PREVIEW / 2) * (scale - 1) + PREVIEW * 0.3;
    const nx = dragStart.current.ox + (e.clientX - dragStart.current.px);
    const ny = dragStart.current.oy + (e.clientY - dragStart.current.py);
    setX(Math.max(-maxOffset, Math.min(maxOffset, nx)));
    setY(Math.max(-maxOffset, Math.min(maxOffset, ny)));
  };
  const handlePointerUp = () => { dragStart.current = null; };

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.92)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-sans)" }}>
      {/* Header */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", borderBottom: "1px solid rgba(255,255,255,0.1)", background: "#0A0A0A" }}>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontFamily: "inherit", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", display: "flex", alignItems: "center", gap: 8 }}>
          <X size={16} /> Cancelar
        </button>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "#F5F5F5" }}>Ajustar logo</span>
        <button onClick={() => { onSave({ scale, x, y }); onClose(); }}
          style={{ background: "none", border: "none", color: "#E0FF22", cursor: "pointer", fontFamily: "inherit", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", display: "flex", alignItems: "center", gap: 8 }}>
          <Check size={16} /> Salvar
        </button>
      </div>

      {/* Instrução */}
      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>
        Arraste para reposicionar
      </p>

      {/* Preview quadrado com overflow hidden — área de arrastar */}
      <div onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}
        style={{ width: PREVIEW, height: PREVIEW, overflow: "hidden", cursor: "grab", border: "2px solid #E0FF22", position: "relative", userSelect: "none", touchAction: "none" }}>
        <img src={src} alt="logo" draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none",
            transform: `translate(${x}px, ${y}px) scale(${scale})`, transformOrigin: "center" }} />
        {/* Grid overlay para referência */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "repeating-linear-gradient(0deg,transparent,transparent 46px,rgba(255,255,255,0.04) 46px,rgba(255,255,255,0.04) 47px), repeating-linear-gradient(90deg,transparent,transparent 46px,rgba(255,255,255,0.04) 46px,rgba(255,255,255,0.04) 47px)" }} />
      </div>

      {/* Zoom slider */}
      <div style={{ marginTop: 28, width: PREVIEW, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(255,255,255,0.4)" }}>Zoom</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#E0FF22" }}>{scale.toFixed(1)}×</span>
        </div>
        <input type="range" min={1} max={3} step={0.05} value={scale}
          onChange={e => setScale(Number(e.target.value))}
          style={{ width: "100%", accentColor: "#E0FF22", cursor: "pointer" }} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontWeight: 700 }}>1×</span>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontWeight: 700 }}>3×</span>
        </div>
      </div>

      {/* Reset */}
      <button onClick={() => { setScale(1); setX(0); setY(0); }}
        style={{ marginTop: 20, background: "none", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.5)", padding: "8px 20px", cursor: "pointer", fontFamily: "inherit", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em" }}>
        Resetar
      </button>
    </div>,
    document.body
  );
};

// ─── Calcula área do polígono em hectares (Shoelace + fator de conversão) ───
const calcAreaHa = (pts: [number, number][]): number => {
  if (pts.length < 3) return 0;
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  let area = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const xi = toRad(pts[i][1]) * Math.cos(toRad((pts[i][0] + pts[j][0]) / 2));
    const xj = toRad(pts[j][1]) * Math.cos(toRad((pts[i][0] + pts[j][0]) / 2));
    area += xi * toRad(pts[j][0]) - xj * toRad(pts[i][0]);
  }
  return Math.abs((area * R * R) / 2) / 10000;
};

// ─── Componente de mapa reutilizável (somente visualização) ───
const LeafletMap = ({ points, height = 300, zoom = 14 }: { points: [number, number][]; height?: number; zoom?: number }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const center: [number, number] = points.length > 0
      ? [points.reduce((s, p) => s + p[0], 0) / points.length, points.reduce((s, p) => s + p[1], 0) / points.length]
      : [-15.77972, -47.92972];
    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: false }).setView(center, zoom);
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19 }).addTo(map);
    if (points.length > 2) {
      L.polygon(points, { color: "#E0FF22", weight: 2, fillOpacity: 0.15 }).addTo(map);
      points.forEach(p => L.circleMarker(p, { radius: 5, color: "#E0FF22", fillColor: "#E0FF22", fillOpacity: 1, weight: 0 }).addTo(map));
    }
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);
  return <div ref={containerRef} style={{ height, width: "100%" }} />;
};

// ─── Mapa de visão geral de múltiplos lotes (perfil público da fazenda) ───
// Renderiza N polígonos sobre uma imagem satélite. Auto-fit aos lotes.
// Não é interativo — só visualização (cliques são deixados para a tela /app/lot).
const LotsOverviewMap = ({ lots, height = 320 }: {
  lots: { id: string; name: string; crop: string; area?: number | string; points: [number, number][] }[];
  height?: number;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (lots.length === 0) return;
    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: false, // evita "sequestrar" o scroll da página
    }).setView([-15.77972, -47.92972], 5);
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19 }).addTo(map);

    const allPoints: [number, number][] = [];
    lots.forEach((lot, idx) => {
      if (lot.points.length < 3) return;
      // Cor levemente variada por índice — sem virar arco-íris (mantém paleta accent)
      const isFirst = idx === 0;
      const color = isFirst ? "#E0FF22" : "#9FFFA1";
      L.polygon(lot.points, { color, weight: 2, fillColor: color, fillOpacity: 0.18 })
        .addTo(map)
        .bindTooltip(`${lot.name} · ${lot.crop}`, { sticky: true, direction: "top" });
      lot.points.forEach(p => allPoints.push(p));
    });

    if (allPoints.length > 0) {
      try {
        map.fitBounds(L.latLngBounds(allPoints), { padding: [30, 30], maxZoom: 14, animate: false });
      } catch { /* ignora bounds inválidos */ }
    }

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [lots]);

  return <div ref={containerRef} style={{ height, width: "100%" }} />;
};

// ─── Editor de sede da fazenda (pin único) ───
const FarmPinDrawer = ({ initialPin, onSave, onClose }: {
  initialPin?: [number, number];
  onSave: (pin: [number, number]) => void;
  onClose: () => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const pinMarkerRef = useRef<L.Marker | null>(null);
  const locDotRef = useRef<L.CircleMarker | null>(null);
  const [pin, setPin] = useState<[number, number] | null>(initialPin || null);
  const [locating, setLocating] = useState(false);
  const [locFound, setLocFound] = useState(false);
  // Busca por município/estado/endereço (Nominatim/OpenStreetMap)
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ display_name: string; lat: string; lon: string; type?: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const searchAbortRef = useRef<AbortController | null>(null);
  useEscapeKey(onClose);
  useBodyScrollLock();

  useEffect(() => {
    if (!containerRef.current) return;
    const center: [number, number] = initialPin || [-15.77972, -47.92972];
    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: false })
      .setView(center, initialPin ? 14 : 5);
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19 }).addTo(map);

    // Click no mapa define/move o pin de sede
    map.on("click", (e: L.LeafletMouseEvent) => {
      const latlng: [number, number] = [e.latlng.lat, e.latlng.lng];
      setPin(latlng);
    });

    mapRef.current = map;
    requestAnimationFrame(() => requestAnimationFrame(() => map.invalidateSize()));
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Redraw pin marker quando pin muda
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (pinMarkerRef.current) { pinMarkerRef.current.remove(); pinMarkerRef.current = null; }
    if (pin) {
      const icon = L.divIcon({
        html: `<div style="width:32px;height:32px;background:#E0FF22;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #0A0A0A;box-shadow:0 2px 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;">
          <span style="transform:rotate(45deg);font-size:14px;line-height:1">🏠</span>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        className: "",
      });
      pinMarkerRef.current = L.marker(pin, { icon }).addTo(map);
      pinMarkerRef.current.bindTooltip("Sede da fazenda", { permanent: false });
    }
  }, [pin]);

  const handleLocate = () => {
    setLocating(true);
    setLocFound(false);
    const map = mapRef.current;
    if (!map) return;
    map.locate({ setView: true, maxZoom: 16 });
    map.once("locationfound", (e: L.LocationEvent) => {
      if (locDotRef.current) { locDotRef.current.remove(); locDotRef.current = null; }
      const dot = L.circleMarker(e.latlng, {
        radius: 10, color: "#3B82F6", fillColor: "#3B82F6", fillOpacity: 0.35, weight: 3,
      }).addTo(map);
      dot.bindTooltip("📍 Sua localização", { permanent: false });
      locDotRef.current = dot;
      setLocating(false);
      setLocFound(true);
    });
    map.once("locationerror", () => { setLocating(false); setLocFound(false); });
  };

  // Busca de localização via Nominatim (OSM) — município, estado, endereço
  const handleSearch = async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 3) { setSearchResults([]); return; }
    searchAbortRef.current?.abort();
    const ctrl = new AbortController();
    searchAbortRef.current = ctrl;
    setSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=br&accept-language=pt-BR&q=${encodeURIComponent(trimmed)}`;
      const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("erro busca");
      const data = await res.json() as { display_name: string; lat: string; lon: string; type?: string }[];
      setSearchResults(data);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectResult = (r: { lat: string; lon: string }) => {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    if (Number.isFinite(lat) && Number.isFinite(lng) && mapRef.current) {
      mapRef.current.setView([lat, lng], 13);
    }
    setSearchResults([]);
    setSearchQuery("");
  };

  // Debounce da busca
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(() => { handleSearch(searchQuery); }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Aborta fetch pendente ao desmontar
  useEffect(() => {
    return () => { searchAbortRef.current?.abort(); };
  }, []);

  const HEADER_H = 56;
  const SEARCH_H = 44;
  const HINT_H   = 32;
  const CTRL_H   = 56;
  const MAP_TOP  = HEADER_H + SEARCH_H + HINT_H;
  const MAP_BTM  = CTRL_H;

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#0A0A0A", fontFamily: "var(--font-sans)" }}>
      {/* Header */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: HEADER_H, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", borderBottom: "1px solid rgba(255,255,255,0.1)", background: "#0A0A0A", zIndex: 10 }}>
        <button onClick={onClose} style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.6)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
          <X size={18} /><span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em" }}>Cancelar</span>
        </button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "#F5F5F5" }}>Sede da Fazenda</div>
          {pin && <div style={{ fontSize: 9, fontWeight: 700, color: "#E0FF22" }}>{pin[0].toFixed(5)}, {pin[1].toFixed(5)}</div>}
        </div>
        <button onClick={() => { if (pin) { onSave(pin); onClose(); } }} disabled={!pin}
          style={{ display: "flex", alignItems: "center", gap: 8, color: pin ? "#E0FF22" : "rgba(255,255,255,0.2)", background: "none", border: "none", cursor: pin ? "pointer" : "not-allowed", fontFamily: "inherit", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em" }}>
          <Check size={16} /> Salvar
        </button>
      </div>

      {/* Busca por município, estado ou endereço (Nominatim/OSM) */}
      <div style={{ position: "absolute", top: HEADER_H, left: 0, right: 0, height: SEARCH_H, padding: "6px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#0A0A0A", zIndex: 11 }}>
        <div style={{ position: "relative", height: "100%" }}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar município, estado ou endereço..."
            style={{ width: "100%", height: "100%", padding: "0 12px 0 36px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#F5F5F5", fontFamily: "inherit", fontSize: 12, outline: "none" }}
          />
          <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)", fontSize: 14 }}>🔍</div>
          {searching && <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#E0FF22", fontSize: 10, fontWeight: 700 }}>...</div>}
          {searchResults.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "#0A0A0A", border: "1px solid rgba(224,255,34,0.3)", borderRadius: 8, maxHeight: 240, overflowY: "auto", zIndex: 100 }}>
              {searchResults.map((r, i) => (
                <button key={i} onClick={() => handleSelectResult(r)}
                  style={{ display: "block", width: "100%", padding: "10px 12px", textAlign: "left", background: "none", border: "none", borderBottom: i < searchResults.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none", color: "rgba(255,255,255,0.85)", fontFamily: "inherit", fontSize: 11, cursor: "pointer", lineHeight: 1.4 }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(224,255,34,0.08)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                  <span style={{ display: "block", color: "#E0FF22", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>{r.type || "Local"}</span>
                  {r.display_name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Instrução */}
      <div style={{ position: "absolute", top: HEADER_H + SEARCH_H, left: 0, right: 0, height: HINT_H, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(224,255,34,0.07)", borderBottom: "1px solid rgba(224,255,34,0.15)" }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "#E0FF22", margin: 0 }}>
          {pin
            ? "🏠 Sede marcada · Toque para mover ou salve"
            : locFound ? "GPS encontrado · Toque no mapa para marcar a sede" : "Toque no mapa para marcar a sede da fazenda"}
        </p>
      </div>

      {/* Mapa — zIndex:0 contém os z-indexes internos do Leaflet (tiles/markers/popups)
          para que o dropdown de busca fique por cima */}
      <div ref={containerRef} style={{ position: "absolute", top: MAP_TOP, left: 0, right: 0, bottom: MAP_BTM, zIndex: 0 }} />

      {/* Controles */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: CTRL_H, display: "flex", gap: 8, padding: "8px 16px", borderTop: "1px solid rgba(255,255,255,0.1)", background: "#0A0A0A" }}>
        {[
          { label: locating ? "⏳ Buscando..." : locFound ? "📍 GPS Ativo" : "📍 Localização", action: handleLocate },
          { label: "✕ Limpar", action: () => setPin(null), disabled: !pin },
        ].map((btn, i) => (
          <button key={i} onClick={btn.action} disabled={btn.disabled}
            style={{ flex: 1, border: "1px solid rgba(255,255,255,0.2)", background: "none", color: "rgba(255,255,255,0.6)", fontFamily: "inherit", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", cursor: btn.disabled ? "not-allowed" : "pointer", opacity: btn.disabled ? 0.3 : 1, borderRadius: 0 }}>
            {btn.label}
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
};

// ─── Editor de área em tela cheia ───
const MapDrawer = ({ name, initialPoints, onSave, onClose }: {
  name: string; initialPoints: [number, number][]; onSave: (pts: [number, number][]) => void; onClose: () => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polygonRef = useRef<L.Polygon | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const locDotRef = useRef<L.CircleMarker | null>(null);
  // initialPoints estabilizado em ref para não re-disparar efeitos
  const initRef = useRef<[number, number][]>(initialPoints?.length > 0 ? initialPoints : []);
  const [points, setPoints] = useState<[number, number][]>(initRef.current);
  const [locating, setLocating] = useState(false);
  const [locFound, setLocFound] = useState(false);
  // Busca por município/estado/endereço (Nominatim/OpenStreetMap)
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ display_name: string; lat: string; lon: string; type?: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const searchAbortRef = useRef<AbortController | null>(null);
  useEscapeKey(onClose);
  useBodyScrollLock();

  // ── Bug 1 fix: inicializa o mapa e registra click SEM chamar setPoints dentro de updater ──
  useEffect(() => {
    if (!containerRef.current) return;
    const init = initRef.current;
    const center: [number, number] = init.length > 0
      ? [init.reduce((s, p) => s + p[0], 0) / init.length, init.reduce((s, p) => s + p[1], 0) / init.length]
      : [-15.77972, -47.92972];

    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: false })
      .setView(center, init.length > 0 ? 14 : 5);
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19 }).addTo(map);

    // Click handler simples — só atualiza estado, sem chamar redraw dentro do updater
    map.on("click", (e: L.LeafletMouseEvent) => {
      setPoints(prev => [...prev, [e.latlng.lat, e.latlng.lng] as [number, number]]);
    });

    mapRef.current = map;

    // Duplo rAF: garante que o Leaflet só mede o container depois do paint real
    requestAnimationFrame(() => requestAnimationFrame(() => map.invalidateSize()));

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // ── Bug 1 fix: redraw fica num useEffect separado que reage a mudanças de `points` ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    if (polygonRef.current) { polygonRef.current.remove(); polygonRef.current = null; }
    points.forEach(p => {
      markersRef.current.push(
        L.circleMarker(p, { radius: 6, color: "#E0FF22", fillColor: "#E0FF22", fillOpacity: 1, weight: 0 }).addTo(map)
      );
    });
    if (points.length > 2) {
      polygonRef.current = L.polygon(points, { color: "#E0FF22", weight: 2, fillOpacity: 0.15 }).addTo(map);
    }
  }, [points]);

  // área derivada diretamente do estado — sem state separado para area
  const area = calcAreaHa(points);

  const handleUndo = () => setPoints(prev => prev.slice(0, -1));
  const handleClear = () => setPoints([]);
  const handleLocate = () => {
    setLocating(true);
    setLocFound(false);
    const map = mapRef.current;
    if (!map) return;
    map.locate({ setView: true, maxZoom: 16 });
    map.once("locationfound", (e: L.LocationEvent) => {
      // Remove dot anterior
      if (locDotRef.current) { locDotRef.current.remove(); locDotRef.current = null; }
      // Ponto azul de GPS — não é vértice do polígono, apenas indicador visual
      const dot = L.circleMarker(e.latlng, {
        radius: 10, color: "#3B82F6", fillColor: "#3B82F6", fillOpacity: 0.35, weight: 3,
      }).addTo(map);
      dot.bindTooltip("📍 Sua localização", { permanent: false });
      locDotRef.current = dot;
      setLocating(false);
      setLocFound(true);
    });
    map.once("locationerror", () => { setLocating(false); setLocFound(false); });
  };

  // Busca de localização via Nominatim (OSM) — município, estado, endereço
  const handleSearch = async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 3) { setSearchResults([]); return; }
    searchAbortRef.current?.abort();
    const ctrl = new AbortController();
    searchAbortRef.current = ctrl;
    setSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=br&accept-language=pt-BR&q=${encodeURIComponent(trimmed)}`;
      const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("erro busca");
      const data = await res.json() as { display_name: string; lat: string; lon: string; type?: string }[];
      setSearchResults(data);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectResult = (r: { lat: string; lon: string }) => {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    if (Number.isFinite(lat) && Number.isFinite(lng) && mapRef.current) {
      mapRef.current.setView([lat, lng], 13);
    }
    setSearchResults([]);
    setSearchQuery("");
  };

  // Debounce da busca
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(() => { handleSearch(searchQuery); }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Aborta fetch pendente ao desmontar
  useEffect(() => {
    return () => { searchAbortRef.current?.abort(); };
  }, []);

  // Alturas fixas do header (56px) + busca (44px) + instrução (32px) + controles (56px)
  // O mapa ocupa o restante. Layout absoluto é mais confiável que flex no portal.
  const HEADER_H = 56;
  const SEARCH_H = 44;
  const HINT_H   = 32;
  const CTRL_H   = 56;
  const MAP_TOP  = HEADER_H + SEARCH_H + HINT_H;
  const MAP_BTM  = CTRL_H;

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#0A0A0A", fontFamily: "var(--font-sans)" }}>

      {/* Header */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: HEADER_H, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", borderBottom: "1px solid rgba(255,255,255,0.1)", background: "#0A0A0A", zIndex: 10 }}>
        <button onClick={onClose} style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.6)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
          <X size={18} /><span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em" }}>Cancelar</span>
        </button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "#F5F5F5" }}>{name}</div>
          {area > 0 && <div style={{ fontSize: 9, fontWeight: 700, color: "#E0FF22" }}>~{area.toFixed(2)} ha (estimativa)</div>}
        </div>
        <button onClick={() => { onSave(points); onClose(); }} style={{ display: "flex", alignItems: "center", gap: 8, color: "#E0FF22", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em" }}>
          <Check size={16} /> Salvar
        </button>
      </div>

      {/* Busca por município, estado ou endereço (Nominatim/OSM) */}
      <div style={{ position: "absolute", top: HEADER_H, left: 0, right: 0, height: SEARCH_H, padding: "6px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#0A0A0A", zIndex: 11 }}>
        <div style={{ position: "relative", height: "100%" }}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar município, estado ou endereço..."
            style={{ width: "100%", height: "100%", padding: "0 12px 0 36px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#F5F5F5", fontFamily: "inherit", fontSize: 12, outline: "none" }}
          />
          <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)", fontSize: 14 }}>🔍</div>
          {searching && <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#E0FF22", fontSize: 10, fontWeight: 700 }}>...</div>}
          {searchResults.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "#0A0A0A", border: "1px solid rgba(224,255,34,0.3)", borderRadius: 8, maxHeight: 240, overflowY: "auto", zIndex: 100 }}>
              {searchResults.map((r, i) => (
                <button key={i} onClick={() => handleSelectResult(r)}
                  style={{ display: "block", width: "100%", padding: "10px 12px", textAlign: "left", background: "none", border: "none", borderBottom: i < searchResults.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none", color: "rgba(255,255,255,0.85)", fontFamily: "inherit", fontSize: 11, cursor: "pointer", lineHeight: 1.4 }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(224,255,34,0.08)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                  <span style={{ display: "block", color: "#E0FF22", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>{r.type || "Local"}</span>
                  {r.display_name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Instrução */}
      <div style={{ position: "absolute", top: HEADER_H + SEARCH_H, left: 0, right: 0, height: HINT_H, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(224,255,34,0.07)", borderBottom: "1px solid rgba(224,255,34,0.15)" }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "#E0FF22", margin: 0 }}>
          {points.length === 0
            ? locFound ? "GPS encontrado · Toque no mapa para marcar os vértices" : "Toque no mapa para marcar os vértices da área"
            : `${points.length} ponto${points.length > 1 ? "s" : ""} marcado${points.length > 1 ? "s" : ""}${area > 0 ? ` · ~${area.toFixed(1)} ha (est.)` : ""}`}
        </p>
      </div>

      {/* Container do Leaflet — posicionamento absoluto explícito.
          zIndex:0 cria um stacking context que CONTÉM os z-indexes internos
          do Leaflet (tiles=200, markers=600, popups=700) — assim o dropdown
          de busca (que vive no header com zIndex:11) fica por cima do mapa. */}
      <div ref={containerRef} style={{ position: "absolute", top: MAP_TOP, left: 0, right: 0, bottom: MAP_BTM, zIndex: 0 }} />

      {/* Controles */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: CTRL_H, display: "flex", gap: 8, padding: "8px 16px", borderTop: "1px solid rgba(255,255,255,0.1)", background: "#0A0A0A" }}>
        {[
          { label: locating ? "⏳ Buscando..." : locFound ? "📍 GPS Ativo" : "📍 Localização", action: handleLocate },
          { label: "↩ Desfazer", action: handleUndo, disabled: points.length === 0 },
          { label: "✕ Limpar", action: handleClear, disabled: points.length === 0 },
        ].map((btn, i) => (
          <button key={i} onClick={btn.action} disabled={btn.disabled}
            style={{ flex: 1, border: "1px solid rgba(255,255,255,0.2)", background: "none", color: "rgba(255,255,255,0.6)", fontFamily: "inherit", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", cursor: btn.disabled ? "not-allowed" : "pointer", opacity: btn.disabled ? 0.3 : 1, borderRadius: 0 }}>
            {btn.label}
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
};

// MapDrawerBtn — botão no formulário que abre o editor de mapa em tela cheia
const MapDrawerBtn = ({ points, onChange, name }: {
  points: [number, number][];
  onChange: (p: [number, number][]) => void;
  name: string;
}) => {
  const [open, setOpen] = useState(false);
  const hasPoly = points.length > 2;
  const area = hasPoly ? calcAreaHa(points) : 0;
  return (
    <>
      {open && (
        <MapDrawer
          name={name || "Lote"}
          initialPoints={points}
          onSave={(pts) => { onChange(pts); setOpen(false); }}
          onClose={() => setOpen(false)}
        />
      )}
      <div className="border border-white/15 p-4 flex items-center justify-between gap-4 cursor-pointer hover:border-accent transition-colors" onClick={() => setOpen(true)}>
        <div>
          {hasPoly ? (
            <>
              <div className="text-xs font-bold text-accent uppercase tracking-wide mb-0.5">{points.length} pontos marcados</div>
              <div className="text-[10px] text-white/50">~{area.toFixed(2)} ha (est.) · Clique para editar</div>
            </>
          ) : (
            <>
              <div className="text-xs font-bold text-text uppercase tracking-wide mb-0.5">Nenhuma área marcada</div>
              <div className="text-[10px] text-white/40">Clique para abrir o mapa e delimitar a área</div>
            </>
          )}
        </div>
        <div className={`shrink-0 flex items-center justify-center w-10 h-10 border ${hasPoly ? "border-accent text-accent" : "border-white/20 text-white/30"}`}>
          <MapPin size={18} />
        </div>
      </div>
    </>
  );
};

// Real QR code display
const QRDisplay = ({ value, size = 256 }: { value: string; size?: number }) => {
  const [url, setUrl] = useState("");
  useEffect(() => {
    QRCode.toDataURL(value, { width: size, margin: 2, color: { dark: "#111111", light: "#FFFFFF" } }).then(setUrl).catch(() => {});
  }, [value, size]);
  if (!url) return <div style={{ width: size, height: size }} className="bg-white/10 animate-pulse" />;
  return <img src={url} alt="QR Code" width={size} height={size} />;
};

const downloadQR = (value: string, name: string) => {
  QRCode.toDataURL(value, { width: 512, margin: 2 }).then(url => {
    const a = document.createElement("a"); a.href = url; a.download = `rastro-qr-${name}.png`; a.click();
  });
};

// ─────────────────────────────────────────────
// Screens
// ─────────────────────────────────────────────

// ─── Language Switcher ───
const LangSwitcher = () => {
  const { lang, setLang } = useContext(LangContext);
  const [open, setOpen] = useState(false);
  const opts: { code: Lang; label: string; flag: string }[] = [
    { code: "pt", label: "Português", flag: "🇧🇷" },
    { code: "en", label: "English", flag: "🇺🇸" },
    { code: "es", label: "Español", flag: "🇪🇸" },
    { code: "zh", label: "中文", flag: "🇨🇳" },
  ];
  const current = opts.find(o => o.code === lang)!;
  return (
    <div className="relative">
      <button onClick={() => setOpen(p => !p)} className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2 border border-white/20 hover:border-accent transition-colors text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">
        <Globe size={13} className="hidden md:inline" /><span>{current.flag} {current.code.toUpperCase()}</span><ChevronDown size={11} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className="absolute right-0 top-full mt-1 bg-bg border border-white/20 z-50 w-40 shadow-2xl">
            {opts.map(o => (
              <button key={o.code} onClick={() => { setLang(o.code); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors hover:bg-white/5 ${lang === o.code ? "text-accent" : "text-white/70"}`}>
                <span>{o.flag}</span><span>{o.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Demo farms for showcase when no real farms exist ───
// ── Farms Map (Landing Page) ────────────────────────────────────────────
const DEMO_FARM_COORDS = [
  { lat: -12.55, lng: -55.72, farmName: "Fazenda Santa Clara",        name: "Talhão Principal", crop: "Soja",          area: "450" },
  { lat: -18.94, lng: -46.99, farmName: "Cafeicultura Serra Verde",    name: "Lote Serra Verde",  crop: "Café",          area: "120" },
  { lat: -12.15, lng: -44.98, farmName: "Agropecuária Cerrado",        name: "Área Cerrado A",    crop: "Soja/Pecuária", area: "800" },
  { lat: -13.05, lng: -55.90, farmName: "Fazenda Horizonte Novo",      name: "Talhão Algodão",    crop: "Algodão",       area: "290" },
  { lat: -15.77, lng: -47.92, farmName: "Fazenda Centro-Oeste",        name: "Lote Norte",        crop: "Milho",         area: "320" },
];

type FarmPin = { lat: number; lng: number; farmName: string; name: string; crop: string; area: string };

const FarmsMapSection = ({ go, sectionRef }: { go: (s: number) => void; sectionRef: React.RefObject<HTMLDivElement | null> }) => {
  const { lots, user } = useContext(AppContext);
  const containerRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);

  const realPins: FarmPin[] = (user?.isPublic !== false ? lots : [])
    .filter(l => l.mapPoints && l.mapPoints.length >= 3)
    .map(l => ({
      lat: l.mapPoints.reduce((s, p) => s + p[0], 0) / l.mapPoints.length,
      lng: l.mapPoints.reduce((s, p) => s + p[1], 0) / l.mapPoints.length,
      farmName: user?.farmName || "Fazenda",
      name: l.name,
      crop: l.crop,
      area: l.area,
    }));

  const isDemo = realPins.length === 0;
  const pins = isDemo ? DEMO_FARM_COORDS : realPins;

  // Expose navigation callback to Leaflet popup buttons (plain HTML context)
  useEffect(() => {
    (window as any).__rastroOpenFarm = (_isRealFarm: boolean) => {
      go(5);
    };
    return () => { delete (window as any).__rastroOpenFarm; };
  }, [go]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; }

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: false,
    }).setView([-14, -52], 4);

    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19 }
    ).addTo(map);

    const icon = L.divIcon({
      html: `<div style="width:14px;height:14px;background:#E0FF22;border-radius:50%;border:2px solid rgba(0,0,0,0.5);box-shadow:0 0 0 4px rgba(224,255,34,0.25);cursor:pointer;"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
      className: "",
    });

    pins.forEach((p, _i) => {
      const real = !isDemo;
      const btnLabel = "Ver fazenda →";
      const btnBg    = "#E0FF22";
      const btnColor = "#111";

      L.marker([p.lat, p.lng], { icon })
        .bindPopup(
          `<div style="font-family:system-ui,sans-serif;min-width:180px;padding:2px 0">
            <p style="font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#888;margin:0 0 4px">${p.farmName}</p>
            <p style="font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:-.02em;color:#111;margin:0 0 10px;line-height:1.1">${p.name}</p>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
              <span style="font-size:8px;font-weight:700;text-transform:uppercase;padding:2px 7px;background:#f0f0f0;border-radius:20px;color:#444">${p.crop}</span>
              <span style="font-size:8px;font-weight:700;text-transform:uppercase;padding:2px 7px;background:#E0FF22;border-radius:20px;color:#111">~${p.area} ha</span>
            </div>
            <button
              onclick="window.__rastroOpenFarm(${real})"
              style="width:100%;padding:7px 12px;background:${btnBg};color:${btnColor};border:none;border-radius:20px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;cursor:pointer;"
            >${btnLabel}</button>
          </div>`,
          { className: "rastro-map-popup" }
        )
        .addTo(map);
    });

    if (pins.length > 1) {
      try {
        const bounds = L.latLngBounds(pins.map(p => [p.lat, p.lng] as [number, number]));
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 7 });
      } catch { /* keep default view */ }
    }

    leafletMap.current = map;
    return () => { map.remove(); leafletMap.current = null; };
  }, []); // eslint-disable-line

  return (
    <section ref={sectionRef} id="map" className="py-20 px-5 md:px-12 lg:px-20 border-b border-white/10">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="mb-8">
          <span className="text-[9px] font-bold uppercase tracking-widest text-accent mb-3 block">Mapa Global · Global Map</span>
          <h2 className="text-3xl md:text-5xl font-extrabold uppercase tracking-tight text-text mb-3">Fazendas Rastreadas</h2>
          <p className="text-sm text-text/50 max-w-lg">
            Propriedades com rastreabilidade certificada, verificadas por EUDR, PRODES/INPE e registro digital.
          </p>
        </motion.div>

        {/* Stats strip */}
        <div className="flex gap-6 mb-8 flex-wrap">
          {[
            { n: isDemo ? "500+" : String(realPins.length), l: "Talhões Mapeados", accent: false },
            { n: "QR™",                                       l: "Rastreio por lote", accent: true  },
            { n: "40+",                                       l: "Países Destino",  accent: false },
          ].map((s, i) => (
            <React.Fragment key={i}>
              {i > 0 && <div className="w-px bg-text/10 self-stretch" />}
              <div>
                <div className={`text-2xl font-black leading-none ${s.accent ? "text-accent" : "text-text"}`}>{s.n}</div>
                <div className={`text-[8px] font-bold uppercase tracking-widest mt-1 ${s.accent ? "text-accent/50" : "text-text/40"}`}>{s.l}</div>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Map */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="relative rounded-2xl overflow-hidden border border-white/10"
          style={{ height: 420, isolation: "isolate" }}
        >
          <div ref={containerRef} className="w-full h-full" />

          {/* Demo badge */}
          {isDemo && (
            <div className="absolute top-4 right-4 z-[500]">
              <span className="px-3 py-1.5 bg-bg/85 backdrop-blur-sm border border-accent/30 rounded-full text-[8px] font-bold uppercase tracking-widest text-accent">
                Dados demo · Cadastre para ver sua fazenda
              </span>
            </div>
          )}

          {/* CTA buttons */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-3">
            <button
              onClick={() => go(16)}
              className="px-5 py-2.5 bg-accent text-bg text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-accent/90 transition-colors flex items-center gap-2 shadow-lg"
            >
              <Globe size={12} /> Explorar por bioma
            </button>
            {!user && (
              <button onClick={() => go(1)}
                className="px-4 py-2.5 bg-bg/80 backdrop-blur-sm border border-white/20 text-text text-[10px] font-bold uppercase tracking-widest rounded-full hover:border-accent transition-colors shadow-lg">
                + Cadastrar fazenda
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// Gera polígono aproximado em torno de um ponto (determinístico, baseado em lat/lng)
function genApproxPoly(lat: number, lng: number, areaHa: number): [number, number][] {
  const r = Math.sqrt(Math.max(areaHa, 50) * 10000) / 111000; // raio em graus
  const pts = 7;
  const cosLat = Math.cos(lat * Math.PI / 180);
  return Array.from({ length: pts }, (_, i) => {
    const angle = (i / pts) * 2 * Math.PI;
    // jitter determinístico baseado no índice e coordenadas (sem Math.random)
    const jitter = 0.65 + 0.35 * Math.abs(Math.sin((lat + lng) * (i + 1) * 0.7));
    return [lat + r * jitter * Math.cos(angle), lng + r * jitter * Math.sin(angle) / cosLat] as [number, number];
  });
}

const DEMO_FARMS = [
  { farmName: "Fazenda Santa Clara", name: "João Carlos Ferreira", location: "Sorriso, MT", description: "Três gerações cultivando soja e milho com práticas sustentáveis e certificação EUDR.", products: ["Soja", "Milho"], certs: ["EUDR Conforme", "Orgânico"], lots: 4, area: 1240 },
  { farmName: "Cafeicultura Serra Verde", name: "Ana Lima", location: "Patrocínio, MG", description: "Café especial arábica cultivado em altitude com rastreabilidade total do grão à xícara.", products: ["Café"], certs: ["EUDR Conforme", "Rainforest Alliance"], lots: 2, area: 380 },
  { farmName: "Agropecuária Cerrado", name: "Roberto Alves", location: "Barreiras, BA", description: "Pecuária extensiva e soja com mapeamento completo e verificação PRODES/INPE.", products: ["Pecuária", "Soja"], certs: ["EUDR Conforme"], lots: 6, area: 3200 },
  { farmName: "Fazenda Horizonte Novo", name: "Marcos Souza", location: "Lucas do Rio Verde, MT", description: "Produção de algodão e cana com tecnologia de precisão e rastreabilidade digital.", products: ["Algodão", "Cana"], certs: ["EUDR Conforme", "RTRS"], lots: 3, area: 870 },
];

// ─── Vitrine de Fazendas ─────────────────────────────────────────────────────

const BIOME_CONFIG: Record<string, { label: string; color: string; center: [number, number]; zoom: number; emoji: string }> = {
  "amazônia":        { label: "Amazônia",       color: "#22c55e", center: [-5.0, -60.0],  zoom: 5, emoji: "🌿" },
  "cerrado":         { label: "Cerrado",         color: "#eab308", center: [-14.0, -47.0], zoom: 5, emoji: "🌾" },
  "mata atlântica":  { label: "Mata Atlântica",  color: "#3b82f6", center: [-22.0, -44.0], zoom: 5, emoji: "🌳" },
  "caatinga":        { label: "Caatinga",        color: "#f97316", center: [-10.0, -38.0], zoom: 6, emoji: "🌵" },
  "pampa":           { label: "Pampa",           color: "#a855f7", center: [-30.0, -53.0], zoom: 6, emoji: "🐄" },
  "pantanal":        { label: "Pantanal",        color: "#06b6d4", center: [-17.0, -57.0], zoom: 6, emoji: "🦜" },
};

type VitrineEntry = {
  id?: string; // ID do banco (apenas para isReal=true)
  farmName: string; name: string; location: string; biome: string;
  lat: number; lng: number; products: string[]; certs: string[];
  lots: number; area: number; description: string; logo?: string; cover?: string; isReal?: boolean;
  // Modo do perfil — direciona apresentação. Default commodity para fazendas legadas.
  profileMode?: "commodity" | "produto";
};

const VITRINE_DEMO: VitrineEntry[] = [
  { farmName: "Fazenda Santa Clara",      name: "João Carlos Ferreira", location: "Sorriso, MT",           biome: "cerrado",        lat: -12.55, lng: -55.72, products: ["Soja", "Milho"],     certs: ["EUDR ✓", "Orgânico"],             lots: 4, area: 1240, description: "Três gerações cultivando soja e milho com práticas sustentáveis e certificação EUDR." },
  { farmName: "Cafeicultura Serra Verde",  name: "Ana Lima",             location: "Patrocínio, MG",        biome: "cerrado",        lat: -18.94, lng: -46.99, products: ["Café"],             certs: ["EUDR ✓", "Rainforest Alliance"],   lots: 2, area: 380,  description: "Café especial arábica cultivado em altitude com rastreabilidade total do grão à xícara.", profileMode: "produto" },
  { farmName: "Agropecuária Cerrado",     name: "Roberto Alves",        location: "Barreiras, BA",         biome: "cerrado",        lat: -12.15, lng: -44.98, products: ["Pecuária", "Soja"], certs: ["EUDR ✓"],                          lots: 6, area: 3200, description: "Pecuária extensiva e soja com mapeamento completo e verificação PRODES/INPE." },
  { farmName: "Fazenda Horizonte Novo",   name: "Marcos Souza",         location: "Lucas do Rio Verde, MT",biome: "cerrado",        lat: -13.05, lng: -55.90, products: ["Algodão", "Cana"],  certs: ["EUDR ✓", "RTRS"],                  lots: 3, area: 870,  description: "Produção de algodão e cana com tecnologia de precisão e rastreabilidade digital." },
  { farmName: "Fazenda Amazônica Verde",  name: "Pedro Santos",         location: "Santarém, PA",          biome: "amazônia",       lat: -2.44,  lng: -54.70, products: ["Cacau", "Açaí"],   certs: ["EUDR ✓", "Orgânico"],              lots: 5, area: 950,  description: "Cacau e açaí nativos com manejo sustentável da floresta e certificação orgânica." },
  { farmName: "Fazenda Rio Negro",        name: "Joana Tapajós",        location: "Manaus, AM",            biome: "amazônia",       lat: -3.13,  lng: -60.02, products: ["Castanha", "Açaí"], certs: ["EUDR ✓"],                          lots: 3, area: 1800, description: "Extrativismo sustentável com castanha-do-pará e açaí preservando o ecossistema amazônico." },
  { farmName: "Sítio Caatinga Forte",    name: "Maria Oliveira",        location: "Petrolina, PE",         biome: "caatinga",       lat: -9.38,  lng: -40.50, products: ["Manga", "Uva"],    certs: ["EUDR ✓"],                          lots: 2, area: 180,  description: "Fruticultura irrigada no Vale do São Francisco com exportação certificada para a Europa." },
  { farmName: "Estância Pampa Real",     name: "Carlos Gaúcho",         location: "Bagé, RS",              biome: "pampa",          lat: -31.33, lng: -54.10, products: ["Pecuária", "Arroz"], certs: ["EUDR ✓"],                        lots: 4, area: 2100, description: "Pecuária extensiva do Pampa gaúcho com rastreabilidade individual brinco a prato." },
  { farmName: "Fazenda Pantanal Vivo",   name: "Ana Beatriz Costa",     location: "Corumbá, MS",           biome: "pantanal",       lat: -18.99, lng: -57.65, products: ["Pecuária"],        certs: ["EUDR ✓"],                          lots: 3, area: 5400, description: "Pecuária pantaneira com práticas de conservação do maior wetland tropical do mundo." },
  { farmName: "Fazenda Mata Verde",      name: "Lucas Morais",           location: "Ilhéus, BA",            biome: "mata atlântica", lat: -14.79, lng: -39.04, products: ["Cacau", "Café"],   certs: ["EUDR ✓", "Rainforest Alliance"],   lots: 2, area: 420,  description: "Cacau e café à sombra da Mata Atlântica baiana com certificação internacional.", profileMode: "produto" },
  { farmName: "Sítio Serra Gaúcha",      name: "Pietro Bortolini",      location: "Bento Gonçalves, RS",   biome: "mata atlântica", lat: -29.17, lng: -51.52, products: ["Uva", "Vinho"],    certs: ["EUDR ✓"],                          lots: 2, area: 65,   description: "Viticultura de altitude na Serra Gaúcha produzindo uvas finas para vinhos premiados.", profileMode: "produto" },
  { farmName: "Fazenda Cerrado Norte",   name: "Renata Melo",            location: "Brasília, DF",          biome: "cerrado",        lat: -15.77, lng: -47.92, products: ["Milho", "Soja"],   certs: ["EUDR ✓"],                          lots: 5, area: 320,  description: "Grãos no coração do Cerrado com tecnologia de precisão e rastreabilidade completa." },
];

const SVitrine = ({ go }: { go: (s: number) => void }) => {
  const navigate = useNavigate();
  const { user, sendProposal, addToast, setViewingFarmId } = useContext(AppContext);
  useSEO({
    title: "Vitrine — Fazendas brasileiras rastreadas",
    description: "Explore fazendas com rastreabilidade certificada por bioma, cultura e região. EUDR, PRODES/INPE e registro digital. Conexão direta com produtores.",
    path: "/vitrine",
  });
  const isComprador = user?.role && user.role !== "produtor";
  const [proposalTarget, setProposalTarget] = useState<VitrineEntry | null>(null);
  const [propForm, setPropForm] = useState({ message: "", volume: "", products: [] as string[] });
  const [selectedBiome, setSelectedBiome] = useState<string | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);
  const [locationSearch, setLocationSearch] = useState("");
  // Filtro por tipo de fazenda — null = todas; "commodity" = soja/milho/café verde/gado;
  // "produto" = vinícolas, azeite, café torrado, queijo. Inicializa via ?tipo= na URL.
  const [selectedMode, setSelectedMode] = useState<"commodity" | "produto" | null>(() => {
    if (typeof window === "undefined") return null;
    const q = new URLSearchParams(window.location.search).get("tipo");
    return q === "commodity" || q === "produto" ? q : null;
  });
  const [showLabels, setShowLabels] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapSectionRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polyLayerRef = useRef<L.Polygon | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);
  const suppressClickRef = useRef(false);
  const [activeEntry, setActiveEntry] = useState<VitrineEntry | null>(null);
  const [showMap, setShowMap] = useState(true);

  const selectEntry = (entry: VitrineEntry | null) => {
    suppressClickRef.current = true;
    setTimeout(() => { suppressClickRef.current = false; }, 600);
    setActiveEntry(prev => (prev?.farmName === entry?.farmName ? null : entry));
    if (entry && showMap) mapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Stable memoized entries — only produtores appear in the vitrine
  const realEntry = useMemo<VitrineEntry | null>(() => {
    if (!user || user.isPublic === false) return null;
    if (user.role && user.role !== "produtor") return null;
    return {
      farmName: user.farmName || "Minha Fazenda",
      name: user.name || "",
      location: user.location || "Brasil",
      biome: (user.biome || "cerrado").toLowerCase(),
      lat: user.farmPin?.[0] ?? -15.77,
      lng: user.farmPin?.[1] ?? -47.92,
      products: user.products || [],
      certs: user.certs || [],
      lots: 0, area: 0,
      description: user.description || "Produtor rural com rastreabilidade certificada.",
      logo: user.logo,
      isReal: true,
      profileMode: user.profileMode ?? "commodity",
    };
  }, [user]);

  // Busca fazendas reais cadastradas no backend (lista pública)
  const [backendFarms, setBackendFarms] = useState<VitrineEntry[]>([]);
  useEffect(() => {
    if (!API_ENABLED) return;
    let alive = true;
    api.farms.list().then(list => {
      if (!alive) return;
      // Coords padrão por bioma (centro aproximado) — usadas até termos lat/lng no schema
      const BIOME_DEFAULT_COORDS: Record<string, [number, number]> = {
        "cerrado":         [-15.77, -47.92],
        "amazônia":        [-3.13,  -60.02],
        "mata atlântica":  [-22.91, -43.20],
        "caatinga":        [-9.38,  -40.50],
        "pampa":           [-31.33, -54.10],
        "pantanal":        [-18.99, -57.65],
      };
      const entries: VitrineEntry[] = list.map(f => {
        // jitter determinístico pra fazendas no mesmo bioma não ficarem empilhadas
        const seed = (f.id ?? f.farmName).split("").reduce((s, c) => s + c.charCodeAt(0), 0);
        const dLat = ((seed * 13) % 100) / 100 - 0.5;  // ±0.5°
        const dLng = ((seed * 17) % 100) / 100 - 0.5;
        const biome = "cerrado"; // schema ainda não tem biome — default
        const [bLat, bLng] = BIOME_DEFAULT_COORDS[biome];
        return {
          id: f.id,
          farmName: f.farmName,
          name: f.name ?? "",
          location: f.location ?? "Brasil",
          biome,
          lat: bLat + dLat,
          lng: bLng + dLng,
          products: (f.products ?? []).map(p => p.name),
          certs: (f.certs ?? []).map(c => c.name),
          lots: 0,
          area: f.area ?? 0,
          description: f.description ?? "Produtor rural cadastrado no Quem Produz.",
          logo: f.logoUrl,
          cover: f.coverUrl,
          isReal: true,
          profileMode: f.profileMode ?? "commodity",
        };
      });
      setBackendFarms(entries);
    }).catch(() => { /* silencioso */ });
    return () => { alive = false; };
  }, []);

  const allEntries = useMemo(() => {
    // Evita duplicar a fazenda do user logado (que já está em realEntry)
    const myName = (user?.farmName || "").toLowerCase().trim();
    const others = backendFarms.filter(f => f.farmName.toLowerCase().trim() !== myName);
    return [...(realEntry ? [realEntry] : []), ...others, ...VITRINE_DEMO];
  }, [realEntry, backendFarms, user]);
  const allCrops = useMemo(() => Array.from(new Set(allEntries.flatMap(e => e.products))), [allEntries]);

  const filtered = useMemo(() => {
    const q = locationSearch.trim().toLowerCase();
    return allEntries.filter(e => {
      // Modo do perfil: default commodity para entradas sem modo declarado
      const mode = e.profileMode ?? "commodity";
      if (selectedMode && mode !== selectedMode) return false;
      if (selectedBiome && e.biome !== selectedBiome) return false;
      if (selectedCrop && !e.products.includes(selectedCrop)) return false;
      if (q && !e.location.toLowerCase().includes(q) && !e.farmName.toLowerCase().includes(q) && !(BIOME_CONFIG[e.biome]?.label.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [allEntries, selectedMode, selectedBiome, selectedCrop, locationSearch]);

  // Init map only when showMap=true (lazy)
  useEffect(() => {
    if (!showMap || !mapRef.current || leafletRef.current) return;
    const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false, scrollWheelZoom: true }).setView([-14, -52], 4);
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19 }).addTo(map);
    // Labels overlay
    const labels = L.tileLayer("https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, opacity: 0.9 });
    labels.addTo(map);
    labelsLayerRef.current = labels;
    map.on("click", () => { if (!suppressClickRef.current) setActiveEntry(null); });
    leafletRef.current = map;
    return () => { map.remove(); leafletRef.current = null; labelsLayerRef.current = null; markersRef.current = []; };
  }, [showMap]);

  // Toggle labels layer
  useEffect(() => {
    const map = leafletRef.current;
    if (!map) return;
    if (showLabels) {
      if (!labelsLayerRef.current) {
        labelsLayerRef.current = L.tileLayer("https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, opacity: 0.9 }).addTo(map);
      } else {
        labelsLayerRef.current.addTo(map);
      }
    } else {
      labelsLayerRef.current?.remove();
    }
  }, [showLabels]);

  // Global popup bridge
  useEffect(() => {
    (window as any).__rastroVitrineOpen = (isReal: boolean) => { if (isReal) go(5); };
    return () => { delete (window as any).__rastroVitrineOpen; };
  }, [go]);

  // Atualiza polígono da propriedade selecionada
  useEffect(() => {
    const map = leafletRef.current;
    if (!map) return;
    if (polyLayerRef.current) { polyLayerRef.current.remove(); polyLayerRef.current = null; }
    if (!activeEntry) return;
    const cfg = BIOME_CONFIG[activeEntry.biome] || BIOME_CONFIG["cerrado"];
    const poly = genApproxPoly(activeEntry.lat, activeEntry.lng, activeEntry.area || 400);
    const layer = L.polygon(poly, { color: cfg.color, weight: 2, fillColor: cfg.color, fillOpacity: 0.18, dashArray: "6 4" }).addTo(map);
    polyLayerRef.current = layer;
    try { map.fitBounds(layer.getBounds(), { padding: [40, 40], maxZoom: 13, animate: false }); } catch {}
  }, [activeEntry]);

  // Update markers when filter changes (stable because filtered is memoized)
  useEffect(() => {
    const map = leafletRef.current;
    if (!map) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    filtered.forEach(entry => {
      const cfg = BIOME_CONFIG[entry.biome] || BIOME_CONFIG["cerrado"];
      const label = entry.farmName.length > 12 ? entry.farmName.slice(0, 12) + "…" : entry.farmName;
      const icon = L.divIcon({
        html: `<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;filter:drop-shadow(0 3px 8px rgba(0,0,0,0.7))">
          <div style="background:#0A0A0A;border:1.5px solid ${cfg.color};padding:4px 8px;font-family:system-ui;font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:.06em;color:${cfg.color};white-space:nowrap;line-height:1.2">${label}</div>
          <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid ${cfg.color}"></div>
        </div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
        className: "",
      });
      const marker = L.marker([entry.lat, entry.lng], { icon }).addTo(map);
      marker.on("click", (e: L.LeafletMouseEvent) => {
        e.originalEvent?.stopPropagation();
        suppressClickRef.current = true;
        setTimeout(() => { suppressClickRef.current = false; }, 600);
        setActiveEntry(prev => prev?.farmName === entry.farmName ? null : entry);
      });
      marker.on("mouseover", () => { marker.getElement()!.style.zIndex = "1000"; });
      marker.on("mouseout", () => { marker.getElement()!.style.zIndex = ""; });
      markersRef.current.push(marker);
    });

    if (filtered.length > 1) {
      try { map.fitBounds(L.latLngBounds(filtered.map(e => [e.lat, e.lng] as [number, number])), { padding: [60, 60], maxZoom: 8 }); } catch {}
    } else if (filtered.length === 1) {
      map.setView([filtered[0].lat, filtered[0].lng], 9);
    }
  }, [filtered]);

  // Clear active entry when filters change (but NOT when clicking a row)
  useEffect(() => {
    setActiveEntry(null);
  }, [selectedBiome, selectedCrop, locationSearch]);

  // Pan/zoom to biome on selection
  useEffect(() => {
    if (!leafletRef.current || !selectedBiome) return;
    const cfg = BIOME_CONFIG[selectedBiome];
    if (cfg) leafletRef.current.flyTo(cfg.center, cfg.zoom, { duration: 1.2 });
  }, [selectedBiome]);

  const hasFilters = !!(selectedMode || selectedBiome || selectedCrop || locationSearch.trim());

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-bg">

      {/* ── Hero ── */}
      <div className="max-w-6xl mx-auto px-5 md:px-8 pt-6 pb-4">
        <button onClick={() => go(0)} className="flex items-center gap-1.5 text-text/40 hover:text-text transition-colors mb-6">
          <ChevronLeft size={14} />
          <span className="text-xs font-medium">Voltar</span>
        </button>

        <div className="flex items-end justify-between gap-4 mb-1">
          <h1 className="text-[22px] md:text-[28px] font-semibold tracking-tight text-text leading-snug">
            {selectedMode === "produto"
              ? "Fazendas com produto pronto"
              : selectedMode === "commodity"
                ? "Fazendas commodity"
                : "Fazendas com rastreabilidade"}
          </h1>
        </div>
        <p className="text-sm text-text/55 mt-1.5">
          {selectedMode === "produto"
            ? "Vinícolas, azeitarias, café torrado, queijos — para distribuidores e mercado premium"
            : selectedMode === "commodity"
              ? "Soja, milho, café verde, gado — para traders e exportadores com conformidade EUDR"
              : `${filtered.length} ${filtered.length === 1 ? "fazenda" : "fazendas"} · EUDR e registro digital verificado`}
        </p>

        {/* Tabs por tipo — escolha o que você procura */}
        <div className="mt-5 inline-flex items-center gap-1 p-1 rounded-full bg-white/5 border border-white/10">
          {([
            { key: null,         label: "Todas" },
            { key: "commodity",  label: "Commodity" },
            { key: "produto",    label: "Produto final" },
          ] as const).map(opt => {
            const active = selectedMode === opt.key;
            return (
              <button
                key={String(opt.key)}
                onClick={() => setSelectedMode(opt.key)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${active ? "bg-accent text-bg shadow-sm" : "text-text/60 hover:text-text"}`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Barra sticky: busca + filtros ── */}
      <div className="sticky top-0 z-40 bg-bg/95 backdrop-blur-xl border-b border-white/8">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-3 flex flex-col gap-3">
          {/* Linha 1: busca + toggle mapa */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 focus-within:border-accent/40 transition-colors">
              <Search size={14} className="text-text/40 shrink-0" />
              <input
                type="text"
                value={locationSearch}
                onChange={e => setLocationSearch(e.target.value)}
                placeholder="Buscar por fazenda, cidade ou região…"
                className="flex-1 bg-transparent text-sm text-text placeholder:text-text/35 outline-none"
              />
              {locationSearch && <button onClick={() => setLocationSearch("")} className="text-text/40 hover:text-text"><X size={14} /></button>}
            </div>
            <button
              onClick={() => setShowMap(v => !v)}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-full border text-xs font-semibold transition-all ${showMap ? "bg-accent text-bg border-accent" : "border-white/15 text-text/70 hover:border-white/30"}`}
            >
              <MapPin size={13} />
              <span className="hidden sm:inline">{showMap ? "Ocultar mapa" : "Ver mapa"}</span>
            </button>
          </div>

          {/* Linha 2: chips de bioma + cultura (scroll horizontal) */}
          <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-0.5" style={{ scrollbarWidth: "none" }}>
            {Object.entries(BIOME_CONFIG).map(([key, cfg]) => {
              const active = selectedBiome === key;
              return (
                <button key={key} onClick={() => setSelectedBiome(active ? null : key)}
                  style={active ? { background: cfg.color, borderColor: cfg.color, color: "#0A0A0A" } : {}}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap transition-all shrink-0 ${active ? "" : "border-white/12 text-text/60 hover:border-white/25 hover:text-text"}`}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: active ? "#0A0A0A" : cfg.color }} />
                  {cfg.label}
                </button>
              );
            })}
            <span className="w-px bg-white/10 mx-1 shrink-0" />
            {allCrops.map(c => {
              const active = selectedCrop === c;
              return (
                <button key={c} onClick={() => setSelectedCrop(active ? null : c)}
                  className={`px-3.5 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap transition-all shrink-0 ${active ? "bg-accent text-bg border-accent" : "border-white/12 text-text/60 hover:border-white/25 hover:text-text"}`}>
                  {c}
                </button>
              );
            })}
            {hasFilters && (
              <button onClick={() => { setSelectedMode(null); setSelectedBiome(null); setSelectedCrop(null); setLocationSearch(""); }}
                className="shrink-0 px-3.5 py-1.5 text-xs font-semibold text-accent hover:text-accent/80 transition-colors underline underline-offset-4">
                Limpar tudo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Mapa (colapsável) ── */}
      {showMap && (
        <div ref={mapSectionRef} className="relative mx-0" style={{ height: 320, isolation: "isolate" }}>
          <div ref={mapRef} className="w-full h-full" />

          {/* Popup fazenda selecionada (Airbnb-style mini-card) */}
          {activeEntry && (() => {
            const cfg = BIOME_CONFIG[activeEntry.biome] || BIOME_CONFIG["cerrado"];
            return (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[500] w-[min(420px,calc(100%-2rem))]">
                <div className="rounded-2xl bg-bg/95 backdrop-blur-xl border border-white/15 shadow-2xl overflow-hidden">
                  <div className="flex items-stretch gap-3 p-3">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/5 border border-white/10 shrink-0">
                      {activeEntry.cover || activeEntry.logo
                        ? <img src={activeEntry.cover || activeEntry.logo} className="w-full h-full object-cover" alt="" />
                        : <div className="w-full h-full flex items-center justify-center text-text/40 font-bold">{activeEntry.farmName.slice(0, 2).toUpperCase()}</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span style={{ background: cfg.color }} className="w-1.5 h-1.5 rounded-full" />
                        <span className="text-[10px] font-semibold text-text/50">{cfg.label}</span>
                      </div>
                      <p className="text-sm font-semibold text-text leading-tight truncate">{activeEntry.farmName}</p>
                      <p className="text-xs text-text/50 mt-0.5 truncate">
                        {activeEntry.location}{activeEntry.area > 0 ? ` · ${activeEntry.area.toLocaleString("pt-BR")} ha` : ""}
                      </p>
                    </div>
                    <button onClick={() => setActiveEntry(null)} className="self-start text-text/40 hover:text-text"><X size={16} /></button>
                  </div>
                  {activeEntry.isReal && (
                    <button onClick={() => {
                      setViewingFarmId(activeEntry.id ?? null);
                      if (activeEntry.id) navigate(`/fazenda/${encodeURIComponent(activeEntry.id)}`);
                      else go(5);
                    }}
                      className="w-full py-2.5 bg-accent text-bg text-xs font-semibold hover:bg-accent/90 transition-colors">
                      Ver perfil completo →
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Grid de cards Airbnb-style ── */}
      <div className="max-w-6xl mx-auto px-5 md:px-8 pt-6 pb-20">
        {filtered.length === 0 ? (
          <div className="py-24 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
              <Search size={20} className="text-text/30" />
            </div>
            <p className="text-base font-semibold text-text/70 mb-2">Nenhuma fazenda encontrada</p>
            <p className="text-sm text-text/40 mb-5">Tente ajustar os filtros ou buscar por outra região.</p>
            <button onClick={() => { setSelectedMode(null); setSelectedBiome(null); setSelectedCrop(null); setLocationSearch(""); }}
              className="px-5 py-2.5 rounded-full bg-accent text-bg text-xs font-semibold hover:bg-accent/90 transition-colors">
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-8">
            {filtered.map((f, i) => {
              const cfg = BIOME_CONFIG[f.biome] || BIOME_CONFIG["cerrado"];
              const cover = f.cover || f.logo;
              const isActive = activeEntry?.farmName === f.farmName;
              const hasEUDR = f.certs.some(c => c.toLowerCase().includes("eudr"));
              return (
                <motion.div
                  key={f.id ?? `${f.farmName}-${i}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  onClick={() => {
                    if (f.isReal) {
                      setViewingFarmId(f.id ?? null);
                      if (f.id) navigate(`/fazenda/${encodeURIComponent(f.id)}`);
                      else go(5);
                    } else {
                      selectEntry(f);
                    }
                  }}
                  className="group cursor-pointer"
                >
                  {/* Photo plate — 1:1, single floating badge, no border */}
                  <div className={`relative w-full aspect-square rounded-[14px] overflow-hidden bg-white/[0.04] ${isActive ? "ring-2 ring-accent/40" : ""}`}>
                    {cover ? (
                      <img
                        src={cover}
                        alt={f.farmName}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${cfg.color}22, ${cfg.color}08)` }}>
                        <span className="text-4xl font-medium text-text/25">{f.farmName.slice(0, 2).toUpperCase()}</span>
                      </div>
                    )}

                    {/* Single guest-favorite-equivalent badge: EUDR */}
                    {hasEUDR && (
                      <div className="absolute top-3 left-3">
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-bg/95 backdrop-blur-sm">
                          <ShieldCheck size={11} strokeWidth={2.5} className="text-accent" />
                          <span className="text-[11px] font-semibold text-text">EUDR</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Meta below photo — Airbnb-style: title row + sub-line + sub-line */}
                  <div className="pt-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="text-[15px] font-medium text-text leading-snug truncate">
                        {f.farmName}
                      </h3>
                      <span className="shrink-0 text-[13px] text-text/45">{cfg.label}</span>
                    </div>
                    <p className="text-sm text-text/50 mt-0.5 truncate">
                      {f.location}
                    </p>
                    <p className="text-sm text-text/50 truncate">
                      {f.products.slice(0, 2).join(" · ")}
                      {f.products.length > 2 && <span> · +{f.products.length - 2}</span>}
                    </p>
                    {f.area > 0 && (
                      <p className="text-sm mt-1">
                        <span className="font-medium text-text">{f.area.toLocaleString("pt-BR")} ha</span>
                        <span className="text-text/45"> registrados</span>
                      </p>
                    )}
                    <p className="text-[12px] text-text/35 mt-1">
                      {(f.profileMode ?? "commodity") === "produto" ? "Produto final" : "Commodity"}
                    </p>

                    {isComprador && (
                      <button
                        onClick={e => { e.stopPropagation(); setPropForm({ message: "", volume: "", products: [] }); setProposalTarget(f); }}
                        className="mt-3 text-sm font-medium text-text/80 underline underline-offset-4 hover:text-accent transition-colors"
                      >
                        Enviar proposta
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {filtered.length > 0 && (
          <p className="text-center text-xs text-text/30 mt-12">
            {filtered.length} {filtered.length === 1 ? "fazenda exibida" : "fazendas exibidas"} · Quem Produz
          </p>
        )}
      </div>

      {/* ── Modal de proposta ── */}
      <AnimatePresence>
        {proposalTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
            onClick={() => setProposalTarget(null)}>
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-bg border border-white/15 w-full max-w-md rounded-3xl p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-accent mb-1">Nova Proposta</p>
                  <h3 className="text-lg font-extrabold uppercase tracking-tight text-text leading-tight">{proposalTarget.farmName}</h3>
                  <p className="text-[9px] text-white/40 mt-0.5 flex items-center gap-1"><MapPin size={8} />{proposalTarget.location}</p>
                </div>
                <button onClick={() => setProposalTarget(null)} className="text-white/40 hover:text-text transition-colors mt-1"><X size={18} /></button>
              </div>

              {/* Produtos de interesse */}
              <div className="mb-4">
                <label className="block text-[9px] font-bold uppercase tracking-widest text-accent mb-2">Produtos de interesse</label>
                <div className="flex flex-wrap gap-1.5">
                  {proposalTarget.products.map(p => (
                    <div key={p} onClick={() => setPropForm(f => ({ ...f, products: f.products.includes(p) ? f.products.filter(x => x !== p) : [...f.products, p] }))}
                      className={`px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-widest cursor-pointer border rounded-full transition-all ${propForm.products.includes(p) ? "bg-accent text-bg border-accent" : "border-white/20 text-white/50 hover:border-accent/40"}`}>
                      {p}
                    </div>
                  ))}
                </div>
              </div>

              {/* Volume */}
              <div className="mb-4">
                <label className="block text-[9px] font-bold uppercase tracking-widest text-accent mb-2">Volume estimado</label>
                <input
                  value={propForm.volume}
                  onChange={e => setPropForm(f => ({ ...f, volume: e.target.value }))}
                  placeholder="Ex: 500 toneladas / safra"
                  className="w-full px-4 py-3 border border-white/20 bg-transparent focus:border-accent focus:ring-1 focus:ring-accent rounded-2xl text-sm text-text placeholder-white/30 outline-none"
                />
              </div>

              {/* Mensagem */}
              <div className="mb-6">
                <label className="block text-[9px] font-bold uppercase tracking-widest text-accent mb-2">Mensagem</label>
                <textarea
                  value={propForm.message}
                  onChange={e => setPropForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Apresente-se e descreva sua proposta de negócio..."
                  rows={3}
                  className="w-full px-4 py-3 border border-white/20 bg-transparent focus:border-accent focus:ring-1 focus:ring-accent rounded-2xl text-sm text-text placeholder-white/30 outline-none resize-none"
                />
              </div>

              <Btn full onClick={() => {
                if (!user || !propForm.message.trim()) { addToast("Escreva uma mensagem para a fazenda.", "error"); return; }
                sendProposal({
                  fromEmail: user.email,
                  fromName: user.name || user.farmName,
                  fromCompany: user.farmName,
                  fromRole: user.role ?? "outro",
                  toFarmName: proposalTarget.farmName,
                  products: propForm.products,
                  volume: propForm.volume,
                  message: propForm.message,
                });
                addToast("Proposta enviada para " + proposalTarget.farmName + "!");
                setProposalTarget(null);
              }}>
                Enviar proposta
              </Btn>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Counter animado que dispara quando entra no viewport (count-up com ease-out cubic).
// Respeita prefers-reduced-motion (snap direto para o valor final).
function CountUp({
  to, suffix = "", prefix = "", duration = 1200, delay = 0, format = false,
}: { to: number; suffix?: string; prefix?: string; duration?: number; delay?: number; format?: boolean }) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) { setN(to); return; }
    const el = ref.current;
    if (!el) return;
    let started = false;
    let raf = 0;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || started) return;
      started = true;
      const t0 = performance.now() + delay;
      const tick = (now: number) => {
        if (now < t0) { raf = requestAnimationFrame(tick); return; }
        const p = Math.min(1, (now - t0) / duration);
        const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
        setN(Math.round(to * eased));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.35 });
    obs.observe(el);
    return () => { obs.disconnect(); cancelAnimationFrame(raf); };
  }, [to, duration, delay, reduced]);
  const display = format ? n.toLocaleString("pt-BR") : String(n);
  return <span ref={ref}>{prefix}{display}{suffix}</span>;
}

const SLanding = ({ go }: { go: (s: number) => void }) => {
  const t = useLang();
  const { lots: realLots } = useContext(AppContext);
  const [activeSection, setActiveSection] = useState("hero");
  useSEO({
    title: "Quem Produz — Vitrine Digital do Agro",
    description: "A vitrine digital do agronegócio brasileiro. Crie seu perfil em 5 minutos, organize lotes com QR rastreável e conecte sua fazenda a compradores no Brasil e na Europa. Conformidade EUDR, 100% grátis.",
    path: "/",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Quem Produz",
        url: "https://quemproduz.com",
        logo: "https://quemproduz.com/og-default.png",
        description: "Vitrine digital do agronegócio brasileiro com rastreabilidade EUDR.",
        sameAs: [],
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Quem Produz",
        url: "https://quemproduz.com",
        inLanguage: "pt-BR",
        potentialAction: {
          "@type": "SearchAction",
          target: "https://quemproduz.com/vitrine?q={search_term_string}",
          "query-input": "required name=search_term_string",
        },
      },
    ],
  });
  const heroRef = useRef<HTMLDivElement>(null);
  const farmsRef = useRef<HTMLDivElement>(null);
  const mapLandRef = useRef<HTMLDivElement>(null);
  const howRef = useRef<HTMLDivElement>(null);
  const benefitsRef = useRef<HTMLDivElement>(null);

  const storedFarms: AppUser[] = (() => {
    try { const u = localStorage.getItem("rastro_user"); return u ? [JSON.parse(u)] : []; } catch { return []; }
  })();
  const publicFarms = storedFarms.filter(f => f.isPublic !== false);
  const showcaseFarms = publicFarms.length > 0 ? publicFarms : null;

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>, id: string) => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
    setActiveSection(id);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id); });
    }, { threshold: 0.4 });
    [heroRef, farmsRef, mapLandRef, howRef, benefitsRef].forEach(r => r.current && observer.observe(r.current));
    return () => observer.disconnect();
  }, []);

  const navLinks = [
    { id: "farms",    label: t.nav_farms,   ref: farmsRef    },
    { id: "map",      label: "Mapa",         ref: mapLandRef  },
    { id: "how",      label: t.nav_how,      ref: howRef      },
    { id: "benefits", label: t.nav_benefits, ref: benefitsRef },
  ];

  const benefitIcons = [ShieldCheck, TrendingUp, Globe, QrCode, MapPin, Users];

  // ── Featured producers carousel (luxury hero rotation) ─────────────────────
  const heroFeatured = [
    { photo: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=2400&q=88&auto=format&fit=crop",
      name: "José Mendes",         crop: "soja",  ha: "4.200", lots: 12, location: "Sorriso, MT",     state: "Mato Grosso", main: "Soja",  heritage: "3 gerações" },
    { photo: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=2400&q=88&auto=format&fit=crop",
      name: "Maria Helena Costa",  crop: "café",  ha: "180",   lots: 8,  location: "Patrocínio, MG",  state: "Minas Gerais", main: "Café",  heritage: "Família tradicional" },
    { photo: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=2400&q=88&auto=format&fit=crop",
      name: "Pedro Cunha",         crop: "cacau", ha: "320",   lots: 6,  location: "Ilhéus, BA",      state: "Bahia",        main: "Cacau", heritage: "4 gerações" },
    { photo: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=2400&q=88&auto=format&fit=crop",
      name: "Ana Beatriz Silva",   crop: "milho", ha: "2.100", lots: 15, location: "Rio Verde, GO",   state: "Goiás",        main: "Milho", heritage: "2 gerações" },
  ];
  const [heroIdx, setHeroIdx] = useState(0);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const id = window.setInterval(() => {
      setHeroIdx((i) => (i + 1) % heroFeatured.length);
    }, 7000);
    return () => window.clearInterval(id);
  }, [heroFeatured.length]);
  const f = heroFeatured[heroIdx];
  const fFirst = f.name.split(" ")[0];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-bg">

      {/* ── EUDR Urgency Strip ── */}
      <div className="bg-accent text-bg py-2 px-5 text-center text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5">
        <span className="w-1.5 h-1.5 rounded-full bg-bg/50 animate-pulse shrink-0" />
        Compradores europeus exigem rastreabilidade de origem · EUDR em vigor
        <span className="hidden sm:inline">· Rastro facilita isso em 5 minutos</span>
      </div>

      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-50 bg-bg/92 backdrop-blur-xl border-b border-white/8">
        <div className="max-w-6xl mx-auto px-4 md:px-10 h-16 flex items-center justify-between gap-2 md:gap-4">
          <Logo className="shrink-0" />
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map(l => (
              <button key={l.id} onClick={() => scrollTo(l.ref, l.id)}
                className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${activeSection === l.id ? "text-accent" : "text-white/50 hover:text-white"}`}>
                {l.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-1.5 md:gap-3">
            <ThemeToggle />
            <LangSwitcher />
            <button onClick={() => go(2)} className="hidden md:block px-4 py-2 text-[10px] font-bold uppercase tracking-widest border border-white/20 text-text hover:border-accent hover:text-accent transition-all whitespace-nowrap">
              {t.nav_login}
            </button>
            <button onClick={() => go(1)} className="px-2.5 md:px-4 py-2 text-[9px] md:text-[10px] font-bold uppercase tracking-wider md:tracking-widest bg-accent text-bg hover:bg-accent/90 transition-all whitespace-nowrap shrink-0">
              {t.nav_signup}
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero (Luxury Producer · Airbnb-style · Featured rotation) ── */}
      <section ref={heroRef} id="hero" className="relative min-h-[92vh] flex flex-col justify-end overflow-hidden border-b border-white/10">
        {/* Rotating photo carousel — Ken Burns + crossfade */}
        <div className="absolute inset-0">
          <AnimatePresence>
            <motion.img
              key={f.photo}
              src={f.photo}
              alt=""
              aria-hidden="true"
              initial={{ opacity: 0, scale: 1.06 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ opacity: { duration: 1.4, ease: [0.22, 1, 0.36, 1] }, scale: { duration: 8, ease: "linear" } }}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: "saturate(0.94) contrast(1.04) brightness(0.96)" }}
            />
          </AnimatePresence>
          {/* Cinematic tonal overlay */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "linear-gradient(to top, rgba(15,13,10,0.95) 0%, rgba(15,13,10,0.82) 22%, rgba(15,13,10,0.55) 45%, rgba(15,13,10,0.30) 68%, rgba(15,13,10,0.15) 88%, rgba(15,13,10,0.05) 100%)"
          }} />
          {/* Side fade for card legibility */}
          <div className="absolute inset-y-0 right-0 w-1/2 hidden lg:block pointer-events-none" style={{
            background: "linear-gradient(to left, rgba(15,13,10,0.4) 0%, transparent 70%)"
          }} />
          {/* Film grain */}
          <div className="absolute inset-0 opacity-[0.07] mix-blend-overlay pointer-events-none"
            style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")" }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto w-full px-5 md:px-12 lg:px-20 pt-32 md:pt-40 pb-14 md:pb-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={heroIdx}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16 lg:items-end"
            >
              {/* ── Editorial copy ── */}
              <div>
                {/* Eyebrow — brighter gold, thicker rule, subtle shadow for legibility on photo */}
                <div className="flex items-center gap-3 mb-8">
                  <span className="block w-12" style={{ height: "2px", background: "#E0BC8A", boxShadow: "0 0 12px rgba(224, 188, 138, 0.45)" }} />
                  <span style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "10px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.24em",
                    color: "#E8C795",
                    textShadow: "0 1px 8px rgba(15, 13, 10, 0.65), 0 0 1px rgba(15, 13, 10, 0.85)",
                  }}>
                    Quem produz aqui · {f.state} · 2026
                  </span>
                </div>

                {/* Headline — Fraunces 500 unified, single emphasis on the number */}
                <h1 className="mb-8" style={{
                  fontFamily: "'Fraunces', 'Times New Roman', serif",
                  fontSize: "clamp(2.4rem, 6.4vw, 5rem)",
                  lineHeight: "1.0",
                  letterSpacing: "-0.022em",
                  color: "#FAF7F0",
                  fontWeight: 500,
                }}>
                  <span className="block">Conheça {fFirst}.</span>
                  <span className="block">Cultiva {f.crop} em</span>
                  <span className="block">
                    <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{f.ha}</span> hectares.
                  </span>
                </h1>

                {/* Sub */}
                <p className="mb-10 max-w-md" style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "15px",
                  lineHeight: "1.65",
                  color: "rgba(250, 247, 240, 0.72)",
                  fontWeight: 400,
                }}>
                  Origem registrada. Documentação em ordem.<br />
                  Pronto para exportar.
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-9">
                  <button
                    onClick={() => go(16)}
                    className="group inline-flex items-center gap-3 pb-1.5 transition-colors"
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "13.5px",
                      fontWeight: 500,
                      letterSpacing: "0.01em",
                      color: "#FAF7F0",
                      borderBottom: "2px solid #E0BC8A",
                      textShadow: "0 1px 6px rgba(15, 13, 10, 0.5)",
                    }}
                  >
                    Ver fazenda completa
                    <ChevronRight size={14} style={{ color: "#E8C795", filter: "drop-shadow(0 1px 4px rgba(15,13,10,0.6))" }} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button
                    onClick={() => go(1)}
                    className="inline-flex items-center gap-2 px-5 py-3 transition-all"
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "10.5px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.2em",
                      color: "rgba(250, 247, 240, 0.9)",
                      border: "1px solid rgba(250, 247, 240, 0.28)",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#E0BC8A"; (e.currentTarget as HTMLButtonElement).style.color = "#E8C795"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(250, 247, 240, 0.28)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(250, 247, 240, 0.9)"; }}
                  >
                    Sou produtor · cadastrar
                  </button>
                </div>
              </div>

              {/* ── Floating listing card (rotates with featured) ── */}
              <div className="hidden lg:block">
                <div className="p-6 backdrop-blur-md" style={{
                  background: "rgba(250, 247, 240, 0.96)",
                  boxShadow: "0 30px 80px -20px rgba(0,0,0,0.55), 0 0 0 1px rgba(26,24,20,0.04)",
                  borderRadius: "2px",
                }}>
                  {/* Avatar + name */}
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center shrink-0" style={{
                      background: "rgba(31, 58, 46, 0.08)",
                      boxShadow: "inset 0 0 0 1px rgba(26,24,20,0.08)",
                    }}>
                      <Sprout size={22} style={{ color: "#1F3A2E" }} />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate" style={{
                        fontFamily: "'Fraunces', serif",
                        fontSize: "16px",
                        fontWeight: 500,
                        color: "#1A1814",
                        letterSpacing: "-0.01em",
                      }}>
                        {f.name}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5" style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "11px",
                        fontWeight: 400,
                        color: "rgba(26, 24, 20, 0.55)",
                      }}>
                        <MapPin size={10} /> {f.location}
                      </div>
                    </div>
                  </div>

                  {/* Recognized row (substitui "Verificado") */}
                  <div className="flex items-center gap-2 mb-5 pb-5" style={{
                    borderBottom: "1px solid rgba(26, 24, 20, 0.08)",
                  }}>
                    <Sprout size={13} style={{ color: "#1F3A2E" }} />
                    <span style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "10.5px",
                      fontWeight: 600,
                      letterSpacing: "0.04em",
                      color: "#1F3A2E",
                    }}>Reconhecido · 2026</span>
                    <span className="ml-auto" style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "10px",
                      fontWeight: 400,
                      color: "rgba(26, 24, 20, 0.45)",
                    }}>{f.heritage}</span>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {[
                      { v: f.ha, l: "hectares" },
                      { v: f.main, l: "principal" },
                      { v: String(f.lots), l: "lotes" },
                    ].map((s, i) => (
                      <div key={i}>
                        <div style={{
                          fontFamily: "'Fraunces', serif",
                          fontSize: "16px",
                          fontWeight: 500,
                          color: "#1A1814",
                          fontVariantNumeric: "tabular-nums",
                          lineHeight: 1.1,
                        }}>{s.v}</div>
                        <div className="mt-1.5" style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "9px",
                          fontWeight: 500,
                          textTransform: "uppercase",
                          letterSpacing: "0.16em",
                          color: "rgba(26, 24, 20, 0.5)",
                        }}>{s.l}</div>
                      </div>
                    ))}
                  </div>

                  {/* Inline CTA */}
                  <button
                    onClick={() => go(16)}
                    className="w-full text-left flex items-center justify-between transition-colors group"
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "11.5px",
                      fontWeight: 600,
                      letterSpacing: "0.02em",
                      color: "#1A1814",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#1F3A2E"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#1A1814"; }}
                  >
                    <span>Ver vitrine pública</span>
                    <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Bottom rail: scroll hint + slide indicators (clickable) */}
          <div className="mt-14 md:mt-20 flex items-center justify-between gap-6 pt-6"
            style={{ borderTop: "1px solid rgba(250, 247, 240, 0.12)" }}
          >
            <button
              onClick={() => scrollTo(farmsRef, "farms")}
              className="flex items-center gap-3 transition-colors"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "10px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.22em",
                color: "rgba(250, 247, 240, 0.5)",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#E8C795"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(250, 247, 240, 0.5)"; }}
            >
              <ArrowDown size={13} className="animate-bounce" />
              Explorar 500+ fazendas
            </button>

            <div className="flex items-center gap-2">
              {heroFeatured.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setHeroIdx(i)}
                  aria-label={`Mostrar produtor ${i + 1}`}
                  className="transition-all duration-500"
                  style={{
                    height: "2px",
                    width: i === heroIdx ? "36px" : "16px",
                    background: i === heroIdx ? "#E0BC8A" : "rgba(250, 247, 240, 0.22)",
                    boxShadow: i === heroIdx ? "0 0 10px rgba(224, 188, 138, 0.5)" : "none",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Farm Showcase ── */}
      <section ref={farmsRef} id="farms" className="py-20 px-5 md:px-12 lg:px-20 border-b border-white/10">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }}
            className="mb-12 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-accent mb-3 block">{t.farms_eudr} ✓</span>
              <h2 className="text-3xl md:text-5xl font-extrabold uppercase tracking-tight text-text mb-4"
                style={{ fontFamily: "'Syne', 'Helvetica Neue', sans-serif" }}>{t.farms_title}</h2>
              <p className="text-sm text-white/50 max-w-lg">{t.farms_sub}</p>
            </div>
            <div className="shrink-0 flex flex-col items-start md:items-end gap-2">
              <span className="text-[8px] font-bold uppercase tracking-widest text-white/28">Você é comprador ou trader?</span>
              <button onClick={() => go(1)} className="inline-flex items-center gap-1.5 px-4 py-2 border border-accent/40 text-accent text-[9px] font-black uppercase tracking-widest hover:bg-accent/8 transition-colors">
                <TrendingUp size={11} /> Cadastrar como comprador / trader
              </button>
            </div>
          </motion.div>

          {(!showcaseFarms || showcaseFarms.length === 0) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {DEMO_FARMS.map((f, i) => (
                <motion.div key={i} initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                  className="border border-white/10 hover:border-accent/60 transition-all duration-300 group cursor-pointer rounded-2xl overflow-hidden" onClick={() => go(16)}>
                  <div className="h-32 bg-gradient-to-br from-accent/5 to-white/2 border-b border-white/10 flex items-center justify-center relative overflow-hidden">
                    <Sprout size={36} className="text-accent/30" />
                    <div className="absolute top-3 right-3">
                      <span className="text-[8px] font-bold uppercase tracking-widest text-accent border border-accent/40 px-2 py-0.5 bg-bg/60">{t.farms_eudr} ✓</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-black uppercase tracking-tight text-text mb-1">{f.farmName}</h3>
                    <p className="text-[9px] font-bold text-accent flex items-center gap-1 mb-3"><MapPin size={9} />{f.location}</p>
                    <p className="text-[10px] text-white/50 leading-relaxed mb-4 line-clamp-2">{f.description}</p>
                    <div className="flex flex-wrap gap-1 mb-4">
                      {f.products.map((p, j) => <span key={j} className="text-[8px] font-bold uppercase tracking-widest text-white/50 border border-white/15 px-1.5 py-0.5">{p}</span>)}
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-white/10">
                      <div className="flex gap-3">
                        <div><span className="text-xs font-black text-text">{f.area.toLocaleString()}</span><span className="text-[8px] text-white/40 ml-1">{t.farms_area} ~</span></div>
                        <div><span className="text-xs font-black text-text">{f.lots}</span><span className="text-[8px] text-white/40 ml-1">{t.farms_lots}</span></div>
                      </div>
                      <span className="text-[8px] font-bold uppercase tracking-widest text-accent group-hover:underline">{t.farms_view} →</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {showcaseFarms.map((f, i) => (
                <motion.div key={i} initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                  className="border border-white/10 hover:border-accent/60 transition-all duration-300 group cursor-pointer rounded-2xl overflow-hidden" onClick={() => go(5)}>
                  <div className="h-36 bg-gradient-to-br from-accent/5 to-white/2 border-b border-white/10 relative overflow-hidden">
                    {f.cover ? <img src={f.cover} className="w-full h-full object-cover opacity-60" alt="cover" /> : <div className="w-full h-full flex items-center justify-center"><Sprout size={40} className="text-accent/20" /></div>}
                    <div className="absolute inset-0 bg-gradient-to-t from-bg/80 to-transparent" />
                    <div className="absolute top-3 right-3"><span className="text-[8px] font-bold uppercase tracking-widest text-accent border border-accent/40 px-2 py-0.5 bg-bg/70">{t.farms_eudr} ✓</span></div>
                    {f.logo && <div className="absolute bottom-3 left-3 w-10 h-10 border border-white/20 bg-bg overflow-hidden"><LogoImg src={f.logo} transform={f.logoTransform} /></div>}
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-black uppercase tracking-tight text-text mb-1">{f.farmName}</h3>
                    {f.location && <p className="text-[9px] font-bold text-accent flex items-center gap-1 mb-3"><MapPin size={9} />{f.location}</p>}
                    <p className="text-[10px] text-white/50 leading-relaxed mb-4 line-clamp-2">{f.description || "Produtor rural com rastreabilidade organizada."}</p>
                    <div className="flex flex-wrap gap-1 mb-4">
                      {(f.products || []).map((p, j) => <span key={j} className="text-[8px] font-bold uppercase tracking-widest text-white/50 border border-white/15 px-1.5 py-0.5">{p}</span>)}
                      {(f.certs || []).map((c, j) => <span key={j} className="text-[8px] font-bold uppercase tracking-widest text-accent border border-accent/30 px-1.5 py-0.5">{c}</span>)}
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-white/10">
                      <div className="flex gap-3">
                        <div><span className="text-xs font-black text-text">{realLots.reduce((a, l) => a + (Number(l.area) || 0), 0)}</span><span className="text-[8px] text-white/40 ml-1">{t.farms_area} ~</span></div>
                        <div><span className="text-xs font-black text-text">{realLots.length}</span><span className="text-[8px] text-white/40 ml-1">{t.farms_lots}</span></div>
                      </div>
                      <span className="text-[8px] font-bold uppercase tracking-widest text-accent group-hover:underline">{t.farms_view} →</span>
                    </div>
                  </div>
                </motion.div>
              ))}
              <motion.div initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }}
                className="border border-dashed border-accent/30 hover:border-accent transition-all duration-300 cursor-pointer flex flex-col items-center justify-center p-10 text-center gap-4 rounded-2xl" onClick={() => go(1)}>
                <Plus size={32} className="text-accent/40" />
                <div className="text-sm font-bold uppercase tracking-wide text-text">{t.farms_empty_title}</div>
                <div className="text-xs text-white/40">{t.farms_empty_sub}</div>
                <Btn small icon={Plus} onClick={() => go(1)}>{t.nav_signup}</Btn>
              </motion.div>
            </div>
          )}

          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mt-10 text-center">
            <button onClick={() => go(16)}
              className="inline-flex items-center gap-2 px-6 py-3 border border-accent/40 text-accent text-[10px] font-black uppercase tracking-widest hover:bg-accent hover:text-bg transition-all rounded-full">
              <Globe size={13} /> Ver vitrine completa — Explorar por bioma
              <ChevronRight size={13} />
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── Farms Map ── */}
      <FarmsMapSection go={go} sectionRef={mapLandRef} />

      {/* ── How it works ── */}
      <section ref={howRef} id="how" className="py-20 px-5 md:px-12 lg:px-20 border-b border-white/10">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="mb-12">
            <span className="text-[9px] font-bold uppercase tracking-widest text-accent mb-3 block">{t.how_tag}</span>
            <h2 className="text-3xl md:text-5xl font-extrabold uppercase tracking-tight text-text"
              style={{ fontFamily: "'Syne', 'Helvetica Neue', sans-serif" }}>{t.how_title}</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border border-white/10">
            {t.how_steps.map((s, i) => (
              <motion.div key={i} initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="p-6 md:p-8 border-b md:border-b-0 md:border-r border-white/10 last:border-0 hover:bg-white/2 transition-colors group">
                <div className="text-accent font-black text-2xl mb-6" style={{ fontFamily: "'Syne', 'Helvetica Neue', sans-serif" }}>{s.n}</div>
                <div className="text-sm font-black uppercase tracking-tight text-text mb-3">{s.t}</div>
                <div className="text-xs text-white/50 leading-relaxed">{s.d}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits ── */}
      <section ref={benefitsRef} id="benefits" className="py-20 px-5 md:px-12 lg:px-20 border-b border-white/10">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="mb-12">
            <span className="text-[9px] font-bold uppercase tracking-widest text-accent mb-3 block">{t.benefits_tag}</span>
            <h2 className="text-3xl md:text-5xl font-extrabold uppercase tracking-tight text-text"
              style={{ fontFamily: "'Syne', 'Helvetica Neue', sans-serif" }}>{t.benefits_title}</h2>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {t.benefits.map((b, i) => {
              const Icon = benefitIcons[i] || ShieldCheck;
              return (
                <motion.div key={i} initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                  className="p-5 md:p-7 border border-white/10 hover:border-accent/40 transition-all duration-300 rounded-2xl">
                  <Icon size={22} className="text-accent mb-5" />
                  <div className="text-xs font-black uppercase tracking-tight text-text mb-2">{b.t}</div>
                  <div className="text-[10px] text-white/50 leading-relaxed">{b.d}</div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Footer CTA ── */}
      <section className="py-24 px-5 md:px-12 lg:px-20 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-accent/4" />
        <div className="absolute inset-0 opacity-[0.018]" style={{ backgroundImage: "linear-gradient(#E0FF22 1px,transparent 1px),linear-gradient(90deg,#E0FF22 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <motion.div initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="max-w-2xl mx-auto relative z-10">
          <div className="text-accent mb-6"><Award size={40} className="mx-auto" /></div>
          <h2 className="text-3xl md:text-5xl font-extrabold uppercase tracking-tight text-text mb-4"
            style={{ fontFamily: "'Syne', 'Helvetica Neue', sans-serif" }}>{t.footer_cta}</h2>
          <p className="text-sm text-white/50 mb-10">{t.footer_sub}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Btn onClick={() => go(1)} icon={Sprout}>{t.footer_btn}</Btn>
            <Btn outline onClick={() => go(2)}>{t.nav_login}</Btn>
          </div>
          <p className="mt-6 text-[8.5px] font-bold uppercase tracking-widest text-white/22">
            Produtor Rural · Comprador · Trader · Cooperativa · Consultor
          </p>
        </motion.div>
      </section>

    </motion.div>
  );
};

const ROLE_OPTIONS: { value: UserRole; label: string; sub: string; icon: React.ElementType }[] = [
  { value: "produtor",    label: "Produtor Rural",   sub: "Fazenda, sítio ou propriedade", icon: Sprout },
  { value: "comprador",   label: "Comprador",        sub: "Indústria, exportador, varejista", icon: TrendingUp },
  { value: "trader",      label: "Trader / Corretor", sub: "Intermediação de grãos e commodities", icon: Layers },
  { value: "cooperativa", label: "Cooperativa",      sub: "Associação de produtores", icon: Users },
  { value: "outro",       label: "Outro",            sub: "Transportador, armazém, consultor…", icon: User },
];

const ROLE_ENTITY_LABEL: Record<UserRole, string> = {
  produtor:    "Nome da fazenda",
  comprador:   "Nome da empresa",
  trader:      "Nome da empresa",
  cooperativa: "Nome da cooperativa",
  outro:       "Nome / Razão social",
};

const ROLE_ENTITY_PLACEHOLDER: Record<UserRole, string> = {
  produtor:    "Ex: Fazenda Santa Clara",
  comprador:   "Ex: Grãos do Brasil Ltda.",
  trader:      "Ex: Cerrado Trading S.A.",
  cooperativa: "Ex: Coamo",
  outro:       "Ex: Transportadora Norte",
};

const ROLE_HISTORY_LABEL: Record<UserRole, string> = {
  produtor:    "História da fazenda",
  comprador:   "Sobre a empresa",
  trader:      "Sobre a empresa",
  cooperativa: "Sobre a cooperativa",
  outro:       "Sobre você / empresa",
};

const ROLE_HISTORY_PLACEHOLDER: Record<UserRole, string> = {
  produtor:    "Há quantas gerações? Qual seu diferencial?",
  comprador:   "Quais culturas você compra? Em quais regiões atua?",
  trader:      "Quais commodities você negocia? Volumes anuais?",
  cooperativa: "Quantos associados? Quais produtos?",
  outro:       "Descreva sua atuação na cadeia do agronegócio.",
};

const ROLE_PRODUCTS_LABEL: Record<UserRole, string> = {
  produtor:    "O que você produz?",
  comprador:   "O que você compra?",
  trader:      "O que você negocia?",
  cooperativa: "Produtos da cooperativa",
  outro:       "Produtos / serviços",
};

const SCadastro = ({ go }: { go: (s: number) => void }) => {
  const { saveUser, addToast, clearLocalSession } = useContext(AppContext);
  useSEO({
    title: "Criar conta — Cadastro grátis",
    description: "Cadastre sua fazenda na Quem Produz em 5 minutos. Vitrine pública, QR de rastreabilidade por lote e conformidade EUDR. Grátis.",
    path: "/cadastro",
  });
  const [role, setRole] = useState<UserRole | null>(null);
  const [logo, setLogo] = useState("");
  const [logoTransform, setLogoTransform] = useState<LogoTransform>({ scale: 1, x: 0, y: 0 });
  const [showLogoCrop, setShowLogoCrop] = useState(false);
  const [form, setForm] = useState({ farmName: "", name: "", email: "", phone: "", history: "", password: "", cnpj: "" });
  const [products, setProducts] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [k]: e.target.value }));
  const toggleProd = (p: string) => setProducts(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const handleSubmit = async () => {
    const errs: Record<string, string> = {};
    if (!form.farmName.trim() || form.farmName.length > 100) errs.farmName = "Obrigatório (máx 100 caracteres)";
    if (!validateEmail(form.email)) errs.email = "E-mail inválido";
    if (form.password.length < 6 || form.password.length > 128) errs.password = "Entre 6 e 128 caracteres";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const isProdutor = role === "produtor" || role === null;

    // Se o backend está disponível, registra na API (Supabase) e usa JWT
    if (API_ENABLED) {
      try {
        const { token: jwt, user: apiUser } = await api.auth.register({
          email: form.email,
          password: form.password,
          farmName: form.farmName,
          name: form.name || undefined,
          phone: form.phone || undefined,
        });
        api.token.set(jwt);
        // Limpa qualquer dado de sessão anterior — evita backfill cruzado:
        // lotes locais sem apiId seriam re-criados no banco da nova fazenda
        // pelo useEffect inicial e o mapa puxaria polígonos de outra propriedade.
        clearLocalSession();
        // Salva localmente o user mapeado (com extras locais como role/cnpj/products)
        saveUser({
          ...form,
          role: role ?? "produtor",
          password: "", // senha fica só no servidor
          products,
          certs: [],
          description: form.history,
          logo,
          logoTransform,
          cnpj: form.cnpj || undefined,
          // Garante que o farmName/email do servidor sejam respeitados
          farmName: apiUser.farmName,
          email: apiUser.email,
        });
        addToast(isProdutor ? "Fazenda criada com sucesso!" : "Conta criada com sucesso!");
        go(3);
        return;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao criar conta";
        setErrors({ email: msg });
        return;
      }
    }

    // Fallback: modo offline (localStorage apenas)
    const hashedPwd = await hashPassword(form.password);
    saveUser({
      ...form,
      role: role ?? "produtor",
      password: hashedPwd,
      products,
      certs: [],
      description: form.history,
      logo,
      logoTransform,
      cnpj: form.cnpj || undefined,
    });
    addToast(isProdutor ? "Fazenda criada com sucesso!" : "Conta criada com sucesso!");
    go(3);
  };

  // ── Step 1: role picker ──────────────────────────────────────────────────
  if (!role) return (
    <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} className="min-h-screen bg-bg">
      <TopBar title="Criar conta" onBack={() => go(0)} right={<ThemeToggle />} />
      <div className="max-w-lg mx-auto px-6 py-10">
        <p className="text-[10px] font-bold uppercase tracking-widest text-accent mb-2">Passo 1 de 2</p>
        <h2 className="text-2xl font-extrabold uppercase tracking-tight text-text mb-1 leading-tight">Como você atua?</h2>
        <p className="text-xs text-white/40 mb-8">Selecione o perfil que melhor descreve você.</p>
        <div className="flex flex-col gap-3">
          {ROLE_OPTIONS.map(opt => {
            const Icon = opt.icon;
            return (
              <button key={opt.value} onClick={() => setRole(opt.value)}
                className="w-full flex items-center gap-4 px-5 py-4 border border-white/12 hover:border-accent/60 hover:bg-accent/5 rounded-2xl transition-all text-left group">
                <div className="w-10 h-10 rounded-xl bg-white/5 group-hover:bg-accent/10 flex items-center justify-center shrink-0 transition-colors">
                  <Icon size={18} strokeWidth={1.5} className="text-white/50 group-hover:text-accent transition-colors" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold uppercase tracking-wide text-text leading-none mb-1">{opt.label}</p>
                  <p className="text-[10px] text-white/40">{opt.sub}</p>
                </div>
                <ChevronRight size={14} className="text-white/20 group-hover:text-accent transition-colors shrink-0" />
              </button>
            );
          })}
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 text-center mt-10">
          Já tem conta? <span onClick={() => go(2)} className="text-accent cursor-pointer ml-2">Fazer login</span>
        </p>
      </div>
    </motion.div>
  );

  // ── Step 2: form ─────────────────────────────────────────────────────────
  const selectedRole = ROLE_OPTIONS.find(r => r.value === role)!;
  const RoleIcon = selectedRole.icon;

  return (
    <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} className="min-h-screen bg-bg">
      <TopBar title="Criar conta" onBack={() => setRole(null)} right={<ThemeToggle />} />
      <div className="md:flex md:justify-center">
        <div className="w-full md:max-w-2xl lg:max-w-3xl p-6 md:p-10 md:grid md:grid-cols-2 md:gap-10">

          {/* Role pill */}
          <div className="md:col-span-2 mb-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-accent mb-4">Passo 2 de 2</p>
            <div className="inline-flex items-center gap-2 px-3 py-2 bg-accent/10 border border-accent/20 rounded-xl">
              <RoleIcon size={13} strokeWidth={1.5} className="text-accent" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-accent">{selectedRole.label}</span>
              <button onClick={() => setRole(null)} className="text-accent/50 hover:text-accent ml-1"><X size={11} /></button>
            </div>
          </div>

          {/* Logo */}
          <div className="md:col-span-2 text-center mb-8">
            {showLogoCrop && logo && (
              <LogoCropEditor src={logo} transform={logoTransform} onSave={setLogoTransform} onClose={() => setShowLogoCrop(false)} />
            )}
            <ImgUploader value={logo} onChange={l => { setLogo(l); setLogoTransform({ scale: 1, x: 0, y: 0 }); }}>
              <div className="w-24 h-24 border border-white/20 mx-auto mb-2 flex flex-col items-center justify-center overflow-hidden bg-transparent text-white/40 hover:border-accent hover:text-accent transition-colors relative">
                {logo ? <LogoImg src={logo} transform={logoTransform} /> : <><Camera size={28} className="mb-2" /><span className="text-[9px] font-bold uppercase tracking-widest">Logo</span></>}
              </div>
            </ImgUploader>
            {logo
              ? <button onClick={() => setShowLogoCrop(true)} style={{ background: "none", border: "none", color: "#E0FF22", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", display: "inline-flex", alignItems: "center", gap: 4 }}><Edit2 size={10} /> Ajustar logo</button>
              : <p className="text-[9px] text-white/30 uppercase tracking-widest">Toque para adicionar logo</p>
            }
          </div>

          <Field label={ROLE_ENTITY_LABEL[role]} value={form.farmName} onChange={f("farmName")} placeholder={ROLE_ENTITY_PLACEHOLDER[role]} error={errors.farmName} />
          <Field label="Seu nome completo" value={form.name} onChange={f("name")} placeholder="Ex: João Carlos Ferreira" />
          <Field label="E-mail" value={form.email} onChange={f("email")} placeholder="seu@email.com" type="email" error={errors.email} />
          <Field label="Telefone / WhatsApp" value={form.phone} onChange={f("phone")} placeholder="(00) 00000-0000" type="tel" />
          {role !== "produtor" && (
            <Field label="CNPJ" value={form.cnpj} onChange={f("cnpj")} placeholder="00.000.000/0001-00" />
          )}

          <div className="md:col-span-2 mb-8 mt-2">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-accent mb-3">{ROLE_PRODUCTS_LABEL[role]}</label>
            <div className="flex flex-wrap gap-2">
              {["Soja", "Milho", "Café", "Pecuária", "Cana", "Algodão", "Madeira", "Cacau", "Arroz", "Trigo", "Sorgo", "Algodão"].filter((v, i, a) => a.indexOf(v) === i).map((c, i) => (
                <div key={i} onClick={() => toggleProd(c)} className={`px-3 py-2 text-[9px] font-bold uppercase tracking-widest cursor-pointer transition-colors border rounded-full ${products.includes(c) ? "bg-accent text-bg border-accent" : "bg-transparent border-white/20 text-white/60"}`}>{c}</div>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <Field label={ROLE_HISTORY_LABEL[role]} value={form.history} onChange={f("history")} placeholder={ROLE_HISTORY_PLACEHOLDER[role]} tall />
          </div>
          <Field label="Criar senha" value={form.password} onChange={f("password")} placeholder="Mínimo 6 caracteres" type="password" error={errors.password} />
          <div className="md:col-span-2 mt-6">
            <Btn full onClick={handleSubmit}>
              {role === "produtor" ? "Criar minha fazenda" : "Criar minha conta"}
            </Btn>
          </div>
          <p className="md:col-span-2 text-[10px] font-bold uppercase tracking-widest text-white/40 text-center mt-8">
            Já tem conta? <span onClick={() => go(2)} className="text-accent cursor-pointer ml-2">Fazer login</span>
          </p>
        </div>
      </div>
    </motion.div>
  );
};

const SLogin = ({ go }: { go: (s: number) => void }) => {
  const { user, addToast, saveUser, clearLocalSession } = useContext(AppContext);
  useSEO({
    title: "Entrar — Acesse sua vitrine",
    description: "Acesse sua conta Quem Produz para gerenciar lotes, perfil público e documentos da fazenda.",
    path: "/login",
    noindex: true,
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSending, setForgotSending] = useState(false);

  const handleForgot = async () => {
    if (!forgotEmail.trim()) { addToast("Informe seu e-mail", "error"); return; }
    if (!API_ENABLED) {
      addToast("Recuperação de senha exige conexão com o servidor", "error");
      return;
    }
    setForgotSending(true);
    try {
      await api.auth.forgotPassword(forgotEmail.trim());
      addToast("Se o e-mail existir, enviamos um link de redefinição.", "success");
      setForgotOpen(false);
      setForgotEmail("");
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Erro ao enviar", "error");
    } finally {
      setForgotSending(false);
    }
  };

  const handleLogin = async () => {
    setError("");
    if (!email || !password) { setError("Preencha e-mail e senha."); return; }
    const rateLimitMsg = checkRateLimit();
    if (rateLimitMsg) { setError(rateLimitMsg); return; }

    // Se o backend está disponível, autentica na API (Supabase)
    if (API_ENABLED) {
      try {
        const { token: jwt, user: apiUser } = await api.auth.login(email, password);
        api.token.set(jwt);
        resetRateLimit();
        // Limpa cache da sessão anterior (lotes/eventos/propostas) antes de
        // hidratar dados do user que está logando — evita backfill cruzado.
        // O merge só preserva campos do user (logo/cnpj/products) que NÃO viajam
        // pelo banco hoje; lotes vêm sempre do servidor.
        clearLocalSession();
        // Funde dados do servidor com o que estiver localmente (governança/EUDR)
        saveUser(mergeApiUserIntoLocal(apiUser, user));
        addToast("Bem-vindo de volta!");
        go(3);
        return;
      } catch {
        setError("Credenciais inválidas.");
        return;
      }
    }

    // Fallback: modo offline (localStorage)
    if (!user) { setError("Credenciais inválidas."); return; }
    const pwdMatch = await verifyPassword(password, user.password);
    if (user.email !== email || !pwdMatch) { setError("Credenciais inválidas."); return; }
    resetRateLimit();
    if (!user.password.startsWith("pbkdf2:")) saveUser({ ...user, password: await hashPassword(password) });
    addToast("Bem-vindo de volta!");
    go(3);
  };

  return (
    <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} className="min-h-screen bg-bg flex flex-col md:flex-row">
      {/* Left decorative panel — desktop only */}
      <div className="hidden md:flex md:w-1/2 lg:w-2/5 bg-accent/5 border-r border-white/10 flex-col items-center justify-center p-16 text-center">
        <Logo className="mb-8" />
        <p className="text-xs text-white/50 leading-relaxed max-w-xs">Rastreabilidade de origem para o agronegócio brasileiro</p>
      </div>
      {/* Right form panel */}
      <div className="flex-1 flex flex-col">
        <TopBar title="Entrar" onBack={() => go(0)} right={<ThemeToggle />} />
        <div className="flex-1 flex flex-col justify-center p-6 md:p-12 max-w-md mx-auto w-full">
          <div className="mb-10">
            <div className="text-accent mb-6 md:hidden"><Leaf size={40} /></div>
            <h2 className="font-black text-4xl uppercase tracking-tighter text-text leading-none mb-2">Bem-vindo<br /><span className="text-stroke">de volta</span></h2>
            <p className="text-xs text-white/60 uppercase tracking-widest mt-4">Acesse sua fazenda</p>
          </div>
          <Field label="E-mail" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" type="email" autoComplete="email" />
          <Field label="Senha" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" type="password" autoComplete="current-password" />
          {error && <p className="text-xs text-red-400 font-bold uppercase tracking-widest mb-4 -mt-2">{error}</p>}
          <div className="text-right mb-6 -mt-3">
            <button
              type="button"
              onClick={() => { setForgotEmail(email); setForgotOpen(true); }}
              className="text-[10px] font-bold uppercase tracking-widest text-accent/80 hover:text-accent transition-colors"
            >
              Esqueci minha senha
            </button>
          </div>
          <Btn full onClick={handleLogin}>Entrar</Btn>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 text-center mt-8">
            Não tem conta? <span onClick={() => go(1)} className="text-accent cursor-pointer ml-2">Cadastre-se</span>
          </p>
        </div>
      </div>

      {forgotOpen && createPortal(
        <div className="fixed inset-0 z-[2000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !forgotSending && setForgotOpen(false)}>
          <div className="bg-bg border border-white/10 rounded-3xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-black uppercase tracking-tighter text-2xl text-text mb-2">Recuperar senha</h3>
            <p className="text-[10px] uppercase tracking-widest text-white/50 mb-5">Enviamos um link para redefinir sua senha</p>
            <Field label="Seu e-mail" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="seu@email.com" type="email" autoComplete="email" />
            <div className="flex gap-2 mt-2">
              <button onClick={() => setForgotOpen(false)} disabled={forgotSending}
                className="flex-1 px-4 py-3 border border-white/15 text-white/60 text-[10px] font-bold uppercase tracking-widest rounded-2xl hover:bg-white/5 transition-colors disabled:opacity-40">
                Cancelar
              </button>
              <Btn full onClick={handleForgot} disabled={forgotSending}>
                {forgotSending ? "Enviando..." : "Enviar link"}
              </Btn>
            </div>
          </div>
        </div>,
        document.body
      )}
    </motion.div>
  );
};

// Pílula compacta de trial — mostrar próxima ao logo/notif
const TrialPill = ({ go }: { go: (s: number) => void }) => {
  const { onTrial, trialExpired, trialDaysLeft } = usePlan();
  if (!onTrial && !trialExpired) return null;

  if (trialExpired) {
    return (
      <button onClick={() => go(15)}
        className="px-2.5 py-1 bg-red-500/10 border border-red-500/30 rounded-full text-[9px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/20 transition-colors">
        Trial expirou
      </button>
    );
  }
  const urgent = trialDaysLeft <= 5;
  return (
    <button onClick={() => go(15)}
      className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-colors ${
        urgent
          ? "bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20"
          : "bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20"
      }`}>
      {trialDaysLeft} {trialDaysLeft === 1 ? "dia" : "dias"} grátis
    </button>
  );
};

// Banner inteligente que muda de mensagem conforme estado do plano
const PlanStatusBanner = ({ go }: { go: (s: number) => void }) => {
  const { tier, onTrial, trialExpired, trialDaysLeft } = usePlan();

  // Trial expirou → vermelho, força upgrade
  if (trialExpired) {
    return (
      <div onClick={() => go(15)}
        className="mx-5 mt-4 mb-0 md:mx-8 p-3.5 bg-red-500/5 border border-red-500/30 rounded-2xl flex items-center gap-3 cursor-pointer hover:border-red-500/50 transition-all group">
        <div className="w-8 h-8 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-center shrink-0">
          <AlertTriangle size={14} className="text-red-400" strokeWidth={1.5} />
        </div>
        <div className="flex-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-red-400">Período de teste expirado</p>
          <p className="text-[10px] text-white/50">Você voltou ao plano gratuito. Toque pra escolher um plano e continuar com tudo.</p>
        </div>
        <ChevronRight size={14} className="text-red-400/60 group-hover:text-red-400 transition-colors shrink-0" />
      </div>
    );
  }

  // Trial ativo terminando em até 5 dias → amarelo de urgência
  if (onTrial && trialDaysLeft <= 5) {
    return (
      <div onClick={() => go(15)}
        className="mx-5 mt-4 mb-0 md:mx-8 p-3.5 bg-yellow-500/5 border border-yellow-500/30 rounded-2xl flex items-center gap-3 cursor-pointer hover:border-yellow-500/50 transition-all group">
        <div className="w-8 h-8 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center justify-center shrink-0">
          <AlertTriangle size={14} className="text-yellow-400" strokeWidth={1.5} />
        </div>
        <div className="flex-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-yellow-400">
            Seu trial termina em {trialDaysLeft} {trialDaysLeft === 1 ? "dia" : "dias"}
          </p>
          <p className="text-[10px] text-white/50">Quando o pagamento estiver disponível, você vai poder continuar com o plano.</p>
        </div>
        <ChevronRight size={14} className="text-yellow-400/60 group-hover:text-yellow-400 transition-colors shrink-0" />
      </div>
    );
  }

  // Trial ativo confortável → verde, contador
  if (onTrial) {
    return (
      <div onClick={() => go(15)}
        className="mx-5 mt-4 mb-0 md:mx-8 p-3.5 bg-accent/5 border border-accent/20 rounded-2xl flex items-center gap-3 cursor-pointer hover:border-accent/50 transition-all group">
        <div className="w-8 h-8 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-center shrink-0">
          <TrendingUp size={14} className="text-accent" strokeWidth={1.5} />
        </div>
        <div className="flex-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-accent">
            Trial ativo — {trialDaysLeft} {trialDaysLeft === 1 ? "dia restante" : "dias restantes"}
          </p>
          <p className="text-[10px] text-white/50">Acesso completo aos recursos pagos durante o período de lançamento.</p>
        </div>
        <ChevronRight size={14} className="text-accent/50 group-hover:text-accent transition-colors shrink-0" />
      </div>
    );
  }

  // Plano free padrão
  if (tier === "free") {
    return (
      <div onClick={() => go(15)} className="mx-5 mt-4 mb-0 md:mx-8 p-3.5 bg-accent/5 border border-accent/20 rounded-2xl flex items-center gap-3 cursor-pointer hover:border-accent/50 transition-all group">
        <div className="w-8 h-8 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-center shrink-0">
          <TrendingUp size={14} className="text-accent" strokeWidth={1.5} />
        </div>
        <div className="flex-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-accent">Plano Gratuito</p>
          <p className="text-[10px] text-white/50">Comece 30 dias grátis e desbloqueie relatórios, QR rastreável e lotes ilimitados.</p>
        </div>
        <ChevronRight size={14} className="text-accent/50 group-hover:text-accent transition-colors shrink-0" />
      </div>
    );
  }

  return null;
};

const SDashboard = ({ go }: { go: (s: number) => void }) => {
  const { user, lots, events, proposals, logout, updateProposalStatus, addToast } = useContext(AppContext);
  const { tier } = usePlan();
  const totalArea = lots.reduce((acc, l) => acc + (Number(l.area) || 0), 0);
  const [showNotifs, setShowNotifs] = useState(false);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-bg pb-28 md:pb-0">
      {/* Header — só visível no mobile (desktop tem sidebar) */}
      <div className="md:hidden bg-bg px-5 py-4 flex justify-between items-center sticky top-0 z-40 border-b border-white/10">
        <Logo />
        <div className="flex items-center gap-3 text-text">
          <TrialPill go={go} />
          <div className="relative cursor-pointer hover:text-accent transition-colors" onClick={() => setShowNotifs(p => !p)}>
            <Bell size={20} />
            {events.length > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full" />}
          </div>
          <div onClick={() => { logout(); go(0); }} className="cursor-pointer hover:text-accent transition-colors"><LogOut size={20} /></div>
        </div>
      </div>
      {/* Header desktop — título da página */}
      <div className="hidden md:flex bg-bg px-8 py-5 items-center justify-between border-b border-white/10 sticky top-0 z-40">
        <h1 className="text-lg font-extrabold uppercase tracking-tight text-text">Início</h1>
        <div className="flex items-center gap-4">
          <TrialPill go={go} />
          <div className="relative cursor-pointer hover:text-accent transition-colors text-text" onClick={() => setShowNotifs(p => !p)}>
            <Bell size={20} />
            {events.length > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full" />}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showNotifs && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="fixed top-16 right-4 z-50 bg-bg border border-white/20 w-72 shadow-2xl">
            <div className="p-3 border-b border-white/10 flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-widest">Notificações</span>
              <button onClick={() => setShowNotifs(false)}><X size={14} /></button>
            </div>
            {events.length === 0 ? <div className="p-4 text-[10px] text-white/40 uppercase tracking-widest">Nenhuma atividade</div> :
              events.slice(0, 5).map((e, i) => (
                <div key={i} className="p-3 border-b border-white/5 flex gap-3 items-start">
                  <div className="text-accent mt-0.5">{e.type === "lote" ? <Sprout size={14} /> : <Tractor size={14} />}</div>
                  <div><div className="text-xs font-bold text-text">{e.title}</div><div className="text-[9px] text-white/40 mt-1">{e.date}</div></div>
                </div>
              ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Banner inteligente — varia por estado: free / trial ativo / trial expirado */}
      <PlanStatusBanner go={go} />

      <div className="p-5 md:p-8 max-w-5xl mx-auto">
        {(() => {
          const roleOpt = ROLE_OPTIONS.find(r => r.value === (user?.role ?? "produtor"));
          const RoleIcon = roleOpt?.icon ?? Tractor;
          const roleLabel = roleOpt?.label ?? "Produtor Rural";
          const isProdutor = !user?.role || user.role === "produtor";
          return (
            <div className="border border-white/10 p-5 flex items-center gap-5 mb-8 rounded-2xl">
              <div className="w-16 h-16 bg-white/5 overflow-hidden border border-white/10 shrink-0 relative rounded-xl">
                {user?.logo
                  ? <LogoImg src={user.logo} transform={user.logoTransform} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
                  : <div className="w-full h-full flex items-center justify-center text-white/20"><RoleIcon size={20} strokeWidth={1.5} /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[8px] font-bold uppercase tracking-widest text-white/30">{roleLabel}</span>
                </div>
                <h2 className="text-xl font-extrabold uppercase tracking-tight text-text leading-tight truncate">{user?.farmName || "Minha conta"}</h2>
                {isProdutor
                  ? <p className="text-[10px] font-bold uppercase tracking-widest text-accent mt-1.5 flex items-center gap-1.5"><MapPin size={10} /> {totalArea > 0 ? `~${totalArea} ha` : "Área não definida"}</p>
                  : <p className="text-[10px] font-bold uppercase tracking-widest text-accent mt-1.5 flex items-center gap-1.5"><MapPin size={10} /> {user?.location || "Localização não definida"}</p>
                }
              </div>
              <button onClick={() => go(5)} className="p-2 text-white/40 hover:text-accent transition-colors shrink-0"><ChevronRight size={24} /></button>
            </div>
          );
        })()}

        {(() => {
          const isProdutor = !user?.role || user.role === "produtor";
          return (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {isProdutor ? <>
                  <StatCard n={lots.length.toString().padStart(2, "0")} l="Lotes" icon={Layers} />
                  <StatCard n={totalArea > 0 ? totalArea.toString() : "00"} l="Hectares" icon={Ruler} />
                  <StatCard n={lots.length > 0 ? "100%" : "0%"} l="Rastreado" icon={ShieldCheck} />
                  <StatCard n={events.length.toString().padStart(2, "0")} l="Atividades" icon={Bell} />
                </> : <>
                  <StatCard n={lots.length.toString().padStart(2, "0")} l="Fornecedores" icon={Layers} />
                  <StatCard n={lots.length > 0 ? "100%" : "0%"} l="Rastreados" icon={ShieldCheck} />
                  <StatCard n={events.length.toString().padStart(2, "0")} l="Atividades" icon={Bell} />
                  <StatCard n={user?.products?.length?.toString().padStart(2, "0") ?? "00"} l="Produtos" icon={Sprout} />
                </>}
              </div>

              <h3 className="text-[11px] font-bold text-accent mb-4 uppercase tracking-widest">Ações rápidas</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {(isProdutor
                  ? [{ icon: Plus, t: "Novo lote", s: 6 }, { icon: ImageIcon, t: "Galeria", s: 9 }, { icon: FileCheck, t: "Relatório", s: 11 }, { icon: QrCode, t: "QR Code", s: 10 }]
                  : [{ icon: MapIcon, t: "Ver vitrine", s: 16 }, { icon: FileCheck, t: "Relatório", s: 11 }, { icon: Search, t: "Buscar lotes", s: 16 }, { icon: User, t: "Meu perfil", s: 5 }]
                ).map((a, idx) => (
                  <motion.div whileTap={{ scale: 0.95 }} key={idx} onClick={() => go(a.s)} className="border border-white/10 p-4 flex items-center gap-4 cursor-pointer hover:border-accent transition-colors group rounded-2xl">
                    <div className="text-white/40 group-hover:text-accent transition-colors"><a.icon size={20} /></div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-text">{a.t}</span>
                  </motion.div>
                ))}
              </div>

              {isProdutor && (
                <div className="border border-accent p-5 mb-8 flex items-center justify-between bg-accent/5 rounded-2xl">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-accent mb-2">Status EUDR</div>
                    <div className="text-xl font-extrabold uppercase tracking-tight text-text">{lots.length}/{lots.length} Conformes</div>
                  </div>
                  <div className="text-accent"><CheckCircle2 size={32} /></div>
                </div>
              )}
            </>
          );
        })()}

        <div className="flex justify-between items-center mb-4">
          <h3 className="text-[11px] font-bold text-accent uppercase tracking-widest">Atividade recente</h3>
          <span onClick={() => go(7)} className="text-[9px] font-bold text-white/60 uppercase tracking-widest cursor-pointer hover:text-accent transition-colors">Ver tudo</span>
        </div>
        <div className="border-t border-white/10">
          {events.length === 0 && <div className="py-4 text-xs text-white/40 uppercase tracking-widest">Nenhuma atividade registrada.</div>}
          {events.slice(0, 3).map((e, idx) => (
            <div key={idx} className="flex items-center gap-4 py-4 border-b border-white/10">
              <div className="text-accent">{e.type === "lote" ? <Sprout size={18} /> : e.type === "foto" ? <Camera size={18} /> : <Tractor size={18} />}</div>
              <div className="flex-1"><div className="text-xs font-bold uppercase tracking-wide text-text">{e.title}</div></div>
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{e.date}</span>
            </div>
          ))}
        </div>

        {/* ── Propostas recebidas (produtores) / enviadas (compradores) ── */}
        {(() => {
          const isProdutor = !user?.role || user.role === "produtor";
          const myProposals = isProdutor
            ? proposals.filter(p => p.toFarmName === user?.farmName)
            : proposals.filter(p => p.fromEmail === user?.email);
          if (myProposals.length === 0) return null;
          const STATUS_COLOR: Record<Proposal["status"], string> = {
            pendente: "text-yellow-400 border-yellow-400/30 bg-yellow-400/5",
            aceita:   "text-emerald-400 border-emerald-400/30 bg-emerald-400/5",
            recusada: "text-red-400 border-red-400/30 bg-red-400/5",
          };
          return (
            <div className="mt-8 pt-6 border-t border-white/10">
              <h3 className="text-[11px] font-bold text-accent uppercase tracking-widest mb-4">
                {isProdutor ? "Propostas Recebidas" : "Propostas Enviadas"}
              </h3>
              <div className="space-y-3">
                {myProposals.map(p => (
                  <div key={p.id} className="border border-white/10 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-tight text-text">
                          {isProdutor ? p.fromCompany : p.toFarmName}
                        </p>
                        <p className="text-[9px] text-white/40 mt-0.5">
                          {isProdutor
                            ? ROLE_OPTIONS.find(r => r.value === p.fromRole)?.label ?? p.fromRole
                            : new Date(p.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                        </p>
                      </div>
                      <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border ${STATUS_COLOR[p.status]}`}>
                        {p.status}
                      </span>
                    </div>
                    {p.products.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {p.products.map(pr => <span key={pr} className="text-[7px] font-bold uppercase tracking-widest px-2 py-0.5 border border-white/12 text-text/35 rounded-full">{pr}</span>)}
                      </div>
                    )}
                    {p.volume && <p className="text-[9px] text-white/50 mb-1">Volume: {p.volume}</p>}
                    <p className="text-[10px] text-white/60 leading-relaxed line-clamp-2">{p.message}</p>
                    {isProdutor && p.status === "pendente" && (
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => { updateProposalStatus(p.id, "aceita"); addToast("Proposta aceita!"); }}
                          className="px-3 py-1.5 text-[8px] font-black uppercase tracking-widest bg-accent text-bg rounded-xl hover:bg-accent/90 transition-colors">
                          Aceitar
                        </button>
                        <button onClick={() => { updateProposalStatus(p.id, "recusada"); addToast("Proposta recusada.", "info"); }}
                          className="px-3 py-1.5 text-[8px] font-black uppercase tracking-widest border border-white/20 text-white/50 rounded-xl hover:border-white/40 transition-colors">
                          Recusar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </motion.div>
  );
};

const BIOMES = ["Amazônia", "Cerrado", "Mata Atlântica", "Caatinga", "Pampa", "Pantanal"];
const PRATICAS = ["Plantio direto", "Rotação de culturas", "Cobertura morta/palhada", "Integração lavoura-pecuária (ILP)", "Irrigação eficiente", "Adubação verde", "Compostagem", "Reflorestamento de APP/RL"];

const SEditProfile = ({ go }: { go: (s: number) => void }) => {
  const { user, saveUser, addToast, deleteAccount } = useContext(AppContext);
  const [logo, setLogo] = useState(user?.logo || "");
  const [logoTransform, setLogoTransform] = useState<LogoTransform>(user?.logoTransform ?? { scale: 1, x: 0, y: 0 });
  const [showLogoCrop, setShowLogoCrop] = useState(false);
  const [cover, setCover] = useState(user?.cover || "");
  const [coverTransform, setCoverTransform] = useState<LogoTransform>(user?.coverTransform ?? { scale: 1, x: 0, y: 0 });
  const [showCoverCrop, setShowCoverCrop] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [desc, setDesc] = useState(user?.description || "");
  const [location, setLocation] = useState(user?.location || "");
  const [certs, setCerts] = useState<string[]>(user?.certs || []);
  // Governança
  const [car, setCar] = useState(user?.car || "");
  const [ccir, setCcir] = useState(user?.ccir || "");
  const [matricula, setMatricula] = useState(user?.matricula || "");
  const [nirf, setNirf] = useState(user?.nirf || "");
  const [cnpj, setCnpj] = useState(user?.cnpj || "");
  const [biome, setBiome] = useState(user?.biome || "");
  const [semEmbargo, setSemEmbargo] = useState(user?.semEmbargo ?? false);
  const [semTrabalhoEscravo, setSemTrabalhoEscravo] = useState(user?.semTrabalhoEscravo ?? false);
  const [reservaLegal, setReservaLegal] = useState(user?.reservaLegal ?? false);
  const [appArea, setAppArea] = useState(user?.appArea ?? false);
  const [outorgaAgua, setOutorgaAgua] = useState(user?.outorgaAgua ?? false);
  const [projetoTecnico, setProjetoTecnico] = useState(user?.projetoTecnico ?? false);
  const [garantia, setGarantia] = useState(user?.garantia || "");
  const [inventarioGHG, setInventarioGHG] = useState(user?.inventarioGHG ?? false);
  const [praticasSustentaveis, setPraticasSustentaveis] = useState<string[]>(user?.praticasSustentaveis || []);
  const [isPublic, setIsPublic] = useState(user?.isPublic !== false); // default true
  const [products, setProducts] = useState<string[]>(user?.products || []);
  const [profileMode, setProfileMode] = useState<"commodity" | "produto">(user?.profileMode ?? "commodity");

  const toggleCert = (c: string) => setCerts(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  const togglePratica = (p: string) => setPraticasSustentaveis(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  const toggleProduct = (p: string) => setProducts(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const handleSave = () => {
    const ok = saveUser({ ...user!, description: desc, certs, logo, logoTransform, cover, coverTransform, location,
      car, ccir, matricula, nirf, cnpj, biome, semEmbargo, semTrabalhoEscravo, reservaLegal, appArea, outorgaAgua, projetoTecnico, garantia, inventarioGHG, praticasSustentaveis, isPublic, products, profileMode });
    if (ok) {
      addToast("Perfil atualizado!");
    } else {
      addToast("Salvo na sessão atual. Libere espaço no dispositivo para persistir.", "error");
    }
    go(3);
  };

  return (
    <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} className="min-h-screen bg-bg pb-28 md:pb-0">
      {showLogoCrop && logo && (
        <LogoCropEditor src={logo} transform={logoTransform} onSave={setLogoTransform} onClose={() => setShowLogoCrop(false)} />
      )}
      {showCoverCrop && cover && (
        <LogoCropEditor src={cover} transform={coverTransform} onSave={setCoverTransform} onClose={() => setShowCoverCrop(false)} />
      )}
      <TopBar title="Editar perfil" onBack={() => go(3)} />
      <div className="p-5">

        {/* ── Modo do perfil público ── */}
        {(!user?.role || user.role === "produtor") && (
          <div className="mb-7">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-accent mb-1">Modo do perfil público</label>
            <p className="text-[11px] text-text/45 mb-4 leading-relaxed">
              Define como sua fazenda aparece para visitantes. Você pode trocar a qualquer momento.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  key: "commodity" as const,
                  icon: Sprout,
                  title: "Commodity",
                  pitch: "Soja, milho, café verde, gado, óleo a granel",
                  detail: "Para traders, exportadores, importadores. Foco em prova: EUDR, área, certificações.",
                },
                {
                  key: "produto" as const,
                  icon: Award,
                  title: "Produto final",
                  pitch: "Vinho, azeite, café torrado, queijo, mel",
                  detail: "Para distribuidores premium e mercado gourmet. Foco em narrativa: história, terroir, produtos.",
                },
              ].map(opt => {
                const active = profileMode === opt.key;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setProfileMode(opt.key)}
                    className={`text-left p-4 rounded-2xl border transition-all ${active ? "border-accent bg-accent/8" : "border-white/12 bg-white/[0.02] hover:border-white/25"}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${active ? "bg-accent text-bg" : "bg-white/5 text-text/60"}`}>
                        <Icon size={15} />
                      </div>
                      <span className={`text-sm font-semibold ${active ? "text-text" : "text-text/80"}`}>{opt.title}</span>
                      {active && <CheckCircle2 size={14} className="text-accent ml-auto" />}
                    </div>
                    <p className="text-[12px] text-text/55 mb-1.5 leading-snug">{opt.pitch}</p>
                    <p className="text-[11px] text-text/40 leading-relaxed">{opt.detail}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="relative mb-6">
          <ImgUploader value={cover} onChange={c => { setCover(c); setCoverTransform({ scale: 1, x: 0, y: 0 }); }}>
            <div className="h-32 bg-white/5 relative overflow-hidden border border-white/10 group">
              {cover
                ? <img src={cover} alt="cover" style={{ width: "100%", height: "100%", objectFit: "cover", transform: `translate(${coverTransform.x}px, ${coverTransform.y}px) scale(${coverTransform.scale})`, transformOrigin: "center" }} />
                : <img src="https://picsum.photos/seed/farmcover/800/400" alt="Cover" className="w-full h-full object-cover grayscale opacity-40" />}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"><Camera size={24} className="text-accent" /></div>
              <div className="absolute bottom-2 right-2 bg-bg/70 px-2 py-1"><span className="text-[9px] font-bold uppercase tracking-widest text-accent">Trocar capa</span></div>
            </div>
          </ImgUploader>
          {cover && (
            <button onClick={() => setShowCoverCrop(true)}
              style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(10,10,10,0.75)", border: "1px solid rgba(224,255,34,0.5)", color: "#E0FF22", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", padding: "4px 10px", display: "flex", alignItems: "center", gap: 4 }}>
              <Edit2 size={10} /> Ajustar capa
            </button>
          )}
        </div>

        {(() => {
          const roleOpt = ROLE_OPTIONS.find(r => r.value === (user?.role ?? "produtor"));
          const logoLabel = roleOpt ? `Logo ${roleOpt.label}` : "Logo da fazenda";
          return (
            <div className="flex gap-5 mb-8 items-center px-2">
              <div className="relative -mt-16 z-10">
                <ImgUploader value={logo} onChange={t => { setLogo(t); setLogoTransform({ scale: 1, x: 0, y: 0 }); }}>
                  <div className="w-20 h-20 bg-bg border border-white/20 overflow-hidden relative group">
                    {logo ? <LogoImg src={logo} transform={logoTransform} /> : <img src="https://picsum.photos/seed/farmlogo/200/200" alt="Logo" className="w-full h-full object-cover grayscale" />}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/50"><Camera size={18} className="text-accent" /></div>
                  </div>
                </ImgUploader>
                {logo && (
                  <button onClick={() => setShowLogoCrop(true)}
                    style={{ position: "absolute", bottom: -24, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", background: "none", border: "none", color: "#E0FF22", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", display: "flex", alignItems: "center", gap: 4 }}>
                    <Edit2 size={10} /> Ajustar
                  </button>
                )}
              </div>
              <div className="flex-1 pt-2">
                <div className="text-xs font-bold uppercase tracking-wide text-text">{logoLabel}</div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-white/40 mt-1">Toque para alterar</div>
              </div>
            </div>
          );
        })()}

        {(() => {
          const role = user?.role ?? "produtor";
          const descLabel = role === "produtor" ? "Descrição da fazenda" : "Sobre a empresa / organização";
          const descPlaceholder = role === "produtor" ? "Três gerações produzindo..." : "Quem somos, onde atuamos, nossa missão...";
          const productsLabel = ROLE_PRODUCTS_LABEL[role];
          return (
            <>
              <Field label={descLabel} value={desc} onChange={e => setDesc(e.target.value)} placeholder={descPlaceholder} tall />
              <Field label="Localização (cidade/estado)" value={location} onChange={e => setLocation(e.target.value)} placeholder="Ex: Sorriso, MT" />
              {role !== "produtor" && (
                <Field label="CNPJ" value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="00.000.000/0001-00" />
              )}
              <div className="mb-8 mt-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-accent mb-3">{productsLabel}</label>
                <div className="flex flex-wrap gap-2">
                  {["Soja", "Milho", "Café", "Pecuária", "Cana", "Algodão", "Madeira", "Cacau", "Açaí", "Castanha", "Manga", "Uva", "Arroz"].map(c => (
                    <div key={c} onClick={() => toggleProduct(c)} className={`px-3 py-2 text-[9px] font-bold uppercase tracking-widest cursor-pointer transition-colors border rounded-full ${products.includes(c) ? "bg-accent text-bg border-accent" : "bg-transparent border-white/20 text-white/60"}`}>{c}</div>
                  ))}
                </div>
              </div>
            </>
          );
        })()}

        <div className="mb-8 mt-2">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-accent mb-3">Selos e certificações</label>
          <div className="flex flex-wrap gap-2">
            {["EUDR Conforme", "Orgânico", "Rainforest Alliance", "RTRS", "Bonsucro", "GlobalG.A.P", "UTS Certified"].map((s, i) => (
              <div key={i} onClick={() => toggleCert(s)} className={`px-3 py-2 text-[9px] font-bold uppercase tracking-widest cursor-pointer border rounded-full ${certs.includes(s) ? "bg-accent text-bg border-accent" : "bg-transparent border-white/20 text-white/60"}`}>{s}</div>
            ))}
          </div>
        </div>

        {/* ── Autodeclaração — apenas produtores ── */}
        {(!user?.role || user.role === "produtor") && <div className="mb-2 pt-6 border-t border-white/10">
          <p className="text-[10px] font-bold uppercase tracking-widest text-accent mb-1">Autodeclaração do Produtor</p>
          <p className="text-[9px] text-white/40 mb-5">Dados autodeclarados. Úteis para score de crédito verde e organização de documentação para compradores.</p>
        </div>}
        <Field label="Número do CAR (Cadastro Ambiental Rural)" value={car} onChange={e => setCar(e.target.value)} placeholder="BR-XX-0000000-XXXXXXXX" />
        <div className="grid grid-cols-2 gap-4">
          <Field label="CCIR — Certificado de Cadastro de Imóvel Rural" value={ccir} onChange={e => setCcir(e.target.value)} placeholder="Ex: 800123456789" />
          <Field label="Matrícula (cartório de registro)" value={matricula} onChange={e => setMatricula(e.target.value)} placeholder="Ex: 12345" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="NIRF / ITR" value={nirf} onChange={e => setNirf(e.target.value)} placeholder="Ex: 1234567" />
          <Field label="CPF / CNPJ do produtor" value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="000.000.000-00" />
        </div>

        <div className="mb-6">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-accent mb-3">Garantia para crédito rural</label>
          <div className="flex flex-wrap gap-2">
            {[
              { val: "penhor", label: "Penhor agrícola (safra)" },
              { val: "hipoteca", label: "Hipoteca do imóvel" },
              { val: "aval", label: "Aval de terceiros" },
            ].map(g => (
              <div key={g.val} onClick={() => setGarantia(garantia === g.val ? "" : g.val)}
                className={`px-3 py-2 text-[9px] font-bold uppercase tracking-widest cursor-pointer border rounded-full ${garantia === g.val ? "bg-accent text-bg border-accent" : "bg-transparent border-white/20 text-white/60"}`}>
                {g.label}
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-accent mb-3">Bioma</label>
          <div className="flex flex-wrap gap-2">
            {BIOMES.map((b) => (
              <div key={b} onClick={() => setBiome(biome === b ? "" : b)} className={`px-3 py-2 text-[9px] font-bold uppercase tracking-widest cursor-pointer border rounded-full ${biome === b ? "bg-accent text-bg border-accent" : "bg-transparent border-white/20 text-white/60"}`}>{b}</div>
            ))}
          </div>
        </div>

        {(!user?.role || user.role === "produtor") && <>
          <div className="mb-6">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-accent mb-3">Conformidade ambiental, trabalhista e documental</label>
            <div className="space-y-2">
              {[
                { val: reservaLegal,       set: setReservaLegal,       label: "Reserva Legal averbada no CAR" },
                { val: appArea,            set: setAppArea,            label: "APP delimitada e preservada" },
                { val: outorgaAgua,        set: setOutorgaAgua,        label: "Outorga de uso de água (irrigação)" },
                { val: projetoTecnico,     set: setProjetoTecnico,     label: "Projeto técnico / proposta com eng. agrônomo" },
                { val: semEmbargo,         set: setSemEmbargo,         label: "Sem embargo IBAMA / órgão ambiental" },
                { val: semTrabalhoEscravo, set: setSemTrabalhoEscravo, label: "Não consta na lista CETE/MTE" },
                { val: inventarioGHG,      set: setInventarioGHG,      label: "Inventário de GHG (Escopo 1/2) realizado" },
              ].map(({ val, set, label }) => (
                <div key={label} onClick={() => set(!val)} className={`flex items-center gap-3 px-4 py-3 border cursor-pointer transition-all rounded-xl ${val ? "border-accent bg-accent/10" : "border-white/15 bg-transparent"}`}>
                  <div className={`w-4 h-4 border flex items-center justify-center shrink-0 ${val ? "border-accent bg-accent" : "border-white/30"}`}>{val && <Check size={10} className="text-bg" />}</div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-text">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-accent mb-3">Práticas sustentáveis adotadas</label>
            <div className="flex flex-wrap gap-2">
              {PRATICAS.map((p) => (
                <div key={p} onClick={() => togglePratica(p)} className={`px-3 py-2 text-[9px] font-bold uppercase tracking-widest cursor-pointer border rounded-full ${praticasSustentaveis.includes(p) ? "bg-accent text-bg border-accent" : "bg-transparent border-white/20 text-white/60"}`}>{p}</div>
              ))}
            </div>
          </div>
        </>}

        {/* ── Visibilidade pública ── */}
        <div className="mb-8 pt-6 border-t border-white/10">
          <p className="text-[10px] font-bold uppercase tracking-widest text-accent mb-1">Visibilidade na plataforma</p>
          <p className="text-[9px] text-white/40 mb-4 leading-relaxed">
            {(!user?.role || user.role === "produtor")
              ? "Quando público, sua fazenda aparece no mapa e na vitrine da página inicial para compradores e visitantes."
              : "Quando público, seu perfil aparece na plataforma e pode ser encontrado por produtores e parceiros."}
          </p>
          <div
            onClick={() => setIsPublic(p => !p)}
            className={`flex items-center justify-between px-4 py-4 border rounded-2xl cursor-pointer transition-all ${isPublic ? "border-accent bg-accent/8" : "border-white/15 bg-transparent"}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-6 rounded-full relative transition-all duration-200 ${isPublic ? "bg-accent" : "bg-white/20"}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-bg shadow transition-all duration-200 ${isPublic ? "left-5" : "left-1"}`} />
              </div>
              <div>
                <p className={`text-[11px] font-black uppercase tracking-widest ${isPublic ? "text-accent" : "text-text/50"}`}>
                  {isPublic ? "Perfil público" : "Perfil privado"}
                </p>
                <p className="text-[9px] text-text/35 mt-0.5">
                  {isPublic ? "Visível no mapa e vitrine" : "Oculto para visitantes"}
                </p>
              </div>
            </div>
            {isPublic ? <Globe size={16} className="text-accent shrink-0" /> : <X size={16} className="text-text/30 shrink-0" />}
          </div>
        </div>

        <Btn full onClick={handleSave} icon={CheckCircle2}>Salvar alterações</Btn>

        {/* LGPD art. 18 — direito de exclusão */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-3">Privacidade (LGPD)</p>
          <p className="text-[10px] text-white/40 mb-4 leading-relaxed">Seus dados ficam armazenados apenas neste dispositivo. Você pode excluir tudo permanentemente a qualquer momento.</p>
          {!confirmDelete
            ? <Btn outline small icon={Trash2} onClick={() => setConfirmDelete(true)}>Apagar minha conta</Btn>
            : (
              <div className="border border-red-500/50 p-4 rounded-2xl">
                <p className="text-xs text-white/80 font-bold uppercase tracking-widest mb-4">Isso apagará todos os seus dados. Confirmar?</p>
                <div className="flex gap-3">
                  <Btn small onClick={deleteAccount} icon={Trash2}>Confirmar exclusão</Btn>
                  <Btn small outline onClick={() => setConfirmDelete(false)}>Cancelar</Btn>
                </div>
              </div>
            )
          }
        </div>
      </div>
    </motion.div>
  );
};

const SPublicProfile = ({ go }: { go: (s: number) => void }) => {
  const { user, lots, events, addToast, viewingFarmId, setViewingFarmId, sendProposal } = useContext(AppContext);
  const isViewingOther = !!viewingFarmId && viewingFarmId !== user?.id;
  const [viewedFarm, setViewedFarm] = useState<import("./services/api").ApiUser | null>(null);
  const [viewedLots, setViewedLots] = useState<import("./services/api").ApiLot[]>([]);

  useEffect(() => {
    if (isViewingOther && viewingFarmId) {
      let alive = true;
      api.farms.getById(viewingFarmId)
        .then(f => {
          if (!alive) return;
          setViewedFarm(f);
          // Lotes públicos vêm embutidos no GET /api/farms/:id
          const apiLots = (f.lots ?? []) as import("./services/api").ApiPublicLot[];
          // Mapeia para shape usado no front (status/eudr são opcionais aqui;
          // só precisamos de id, name, crop, area, polígono pra render)
          const mapped: import("./services/api").ApiLot[] = apiLots.map(l => ({
            id: l.id,
            userId: viewingFarmId,
            name: l.name,
            crop: l.crop,
            area: l.area ?? undefined,
            harvestDate: l.harvestDate ?? undefined,
            expiryDate: l.expiryDate ?? undefined,
            status: l.status,
            eudrCompliant: l.eudrCompliant,
            geoPolygon: l.geoPolygon ?? undefined,
          }));
          setViewedLots(mapped);
        })
        .catch(() => { if (alive) { setViewedFarm(null); setViewedLots([]); } });
      return () => { alive = false; };
    } else {
      setViewedFarm(null);
      setViewedLots([]);
    }
  }, [viewingFarmId, isViewingOther]);

  // Display data: viewed farm when browsing public, else logged-in user
  const displayFarmName = isViewingOther ? viewedFarm?.farmName : user?.farmName;
  const displayLocation = isViewingOther ? viewedFarm?.location : user?.location;
  const displayDescription = isViewingOther ? viewedFarm?.description : user?.description;
  const displayCover = isViewingOther ? viewedFarm?.coverUrl : user?.cover;
  const displayCoverTransform = isViewingOther ? viewedFarm?.coverTransform : user?.coverTransform;
  const displayLogo = isViewingOther ? viewedFarm?.logoUrl : user?.logo;
  const displayLogoTransform = isViewingOther ? viewedFarm?.logoTransform : user?.logoTransform;

  const displayProducts = isViewingOther
    ? (viewedFarm?.products?.map(p => p.name) ?? [])
    : (user?.products ?? []);
  const displayCerts = isViewingOther
    ? (viewedFarm?.certs?.map(c => c.name) ?? [])
    : (user?.certs ?? []);

  // SEO dinâmico — só quando estiver vendo perfil público de outra fazenda
  const farmJsonLd = (isViewingOther && viewingFarmId && displayFarmName) ? {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `https://quemproduz.com/fazenda/${viewingFarmId}`,
    name: displayFarmName,
    url: `https://quemproduz.com/fazenda/${viewingFarmId}`,
    description: displayDescription || `${displayFarmName} — fazenda brasileira com rastreabilidade EUDR na Quem Produz.`,
    image: displayCover || displayLogo || "https://quemproduz.com/og-default.png",
    logo: displayLogo || "https://quemproduz.com/og-default.png",
    address: displayLocation ? {
      "@type": "PostalAddress",
      addressLocality: displayLocation,
      addressCountry: "BR",
    } : undefined,
    makesOffer: displayProducts.length > 0 ? displayProducts.map((p: string) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Product", name: p },
    })) : undefined,
  } : null;

  useSEO({
    title: isViewingOther
      ? (displayFarmName ? `${displayFarmName}${displayLocation ? " — " + displayLocation : ""}` : "Perfil da fazenda")
      : "Meu perfil público",
    description: isViewingOther
      ? (displayDescription
          ? displayDescription.slice(0, 160)
          : `Conheça ${displayFarmName ?? "esta fazenda"} na Quem Produz. Rastreabilidade EUDR, lotes mapeados e produção verificada.`)
      : "Edite e visualize seu perfil público na Quem Produz.",
    path: isViewingOther && viewingFarmId ? `/fazenda/${viewingFarmId}` : "/app/vitrine",
    image: isViewingOther && displayCover ? displayCover : (displayLogo || undefined),
    type: "profile",
    noindex: !isViewingOther,
    jsonLd: farmJsonLd ?? undefined,
  });
  // Práticas declaradas (autodeclaração) — vêm já filtradas por active=true do backend
  const [myPractices, setMyPractices] = useState<import("./services/api").ApiPractice[]>([]);
  useEffect(() => {
    if (isViewingOther) return;
    if (!API_ENABLED || !api.token.get()) { setMyPractices([]); return; }
    let alive = true;
    api.practices.list()
      .then(list => { if (alive) setMyPractices(list.filter(p => p.active)); })
      .catch(() => { if (alive) setMyPractices([]); });
    return () => { alive = false; };
  }, [isViewingOther]);
  const displayPractices = isViewingOther
    ? (viewedFarm?.practices ?? [])
    : myPractices;
  const displayLots = isViewingOther ? viewedLots : lots;
  const displayEvents = isViewingOther ? [] : events;

  const totalArea = displayLots.reduce((acc, l) => acc + (Number(l.area) || 0), 0);
  const profileUrl = isViewingOther && viewingFarmId
    ? `${window.location.origin}/fazenda/${encodeURIComponent(viewingFarmId)}`
    : `${window.location.origin}?farm=${encodeURIComponent(displayFarmName || "")}`;
  const [galleryIdx, setGalleryIdx] = useState<number | null>(null);
  const [showProposal, setShowProposal] = useState(false);
  const [propForm, setPropForm] = useState({ message: "", volume: "", products: [] as string[] });
  const isComprador = !!user && user.role && user.role !== "produtor";
  const canSendProposal = isViewingOther && isComprador;

  // Aggregate all lot photos for the gallery (logged-in user only — backend lots type differs)
  const allPhotos = isViewingOther
    ? []
    : lots.flatMap(l =>
        (l.photos || []).map((src, pi) => ({ src, lotName: l.name, crop: l.crop, transform: l.photoTransforms?.[pi] }))
      );

  // Teclas: ESC fecha lightbox; setas navegam entre fotos
  useEffect(() => {
    if (galleryIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setGalleryIdx(null);
      else if (e.key === "ArrowLeft" && galleryIdx > 0) setGalleryIdx((i) => (i ?? 1) - 1);
      else if (e.key === "ArrowRight" && galleryIdx < allPhotos.length - 1) setGalleryIdx((i) => (i ?? 0) + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [galleryIdx, allPhotos.length]);

  const products = displayProducts.length
    ? displayProducts
    : [...new Set(displayLots.map(l => l.crop).filter(Boolean))];

  // Modo do perfil: define hierarquia das seções (commodity vs produto premium)
  // Override via ?mode=produto (útil pra preview do dono antes de salvar)
  const modeOverride = (() => {
    if (typeof window === "undefined") return null;
    const q = new URLSearchParams(window.location.search).get("mode");
    return q === "produto" || q === "commodity" ? q : null;
  })();
  const mode: "commodity" | "produto" = modeOverride ?? (
    isViewingOther
      ? ((viewedFarm as { profileMode?: "commodity" | "produto" } | null)?.profileMode ?? "commodity")
      : (user?.profileMode ?? "commodity")
  );
  const isProdutoMode = mode === "produto";

  const handleBack = () => {
    if (isViewingOther) {
      setViewingFarmId(null);
      go(16);
    } else {
      go(3);
    }
  };

  const eventConfig: Record<AppEvent["type"], { label: string; labelEn: string; color: string; dot: string }> = {
    lote:   { label: "Novo Lote",   labelEn: "New Lot",       color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25", dot: "bg-emerald-500" },
    foto:   { label: "Foto",        labelEn: "Photo",         color: "bg-sky-500/15 text-sky-400 border-sky-500/25",             dot: "bg-sky-500" },
    doc:    { label: "Documento",   labelEn: "Document",      color: "bg-amber-500/15 text-amber-400 border-amber-500/25",       dot: "bg-amber-500" },
    update: { label: "Atualização", labelEn: "Field Update",  color: "bg-violet-500/15 text-violet-400 border-violet-500/25",   dot: "bg-violet-500" },
  };

  const EventIcon = ({ type }: { type: AppEvent["type"] }) => {
    if (type === "lote")   return <Sprout size={15} />;
    if (type === "foto")   return <Camera size={15} />;
    if (type === "doc")    return <FileText size={15} />;
    return <Tractor size={15} />;
  };

  const heroPhotos = allPhotos.slice(0, 5);
  const hasGallery = heroPhotos.length > 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-bg pb-32 md:pb-12">

      {/* ── Top action bar (sticky) ── */}
      <div className="sticky top-0 z-40 bg-bg/85 backdrop-blur-xl border-b border-white/8">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between gap-3">
          <button onClick={handleBack} className="flex items-center gap-1.5 text-text/70 hover:text-text transition-colors">
            <ChevronLeft size={18} />
            <span className="text-sm font-medium">Voltar</span>
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => doShare(profileUrl, displayFarmName || "Fazenda", addToast)}
              className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-full text-text/70 hover:text-text hover:bg-white/5 transition-colors text-xs font-semibold">
              <Share2 size={14} /> Compartilhar
            </button>
            <button onClick={() => doShare(profileUrl, displayFarmName || "Fazenda", addToast)}
              className="md:hidden w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text/70 hover:text-text">
              <Share2 size={15} />
            </button>
            {canSendProposal && (
              <button onClick={() => { setPropForm({ message: "", volume: "", products: [] }); setShowProposal(true); }}
                className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent text-bg text-xs font-semibold hover:bg-accent/90 transition-colors">
                <Send size={13} /> Enviar proposta
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Hero ── */}
      {isProdutoMode ? (
        // Modo produto: cover editorial fullbleed com nome em destaque sobreposto
        <div className="relative w-full">
          <div
            className="relative w-full aspect-[16/9] md:aspect-[21/9] bg-white/5 overflow-hidden cursor-pointer"
            onClick={() => hasGallery && setGalleryIdx(0)}
          >
            {displayCover
              ? <img src={displayCover} alt={displayFarmName} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `translate(${displayCoverTransform?.x ?? 0}px, ${displayCoverTransform?.y ?? 0}px) scale(${displayCoverTransform?.scale ?? 1})`, transformOrigin: "center" }} />
              : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/15 to-bg">
                  <span className="text-7xl font-medium text-text/15 uppercase">{(displayFarmName || "?").slice(0, 2)}</span>
                </div>}
            {/* Gradient bottom para legibilidade do nome */}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-bg via-bg/60 to-transparent pointer-events-none" />
            {hasGallery && (
              <button onClick={(e) => { e.stopPropagation(); setGalleryIdx(0); }}
                className="absolute bottom-4 right-4 px-3.5 py-2 rounded-full bg-bg/90 backdrop-blur-sm text-text text-xs font-medium hover:bg-bg transition-colors flex items-center gap-1.5">
                <ImageIcon size={12} /> {allPhotos.length} {allPhotos.length === 1 ? "foto" : "fotos"}
              </button>
            )}
          </div>
          {/* Nome editorial logo abaixo do cover */}
          <div className="max-w-5xl mx-auto px-4 md:px-8 -mt-14 md:-mt-20 relative z-10">
            {/* Eyebrow gold — escape "verificado" */}
            <div className="flex items-center gap-3 mb-4 md:mb-5 pl-[88px] md:pl-[112px]">
              <span className="block w-10" style={{ height: "2px", background: "#E0BC8A", boxShadow: "0 0 10px rgba(224, 188, 138, 0.4)" }} />
              <span style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "10px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.24em",
                color: "#E8C795",
                textShadow: "0 1px 8px rgba(15, 13, 10, 0.65)",
              }}>
                Origem reconhecida · 2026
              </span>
            </div>
            <div className="flex items-end gap-4 md:gap-5">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden border-2 border-bg bg-white/5 shrink-0 shadow-2xl">
                {displayLogo
                  ? <LogoImg src={displayLogo} transform={displayLogoTransform} />
                  : <div className="w-full h-full flex items-center justify-center text-text/40 font-semibold text-2xl">{(displayFarmName || "?").slice(0, 2).toUpperCase()}</div>}
              </div>
              <div className="flex-1 min-w-0 pb-1 md:pb-2">
                <h1 style={{
                  fontFamily: "'Fraunces', 'Times New Roman', serif",
                  fontSize: "clamp(1.75rem, 4.5vw, 2.5rem)",
                  fontWeight: 500,
                  letterSpacing: "-0.018em",
                  lineHeight: 1.05,
                  color: "var(--text, #FAF7F0)",
                }}>
                  {displayFarmName || "Fazenda"}
                </h1>
                {displayLocation && (
                  <p className="text-sm md:text-[15px] text-text/60 mt-2 flex items-center gap-1.5" style={{ fontFamily: "'Inter', sans-serif" }}>
                    <MapPin size={14} /> {displayLocation}
                    {totalArea > 0 && <span className="text-text/40"> · ~<span style={{ fontVariantNumeric: "tabular-nums" }}>{totalArea.toLocaleString("pt-BR")}</span> ha</span>}
                  </p>
                )}
                {displayDescription && (
                  <p className="hidden md:block mt-3 italic text-text/55" style={{
                    fontFamily: "'Fraunces', 'Times New Roman', serif",
                    fontWeight: 300,
                    fontSize: "clamp(15px, 1.4vw, 18px)",
                    lineHeight: 1.45,
                    maxWidth: "44rem",
                  }}>
                    {(displayDescription.split(/[.!?]/)[0] || "").trim()}
                    {displayDescription.split(/[.!?]/)[0] && "."}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Modo commodity: grid 2-foto Airbnb-style atual
        <div className="max-w-6xl mx-auto px-4 md:px-8 pt-4 md:pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 rounded-2xl overflow-hidden">
            {/* Main cover */}
            <div className="relative aspect-[4/3] md:aspect-[5/4] bg-white/5 group cursor-pointer"
              onClick={() => hasGallery && setGalleryIdx(0)}>
              {displayCover
                ? <img src={displayCover} alt={displayFarmName} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `translate(${displayCoverTransform?.x ?? 0}px, ${displayCoverTransform?.y ?? 0}px) scale(${displayCoverTransform?.scale ?? 1})`, transformOrigin: "center" }} className="transition-transform duration-500 group-hover:scale-[1.02]" />
                : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/15 to-bg">
                    <span className="text-6xl font-medium text-text/15 uppercase">{(displayFarmName || "?").slice(0, 2)}</span>
                  </div>}
            </div>

            {/* Photo grid 2x2 (desktop only) */}
            {hasGallery && (
              <div className="hidden md:grid grid-cols-2 grid-rows-2 gap-2">
                {heroPhotos.slice(0, 4).map((p, i) => (
                  <button key={i} onClick={() => setGalleryIdx(i)}
                    className="relative bg-white/5 overflow-hidden group">
                    <img src={p.src} alt={p.lotName}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      style={p.transform ? { transform: `translate(${p.transform.x}px,${p.transform.y}px) scale(${p.transform.scale})`, transformOrigin: "center" } : undefined} />
                    {i === 3 && allPhotos.length > 4 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-sm font-semibold">+{allPhotos.length - 4} fotos</span>
                      </div>
                    )}
                  </button>
                ))}
                {heroPhotos.length < 4 && Array.from({ length: 4 - heroPhotos.length }).map((_, i) => (
                  <div key={`ph-${i}`} className="bg-white/5" />
                ))}
              </div>
            )}
          </div>

          {hasGallery && (
            <button onClick={() => setGalleryIdx(0)}
              className="md:hidden mt-2 text-xs font-semibold text-text/70 underline underline-offset-4">
              Ver todas as {allPhotos.length} fotos
            </button>
          )}
        </div>
      )}

      {/* ── Body 2-column ── */}
      <div className={`max-w-6xl mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-3 gap-x-10 gap-y-8 ${isProdutoMode ? "pt-10 md:pt-14" : "pt-8"}`}>

        {/* ── Coluna esquerda (conteúdo) — ordem e estilo dependem do modo ── */}
        <div className="md:col-span-2 space-y-10">
          {(() => {
            // ─── Blocos reutilizáveis ───
            // Identity (logo + nome + location) — só no commodity (no produto, está no hero)
            const identityBlock = (
              <div key="identity">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl overflow-hidden border border-white/15 bg-white/5 shrink-0 shadow-lg">
                    {displayLogo
                      ? <LogoImg src={displayLogo} transform={displayLogoTransform} />
                      : <div className="w-full h-full flex items-center justify-center text-text/40 font-semibold">{(displayFarmName || "?").slice(0, 2).toUpperCase()}</div>}
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <h1 className="text-[22px] md:text-[28px] font-semibold tracking-tight text-text leading-snug">
                      {displayFarmName || "Fazenda"}
                    </h1>
                    {displayLocation && (
                      <p className="text-sm text-text/55 mt-1 flex items-center gap-1.5">
                        <MapPin size={13} /> {displayLocation}
                        {totalArea > 0 && <span> · {totalArea.toLocaleString("pt-BR")} ha</span>}
                      </p>
                    )}
                  </div>
                </div>
                {displayDescription && (
                  <p className="text-[15px] text-text/75 leading-relaxed">{displayDescription}</p>
                )}
              </div>
            );

            // Editorial section heading helper — Inter restrained no produto, gold rule mantém o tom
            const editorialH2 = (text: string) => isProdutoMode ? (
              <div className="mb-4">
                <span className="block mb-2.5" style={{ width: "28px", height: "2px", background: "#E0BC8A" }} />
                <h2 className="text-[20px] md:text-[22px] font-semibold text-text leading-snug" style={{ letterSpacing: "-0.01em" }}>
                  {text}
                </h2>
              </div>
            ) : (
              <h2 className="text-[18px] font-semibold text-text leading-snug mb-3">{text}</h2>
            );

            // Sobre/História (descrição rica) — destaque no produto
            const aboutBlock = displayDescription ? (
              <section key="about">
                {editorialH2("Sobre a fazenda")}
                <p className="text-[16px] md:text-[17px] text-text/80 leading-relaxed whitespace-pre-line" style={{ fontFamily: "'Inter', sans-serif" }}>
                  {displayDescription}
                </p>
              </section>
            ) : null;

            // Pull quote editorial — primeira frase rica em Fraunces grande (produto only)
            const pullQuoteSentences = displayDescription
              ? displayDescription.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 30)
              : [];
            const pullQuote = pullQuoteSentences.length > 1 ? pullQuoteSentences[1] : null;
            const pullQuoteBlock = (isProdutoMode && pullQuote) ? (
              <section key="pullquote" className="py-2">
                <div className="flex items-start gap-5 md:gap-7">
                  <span className="block shrink-0 mt-3" style={{ width: "2px", height: "auto", alignSelf: "stretch", background: "linear-gradient(to bottom, #E0BC8A, transparent)" }} />
                  <blockquote style={{
                    fontFamily: "'Fraunces', 'Times New Roman', serif",
                    fontSize: "clamp(1.35rem, 2.6vw, 1.85rem)",
                    fontWeight: 300,
                    fontStyle: "italic",
                    lineHeight: 1.35,
                    letterSpacing: "-0.012em",
                    color: "rgba(250, 247, 240, 0.92)",
                    maxWidth: "44rem",
                  }}>
                    {pullQuote.replace(/\.$/, "")}.
                  </blockquote>
                </div>
              </section>
            ) : null;

            // Hero stats — banner editorial com 4 KPIs grandes (produto only)
            const heroStatsBlock = isProdutoMode ? (
              <section key="herostats" className="py-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 md:gap-x-8" style={{
                  borderTop: "1px solid rgba(224, 188, 138, 0.25)",
                  borderBottom: "1px solid rgba(224, 188, 138, 0.25)",
                  paddingTop: "clamp(1.25rem, 2vw, 1.75rem)",
                  paddingBottom: "clamp(1.25rem, 2vw, 1.75rem)",
                }}>
                  {[
                    { v: totalArea > 0 ? `~${totalArea.toLocaleString("pt-BR")}` : "—", l: "hectares", suffix: totalArea > 0 ? "estimados" : null },
                    { v: String(displayLots.length || 0), l: displayLots.length === 1 ? "lote mapeado" : "lotes mapeados", suffix: null },
                    { v: String(products.length || 0), l: products.length === 1 ? "produto" : "produtos", suffix: null },
                    { v: String((displayCerts.length || 0) + 1), l: displayCerts.length === 0 ? "selo" : "selos", suffix: null },
                  ].map((s, i) => (
                    <div key={i} className="flex flex-col">
                      <div className="font-semibold text-text" style={{
                        fontSize: "clamp(2rem, 4.5vw, 2.75rem)",
                        letterSpacing: "-0.02em",
                        lineHeight: 1,
                        fontVariantNumeric: "tabular-nums",
                      }}>{s.v}</div>
                      <div className="mt-2 flex items-baseline gap-1.5 text-[11px] font-semibold uppercase text-text/55" style={{ letterSpacing: "0.18em" }}>
                        {s.l}
                        {s.suffix && <span className="font-normal normal-case tracking-normal text-text/35 text-[11px]">· {s.suffix}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null;

            // Galeria editorial — todas as fotos da fazenda (produto only)
            const galleryBlock = (isProdutoMode && allPhotos.length > 0) ? (
              <section key="gallery">
                <div className="flex items-end justify-between mb-4 gap-3">
                  {editorialH2("A fazenda em fotos")}
                  <span className="text-xs text-text/35 pb-1" style={{ fontFamily: "'Inter', sans-serif", fontVariantNumeric: "tabular-nums" }}>{allPhotos.length} {allPhotos.length === 1 ? "imagem" : "imagens"}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
                  {allPhotos.slice(0, 9).map((p, i) => {
                    // Layout editorial: primeira foto ocupa 2x2 no desktop
                    const isFeature = i === 0;
                    return (
                      <button
                        key={i}
                        onClick={() => setGalleryIdx(i)}
                        className={`group relative overflow-hidden bg-white/5 ${isFeature ? "col-span-2 row-span-2 aspect-square md:aspect-auto" : "aspect-square"}`}
                        style={{ borderRadius: "2px" }}
                      >
                        <img
                          src={p.src}
                          alt={p.lotName}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                          style={p.transform ? { transform: `translate(${p.transform.x}px,${p.transform.y}px) scale(${p.transform.scale})`, transformOrigin: "center" } : undefined}
                        />
                        {/* Crop label — bottom left, editorial */}
                        <div className="absolute bottom-0 left-0 right-0 p-2.5 md:p-3 bg-gradient-to-t from-[rgba(15,13,10,0.88)] via-[rgba(15,13,10,0.4)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="flex items-center gap-2">
                            <span className="block" style={{ width: "12px", height: "1.5px", background: "#E0BC8A" }} />
                            <span className="text-[10px] font-semibold text-white/95 uppercase tracking-widest" style={{ fontFamily: "'Inter', sans-serif" }}>{p.crop || p.lotName}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {allPhotos.length > 9 && (
                  <button
                    onClick={() => setGalleryIdx(9)}
                    className="mt-4 inline-flex items-center gap-2 transition-colors"
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "11px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.2em",
                      color: "#E8C795",
                      borderBottom: "1.5px solid #E0BC8A",
                      paddingBottom: "4px",
                    }}
                  >
                    Ver todas as {allPhotos.length} fotos <ChevronRight size={13} />
                  </button>
                )}
              </section>
            ) : null;

            // Reconhecimentos — cards editoriais para certificações (produto only)
            const recognitionBlock = (isProdutoMode && (displayCerts.length > 0 || displayPractices.length > 0)) ? (
              <section key="recognition">
                {editorialH2("Selos & reconhecimentos")}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* EUDR sempre presente */}
                  <div className="p-5 flex items-start gap-4" style={{
                    background: "rgba(31, 58, 46, 0.15)",
                    border: "1px solid rgba(224, 188, 138, 0.2)",
                    borderRadius: "2px",
                  }}>
                    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{
                      background: "rgba(224, 188, 138, 0.12)",
                      border: "1px solid rgba(224, 188, 138, 0.3)",
                    }}>
                      <ShieldCheck size={18} style={{ color: "#E0BC8A" }} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[15px] font-semibold text-text leading-snug" style={{ letterSpacing: "-0.005em" }}>EUDR — Regulamento UE 2023/1115</div>
                      <p className="mt-1.5 text-[13px] text-text/55 leading-relaxed">
                        Origem rastreável para o mercado europeu. Documentação organizada na plataforma.
                      </p>
                    </div>
                  </div>
                  {displayCerts.map((c, i) => (
                    <div key={i} className="p-5 flex items-start gap-4" style={{
                      background: "rgba(255, 255, 255, 0.025)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "2px",
                    }}>
                      <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{
                        background: "rgba(224, 188, 138, 0.08)",
                        border: "1px solid rgba(224, 188, 138, 0.2)",
                      }}>
                        <CheckCircle2 size={18} style={{ color: "#E0BC8A" }} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[15px] font-semibold text-text leading-snug" style={{ letterSpacing: "-0.005em" }}>{c}</div>
                        <p className="mt-1.5 text-[12px] text-text/45 leading-relaxed">
                          Autodeclarado pelo produtor
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null;

            // Produtos — chips simples no commodity, cards editoriais no produto
            const productsBlock = products.length > 0 ? (
              isProdutoMode ? (
                <section key="products">
                  <div className="flex items-end justify-between mb-4 gap-3">
                    {editorialH2("Nossos produtos")}
                    <span className="text-xs text-text/45 pb-1" style={{ fontFamily: "'Inter', sans-serif", fontVariantNumeric: "tabular-nums" }}>{products.length} {products.length === 1 ? "item" : "itens"}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
                    {products.map((p, i) => (
                      <div key={i} className="group rounded-2xl border border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04] transition-all overflow-hidden">
                        <div className="aspect-[4/5] flex items-center justify-center bg-gradient-to-br from-accent/10 to-bg/40">
                          <Sprout size={28} className="text-accent/60 group-hover:text-accent transition-colors" />
                        </div>
                        <div className="p-3">
                          <p className="text-sm font-semibold text-text leading-snug">{p}</p>
                          <p className="text-[11px] text-text/40 mt-0.5">Produzido na fazenda</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : (
                <section key="products">
                  <h2 className="text-[18px] font-semibold text-text mb-3 leading-snug">O que produzem</h2>
                  <div className="flex gap-2 flex-wrap">
                    {products.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-white/12 bg-white/[0.02] hover:border-white/25 transition-colors">
                        <Sprout size={13} className="text-accent" />
                        <span className="text-sm font-medium text-text">{p}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )
            ) : null;

            // Trust signals — chips evidentes no commodity, linha discreta no produto
            const trustBlock = isProdutoMode ? (
              <section key="trust" className="border-t border-white/8 pt-6">
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="block" style={{ width: "24px", height: "1.5px", background: "#E0BC8A" }} />
                  <h3 style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "10px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.22em",
                    color: "#E8C795",
                  }}>Origem reconhecida</h3>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
                  <span className="inline-flex items-center gap-1.5 text-text/75">
                    <ShieldCheck size={14} className="text-accent" /> EUDR conforme
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-text/75">
                    <Globe size={14} className="text-accent" /> PRODES/INPE registrado
                  </span>
                  {displayCerts.map((c, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 text-text/75">
                      <CheckCircle2 size={14} className="text-accent" /> {c}
                    </span>
                  ))}
                </div>
              </section>
            ) : (
              <div key="trust" className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/25 text-accent text-xs font-semibold">
                  <ShieldCheck size={13} strokeWidth={2.25} /> EUDR conforme
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/12 text-text/75 text-xs font-medium">
                  <Globe size={12} /> PRODES/INPE verificado
                </span>
                {displayPractices.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/12 text-text/75 text-xs font-medium">
                    <Leaf size={12} /> {displayPractices.length} {displayPractices.length === 1 ? "prática" : "práticas"} sustentáveis
                  </span>
                )}
                {displayCerts.map((c, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/12 text-text/75 text-xs font-medium">
                    <CheckCircle2 size={12} /> {c}
                  </span>
                ))}
              </div>
            );

            // Stats — destaque no commodity, compacto inline no produto
            const statsBlock = (
              <div key="stats" className={isProdutoMode
                ? "flex flex-wrap gap-x-8 gap-y-2 text-sm text-text/65"
                : "grid grid-cols-3 gap-3 py-5 border-y border-white/8"}>
                {isProdutoMode ? (
                  <>
                    <span><span className="font-semibold text-text">{displayLots.length}</span> {displayLots.length !== 1 ? "lotes" : "lote"} mapeado{displayLots.length !== 1 ? "s" : ""}</span>
                    {totalArea > 0 && <span><span className="font-semibold text-text">{totalArea.toLocaleString("pt-BR")} ha</span> registrados</span>}
                    <span><span className="font-semibold text-text">{displayCerts.length + 1}</span> certificaç{displayCerts.length + 1 !== 1 ? "ões" : "ão"}</span>
                  </>
                ) : (
                  <>
                    <div>
                      <div className="text-[22px] font-semibold text-text leading-none">{displayLots.length}</div>
                      <div className="text-xs text-text/45 mt-1.5">Lote{displayLots.length !== 1 ? "s" : ""} mapeado{displayLots.length !== 1 ? "s" : ""}</div>
                    </div>
                    <div>
                      <div className="text-[22px] font-semibold text-text leading-none">
                        {totalArea > 0 ? totalArea.toLocaleString("pt-BR") : "—"}
                        {totalArea > 0 && <span className="text-sm font-medium text-text/40 ml-1">ha</span>}
                      </div>
                      <div className="text-xs text-text/45 mt-1.5">Área registrada</div>
                    </div>
                    <div>
                      <div className="text-[22px] font-semibold text-accent leading-none">{displayCerts.length + 1}</div>
                      <div className="text-xs text-text/45 mt-1.5">Certificações</div>
                    </div>
                  </>
                )}
              </div>
            );

            // Práticas
            const praticasBlock = displayPractices.length > 0 ? (
              <section key="praticas">
                <div className="flex items-end justify-between mb-3 gap-3">
                  {editorialH2(isProdutoMode ? "Como produzimos" : "Práticas declaradas")}
                  <span className="text-xs text-text/35 italic pb-1" style={{ fontFamily: "'Inter', sans-serif" }}>Autodeclaração do produtor</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {displayPractices.map((p) => (
                    <div key={p.id} className="flex items-start gap-3 p-3.5 rounded-2xl border border-white/10 bg-white/[0.02]">
                      <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                        <Leaf size={14} className="text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <span className="text-sm font-semibold text-text">{p.name}</span>
                          {p.startDate && (
                            <span className="text-[11px] font-medium text-accent/70">
                              desde {new Date(p.startDate).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </div>
                        {p.notes && <p className="text-xs text-text/55 mt-1 italic">"{p.notes}"</p>}
                        {p.photoUrl && <img src={p.photoUrl} alt={p.name} className="mt-2 w-full max-w-[180px] h-20 object-cover rounded-lg border border-white/10" />}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null;

            // Atividade
            const atividadeBlock = (
              <section key="atividade">
                <div className="flex items-end justify-between mb-4 gap-3">
                  {editorialH2(isProdutoMode ? "Histórico do produto" : "Histórico de atividade")}
                  {displayEvents.length > 0 && (
                    <span className="text-xs text-accent font-semibold pb-1" style={{ fontFamily: "'Inter', sans-serif", fontVariantNumeric: "tabular-nums" }}>{displayEvents.length} {displayEvents.length === 1 ? "evento" : "eventos"}</span>
                  )}
                </div>
                {displayEvents.length === 0 ? (
                  <div className="py-10 text-center rounded-2xl border border-white/8 bg-white/[0.02]">
                    <Tractor size={24} className="text-text/25 mx-auto mb-2" />
                    <p className="text-sm text-text/40">Nenhum registro ainda</p>
                  </div>
                ) : (
                  <div className="relative">
                    {displayEvents.length > 1 && <div className="absolute left-[19px] top-10 bottom-10 w-px bg-white/10" />}
                    <div className="space-y-2.5">
                      {displayEvents.map((e, idx) => {
                        const cfg = eventConfig[e.type] ?? eventConfig.update;
                        return (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: Math.min(idx * 0.035, 0.3) }}
                            className="flex gap-3 items-start"
                          >
                            <div className={`shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center z-10 ${cfg.color}`}>
                              <EventIcon type={e.type} />
                            </div>
                            <div className="flex-1 rounded-2xl px-4 py-2.5 border border-white/8 bg-white/[0.02] hover:border-white/15 transition-colors">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium text-text leading-snug">{e.title}</p>
                                <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.color}`}>{cfg.label}</span>
                              </div>
                              <p className="text-xs text-text/40 mt-1">{e.date}</p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            );

            // Mapa de lotes — agrega todos os polígonos georreferenciados.
            // Em commodity é "área registrada / verificada"; em produto é "terroir / origem".
            // Pega geoPolygon (ApiLot, viewing other) ou mapPoints (Lot local, viewing self).
            type AnyLot = (typeof displayLots)[number] & {
              geoPolygon?: { lat: number; lng: number }[];
              mapPoints?: [number, number][];
            };
            const lotsWithPoly: { id: string; name: string; crop: string; area?: number | string; points: [number, number][] }[] =
              (displayLots as AnyLot[])
                .map(l => {
                  const polyPoints: [number, number][] = (l.geoPolygon ?? []).map(g => [g.lat, g.lng]);
                  const localPoints: [number, number][] = (l.mapPoints ?? []) as [number, number][];
                  const points = polyPoints.length ? polyPoints : localPoints;
                  return points.length >= 3
                    ? { id: String(l.id), name: l.name, crop: l.crop, area: l.area, points }
                    : null;
                })
                .filter((x): x is { id: string; name: string; crop: string; area?: number | string; points: [number, number][] } => !!x);

            const lotsMapBlock = lotsWithPoly.length > 0 ? (
              <section key="lotsmap">
                <div className="flex items-end justify-between mb-3 gap-3">
                  {editorialH2(isProdutoMode ? "De onde vem o produto" : "Lotes mapeados")}
                  <span className="text-xs text-text/35 pb-1" style={{ fontFamily: "'Inter', sans-serif", fontVariantNumeric: "tabular-nums" }}>
                    {lotsWithPoly.length} {lotsWithPoly.length === 1 ? "lote georreferenciado" : "lotes georreferenciados"}
                  </span>
                </div>
                <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/[0.02]">
                  <LotsOverviewMap lots={lotsWithPoly} height={320} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 p-4 border-t border-white/8">
                    {lotsWithPoly.map(l => (
                      <div key={l.id} className="flex items-center gap-2 text-sm">
                        <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
                        <span className="font-medium text-text truncate">{l.name}</span>
                        <span className="text-text/45 truncate">· {l.crop}</span>
                        {l.area && Number(l.area) > 0 && (
                          <span className="text-text/45 ml-auto whitespace-nowrap">{Number(l.area).toLocaleString("pt-BR")} ha</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-text/35 mt-2 italic">
                  Polígonos declarados pelo produtor. Cobertura PRODES/INPE para verificação satelital.
                </p>
              </section>
            ) : null;

            // ─── Ordem por modo ───
            // Commodity: prova primeiro (identity → trust → stats → mapa → produtos → práticas → atividade)
            // Produto:   narrativa primeiro (sobre → produtos → mapa terroir → práticas → atividade → stats → trust)
            return isProdutoMode
              // Showcase narrative: stats heroicos → sobre → quote editorial → galeria → produtos → mapa terroir → práticas → reconhecimentos → atividade → trust
              ? [heroStatsBlock, aboutBlock, pullQuoteBlock, galleryBlock, productsBlock, lotsMapBlock, praticasBlock, recognitionBlock, atividadeBlock, trustBlock].filter(Boolean)
              : [identityBlock, trustBlock, statsBlock, lotsMapBlock, productsBlock, praticasBlock, atividadeBlock].filter(Boolean);
          })()}
        </div>

        {/* ── Coluna direita (sidebar conversão) ── */}
        <aside className="hidden md:block">
          <div className="sticky top-20 space-y-4">
            {canSendProposal ? (
              isProdutoMode ? (
                // Luxury cream paper card
                <div className="p-6" style={{
                  background: "rgba(250, 247, 240, 0.97)",
                  boxShadow: "0 30px 80px -24px rgba(0,0,0,0.45), 0 0 0 1px rgba(26,24,20,0.05)",
                  borderRadius: "2px",
                }}>
                  <span className="block mb-3" style={{ width: "24px", height: "2px", background: "#C8A878" }} />
                  <h3 className="mb-2.5 font-semibold" style={{
                    fontSize: "19px",
                    letterSpacing: "-0.012em",
                    color: "#1A1814",
                    lineHeight: 1.2,
                  }}>
                    Comprar deste produtor
                  </h3>
                  <p className="mb-5" style={{
                    fontSize: "13.5px",
                    lineHeight: 1.55,
                    color: "rgba(26, 24, 20, 0.62)",
                  }}>
                    Fale direto com {displayFarmName || "o produtor"} sobre disponibilidade, lotes e distribuição.
                  </p>
                  <button onClick={() => { setPropForm({ message: "", volume: "", products: [] }); setShowProposal(true); }}
                    className="w-full py-3 transition-all flex items-center justify-center gap-2"
                    style={{
                      background: "#1F3A2E",
                      color: "#FAF7F0",
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "11px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.18em",
                      borderRadius: "2px",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#284C3C"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#1F3A2E"; }}>
                    <Send size={13} /> Quero comprar
                  </button>
                  <p className="text-center mt-3" style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "11px",
                    color: "rgba(26, 24, 20, 0.42)",
                  }}>Resposta em até 48h</p>
                </div>
              ) : (
                <div className="rounded-[14px] border border-white/12 bg-white/[0.02] p-5">
                  <h3 className="text-[20px] font-semibold text-text leading-snug mb-2">
                    Faça uma proposta direta
                  </h3>
                  <p className="text-sm text-text/55 leading-relaxed mb-4">
                    Sem intermediários — conexão direta com {displayFarmName || "o produtor"} para volume, prazo e logística.
                  </p>
                  <button onClick={() => { setPropForm({ message: "", volume: "", products: [] }); setShowProposal(true); }}
                    className="w-full py-3 rounded-xl bg-accent text-bg text-sm font-semibold hover:bg-accent/90 transition-colors flex items-center justify-center gap-2">
                    <Send size={14} /> Enviar proposta
                  </button>
                  <p className="text-[12px] text-text/40 text-center mt-3">Resposta em até 48h</p>
                </div>
              )
            ) : isViewingOther ? (
              <div className="rounded-[14px] border border-white/12 bg-white/[0.02] p-5">
                <h3 className="text-[20px] font-semibold text-text leading-snug mb-2">
                  {isProdutoMode ? "Interessado nestes produtos?" : "Quer fazer negócio?"}
                </h3>
                <p className="text-sm text-text/55 mb-4 leading-relaxed">
                  {isProdutoMode
                    ? "Cadastre-se para falar direto com a fazenda e descobrir onde comprar."
                    : "Compradores cadastrados enviam propostas diretas a esta e outras fazendas."}
                </p>
                <button onClick={() => go(1)}
                  className="w-full py-3 rounded-xl bg-accent text-bg text-sm font-semibold hover:bg-accent/90 transition-colors">
                  Criar conta
                </button>
              </div>
            ) : null}

            {/* QR Code CTA — apenas dono */}
            {!isViewingOther && user && (
              <button onClick={() => go(10)}
                className="w-full rounded-[14px] border border-white/12 bg-white/[0.02] hover:bg-white/[0.04] transition-colors p-4 flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-accent/12 flex items-center justify-center text-accent shrink-0">
                  <QrCode size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-text">QR Code de rastreio</div>
                  <div className="text-xs text-text/45 mt-0.5">Compartilhe sua origem</div>
                </div>
                <ChevronRight size={16} className="text-text/40 shrink-0" />
              </button>
            )}

            {/* Trust mini-list */}
            <div className="rounded-[14px] border border-white/12 bg-white/[0.02] p-4">
              <p className="text-xs font-semibold text-text/50 mb-3">Por que confiar?</p>
              <ul className="space-y-2.5 text-sm text-text/75">
                <li className="flex items-start gap-2"><ShieldCheck size={14} className="text-accent mt-0.5 shrink-0" /> EUDR — Regulamento UE 2023/1115</li>
                <li className="flex items-start gap-2"><Globe size={14} className="text-accent mt-0.5 shrink-0" /> Imagens PRODES/INPE para desmate</li>
                <li className="flex items-start gap-2"><MapPin size={14} className="text-accent mt-0.5 shrink-0" /> Lotes com geocoordenadas registradas</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>

      {/* ── QR Code CTA mobile (apenas dono) ── */}
      {!isViewingOther && user && (
        <div className="md:hidden max-w-6xl mx-auto px-4 mt-8">
          <button onClick={() => go(10)}
            className="w-full rounded-[14px] border border-white/12 bg-white/[0.02] p-4 flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-accent/12 flex items-center justify-center text-accent shrink-0">
              <QrCode size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-text">QR Code de rastreio</div>
              <div className="text-xs text-text/45 mt-0.5">Compartilhe sua origem</div>
            </div>
            <ChevronRight size={16} className="text-text/40 shrink-0" />
          </button>
        </div>
      )}

      {/* ── Sticky CTA bottom mobile (proposta) ── */}
      {canSendProposal && (
        <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-bg/95 backdrop-blur-xl border-t border-white/10 px-4 py-3">
          <button onClick={() => { setPropForm({ message: "", volume: "", products: [] }); setShowProposal(true); }}
            className="w-full py-3.5 rounded-xl bg-accent text-bg text-sm font-semibold hover:bg-accent/90 transition-colors flex items-center justify-center gap-2">
            <Send size={15} /> Enviar proposta para {displayFarmName?.split(" ")[0] || "produtor"}
          </button>
        </div>
      )}

      {/* ── Modal proposta ── */}
      <AnimatePresence>
        {showProposal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
            onClick={() => setShowProposal(false)}>
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-bg border border-white/15 w-full max-w-md rounded-3xl p-6">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <p className="text-[12px] text-text/55 mb-1">Nova proposta</p>
                  <h3 className="text-[20px] font-semibold text-text leading-snug">{displayFarmName}</h3>
                  {displayLocation && <p className="text-xs text-text/45 mt-0.5 flex items-center gap-1"><MapPin size={11} />{displayLocation}</p>}
                </div>
                <button onClick={() => setShowProposal(false)} className="text-text/40 hover:text-text mt-1"><X size={18} /></button>
              </div>

              {products.length > 0 && (
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-text/70 mb-2">Produtos de interesse</label>
                  <div className="flex flex-wrap gap-1.5">
                    {products.map(p => (
                      <button key={p} onClick={() => setPropForm(f => ({ ...f, products: f.products.includes(p) ? f.products.filter(x => x !== p) : [...f.products, p] }))}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${propForm.products.includes(p) ? "bg-accent text-bg border-accent" : "border-white/15 text-text/70 hover:border-white/30"}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-xs font-semibold text-text/70 mb-2">Volume estimado</label>
                <input value={propForm.volume} onChange={e => setPropForm(f => ({ ...f, volume: e.target.value }))}
                  placeholder="Ex: 500 toneladas / safra"
                  className="w-full px-4 py-3 border border-white/15 bg-white/5 focus:border-accent focus:bg-white/8 rounded-xl text-sm text-text placeholder-text/35 outline-none transition-colors" />
              </div>

              <div className="mb-6">
                <label className="block text-xs font-semibold text-text/70 mb-2">Mensagem</label>
                <textarea value={propForm.message} onChange={e => setPropForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Apresente-se e descreva sua proposta de negócio…"
                  rows={4}
                  className="w-full px-4 py-3 border border-white/15 bg-white/5 focus:border-accent focus:bg-white/8 rounded-xl text-sm text-text placeholder-text/35 outline-none resize-none transition-colors" />
              </div>

              <button onClick={() => {
                if (!user || !propForm.message.trim()) { addToast("Escreva uma mensagem.", "error"); return; }
                sendProposal({
                  fromEmail: user.email,
                  fromName: user.name || user.farmName,
                  fromCompany: user.farmName,
                  fromRole: user.role ?? "outro",
                  toFarmName: displayFarmName || "Fazenda",
                  products: propForm.products,
                  volume: propForm.volume,
                  message: propForm.message,
                });
                addToast(`Proposta enviada para ${displayFarmName}!`);
                setShowProposal(false);
              }}
                className="w-full py-3.5 rounded-xl bg-accent text-bg text-sm font-semibold hover:bg-accent/90 transition-colors flex items-center justify-center gap-2">
                <Send size={14} /> Enviar proposta
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Lightbox ── */}
      {galleryIdx !== null && allPhotos[galleryIdx] && createPortal(
        <div
          className="fixed inset-0 z-[3000] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setGalleryIdx(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            onClick={() => setGalleryIdx(null)}
          ><X size={20} /></button>
          {galleryIdx > 0 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              onClick={ev => { ev.stopPropagation(); setGalleryIdx(i => (i ?? 1) - 1); }}
            ><ChevronLeft size={22} /></button>
          )}
          {galleryIdx < allPhotos.length - 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              onClick={ev => { ev.stopPropagation(); setGalleryIdx(i => (i ?? 0) + 1); }}
            ><ChevronRight size={22} /></button>
          )}
          <motion.div
            key={galleryIdx}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-lg w-full"
            onClick={ev => ev.stopPropagation()}
          >
            <img
              src={allPhotos[galleryIdx].src}
              alt={allPhotos[galleryIdx].lotName}
              className="w-full rounded-2xl object-cover max-h-[70vh]"
              style={allPhotos[galleryIdx].transform ? { transform: `translate(${allPhotos[galleryIdx].transform!.x}px,${allPhotos[galleryIdx].transform!.y}px) scale(${allPhotos[galleryIdx].transform!.scale})`, transformOrigin: "center" } : undefined}
            />
            <div className="mt-3 text-center">
              <p className="text-xs font-black uppercase tracking-widest text-white">{allPhotos[galleryIdx].lotName}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-wide mt-0.5">{allPhotos[galleryIdx].crop}</p>
              <p className="text-[9px] text-white/25 mt-1">{galleryIdx + 1} / {allPhotos.length}</p>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </motion.div>
  );
};

const LOT_TIPOS = ["Agrícola", "Pecuária", "Café"];
const LOT_STATUS = [
  { key: "ativo", label: "Ativo", color: "text-accent border-accent" },
  { key: "colhendo", label: "Em Colheita", color: "text-green-400 border-green-400" },
  { key: "colhido", label: "Colhido", color: "text-white/40 border-white/20" },
];

const LotForm = ({ initial, onSave, onBack, onDelete }: {
  initial: Partial<Lot>; onSave: (d: Omit<Lot, "id">) => void; onBack: () => void; onDelete?: () => void;
}) => {
  const { addToast, addPhotoToLot } = useContext(AppContext);
  const [tipo, setTipo] = useState(initial.tipo ?? 0);
  const [status, setStatus] = useState<Lot["status"]>(initial.status ?? "ativo");
  const [form, setForm] = useState({ name: initial.name || "", crop: initial.crop || "", area: initial.area || "", date: initial.date || "", colheita: initial.colheita || "", variedade: initial.variedade || "", destino: initial.destino || "", notes: initial.notes || "" });
  const [mapPoints, setMapPoints] = useState<[number, number][]>(initial.mapPoints || []);
  const [photos, setPhotos] = useState<string[]>(initial.photos || []);
  const [photoTransforms, setPhotoTransforms] = useState<LogoTransform[]>(initial.photoTransforms || []);
  const [cropPhotoIdx, setCropPhotoIdx] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDel, setConfirmDel] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleAddPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (photos.length >= MAX_PHOTOS_PER_LOT) { addToast(`Limite de ${MAX_PHOTOS_PER_LOT} fotos por lote.`, "error"); e.target.value = ""; return; }
    if (!file.type.startsWith("image/")) { addToast("Arquivo inválido. Envie uma imagem.", "error"); e.target.value = ""; return; }
    const reader = new FileReader();
    reader.onloadend = async () => {
      const b64 = await resizeImage(reader.result as string);
      if (!validateImageMime(b64)) { addToast("Arquivo inválido.", "error"); return; }
      setPhotos(p => [...p, b64]);
      setPhotoTransforms(t => [...t, { scale: 1, x: 0, y: 0 }]);
      addToast("Foto adicionada!");
    };
    reader.readAsDataURL(file); e.target.value = "";
  };

  const removePhoto = (i: number) => {
    setPhotos(ph => ph.filter((_, j) => j !== i));
    setPhotoTransforms(t => t.filter((_, j) => j !== i));
  };

  const handleSave = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Obrigatório";
    if (!form.crop.trim()) errs.crop = "Obrigatório";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave({ ...form, tipo, status, mapPoints, photos, photoTransforms, notes: form.notes, colheita: form.colheita, variedade: form.variedade, destino: form.destino });
  };

  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto md:grid md:grid-cols-2 md:gap-x-10">
      <div className="md:col-span-2 mb-8">
        <label className="block text-[10px] font-bold uppercase tracking-widest text-accent mb-4">Tipo de produção</label>
        <div className="flex gap-2">
          {LOT_TIPOS.map((t, i) => <button key={i} onClick={() => setTipo(i)} className={`flex-1 py-3 border text-[10px] font-bold uppercase tracking-widest transition-all rounded-2xl ${tipo === i ? "bg-accent text-bg border-accent" : "bg-transparent text-white/60 border-white/20"}`}>{t}</button>)}
        </div>
      </div>

      <Field label="Nome do lote" value={form.name} onChange={f("name")} placeholder="Ex: Lote 7 — Soja" error={errors.name} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Cultura" value={form.crop} onChange={f("crop")} placeholder="Soja" error={errors.crop} />
        <Field label="Área (ha)" value={form.area} onChange={f("area")} placeholder="45" type="number" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Data plantio" value={form.date} onChange={f("date")} placeholder="" type="date" />
        <Field label="Data colheita" value={form.colheita} onChange={f("colheita")} placeholder="" type="date" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Cultivar / variedade" value={form.variedade} onChange={f("variedade")} placeholder="Ex: M8372 IPRO" />
        <Field label="Destino / comprador" value={form.destino} onChange={f("destino")} placeholder="Ex: Bunge, exportação UE" />
      </div>
      <Field label="Observações" value={form.notes} onChange={f("notes")} placeholder="Notas sobre o lote..." tall />

      <div className="mb-6">
        <label className="block text-[10px] font-bold uppercase tracking-widest text-accent mb-3">Status</label>
        <div className="flex gap-2 flex-wrap">
          {LOT_STATUS.map(s => <button key={s.key} onClick={() => setStatus(s.key as Lot["status"])} className={`px-3 py-2 border text-[9px] font-bold uppercase tracking-widest transition-all rounded-full ${status === s.key ? s.color + " bg-white/5" : "border-white/20 text-white/40"}`}>{s.label}</button>)}
        </div>
      </div>

      <div className="mb-8 md:col-span-2">
        <label className="block text-[10px] font-bold uppercase tracking-widest text-accent mb-4">Área no mapa (satélite)</label>
        <MapDrawerBtn points={mapPoints} onChange={setMapPoints} name={form.name} />
      </div>

      {cropPhotoIdx !== null && photos[cropPhotoIdx] && (
        <LogoCropEditor
          src={photos[cropPhotoIdx]}
          transform={photoTransforms[cropPhotoIdx] ?? { scale: 1, x: 0, y: 0 }}
          onSave={t => setPhotoTransforms(prev => { const next = [...prev]; next[cropPhotoIdx] = t; return next; })}
          onClose={() => setCropPhotoIdx(null)}
        />
      )}
      <div className="mb-10">
        <div className="flex justify-between items-center mb-3">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-accent">Fotos do lote ({photos.length})</label>
          <button onClick={() => photoRef.current?.click()} className="text-[9px] font-bold uppercase tracking-widest text-accent flex items-center gap-1"><Plus size={12} /> Adicionar</button>
        </div>
        <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handleAddPhoto} />
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p, i) => {
              const t = photoTransforms[i] ?? { scale: 1, x: 0, y: 0 };
              return (
                <div key={i} className="relative aspect-square overflow-hidden">
                  <img src={p} alt={`foto ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `translate(${t.x}px, ${t.y}px) scale(${t.scale})`, transformOrigin: "center" }} />
                  <button onClick={() => removePhoto(i)} className="absolute top-1 right-1 w-5 h-5 bg-black/70 flex items-center justify-center"><X size={10} className="text-white" /></button>
                  <button onClick={() => setCropPhotoIdx(i)} style={{ position: "absolute", bottom: 4, left: 4, background: "rgba(10,10,10,0.75)", border: "none", color: "#E0FF22", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", padding: "3px 6px", display: "flex", alignItems: "center", gap: 3 }}>
                    <Edit2 size={8} /> Ajustar
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Btn full onClick={handleSave} icon={CheckCircle2}>Salvar lote</Btn>

      {onDelete && (
        <div className="mt-4">
          {!confirmDel
            ? <Btn full outline icon={Trash2} onClick={() => setConfirmDel(true)}>Excluir lote</Btn>
            : (
              <div className="border border-red-500 p-4 rounded-2xl">
                <p className="text-xs text-white/80 uppercase tracking-widest font-bold mb-4">Confirmar exclusão?</p>
                <div className="flex gap-3">
                  <Btn full onClick={onDelete} icon={Trash2}>Excluir</Btn>
                  <Btn full outline onClick={() => setConfirmDel(false)}>Cancelar</Btn>
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
};

const SNovoLote = ({ go }: { go: (s: number) => void }) => {
  const { addLot, addToast, setCurrentLotId, lots } = useContext(AppContext);
  const { canAddLot, plan } = usePlan();
  const overLimit = !canAddLot(lots.length);

  const handleSave = (data: Omit<Lot, "id">) => {
    const id = addLot(data);
    setCurrentLotId(id);
    addToast("Lote cadastrado! QR Code gerado.");
    go(10);
  };

  return (
    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="min-h-screen bg-bg pb-28 md:pb-0">
      <TopBar title="Novo Lote" onBack={() => go(3)} />
      {overLimit ? (
        <div className="flex flex-col items-center justify-center p-10 text-center min-h-[60vh]">
          <div className="w-14 h-14 bg-accent/10 border border-accent/20 rounded-3xl flex items-center justify-center mb-4">
            <Landmark size={24} className="text-accent" />
          </div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-accent mb-2">Plano {plan.name}</p>
          <h3 className="text-xl font-black uppercase tracking-tight text-text mb-3">Limite de lotes atingido</h3>
          <p className="text-[11px] text-white/50 mb-6 max-w-xs leading-relaxed">
            O plano Gratuito permite apenas {plan.limits.lots} lote. Faça upgrade para cadastrar lotes ilimitados.
          </p>
          <Btn onClick={() => go(15)} icon={ChevronRight}>Ver planos</Btn>
          <button onClick={() => go(3)} className="mt-4 text-[9px] font-bold uppercase tracking-widest text-white/40 hover:text-white/60 transition-colors">Voltar ao início</button>
        </div>
      ) : (
        <LotForm initial={{}} onSave={handleSave} onBack={() => go(3)} />
      )}
    </motion.div>
  );
};

const SEditLote = ({ go }: { go: (s: number) => void }) => {
  const { lots, updateLot, deleteLot, currentLotId, addToast } = useContext(AppContext);
  const lot = lots.find(l => l.id === currentLotId);

  if (!lot) return <div className="min-h-screen bg-bg flex items-center justify-center text-white/40 text-xs uppercase tracking-widest">Lote não encontrado.</div>;

  const handleSave = (data: Omit<Lot, "id">) => {
    updateLot(currentLotId!, data);
    addToast("Lote atualizado!");
    go(8);
  };

  const handleDelete = () => {
    deleteLot(currentLotId!);
    addToast("Lote excluído.");
    go(8);
  };

  return (
    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="min-h-screen bg-bg pb-28 md:pb-0">
      <TopBar title="Editar Lote" onBack={() => go(8)} />
      <LotForm initial={lot} onSave={handleSave} onBack={() => go(8)} onDelete={handleDelete} />
    </motion.div>
  );
};

// Screen 7 — Produção
const SProducao = ({ go }: { go: (s: number) => void }) => {
  const { lots, events, setCurrentLotId } = useContext(AppContext);
  const [tab, setTab] = useState(0);
  const [filter, setFilter] = useState(-1); // -1 = all

  const filtered = filter === -1 ? lots : lots.filter(l => l.tipo === filter);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-bg pb-28 md:pb-0">
      <TopBar title="Produção"
        right={<button onClick={() => go(6)} className="flex items-center gap-2 text-accent text-[10px] font-bold uppercase tracking-widest"><Plus size={16} /> Novo</button>}
      />

      <div className="px-5 md:px-8 pt-4 max-w-5xl mx-auto">
        <div className="flex border-b border-white/10 mb-6">
          {["Lotes", "Atividade"].map((t, i) => (
            <button key={i} onClick={() => setTab(i)} className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-all ${tab === i ? "text-accent border-b-2 border-accent" : "text-white/40"}`}>{t}</button>
          ))}
        </div>

        {tab === 0 ? (
          <>
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
              {[{ label: "Todos", v: -1 }, { label: "Agrícola", v: 0 }, { label: "Pecuária", v: 1 }, { label: "Café", v: 2 }].map((f, i) => (
                <button key={i} onClick={() => setFilter(f.v)} className={`px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest border whitespace-nowrap ${filter === f.v ? "bg-accent text-bg border-accent" : "border-white/20 text-white/60"}`}>{f.label}</button>
              ))}
            </div>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Sprout size={40} className="text-white/20 mb-4" />
                <p className="text-xs text-white/40 uppercase tracking-widest mb-6">Nenhum lote cadastrado</p>
                <Btn onClick={() => go(6)} icon={Plus}>Novo lote</Btn>
              </div>
            ) : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{filtered.map((l, i) => {
              const st = LOT_STATUS.find(s => s.key === l.status);
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="border border-white/10 p-4 cursor-pointer hover:border-white/30 transition-colors rounded-2xl">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="text-xs font-black uppercase tracking-tight text-text mb-1">{l.name}</div>
                      <div className="text-[10px] text-white/60 font-medium">{LOT_TIPOS[l.tipo]} · {l.crop} · {l.area || "—"} ha</div>
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-widest border px-2 py-1 ${st?.color || "text-white/40 border-white/20"}`}>{st?.label}</span>
                  </div>
                  {l.photos?.length > 0 && (
                    <div className="flex gap-1.5 mb-3">
                      {l.photos.slice(0, 3).map((p, j) => <img key={j} src={p} className="w-10 h-10 object-cover border border-white/10" alt="" />)}
                      {l.photos.length > 3 && <div className="w-10 h-10 bg-white/5 flex items-center justify-center text-[9px] font-bold text-white/40">+{l.photos.length - 3}</div>}
                    </div>
                  )}
                  <div className="flex gap-3 mt-2">
                    <button onClick={() => { setCurrentLotId(l.id); go(12); }} className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-white/60 hover:text-accent transition-colors"><Edit2 size={12} /> Editar</button>
                    <button onClick={() => { setCurrentLotId(l.id); go(10); }} className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-white/60 hover:text-accent transition-colors"><QrCode size={12} /> QR Code</button>
                  </div>
                </motion.div>
              );
            })}</div>}
          </>
        ) : (
          <div className="border-t border-white/10">
            {events.length === 0 && <div className="py-8 text-xs text-white/40 uppercase tracking-widest">Nenhuma atividade registrada.</div>}
            {events.map((e, idx) => (
              <div key={idx} className="flex items-center gap-4 py-4 border-b border-white/10">
                <div className="text-accent">{e.type === "lote" ? <Sprout size={18} /> : e.type === "foto" ? <Camera size={18} /> : <Tractor size={18} />}</div>
                <div className="flex-1"><div className="text-xs font-bold uppercase tracking-wide text-text">{e.title}</div></div>
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{e.date}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Screen 8 — Mapa real com Leaflet + Esri Satellite
const SMapa = ({ go }: { go: (s: number) => void }) => {
  const { lots, user, saveUser, updateLot, setCurrentLotId, addToast } = useContext(AppContext);
  const [editingLot, setEditingLot] = useState<Lot | null>(null);
  const [editingFarmPin, setEditingFarmPin] = useState(false);
  const totalArea = lots.reduce((a, l) => a + (Number(l.area) || 0), 0);
  const mappedCount = lots.filter(l => l.mapPoints?.length > 2).length;

  // Mapa geral com todos os lotes
  const allPoints = lots.flatMap(l => l.mapPoints || []);
  const farmPin = user?.farmPin;
  const overviewCenter: [number, number] = farmPin
    ? farmPin
    : allPoints.length > 0
      ? [allPoints.reduce((s, p) => s + p[0], 0) / allPoints.length, allPoints.reduce((s, p) => s + p[1], 0) / allPoints.length]
      : [-15.77972, -47.92972];

  const overviewRef = useRef<HTMLDivElement>(null);
  const overviewMapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!overviewRef.current || overviewMapRef.current) return;
    const map = L.map(overviewRef.current, { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false })
      .setView(overviewCenter, allPoints.length > 0 || farmPin ? 12 : 4);
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19 }).addTo(map);
    lots.forEach(l => {
      if (l.mapPoints?.length > 2) {
        L.polygon(l.mapPoints, { color: "#E0FF22", weight: 2, fillOpacity: 0.2 }).addTo(map)
          .bindTooltip(l.name, { permanent: false, className: "leaflet-tooltip-rastro" });
      }
    });
    // Pin de sede da fazenda — ícone distinto
    if (farmPin) {
      const hqIcon = L.divIcon({
        html: `<div style="width:34px;height:34px;background:#E0FF22;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #0A0A0A;box-shadow:0 2px 8px rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;">
          <span style="transform:rotate(45deg);font-size:15px;line-height:1">🏠</span>
        </div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
        className: "",
      });
      L.marker(farmPin, { icon: hqIcon }).addTo(map)
        .bindTooltip(user?.farmName || "Sede da fazenda", { permanent: false, className: "leaflet-tooltip-rastro" });
    }
    overviewMapRef.current = map;
    return () => { map.remove(); overviewMapRef.current = null; };
  }, [lots, farmPin]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-bg pb-28 md:pb-0">
      {editingLot && (
        <MapDrawer
          name={editingLot.name}
          initialPoints={editingLot.mapPoints || []}
          onSave={(pts) => {
            updateLot(editingLot.id, { mapPoints: pts });
            addToast(`Área de ${editingLot.name} salva! (~${calcAreaHa(pts).toFixed(2)} ha estimados)`);
          }}
          onClose={() => setEditingLot(null)}
        />
      )}
      {editingFarmPin && (
        <FarmPinDrawer
          initialPin={farmPin}
          onSave={(pin) => {
            saveUser({ ...user!, farmPin: pin });
            addToast("Sede da fazenda salva!");
          }}
          onClose={() => setEditingFarmPin(false)}
        />
      )}

      <TopBar title="Mapa da propriedade" onBack={() => go(3)} />

      {/* Mapa satélite geral */}
      <div className="relative border-b border-white/10" style={{ height: 280, isolation: "isolate" }}>
        <div ref={overviewRef} style={{ height: "100%", width: "100%" }} />
        {allPoints.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <MapPin size={28} className="text-accent mb-2" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Nenhuma área mapeada ainda</p>
            <p className="text-[9px] text-white/30 mt-1">Clique em "Mapear" em um lote abaixo</p>
          </div>
        )}
        <div className="absolute bottom-3 left-3 right-3 bg-bg/85 backdrop-blur-sm border border-white/10 p-3 flex justify-between items-center pointer-events-none">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-accent">Área total (estimativa)</div>
            <div className="text-base font-black text-text">~{totalArea} ha</div>
          </div>
          <div className="text-right">
            <div className="text-[9px] font-bold uppercase tracking-widest text-white/40">{mappedCount}/{lots.length} lotes mapeados</div>
            <div className="text-[8px] text-white/25 mt-0.5">Esri World Imagery</div>
          </div>
        </div>
      </div>

      <div className="p-5 max-w-5xl mx-auto">

        {/* Sede da fazenda */}
        <div className="mb-5">
          <h4 className="text-[11px] font-bold text-accent uppercase tracking-widest mb-3">Sede da Fazenda</h4>
          <div className="border border-white/10 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg ${farmPin ? "bg-accent/15 border border-accent/30" : "bg-white/5 border border-white/10"}`}>
                🏠
              </div>
              <div>
                <div className={`text-[11px] font-black uppercase tracking-tight ${farmPin ? "text-text" : "text-text/40"}`}>
                  {farmPin ? "Sede marcada" : "Sem localização"}
                </div>
                <div className="text-[9px] text-white/35 mt-0.5">
                  {farmPin
                    ? `${farmPin[0].toFixed(5)}, ${farmPin[1].toFixed(5)}`
                    : "Marque a localização principal da fazenda"}
                </div>
              </div>
            </div>
            <button onClick={() => setEditingFarmPin(true)}
              className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-accent hover:text-text transition-colors shrink-0">
              <MapPin size={12} /> {farmPin ? "Editar sede" : "Marcar sede"}
            </button>
          </div>
        </div>

        {/* Badge EUDR */}
        <div className="flex items-center gap-4 mb-6 p-4 border border-accent bg-accent/5">
          <ShieldCheck size={22} className="text-accent shrink-0" />
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-text mb-0.5">Sem sobreposição com desmatamento</div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-accent">Verificado via PRODES/INPE · Conformidade EUDR</div>
          </div>
        </div>

        {/* Lista de lotes */}
        <h4 className="text-[11px] font-bold text-accent uppercase tracking-widest mb-4">Lotes</h4>
        {lots.length === 0 && (
          <div className="flex flex-col items-center py-10 text-center">
            <MapPin size={32} className="text-white/20 mb-4" />
            <p className="text-xs text-white/40 uppercase tracking-widest mb-4">Nenhum lote cadastrado</p>
            <Btn onClick={() => go(6)} icon={Plus} small>Novo lote</Btn>
          </div>
        )}
        <div className="space-y-3">
          {lots.map((l) => {
            const hasPoly = l.mapPoints?.length > 2;
            const lotArea = hasPoly ? calcAreaHa(l.mapPoints).toFixed(2) : null;
            return (
              <div key={l.id} className="border border-white/10 p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-black uppercase tracking-tight text-text mb-0.5 truncate">{l.name} — {l.crop}</div>
                    <div className="text-[10px] text-white/50">
                      {l.area ? `~${l.area} ha declarados` : "Área não declarada"} · {LOT_TIPOS[l.tipo]}
                      {lotArea && <span className="text-accent ml-2">· ~{lotArea} ha mapeados</span>}
                    </div>
                  </div>
                  <span className={`text-[8px] font-bold uppercase tracking-widest border px-2 py-1 shrink-0 ${hasPoly ? "text-accent border-accent/40" : "text-white/30 border-white/15"}`}>
                    {hasPoly ? "Mapeado" : "Sem mapa"}
                  </span>
                </div>

                {/* Mini mapa do lote — key muda quando pontos mudam, forçando remount (Bug 2 fix) */}
                {hasPoly && (
                  <div key={l.mapPoints.length + "-" + l.id} className="mb-3 border border-white/10 overflow-hidden" style={{ height: 140, isolation: "isolate" }}>
                    <LeafletMap points={l.mapPoints as [number, number][]} height={140} />
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setEditingLot(l)}
                    className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-accent hover:text-text transition-colors">
                    <MapPin size={12} /> {hasPoly ? "Editar área" : "Mapear área"}
                  </button>
                  <button onClick={() => { setCurrentLotId(l.id); go(12); }}
                    className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-white/40 hover:text-text transition-colors">
                    <Edit2 size={12} /> Editar lote
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

// Screen 9 — Galeria
const SGaleria = ({ go }: { go: (s: number) => void }) => {
  const { lots, addPhotoToLot, addToast } = useContext(AppContext);
  const [selectedLot, setSelectedLot] = useState<string>("all");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ESC fecha lightbox da galeria
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLightbox(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  const allPhotos = lots.flatMap(l => (l.photos || []).map((p, i) => ({ photo: p, transform: l.photoTransforms?.[i] ?? { scale: 1, x: 0, y: 0 }, lotName: l.name, lotId: l.id })));
  const shown = selectedLot === "all" ? allPhotos : allPhotos.filter(p => p.lotId === selectedLot);

  const handleAddPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (!f.type.startsWith("image/")) { addToast("Arquivo inválido.", "error"); e.target.value = ""; return; }
    if (f.size > MAX_FILE_BYTES) { addToast("Imagem muito grande. Máximo 5MB.", "error"); e.target.value = ""; return; }
    const targetLot = selectedLot === "all" ? lots[0]?.id : selectedLot;
    if (!targetLot) { addToast("Cadastre um lote primeiro.", "error"); return; }
    const reader = new FileReader();
    reader.onloadend = async () => { addPhotoToLot(targetLot, await resizeImage(reader.result as string)); addToast("Foto adicionada!"); };
    reader.readAsDataURL(f); e.target.value = "";
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-bg pb-28 md:pb-0">
      <TopBar title="Galeria"
        right={<button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 text-accent text-[10px] font-bold uppercase tracking-widest"><Plus size={16} /> Foto</button>}
      />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAddPhoto} />

      <div className="px-5 md:px-8 pt-4 max-w-5xl mx-auto">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          <button onClick={() => setSelectedLot("all")} className={`px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest border whitespace-nowrap ${selectedLot === "all" ? "bg-accent text-bg border-accent" : "border-white/20 text-white/60"}`}>Todos</button>
          {lots.map(l => (
            <button key={l.id} onClick={() => setSelectedLot(l.id)} className={`px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest border whitespace-nowrap ${selectedLot === l.id ? "bg-accent text-bg border-accent" : "border-white/20 text-white/60"}`}>{l.name}</button>
          ))}
        </div>

        {shown.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ImageIcon size={48} className="text-white/20 mb-4" />
            <p className="text-xs text-white/40 uppercase tracking-widest mb-6">Nenhuma foto ainda</p>
            <Btn onClick={() => fileRef.current?.click()} icon={Camera}>Adicionar foto</Btn>
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1">
            {shown.map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                className="aspect-square relative cursor-pointer group overflow-hidden" onClick={() => setLightbox(item.photo)}>
                <img src={item.photo} alt={item.lotName} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `translate(${item.transform.x}px, ${item.transform.y}px) scale(${item.transform.scale})`, transformOrigin: "center" }} />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-end p-1">
                  <span className="text-[8px] font-bold uppercase tracking-widest text-white opacity-0 group-hover:opacity-100 transition-opacity truncate">{item.lotName}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {lightbox && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center" onClick={() => setLightbox(null)}>
            <button className="absolute top-4 right-4 text-white/80 hover:text-white"><X size={28} /></button>
            <img src={lightbox} className="max-w-full max-h-full object-contain" alt="fullscreen" />
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};

// ─── Tela pública do lote (acessada via QR) ───
const SLotPublico = ({ lotId, go }: { lotId: string; go: (s: number) => void }) => {
  const appUrl = window.location.origin + "/";
  const [apiLot, setApiLot] = useState<import("./services/api").ApiLotPublic | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.lots.getPublic(lotId)
      .then(l => { if (alive) setApiLot(l); })
      .catch(() => { if (alive) setApiLot(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [lotId]);

  // Fallback offline: localStorage no mesmo dispositivo do produtor
  const localLot = useMemo(() => {
    if (apiLot) return null;
    try {
      const lots: Lot[] = JSON.parse(localStorage.getItem("rastro_lots") || "[]");
      return lots.find(l => l.id === lotId) || null;
    } catch { return null; }
  }, [apiLot, lotId]);
  const localUser = useMemo(() => {
    if (apiLot) return null;
    try { return JSON.parse(localStorage.getItem("rastro_user") || "null") as AppUser | null; }
    catch { return null; }
  }, [apiLot]);

  // SEO dinâmico — usa dados do lote quando disponíveis (carrega progressivamente)
  const seoFarmName = apiLot?.user.farmName ?? localUser?.farmName ?? "";
  const seoLotName = apiLot?.name ?? localLot?.name ?? "";
  const seoCrop = apiLot?.crop ?? localLot?.crop ?? "";
  const seoLocation = apiLot?.user.location ?? localUser?.location ?? "";
  const seoCover = apiLot?.photos?.[0]?.url ?? (localLot?.photos?.[0] || undefined);
  const lotJsonLd = (seoLotName && (apiLot || localLot)) ? {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `https://quemproduz.com/lote/${lotId}`,
    name: `${seoLotName}${seoCrop ? " — " + seoCrop : ""}`,
    description: `Lote rastreável de ${seoFarmName || "fazenda brasileira"}${seoLocation ? " em " + seoLocation : ""}. Origem certificada via QR e conformidade EUDR.`,
    category: seoCrop || "Agricultural product",
    image: seoCover ? [seoCover] : ["https://quemproduz.com/og-default.png"],
    url: `https://quemproduz.com/lote/${lotId}`,
    brand: seoFarmName ? { "@type": "Brand", name: seoFarmName } : undefined,
    manufacturer: seoFarmName ? {
      "@type": "Organization",
      name: seoFarmName,
      address: seoLocation ? {
        "@type": "PostalAddress",
        addressLocality: seoLocation,
        addressCountry: "BR",
      } : undefined,
    } : undefined,
  } : null;
  useSEO({
    title: seoLotName && seoFarmName ? `${seoLotName} — ${seoFarmName}` : "Lote rastreável — Quem Produz",
    description: seoLotName
      ? `Lote ${seoLotName}${seoCrop ? " (" + seoCrop + ")" : ""} de ${seoFarmName || "fazenda brasileira"}${seoLocation ? " em " + seoLocation : ""}. Origem rastreada com QR e conformidade EUDR.`
      : "Página pública do lote com origem rastreada via QR. Quem Produz — Rastreabilidade EUDR para o agro brasileiro.",
    path: `/lote/${lotId}`,
    image: seoCover,
    type: "article",
    jsonLd: lotJsonLd ?? undefined,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-8 text-center">
        <Logo className="mb-6" />
        <p className="text-xs text-white/40 uppercase tracking-widest">Carregando lote...</p>
      </div>
    );
  }

  if (!apiLot && (!localLot || !localUser)) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-8 text-center">
        <Logo className="mb-6" />
        <p className="text-xs text-white/50 uppercase tracking-widest mb-8">Lote não encontrado ou sem dados.</p>
        <Btn onClick={() => { window.history.replaceState({}, "", appUrl); go(0); }}>Ir para o início</Btn>
      </div>
    );
  }

  // Normaliza dados (API ou localStorage)
  const lot = apiLot ? {
    id: apiLot.id,
    name: apiLot.name,
    crop: apiLot.crop,
    area: apiLot.area != null ? String(apiLot.area) : "",
    date: apiLot.harvestDate ? apiLot.harvestDate.slice(0, 10) : "",
    tipo: 0,
    status: (apiLot.status === "colhendo" || apiLot.status === "colhido" ? apiLot.status : "ativo") as Lot["status"],
    notes: apiLot.notes || "",
    photos: (apiLot.photos || []).map(p => p.url),
    photoTransforms: (apiLot.photos || []).map(p => p.transform || { scale: 1, x: 0, y: 0 }),
    mapPoints: (apiLot.geoPolygon || []).map(p => [p.lat, p.lng] as [number, number]),
  } : localLot!;

  const user = apiLot ? {
    farmName: apiLot.user.farmName,
    location: apiLot.user.location,
    description: undefined as string | undefined,
    logo: apiLot.user.logoUrl,
    logoTransform: apiLot.user.logoTransform,
    certs: (apiLot.user.certs || []).map(c => c.name),
  } : localUser!;

  const totalAreaSource = apiLot ? (apiLot.user.area ?? 0) : (() => {
    try {
      const lots: Lot[] = JSON.parse(localStorage.getItem("rastro_lots") || "[]");
      return lots.reduce((a, l) => a + (Number(l.area) || 0), 0);
    } catch { return 0; }
  })();
  const totalArea = totalAreaSource;
  const lotPublicId = apiLot ? apiLot.id : (localLot?.apiId || lot.id);
  const lotUrl = `${window.location.origin}/lote/${encodeURIComponent(lotPublicId)}`;
  const st = LOT_STATUS.find(s => s.key === lot.status);

  const handleShare = async () => {
    try {
      if (navigator.share) { await navigator.share({ title: `${lot.name} — ${user.farmName}`, url: lotUrl }); }
      else { await navigator.clipboard.writeText(lotUrl); alert("Link copiado!"); }
    } catch { await navigator.clipboard.writeText(lotUrl).catch(() => {}); }
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-bg/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="text-[9px] font-bold uppercase tracking-widest text-accent border border-accent/40 px-2 py-1">EUDR ✓</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 md:px-8 pb-16">
        {/* Hero */}
        <div className="py-10 border-b border-white/10 md:grid md:grid-cols-2 md:gap-12 md:items-start">
          <div>
            <span className={`inline-block text-[9px] font-bold uppercase tracking-widest border px-2 py-1 mb-4 ${st?.color || "text-white/40 border-white/20"}`}>{st?.label || "Ativo"}</span>
            <h1 className="font-black text-4xl md:text-5xl uppercase tracking-tighter text-text leading-none mb-2">{lot.name}</h1>
            <p className="text-accent font-bold text-sm uppercase tracking-widest mb-1">{lot.crop}</p>
            <p className="text-white/50 text-xs uppercase tracking-widest flex items-center gap-1.5 mt-3">
              <MapPin size={11} /> {user.farmName} {user.location ? `— ${user.location}` : ""}
            </p>
          </div>

          {/* Stats */}
          <div className="mt-8 md:mt-0 grid grid-cols-3 gap-3">
            {[
              { n: lot.area ? `${lot.area} ha` : "—", l: "Área" },
              { n: LOT_TIPOS[lot.tipo] || "—", l: "Tipo" },
              { n: lot.date ? new Date(lot.date + "T00:00:00").toLocaleDateString("pt-BR", { month: "short", year: "numeric" }) : "—", l: "Plantio" },
            ].map((s, i) => (
              <div key={i} className="border border-white/10 p-4 text-center">
                <div className="text-sm font-black text-text leading-tight mb-1">{s.n}</div>
                <div className="text-[9px] text-white/40 font-bold uppercase tracking-widest">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Fazenda info */}
        <div className="py-8 border-b border-white/10 flex items-center gap-5">
          <div className="w-14 h-14 border border-white/20 overflow-hidden shrink-0 bg-white/5">
            {user.logo ? <LogoImg src={user.logo} transform={user.logoTransform} /> : <div className="w-full h-full flex items-center justify-center"><Sprout size={22} className="text-white/30" /></div>}
          </div>
          <div>
            <div className="text-sm font-black uppercase tracking-tight text-text">{user.farmName}</div>
            <div className="text-[10px] text-white/50 mt-1">{user.description || "Produtor rural certificado"}</div>
            <div className="flex gap-2 mt-3 flex-wrap">
              <span className="text-[8px] font-bold uppercase tracking-widest text-accent border border-accent/40 px-1.5 py-0.5 flex items-center gap-1"><ShieldCheck size={9}/> EUDR</span>
              {(user.certs || []).map((c, i) => <span key={i} className="text-[8px] font-bold uppercase tracking-widest text-white/50 border border-white/20 px-1.5 py-0.5">{c}</span>)}
            </div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-lg font-black text-text">{totalArea}</div>
            <div className="text-[9px] text-white/40 font-bold uppercase tracking-widest">ha total</div>
          </div>
        </div>

        {/* EUDR */}
        <div className="py-8 border-b border-white/10">
          <div className="flex items-center gap-4 p-5 border border-accent bg-accent/5 mb-4">
            <ShieldCheck size={28} className="text-accent shrink-0" />
            <div>
              <div className="text-sm font-black uppercase tracking-tight text-text mb-1">Conformidade EUDR</div>
              <div className="text-[10px] text-white/60 leading-relaxed">Sem sobreposição com área desmatada após 31/12/2020. Verificado via PRODES/INPE.</div>
            </div>
            <div className="ml-auto shrink-0">
              <span className="text-[9px] font-black uppercase tracking-widest text-accent">100% ✓</span>
            </div>
          </div>
          {lot.notes && (
            <div className="p-4 border border-white/10 bg-white/2">
              <div className="text-[9px] font-bold uppercase tracking-widest text-accent mb-2">Observações do produtor</div>
              <p className="text-xs text-white/60 leading-relaxed">{lot.notes}</p>
            </div>
          )}
        </div>

        {/* Mapa satélite real */}
        {lot.mapPoints?.length > 2 && (
          <div className="py-8 border-b border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] font-bold text-accent uppercase tracking-widest">Área delimitada</h3>
              <span className="text-[9px] text-white/40 font-bold uppercase tracking-widest">~{calcAreaHa(lot.mapPoints).toFixed(2)} ha (est.) · {lot.mapPoints.length} vértices</span>
            </div>
            <div className="border border-white/10 overflow-hidden" style={{ height: 280, isolation: "isolate" }}>
              <LeafletMap points={lot.mapPoints} height={280} />
            </div>
          </div>
        )}

        {/* Fotos */}
        {lot.photos?.length > 0 && (
          <div className="py-8 border-b border-white/10">
            <h3 className="text-[11px] font-bold text-accent uppercase tracking-widest mb-4">Fotos do lote ({lot.photos.length})</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {lot.photos.map((p, i) => {
                const t = lot.photoTransforms?.[i] ?? { scale: 1, x: 0, y: 0 };
                return (
                  <div key={i} className="aspect-video overflow-hidden border border-white/10">
                    <img src={p} alt={`foto ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `translate(${t.x}px, ${t.y}px) scale(${t.scale})`, transformOrigin: "center" }} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* QR + compartilhar */}
        <div className="py-8 flex flex-col items-center text-center">
          <div className="bg-white p-4 mb-6 inline-block">
            <QRDisplay value={lotUrl} size={160} />
          </div>
          <p className="text-[9px] text-white/30 uppercase tracking-widest mb-6 break-all max-w-xs">{lotUrl}</p>
          <div className="flex gap-3 flex-wrap justify-center">
            <Btn icon={Share2} onClick={handleShare}>Compartilhar</Btn>
            <Btn outline icon={Download} onClick={() => downloadQR(lotUrl, lot.name)}>Baixar QR</Btn>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-white/10 text-center">
          <p className="text-[9px] text-white/30 uppercase tracking-widest">Rastreabilidade verificada por <span className="text-accent">Quem Produz</span></p>
        </div>
      </div>
    </div>
  );
};

const SQRCode = ({ go }: { go: (s: number) => void }) => {
  const { lots, user, addToast } = useContext(AppContext);
  const [selectedId, setSelectedId] = useState(lots[lots.length - 1]?.id || "");
  const [syncing, setSyncing] = useState(false);
  const [syncedApiId, setSyncedApiId] = useState<string | null>(null);
  const lot = lots.find(l => l.id === selectedId) || lots[lots.length - 1];
  const effectiveApiId = lot?.apiId || syncedApiId;

  // URL aponta para o próprio app em /lote/:id (path SEO-friendly)
  // Prefere apiId (UUID do backend) — o lot.id local é Date.now() e não funciona em outros dispositivos
  const appBase = window.location.origin;
  const qrValue = lot ? `${appBase}/lote/${encodeURIComponent(effectiveApiId || lot.id)}` : appBase;
  const shareTitle = lot ? `${lot.name} — ${user?.farmName}` : user?.farmName || "Fazenda";

  // Reseta sync quando trocar de lote
  useEffect(() => { setSyncedApiId(null); }, [selectedId]);

  const handleSync = async () => {
    if (!lot) return;
    if (!api.token.get()) {
      addToast("Você precisa estar logado para ativar o QR público. Faça logout e login novamente.", "error");
      return;
    }
    setSyncing(true);
    try {
      const created = await api.lots.create({
        name: lot.name,
        crop: lot.crop,
        area: lot.area ? parseFloat(lot.area) : undefined,
        status: lot.status,
        notes: lot.notes,
        geoPolygon: lot.mapPoints?.length ? lot.mapPoints.map(([lat, lng]) => ({ lat, lng })) : undefined,
      });
      setSyncedApiId(created.id);
      // Persiste apiId no localStorage também
      try {
        const stored: Lot[] = JSON.parse(localStorage.getItem("rastro_lots") || "[]");
        const updated = stored.map(l => l.id === lot.id ? { ...l, apiId: created.id } : l);
        localStorage.setItem("rastro_lots", JSON.stringify(updated));
      } catch { /* ignore */ }
      addToast("Lote sincronizado! QR Code atualizado.", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast(`Falha na sincronização: ${msg}`, "error");
    } finally {
      setSyncing(false);
    }
  };

  if (lots.length === 0) return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-bg pb-28 md:pb-0 flex flex-col">
      <TopBar title="QR Code" onBack={() => go(3)} />
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <QrCode size={48} className="text-white/20 mb-4" />
        <p className="text-xs text-white/40 uppercase tracking-widest mb-6">Cadastre um lote para gerar o QR Code</p>
        <Btn onClick={() => go(6)} icon={Plus}>Novo lote</Btn>
      </div>
    </motion.div>
  );

  return (
    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="min-h-screen bg-bg pb-28 md:pb-0">
      <TopBar title="QR Code" onBack={() => go(3)} />
      <div className="p-6 md:p-10 flex flex-col items-center text-center mt-4 max-w-lg mx-auto">
        {lots.length > 1 && (
          <div className="w-full mb-8">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-accent mb-3">Selecionar lote</label>
            <div className="flex flex-col gap-2">
              {lots.map(l => (
                <button key={l.id} onClick={() => setSelectedId(l.id)} className={`w-full p-3 border text-left text-xs font-bold uppercase tracking-widest transition-all ${selectedId === l.id ? "bg-accent text-bg border-accent" : "border-white/20 text-white/60 hover:border-white/40"}`}>
                  {l.name} · {l.crop}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white p-5 mb-6 border border-white/20" style={{ width: 240, height: 240, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <QRDisplay value={qrValue} size={220} />
        </div>

        <h2 className="font-black text-2xl uppercase tracking-tighter text-text leading-tight mb-1">{lot?.name || "Fazenda"}</h2>
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-2">{lot?.crop} · {lot?.area ? `${lot.area} ha` : ""}</p>
        <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-2 break-all max-w-xs">{qrValue}</p>

        {/* Preview do que o stakeholder vê */}
        <div className="w-full my-6 p-4 border border-white/10 bg-white/2 text-left">
          <p className="text-[9px] font-bold uppercase tracking-widest text-accent mb-2">Ao escanear, o comprador verá:</p>
          <div className="space-y-1">
            {[`📋 Lote: ${lot?.name}`, `🌱 Cultura: ${lot?.crop}`, `📐 Área: ${lot?.area ? `~${lot.area} ha (est.)` : "—"}`, lot?.photos?.length ? `📷 ${lot.photos.length} foto(s)` : null].filter(Boolean).map((item, i) => (
              <p key={i} className="text-[10px] text-white/60">{item}</p>
            ))}
          </div>
        </div>

        {!effectiveApiId && (
          <div className="w-full mb-4 p-4 border border-yellow-500/40 bg-yellow-500/10 text-left rounded-xl">
            <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-400 mb-2">⚠ QR ainda não funciona em outros dispositivos</p>
            <p className="text-[10px] text-white/70 mb-3 leading-relaxed normal-case tracking-normal">Este lote está só neste navegador. Sincronize agora para que o QR funcione quando escaneado por compradores.</p>
            <Btn full onClick={handleSync} disabled={syncing}>
              {syncing ? "Sincronizando..." : "Sincronizar lote agora"}
            </Btn>
          </div>
        )}

        <div className="w-full space-y-3">
          <Btn full icon={Share2} onClick={() => doShare(qrValue, shareTitle, addToast)}>Compartilhar link</Btn>
          <Btn full outline icon={Download} onClick={() => downloadQR(qrValue, lot?.name || "fazenda")}>Baixar QR Code</Btn>
        </div>
      </div>
    </motion.div>
  );
};

const SDocs = ({ go }: { go: (s: number) => void }) => {
  const { user, lots, addToast } = useContext(AppContext);
  const { can } = usePlan();
  const [tab, setTab] = useState(0);
  const [paywallFeature, setPaywallFeature] = useState<string | null>(null);

  const guardedReport = (label: string, fn: () => void) => {
    if (!can("reportExport")) { setPaywallFeature(label); return; }
    fn();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-bg pb-28 md:pb-0">
      {paywallFeature && <PaywallModal feature={paywallFeature} onClose={() => setPaywallFeature(null)} onUpgrade={() => go(15)} />}
      <TopBar title="Documentos" onBack={() => go(3)} />
      <div className="px-5 md:px-8 pt-6 max-w-5xl mx-auto">
        <div className="flex border-b border-white/10 mb-8">
          {["Meus Docs", "Gerar Relatório"].map((t, i) => (
            <button key={i} onClick={() => setTab(i)} className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-all ${tab === i ? "text-accent border-b-2 border-accent" : "text-white/40 hover:text-white/80"}`}>{t}</button>
          ))}
        </div>

        {tab === 0 ? (
          <div className="space-y-4">
            {lots.length === 0 && <p className="text-xs text-white/40 uppercase tracking-widest py-4">Cadastre lotes para gerar documentos.</p>}
            {lots.length > 0 && [
              { n: "Autodeclaração EUDR", d: new Date().toLocaleDateString("pt-BR"), i: ShieldCheck, action: () => guardedReport("Autodeclaração EUDR", () => openEUDR(user!, lots)) },
              { n: "Autodeclaração ESG", d: new Date().toLocaleDateString("pt-BR"), i: FileBarChart, action: () => guardedReport("Autodeclaração ESG", () => openESG(user!, lots)) },
            ].map((doc, i) => (
              <div key={i} className="p-4 border border-white/10 flex items-center gap-5 group cursor-pointer hover:border-accent transition-colors" onClick={doc.action}>
                <div className="text-white/40 group-hover:text-accent transition-colors"><doc.i size={24} /></div>
                <div className="flex-1">
                  <div className="text-xs font-bold uppercase tracking-wide text-text mb-1">{doc.n}</div>
                  <div className="text-[9px] font-bold uppercase tracking-widest text-white/40">{doc.d} · PDF</div>
                </div>
                <button className="text-white/40 group-hover:text-accent transition-colors"><Share2 size={20} /></button>
              </div>
            ))}
            <div className="p-4 border border-white/10 flex items-center gap-5 group">
              <div className="text-white/40 group-hover:text-accent transition-colors"><MapIcon size={24} /></div>
              <div className="flex-1">
                <div className="text-xs font-bold uppercase tracking-wide text-text mb-1">CAR</div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-white/40">Cadastro Ambiental Rural</div>
              </div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-white/40 border border-white/20 px-2 py-1">Ext.</span>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {[
              { t: "Autodeclaração EUDR", d: "Documento autodeclarado pelo produtor para organização e apresentação. Não constitui certificação oficial.", i: ShieldCheck, fn: () => guardedReport("Autodeclaração EUDR", () => { openEUDR(user!, lots); addToast("Autodeclaração EUDR gerada!"); }) },
              { t: "Autodeclaração ESG", d: "Resumo de práticas e indicadores declarados pelo produtor para apresentação a compradores e parceiros.", i: FileBarChart, fn: () => guardedReport("Autodeclaração ESG", () => { openESG(user!, lots); addToast("Autodeclaração ESG gerada!"); }) },
            ].map((r, i) => (
              <div key={i} className="p-5 border border-white/10">
                <div className="flex gap-5 mb-6">
                  <div className="text-accent"><r.i size={28} /></div>
                  <div>
                    <div className="text-sm font-bold uppercase tracking-wide text-text mb-2">{r.t}</div>
                    <div className="text-xs text-white/60 leading-relaxed">{r.d}</div>
                  </div>
                </div>
                <Btn full small outline onClick={r.fn} icon={FileText}>Gerar agora</Btn>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};


// ─────────────────────────────────────────────
// SPraticas — Caderno de Boas Práticas (autodeclaração)
// ─────────────────────────────────────────────

// Catálogo fixo de práticas, agrupadas por categoria.
// `key` é o identificador estável usado no banco (não muda nunca).
// `name` é o rótulo exibido (pode ser ajustado no futuro).
const PRACTICE_CATALOG: { id: string; label: string; emoji: string; items: { key: string; name: string; hint: string }[] }[] = [
  {
    id: "solo", label: "Manejo do solo", emoji: "🌱",
    items: [
      { key: "plantio_direto",        name: "Plantio direto",                 hint: "Semeadura sem revolver o solo, mantendo cobertura morta." },
      { key: "rotacao_cultura",       name: "Rotação de cultura",             hint: "Alterna culturas diferentes na mesma área para preservar o solo." },
      { key: "cobertura_permanente",  name: "Cobertura permanente",           hint: "Mantém o solo sempre coberto (palhada, braquiária, etc.)." },
      { key: "terraceamento",         name: "Terraceamento / curvas de nível", hint: "Estruturas que reduzem erosão em terreno inclinado." },
      { key: "calagem_correcao",      name: "Calagem e correção do solo",     hint: "Análise de solo e aplicação de calcário/gesso conforme laudo." },
    ],
  },
  {
    id: "biodiversidade", label: "Biodiversidade", emoji: "🌳",
    items: [
      { key: "recomposicao_app",      name: "Recomposição de APP",            hint: "Plantio de árvores nativas em Áreas de Preservação Permanente." },
      { key: "manutencao_rl",         name: "Manutenção da Reserva Legal",    hint: "Conservação ativa do percentual exigido por bioma." },
      { key: "corredor_ecologico",    name: "Corredor ecológico",             hint: "Faixas vegetadas conectando fragmentos de mata." },
      { key: "fauna_protegida",       name: "Proteção de fauna nativa",       hint: "Práticas de manejo que evitam caça e atropelamento." },
    ],
  },
  {
    id: "pecuaria", label: "Pecuária", emoji: "🐄",
    items: [
      { key: "ilpf",                  name: "ILPF — Integração lavoura-pecuária-floresta", hint: "Sistema integrado que combina os três componentes." },
      { key: "pastagem_rotacionada",  name: "Pastagem rotacionada",           hint: "Divisão da pastagem em piquetes com descanso e rotação." },
      { key: "recuperacao_pastagem",  name: "Recuperação de pastagem degradada", hint: "Reforma de pasto com calagem, adubação e replantio." },
      { key: "bem_estar_animal",      name: "Bem-estar animal",               hint: "Práticas de manejo que reduzem estresse do rebanho." },
    ],
  },
  {
    id: "agua", label: "Recursos hídricos", emoji: "💧",
    items: [
      { key: "protecao_nascente",     name: "Proteção de nascente",           hint: "Cercamento e revegetação no entorno da nascente." },
      { key: "irrigacao_eficiente",   name: "Irrigação eficiente",            hint: "Gotejamento, microaspersão ou pivô com manejo." },
      { key: "captacao_chuva",        name: "Captação de água da chuva",      hint: "Cisternas, barraginhas, terraços de retenção." },
    ],
  },
  {
    id: "insumos", label: "Insumos", emoji: "🧪",
    items: [
      { key: "bioinsumos",            name: "Bioinsumos",                     hint: "Uso de microorganismos e produtos biológicos." },
      { key: "fixacao_biologica_n",   name: "Fixação biológica de nitrogênio", hint: "Inoculação de bactérias fixadoras (ex: rizóbios)." },
      { key: "mip",                   name: "MIP — Manejo Integrado de Pragas", hint: "Monitoramento e controle baseado em níveis de dano." },
      { key: "adubacao_organica",     name: "Adubação orgânica",              hint: "Esterco, composto, biofertilizantes." },
    ],
  },
  {
    id: "residuos", label: "Resíduos", emoji: "♻️",
    items: [
      { key: "compostagem",           name: "Compostagem",                    hint: "Aproveitamento de resíduos orgânicos em adubo." },
      { key: "embalagens_logistica",  name: "Devolução de embalagens (InpEV)", hint: "Tríplice lavagem e devolução em posto credenciado." },
      { key: "reuso_efluentes",       name: "Reúso de efluentes",             hint: "Tratamento e reaproveitamento de água residuária." },
    ],
  },
];

const SPraticas = ({ go }: { go: (s: number) => void }) => {
  const { user, lots, addToast } = useContext(AppContext);
  const [practices, setPractices] = useState<api.ApiPractice[]>([]);
  const [documents, setDocuments] = useState<api.ApiDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);     // key being edited
  const [draft, setDraft] = useState<{ active: boolean; startDate: string; notes: string; photoUrl: string }>(
    { active: true, startDate: "", notes: "", photoUrl: "" }
  );
  const [saving, setSaving] = useState(false);

  // Documentos
  const [docModal, setDocModal] = useState<{ type: string; label: string } | null>(null);
  const [docDraft, setDocDraft] = useState<{ name: string; expiresAt: string; notes: string; file: File | null }>(
    { name: "", expiresAt: "", notes: "", file: null }
  );
  const [docSaving, setDocSaving] = useState(false);

  const apiOn = API_ENABLED && !!api.token.get();

  // ESC fecha modal de documento
  useEffect(() => {
    if (!docModal) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !docSaving) setDocModal(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [docModal, docSaving]);

  useEffect(() => {
    if (!apiOn) { setLoading(false); return; }
    let alive = true;
    Promise.all([
      api.practices.list().catch(() => [] as api.ApiPractice[]),
      api.documents.list().catch(() => [] as api.ApiDocument[]),
    ])
      .then(([ps, ds]) => { if (!alive) return; setPractices(ps); setDocuments(ds); })
      .catch(() => { if (alive) addToast("Não foi possível carregar seus dados", "error"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [apiOn]);

  const byKey = useMemo(() => {
    const m: Record<string, api.ApiPractice> = {};
    for (const p of practices) m[p.key] = p;
    return m;
  }, [practices]);

  const totalCount = PRACTICE_CATALOG.reduce((s, c) => s + c.items.length, 0);
  const activeCount = practices.filter(p => p.active).length;
  const withPhoto = practices.filter(p => p.active && p.photoUrl).length;

  const openEditor = (key: string) => {
    const existing = byKey[key];
    setDraft({
      active: existing?.active ?? true,
      startDate: existing?.startDate ? String(existing.startDate).slice(0, 10) : "",
      notes: existing?.notes ?? "",
      photoUrl: existing?.photoUrl ?? "",
    });
    setEditing(key);
  };

  const closeEditor = () => { setEditing(null); };

  const handlePhotoUpload = async (file: File) => {
    if (!apiOn) {
      addToast("Faça login pra anexar fotos", "info");
      return;
    }
    try {
      const url = await api.photos.upload(file);
      setDraft(d => ({ ...d, photoUrl: url }));
    } catch {
      addToast("Falha no upload da foto", "error");
    }
  };

  const saveDraft = async (catalogItem: { key: string; name: string }, category: string) => {
    if (!apiOn) {
      addToast("Faça login pra salvar suas práticas", "info");
      return;
    }
    setSaving(true);
    try {
      const saved = await api.practices.upsert({
        category,
        key: catalogItem.key,
        name: catalogItem.name,
        active: draft.active,
        startDate: draft.startDate || null,
        photoUrl: draft.photoUrl || null,
        notes: draft.notes || null,
      });
      setPractices(prev => {
        const idx = prev.findIndex(p => p.key === saved.key);
        if (idx >= 0) { const copy = [...prev]; copy[idx] = saved; return copy; }
        return [saved, ...prev];
      });
      addToast(draft.active ? "Prática registrada!" : "Prática desmarcada", "success");
      closeEditor();
    } catch {
      addToast("Erro ao salvar", "error");
    } finally {
      setSaving(false);
    }
  };

  const removePractice = async (id: string) => {
    if (!apiOn) return;
    try {
      await api.practices.remove(id);
      setPractices(prev => prev.filter(p => p.id !== id));
      addToast("Prática removida", "info");
    } catch {
      addToast("Erro ao remover", "error");
    }
  };

  const openDocModal = (type: string, label: string) => {
    setDocDraft({ name: "", expiresAt: "", notes: "", file: null });
    setDocModal({ type, label });
  };
  const closeDocModal = () => setDocModal(null);

  const saveDocument = async () => {
    if (!apiOn) { addToast("Faça login pra anexar documentos", "info"); return; }
    if (!docModal) return;
    if (!docDraft.file) { addToast("Selecione um arquivo (PDF, JPEG ou PNG)", "error"); return; }
    if (!docDraft.name.trim()) { addToast("Informe um nome / identificador", "error"); return; }
    setDocSaving(true);
    try {
      const created = await api.documents.upload({
        file: docDraft.file,
        type: docModal.type,
        name: docDraft.name.trim(),
        expiresAt: docDraft.expiresAt || null,
        notes: docDraft.notes || null,
      });
      setDocuments(prev => [created, ...prev]);
      addToast("Documento anexado!", "success");
      closeDocModal();
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Erro no upload", "error");
    } finally {
      setDocSaving(false);
    }
  };

  const removeDocument = async (id: string) => {
    if (!apiOn) return;
    try {
      await api.documents.remove(id);
      setDocuments(prev => prev.filter(d => d.id !== id));
      addToast("Documento removido", "info");
    } catch {
      addToast("Erro ao remover documento", "error");
    }
  };

  const handleGenerateDossie = () => {
    if (!user) return;
    openDossie(user, lots, practices, documents);
    addToast("Dossiê gerado — abra o HTML e use Ctrl+P pra salvar como PDF", "success");
  };

  const docsByType = useMemo(() => {
    const m: Record<string, api.ApiDocument[]> = {};
    for (const d of documents) {
      (m[d.type] ||= []).push(d);
    }
    return m;
  }, [documents]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="min-h-screen bg-bg pb-32 md:pb-10">
      <TopBar title="Minha Fazenda em Prática" onBack={() => go(3)} right={<ThemeToggle />} />

      <div className="px-5 md:px-8 max-w-5xl mx-auto">
        {/* Aviso de autodeclaração */}
        <div className="mb-4 p-4 border border-yellow-500/30 bg-yellow-500/5 rounded-2xl flex items-start gap-3">
          <AlertTriangle size={16} className="text-yellow-500 shrink-0 mt-0.5" />
          <div className="text-[11px] text-white/70 leading-relaxed">
            <span className="font-bold text-yellow-400 uppercase tracking-widest text-[9px] block mb-1">Autodeclaração</span>
            Você organiza aqui o que já faz na fazenda. As informações são <b>declaradas pelo produtor</b> e não substituem auditoria, certificação ou análise de crédito. Servem como vitrine de transparência pra compradores, bancos e parceiros.
          </div>
        </div>

        {/* Botão de Dossiê */}
        <button onClick={handleGenerateDossie}
          className="w-full mb-6 py-3 px-4 bg-accent text-bg rounded-2xl flex items-center justify-center gap-2 font-black text-[11px] uppercase tracking-widest hover:opacity-90 transition-opacity">
          <FileText size={14} />
          Gerar Dossiê PDF (práticas + documentos + lotes)
        </button>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { value: activeCount, label: "Práticas declaradas" },
            { value: `${activeCount}/${totalCount}`, label: "Do catálogo" },
            { value: withPhoto, label: "Com foto" },
          ].map((s, i) => (
            <div key={i} className="border border-white/10 bg-white/[0.02] rounded-2xl p-3 text-center">
              <div className="text-xl font-black text-text">{s.value}</div>
              <div className="text-[8px] font-bold uppercase tracking-widest mt-0.5 text-text/35">{s.label}</div>
            </div>
          ))}
        </div>

        {loading && <p className="text-white/40 text-xs text-center py-6">Carregando práticas...</p>}

        {!loading && PRACTICE_CATALOG.map(category => (
          <div key={category.id} className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{category.emoji}</span>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-accent">{category.label}</h3>
              <span className="text-[9px] font-bold text-white/30">
                {category.items.filter(i => byKey[i.key]?.active).length} / {category.items.length}
              </span>
            </div>
            <div className="space-y-2">
              {category.items.map(item => {
                const declared = byKey[item.key];
                const isActive = !!declared?.active;
                return (
                  <div key={item.key}
                    className={`border rounded-2xl p-3 transition-colors ${isActive ? "border-accent/40 bg-accent/[0.04]" : "border-white/8 bg-white/[0.02]"}`}>
                    <div className="flex items-start gap-3">
                      <button onClick={() => openEditor(item.key)}
                        className={`shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors mt-0.5 ${isActive ? "bg-accent border-accent" : "border-white/20"}`}
                        aria-label={isActive ? "Editar prática" : "Marcar prática"}>
                        {isActive && <Check size={14} className="text-bg" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <span className={`text-xs font-bold uppercase tracking-wide ${isActive ? "text-text" : "text-white/70"}`}>{item.name}</span>
                          {declared?.startDate && (
                            <span className="text-[9px] font-bold text-accent/70 uppercase tracking-widest">
                              desde {new Date(declared.startDate).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-white/40 mt-0.5">{item.hint}</p>
                        {declared?.notes && (
                          <p className="text-[10px] text-white/55 mt-1.5 italic">"{declared.notes}"</p>
                        )}
                        {declared?.photoUrl && (
                          <img src={declared.photoUrl} alt={item.name}
                            className="mt-2 w-32 h-20 object-cover rounded-lg border border-white/10" />
                        )}
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => openEditor(item.key)}
                            className="text-[8px] font-black uppercase tracking-widest text-accent hover:text-accent/70 transition-colors">
                            {declared ? "Editar" : "Declarar"}
                          </button>
                          {declared && (
                            <button onClick={() => removePractice(declared.id)}
                              className="text-[8px] font-black uppercase tracking-widest text-white/30 hover:text-red-400 transition-colors">
                              Remover
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Documentos da Propriedade */}
        {!loading && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📁</span>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-accent">Documentos da Propriedade</h3>
              <span className="text-[9px] font-bold text-white/30">
                {documents.length} {documents.length === 1 ? "anexado" : "anexados"}
              </span>
            </div>
            <p className="text-[10px] text-white/40 mb-3">
              Anexe PDFs ou fotos de CAR, CCIR, ITR, licenças e outros documentos. Apenas você vê esses arquivos — eles entram no seu dossiê PDF.
            </p>

            <div className="space-y-2">
              {Object.entries(DOC_TYPE_LABELS).map(([typeId, label]) => {
                const docsOfType = docsByType[typeId] || [];
                return (
                  <div key={typeId} className="border border-white/8 bg-white/[0.02] rounded-2xl p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold uppercase tracking-wide text-text">{label}</div>
                        {docsOfType.length === 0 && (
                          <p className="text-[10px] text-white/30 mt-1">Nenhum arquivo anexado</p>
                        )}
                      </div>
                      <button onClick={() => openDocModal(typeId, label)}
                        className="text-[8px] font-black uppercase tracking-widest text-accent hover:text-accent/70 transition-colors shrink-0">
                        + Anexar
                      </button>
                    </div>
                    {docsOfType.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {docsOfType.map(d => {
                          const expDate = d.expiresAt ? new Date(d.expiresAt) : null;
                          const isExpired = expDate && expDate.getTime() < Date.now();
                          const expSoon = expDate && !isExpired && (expDate.getTime() - Date.now()) / 86400000 <= 60;
                          return (
                            <div key={d.id} className="flex items-center gap-2 p-2 bg-white/[0.02] border border-white/8 rounded-lg">
                              <FileText size={12} className="text-white/40 shrink-0" />
                              <a href={d.url} target="_blank" rel="noopener noreferrer"
                                className="text-[11px] text-text hover:text-accent flex-1 min-w-0 truncate">
                                {d.name}
                              </a>
                              {expDate && (
                                <span className={`text-[9px] font-bold uppercase tracking-widest shrink-0 ${isExpired ? "text-red-400" : expSoon ? "text-yellow-400" : "text-white/40"}`}>
                                  {isExpired ? "Vencido" : expSoon ? "Vence em breve" : expDate.toLocaleDateString("pt-BR")}
                                </span>
                              )}
                              <button onClick={() => removeDocument(d.id)}
                                className="text-white/30 hover:text-red-400 shrink-0" aria-label="Remover">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Editor modal */}
      {editing && (() => {
        const allItems = PRACTICE_CATALOG.flatMap(c => c.items.map(i => ({ ...i, category: c.id })));
        const item = allItems.find(i => i.key === editing);
        if (!item) return null;
        return createPortal(
          <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
            onClick={closeEditor}>
            <div onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-bg border border-white/15 rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
              style={{ fontFamily: "var(--font-sans)" }}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/40 mb-1">Declarar prática</p>
                  <h3 className="text-base font-black text-text uppercase tracking-tight">{item.name}</h3>
                </div>
                <button onClick={closeEditor} className="text-white/40 hover:text-text"><X size={18} /></button>
              </div>

              <p className="text-[11px] text-white/55 leading-relaxed mb-5">{item.hint}</p>

              <label className="flex items-center gap-3 mb-4 cursor-pointer">
                <input type="checkbox" checked={draft.active}
                  onChange={e => setDraft(d => ({ ...d, active: e.target.checked }))}
                  className="w-5 h-5 accent-accent" />
                <span className="text-xs font-bold text-text">Adoto essa prática na fazenda</span>
              </label>

              <div className="mb-4">
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Desde quando? (opcional)</label>
                <input type="date" value={draft.startDate}
                  onChange={e => setDraft(d => ({ ...d, startDate: e.target.value }))}
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-[11px] text-text outline-none focus:border-accent/50" />
              </div>

              <div className="mb-4">
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Observação (opcional)</label>
                <textarea rows={3} value={draft.notes}
                  maxLength={1000}
                  onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
                  placeholder="Ex: rotação soja-milho-braquiária desde 2018"
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-[11px] text-text placeholder:text-white/25 outline-none focus:border-accent/50 resize-none" />
              </div>

              <div className="mb-5">
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Foto (opcional)</label>
                {draft.photoUrl ? (
                  <div className="relative">
                    <img src={draft.photoUrl} alt="" className="w-full h-40 object-cover rounded-xl border border-white/15" />
                    <button onClick={() => setDraft(d => ({ ...d, photoUrl: "" }))}
                      className="absolute top-2 right-2 w-8 h-8 bg-bg/80 backdrop-blur rounded-lg flex items-center justify-center text-white/70 hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 w-full py-6 border border-dashed border-white/20 rounded-xl text-white/40 cursor-pointer hover:border-accent/40 hover:text-accent transition-colors">
                    <Camera size={16} />
                    <span className="text-[11px] font-bold uppercase tracking-widest">Anexar foto</span>
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); }} />
                  </label>
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={closeEditor}
                  className="flex-1 py-3 border border-white/15 text-white/60 text-[10px] font-black uppercase tracking-widest rounded-xl hover:border-white/30">
                  Cancelar
                </button>
                <button onClick={() => saveDraft(item, item.category)} disabled={saving}
                  className="flex-1 py-3 bg-accent text-bg text-[10px] font-black uppercase tracking-widest rounded-xl disabled:opacity-50">
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}

      {/* Document upload modal */}
      {docModal && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={closeDocModal}>
          <div onClick={e => e.stopPropagation()}
            className="w-full max-w-md bg-bg border border-white/15 rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
            style={{ fontFamily: "var(--font-sans)" }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/40 mb-1">Anexar documento</p>
                <h3 className="text-base font-black text-text uppercase tracking-tight">{docModal.label}</h3>
              </div>
              <button onClick={closeDocModal} className="text-white/40 hover:text-text"><X size={18} /></button>
            </div>

            <p className="text-[11px] text-white/55 leading-relaxed mb-5">
              Aceita PDF, JPEG ou PNG (máx 10 MB). O arquivo fica privado — só aparece no seu dossiê.
            </p>

            <div className="mb-4">
              <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Arquivo *</label>
              {docDraft.file ? (
                <div className="flex items-center gap-2 p-3 bg-white/5 border border-white/15 rounded-xl">
                  <FileText size={14} className="text-accent" />
                  <span className="text-[11px] text-text flex-1 truncate">{docDraft.file.name}</span>
                  <button onClick={() => setDocDraft(d => ({ ...d, file: null }))}
                    className="text-white/40 hover:text-red-400"><X size={14} /></button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 w-full py-6 border border-dashed border-white/20 rounded-xl text-white/40 cursor-pointer hover:border-accent/40 hover:text-accent transition-colors">
                  <FileText size={16} />
                  <span className="text-[11px] font-bold uppercase tracking-widest">Selecionar arquivo</span>
                  <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (f.size > 10 * 1024 * 1024) { addToast("Arquivo passa de 10 MB", "error"); return; }
                      setDocDraft(d => ({ ...d, file: f, name: d.name || f.name.replace(/\.[^.]+$/, "") }));
                    }} />
                </label>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Nome / identificador *</label>
              <input type="text" value={docDraft.name} maxLength={160}
                onChange={e => setDocDraft(d => ({ ...d, name: e.target.value }))}
                placeholder="Ex: CAR Fazenda Boa Vista"
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-[11px] text-text placeholder:text-white/25 outline-none focus:border-accent/50" />
            </div>

            <div className="mb-4">
              <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Validade (opcional)</label>
              <input type="date" value={docDraft.expiresAt}
                onChange={e => setDocDraft(d => ({ ...d, expiresAt: e.target.value }))}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-[11px] text-text outline-none focus:border-accent/50" />
            </div>

            <div className="mb-5">
              <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Observação (opcional)</label>
              <textarea rows={2} value={docDraft.notes} maxLength={1000}
                onChange={e => setDocDraft(d => ({ ...d, notes: e.target.value }))}
                placeholder="Ex: protocolo nº ..."
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-[11px] text-text placeholder:text-white/25 outline-none focus:border-accent/50 resize-none" />
            </div>

            <div className="flex gap-2">
              <button onClick={closeDocModal}
                className="flex-1 py-3 border border-white/15 text-white/60 text-[10px] font-black uppercase tracking-widest rounded-xl hover:border-white/30">
                Cancelar
              </button>
              <button onClick={saveDocument} disabled={docSaving}
                className="flex-1 py-3 bg-accent text-bg text-[10px] font-black uppercase tracking-widest rounded-xl disabled:opacity-50">
                {docSaving ? "Enviando..." : "Anexar"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </motion.div>
  );
};


// ─────────────────────────────────────────────
// SPlanos — Pricing & Upgrade
// ─────────────────────────────────────────────

const SPlanos = ({ go }: { go: (s: number) => void }) => {
  const { user, saveUser, addToast } = useContext(AppContext);
  useSEO({
    title: "Planos e preços — Quem Produz",
    description: "Comece grátis com 30 dias de trial. Planos para produtores, cooperativas e compradores. Rastreabilidade EUDR, lotes ilimitados e suporte dedicado.",
    path: "/planos",
  });
  const { tier } = usePlan();
  const [loading, setLoading] = useState<PlanTier | null>(null);

  const handleSelect = async (planId: PlanTier) => {
    if (planId === tier) return;
    if (planId === "free") {
      saveUser({ ...user!, plan: "free", trialEndsAt: undefined });
      addToast("Plano alterado para Gratuito");
      go(3);
      return;
    }
    setLoading(planId);
    try {
      const { url } = await paymentService.createCheckoutSession({
        plan: planId,
        userId: user?.email ?? "",
        email: user?.email ?? "",
        successUrl: `${window.location.origin}?plan_success=${planId}`,
        cancelUrl: window.location.href,
      });
      if (url.startsWith("#")) {
        // Período de lançamento — trial gratuito de 30 dias
        const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        saveUser({ ...user!, plan: planId, trialEndsAt });
        addToast(`Plano ${PLANS[planId].name} ativado — 30 dias grátis!`, "success");
        go(3);
      } else {
        window.location.href = url;
      }
    } catch {
      addToast("Erro ao processar. Tente novamente.", "error");
    } finally {
      setLoading(null);
    }
  };

  const ORDER: PlanTier[] = ["free", "pro", "business"];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-bg pb-28 md:pb-0">
      <TopBar title="Planos" onBack={() => go(tier === "free" ? 3 : 4)} />
      <div className="p-5 md:p-8 max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-[9px] font-bold uppercase tracking-widest text-accent mb-2">Quem Produz</p>
          <h2 className="text-2xl font-black uppercase tracking-tight text-text mb-2">Escolha seu plano</h2>
          <p className="text-[11px] text-white/50 max-w-xs mx-auto leading-relaxed">Comece com <b className="text-accent">30 dias grátis</b>. Rastreabilidade completa, sem cartão de crédito.</p>
        </div>

        {/* Plan cards */}
        <div className="space-y-4">
          {ORDER.map((planId) => {
            const p = PLANS[planId];
            const isCurrent = tier === planId;
            const isPro = planId === "pro";
            const isLoading = loading === planId;
            return (
              <div key={planId} className={`relative border rounded-3xl p-6 transition-all duration-200 ${isPro ? "border-accent bg-accent/5" : "border-white/10"}`}>
                {isPro && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-bg text-[8px] font-black uppercase tracking-widest px-4 py-1 rounded-full">
                    Mais popular
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute top-5 right-5 bg-white/10 text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-full text-white/50">
                    Plano atual
                  </div>
                )}

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-black text-text">
                    {p.price === 0 ? "Grátis" : `R$\u00a0${p.price}`}
                  </span>
                  {p.price > 0 && <span className="text-[10px] text-white/40 font-bold">/mês</span>}
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-accent mb-1">{p.name}</p>
                <p className="text-[11px] text-white/50 mb-5">{p.description}</p>

                {/* Feature list */}
                <ul className="space-y-2 mb-6">
                  {p.highlights.map((h, i) => (
                    <li key={i} className="flex items-center gap-2 text-[11px] text-text/80">
                      <Check size={11} className="text-accent shrink-0" />
                      {h}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelect(planId)}
                  disabled={isCurrent || isLoading}
                  className={`w-full py-3.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-2xl ${
                    isCurrent
                      ? "bg-white/5 text-white/25 cursor-default border border-white/10"
                      : isPro
                      ? "bg-accent text-bg hover:bg-accent/90 active:scale-[.98]"
                      : "border border-white/20 text-text hover:border-accent/60 active:scale-[.98]"
                  }`}
                >
                  {isLoading ? "Aguarde..." : isCurrent ? "Plano atual" : planId === "free" ? "Usar gratuitamente" : `Começar 30 dias grátis`}
                </button>
              </div>
            );
          })}
        </div>

        {/* Trust & payment info */}
        <div className="mt-8 p-5 border border-white/10 rounded-2xl space-y-3">
          <p className="text-[9px] font-bold uppercase tracking-widest text-white/40">Pagamento & Segurança</p>
          <div className="space-y-2">
            {[
              "30 dias grátis pra testar — sem cartão de crédito",
              "Cancele quando quiser, sem multa",
              "Dados de pagamento nunca armazenados no app",
              "Suporte via e-mail incluído em todos os planos",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] text-white/50">
                <Check size={10} className="text-accent/60 shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Trial de lançamento */}
        <div className="mt-4 p-4 border border-accent/30 bg-accent/5 rounded-2xl">
          <p className="text-[9px] font-bold uppercase tracking-widest text-accent mb-1">Oferta de lançamento</p>
          <p className="text-[10px] text-white/55 leading-relaxed">
            Use qualquer plano <b className="text-text">grátis por 30 dias</b>, sem cartão de crédito. Sem cobrança automática — você decide se continua ao final do período.
          </p>
        </div>

      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────
// Reset password / Verify email (acessadas via link de e-mail)
// ─────────────────────────────────────────────

const SResetPassword = ({ token, onDone }: { token: string; onDone: () => void }) => {
  const { addToast } = useContext(AppContext);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (pwd.length < 6) { addToast("Senha precisa de ao menos 6 caracteres", "error"); return; }
    if (pwd !== pwd2) { addToast("As senhas não conferem", "error"); return; }
    setBusy(true);
    try {
      await api.auth.resetPassword(token, pwd);
      setDone(true);
      addToast("Senha redefinida! Faça login.", "success");
      setTimeout(onDone, 1200);
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Erro ao redefinir senha", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
      <div className="max-w-sm w-full">
        <Logo className="mb-8 mx-auto" />
        <h2 className="font-black text-3xl uppercase tracking-tighter text-text mb-2">Nova senha</h2>
        <p className="text-[10px] uppercase tracking-widest text-white/50 mb-6">
          {done ? "Senha redefinida com sucesso" : "Escolha uma senha nova para sua conta"}
        </p>
        {!done && (
          <>
            <Field label="Nova senha" value={pwd} onChange={e => setPwd(e.target.value)} placeholder="Mínimo 6 caracteres" type="password" autoComplete="new-password" />
            <Field label="Confirmar senha" value={pwd2} onChange={e => setPwd2(e.target.value)} placeholder="Repita a senha" type="password" autoComplete="new-password" />
            <Btn full onClick={submit} disabled={busy}>{busy ? "Redefinindo..." : "Redefinir senha"}</Btn>
            <button onClick={onDone} className="text-[10px] font-bold uppercase tracking-widest text-white/40 mt-6 w-full text-center hover:text-white/60 transition-colors">
              Cancelar
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const SVerifyEmail = ({ token, onDone }: { token: string; onDone: () => void }) => {
  const [status, setStatus] = useState<"checking" | "ok" | "error">("checking");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let alive = true;
    api.auth.verifyEmail(token)
      .then(() => { if (alive) { setStatus("ok"); setMsg("E-mail confirmado!"); } })
      .catch((e) => {
        if (!alive) return;
        setStatus("error");
        setMsg(e instanceof Error ? e.message : "Token inválido ou expirado");
      });
    return () => { alive = false; };
  }, [token]);

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
      <div className="max-w-sm w-full text-center">
        <Logo className="mb-8 mx-auto" />
        {status === "checking" && <p className="text-xs uppercase tracking-widest text-white/60">Confirmando...</p>}
        {status === "ok" && (
          <>
            <CheckCircle2 size={48} className="text-accent mx-auto mb-4" />
            <h2 className="font-black text-2xl uppercase tracking-tighter text-text mb-2">{msg}</h2>
            <p className="text-[10px] uppercase tracking-widest text-white/50 mb-8">Sua conta está pronta para uso</p>
            <Btn full onClick={onDone}>Continuar</Btn>
          </>
        )}
        {status === "error" && (
          <>
            <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
            <h2 className="font-black text-2xl uppercase tracking-tighter text-text mb-2">Não foi possível confirmar</h2>
            <p className="text-xs text-white/60 mb-8">{msg}</p>
            <Btn full onClick={onDone}>Voltar</Btn>
          </>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// App Shell
// ─────────────────────────────────────────────

// Mapeia números de tela ↔ paths de URL (para SEO/links diretos)
const SCREEN_PATHS: Record<number, string> = {
  0: "/",
  1: "/cadastro",
  2: "/login",
  3: "/app",
  4: "/app/perfil",
  5: "/app/vitrine",
  6: "/app/lotes/novo",
  7: "/app/lotes",
  8: "/app/mapa",
  9: "/app/galeria",
  10: "/app/qr",
  11: "/app/documentos",
  12: "/app/lotes/editar",
  // 13 (SLotPublico) é dinâmico → /lote/:id
  14: "/app/praticas",
  15: "/planos",
  16: "/vitrine",
};

const pathToScreen = (pathname: string): number => {
  if (/^\/lote\//.test(pathname)) return 13;
  if (/^\/fazenda\//.test(pathname)) return 5;
  for (const [k, v] of Object.entries(SCREEN_PATHS)) {
    if (v === pathname) return parseInt(k, 10);
  }
  return 0;
};

const AppContent = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Detect ?reset=token, ?verify=token in URL (links de e-mail — backward compat)
  const [resetToken, setResetToken] = useState<string | null>(() => {
    const t = new URLSearchParams(window.location.search).get("reset");
    if (t) window.history.replaceState({}, "", window.location.pathname);
    return t;
  });
  const [verifyToken, setVerifyToken] = useState<string | null>(() => {
    const t = new URLSearchParams(window.location.search).get("verify");
    if (t) window.history.replaceState({}, "", window.location.pathname);
    return t;
  });

  // Backward-compat: ?lot=ID na URL → redireciona para /lote/:id
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const legacyLot = sp.get("lot");
    if (legacyLot) {
      navigate(`/lote/${encodeURIComponent(legacyLot)}`, { replace: true });
    }
  }, [navigate]);

  // Deriva lotId da URL: /lote/:id
  const lotParam = useMemo<string | null>(() => {
    const m = location.pathname.match(/^\/lote\/([^/]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }, [location.pathname]);

  // Deriva número da tela a partir do pathname
  const s = useMemo(() => pathToScreen(location.pathname), [location.pathname]);

  const { user, logout, setViewingFarmId } = useContext(AppContext);
  const { theme } = useContext(ThemeContext);
  const showNav = !!user && s >= 3 && s !== 13 && s !== 16;

  // Se URL é /fazenda/:id, populate viewingFarmId antes de renderizar SPublicProfile
  useEffect(() => {
    const m = location.pathname.match(/^\/fazenda\/([^/]+)/);
    if (m) {
      setViewingFarmId(decodeURIComponent(m[1]));
    }
  }, [location.pathname, setViewingFarmId]);

  useEffect(() => {
    document.body.style.backgroundColor = theme === "dark" ? "#0A0A0A" : "#F5F5F0";
  }, [theme]);

  useEffect(() => {
    // Se logou estando em landing/cadastro/login, vai pro dashboard
    if (user && (s === 0 || s === 1 || s === 2)) {
      navigate("/app", { replace: true });
    }
    // Auth guard: rotas /app/* exigem usuário logado — redireciona pra login
    if (!user && location.pathname.startsWith("/app")) {
      navigate("/login", { replace: true });
    }
  }, [user, s, navigate, location.pathname]);

  const handleLogout = () => { logout(); navigate("/"); };

  // Mantém a assinatura go(n) para os 17 componentes existentes não precisarem mudar
  const go = (n: number): void => { navigate(SCREEN_PATHS[n] ?? "/"); };
  const setS = (n: number) => navigate(SCREEN_PATHS[n] ?? "/");

  const renderScreen = () => {
    switch (s) {
      case 0: return <SLanding go={go} />;
      case 1: return <SCadastro go={go} />;
      case 2: return <SLogin go={go} />;
      case 3: return <SDashboard go={go} />;
      case 4: return <SEditProfile go={go} />;
      case 5: return <SPublicProfile go={go} />;
      case 6: return <SNovoLote go={go} />;
      case 7: return <SProducao go={go} />;
      case 8: return <SMapa go={go} />;
      case 9: return <SGaleria go={go} />;
      case 10: return <SQRCode go={go} />;
      case 11: return <SDocs go={go} />;
      case 12: return <SEditLote go={go} />;
      case 13: return <SLotPublico lotId={lotParam!} go={go} />;
      case 14: return <SPraticas go={go} />;
      case 15: return <SPlanos go={go} />;
      case 16: return <SVitrine go={go} />;
      default: return <SLanding go={go} />;
    }
  };

  // Telas especiais por URL (link de e-mail)
  if (resetToken) {
    return (
      <div data-theme={theme} className="font-sans text-text antialiased bg-bg selection:bg-accent selection:text-bg">
        <ToastContainer />
        <SResetPassword token={resetToken} onDone={() => { setResetToken(null); setS(2); }} />
      </div>
    );
  }
  if (verifyToken) {
    return (
      <div data-theme={theme} className="font-sans text-text antialiased bg-bg selection:bg-accent selection:text-bg">
        <ToastContainer />
        <SVerifyEmail token={verifyToken} onDone={() => { setVerifyToken(null); setS(user ? 3 : 2); }} />
      </div>
    );
  }

  return (
    <div data-theme={theme} className="font-sans text-text antialiased bg-bg selection:bg-accent selection:text-bg">
      <ToastContainer />
      <LGPDBanner />
      {showNav ? (
        /* ── App autenticado: sidebar fixa + conteúdo com scroll natural ── */
        <div style={{ display: "flex", minHeight: "100vh" }}>
          <SidebarNav active={s} onNav={setS} onLogout={handleLogout} />
          <main style={{ flex: 1, minWidth: 0 }}>
            <AnimatePresence mode="wait">{renderScreen()}</AnimatePresence>
            <BottomNav active={s} onNav={setS} />
          </main>
        </div>
      ) : (
        /* ── Layout público: landing / auth / lot público ── */
        <AnimatePresence mode="wait">{renderScreen()}</AnimatePresence>
      )}
    </div>
  );
};

export default function App() {
  const [lang, setLang] = useState<Lang>("pt");
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("rastro_theme") as Theme) ?? "dark");
  const toggleTheme = () => setTheme(t => {
    const next = t === "dark" ? "light" : "dark";
    localStorage.setItem("rastro_theme", next);
    return next;
  });
  return (
    <BrowserRouter>
      <ThemeContext.Provider value={{ theme, toggleTheme }}>
        <LangContext.Provider value={{ lang, setLang }}>
          <AppProvider>
            <AppContent />
          </AppProvider>
        </LangContext.Provider>
      </ThemeContext.Provider>
    </BrowserRouter>
  );
}
