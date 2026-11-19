import { describe, expect, it } from 'vitest';
import { CLAVE, leerEventos, Metrics, type Almacen, type Evento } from '../src/core/Metrics';
import { eventosACsv, resumir } from '../src/core/MetricsResumen';

class AlmacenMemoria implements Almacen {
  datos = new Map<string, string>();
  getItem(k: string) {
    return this.datos.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.datos.set(k, v);
  }
}

function sesionDePrueba(m: Metrics, opciones: { completa: boolean; auto: boolean }) {
  m.iniciarSesion();
  m.escena('intro');
  m.escena('bebe');
  m.mision('bebe', 'biberon/agarrar', 12, 1, opciones.auto);
  m.etapa('bebe', opciones.auto ? 135 : 80, opciones.auto);
  if (opciones.completa) m.escena('final');
  m.terminarSesion();
}

describe('Metrics', () => {
  it('guarda eventos anónimos en el almacén local', () => {
    const almacen = new AlmacenMemoria();
    let t = 0;
    const m = new Metrics('', almacen, () => (t += 1000));
    sesionDePrueba(m, { completa: true, auto: false });
    const eventos = leerEventos(almacen);
    expect(eventos.map((e) => e.tipo)).toEqual([
      'session_start', 'scene_enter', 'scene_enter', 'mission_complete', 'stage_complete', 'scene_enter', 'session_end',
    ]);
    expect(almacen.datos.has(CLAVE)).toBe(true);
    // Nada de nombres: solo estos campos.
    for (const e of eventos) expect(Object.keys(e).every((k) => ['tipo', 'sesion', 't', 'seg', 'escena', 'datos'].includes(k))).toBe(true);
  });

  it('no registra nada fuera de una sesión', () => {
    const almacen = new AlmacenMemoria();
    const m = new Metrics('', almacen);
    m.escena('intro');
    expect(leerEventos(almacen)).toHaveLength(0);
  });
});

describe('resumen para admin.html', () => {
  function eventos(): Evento[] {
    const almacen = new AlmacenMemoria();
    let t = 0;
    const m = new Metrics('', almacen, () => (t += 1000));
    sesionDePrueba(m, { completa: true, auto: false });
    sesionDePrueba(m, { completa: false, auto: true });
    return leerEventos(almacen);
  }

  it('calcula finalización, misiones y etapas', () => {
    const r = resumir(eventos());
    expect(r.sesiones).toBe(2);
    expect(r.completas).toBe(1);
    expect(r.finalizacionPct).toBe(50);
    expect(r.duracionPromedio).not.toBeNull();
    expect(r.misiones).toEqual([{ mision: 'biberon/agarrar', escena: 'bebe', veces: 2, tiempoPromedio: 12, pistasPromedio: 1, autocompletadaPct: 50 }]);
    expect(r.etapas).toEqual([{ etapa: 'bebe', veces: 2, tiempoPromedio: 107.5, topePct: 50 }]);
    expect(r.pendientesDeEnvio).toBe(eventos().length);
  });

  it('sin eventos no divide por cero', () => {
    const r = resumir([]);
    expect(r.finalizacionPct).toBe(0);
    expect(r.duracionPromedio).toBeNull();
  });

  it('exporta un CSV con encabezado y una fila por evento', () => {
    const ev = eventos();
    const csv = eventosACsv(ev).trim().split('\n');
    expect(csv[0]).toBe('sesion,fecha,segundo,tipo,escena,mision,tiempo,pistas,autocompletada,topeAlcanzado,duracionTotal');
    expect(csv).toHaveLength(ev.length + 1);
    expect(csv.find((l) => l.includes('mission_complete'))).toMatch(/biberon\/agarrar,12,1,0,,$/);
  });
});
