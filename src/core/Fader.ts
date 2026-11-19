/**
 * Fundido a negro o a blanco: una esfera alrededor de la cabeza que se vuelve opaca.
 * Cada tramo dura `CONFIG.tiempos.fundido` (ida + vuelta ≤ 300 ms).
 *
 * Si empieza un fundido nuevo mientras otro está en curso, el anterior se da por
 * terminado (su promesa se resuelve): nunca queda nadie esperando para siempre.
 */
import { BackSide, Camera, Color, Mesh, MeshBasicMaterial, Scene, SphereGeometry } from 'three';
import { CONFIG } from '../content/config';

export interface FaderLike {
  salir(color?: 'negro' | 'blanco', duracion?: number): Promise<void>;
  entrar(duracion?: number): Promise<void>;
}

interface Animacion {
  desde: number;
  hasta: number;
  duracion: number;
  t: number;
  resolver: () => void;
}

export class Fader implements FaderLike {
  private esfera: Mesh<SphereGeometry, MeshBasicMaterial>;
  private anim: Animacion | null = null;
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
    this.terminarAnimacion();
    this.fijar(1);
  }

  private animar(destino: number, duracion: number): Promise<void> {
    this.terminarAnimacion();
    return new Promise((resolver) => {
      if (duracion <= 0) {
        this.fijar(destino);
        resolver();
        return;
      }
      this.anim = { desde: this.opacidad, hasta: destino, duracion, t: 0, resolver };
    });
  }

  /** Da por terminado el fundido en curso (sin saltar de golpe la opacidad). */
  private terminarAnimacion(): void {
    const a = this.anim;
    this.anim = null;
    a?.resolver();
  }

  private fijar(o: number): void {
    this.opacidad = o;
    this.esfera.material.opacity = o;
    this.esfera.visible = o > 0.001;
  }

  update(dt: number): void {
    const a = this.anim;
    if (a) {
      a.t += dt;
      const k = Math.min(1, a.t / a.duracion);
      this.fijar(a.desde + (a.hasta - a.desde) * k);
      if (k >= 1) this.terminarAnimacion();
    }
    // La esfera sigue a la cabeza.
    this.camara.getWorldPosition(this.esfera.position);
  }
}
