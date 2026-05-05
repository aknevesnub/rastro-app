/**
 * Cliente Supabase — usado no frontend para Storage de fotos e queries diretas.
 *
 * Para auth e mutations privilegiadas continue usando src/services/api.ts
 * (backend Express com bcrypt + JWT).
 *
 * Este cliente usa a anon key — RLS bloqueia tudo por padrão.
 * Adicione policies se quiser queries diretas do frontend.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resizeImage } from "./image";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

export const supabase = (): SupabaseClient | null => {
  if (!url || !anonKey) return null;
  if (!client) client = createClient(url, anonKey);
  return client;
};

// ── Storage helpers (substituem /uploads local) ───────────────────────────────

const PHOTOS_BUCKET = "photos";

/**
 * Faz upload de uma foto e retorna a URL pública.
 * Antes de usar, crie o bucket "photos" no dashboard Supabase:
 * Storage → New bucket → name=photos, public=true
 */
export const uploadPhoto = async (file: File, userId: string): Promise<string | null> => {
  const sb = supabase();
  if (!sb) return null;

  const optimized = await resizeImage(file);
  const ext = optimized.name.split(".").pop() || "jpg";
  const filename = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await sb.storage.from(PHOTOS_BUCKET).upload(filename, optimized, {
    contentType: optimized.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    console.error("[Supabase Storage] upload falhou:", error.message);
    return null;
  }

  const { data } = sb.storage.from(PHOTOS_BUCKET).getPublicUrl(filename);
  return data.publicUrl;
};

export const deletePhoto = async (publicUrl: string): Promise<boolean> => {
  const sb = supabase();
  if (!sb) return false;

  const marker = `/storage/v1/object/public/${PHOTOS_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return false;
  const path = publicUrl.slice(idx + marker.length);

  const { error } = await sb.storage.from(PHOTOS_BUCKET).remove([path]);
  return !error;
};
