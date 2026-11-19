/** Fotos del álbum armadas con los rasgos reales de la familia. */
import { t } from '../content/textos';
import type { Cara, Foto } from './Album';
import type { GameState, Personaje } from './GameState';
import { coloresHijo, coloresPersonaje } from './textoHerencia';

export function caraHijo(estado: GameState, tam: number, peinado: Cara['peinado'] = 'corto'): Cara {
  const c = estado.hijo ? coloresHijo(estado.hijo) : coloresPersonaje(estado.jugador);
  return { ...c, tam, peinado };
}

export function caraAdulto(p: Personaje): Cara {
  return { ...coloresPersonaje(p), tam: 1, peinado: p.genero === 'mujer' ? 'largo' : 'corto' };
}

/** Transición de la etapa bebé a la preadolescente. */
export function fotosInfancia(estado: GameState): Foto[] {
  return [
    { caras: [caraHijo(estado, 0.8, 'bebe')], titulo: t('album.unAnio'), fondo: '#bfe0f5' },
    { caras: [caraAdulto(estado.jugador), caraHijo(estado, 0.75)], titulo: t('album.escuela'), fondo: '#f7d9a8' },
    { caras: [caraHijo(estado, 0.92)], titulo: t('album.ochoAnios'), fondo: '#c9e8c2' },
  ];
}

/** Transición de la etapa preadolescente a la adolescente. */
export function fotosAdolescencia(estado: GameState): Foto[] {
  return [
    { caras: [caraHijo(estado, 0.95)], titulo: t('album.doceAnios'), fondo: '#e3d4f5' },
    { caras: [caraAdulto(estado.jugador), caraHijo(estado, 0.95), caraAdulto(estado.pareja)], titulo: t('album.catorceAnios'), fondo: '#f5d0d0' },
    { caras: [caraHijo(estado, 1)], titulo: t('album.quinceAnios'), fondo: '#cfe7f2' },
  ];
}

/** Álbum completo del final: de la llegada a los 16 años, y la familia. */
export function fotosFinal(estado: GameState): Foto[] {
  return [
    { caras: [caraHijo(estado, 0.7, 'bebe')], titulo: t('album.nacimiento'), fondo: '#f9d5e5' },
    { caras: [caraHijo(estado, 0.8, 'bebe')], titulo: t('album.unAnio'), fondo: '#bfe0f5' },
    { caras: [caraAdulto(estado.jugador), caraHijo(estado, 0.75)], titulo: t('album.escuela'), fondo: '#f7d9a8' },
    { caras: [caraHijo(estado, 0.95)], titulo: t('album.doceAnios'), fondo: '#e3d4f5' },
    { caras: [caraHijo(estado, 1)], titulo: t('album.dieciseisAnios'), fondo: '#cfe7f2' },
    { caras: [caraAdulto(estado.jugador), caraHijo(estado, 1), caraAdulto(estado.pareja)], titulo: t('album.familia'), fondo: '#d8f3dc' },
  ];
}
