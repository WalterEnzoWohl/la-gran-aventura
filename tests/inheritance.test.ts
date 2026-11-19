import { describe, expect, it } from 'vitest';
import { NOMBRES_ADULTOS, PALETAS } from '../src/content/config';
import { fill, t } from '../src/content/textos';
import { cambiarGenero, nuevaPartida, type Personaje } from '../src/game/GameState';
import { heredar, heredarRasgo, mezclarColor, rngConSemilla } from '../src/game/inheritance';

const jugador: Personaje = { nombre: 'Lucía', genero: 'mujer', pelo: 0, piel: 0, ojos: 1 };
const pareja: Personaje = { nombre: 'Martín', genero: 'hombre', pelo: 3, piel: 4, ojos: 3 };

describe('herencia', () => {
  it('con la misma semilla da el mismo hijo', () => {
    expect(heredar(jugador, pareja, PALETAS, 42)).toEqual(heredar(jugador, pareja, PALETAS, 42));
  });

  it('reparte pelo y ojos 45% jugador, 45% pareja, 10% sorpresa', () => {
    const rng = rngConSemilla(7);
    const cuenta = { jugador: 0, pareja: 0, sorpresa: 0 };
    const N = 20000;
    for (let i = 0; i < N; i++) cuenta[heredarRasgo(0, 3, 5, rng).origen]++;
    expect(cuenta.jugador / N).toBeCloseTo(0.45, 1);
    expect(cuenta.pareja / N).toBeCloseTo(0.45, 1);
    expect(cuenta.sorpresa / N).toBeCloseTo(0.1, 1);
  });

  it('el índice coincide con el origen', () => {
    const rng = rngConSemilla(3);
    for (let i = 0; i < 500; i++) {
      const r = heredarRasgo(1, 4, 5, rng);
      if (r.origen === 'jugador') expect(r.indice).toBe(1);
      if (r.origen === 'pareja') expect(r.indice).toBe(4);
      expect(r.indice).toBeGreaterThanOrEqual(0);
      expect(r.indice).toBeLessThan(5);
    }
  });

  it('la sorpresa puede ser cualquiera de las 5 opciones', () => {
    const rng = rngConSemilla(11);
    const vistas = new Set<number>();
    for (let i = 0; i < 5000; i++) {
      const r = heredarRasgo(0, 0, 5, rng);
      if (r.origen === 'sorpresa') vistas.add(r.indice);
    }
    expect([...vistas].sort()).toEqual([0, 1, 2, 3, 4]);
  });

  it('la piel es la mezcla al 50% de los dos tonos', () => {
    const hijo = heredar(jugador, pareja, PALETAS, 1);
    expect(hijo.piel).toBe(mezclarColor(PALETAS.piel[0].color, PALETAS.piel[4].color));
    expect(mezclarColor('#000000', '#ffffff')).toBe('#808080');
    expect(mezclarColor('#102030', '#102030')).toBe('#102030');
  });
});

describe('partida nueva', () => {
  it('la pareja es siempre del otro género y los nombres son del género de cada uno', () => {
    const rng = rngConSemilla(9);
    for (let i = 0; i < 50; i++) {
      const p = nuevaPartida(rng);
      expect(p.pareja.genero).not.toBe(p.jugador.genero);
      expect(NOMBRES_ADULTOS[p.jugador.genero]).toContain(p.jugador.nombre);
      expect(NOMBRES_ADULTOS[p.pareja.genero]).toContain(p.pareja.nombre);
    }
  });

  it('al cambiar el género del jugador, la pareja pasa al otro y los nombres acompañan', () => {
    const p = nuevaPartida(rngConSemilla(2));
    const otro = p.jugador.genero === 'hombre' ? 'mujer' : 'hombre';
    cambiarGenero(p, otro, rngConSemilla(4));
    expect(p.jugador.genero).toBe(otro);
    expect(p.pareja.genero).not.toBe(otro);
    expect(NOMBRES_ADULTOS[p.jugador.genero]).toContain(p.jugador.nombre);
    expect(NOMBRES_ADULTOS[p.pareja.genero]).toContain(p.pareja.nombre);
    expect(p.jugador.nombre).not.toBe(p.pareja.nombre);
  });

  it('sortea nombres distintos y rasgos válidos', () => {
    const rng = rngConSemilla(5);
    for (let i = 0; i < 50; i++) {
      const p = nuevaPartida(rng);
      expect(p.jugador.nombre).not.toBe(p.pareja.nombre);
      for (const per of [p.jugador, p.pareja]) {
        expect(per.pelo).toBeLessThan(PALETAS.pelo.length);
        expect(per.piel).toBeLessThan(PALETAS.piel.length);
        expect(per.ojos).toBeLessThan(PALETAS.ojos.length);
      }
    }
  });
});

describe('textos', () => {
  it('lee rutas y reemplaza variables', () => {
    expect(t('intro.boton')).toBe('Iniciar la aventura');
    expect(t('nacimiento.nacio', { nombre: 'Tomás' })).toBe('¡Nació Tomás!');
    expect(t('no.existe')).toBe('[no.existe]');
    expect(fill('{a} y {b}', { a: 1 })).toBe('1 y {b}');
  });

  it('tiene nombre visible para cada opción de las paletas', () => {
    for (const rasgo of ['pelo', 'piel', 'ojos'] as const) {
      for (const op of PALETAS[rasgo]) expect(t(`rasgos.${rasgo}.${op.id}`)).not.toMatch(/^\[/);
    }
  });
});
