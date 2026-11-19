/**
 * Registro anónimo de eventos: sin nombres ni datos personales.
 * Se guarda en localStorage y, si hay `metricsEndpoint` y conexión, se envía por POST.
 * (La página admin.html con totales y CSV llega en el hito 6.)
 */

export type TipoEvento = 'session_start' | 'scene_enter' | 'mission_complete' | 'stage_complete' | 'session_end';

export interface Evento {
  tipo: TipoEvento;
  sesion: string;
  /** Fecha y hora ISO. */
  t: string;
  /** Segundos desde el inicio de la sesión. */
  seg: number;
  escena?: string;
  datos?: Record<string, string | number | boolean>;
  enviado?: boolean;
}

export const CLAVE = 'lga.eventos.v1';
const MAX_EVENTOS = 20000;

export interface Almacen {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

function almacenPorDefecto(): Almacen | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function leerEventos(almacen: Almacen | null = almacenPorDefecto()): Evento[] {
  if (!almacen) return [];
  try {
    const v = JSON.parse(almacen.getItem(CLAVE) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Borra todas las métricas guardadas en este dispositivo. */
export function borrarEventos(almacen: Almacen | null = almacenPorDefecto()): void {
  if (!almacen) return;
  try {
    almacen.setItem(CLAVE, '[]');
  } catch {
    // Nada que hacer.
  }
}

function guardar(lista: Evento[], almacen: Almacen | null): void {
  if (!almacen) return;
  try {
    almacen.setItem(CLAVE, JSON.stringify(lista.slice(-MAX_EVENTOS)));
  } catch {
    // Almacenamiento lleno o bloqueado: el juego sigue igual.
  }
}

export class Metrics {
  sesion: string | null = null;
  private inicio = 0;

  constructor(
    private endpoint = '',
    private almacen: Almacen | null = almacenPorDefecto(),
    private ahora: () => number = () => performance.now(),
  ) {}

  iniciarSesion(): void {
    if (this.sesion) this.terminarSesion();
    this.sesion = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    this.inicio = this.ahora();
    this.registrar('session_start');
  }

  escena(id: string): void {
    this.registrar('scene_enter', id);
  }

  mision(escena: string, mision: string, tiempo: number, pistas: number, autocompletada: boolean): void {
    this.registrar('mission_complete', escena, { mision, tiempo: redondear(tiempo), pistas, autocompletada });
  }

  etapa(escena: string, tiempo: number, topeAlcanzado: boolean): void {
    this.registrar('stage_complete', escena, { tiempo: redondear(tiempo), topeAlcanzado });
  }

  terminarSesion(): void {
    if (!this.sesion) return;
    this.registrar('session_end', undefined, { duracionTotal: redondear((this.ahora() - this.inicio) / 1000) });
    this.sesion = null;
    void this.enviar();
  }

  private registrar(tipo: TipoEvento, escena?: string, datos?: Evento['datos']): void {
    if (!this.sesion) return;
    const lista = leerEventos(this.almacen);
    lista.push({
      tipo,
      sesion: this.sesion,
      t: new Date().toISOString(),
      seg: redondear((this.ahora() - this.inicio) / 1000),
      ...(escena ? { escena } : {}),
      ...(datos ? { datos } : {}),
    });
    guardar(lista, this.almacen);
  }

  /** Envía los eventos pendientes. Sin conexión, se reintenta al terminar la próxima sesión. */
  async enviar(): Promise<void> {
    if (!this.endpoint || typeof fetch === 'undefined') return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    const pendientes = leerEventos(this.almacen).filter((e) => !e.enviado);
    if (!pendientes.length) return;
    try {
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendientes.map(({ enviado: _e, ...ev }) => ev)),
      });
      if (!res.ok) return;
      const claves = new Set(pendientes.map((e) => e.sesion + e.t + e.tipo));
      guardar(leerEventos(this.almacen).map((e) => (claves.has(e.sesion + e.t + e.tipo) ? { ...e, enviado: true } : e)), this.almacen);
    } catch {
      // Sin conexión: queda pendiente.
    }
  }
}

function redondear(n: number): number {
  return Math.round(n * 10) / 10;
}
