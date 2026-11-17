/**
 * Orden de las escenas. En el hito 1 solo existe la prueba de gestos;
 * en los hitos siguientes se agregan 01_Intro … 07_Ending.
 */
import type { Juego } from '../core/Juego';
import type { DefinicionEscena } from '../core/SceneManager';
import { PruebaGestos } from './00_PruebaGestos';

export function definirEscenas(juego: Juego): DefinicionEscena[] {
  return [{ id: 'prueba', crear: () => new PruebaGestos(juego) }];
}
