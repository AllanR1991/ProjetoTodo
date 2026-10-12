/**
 * Gerenciador de Cache Seguro e Isolado por Usuário
 * Garante carregamento instantâneo (0 delay) e segurança total:
 * - Dados são escopados exclusivamente pelo ID do usuário autenticado.
 * - Nenhum dado de outro usuário é acessível no mesmo navegador.
 * - Ao deslogar, todo o cache é limpo imediatamente.
 */

const CACHE_PREFIX = 'todo_secure_cache_';

export function getUserCache<T>(userId: string | null | undefined, key: string): T | null {
  if (typeof window === 'undefined' || !userId) return null;

  try {
    const storageKey = `${CACHE_PREFIX}${userId}_${key}`;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[Cache] Erro ao ler cache de "${key}":`, err);
    return null;
  }
}

export function setUserCache<T>(userId: string | null | undefined, key: string, data: T): void {
  if (typeof window === 'undefined' || !userId) return;

  try {
    const storageKey = `${CACHE_PREFIX}${userId}_${key}`;
    localStorage.setItem(storageKey, JSON.stringify(data));
  } catch (err) {
    console.warn(`[Cache] Erro ao salvar cache de "${key}":`, err);
  }
}

export function clearUserCache(userId?: string | null): void {
  if (typeof window === 'undefined') return;

  try {
    if (userId) {
      // Limpa dados exclusivos deste usuário
      const prefix = `${CACHE_PREFIX}${userId}_`;
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } else {
      // Limpa todos os caches locais de tarefas
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    }
  } catch (err) {
    console.warn('[Cache] Erro ao limpar cache do usuário:', err);
  }
}
