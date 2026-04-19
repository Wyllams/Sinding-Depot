/**
 * compressImage — Comprime imagens no browser antes do upload.
 *
 * Redimensiona para maxWidth/maxHeight mantendo aspect ratio
 * e aplica compressão JPEG/WebP com qualidade configurável.
 *
 * ⚡ Redução típica: 5 MB → 400-500 KB (qualidade visual idêntica)
 */

const DEFAULT_MAX_WIDTH = 1920;
const DEFAULT_MAX_HEIGHT = 1920;
const DEFAULT_QUALITY = 0.82;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/gif'];

interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  /** Formato de saída. Padrão: image/jpeg */
  outputType?: 'image/jpeg' | 'image/webp';
}

/**
 * Verifica se o arquivo é uma imagem comprimível.
 */
export function isCompressibleImage(file: File): boolean {
  return IMAGE_TYPES.includes(file.type);
}

/**
 * Comprime uma imagem File, retornando uma nova File comprimida.
 * Se o arquivo não for imagem, retorna o original sem modificação.
 */
export async function compressImage(
  file: File,
  options?: CompressOptions
): Promise<File> {
  // Skip non-image files (videos, PDFs, etc.)
  if (!isCompressibleImage(file)) {
    return file;
  }

  const maxWidth = options?.maxWidth ?? DEFAULT_MAX_WIDTH;
  const maxHeight = options?.maxHeight ?? DEFAULT_MAX_HEIGHT;
  const quality = options?.quality ?? DEFAULT_QUALITY;
  const outputType = options?.outputType ?? 'image/jpeg';

  return new Promise<File>((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Se já é pequena o suficiente e o arquivo é leve, retorna original
      if (width <= maxWidth && height <= maxHeight && file.size < 500_000) {
        resolve(file);
        return;
      }

      // Calcula novas dimensões mantendo aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      // Desenha no Canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file); // fallback: retorna original
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Converte para Blob comprimido
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          // Se a compressão gerou um arquivo MAIOR, retorna o original
          if (blob.size >= file.size) {
            resolve(file);
            return;
          }

          // Mantém o nome original mas troca a extensão
          const ext = outputType === 'image/webp' ? '.webp' : '.jpg';
          const baseName = file.name.replace(/\.[^.]+$/, '');
          const newFile = new File([blob], `${baseName}${ext}`, {
            type: outputType,
            lastModified: Date.now(),
          });

          console.log(
            `🗜️ Image compressed: ${(file.size / 1024).toFixed(0)}KB → ${(newFile.size / 1024).toFixed(0)}KB (${Math.round((1 - newFile.size / file.size) * 100)}% saved)`
          );

          resolve(newFile);
        },
        outputType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image: ${file.name}`));
    };

    img.src = url;
  });
}

/**
 * Comprime múltiplos arquivos (imagens são comprimidas, outros passam direto).
 */
export async function compressFiles(files: File[], options?: CompressOptions): Promise<File[]> {
  return Promise.all(files.map((f) => compressImage(f, options)));
}
