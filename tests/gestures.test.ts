import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { cierreDeMano, PathFollower, PinchDetector, PokeDetector, RubCounter, TomaDetector } from '../src/core/Gestures';

describe('PinchDetector (histéresis 1,5 cm / 3 cm)', () => {
  it('empieza por debajo de 1,5 cm y no se suelta hasta pasar 3 cm', () => {
    const p = new PinchDetector(0.015, 0.03);
    p.update(0.05);
    expect(p.pinching).toBe(false);
    p.update(0.02); // entre umbrales, sin pinza previa: no empieza
    expect(p.pinching).toBe(false);
    p.update(0.012);
    expect(p.pinching).toBe(true);
    expect(p.started).toBe(true);
    p.update(0.025); // ruido entre umbrales: sigue agarrado
    expect(p.pinching).toBe(true);
    expect(p.started).toBe(false);
    p.update(0.031);
    expect(p.pinching).toBe(false);
    expect(p.ended).toBe(true);
  });

  it('si se pierde la mano, la pinza se suelta', () => {
    const p = new PinchDetector();
    p.update(0.01);
    p.update(null);
    expect(p.pinching).toBe(false);
    expect(p.ended).toBe(true);
  });

  it('tolera el ruido del seguimiento sin soltar', () => {
    const p = new PinchDetector();
    p.update(0.01);
    const ruido = [0.018, 0.024, 0.012, 0.028, 0.02, 0.029];
    for (const d of ruido) {
      p.update(d);
      expect(p.pinching).toBe(true);
    }
  });
});

describe('PokeDetector (hundimiento y rebote de 400 ms)', () => {
  const dt = 1 / 72;

  it('se activa solo al llegar al fondo del recorrido', () => {
    const p = new PokeDetector(0.015, 0.4);
    expect(p.update(null, dt)).toBe(false);
    expect(p.update(0.005, dt)).toBe(false);
    expect(p.depth).toBeCloseTo(0.005);
    expect(p.update(0.01, dt)).toBe(false);
    expect(p.update(0.016, dt)).toBe(true);
    expect(p.depth).toBeCloseTo(0.015);
  });

  it('no se activa si el dedo ya estaba adentro cuando apareció el botón', () => {
    const p = new PokeDetector(0.015, 0.4);
    for (let i = 0; i < 50; i++) expect(p.update(0.02, dt)).toBe(false);
    expect(p.update(null, dt)).toBe(false);
    expect(p.update(0.02, dt)).toBe(true);
  });

  it('no se repite mientras el dedo sigue adentro', () => {
    const p = new PokeDetector(0.015, 0.4);
    p.update(null, dt);
    expect(p.update(0.02, dt)).toBe(true);
    for (let i = 0; i < 100; i++) expect(p.update(0.02, dt)).toBe(false);
  });

  it('respeta el rebote aunque el dedo salga y vuelva enseguida', () => {
    const p = new PokeDetector(0.015, 0.4);
    p.update(null, dt);
    expect(p.update(0.02, dt)).toBe(true);
    expect(p.update(null, 0.1)).toBe(false); // sale a los 100 ms
    expect(p.update(0.02, 0.1)).toBe(false); // vuelve a los 200 ms: todavía en rebote
    expect(p.update(null, 0.3)).toBe(false); // sale y pasa el rebote
    expect(p.update(0.02, dt)).toBe(true);
  });
});

/** Mueve un punto de ida y vuelta por una línea, a velocidad constante. */
function vaiven(centro: Vector3, amplitud: number, velocidad: number, segundos: number, dt: number): Vector3[] {
  const out: Vector3[] = [];
  let x = -amplitud;
  let dir = 1;
  for (let t = 0; t < segundos; t += dt) {
    x += dir * velocidad * dt;
    if (Math.abs(x) > amplitud) dir = -dir;
    out.push(centro.clone().add(new Vector3(x, 0, 0)));
  }
  return out;
}

describe('RubCounter', () => {
  const dt = 1 / 72;
  const centro = new Vector3(0, 1.2, -0.45);

  it('frotar: acumula los segundos de movimiento dentro de la zona', () => {
    const r = new RubCounter('frotar', 0.1, 0.15);
    for (const p of vaiven(centro, 0.05, 0.3, 2.5, dt)) r.update([{ id: 'der-palma', punto: p }], centro, dt);
    expect(r.segundos).toBeGreaterThan(2.3);
    expect(r.segundos).toBeLessThanOrEqual(2.5);
  });

  it('frotar: la mano quieta dentro de la zona no cuenta', () => {
    const r = new RubCounter('frotar', 0.1, 0.15);
    for (let i = 0; i < 200; i++) r.update([{ id: 'der-palma', punto: centro.clone() }], centro, dt);
    expect(r.segundos).toBe(0);
  });

  it('frotar: palma e índice de la misma mano no suman el tiempo dos veces', () => {
    const r = new RubCounter('frotar', 0.1, 0.15);
    for (const p of vaiven(centro, 0.05, 0.3, 1, dt)) {
      r.update([{ id: 'der-palma', punto: p }, { id: 'der-indice', punto: p.clone().add(new Vector3(0, 0.03, 0)) }], centro, dt);
    }
    expect(r.segundos).toBeLessThanOrEqual(1.01);
  });

  it('palmear: cuenta cada entrada rápida a la zona', () => {
    const r = new RubCounter('palmear', 0.08, 0.15);
    const afuera = centro.clone().add(new Vector3(0, 0.2, 0));
    for (let palmada = 0; palmada < 3; palmada++) {
      // Baja en 0,15 s (más de 1 m/s), queda un momento y sube.
      for (let i = 0; i <= 10; i++) r.update([{ id: 'der-palma', punto: afuera.clone().lerp(centro, i / 10) }], centro, 0.015);
      for (let i = 0; i <= 10; i++) r.update([{ id: 'der-palma', punto: centro.clone().lerp(afuera, i / 10) }], centro, 0.015);
    }
    expect(r.entradas).toBe(3);
  });

  it('palmear: palma e índice entrando juntos cuentan como una sola palmada', () => {
    const r = new RubCounter('palmear', 0.08, 0.15);
    const afuera = centro.clone().add(new Vector3(0, 0.2, 0));
    for (let i = 0; i <= 10; i++) {
      const p = afuera.clone().lerp(centro, i / 10);
      r.update([{ id: 'der-palma', punto: p }, { id: 'der-indice', punto: p.clone().add(new Vector3(0, -0.06, 0)) }], centro, 0.015);
    }
    expect(r.entradas).toBe(1);
  });

  it('palmear: acercar la mano despacio no es una palmada', () => {
    const r = new RubCounter('palmear', 0.08, 0.15);
    const afuera = centro.clone().add(new Vector3(0, 0.2, 0));
    for (let i = 0; i <= 200; i++) r.update([{ id: 'der-palma', punto: afuera.clone().lerp(centro, i / 200) }], centro, dt);
    expect(r.entradas).toBe(0);
  });

  it('si la mano se pierde, no cuenta un salto como movimiento', () => {
    const r = new RubCounter('palmear', 0.08, 0.15);
    r.update([{ id: 'der-palma', punto: centro.clone().add(new Vector3(0, 0.3, 0)) }], centro, dt);
    r.update([{ id: 'der-palma', punto: null }], centro, dt);
    r.update([{ id: 'der-palma', punto: centro.clone() }], centro, dt);
    expect(r.entradas).toBe(0);
  });
});

describe('RubCounter con seguimiento entrecortado', () => {
  it('frotar: las poses repetidas entre actualizaciones no cortan el frotado', () => {
    const dt = 1 / 72;
    const centro = new Vector3(0, 1.2, -0.45);
    const r = new RubCounter('frotar', 0.1, 0.15);
    // La mano se actualiza 1 de cada 3 cuadros (unos 24 Hz), el resto repite la pose.
    const poses = vaiven(centro, 0.05, 0.3, 2, dt);
    let ultima = poses[0];
    poses.forEach((p, i) => {
      if (i % 3 === 0) ultima = p;
      r.update([{ id: 'der-palma', punto: ultima.clone() }], centro, dt);
    });
    expect(r.segundos).toBeGreaterThan(1.8);
  });

  it('frotar: después de quedarse quieta, deja de contar enseguida', () => {
    const dt = 1 / 72;
    const centro = new Vector3(0, 1.2, -0.45);
    const r = new RubCounter('frotar', 0.1, 0.15);
    for (const p of vaiven(centro, 0.05, 0.3, 1, dt)) r.update([{ id: 'der-palma', punto: p }], centro, dt);
    const antes = r.segundos;
    for (let i = 0; i < 144; i++) r.update([{ id: 'der-palma', punto: centro.clone() }], centro, dt);
    expect(r.segundos - antes).toBeLessThanOrEqual(0.16);
  });
});

describe('PathFollower (afeitada: a menos de 4 cm del trazo)', () => {
  const trazo = [0, 1, 2, 3, 4].map((i) => new Vector3(0, -i * 0.025, 0));

  it('avanza siguiendo el trazo en orden', () => {
    const p = new PathFollower(trazo, 0.04);
    for (const punto of trazo) p.update(punto.clone().add(new Vector3(0.03, 0, 0)));
    expect(p.completo).toBe(true);
  });

  it('no avanza si la máquina está lejos del trazo', () => {
    const p = new PathFollower(trazo, 0.04);
    for (const punto of trazo) p.update(punto.clone().add(new Vector3(0.06, 0, 0)));
    expect(p.siguiente).toBe(0);
  });

  it('no se puede empezar por el final', () => {
    const p = new PathFollower(trazo, 0.04);
    p.update(trazo[4]);
    expect(p.siguiente).toBe(0);
    expect(p.progreso).toBe(0);
  });

  it('tolera un movimiento rápido que saltea un punto', () => {
    const p = new PathFollower(trazo, 0.02);
    p.update(trazo[0]);
    p.update(trazo[2]);
    expect(p.siguiente).toBe(3);
  });
});

describe('Agarrar con la pinza o con la mano cerrada', () => {
  const pinza = () => new PinchDetector(0.015, 0.03);
  const puno = () => new PinchDetector(0.82, 0.97);

  it('agarra con la pinza', () => {
    const p = pinza(), m = puno(), t = new TomaDetector();
    p.update(0.01); m.update(1.3); t.update(p, m);
    expect(t.started).toBe(true);
    expect(t.modo).toBe('pinza');
  });

  it('agarra cerrando la mano', () => {
    const p = pinza(), m = puno(), t = new TomaDetector();
    p.update(0.05); m.update(0.3); t.update(p, m);
    expect(t.started).toBe(true);
    expect(t.modo).toBe('mano');
  });

  it('suelta solo cuando se abren los dos gestos', () => {
    const p = pinza(), m = puno(), t = new TomaDetector();
    p.update(0.01); m.update(0.3); t.update(p, m);
    p.update(0.05); t.update(p, m);
    expect(t.tomando).toBe(true);
    expect(t.modo).toBe('mano');
    m.update(1.3); t.update(p, m);
    expect(t.ended).toBe(true);
    expect(t.modo).toBeNull();
  });

  it('mide el cierre de la mano sin depender de su tamaño', () => {
    const palma = new Vector3();
    const abierta = [new Vector3(0, 0.12, 0), new Vector3(0, 0.115, 0), new Vector3(0, 0.1, 0)];
    const cerrada = abierta.map((v) => v.clone().multiplyScalar(0.25));
    expect(cierreDeMano(abierta, palma, 0.09)).toBeGreaterThan(1.1);
    expect(cierreDeMano(cerrada, palma, 0.09)).toBeLessThan(0.82);
    // Una mano el doble de grande da el mismo valor.
    expect(cierreDeMano(abierta.map((v) => v.clone().multiplyScalar(2)), palma, 0.18)).toBeCloseTo(cierreDeMano(abierta, palma, 0.09));
  });
});
