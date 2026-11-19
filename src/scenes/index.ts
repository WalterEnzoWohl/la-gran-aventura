/**
 * Orden de las escenas. La prueba de gestos del hito 1 queda disponible con
 * ?prueba=1 (como primera escena), para ajustar los umbrales de las manos.
 */
import type { Juego } from '../core/Juego';
import type { DefinicionEscena } from '../core/SceneManager';
import { PruebaGestos } from './00_PruebaGestos';
import { Intro } from './01_Intro';
import { Customize } from './02_Customize';
import { PregnancyBirth } from './03_PregnancyBirth';
import { Baby } from './04_Baby';

export function definirEscenas(juego: Juego): DefinicionEscena[] {
  const escenas: DefinicionEscena[] = [
    { id: 'intro', crear: () => new Intro(juego) },
    { id: 'personalizacion', crear: () => new Customize(juego) },
    { id: 'embarazo', crear: () => new PregnancyBirth(juego) },
    { id: 'bebe', crear: () => new Baby(juego) },
  ];
  const prueba = typeof location !== 'undefined' && new URLSearchParams(location.search).get('prueba') === '1';
  if (prueba) escenas.unshift({ id: 'prueba', crear: () => new PruebaGestos(juego) });
  return escenas;
}
