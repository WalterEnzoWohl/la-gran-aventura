/**
 * Base común de las escenas: grupo raíz dentro de la estación, animaciones propias,
 * corredor de misiones, panel de objetivo y limpieza al salir.
 */
import { Group, Mesh, type Material, type Object3D, type Texture } from 'three';
import type { Juego } from '../core/Juego';
import { MissionRunner, type Mision } from '../core/Mission';
import type { Escena } from '../core/SceneManager';
import { TextPanel } from '../core/TextPanel';
import { Tweens } from '../core/Tweens';

export abstract class EscenaBase implements Escena {
  abstract readonly id: string;
  raiz = new Group();
  tweens = new Tweens();
  misiones: MissionRunner;
  /** Cartel con el objetivo actual, a 1,5 m y a la altura de los ojos. */
  objetivo: TextPanel;
  private viva = false;

  constructor(protected juego: Juego) {
    this.misiones = new MissionRunner({
      alEmpezarPaso: (paso) => this.mostrarObjetivo(paso.objetivo),
      alTerminarPaso: (r) => {
        this.juego.audio.sfx('campanita');
        this.juego.metrics.mision(this.id, `${r.mision}/${r.paso}`, r.tiempo, 0, r.autocompletado);
      },
    });
    this.objetivo = new TextPanel('', { ancho: 1.2, tamano: 0.06, fondo: 'rgba(20,28,45,0.88)', color: '#ffffff', negrita: true });
    this.objetivo.position.set(0, 0.42, -1.5);
    this.objetivo.visible = false;
    this.raiz.add(this.objetivo);
  }

  /** Arma los objetos de la escena dentro de `this.raiz`. */
  protected abstract construir(): void | Promise<void>;
  /** Guion de la escena: misiones, transiciones y fin. */
  protected abstract guion(): Promise<void>;
  /** Lógica propia por cuadro (opcional). */
  protected tick(_dt: number): void {}

  async enter(): Promise<void> {
    this.viva = true;
    this.juego.estacion.add(this.raiz);
    this.juego.alSaltar = () => this.misiones.completarPaso();
    await this.construir();
    void this.guion();
  }

  update(dt: number): void {
    if (!this.viva) return;
    this.tweens.update(dt);
    this.misiones.update(dt);
    this.tick(dt);
  }

  exit(): void {
    this.viva = false;
    this.tweens.dispose();
    this.juego.estacion.remove(this.raiz);
    liberar(this.raiz);
  }

  protected mostrarObjetivo(texto: string): void {
    this.objetivo.setTexto(texto);
    this.objetivo.visible = !!texto;
  }

  protected correr(m: Mision): Promise<void> {
    return this.misiones.correr(m);
  }

  /** Avisa al SceneManager que la escena terminó. */
  protected terminar(color: 'negro' | 'blanco' = 'negro'): void {
    if (this.viva) void this.juego.escenas.terminar(this, color);
  }

  /** Espera en tiempo de juego. Si la escena sale, la promesa no se resuelve nunca. */
  protected esperar(segundos: number): Promise<void> {
    return this.tweens.wait(segundos);
  }
}

/** Libera geometrías, materiales y texturas de un árbol de objetos. */
export function liberar(raiz: Object3D): void {
  raiz.traverse((o) => {
    if (o instanceof TextPanel) {
      o.dispose();
      return;
    }
    const m = o as Mesh;
    if (!m.isMesh) return;
    m.geometry?.dispose();
    const mats = (Array.isArray(m.material) ? m.material : [m.material]) as (Material & { map?: Texture | null })[];
    for (const mat of mats) {
      mat.map?.dispose();
      mat.dispose();
    }
  });
}
