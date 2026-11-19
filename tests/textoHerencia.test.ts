import { describe, expect, it } from 'vitest';
import { PALETAS } from '../src/content/config';
import type { Personaje } from '../src/game/GameState';
import type { HijoRasgos } from '../src/game/inheritance';
import { coloresHijo, textoNacimiento } from '../src/game/textoHerencia';

const lucia: Personaje = { nombre: 'Lucía', pelo: 0, piel: 1, ojos: 2 };
const martin: Personaje = { nombre: 'Martín', pelo: 3, piel: 3, ojos: 4 };

function hijo(pelo: HijoRasgos['pelo'], ojos: HijoRasgos['ojos']): HijoRasgos {
  return { pelo, ojos, piel: '#c0a080' };
}

describe('tarjeta de nacimiento', () => {
  it('nombra a quién se parece en cada rasgo', () => {
    const h = hijo({ indice: 0, origen: 'jugador' }, { indice: 4, origen: 'pareja' });
    expect(textoNacimiento('Thiago', h, lucia, martin)).toBe('¡Nació Thiago!\nSacó el pelo de Lucía y los ojos de Martín.');
  });

  it('cuenta la sorpresa de los abuelos con el color', () => {
    const h = hijo({ indice: 4, origen: 'sorpresa' }, { indice: 2, origen: 'jugador' });
    expect(textoNacimiento('Felipe', h, lucia, martin)).toBe(
      '¡Nació Felipe!\nSacó el pelo colorado, una sorpresa de los abuelos y los ojos de Lucía.',
    );
  });

  it('nunca muestra porcentajes', () => {
    const h = hijo({ indice: 1, origen: 'sorpresa' }, { indice: 0, origen: 'sorpresa' });
    expect(textoNacimiento('Lorenzo', h, lucia, martin)).not.toMatch(/%/);
  });

  it('los colores del hijo salen de las paletas', () => {
    const h = hijo({ indice: 3, origen: 'pareja' }, { indice: 1, origen: 'sorpresa' });
    expect(coloresHijo(h)).toEqual({ pelo: PALETAS.pelo[3].color, ojos: PALETAS.ojos[1].color, piel: '#c0a080' });
  });
});
