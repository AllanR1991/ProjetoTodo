/**
 * Gera um identificador único de forma compatível com todos os navegadores,
 * com suporte nativo a crypto.randomUUID em HTTPS/localhost e fallback seguro em HTTP/rede local.
 */
export function generateUUID(): string {
  if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.randomUUID === 'function') {
    try {
      return window.crypto.randomUUID();
    } catch {
      // fallback caso o contexto não seja seguro
    }
  }

  // Fallback baseado em Math.random e timestamp para contextos não-seguros (ex: IP local sem SSL)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
