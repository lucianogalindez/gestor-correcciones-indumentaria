import { HttpFichasRepository } from '../fichas/httpFichasRepository';
import { MockFichasRepository } from '../fichas/mockFichasRepository';
import type { FichasRepository } from '../fichas/repositorio';
import { ClienteHttp } from './clienteHttp';
import { HttpRepository } from './httpRepository';
import { LocalStorageRepository } from './localStorageRepository';
import type { CorreccionesRepository } from './repository';

interface Entorno {
  VITE_API_BASE_URL?: string;
  VITE_API_KEY?: string;
}

function clienteDe(env: Entorno): ClienteHttp | null {
  const base = env.VITE_API_BASE_URL?.trim();
  return base ? new ClienteHttp({ baseUrl: base, apiKey: env.VITE_API_KEY }) : null;
}

/** Con VITE_API_BASE_URL usa n8n; sin ella, el modo demo en localStorage. */
export function crearRepositorio(env: Entorno = import.meta.env): CorreccionesRepository {
  const cliente = clienteDe(env);
  return cliente ? new HttpRepository(cliente) : new LocalStorageRepository();
}

/** Con VITE_API_BASE_URL usa n8n; sin ella, un mock en memoria. */
export function crearRepositorioFichas(env: Entorno = import.meta.env): FichasRepository {
  const cliente = clienteDe(env);
  return cliente ? new HttpFichasRepository(cliente) : new MockFichasRepository();
}

export type { CorreccionesRepository } from './repository';
export { RepoError, mensajeDeError } from './repository';
