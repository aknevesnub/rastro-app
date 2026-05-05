/**
 * Rastro API client
 *
 * Quando VITE_API_URL estiver definido, todas as operações vão para o backend.
 * Sem VITE_API_URL o app continua funcionando com localStorage (modo offline).
 */

const BASE = import.meta.env.VITE_API_URL ?? "";

// ── Token management ──────────────────────────────────────────────────────────

export const token = {
  get: () => localStorage.getItem("rastro_token"),
  set: (t: string) => localStorage.setItem("rastro_token", t),
  clear: () => localStorage.removeItem("rastro_token"),
};

// ── Fetch wrapper ─────────────────────────────────────────────────────────────

const DEFAULT_TIMEOUT_MS = 20_000;

async function request<T>(
  path: string,
  options: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const tk = token.get();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        ...(tk ? { Authorization: `Bearer ${tk}` } : {}),
        ...(options.headers ?? {}),
      },
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new Error("Tempo limite excedido. Verifique sua conexão.");
    }
    throw new Error("Falha de rede. Verifique sua conexão.");
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 401) {
    // Token expirado/inválido: limpa e força re-login (exceto rotas públicas/login/register)
    const isAuthRoute = path.includes("/api/auth/login") || path.includes("/api/auth/register") ||
      path.includes("/api/auth/forgot-password") || path.includes("/api/auth/reset-password") ||
      path.includes("/api/auth/verify-email");
    if (!isAuthRoute && tk) {
      token.clear();
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const auth = {
  register: (data: {
    email: string;
    password: string;
    farmName: string;
    name?: string;
    phone?: string;
  }) =>
    request<{ token: string; user: ApiUser }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (email: string, password: string) =>
    request<{ token: string; user: ApiUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),

  forgotPassword: (email: string) =>
    request<{ ok: boolean }>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (resetToken: string, password: string) =>
    request<{ ok: boolean }>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token: resetToken, password }),
    }),

  verifyEmail: (verifyToken: string) =>
    request<{ ok: boolean }>(`/api/auth/verify-email?token=${encodeURIComponent(verifyToken)}`),

  resendVerification: () =>
    request<{ ok: boolean; alreadyVerified?: boolean }>("/api/auth/resend-verification", {
      method: "POST",
    }),

  deleteAccount: () =>
    request<{ ok: boolean }>("/api/auth/account", { method: "DELETE" }),
};

// ── Farms ─────────────────────────────────────────────────────────────────────

export const farms = {
  list: () => request<ApiUser[]>("/api/farms"),

  me: () => request<ApiUser>("/api/farms/me"),

  getById: (id: string) => request<ApiUser>(`/api/farms/${id}`),

  update: (data: Partial<Omit<ApiUser, "products" | "certs">> & { products?: string[]; certs?: string[] }) =>
    request<ApiUser>("/api/farms/me", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteAccount: () =>
    request<{ ok: boolean }>("/api/farms/me", { method: "DELETE" }),
};

// ── Lots ──────────────────────────────────────────────────────────────────────

export const lots = {
  list: () => request<ApiLot[]>("/api/lots"),

  getById: (id: string) => request<ApiLot>(`/api/lots/${id}`),

  getPublic: (id: string) => request<ApiLotPublic>(`/api/lots/public/${id}`),

  create: (data: Partial<ApiLot>) =>
    request<ApiLot>("/api/lots", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<ApiLot>) =>
    request<ApiLot>(`/api/lots/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  remove: (id: string) =>
    request<{ ok: boolean }>(`/api/lots/${id}`, { method: "DELETE" }),

  events: () => request<ApiEvent[]>("/api/lots/events/all"),
};

// ── Practices (autodeclaração de boas práticas) ──────────────────────────────

export const practices = {
  list: () => request<ApiPractice[]>("/api/practices"),

  upsert: (data: {
    category: string;
    key: string;
    name: string;
    active?: boolean;
    startDate?: string | null;
    photoUrl?: string | null;
    notes?: string | null;
  }) =>
    request<ApiPractice>("/api/practices", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Omit<ApiPractice, "id" | "userId" | "category" | "key">>) =>
    request<ApiPractice>(`/api/practices/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  remove: (id: string) =>
    request<{ ok: boolean }>(`/api/practices/${id}`, { method: "DELETE" }),
};

// ── Documents (CAR, CCIR, licenças, etc — autodeclaração) ───────────────────

export const documents = {
  list: () => request<ApiDocument[]>("/api/documents"),

  upload: async (data: {
    file: File;
    type: string;
    name: string;
    expiresAt?: string | null;
    notes?: string | null;
  }): Promise<ApiDocument> => {
    // Validação client-side antes do upload (UX rápida; servidor faz validação real)
    const MAX = 10 * 1024 * 1024;
    if (data.file.size > MAX) throw new Error("Arquivo excede 10 MB");
    const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!ALLOWED.includes(data.file.type)) {
      throw new Error("Tipo de arquivo não permitido (PDF, JPEG, PNG ou WebP)");
    }

    const fd = new FormData();
    fd.append("file", data.file);
    fd.append("type", data.type);
    fd.append("name", data.name);
    if (data.expiresAt) fd.append("expiresAt", data.expiresAt);
    if (data.notes) fd.append("notes", data.notes);
    const tk = token.get();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60_000);
    let res: Response;
    try {
      res = await fetch(`${BASE}/api/documents`, {
        method: "POST",
        headers: tk ? { Authorization: `Bearer ${tk}` } : {},
        body: fd,
        signal: ctrl.signal,
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") throw new Error("Upload demorou demais. Tente novamente.");
      throw new Error("Falha de rede no upload. Verifique sua conexão.");
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Erro no upload");
    }
    return res.json();
  },

  update: (id: string, data: { name?: string; expiresAt?: string | null; notes?: string | null }) =>
    request<ApiDocument>(`/api/documents/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  remove: (id: string) =>
    request<{ ok: boolean }>(`/api/documents/${id}`, { method: "DELETE" }),
};

// ── Photos ────────────────────────────────────────────────────────────────────

export const photos = {
  upload: async (file: File): Promise<string> => {
    const MAX = 5 * 1024 * 1024;
    if (file.size > MAX) throw new Error("Imagem excede 5 MB");
    const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
    if (!ALLOWED.includes(file.type)) {
      throw new Error("Tipo de imagem não permitido (JPEG, PNG ou WebP)");
    }

    const { resizeImage } = await import("./image");
    const optimized = await resizeImage(file);
    const fd = new FormData();
    fd.append("photo", optimized);
    const tk = token.get();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60_000);
    let res: Response;
    try {
      res = await fetch(`${BASE}/api/photos`, {
        method: "POST",
        headers: tk ? { Authorization: `Bearer ${tk}` } : {},
        body: fd,
        signal: ctrl.signal,
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") throw new Error("Upload demorou demais. Tente novamente.");
      throw new Error("Falha de rede no upload. Verifique sua conexão.");
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Erro no upload");
    }
    const { url } = await res.json();
    return url;
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────

export type ProfileMode = "commodity" | "produto";

export interface ApiUser {
  id: string;
  email: string;
  farmName: string;
  name?: string;
  phone?: string;
  location?: string;
  area?: number;
  description?: string;
  logoUrl?: string;
  coverUrl?: string;
  logoTransform?: { scale: number; x: number; y: number };
  coverTransform?: { scale: number; x: number; y: number };
  profileMode?: ProfileMode;
  products?: { id: string; name: string }[];
  certs?: { id: string; name: string }[];
  practices?: ApiPractice[];
  /**
   * Lotes públicos da fazenda — só vêm preenchidos no GET /api/farms/:id
   * (visualização pública). Em /me ou na lista geral fica undefined.
   * Campos cuidadosamente expostos: nada que não esteja já em /lots/public/:id.
   */
  lots?: ApiPublicLot[];
  createdAt?: string;
}

export interface ApiPublicLot {
  id: string;
  name: string;
  crop: string;
  area?: number | null;
  status: string;
  eudrCompliant: boolean;
  harvestDate?: string | null;
  expiryDate?: string | null;
  geoPolygon?: { lat: number; lng: number }[] | null;
}

export interface ApiPractice {
  id: string;
  userId?: string;
  category: string;   // "solo" | "biodiversidade" | "pecuaria" | "agua" | "insumos" | "residuos"
  key: string;        // identificador estável: "plantio_direto", "ilpf", etc.
  name: string;       // rótulo: "Plantio Direto"
  active: boolean;
  startDate?: string | null;
  photoUrl?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiDocument {
  id: string;
  userId?: string;
  type: string;       // "car" | "ccir" | "itr" | "matricula" | "licenca_ambiental" | "outorga_agua" | "projeto_tecnico" | "outro"
  name: string;
  url: string;
  fileSize?: number | null;
  mimeType?: string | null;
  expiresAt?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiLot {
  id: string;
  userId: string;
  name: string;
  crop: string;
  area?: number;
  harvestDate?: string;
  expiryDate?: string;
  status: string;
  eudrCompliant: boolean;
  notes?: string;
  geoPolygon?: { lat: number; lng: number }[];
  photos?: ApiLotPhoto[];
  createdAt?: string;
}

export interface ApiLotPublic extends ApiLot {
  user: {
    id: string;
    farmName: string;
    location?: string;
    area?: number;
    logoUrl?: string;
    logoTransform?: { scale: number; x: number; y: number };
    products?: { id: string; name: string }[];
    certs?: { id: string; name: string }[];
    practices?: ApiPractice[];
  };
}

export interface ApiLotPhoto {
  id: string;
  lotId: string;
  url: string;
  transform?: { scale: number; x: number; y: number };
  position: number;
}

export interface ApiEvent {
  id: string;
  userId: string;
  lotId?: string;
  type: string;
  message?: string;
  createdAt: string;
}
