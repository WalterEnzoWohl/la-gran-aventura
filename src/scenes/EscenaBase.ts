/**
 * Base común de las escenas: grupo raíz dentro de la estación, animaciones propias,
 * misiones con ayuda (HintSystem), carteles (objetivo, curiosidad, diálogo),
 * cambio de estación con fundido y limpieza al salir.
 * `EscenaEtapa` agrega el tope de tiempo de las etapas jugables (StageTimer).
 */
import { Group, Mesh, Vector3, type Material, type Object3D, type Texture } from 'three';
import { CONFIG } from '../content/config';
import { HintSystem } from '../core/HintSystem';
import type { Juego } from '../core/Juego';
import { MissionRunner, type Mision } from '../core/Mission';
import type { Escena } from '../core/SceneManager';
import { StageTimer } from '../core/StageTimer';
import { TextPanel } from '../core/TextPanel';
import { Tweens } from '../core/Tweens';

export abstract class EscenaBase implements Escena {
  abstract readonly id: string;
  raiz = new Group();
  tweens = new Tweens();
  misiones: MissionRunner;
  pistas: HintSystem;
  /** Cartel con el objetivo actual, a 1,5 m y a la altura de los ojos. */
  objetivo: TextPanel;
  private curiosidadPanel: TextPanel;
  private burbuja: TextPanel;
  private finCuriosidad = 0;
  private finBurbuja = 0;
  private reloj = 0;
  private quitarOyente: (() => void) | null = null;
  protected viva = false;

  constructor(protected juego: Juego) {
    this.misiones = new MissionRunner({
      alEmpezarPaso: (paso) => this.mostrarObjetivo(paso.objetivo),
      alTerminarPaso: (r) => {
        this.juego.audio.sfx('campanita');
        this.juego.metrics.mision(this.id, `${r.mision}/${r.paso}`, r.tiempo, this.pistas.pistas, r.autocompletado);
      },
    });
    this.pistas = new HintSystem(juego.fantasma, this.misiones);

    this.objetivo = new TextPanel('', { ancho: 1.2, tamano: 0.06, fondo: 'rgba(20,28,45,0.88)', color: '#ffffff', negrita: true });
    this.objetivo.position.set(0, 0.45, -1.5);
    this.objetivo.visible = false;
    this.raiz.add(this.objetivo);

    this.curiosidadPanel = new TextPanel('', { ancho: 0.62, tamano: 0.036, fondo: 'rgba(255,236,170,0.95)', color: '#3b2f12', alinear: 'left' });
    this.curiosidadPanel.position.set(0.78, 0.3, -1.3);
    this.curiosidadPanel.rotation.y = -0.5;
    this.curiosidadPanel.visible = false;
    this.raiz.add(this.curiosidadPanel);

    this.burbuja = new TextPanel('', { ancho: 0.6, tamano: 0.042, fondo: 'rgba(255,255,255,0.96)', color: '#1d2433', negrita: true, radio: 0.05 });
    this.burbuja.visible = false;
    this.raiz.add(this.burbuja);
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
    this.quitarOyente = this.juego.inter.onActividad(() => this.pistas.actividad());
    await this.construir();
    void this.guion();
  }

  update(dt: number): void {
    if (!this.viva) return;
    this.reloj += dt;
    this.tweens.update(dt);
    this.misiones.update(dt);
    this.pistas.update(dt);
    if (this.curiosidadPanel.visible && this.reloj >= this.finCuriosidad) this.curiosidadPanel.visible = false;
    if (this.burbuja.visible && this.reloj >= this.finBurbuja) this.burbuja.visible = false;
    this.tick(dt);
  }

  exit(): void {
    this.viva = false;
    this.quitarOyente?.();
    this.juego.fantasma.ocultar();
    this.juego.audio.pararTodo();
    this.tweens.dispose();
    this.juego.estacion.remove(this.raiz);
    liberar(this.raiz);
  }

  protected mostrarObjetivo(texto: string): void {
    this.objetivo.setTexto(texto);
    this.objetivo.visible = !!texto;
  }

  /** Cartel flotante con una curiosidad, unos 6 s, mientras se juega. */
  protected curiosidad(texto: string, segundos = 6): void {
    this.curiosidadPanel.setTexto(texto);
    this.curiosidadPanel.visible = true;
    this.finCuriosidad = this.reloj + segundos;
  }

  /** Frase del hijo: globo de diálogo en `pos` (coordenadas de la escena) y "voz" provisoria. */
  protected decir(texto: string, pos: Vector3, segundos = 3, tono = 1.2): void {
    this.burbuja.setTexto(texto);
    this.burbuja.position.copy(pos);
    this.burbuja.lookAt(this.raiz.localToWorld(new Vector3(0, 0.4, 0)));
    this.burbuja.visible = true;
    this.finBurbuja = this.reloj + segundos;
    this.juego.audio.balbuceo(texto, tono);
  }

  protected correr(m: Mision): Promise<void> {
    return this.misiones.correr(m);
  }

  /** Pasa a otra estación: fundido, reubicar alrededor del jugador, armar y volver. */
  protected async cambiarEstacion(armar: () => void, color: 'negro' | 'blanco' = 'negro'): Promise<void> {
    await this.juego.fader.salir(color);
    if (!this.viva) return;
    this.juego.recentrar();
    this.burbuja.visible = false;
    armar();
    await this.juego.fader.entrar();
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

/**
 * Escena con tope de tiempo. Las etapas jugables (bebé, preadolescente, adolescente)
 * tienen 2 min 15 s cada una; las tres escenas del inicio comparten un tope de 1 min.
 * Al llegar, las misiones que faltan se completan solas y el guion sigue sin pausas.
 */
export abstract class EscenaEtapa extends EscenaBase {
  etapa: StageTimer = this.crearTope();

  /** Tope propio de 2:15. Las escenas del inicio lo reemplazan por el tope compartido. */
  protected crearTope(): StageTimer {
    return new StageTimer(CONFIG.tiempos.topeEtapa);
  }

  async enter(): Promise<void> {
    this.juego.etapa = this.etapa;
    await super.enter();
  }

  update(dt: number): void {
    if (this.viva && this.etapa.update(dt)) this.misiones.completarTodo();
    super.update(dt);
  }

  exit(): void {
    if (this.juego.etapa === this.etapa) this.juego.etapa = null;
    super.exit();
  }

  protected correr(m: Mision): Promise<void> {
    const p = super.correr(m);
    if (this.etapa.alcanzado) this.misiones.completarTodo();
    return p;
  }

  protected esperar(segundos: number): Promise<void> {
    return super.esperar(this.etapa.alcanzado ? Math.min(segundos, 0.4) : segundos);
  }

  /** Espera completa aunque se haya alcanzado el tope (tarjetas que hay que llegar a leer). */
  protected esperarSiempre(segundos: number): Promise<void> {
    return super.esperar(segundos);
  }

  /** Cierra la etapa: registra el tiempo y detiene el tope (la transición no cuenta). */
  protected finEtapa(id: string = this.id): void {
    this.etapa.pausado = true;
    this.juego.metrics.etapa(id, this.etapa.tiempo, this.etapa.alcanzado);
  }
}

/** Escenas del inicio (01 a 03): comparten un tope de 1 minuto. */
export abstract class EscenaInicio extends EscenaEtapa {
  protected crearTope(): StageTimer {
    if (!this.juego.topeInicio) this.juego.topeInicio = new StageTimer(CONFIG.tiempos.inicio);
    return this.juego.topeInicio;
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
    // Las geometrías y materiales compartidos (primitivas.ts) se reutilizan entre escenas.
    if (!m.geometry?.userData.compartida) m.geometry?.dispose();
    const mats = (Array.isArray(m.material) ? m.material : [m.material]) as (Material & { map?: Texture | null })[];
    for (const mat of mats) {
      if (mat.userData.compartido) continue;
      mat.map?.dispose();
      mat.dispose();
    }
  });
}
