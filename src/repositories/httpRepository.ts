import type { Correccion, Estado, NuevaCorreccion } from '../types';
import { limpiar } from '../lib/validacion';
import { ClienteHttp, type OpcionesCliente } from './clienteHttp';
import { normalizarLista, normalizarUna } from './normalizar';
import type { CorreccionesRepository } from './repository';

/** Adaptador contra los tres webhooks de n8n. */
export class HttpRepository implements CorreccionesRepository {
  readonly remoto = true;
  private readonly cliente: ClienteHttp;

  constructor(opciones: OpcionesCliente | ClienteHttp) {
    this.cliente = opciones instanceof ClienteHttp ? opciones : new ClienteHttp(opciones);
  }

  async listar(): Promise<Correccion[]> {
    return normalizarLista(await this.cliente.pedir('/correcciones'));
  }

  async crear(datos: NuevaCorreccion): Promise<Correccion> {
    return normalizarUna(await this.cliente.pedir('/correcciones-crear', { cuerpo: limpiar(datos) }));
  }

  async cambiarEstado(id: string, estado: Estado, cierre: string): Promise<Correccion> {
    return normalizarUna(await this.cliente.pedir('/correcciones-estado', { cuerpo: { id, estado, cierre } }));
  }
}
