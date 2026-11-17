/** Estado de una partida: personajes, rasgos del hijo, nombre y progreso. */
import { NOMBRES_ADULTOS, PALETAS, type TraitKey } from '../content/config';
import type { HijoRasgos } from './inheritance';

export interface Personaje {
  nombre: string;
  /** Índices en las paletas de config.ts. */
  pelo: number;
  piel: number;
  ojos: number;
}

export interface GameState {
  jugador: Personaje;
  pareja: Personaje;
  hijo: HijoRasgos | null;
  nombreHijo: string;
  /** Ids de las escenas completadas en esta partida. */
  progreso: string[];
}

export type Rng = () => number;

export function pick<T>(list: readonly T[], rng: Rng = Math.random): T {
  return list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
}

export function sortearNombre(excluir: string[] = [], rng: Rng = Math.random): string {
  const pool = NOMBRES_ADULTOS.filter((n) => !excluir.includes(n));
  return pick(pool.length ? pool : NOMBRES_ADULTOS, rng);
}

function rasgosAlAzar(rng: Rng): Pick<Personaje, TraitKey> {
  const i = (k: TraitKey) => Math.floor(rng() * PALETAS[k].length);
  return { pelo: i('pelo'), piel: i('piel'), ojos: i('ojos') };
}

/** Partida nueva: nombres sorteados y rasgos al azar, así se puede tocar "¡Listo!" de inmediato. */
export function nuevaPartida(rng: Rng = Math.random): GameState {
  const nombreJugador = sortearNombre([], rng);
  return {
    jugador: { nombre: nombreJugador, ...rasgosAlAzar(rng) },
    pareja: { nombre: sortearNombre([nombreJugador], rng), ...rasgosAlAzar(rng) },
    hijo: null,
    nombreHijo: '',
    progreso: [],
  };
}
