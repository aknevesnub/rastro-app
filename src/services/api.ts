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

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const tk = token.get();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(tk ? { Authorization: `Bearer ${tk}` } : {}),
      ...(options.headers ?? {}),
    },
  });

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

// ── Photos ────────────────────────────────────────────────────────────────────

export const photos = {
  upload: async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append("photo", file);
    const tk = token.get();
    const res = await fetch(`${BASE}/api/photos`, {
      method: "POST",
      headers: tk ? { Authorization: `Bearer ${tk}` } : {},
      body: fd,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Erro no upload");
    }
    const { url } = await res.json();
    return url;
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────

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
  products?: { id: string; name: string }[];
  certs?: { id: string; name: string }[];
  createdAt?: string;
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
