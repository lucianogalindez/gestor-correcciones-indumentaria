import { HttpRepository } from './httpRepository';
import { LocalStorageRepository } from './localStorageRepository';
import type { CorreccionesRepository } from './repository';

interface Entorno {
  VITE_API_BASE_URL?: string;
  VITE_API_KEY?: string;
}

/** Con VITE_API_BASE_URL usa n8n; sin ella, el modo demo en localStorage. */
export function crearRepositorio(env: Entorno = import.meta.env): CorreccionesRepository {
  const base = env.VITE_API_BASE_URL?.trim();
  if (base) return new HttpRepository({ baseUrl: base, apiKey: env.VITE_API_KEY });
  return new LocalStorageRepository();
}

export type { CorreccionesRepository } from './repository';
export { RepoError, mensajeDeError } from './repository';
