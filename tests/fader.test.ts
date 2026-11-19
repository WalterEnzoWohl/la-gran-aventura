import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Scene } from 'three';
import { Fader } from '../src/core/Fader';

describe('Fader', () => {
  it('llega a la opacidad pedida y resuelve la promesa', async () => {
    const f = new Fader(new Scene(), new PerspectiveCamera());
    let listo = false;
    const p = f.salir('negro', 0.15).then(() => (listo = true));
    for (let i = 0; i < 20; i++) f.update(1 / 72);
    await p;
    expect(listo).toBe(true);
    expect(f.opacidad).toBe(1);
  });

  it('un fundido nuevo no deja colgado al anterior (evita que el juego se trabe)', async () => {
    const f = new Fader(new Scene(), new PerspectiveCamera());
    const resueltos: string[] = [];
    const a = f.salir('negro', 0.15).then(() => resueltos.push('salir de la escena'));
    f.update(0.05);
    const b = f.salir('negro', 0.15).then(() => resueltos.push('salir del gestor'));
    const c = f.entrar(0.15).then(() => resueltos.push('entrar'));
    for (let i = 0; i < 30; i++) f.update(1 / 72);
    await Promise.all([a, b, c]);
    expect(resueltos).toEqual(['salir de la escena', 'salir del gestor', 'entrar']);
    expect(f.opacidad).toBe(0);
  });
});
