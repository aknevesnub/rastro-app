/**
 * Resize + compress de imagem no cliente antes do upload.
 * Reduz tamanho de fotos da câmera (3-5MB) pra ~150-300KB.
 */

const MAX_DIM = 1600;
const QUALITY = 0.82;

export const resizeImage = async (file: File): Promise<File> => {
  // Skip se não for imagem ou já for pequena (< 400KB)
  if (!file.type.startsWith("image/") || file.size < 400 * 1024) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const scale = Math.min(1, MAX_DIM / Math.max(width, height));
    if (scale === 1 && file.type === "image/webp") {
      bitmap.close?.();
      return file;
    }

    const targetW = Math.round(width * scale);
    const targetH = Math.round(height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close?.();

    const blob: Blob | null = await new Promise(r =>
      canvas.toBlob(r, "image/webp", QUALITY)
    );
    if (!blob) return file;

    // Se resize ficou maior que original (raro), volta original
    if (blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}.webp`, { type: "image/webp" });
  } catch {
    return file;
  }
};
