/**
 * Fundido a negro o a blanco: una esfera alrededor de la cabeza que se vuelve opaca.
 * Cada tramo dura `CONFIG.tiempos.fundido` (ida + vuelta ≤ 300 ms).
 */
import { BackSide, Camera, Color, Mesh, MeshBasicMaterial, Scene, SphereGeometry } from 'three';
import { CONFIG } from '../content/config';
import { Tweens, ease } from './Tweens';

export interface FaderLike {
  salir(color?: 'negro' | 'blanco', duracion?: number): Promise<void>;
  entrar(duracion?: number): Promise<void>;
}

export class Fader implements FaderLike {
  private esfera: Mesh<SphereGeometry, MeshBasicMaterial>;
  private tweens = new Tweens();
  opacidad = 0;

  constructor(
    scene: Scene,
    private camara: Camera,
  ) {
    const mat = new MeshBasicMaterial({ color: 0x000000, side: BackSide, transparent: true, opacity: 0, depthTest: false, depthWrite: false });
    this.esfera = new Mesh(new SphereGeometry(0.4, 16, 12), mat);
    this.esfera.renderOrder = 10000;
    this.esfera.frustumCulled = false;
    this.esfera.visible = false;
    scene.add(this.esfera);
  }

  /** Lleva la pantalla al color indicado. */
  salir(color: 'negro' | 'blanco' = 'negro', duracion = CONFIG.tiempos.fundido): Promise<void> {
    this.esfera.material.color = new Color(color === 'blanco' ? 0xffffff : 0x000000);
    return this.animar(1, duracion);
  }

  /** Vuelve a mostrar la escena. */
  entrar(duracion = CONFIG.tiempos.fundido): Promise<void> {
    return this.animar(0, duracion);
  }

  /** Deja la pantalla tapada sin animar (al arrancar). */
  tapar(color: 'negro' | 'blanco' = 'negro'): void {
    this.esfera.material.color = new Color(color === 'blanco' ? 0xffffff : 0x000000);
    this.fijar(1);
  }

  private animar(destino: number, duracion: number): Promise<void> {
    const desde = this.opacidad;
    this.tweens.dispose();
    this.tweens = new Tweens();
    return this.tweens.run(duracion, (t) => this.fijar(desde + (destino - desde) * t), ease.linear);
  }

  private fijar(o: number): void {
    this.opacidad = o;
    this.esfera.material.opacity = o;
    this.esfera.visible = o > 0.001;
  }

  update(dt: number): void {
    this.tweens.update(dt);
    // La esfera sigue a la cabeza.
    this.camara.getWorldPosition(this.esfera.position);
  }
}
