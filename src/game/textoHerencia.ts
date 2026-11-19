/** Tarjeta de nacimiento: cuenta la herencia con nombres, nunca con porcentajes. */
import { PALETAS } from '../content/config';
import { t } from '../content/textos';
import type { Personaje } from './GameState';
import type { HijoRasgos, RasgoHeredado } from './inheritance';

function frase(r: RasgoHeredado, rasgo: 'pelo' | 'ojos', jugador: Personaje, pareja: Personaje): string {
  if (r.origen === 'sorpresa') {
    const color = t(`rasgos.${rasgo}.${PALETAS[rasgo][r.indice].id}`);
    return t(rasgo === 'pelo' ? 'nacimiento.peloSorpresa' : 'nacimiento.ojosSorpresa', { color });
  }
  const nombre = r.origen === 'jugador' ? jugador.nombre : pareja.nombre;
  return t(rasgo === 'pelo' ? 'nacimiento.peloDe' : 'nacimiento.ojosDe', { nombre });
}

/** "¡Nació Thiago! Sacó el pelo de Lucía y los ojos de Martín." */
export function textoNacimiento(nombreHijo: string, hijo: HijoRasgos, jugador: Personaje, pareja: Personaje): string {
  return (
    t('nacimiento.nacio', { nombre: nombreHijo }) +
    '\n' +
    t('nacimiento.saco', { pelo: frase(hijo.pelo, 'pelo', jugador, pareja), ojos: frase(hijo.ojos, 'ojos', jugador, pareja) })
  );
}

/** Colores del hijo listos para teñir personajes y fotos. */
export function coloresHijo(hijo: HijoRasgos): { pelo: string; piel: string; ojos: string } {
  return { pelo: PALETAS.pelo[hijo.pelo.indice].color, ojos: PALETAS.ojos[hijo.ojos.indice].color, piel: hijo.piel };
}

/** Colores de un adulto según sus índices de paleta. */
export function coloresPersonaje(p: Personaje): { pelo: string; piel: string; ojos: string } {
  return { pelo: PALETAS.pelo[p.pelo].color, piel: PALETAS.piel[p.piel].color, ojos: PALETAS.ojos[p.ojos].color };
}
