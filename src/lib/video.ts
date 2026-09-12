/**
 * Cole aqui o link real do vídeo obrigatório.
 * Exemplos: YouTube, Vimeo, Google Drive, etc.
 *
 * VIDEO_URL = "https://www.youtube.com/watch?v=EXEMPLO"
 */
export const VIDEO_URL = "COLOCAR_LINK_AQUI";

export function isVideoConfigured() {
  const url = VIDEO_URL.trim();
  return url.length > 0 && !url.includes("COLOCAR_LINK_AQUI") && /^https?:\/\//i.test(url);
}
