import { describe, expect, it } from 'vitest';
import type { FaderLike } from '../src/core/Fader';
import { MissionRunner } from '../src/core/Mission';
import { SceneManager, type Escena } from '../src/core/SceneManager';

class FaderFalso implements FaderLike {
  log: string[] = [];
  salir(color: 'negro' | 'blanco' = 'negro'): Promise<void> {
    this.log.push('salir:' + color);
    return Promise.resolve();
  }
  entrar(): Promise<void> {
    this.log.push('entrar');
    return Promise.resolve();
  }
}

function crearSM() {
  const log: string[] = [];
  const fader = new FaderFalso();
  const hacer = (id: string) => (): Escena => ({
    id,
    enter: () => void log.push('enter:' + id),
    update: () => void log.push('update:' + id),
    exit: () => void log.push('exit:' + id),
  });
  let reinicios = 0;
  const sm = new SceneManager(
    [
      { id: 'intro', crear: hacer('intro') },
      { id: 'bebe', crear: hacer('bebe') },
      { id: 'final', crear: hacer('final') },
    ],
    fader,
    { antesDeEntrar: (id) => log.push('antes:' + id), alReiniciar: () => reinicios++ },
  );
  return { sm, log, fader, reinicios: () => reinicios };
}

describe('SceneManager', () => {
  it('entra a la primera escena sin fundido de salida', async () => {
    const { sm, log, fader } = crearSM();
    await sm.irA(0);
    expect(sm.actual?.id).toBe('intro');
    expect(log).toEqual(['antes:intro', 'enter:intro']);
    expect(fader.log).toEqual(['entrar']);
  });

  it('al avanzar: funde, sale de la anterior y entra a la siguiente, en ese orden', async () => {
    const { sm, log, fader } = crearSM();
    await sm.irA(0);
    log.length = 0;
    fader.log.length = 0;
    await sm.siguiente('blanco');
    expect(fader.log).toEqual(['salir:blanco', 'entrar']);
    expect(log).toEqual(['exit:intro', 'antes:bebe', 'enter:bebe']);
    expect(sm.indice).toBe(1);
  });

  it('ignora una transición mientras hay otra en curso', async () => {
    const { sm } = crearSM();
    await sm.irA(0);
    const a = sm.siguiente();
    const b = sm.siguiente();
    expect(await a).toBe(true);
    expect(await b).toBe(false);
    expect(sm.actual?.id).toBe('bebe');
  });

  it('una escena vieja no puede avanzar el juego', async () => {
    const { sm } = crearSM();
    await sm.irA(0);
    const vieja = sm.actual!;
    await sm.irA('final');
    expect(await sm.terminar(vieja)).toBe(false);
    expect(sm.actual?.id).toBe('final');
  });

  it('después de la última escena reinicia desde la primera', async () => {
    const { sm, reinicios } = crearSM();
    await sm.irA('final');
    await sm.siguiente();
    expect(sm.actual?.id).toBe('intro');
    expect(reinicios()).toBe(1);
  });

  it('solo actualiza la escena actual', async () => {
    const { sm, log } = crearSM();
    await sm.irA(0);
    await sm.irA(1);
    log.length = 0;
    sm.update(0.016);
    expect(log).toEqual(['update:bebe']);
  });

  it('rechaza escenas que no existen', async () => {
    const { sm } = crearSM();
    expect(await sm.irA('nada')).toBe(false);
    expect(await sm.irA(7)).toBe(false);
  });
});

describe('MissionRunner', () => {
  function mision() {
    const estado = { a: false, b: false, autoA: 0, autoB: 0, iniciados: [] as string[] };
    return {
      estado,
      m: {
        id: 'm',
        pasos: [
          { id: 'a', objetivo: 'A', iniciar: () => void estado.iniciados.push('a'), completo: () => estado.a, autocompletar: () => (estado.autoA++, (estado.a = true)) },
          { id: 'b', objetivo: 'B', iniciar: () => void estado.iniciados.push('b'), completo: () => estado.b, autocompletar: () => (estado.autoB++, (estado.b = true)) },
        ],
      },
    };
  }

  it('avanza cuando se cumple la condición de cada paso', async () => {
    const terminados: string[] = [];
    const r = new MissionRunner({ alTerminarPaso: (res) => terminados.push(`${res.paso}:${res.autocompletado}`) });
    const { m, estado } = mision();
    let fin = false;
    const p = r.correr(m).then(() => (fin = true));
    expect(r.paso?.id).toBe('a');
    r.update(0.5);
    expect(r.paso?.id).toBe('a');
    estado.a = true;
    r.update(0.5);
    expect(r.paso?.id).toBe('b');
    estado.b = true;
    r.update(0.1);
    await p;
    expect(fin).toBe(true);
    expect(terminados).toEqual(['a:false', 'b:false']);
    expect(estado.iniciados).toEqual(['a', 'b']);
  });

  it('Saltar completa solo el paso actual y lo registra como autocompletado', () => {
    const terminados: string[] = [];
    const r = new MissionRunner({ alTerminarPaso: (res) => terminados.push(`${res.paso}:${res.autocompletado}`) });
    const { m, estado } = mision();
    void r.correr(m);
    r.completarPaso();
    expect(estado.autoA).toBe(1);
    expect(estado.autoB).toBe(0);
    expect(r.paso?.id).toBe('b');
    expect(terminados).toEqual(['a:true']);
  });

  it('completarTodo termina la misión (tope de etapa)', async () => {
    const r = new MissionRunner();
    const { m, estado } = mision();
    const p = r.correr(m);
    r.completarTodo();
    await p;
    expect(estado.autoA + estado.autoB).toBe(2);
    expect(r.activa).toBe(false);
  });

  it('mide el tiempo de cada paso', () => {
    const tiempos: number[] = [];
    const r = new MissionRunner({ alTerminarPaso: (res) => tiempos.push(res.tiempo) });
    const { m, estado } = mision();
    void r.correr(m);
    for (let i = 0; i < 10; i++) r.update(0.5);
    estado.a = true;
    r.update(0.5);
    expect(tiempos[0]).toBeCloseTo(5.5);
  });
});
