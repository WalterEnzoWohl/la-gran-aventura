import { describe, expect, it } from 'vitest';
import { HintTimer } from '../src/core/HintSystem';
import { formatoHora, formatoTiempo, StageTimer } from '../src/core/StageTimer';

/** Avanza el temporizador `segundos` en cuadros de 1/72 s y junta los eventos. */
function correr(h: HintTimer, segundos: number, alActuar?: (t: number) => boolean): { t: number; ev: string }[] {
  const dt = 1 / 72;
  const out: { t: number; ev: string }[] = [];
  for (let t = 0; t < segundos; t += dt) {
    if (alActuar?.(t)) {
      const ev = h.actividad();
      if (ev) out.push({ t, ev });
    }
    const ev = h.update(dt);
    if (ev) out.push({ t, ev });
  }
  return out;
}

describe('HintTimer (pista a los 10 s, autocompletar a los 30 s)', () => {
  it('sin hacer nada: mano fantasma a los 10 s y autocompletar a los 30 s', () => {
    const h = new HintTimer(10, 30);
    h.reiniciar();
    const ev = correr(h, 31);
    expect(ev.map((e) => e.ev)).toEqual(['mostrar', 'autocompletar']);
    expect(ev[0].t).toBeCloseTo(10, 0);
    expect(ev[1].t).toBeCloseTo(30, 0);
    expect(h.pistas).toBe(1);
  });

  it('la actividad oculta la mano y reinicia la cuenta de inactividad', () => {
    const h = new HintTimer(10, 30);
    h.reiniciar();
    // El jugador hace algo a los 12 s: la mano se oculta y vuelve a los 22 s.
    let hizo = false;
    const ev = correr(h, 25, (t) => {
      if (!hizo && t >= 12) return (hizo = true);
      return false;
    });
    expect(ev.map((e) => e.ev)).toEqual(['mostrar', 'ocultar', 'mostrar']);
    expect(ev[2].t).toBeCloseTo(22, 0);
    expect(h.pistas).toBe(2);
  });

  it('el autocompletado cuenta desde el inicio del paso, aunque el jugador esté activo', () => {
    const h = new HintTimer(10, 30);
    h.reiniciar();
    const ev = correr(h, 31, (t) => Math.abs(t % 5) < 1 / 72);
    expect(ev.filter((e) => e.ev === 'autocompletar')).toHaveLength(1);
    expect(ev.some((e) => e.ev === 'mostrar')).toBe(false);
  });

  it('con desdeCero la mano aparece apenas empieza el paso', () => {
    const h = new HintTimer(10, 30);
    expect(h.reiniciar(true)).toBe('mostrar');
    expect(h.visible).toBe(true);
    expect(h.pistas).toBe(1);
  });

  it('autocompleta una sola vez', () => {
    const h = new HintTimer(10, 30);
    h.reiniciar();
    const ev = correr(h, 60);
    expect(ev.filter((e) => e.ev === 'autocompletar')).toHaveLength(1);
  });
});

describe('StageTimer (tope de 2:15)', () => {
  it('avisa una sola vez al llegar al tope', () => {
    const s = new StageTimer(135);
    let avisos = 0;
    for (let i = 0; i < 150 * 72; i++) if (s.update(1 / 72)) avisos++;
    expect(avisos).toBe(1);
    expect(s.alcanzado).toBe(true);
    expect(s.restante).toBe(0);
  });

  it('en pausa no avanza (la transición del álbum no cuenta)', () => {
    const s = new StageTimer(135);
    s.update(100);
    s.pausado = true;
    s.update(100);
    expect(s.tiempo).toBe(100);
    expect(s.alcanzado).toBe(false);
    expect(s.fraccion).toBeCloseTo(100 / 135);
  });
});

describe('formatos', () => {
  it('cronómetro y hora del reloj', () => {
    expect(formatoTiempo(135)).toBe('2:15');
    expect(formatoTiempo(9.9)).toBe('0:09');
    expect(formatoHora(20 * 60 + 30)).toBe('20:30');
    expect(formatoHora(22 * 60)).toBe('22:00');
  });
});
