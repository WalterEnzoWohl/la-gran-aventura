/**
 * Herencia: reglas simples y lúdicas, no genética real.
 *  - Pelo y ojos: 45% del jugador, 45% de la pareja, 10% sorpresa (cualquiera de las 5 opciones).
 *  - Piel: mezcla al 50% entre los dos tonos elegidos.
 * Acepta una semilla opcional para que los tests sean deterministas.
 */
import type { Personaje, Rng } from './GameState';

export type Origen = 'jugador' | 'pareja' | 'sorpresa';

export interface RasgoHeredado {
  indice: number;
  origen: Origen;
}

export interface HijoRasgos {
  pelo: RasgoHeredado;
  ojos: RasgoHeredado;
  /** Color de piel ya mezclado (#rrggbb). */
  piel: string;
}

/** Generador pseudoaleatorio con semilla (mulberry32). */
export function rngConSemilla(semilla: number): Rng {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function heredarRasgo(jugador: number, pareja: number, opciones: number, rng: Rng): RasgoHeredado {
  const r = rng();
  if (r < 0.45) return { indice: jugador, origen: 'jugador' };
  if (r < 0.9) return { indice: pareja, origen: 'pareja' };
  return { indice: Math.min(opciones - 1, Math.floor(rng() * opciones)), origen: 'sorpresa' };
}

/** Interpola dos colores #rrggbb (t = 0 → a, t = 1 → b). */
export function mezclarColor(a: string, b: string, t = 0.5): string {
  const pa = hexARgb(a);
  const pb = hexARgb(b);
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

function hexARgb(hex: string): number[] {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

export interface Paletas {
  pelo: { color: string }[];
  piel: { color: string }[];
  ojos: { color: string }[];
}

export function heredar(
  jugador: Personaje,
  pareja: Personaje,
  paletas: Paletas,
  semilla?: number,
): HijoRasgos {
  const rng = semilla === undefined ? Math.random : rngConSemilla(semilla);
  return {
    pelo: heredarRasgo(jugador.pelo, pareja.pelo, paletas.pelo.length, rng),
    ojos: heredarRasgo(jugador.ojos, pareja.ojos, paletas.ojos.length, rng),
    piel: mezclarColor(paletas.piel[jugador.piel].color, paletas.piel[pareja.piel].color, 0.5),
  };
}
