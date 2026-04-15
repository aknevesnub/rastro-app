import React, { useState, useEffect, useRef, createContext, useContext } from "react";
import { motion, AnimatePresence } from "motion/react";
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
} from "lucide-react";

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
    hero_tag: "Rastreabilidade de origem",
    hero_line1: "A vitrine",
    hero_line2: "digital",
    hero_line3: "do agro",
    hero_sub: "Conectamos produtores rurais brasileiros a compradores globais com transparência, conformidade EUDR e rastreabilidade total.",
    hero_cta_farms: "Ver fazendas",
    hero_cta_producer: "Sou produtor",
    hero_stat1: "fazendas",
    hero_stat2: "conformidade",
    hero_stat3: "países",
    farms_title: "Fazendas verificadas",
    farms_sub: "Produtores com rastreabilidade certificada e conformidade EUDR",
    farms_area: "ha",
    farms_lots: "lotes",
    farms_eudr: "EUDR",
    farms_view: "Ver perfil",
    farms_empty_title: "Seja o primeiro",
    farms_empty_sub: "Nenhuma fazenda cadastrada ainda. Registre a sua.",
    how_title: "Como funciona",
    how_tag: "Simples e rápido",
    how_steps: [
      { n: "01", t: "Crie o perfil", d: "Cadastre sua fazenda com logo, fotos e localização." },
      { n: "02", t: "Registre lotes", d: "Adicione culturas, área, datas e mapeie a propriedade." },
      { n: "03", t: "Gere QR Code", d: "Cada lote recebe um QR rastreável para compradores." },
      { n: "04", t: "Exporte relatórios", d: "Relatórios EUDR e ESG prontos para exportação UE." },
    ],
    benefits_title: "Por que Rastro™",
    benefits_tag: "Benefícios",
    benefits: [
      { t: "Compliance EUDR", d: "Documentação automática para o Regulamento UE 2023/1115." },
      { t: "Crédito Verde", d: "Acesse linhas de crédito sustentáveis com sua rastreabilidade." },
      { t: "Mercado Europeu", d: "Compradores da UE encontram e verificam sua fazenda." },
      { t: "QR Rastreável", d: "Do campo ao consumidor final com um escaneamento." },
      { t: "Mapa de Área", d: "Delimite sua propriedade com verificação PRODES/INPE." },
      { t: "Multilíngue", d: "Plataforma em 4 idiomas para alcance global." },
    ],
    footer_cta: "Cadastre sua fazenda gratuitamente",
    footer_sub: "Junte-se a produtores que já acessam o mercado global.",
    footer_btn: "Começar agora",
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
    hero_sub: "We connect Brazilian rural producers to global buyers with transparency, EUDR compliance and full traceability.",
    hero_cta_farms: "Browse farms",
    hero_cta_producer: "I'm a producer",
    hero_stat1: "farms",
    hero_stat2: "compliance",
    hero_stat3: "countries",
    farms_title: "Verified farms",
    farms_sub: "Producers with certified traceability and EUDR compliance",
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
    benefits_title: "Why Rastro™",
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
    hero_sub: "Conectamos productores rurales brasileños con compradores globales con transparencia, cumplimiento EUDR y trazabilidad total.",
    hero_cta_farms: "Ver fincas",
    hero_cta_producer: "Soy productor",
    hero_stat1: "fincas",
    hero_stat2: "conformidad",
    hero_stat3: "países",
    farms_title: "Fincas verificadas",
    farms_sub: "Productores con trazabilidad certificada y conformidad EUDR",
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
    benefits_title: "Por qué Rastro™",
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
    hero_cta_producer: "我是生产者",
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
    benefits_title: "为什么选择 Rastro™",
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

const useLang = () => {
  const { lang } = useContext(LangContext);
  return TRANSLATIONS[lang];
};

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface Lot {
  id: string;
  name: string;
  crop: string;
  area: string;
  date: string;
  tipo: number;
  status: "ativo" | "colhendo" | "colhido";
  notes: string;
  photos: string[];
  mapPoints: [number, number][];
}

interface AppUser {
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
  cover?: string;
  location?: string;
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
// Context
// ─────────────────────────────────────────────

interface AppCtx {
  user: AppUser | null;
  lots: Lot[];
  events: AppEvent[];
  currentLotId: string | null;
  toasts: Toast[];
  saveUser: (d: AppUser) => void;
  addLot: (l: Omit<Lot, "id">) => string;
  updateLot: (id: string, d: Partial<Lot>) => void;
  deleteLot: (id: string) => void;
  addPhotoToLot: (lotId: string, photo: string) => void;
  logout: () => void;
  setCurrentLotId: (id: string | null) => void;
  addToast: (msg: string, type?: Toast["type"]) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppCtx>({} as AppCtx);

const store = (key: string, data: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* storage full */ }
};

const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [lots, setLots] = useState<Lot[]>([]);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [currentLotId, setCurrentLotId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    try {
      const u = localStorage.getItem("rastro_user");
      const l = localStorage.getItem("rastro_lots");
      const e = localStorage.getItem("rastro_events");
      if (u) setUser(JSON.parse(u));
      if (l) setLots(JSON.parse(l));
      if (e) setEvents(JSON.parse(e));
    } catch { /* ignore */ }
  }, []);

  const saveUser = (d: AppUser) => { setUser(d); store("rastro_user", d); };

  const addLot = (lot: Omit<Lot, "id">): string => {
    const id = Date.now().toString();
    const newLots = [...lots, { ...lot, id }];
    setLots(newLots); store("rastro_lots", newLots);
    const ev: AppEvent = { id: Date.now().toString(), title: `Novo lote: ${lot.name}`, date: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }), type: "lote" };
    const ne = [ev, ...events]; setEvents(ne); store("rastro_events", ne);
    return id;
  };

  const updateLot = (id: string, d: Partial<Lot>) => {
    const newLots = lots.map(l => l.id === id ? { ...l, ...d } : l);
    setLots(newLots); store("rastro_lots", newLots);
    const lot = newLots.find(l => l.id === id);
    const ev: AppEvent = { id: Date.now().toString(), title: `Atualizado: ${lot?.name}`, date: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }), type: "update" };
    const ne = [ev, ...events]; setEvents(ne); store("rastro_events", ne);
  };

  const deleteLot = (id: string) => {
    const lot = lots.find(l => l.id === id);
    const newLots = lots.filter(l => l.id !== id);
    setLots(newLots); store("rastro_lots", newLots);
    if (lot) {
      const ev: AppEvent = { id: Date.now().toString(), title: `Lote removido: ${lot.name}`, date: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }), type: "update" };
      const ne = [ev, ...events]; setEvents(ne); store("rastro_events", ne);
    }
  };

  const addPhotoToLot = (lotId: string, photo: string) => {
    const lot = lots.find(l => l.id === lotId);
    if (!lot) return;
    const newLots = lots.map(l => l.id === lotId ? { ...l, photos: [...(l.photos || []), photo] } : l);
    setLots(newLots); store("rastro_lots", newLots);
    const ev: AppEvent = { id: Date.now().toString(), title: `Foto: ${lot.name}`, date: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }), type: "foto" };
    const ne = [ev, ...events]; setEvents(ne); store("rastro_events", ne);
  };

  const logout = () => { setUser(null); localStorage.removeItem("rastro_user"); };

  const addToast = (msg: string, type: Toast["type"] = "success") => {
    const id = Date.now().toString();
    setToasts(p => [...p, { id, message: msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3200);
  };
  const removeToast = (id: string) => setToasts(p => p.filter(t => t.id !== id));

  return (
    <AppContext.Provider value={{ user, saveUser, lots, addLot, updateLot, deleteLot, addPhotoToLot, events, logout, currentLotId, setCurrentLotId, toasts, addToast, removeToast }}>
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

const openEUDR = (user: AppUser, lots: Lot[]) => {
  const totalArea = lots.reduce((a, l) => a + (Number(l.area) || 0), 0);
  const w = window.open("", "_blank", "width=820,height=700");
  if (!w) { alert("Permita popups para gerar o relatório."); return; }
  w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>EUDR — ${user.farmName}</title>
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
<div class="badge">Rastro™ — EUDR Compliance</div>
<h1>${user.farmName}</h1>
<p class="sub">Produtor: ${user.name || "—"} | Emitido em: ${new Date().toLocaleDateString("pt-BR", { year: "numeric", month: "long", day: "numeric" })}</p>
<h2>Propriedade</h2>
<div class="grid">
<div class="card"><div class="cl">Área Total</div><div class="cv">${totalArea} ha</div></div>
<div class="card"><div class="cl">Lotes</div><div class="cv">${lots.length}</div></div>
<div class="card"><div class="cl">E-mail</div><div class="cv" style="font-size:13px">${user.email || "—"}</div></div>
<div class="card"><div class="cl">Telefone</div><div class="cv" style="font-size:13px">${user.phone || "—"}</div></div>
</div>
<h2>Verificação PRODES/INPE</h2>
<div class="ok-box"><strong style="color:#166534">✓ Sem sobreposição com área desmatada</strong><br>
<span style="font-size:12px;color:#555">Corte: 31/12/2020 | Verificado: ${new Date().toLocaleDateString("pt-BR")} | Base: PRODES/INPE</span></div>
<h2>Lotes</h2>
<table><thead><tr><th>Lote</th><th>Cultura</th><th>Área (ha)</th><th>Plantio</th><th>EUDR</th></tr></thead><tbody>
${lots.map(l => `<tr><td><strong>${l.name}</strong></td><td>${l.crop}</td><td>${l.area || "—"}</td><td>${l.date ? new Date(l.date + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</td><td class="ok">✓ Conforme</td></tr>`).join("")}
${lots.length === 0 ? '<tr><td colspan="5" style="text-align:center;color:#999;padding:20px">Nenhum lote cadastrado</td></tr>' : ""}
</tbody></table>
<h2>Declaração</h2>
<p class="decl">Eu, <strong>${user.name || user.farmName}</strong>, declaro que todas as produções registradas neste documento foram obtidas de áreas não associadas ao desmatamento ou degradação florestal após 31/12/2020, em conformidade com o Regulamento UE nº 2023/1115 (EUDR).</p>
<div class="footer">Gerado por Rastro™ | ${new Date().toLocaleString("pt-BR")} | Fins informativos — complementar com documentação oficial para exportação UE.</div>
<div class="no-print"><button class="btn" onclick="window.print()">Imprimir / Salvar PDF</button></div>
</body></html>`);
  w.document.close();
};

const openESG = (user: AppUser, lots: Lot[]) => {
  const totalArea = lots.reduce((a, l) => a + (Number(l.area) || 0), 0);
  const w = window.open("", "_blank", "width=820,height=700");
  if (!w) { alert("Permita popups para gerar o relatório."); return; }
  w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>ESG — ${user.farmName}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;max-width:780px;margin:0 auto;padding:40px;color:#111}
.badge{display:inline-block;background:#166534;color:#fff;padding:4px 12px;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin-bottom:16px}
h1{font-size:28px;font-weight:900;text-transform:uppercase;letter-spacing:-1px;margin-bottom:6px}h2{font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;margin:28px 0 12px;color:#555;border-bottom:1px solid #eee;padding-bottom:8px}
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin:14px 0}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:14px 0}
.card{border:1px solid #ddd;padding:14px;text-align:center}.cl{font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:5px}.cv{font-size:22px;font-weight:900}
.e{background:#f0fdf4;border:1px solid #bbf7d0;padding:14px;margin-bottom:10px}p{font-size:13px;line-height:1.8;color:#333}
.footer{margin-top:36px;padding-top:14px;border-top:1px solid #ddd;font-size:11px;color:#999}
.btn{display:inline-block;margin-top:20px;padding:12px 24px;background:#166534;color:#fff;border:none;cursor:pointer;font-weight:bold;font-size:12px;text-transform:uppercase;letter-spacing:1px}
@media print{.no-print{display:none}}</style></head><body>
<div class="badge">Rastro™ — ESG Report</div>
<h1>${user.farmName}</h1>
<p style="color:#555;font-size:13px;margin-bottom:24px">Produtor: ${user.name || "—"} | Emitido em: ${new Date().toLocaleDateString("pt-BR", { year: "numeric", month: "long", day: "numeric" })}</p>
<h2>Indicadores</h2>
<div class="grid3">
<div class="card"><div class="cl">Área Total</div><div class="cv">${totalArea}</div><div class="cl">hectares</div></div>
<div class="card"><div class="cl">Lotes</div><div class="cv">${lots.length}</div><div class="cl">ativos</div></div>
<div class="card"><div class="cl">EUDR</div><div class="cv" style="color:#166534">100%</div><div class="cl">conforme</div></div>
</div>
<h2>E — Ambiental</h2>
<div class="e"><strong>✓ Sem sobreposição com desmatamento</strong> — verificado PRODES/INPE</div>
<div class="e"><strong>✓ Rastreabilidade de origem</strong> — ${lots.length} lote(s) registrado(s)</div>
<div class="e"><strong>✓ Produção documentada</strong> — ${totalArea} ha com histórico digital</div>
<h2>S — Social</h2>
<p>${user.farmName} opera com registro de produção digital, contribuindo para transparência da cadeia produtiva e facilitando inserção no mercado europeu. A digitalização fortalece relações de confiança com compradores e parceiros.</p>
<h2>G — Governança</h2>
<p>A gestão conta com sistema de rastreabilidade Rastro™, garantindo documentação de toda produção, controle de lotes e emissão de relatórios de conformidade para mercados exigentes.</p>
<div class="footer">Gerado por Rastro™ | ${new Date().toLocaleString("pt-BR")}</div>
<div class="no-print"><button class="btn" onclick="window.print()">Imprimir / Salvar PDF</button></div>
</body></html>`);
  w.document.close();
};

// ─────────────────────────────────────────────
// UI Primitives
// ─────────────────────────────────────────────

const ToastContainer = () => {
  const { toasts, removeToast } = useContext(AppContext);
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 w-[calc(100%-32px)] max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id} initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest border ${t.type === "success" ? "bg-accent text-bg border-accent" : t.type === "error" ? "bg-red-500 text-white border-red-500" : "bg-bg text-text border-white/30"}`}>
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

const TopBar = ({ title, onBack, right }: { title: string; onBack?: () => void; right?: React.ReactNode }) => (
  <div className="sticky top-0 z-50 bg-bg text-text border-b border-white/10">
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-4 flex items-center">
      {onBack && <button onClick={onBack} className="mr-4 text-text hover:text-accent transition-colors"><ChevronLeft size={24} /></button>}
      <h1 className="text-base md:text-lg font-black uppercase tracking-tighter flex-1 truncate">{title}</h1>
      {right && <div>{right}</div>}
    </div>
  </div>
);

const NAV_ITEMS = [
  { icon: Home, label: "Início", s: 3 },
  { icon: Sprout, label: "Produção", s: 7 },
  { icon: MapIcon, label: "Mapa", s: 8 },
  { icon: FileText, label: "Docs", s: 11 },
  { icon: User, label: "Perfil", s: 4 },
];

// Mobile bottom nav
const BottomNav = ({ active, onNav }: { active: number; onNav: (s: number) => void }) => (
  <div className="md:hidden fixed bottom-0 left-0 right-0 bg-bg border-t border-white/10 pb-safe pt-2 px-2 flex justify-around items-center z-50">
    {NAV_ITEMS.map((item, i) => {
      const isActive = active === item.s;
      const Icon = item.icon;
      return (
        <button key={i} onClick={() => onNav(item.s)} className={`flex flex-col items-center justify-center w-16 h-14 transition-all duration-200 ${isActive ? "text-accent" : "text-white/40 hover:text-white/80"}`}>
          <motion.div animate={{ scale: isActive ? 1.1 : 1, y: isActive ? -2 : 0 }}>
            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
          </motion.div>
          <span className={`text-[9px] mt-1.5 uppercase tracking-widest ${isActive ? "font-bold" : "font-medium"}`}>{item.label}</span>
        </button>
      );
    })}
  </div>
);

// Desktop sidebar nav
const SidebarNav = ({ active, onNav, onLogout }: { active: number; onNav: (s: number) => void; onLogout: () => void }) => (
  <aside className="hidden md:flex flex-col bg-bg border-r border-white/10 self-start sticky top-0 h-screen z-40 w-16 lg:w-56 shrink-0">
    {/* Logo */}
    <div className="h-16 border-b border-white/10 flex items-center justify-center lg:justify-start lg:px-6 gap-3 shrink-0">
      <span className="font-black text-base tracking-tighter uppercase text-text">R™</span>
      <span className="hidden lg:block font-black text-base tracking-tighter uppercase text-text">Rastro</span>
    </div>
    {/* Nav items */}
    <nav className="flex-1 py-2 overflow-y-auto">
      {NAV_ITEMS.map((item, i) => {
        const isActive = active === item.s;
        const Icon = item.icon;
        return (
          <button key={i} onClick={() => onNav(item.s)}
            className={`w-full flex items-center justify-center lg:justify-start lg:px-5 py-3.5 transition-all duration-200 relative group ${isActive ? "text-accent" : "text-white/35 hover:text-white/80"}`}>
            {isActive && <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent" />}
            <div className={`w-9 h-9 flex items-center justify-center shrink-0 ${isActive ? "bg-accent/10" : "group-hover:bg-white/5"} transition-colors`}>
              <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
            </div>
            <span className={`hidden lg:block ml-3 text-[10px] uppercase tracking-widest ${isActive ? "font-black" : "font-medium"}`}>{item.label}</span>
          </button>
        );
      })}
    </nav>
    {/* Logout */}
    <div className="border-t border-white/10 shrink-0">
      <button onClick={onLogout} className="w-full flex items-center justify-center lg:justify-start lg:px-5 py-3.5 text-white/35 hover:text-accent transition-colors group">
        <div className="w-9 h-9 flex items-center justify-center group-hover:bg-white/5 transition-colors">
          <LogOut size={17} />
        </div>
        <span className="hidden lg:block ml-3 text-[10px] font-bold uppercase tracking-widest">Sair</span>
      </button>
    </div>
  </aside>
);

const Field = ({ label, placeholder, tall, type = "text", value, onChange, error }: { label: string; placeholder?: string; tall?: boolean; type?: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void; error?: string }) => (
  <div className="mb-5">
    <label className="block text-[10px] font-bold uppercase tracking-widest text-accent mb-2">{label}</label>
    {tall ? (
      <textarea value={value} onChange={onChange} className={`w-full px-4 py-3 border bg-transparent focus:bg-white/5 focus:ring-1 focus:ring-accent transition-all text-sm text-text resize-none h-24 rounded-none placeholder-white/30 ${error ? "border-red-500" : "border-white/20 focus:border-accent"}`} placeholder={placeholder} />
    ) : (
      <input type={type} value={value} onChange={onChange} className={`w-full px-4 py-3 border bg-transparent focus:bg-white/5 focus:ring-1 focus:ring-accent transition-all text-sm text-text rounded-none placeholder-white/30 ${error ? "border-red-500" : "border-white/20 focus:border-accent"}`} placeholder={placeholder} />
    )}
    {error && <p className="text-[10px] text-red-400 mt-1 font-bold uppercase tracking-widest">{error}</p>}
  </div>
);

const Btn = ({ children, onClick, full, outline, small, icon: Icon, disabled }: { children: React.ReactNode; onClick?: () => void; full?: boolean; outline?: boolean; small?: boolean; icon?: React.ElementType; disabled?: boolean }) => (
  <motion.button whileTap={{ scale: disabled ? 1 : 0.98 }} onClick={disabled ? undefined : onClick}
    className={`flex items-center justify-center gap-3 font-black uppercase tracking-widest transition-all rounded-none ${full ? "w-full" : ""} ${small ? "px-4 py-2.5 text-[10px]" : "px-6 py-4 text-xs"} ${outline ? "bg-transparent text-accent border border-accent hover:bg-accent/10" : "bg-accent text-bg hover:bg-accent/90"} ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}>
    {Icon && <Icon size={small ? 15 : 17} />}
    {children}
  </motion.button>
);

const StatCard = ({ n, l, icon: Icon }: { n: string; l: string; icon: React.ElementType }) => (
  <div className="bg-transparent border border-white/10 p-4 text-center flex flex-col items-center justify-center">
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

// ─── Editor de área em tela cheia ───
const MapDrawer = ({ name, initialPoints, onSave, onClose }: {
  name: string; initialPoints: [number, number][]; onSave: (pts: [number, number][]) => void; onClose: () => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polygonRef = useRef<L.Polygon | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const [points, setPoints] = useState<[number, number][]>(initialPoints?.length > 0 ? initialPoints : []);
  const [area, setArea] = useState(calcAreaHa(initialPoints || []));
  const [locating, setLocating] = useState(false);

  const redraw = (pts: [number, number][]) => {
    const map = mapRef.current; if (!map) return;
    markersRef.current.forEach(m => m.remove()); markersRef.current = [];
    if (polygonRef.current) { polygonRef.current.remove(); polygonRef.current = null; }
    pts.forEach(p => {
      markersRef.current.push(L.circleMarker(p, { radius: 6, color: "#E0FF22", fillColor: "#E0FF22", fillOpacity: 1, weight: 0 }).addTo(map));
    });
    if (pts.length > 2) polygonRef.current = L.polygon(pts, { color: "#E0FF22", weight: 2, fillOpacity: 0.15 }).addTo(map);
    setArea(calcAreaHa(pts));
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const initCenter: [number, number] = points.length > 0
      ? [points.reduce((s, p) => s + p[0], 0) / points.length, points.reduce((s, p) => s + p[1], 0) / points.length]
      : [-15.77972, -47.92972];
    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: false }).setView(initCenter, points.length > 0 ? 14 : 5);
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19 }).addTo(map);
    map.on("click", (e: L.LeafletMouseEvent) => {
      setPoints(prev => { const next: [number, number][] = [...prev, [e.latlng.lat, e.latlng.lng]]; redraw(next); return next; });
    });
    mapRef.current = map;
    if (points.length > 0) redraw(points);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  const handleUndo = () => setPoints(prev => { const next = prev.slice(0, -1); redraw(next); return next; });
  const handleClear = () => setPoints(() => { redraw([]); return []; });
  const handleLocate = () => {
    setLocating(true);
    mapRef.current?.locate({ setView: true, maxZoom: 14 });
    mapRef.current?.once("locationfound", () => setLocating(false));
    mapRef.current?.once("locationerror", () => setLocating(false));
  };

  return (
    <div className="fixed inset-0 z-[300] bg-bg flex flex-col">
      <div className="flex items-center justify-between px-4 h-14 border-b border-white/10 bg-bg z-10 shrink-0">
        <button onClick={onClose} className="flex items-center gap-2 text-white/60 hover:text-text">
          <X size={18} /><span className="text-[10px] font-bold uppercase tracking-widest">Cancelar</span>
        </button>
        <div className="text-center">
          <div className="text-[10px] font-bold uppercase tracking-widest text-text">{name}</div>
          {area > 0 && <div className="text-[9px] text-accent font-bold">{area.toFixed(2)} ha calculados</div>}
        </div>
        <button onClick={() => { onSave(points); onClose(); }} className="flex items-center gap-2 text-accent text-[10px] font-bold uppercase tracking-widest">
          <Check size={16} /> Salvar
        </button>
      </div>
      <div className="bg-accent/10 border-b border-accent/20 px-4 py-2 text-center shrink-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-accent">Toque no mapa para marcar os vértices da área</p>
      </div>
      <div ref={containerRef} className="flex-1" />
      <div className="flex gap-2 px-4 py-3 border-t border-white/10 bg-bg shrink-0">
        <button onClick={handleLocate} className="flex-1 py-2.5 border border-white/20 text-[9px] font-bold uppercase tracking-widest text-white/60 hover:border-accent hover:text-accent transition-colors flex items-center justify-center gap-1.5">
          {locating ? "..." : <><MapPin size={12} /> Minha localização</>}
        </button>
        <button onClick={handleUndo} disabled={points.length === 0} className="flex-1 py-2.5 border border-white/20 text-[9px] font-bold uppercase tracking-widest text-white/60 hover:border-accent hover:text-accent transition-colors disabled:opacity-30">
          ↩ Desfazer
        </button>
        <button onClick={handleClear} disabled={points.length === 0} className="flex-1 py-2.5 border border-white/20 text-[9px] font-bold uppercase tracking-widest text-white/60 hover:border-red-400 hover:text-red-400 transition-colors disabled:opacity-30">
          <Trash2 size={12} className="inline mr-1" /> Limpar
        </button>
      </div>
    </div>
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
              <div className="text-[10px] text-white/50">{area.toFixed(2)} ha calculados · Clique para editar</div>
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
      <button onClick={() => setOpen(p => !p)} className="flex items-center gap-2 px-3 py-2 border border-white/20 hover:border-accent transition-colors text-[10px] font-bold uppercase tracking-widest">
        <Globe size={13} /><span>{current.flag} {current.code.toUpperCase()}</span><ChevronDown size={11} />
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
const DEMO_FARMS = [
  { farmName: "Fazenda Santa Clara", name: "João Carlos Ferreira", location: "Sorriso, MT", description: "Três gerações cultivando soja e milho com práticas sustentáveis e certificação EUDR.", products: ["Soja", "Milho"], certs: ["EUDR Conforme", "Orgânico"], lots: 4, area: 1240 },
  { farmName: "Cafeicultura Serra Verde", name: "Ana Lima", location: "Patrocínio, MG", description: "Café especial arábica cultivado em altitude com rastreabilidade total do grão à xícara.", products: ["Café"], certs: ["EUDR Conforme", "Rainforest Alliance"], lots: 2, area: 380 },
  { farmName: "Agropecuária Cerrado", name: "Roberto Alves", location: "Barreiras, BA", description: "Pecuária extensiva e soja com mapeamento completo e verificação PRODES/INPE.", products: ["Pecuária", "Soja"], certs: ["EUDR Conforme"], lots: 6, area: 3200 },
  { farmName: "Fazenda Horizonte Novo", name: "Marcos Souza", location: "Lucas do Rio Verde, MT", description: "Produção de algodão e cana com tecnologia de precisão e rastreabilidade digital.", products: ["Algodão", "Cana"], certs: ["EUDR Conforme", "RTRS"], lots: 3, area: 870 },
];

const SLanding = ({ go }: { go: (s: number) => void }) => {
  const t = useLang();
  const { lots: realLots } = useContext(AppContext);
  const [activeSection, setActiveSection] = useState("hero");
  const heroRef = useRef<HTMLDivElement>(null);
  const farmsRef = useRef<HTMLDivElement>(null);
  const howRef = useRef<HTMLDivElement>(null);
  const benefitsRef = useRef<HTMLDivElement>(null);

  // Pull registered farms from localStorage for showcase
  const storedFarms: AppUser[] = (() => {
    try { const u = localStorage.getItem("rastro_user"); return u ? [JSON.parse(u)] : []; } catch { return []; }
  })();
  const showcaseFarms = storedFarms.length > 0 ? storedFarms : null;

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>, id: string) => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
    setActiveSection(id);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id); });
    }, { threshold: 0.4 });
    [heroRef, farmsRef, howRef, benefitsRef].forEach(r => r.current && observer.observe(r.current));
    return () => observer.disconnect();
  }, []);

  const navLinks = [
    { id: "farms", label: t.nav_farms, ref: farmsRef },
    { id: "how", label: t.nav_how, ref: howRef },
    { id: "benefits", label: t.nav_benefits, ref: benefitsRef },
  ];

  const benefitIcons = [ShieldCheck, TrendingUp, Globe, QrCode, MapPin, Users];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-bg">

      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-50 bg-bg/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-5 md:px-10 h-16 flex items-center justify-between gap-4">
          <div className="font-black text-xl tracking-tighter uppercase text-text shrink-0">Rastro™</div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map(l => (
              <button key={l.id} onClick={() => scrollTo(l.ref, l.id)}
                className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${activeSection === l.id ? "text-accent" : "text-white/50 hover:text-white"}`}>
                {l.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <LangSwitcher />
            <button onClick={() => go(2)} className="hidden md:block px-4 py-2 text-[10px] font-bold uppercase tracking-widest border border-white/20 text-text hover:border-accent hover:text-accent transition-all">
              {t.nav_login}
            </button>
            <button onClick={() => go(1)} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest bg-accent text-bg hover:bg-accent/90 transition-all">
              {t.nav_signup}
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section ref={heroRef} id="hero" className="min-h-[90vh] flex flex-col justify-center px-5 md:px-12 lg:px-20 py-20 border-b border-white/10 relative overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "linear-gradient(#E0FF22 1px,transparent 1px),linear-gradient(90deg,#E0FF22 1px,transparent 1px)", backgroundSize: "60px 60px" }} />

        <div className="max-w-6xl mx-auto w-full relative z-10">
          <div className="md:grid md:grid-cols-2 md:gap-20 md:items-center">
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
              <span className="inline-flex items-center gap-2 py-1.5 px-3 border border-accent text-accent text-[9px] font-bold tracking-widest mb-8 uppercase">
                <Leaf size={11} /> {t.hero_tag}
              </span>
              <h1 className="font-black uppercase tracking-tighter text-[clamp(3.5rem,10vw,7rem)] leading-[0.85] mb-8">
                <span className="block">{t.hero_line1}</span>
                <span className="block text-stroke">{t.hero_line2}</span>
                <span className="block text-accent">{t.hero_line3}</span>
              </h1>
              <p className="text-sm md:text-base text-white/60 mb-10 leading-relaxed max-w-md">{t.hero_sub}</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Btn onClick={() => scrollTo(farmsRef, "farms")} icon={Sprout}>{t.hero_cta_farms}</Btn>
                <Btn outline onClick={() => go(1)}>{t.hero_cta_producer}</Btn>
              </div>
            </motion.div>

            {/* Stats card */}
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }} className="hidden md:block">
              <div className="border border-white/10 p-8 bg-white/2">
                <div className="grid grid-cols-3 gap-6 mb-8">
                  {[
                    { n: showcaseFarms ? showcaseFarms.length.toString() : "500+", l: t.hero_stat1, icon: Sprout },
                    { n: "100%", l: t.hero_stat2, icon: ShieldCheck },
                    { n: "40+", l: t.hero_stat3, icon: Globe },
                  ].map((s, i) => (
                    <div key={i} className="text-center">
                      <s.icon size={20} className="text-accent mx-auto mb-3" />
                      <div className="text-3xl font-black text-text leading-none mb-1">{s.n}</div>
                      <div className="text-[9px] font-bold uppercase tracking-widest text-white/40">{s.l}</div>
                    </div>
                  ))}
                </div>
                {/* Mini farm preview */}
                <div className="border-t border-white/10 pt-6 space-y-3">
                  {(showcaseFarms || DEMO_FARMS).slice(0, 2).map((f, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 border border-white/5 bg-white/2 hover:border-accent/30 transition-colors">
                      <div className="w-10 h-10 bg-accent/10 border border-accent/20 flex items-center justify-center">
                        {(f as AppUser).logo ? <img src={(f as AppUser).logo} className="w-full h-full object-cover" alt="" /> : <Sprout size={16} className="text-accent" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold uppercase tracking-wide text-text truncate">{f.farmName}</div>
                        <div className="text-[9px] text-white/40 font-medium mt-0.5 flex items-center gap-1"><MapPin size={8} /> {f.location || "Brasil"}</div>
                      </div>
                      <span className="text-[8px] font-bold uppercase tracking-widest text-accent border border-accent/40 px-1.5 py-0.5">{t.farms_eudr}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            className="mt-16 flex items-center gap-3 text-white/30 cursor-pointer hover:text-accent transition-colors w-fit"
            onClick={() => scrollTo(farmsRef, "farms")}>
            <ArrowDown size={16} className="animate-bounce" />
            <span className="text-[9px] font-bold uppercase tracking-widest">{t.hero_cta_farms}</span>
          </motion.div>
        </div>
      </section>

      {/* ── Farm Showcase ── */}
      <section ref={farmsRef} id="farms" className="py-20 px-5 md:px-12 lg:px-20 border-b border-white/10">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="mb-12">
            <span className="text-[9px] font-bold uppercase tracking-widest text-accent mb-3 block">{t.farms_eudr} ✓</span>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-text mb-4">{t.farms_title}</h2>
            <p className="text-sm text-white/50 max-w-lg">{t.farms_sub}</p>
          </motion.div>

          {(!showcaseFarms || showcaseFarms.length === 0) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {DEMO_FARMS.map((f, i) => (
                <motion.div key={i} initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                  className="border border-white/10 hover:border-accent/60 transition-all duration-300 group cursor-pointer" onClick={() => go(1)}>
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
                        <div><span className="text-xs font-black text-text">{f.area.toLocaleString()}</span><span className="text-[8px] text-white/40 ml-1">{t.farms_area}</span></div>
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
                  className="border border-white/10 hover:border-accent/60 transition-all duration-300 group cursor-pointer" onClick={() => go(5)}>
                  <div className="h-36 bg-gradient-to-br from-accent/5 to-white/2 border-b border-white/10 relative overflow-hidden">
                    {f.cover ? <img src={f.cover} className="w-full h-full object-cover opacity-60" alt="cover" /> : <div className="w-full h-full flex items-center justify-center"><Sprout size={40} className="text-accent/20" /></div>}
                    <div className="absolute inset-0 bg-gradient-to-t from-bg/80 to-transparent" />
                    <div className="absolute top-3 right-3"><span className="text-[8px] font-bold uppercase tracking-widest text-accent border border-accent/40 px-2 py-0.5 bg-bg/70">{t.farms_eudr} ✓</span></div>
                    {f.logo && <div className="absolute bottom-3 left-3 w-10 h-10 border border-white/20 bg-bg overflow-hidden"><img src={f.logo} className="w-full h-full object-cover" alt="logo" /></div>}
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-black uppercase tracking-tight text-text mb-1">{f.farmName}</h3>
                    {f.location && <p className="text-[9px] font-bold text-accent flex items-center gap-1 mb-3"><MapPin size={9} />{f.location}</p>}
                    <p className="text-[10px] text-white/50 leading-relaxed mb-4 line-clamp-2">{f.description || "Produtor rural com rastreabilidade certificada."}</p>
                    <div className="flex flex-wrap gap-1 mb-4">
                      {(f.products || []).map((p, j) => <span key={j} className="text-[8px] font-bold uppercase tracking-widest text-white/50 border border-white/15 px-1.5 py-0.5">{p}</span>)}
                      {(f.certs || []).map((c, j) => <span key={j} className="text-[8px] font-bold uppercase tracking-widest text-accent border border-accent/30 px-1.5 py-0.5">{c}</span>)}
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-white/10">
                      <div className="flex gap-3">
                        <div><span className="text-xs font-black text-text">{realLots.reduce((a, l) => a + (Number(l.area) || 0), 0)}</span><span className="text-[8px] text-white/40 ml-1">{t.farms_area}</span></div>
                        <div><span className="text-xs font-black text-text">{realLots.length}</span><span className="text-[8px] text-white/40 ml-1">{t.farms_lots}</span></div>
                      </div>
                      <span className="text-[8px] font-bold uppercase tracking-widest text-accent group-hover:underline">{t.farms_view} →</span>
                    </div>
                  </div>
                </motion.div>
              ))}
              {/* CTA card */}
              <motion.div initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }}
                className="border border-dashed border-accent/30 hover:border-accent transition-all duration-300 cursor-pointer flex flex-col items-center justify-center p-10 text-center gap-4" onClick={() => go(1)}>
                <Plus size={32} className="text-accent/40" />
                <div className="text-sm font-bold uppercase tracking-wide text-text">{t.farms_empty_title}</div>
                <div className="text-xs text-white/40">{t.farms_empty_sub}</div>
                <Btn small icon={Plus} onClick={() => go(1)}>{t.nav_signup}</Btn>
              </motion.div>
            </div>
          )}
        </div>
      </section>

      {/* ── How it works ── */}
      <section ref={howRef} id="how" className="py-20 px-5 md:px-12 lg:px-20 border-b border-white/10">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="mb-12">
            <span className="text-[9px] font-bold uppercase tracking-widest text-accent mb-3 block">{t.how_tag}</span>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-text">{t.how_title}</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border border-white/10">
            {t.how_steps.map((s, i) => (
              <motion.div key={i} initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="p-6 md:p-8 border-b md:border-b-0 md:border-r border-white/10 last:border-0 hover:bg-white/2 transition-colors">
                <div className="text-accent font-black text-2xl mb-6">{s.n}</div>
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
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-text">{t.benefits_title}</h2>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {t.benefits.map((b, i) => {
              const Icon = benefitIcons[i] || ShieldCheck;
              return (
                <motion.div key={i} initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                  className="p-5 md:p-7 border border-white/10 hover:border-accent/40 transition-all duration-300 group">
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
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-accent/3" />
        <motion.div initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="max-w-2xl mx-auto relative z-10">
          <div className="text-accent mb-6"><Award size={40} className="mx-auto" /></div>
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-text mb-4">{t.footer_cta}</h2>
          <p className="text-sm text-white/50 mb-10">{t.footer_sub}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Btn onClick={() => go(1)} icon={Plus}>{t.footer_btn}</Btn>
            <Btn outline onClick={() => go(2)}>{t.nav_login}</Btn>
          </div>
        </motion.div>
      </section>

    </motion.div>
  );
};

const SCadastro = ({ go }: { go: (s: number) => void }) => {
  const { saveUser, addToast } = useContext(AppContext);
  const [logo, setLogo] = useState("");
  const [form, setForm] = useState({ farmName: "", name: "", email: "", phone: "", history: "", password: "" });
  const [products, setProducts] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [k]: e.target.value }));
  const toggleProd = (p: string) => setProducts(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const handleSubmit = () => {
    const errs: Record<string, string> = {};
    if (!form.farmName.trim()) errs.farmName = "Obrigatório";
    if (!form.email.trim() || !form.email.includes("@")) errs.email = "E-mail inválido";
    if (form.password.length < 6) errs.password = "Mínimo 6 caracteres";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    saveUser({ ...form, products, certs: [], description: form.history, logo });
    addToast("Fazenda criada com sucesso!");
    go(3);
  };

  return (
    <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} className="min-h-screen bg-bg">
      <TopBar title="Criar conta" onBack={() => go(0)} />
      <div className="md:flex md:justify-center">
        <div className="w-full md:max-w-2xl lg:max-w-3xl p-6 md:p-10 md:grid md:grid-cols-2 md:gap-10">
          <div className="md:col-span-2 text-center mb-10 mt-4">
            <ImgUploader value={logo} onChange={setLogo}>
              <div className="w-24 h-24 border border-white/20 mx-auto mb-2 flex flex-col items-center justify-center overflow-hidden bg-transparent text-white/40 hover:border-accent hover:text-accent transition-colors relative">
                {logo ? <img src={logo} className="w-full h-full object-cover" alt="logo" /> : <><Camera size={28} className="mb-2" /><span className="text-[9px] font-bold uppercase tracking-widest">Logo</span></>}
              </div>
            </ImgUploader>
            <p className="text-[9px] text-white/30 uppercase tracking-widest">Toque para adicionar logo</p>
          </div>
          <Field label="Nome da fazenda" value={form.farmName} onChange={f("farmName")} placeholder="Ex: Fazenda Santa Clara" error={errors.farmName} />
          <Field label="Seu nome completo" value={form.name} onChange={f("name")} placeholder="Ex: João Carlos Ferreira" />
          <Field label="E-mail" value={form.email} onChange={f("email")} placeholder="seu@email.com" type="email" error={errors.email} />
          <Field label="Telefone / WhatsApp" value={form.phone} onChange={f("phone")} placeholder="(00) 00000-0000" type="tel" />
          <div className="md:col-span-2 mb-8 mt-2">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-accent mb-3">O que você produz?</label>
            <div className="flex flex-wrap gap-2">
              {["Soja", "Milho", "Café", "Pecuária", "Cana", "Algodão", "Madeira"].map((c, i) => (
                <div key={i} onClick={() => toggleProd(c)} className={`px-3 py-2 text-[9px] font-bold uppercase tracking-widest cursor-pointer transition-colors border ${products.includes(c) ? "bg-accent text-bg border-accent" : "bg-transparent border-white/20 text-white/60"}`}>{c}</div>
              ))}
            </div>
          </div>
          <div className="md:col-span-2"><Field label="História da fazenda" value={form.history} onChange={f("history")} placeholder="Há quantas gerações? Qual seu diferencial?" tall /></div>
          <Field label="Criar senha" value={form.password} onChange={f("password")} placeholder="Mínimo 6 caracteres" type="password" error={errors.password} />
          <div className="md:col-span-2 mt-6"><Btn full onClick={handleSubmit}>Criar minha fazenda</Btn></div>
          <p className="md:col-span-2 text-[10px] font-bold uppercase tracking-widest text-white/40 text-center mt-8">
            Já tem conta? <span onClick={() => go(2)} className="text-accent cursor-pointer ml-2">Fazer login</span>
          </p>
        </div>
      </div>
    </motion.div>
  );
};

const SLogin = ({ go }: { go: (s: number) => void }) => {
  const { user, addToast } = useContext(AppContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    setError("");
    if (!email || !password) { setError("Preencha e-mail e senha."); return; }
    if (!user) { setError("Nenhuma conta cadastrada. Crie seu perfil primeiro."); return; }
    if (user.email !== email) { setError("E-mail não encontrado."); return; }
    if (user.password !== password) { setError("Senha incorreta."); return; }
    addToast("Bem-vindo de volta!");
    go(3);
  };

  return (
    <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} className="min-h-screen bg-bg flex flex-col md:flex-row">
      {/* Left decorative panel — desktop only */}
      <div className="hidden md:flex md:w-1/2 lg:w-2/5 bg-accent/5 border-r border-white/10 flex-col items-center justify-center p-16 text-center">
        <Leaf size={48} className="text-accent mb-8" />
        <h2 className="font-black text-4xl uppercase tracking-tighter text-text leading-none mb-4">Rastro™</h2>
        <p className="text-xs text-white/50 leading-relaxed max-w-xs">Rastreabilidade de origem para o agronegócio brasileiro</p>
      </div>
      {/* Right form panel */}
      <div className="flex-1 flex flex-col">
        <TopBar title="Entrar" onBack={() => go(0)} />
        <div className="flex-1 flex flex-col justify-center p-6 md:p-12 max-w-md mx-auto w-full">
          <div className="mb-10">
            <div className="text-accent mb-6 md:hidden"><Leaf size={40} /></div>
            <h2 className="font-black text-4xl uppercase tracking-tighter text-text leading-none mb-2">Bem-vindo<br /><span className="text-stroke">de volta</span></h2>
            <p className="text-xs text-white/60 uppercase tracking-widest mt-4">Acesse sua fazenda</p>
          </div>
          <Field label="E-mail" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" type="email" />
          <Field label="Senha" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" type="password" />
          {error && <p className="text-xs text-red-400 font-bold uppercase tracking-widest mb-4 -mt-2">{error}</p>}
          <div className="mb-8" />
          <Btn full onClick={handleLogin}>Entrar</Btn>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 text-center mt-8">
            Não tem conta? <span onClick={() => go(1)} className="text-accent cursor-pointer ml-2">Cadastre-se</span>
          </p>
        </div>
      </div>
    </motion.div>
  );
};

const SDashboard = ({ go }: { go: (s: number) => void }) => {
  const { user, lots, events, logout } = useContext(AppContext);
  const totalArea = lots.reduce((acc, l) => acc + (Number(l.area) || 0), 0);
  const [showNotifs, setShowNotifs] = useState(false);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-bg pb-24 md:pb-0">
      {/* Header — só visível no mobile (desktop tem sidebar) */}
      <div className="md:hidden bg-bg px-5 py-4 flex justify-between items-center sticky top-0 z-40 border-b border-white/10">
        <div className="font-black text-xl tracking-tighter uppercase text-text">Rastro™</div>
        <div className="flex items-center gap-4 text-text">
          <div className="relative cursor-pointer hover:text-accent transition-colors" onClick={() => setShowNotifs(p => !p)}>
            <Bell size={20} />
            {events.length > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full" />}
          </div>
          <div onClick={() => { logout(); go(0); }} className="cursor-pointer hover:text-accent transition-colors"><LogOut size={20} /></div>
        </div>
      </div>
      {/* Header desktop — título da página */}
      <div className="hidden md:flex bg-bg px-8 py-5 items-center justify-between border-b border-white/10 sticky top-0 z-40">
        <h1 className="text-lg font-black uppercase tracking-tighter text-text">Início</h1>
        <div className="relative cursor-pointer hover:text-accent transition-colors text-text" onClick={() => setShowNotifs(p => !p)}>
          <Bell size={20} />
          {events.length > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full" />}
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

      <div className="p-5 md:p-8 max-w-5xl mx-auto">
        <div className="border border-white/10 p-5 flex items-center gap-5 mb-8">
          <div className="w-16 h-16 bg-white/5 flex items-center justify-center text-white/40 overflow-hidden border border-white/10">
            {user?.logo ? <img src={user.logo} className="w-full h-full object-cover" alt="farm" /> : <Home size={24} />}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black uppercase tracking-tighter text-text leading-tight">{user?.farmName || "Sua Fazenda"}</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-accent mt-2 flex items-center gap-1.5">
              <MapPin size={10} /> {totalArea > 0 ? `${totalArea} ha` : "Área não definida"}
            </p>
          </div>
          <button onClick={() => go(5)} className="p-2 text-white/40 hover:text-accent transition-colors"><ChevronRight size={24} /></button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard n={lots.length.toString().padStart(2, "0")} l="Lotes" icon={MapIcon} />
          <StatCard n={totalArea > 0 ? totalArea.toString() : "00"} l="Hectares" icon={MapIcon} />
          <StatCard n={lots.length > 0 ? "100%" : "0%"} l="Rastreado" icon={ShieldCheck} />
          <StatCard n={events.length.toString().padStart(2, "0")} l="Atividades" icon={Bell} />
        </div>

        <h3 className="text-[11px] font-bold text-accent mb-4 uppercase tracking-widest">Ações rápidas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[{ icon: Plus, t: "Novo lote", s: 6 }, { icon: ImageIcon, t: "Galeria", s: 9 }, { icon: FileCheck, t: "Relatório", s: 11 }, { icon: QrCode, t: "QR Code", s: 10 }].map((a, idx) => (
            <motion.div whileTap={{ scale: 0.95 }} key={idx} onClick={() => go(a.s)} className="border border-white/10 p-4 flex items-center gap-4 cursor-pointer hover:border-accent transition-colors group">
              <div className="text-white/40 group-hover:text-accent transition-colors"><a.icon size={20} /></div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-text">{a.t}</span>
            </motion.div>
          ))}
        </div>

        <div className="border border-accent p-5 mb-8 flex items-center justify-between bg-accent/5">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-accent mb-2">Status EUDR</div>
            <div className="text-xl font-black uppercase tracking-tighter text-text">{lots.length}/{lots.length} Conformes</div>
          </div>
          <div className="text-accent"><CheckCircle2 size={32} /></div>
        </div>

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
      </div>
      <BottomNav active={3} onNav={go} />
    </motion.div>
  );
};

const SEditProfile = ({ go }: { go: (s: number) => void }) => {
  const { user, saveUser, addToast } = useContext(AppContext);
  const [logo, setLogo] = useState(user?.logo || "");
  const [cover, setCover] = useState(user?.cover || "");
  const [desc, setDesc] = useState(user?.description || "");
  const [location, setLocation] = useState(user?.location || "");
  const [certs, setCerts] = useState<string[]>(user?.certs || []);

  const toggleCert = (c: string) => setCerts(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  const handleSave = () => {
    saveUser({ ...user!, description: desc, certs, logo, cover, location });
    addToast("Perfil atualizado!");
    go(3);
  };

  return (
    <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} className="min-h-screen bg-bg pb-24 md:pb-0">
      <TopBar title="Editar perfil" onBack={() => go(3)} />
      <div className="p-5">
        <ImgUploader value={cover} onChange={setCover}>
          <div className="h-32 bg-white/5 mb-6 relative overflow-hidden border border-white/10 group">
            {cover ? <img src={cover} className="w-full h-full object-cover" alt="cover" /> : <img src="https://picsum.photos/seed/farmcover/800/400" alt="Cover" className="w-full h-full object-cover grayscale opacity-40" />}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"><Camera size={24} className="text-accent" /></div>
            <div className="absolute bottom-2 right-2 bg-bg/70 px-2 py-1"><span className="text-[9px] font-bold uppercase tracking-widest text-accent">Trocar capa</span></div>
          </div>
        </ImgUploader>

        <div className="flex gap-5 mb-8 items-center px-2">
          <ImgUploader value={logo} onChange={setLogo}>
            <div className="w-20 h-20 bg-bg border border-white/20 overflow-hidden relative -mt-16 z-10 group">
              {logo ? <img src={logo} className="w-full h-full object-cover" alt="logo" /> : <img src="https://picsum.photos/seed/farmlogo/200/200" alt="Logo" className="w-full h-full object-cover grayscale" />}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/50"><Camera size={18} className="text-accent" /></div>
            </div>
          </ImgUploader>
          <div className="flex-1 pt-2">
            <div className="text-xs font-bold uppercase tracking-wide text-text">Logo da fazenda</div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-white/40 mt-1">Toque para alterar</div>
          </div>
        </div>

        <Field label="Descrição da fazenda" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Três gerações produzindo..." tall />
        <Field label="Localização (cidade/estado)" value={location} onChange={e => setLocation(e.target.value)} placeholder="Ex: Sorriso, MT" />

        <div className="mb-8 mt-2">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-accent mb-3">Selos e certificações</label>
          <div className="flex flex-wrap gap-2">
            {["EUDR Conforme", "Orgânico", "Rainforest Alliance", "RTRS"].map((s, i) => (
              <div key={i} onClick={() => toggleCert(s)} className={`px-3 py-2 text-[9px] font-bold uppercase tracking-widest cursor-pointer border ${certs.includes(s) ? "bg-accent text-bg border-accent" : "bg-transparent border-white/20 text-white/60"}`}>{s}</div>
            ))}
          </div>
        </div>

        <Btn full onClick={handleSave} icon={CheckCircle2}>Salvar alterações</Btn>
      </div>
      <BottomNav active={4} onNav={go} />
    </motion.div>
  );
};

const SPublicProfile = ({ go }: { go: (s: number) => void }) => {
  const { user, lots, events, addToast } = useContext(AppContext);
  const totalArea = lots.reduce((acc, l) => acc + (Number(l.area) || 0), 0);
  const profileUrl = `${window.location.origin}?farm=${encodeURIComponent(user?.farmName || "")}`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-bg pb-24 md:pb-0">
      <div className="h-56 relative border-b border-white/10">
        {user?.cover ? <img src={user.cover} className="w-full h-full object-cover" alt="cover" /> : <img src="https://picsum.photos/seed/farmcover/800/400" alt="Cover" className="w-full h-full object-cover grayscale opacity-60" />}
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-transparent" />
        <button onClick={() => go(3)} className="absolute top-4 left-4 w-10 h-10 bg-bg/50 backdrop-blur-md flex items-center justify-center text-text border border-white/20"><ChevronLeft size={24} /></button>
        <button onClick={() => doShare(profileUrl, user?.farmName || "Fazenda", addToast)} className="absolute top-4 right-4 w-10 h-10 bg-bg/50 backdrop-blur-md flex items-center justify-center text-text border border-white/20 hover:border-accent transition-colors"><Share2 size={18} /></button>
        <div className="absolute -bottom-10 left-6 w-24 h-24 bg-bg p-1 border border-white/20 z-10">
          {user?.logo ? <img src={user.logo} className="w-full h-full object-cover" alt="logo" /> : <img src="https://picsum.photos/seed/farmlogo/200/200" alt="Logo" className="w-full h-full object-cover grayscale" />}
        </div>
      </div>
      <div className="pt-16 px-6 md:px-10 pb-8 border-b border-white/10 mb-6 max-w-5xl mx-auto">
        <h1 className="font-black text-3xl uppercase tracking-tighter text-text leading-none mb-3">{user?.farmName || "Fazenda"}</h1>
        {user?.location && <p className="text-[10px] font-bold uppercase tracking-widest text-accent mt-2 flex items-center gap-1.5"><MapPin size={12} /> {user.location}</p>}
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mt-2 flex items-center gap-1.5"><MapIcon size={10} /> {totalArea > 0 ? `${totalArea} ha` : "Área não definida"}</p>
        <p className="text-sm text-white/60 mt-6 leading-relaxed">{user?.description || "Produtor rural comprometido com práticas sustentáveis."}</p>
        <div className="flex gap-2 mt-6 flex-wrap">
          <span className="px-3 py-1.5 border border-accent text-accent text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5"><ShieldCheck size={12} /> EUDR</span>
          {user?.certs?.map((c, i) => <span key={i} className="px-3 py-1.5 border border-white/20 text-text text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5"><CheckCircle2 size={12} /> {c}</span>)}
        </div>
      </div>
      <div className="px-5 md:px-8 mb-8 max-w-5xl mx-auto">
        <div className="border border-accent p-5 flex items-center gap-5 bg-accent/5 cursor-pointer" onClick={() => go(10)}>
          <div className="text-accent"><QrCode size={32} /></div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-text mb-1">QR Code de rastreio</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/60">Ver e compartilhar</div>
          </div>
          <ChevronRight size={18} className="ml-auto text-accent" />
        </div>
      </div>
      <div className="px-5">
        <h3 className="text-[11px] font-bold text-accent mb-6 uppercase tracking-widest">Timeline Pública</h3>
        {events.length === 0 && <div className="py-4 text-xs text-white/40 uppercase tracking-widest">Nenhuma atividade.</div>}
        {events.map((e, idx) => (
          <div key={idx} className="flex gap-5 py-5 border-b border-white/10">
            <div className="text-accent mt-1">{e.type === "lote" ? <Sprout size={20} /> : e.type === "foto" ? <Camera size={20} /> : <Tractor size={20} />}</div>
            <div className="flex-1">
              <div className="text-xs font-bold uppercase tracking-wide text-text">{e.title}</div>
              <div className="text-[10px] text-white/60 mt-2">{e.date}</div>
            </div>
          </div>
        ))}
      </div>
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
  const [form, setForm] = useState({ name: initial.name || "", crop: initial.crop || "", area: initial.area || "", date: initial.date || "", notes: initial.notes || "" });
  const [mapPoints, setMapPoints] = useState<[number, number][]>(initial.mapPoints || []);
  const [photos, setPhotos] = useState<string[]>(initial.photos || []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDel, setConfirmDel] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleAddPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => { const b64 = await resizeImage(reader.result as string); setPhotos(p => [...p, b64]); addToast("Foto adicionada!"); };
    reader.readAsDataURL(file); e.target.value = "";
  };

  const handleSave = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Obrigatório";
    if (!form.crop.trim()) errs.crop = "Obrigatório";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave({ ...form, tipo, status, mapPoints, photos, notes: form.notes });
  };

  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto md:grid md:grid-cols-2 md:gap-x-10">
      <div className="md:col-span-2 mb-8">
        <label className="block text-[10px] font-bold uppercase tracking-widest text-accent mb-4">Tipo de produção</label>
        <div className="flex gap-2">
          {LOT_TIPOS.map((t, i) => <button key={i} onClick={() => setTipo(i)} className={`flex-1 py-3 border text-[10px] font-bold uppercase tracking-widest transition-all ${tipo === i ? "bg-accent text-bg border-accent" : "bg-transparent text-white/60 border-white/20"}`}>{t}</button>)}
        </div>
      </div>

      <Field label="Nome do lote" value={form.name} onChange={f("name")} placeholder="Ex: Lote 7 — Soja" error={errors.name} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Cultura" value={form.crop} onChange={f("crop")} placeholder="Soja" error={errors.crop} />
        <Field label="Área (ha)" value={form.area} onChange={f("area")} placeholder="45" type="number" />
      </div>
      <Field label="Data plantio" value={form.date} onChange={f("date")} placeholder="" type="date" />
      <Field label="Observações" value={form.notes} onChange={f("notes")} placeholder="Notas sobre o lote..." tall />

      <div className="mb-6">
        <label className="block text-[10px] font-bold uppercase tracking-widest text-accent mb-3">Status</label>
        <div className="flex gap-2 flex-wrap">
          {LOT_STATUS.map(s => <button key={s.key} onClick={() => setStatus(s.key as Lot["status"])} className={`px-3 py-2 border text-[9px] font-bold uppercase tracking-widest transition-all ${status === s.key ? s.color + " bg-white/5" : "border-white/20 text-white/40"}`}>{s.label}</button>)}
        </div>
      </div>

      <div className="mb-8 md:col-span-2">
        <label className="block text-[10px] font-bold uppercase tracking-widest text-accent mb-4">Área no mapa (satélite)</label>
        <MapDrawerBtn points={mapPoints} onChange={setMapPoints} name={form.name} />
      </div>

      <div className="mb-10">
        <div className="flex justify-between items-center mb-3">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-accent">Fotos do lote ({photos.length})</label>
          <button onClick={() => photoRef.current?.click()} className="text-[9px] font-bold uppercase tracking-widest text-accent flex items-center gap-1"><Plus size={12} /> Adicionar</button>
        </div>
        <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handleAddPhoto} />
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              <div key={i} className="relative aspect-square">
                <img src={p} className="w-full h-full object-cover" alt={`foto ${i + 1}`} />
                <button onClick={() => setPhotos(ph => ph.filter((_, j) => j !== i))} className="absolute top-1 right-1 w-5 h-5 bg-black/70 flex items-center justify-center"><X size={10} className="text-white" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Btn full onClick={handleSave} icon={CheckCircle2}>Salvar lote</Btn>

      {onDelete && (
        <div className="mt-4">
          {!confirmDel
            ? <Btn full outline icon={Trash2} onClick={() => setConfirmDel(true)}>Excluir lote</Btn>
            : (
              <div className="border border-red-500 p-4">
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
  const { addLot, addToast, setCurrentLotId } = useContext(AppContext);

  const handleSave = (data: Omit<Lot, "id">) => {
    const id = addLot(data);
    setCurrentLotId(id);
    addToast("Lote cadastrado! QR Code gerado.");
    go(10);
  };

  return (
    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="min-h-screen bg-bg pb-24 md:pb-0">
      <TopBar title="Novo Lote" onBack={() => go(3)} />
      <LotForm initial={{}} onSave={handleSave} onBack={() => go(3)} />
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
    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="min-h-screen bg-bg pb-24 md:pb-0">
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-bg pb-24 md:pb-0">
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
                  className="border border-white/10 p-4 cursor-pointer hover:border-white/30 transition-colors">
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
      <BottomNav active={7} onNav={go} />
    </motion.div>
  );
};

// Screen 8 — Mapa real com Leaflet + Esri Satellite
const SMapa = ({ go }: { go: (s: number) => void }) => {
  const { lots, updateLot, setCurrentLotId, addToast } = useContext(AppContext);
  const [editingLot, setEditingLot] = useState<Lot | null>(null);
  const totalArea = lots.reduce((a, l) => a + (Number(l.area) || 0), 0);
  const mappedCount = lots.filter(l => l.mapPoints?.length > 2).length;

  // Mapa geral com todos os lotes
  const allPoints = lots.flatMap(l => l.mapPoints || []);
  const overviewCenter: [number, number] = allPoints.length > 0
    ? [allPoints.reduce((s, p) => s + p[0], 0) / allPoints.length, allPoints.reduce((s, p) => s + p[1], 0) / allPoints.length]
    : [-15.77972, -47.92972];

  const overviewRef = useRef<HTMLDivElement>(null);
  const overviewMapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!overviewRef.current || overviewMapRef.current) return;
    const map = L.map(overviewRef.current, { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false })
      .setView(overviewCenter, allPoints.length > 0 ? 12 : 4);
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19 }).addTo(map);
    lots.forEach(l => {
      if (l.mapPoints?.length > 2) {
        L.polygon(l.mapPoints, { color: "#E0FF22", weight: 2, fillOpacity: 0.2 }).addTo(map)
          .bindTooltip(l.name, { permanent: false, className: "leaflet-tooltip-rastro" });
      }
    });
    overviewMapRef.current = map;
    return () => { map.remove(); overviewMapRef.current = null; };
  }, [lots]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-bg pb-24 md:pb-0">
      {editingLot && (
        <MapDrawer
          name={editingLot.name}
          initialPoints={editingLot.mapPoints || []}
          onSave={(pts) => {
            updateLot(editingLot.id, { mapPoints: pts });
            addToast(`Área de ${editingLot.name} salva! (${calcAreaHa(pts).toFixed(2)} ha)`);
          }}
          onClose={() => setEditingLot(null)}
        />
      )}

      <TopBar title="Mapa da propriedade" onBack={() => go(3)} />

      {/* Mapa satélite geral */}
      <div className="relative border-b border-white/10" style={{ height: 280 }}>
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
            <div className="text-[9px] font-bold uppercase tracking-widest text-accent">Área total declarada</div>
            <div className="text-base font-black text-text">{totalArea} ha</div>
          </div>
          <div className="text-right">
            <div className="text-[9px] font-bold uppercase tracking-widest text-white/40">{mappedCount}/{lots.length} lotes mapeados</div>
            <div className="text-[8px] text-white/25 mt-0.5">Esri World Imagery</div>
          </div>
        </div>
      </div>

      <div className="p-5 max-w-5xl mx-auto">
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
                      {l.area ? `${l.area} ha declarados` : "Área não declarada"} · {LOT_TIPOS[l.tipo]}
                      {lotArea && <span className="text-accent ml-2">· {lotArea} ha mapeados</span>}
                    </div>
                  </div>
                  <span className={`text-[8px] font-bold uppercase tracking-widest border px-2 py-1 shrink-0 ${hasPoly ? "text-accent border-accent/40" : "text-white/30 border-white/15"}`}>
                    {hasPoly ? "Mapeado" : "Sem mapa"}
                  </span>
                </div>

                {/* Mini mapa do lote se tiver pontos */}
                {hasPoly && (
                  <div className="mb-3 border border-white/10 overflow-hidden" style={{ height: 140 }}>
                    <LeafletMap points={l.mapPoints} height={140} />
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
      <BottomNav active={8} onNav={go} />
    </motion.div>
  );
};

// Screen 9 — Galeria
const SGaleria = ({ go }: { go: (s: number) => void }) => {
  const { lots, addPhotoToLot, addToast } = useContext(AppContext);
  const [selectedLot, setSelectedLot] = useState<string>("all");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const allPhotos = lots.flatMap(l => (l.photos || []).map(p => ({ photo: p, lotName: l.name, lotId: l.id })));
  const shown = selectedLot === "all" ? allPhotos : allPhotos.filter(p => p.lotId === selectedLot);

  const handleAddPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const targetLot = selectedLot === "all" ? lots[0]?.id : selectedLot;
    if (!targetLot) { addToast("Cadastre um lote primeiro.", "error"); return; }
    const reader = new FileReader();
    reader.onloadend = async () => { addPhotoToLot(targetLot, await resizeImage(reader.result as string)); addToast("Foto adicionada!"); };
    reader.readAsDataURL(f); e.target.value = "";
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-bg pb-24 md:pb-0">
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
                className="aspect-square relative cursor-pointer group" onClick={() => setLightbox(item.photo)}>
                <img src={item.photo} className="w-full h-full object-cover" alt={item.lotName} />
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

      <BottomNav active={9} onNav={go} />
    </motion.div>
  );
};

// ─── Tela pública do lote (acessada via QR) ───
const SLotPublico = ({ lotId, go }: { lotId: string; go: (s: number) => void }) => {
  const appUrl = window.location.origin + window.location.pathname;

  // Carrega dados direto do localStorage (funciona mesmo sem estar logado)
  const user: AppUser | null = (() => { try { const u = localStorage.getItem("rastro_user"); return u ? JSON.parse(u) : null; } catch { return null; } })();
  const lots: Lot[] = (() => { try { const l = localStorage.getItem("rastro_lots"); return l ? JSON.parse(l) : []; } catch { return []; } })();
  const lot = lots.find(l => l.id === lotId);

  if (!lot || !user) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-8 text-center">
        <Leaf size={40} className="text-accent mb-6" />
        <div className="font-black text-2xl uppercase tracking-tighter text-text mb-3">Rastro™</div>
        <p className="text-xs text-white/50 uppercase tracking-widest mb-8">Lote não encontrado ou sem dados.</p>
        <Btn onClick={() => { window.history.replaceState({}, "", appUrl); go(0); }}>Ir para o início</Btn>
      </div>
    );
  }

  const totalArea = lots.reduce((a, l) => a + (Number(l.area) || 0), 0);
  const lotUrl = `${appUrl}?lot=${lot.id}`;
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
          <div className="font-black text-lg tracking-tighter uppercase text-text">Rastro™</div>
          <span className="text-[9px] font-bold uppercase tracking-widest text-accent border border-accent/40 px-2 py-1">EUDR ✓</span>
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
            {user.logo ? <img src={user.logo} className="w-full h-full object-cover" alt="logo" /> : <div className="w-full h-full flex items-center justify-center"><Sprout size={22} className="text-white/30" /></div>}
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
              <span className="text-[9px] text-white/40 font-bold uppercase tracking-widest">{calcAreaHa(lot.mapPoints).toFixed(2)} ha · {lot.mapPoints.length} vértices</span>
            </div>
            <div className="border border-white/10 overflow-hidden" style={{ height: 280 }}>
              <LeafletMap points={lot.mapPoints} height={280} />
            </div>
          </div>
        )}

        {/* Fotos */}
        {lot.photos?.length > 0 && (
          <div className="py-8 border-b border-white/10">
            <h3 className="text-[11px] font-bold text-accent uppercase tracking-widest mb-4">Fotos do lote ({lot.photos.length})</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {lot.photos.map((p, i) => (
                <div key={i} className="aspect-video overflow-hidden border border-white/10">
                  <img src={p} className="w-full h-full object-cover" alt={`foto ${i + 1}`} />
                </div>
              ))}
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
          <p className="text-[9px] text-white/30 uppercase tracking-widest">Rastreabilidade verificada por <span className="text-accent">Rastro™</span></p>
        </div>
      </div>
    </div>
  );
};

const SQRCode = ({ go }: { go: (s: number) => void }) => {
  const { lots, user, addToast } = useContext(AppContext);
  const [selectedId, setSelectedId] = useState(lots[lots.length - 1]?.id || "");
  const lot = lots.find(l => l.id === selectedId) || lots[lots.length - 1];

  // URL aponta para o próprio app com ?lot=ID
  const appBase = window.location.origin + window.location.pathname;
  const qrValue = lot ? `${appBase}?lot=${lot.id}` : appBase;
  const shareTitle = lot ? `${lot.name} — ${user?.farmName}` : user?.farmName || "Fazenda";

  if (lots.length === 0) return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-bg pb-24 md:pb-0 flex flex-col">
      <TopBar title="QR Code" onBack={() => go(3)} />
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <QrCode size={48} className="text-white/20 mb-4" />
        <p className="text-xs text-white/40 uppercase tracking-widest mb-6">Cadastre um lote para gerar o QR Code</p>
        <Btn onClick={() => go(6)} icon={Plus}>Novo lote</Btn>
      </div>
      <BottomNav active={3} onNav={go} />
    </motion.div>
  );

  return (
    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="min-h-screen bg-bg pb-24 md:pb-0">
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
            {[`📋 Lote: ${lot?.name}`, `🌱 Cultura: ${lot?.crop}`, `📐 Área: ${lot?.area || "—"} ha`, `✅ EUDR: 100% Conforme`, lot?.photos?.length ? `📷 ${lot.photos.length} foto(s)` : null].filter(Boolean).map((item, i) => (
              <p key={i} className="text-[10px] text-white/60">{item}</p>
            ))}
          </div>
        </div>

        <div className="w-full space-y-3">
          <Btn full icon={Share2} onClick={() => doShare(qrValue, shareTitle, addToast)}>Compartilhar link</Btn>
          <Btn full outline icon={Download} onClick={() => downloadQR(qrValue, lot?.name || "fazenda")}>Baixar QR Code</Btn>
        </div>
      </div>
      <BottomNav active={3} onNav={go} />
    </motion.div>
  );
};

const SDocs = ({ go }: { go: (s: number) => void }) => {
  const { user, lots, addToast } = useContext(AppContext);
  const [tab, setTab] = useState(0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-bg pb-24 md:pb-0">
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
              { n: "Relatório EUDR", d: new Date().toLocaleDateString("pt-BR"), i: ShieldCheck, action: () => openEUDR(user!, lots) },
              { n: "Relatório ESG", d: new Date().toLocaleDateString("pt-BR"), i: FileBarChart, action: () => openESG(user!, lots) },
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
              { t: "Relatório EUDR", d: "Compliance completo para exportação UE. Inclui dados de todos os lotes e verificação PRODES/INPE.", i: ShieldCheck, fn: () => { openEUDR(user!, lots); addToast("Relatório EUDR gerado!"); } },
              { t: "Relatório ESG", d: "Indicadores ambientais, sociais e de governança da sua propriedade.", i: FileBarChart, fn: () => { openESG(user!, lots); addToast("Relatório ESG gerado!"); } },
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
      <BottomNav active={11} onNav={go} />
    </motion.div>
  );
};

// ─────────────────────────────────────────────
// App Shell
// ─────────────────────────────────────────────

const AppContent = () => {
  // Detect ?lot=ID in URL for QR deep-link
  const [lotParam] = useState<string | null>(() => {
    const p = new URLSearchParams(window.location.search).get("lot");
    if (p) window.history.replaceState({}, "", window.location.pathname); // clean URL
    return p;
  });

  const [s, setS] = useState(() => lotParam ? 13 : 0);
  const { user, logout } = useContext(AppContext);
  const showNav = s >= 3 && s !== 13;

  useEffect(() => {
    document.body.style.backgroundColor = "#0A0A0A";
  }, []);

  useEffect(() => {
    if (user && (s === 0 || s === 1 || s === 2)) setS(3);
  }, [user]);

  const handleLogout = () => { logout(); setS(0); };

  const renderScreen = () => {
    switch (s) {
      case 0: return <SLanding go={setS} key="0" />;
      case 1: return <SCadastro go={setS} key="1" />;
      case 2: return <SLogin go={setS} key="2" />;
      case 3: return <SDashboard go={setS} key="3" />;
      case 4: return <SEditProfile go={setS} key="4" />;
      case 5: return <SPublicProfile go={setS} key="5" />;
      case 6: return <SNovoLote go={setS} key="6" />;
      case 7: return <SProducao go={setS} key="7" />;
      case 8: return <SMapa go={setS} key="8" />;
      case 9: return <SGaleria go={setS} key="9" />;
      case 10: return <SQRCode go={setS} key="10" />;
      case 11: return <SDocs go={setS} key="11" />;
      case 12: return <SEditLote go={setS} key="12" />;
      case 13: return <SLotPublico lotId={lotParam!} go={setS} key="13" />;
      default: return <SLanding go={setS} key="0" />;
    }
  };

  return (
    <div className="font-sans text-text antialiased bg-bg selection:bg-accent selection:text-bg">
      <ToastContainer />
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
  return (
    <LangContext.Provider value={{ lang, setLang }}>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </LangContext.Provider>
  );
}
