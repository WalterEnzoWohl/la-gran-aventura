/** Estado de una partida: personajes, rasgos del hijo, nombre y progreso. */
import { NOMBRES_ADULTOS, PALETAS, type Genero, type TraitKey } from '../content/config';

export type { Genero };
import type { HijoRasgos } from './inheritance';

export interface Personaje {
  nombre: string;
  genero: Genero;
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

/** La pareja es siempre del otro género. */
export function generoOpuesto(g: Genero): Genero {
  return g === 'hombre' ? 'mujer' : 'hombre';
}

export function sortearNombre(genero: Genero, excluir: string[] = [], rng: Rng = Math.random): string {
  const lista = NOMBRES_ADULTOS[genero];
  const pool = lista.filter((n) => !excluir.includes(n));
  return pick(pool.length ? pool : lista, rng);
}

/** Cambia el género del jugador: la pareja pasa al otro y los dos sortean nombres acordes. */
export function cambiarGenero(estado: GameState, genero: Genero, rng: Rng = Math.random): void {
  if (estado.jugador.genero === genero) return;
  estado.jugador.genero = genero;
  estado.pareja.genero = generoOpuesto(genero);
  estado.jugador.nombre = sortearNombre(genero, [], rng);
  estado.pareja.nombre = sortearNombre(estado.pareja.genero, [estado.jugador.nombre], rng);
}

function rasgosAlAzar(rng: Rng): Pick<Personaje, TraitKey> {
  const i = (k: TraitKey) => Math.floor(rng() * PALETAS[k].length);
  return { pelo: i('pelo'), piel: i('piel'), ojos: i('ojos') };
}

/** Partida nueva: nombres sorteados y rasgos al azar, así se puede tocar "¡Listo!" de inmediato. */
export function nuevaPartida(rng: Rng = Math.random): GameState {
  const genero: Genero = rng() < 0.5 ? 'mujer' : 'hombre';
  const nombreJugador = sortearNombre(genero, [], rng);
  const generoPareja = generoOpuesto(genero);
  return {
    jugador: { nombre: nombreJugador, genero, ...rasgosAlAzar(rng) },
    pareja: { nombre: sortearNombre(generoPareja, [nombreJugador], rng), genero: generoPareja, ...rasgosAlAzar(rng) },
    hijo: null,
    nombreHijo: '',
    progreso: [],
  };
}
