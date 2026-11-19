/**
 * Totales y exportación CSV de los eventos de métricas (lógica pura, con tests).
 * La usa admin.html.
 */
import type { Evento } from './Metrics';

export interface ResumenMision {
  mision: string;
  escena: string;
  veces: number;
  tiempoPromedio: number;
  pistasPromedio: number;
  /** Porcentaje de veces que se completó sola (0 a 100). */
  autocompletadaPct: number;
}

export interface ResumenEtapa {
  etapa: string;
  veces: number;
  tiempoPromedio: number;
  /** Porcentaje de veces que se llegó al tope (0 a 100). */
  topePct: number;
}

export interface Resumen {
  sesiones: number;
  /** Sesiones que llegaron al final. */
  completas: number;
  /** Porcentaje de sesiones que llegaron al final (0 a 100). */
  finalizacionPct: number;
  /** Duración promedio de las sesiones terminadas (s). */
  duracionPromedio: number | null;
  duracionMaxima: number | null;
  misiones: ResumenMision[];
  etapas: ResumenEtapa[];
  pendientesDeEnvio: number;
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const promedio = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function resumir(eventos: Evento[], escenaFinal = 'final'): Resumen {
  const sesiones = new Set<string>();
  const completas = new Set<string>();
  const duraciones: number[] = [];
  const misiones = new Map<string, { escena: string; tiempos: number[]; pistas: number[]; auto: number }>();
  const etapas = new Map<string, { tiempos: number[]; tope: number }>();

  for (const e of eventos) {
    if (e.tipo === 'session_start') sesiones.add(e.sesion);
    if (e.tipo === 'scene_enter' && e.escena === escenaFinal) completas.add(e.sesion);
    if (e.tipo === 'session_end' && typeof e.datos?.duracionTotal === 'number') duraciones.push(e.datos.duracionTotal);
    if (e.tipo === 'mission_complete' && e.datos) {
      const clave = `${e.escena}/${e.datos.mision}`;
      const m = misiones.get(clave) ?? { escena: e.escena ?? '', tiempos: [], pistas: [], auto: 0 };
      m.tiempos.push(Number(e.datos.tiempo) || 0);
      m.pistas.push(Number(e.datos.pistas) || 0);
      if (e.datos.autocompletada) m.auto++;
      misiones.set(clave, m);
    }
    if (e.tipo === 'stage_complete' && e.escena && e.datos) {
      const s = etapas.get(e.escena) ?? { tiempos: [], tope: 0 };
      s.tiempos.push(Number(e.datos.tiempo) || 0);
      if (e.datos.topeAlcanzado) s.tope++;
      etapas.set(e.escena, s);
    }
  }

  return {
    sesiones: sesiones.size,
    completas: completas.size,
    finalizacionPct: sesiones.size ? r1((completas.size / sesiones.size) * 100) : 0,
    duracionPromedio: duraciones.length ? r1(promedio(duraciones)) : null,
    duracionMaxima: duraciones.length ? r1(Math.max(...duraciones)) : null,
    misiones: [...misiones].map(([clave, m]) => ({
      mision: clave.slice(clave.indexOf('/') + 1),
      escena: m.escena,
      veces: m.tiempos.length,
      tiempoPromedio: r1(promedio(m.tiempos)),
      pistasPromedio: r1(promedio(m.pistas)),
      autocompletadaPct: r1((m.auto / m.tiempos.length) * 100),
    })),
    etapas: [...etapas].map(([etapa, s]) => ({
      etapa,
      veces: s.tiempos.length,
      tiempoPromedio: r1(promedio(s.tiempos)),
      topePct: r1((s.tope / s.tiempos.length) * 100),
    })),
    pendientesDeEnvio: eventos.filter((e) => !e.enviado).length,
  };
}

function celda(v: unknown): string {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Un evento por fila. Sin datos personales: solo ids de sesión al azar. */
export function eventosACsv(eventos: Evento[]): string {
  const columnas = ['sesion', 'fecha', 'segundo', 'tipo', 'escena', 'mision', 'tiempo', 'pistas', 'autocompletada', 'topeAlcanzado', 'duracionTotal'];
  const filas = eventos.map((e) =>
    [
      e.sesion, e.t, e.seg, e.tipo, e.escena,
      e.datos?.mision, e.datos?.tiempo, e.datos?.pistas,
      e.datos?.autocompletada === undefined ? '' : e.datos.autocompletada ? 1 : 0,
      e.datos?.topeAlcanzado === undefined ? '' : e.datos.topeAlcanzado ? 1 : 0,
      e.datos?.duracionTotal,
    ].map(celda).join(','),
  );
  return [columnas.join(','), ...filas].join('\n') + '\n';
}
