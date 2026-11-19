/**
 * Arma todos los sistemas y corre el ciclo principal.
 * Las escenas reciben esta instancia como contexto.
 *
 * Convención de coordenadas de las escenas: todo se arma dentro de `estacion`,
 * cuyo origen queda debajo de la cabeza del jugador, a la altura del pecho y
 * mirando hacia adonde mira. Lo interactivo va entre z = -0,3 y z = -0,6 (30 a 60 cm),
 * con y ≈ 0. Los textos van a z = -1,5 y a la altura de los ojos (y ≈ +0,4).
 */
import {
  Color, DirectionalLight, Euler, Group, HemisphereLight, PerspectiveCamera, Quaternion, Scene, SRGBColorSpace, Timer, Vector3, WebGLRenderer,
} from 'three';
import { CONFIG } from '../content/config';
import { t } from '../content/textos';
import { nuevaPartida, type GameState } from '../game/GameState';
import { AssetLoader } from './AssetLoader';
import { AudioManager } from './AudioManager';
import { Fader } from './Fader';
import { GhostHand } from './GhostHand';
import { HandTracker } from './HandTracker';
import { Interactables } from './Interactable';
import { Metrics } from './Metrics';
import { SceneManager, type DefinicionEscena } from './SceneManager';
import { formatoTiempo, type StageTimer } from './StageTimer';
import { TextPanel } from './TextPanel';
import { WristSkip } from './WristSkip';

const CIELO = '#cfe3ef';
const _pos = new Vector3();
const _quat = new Quaternion();
const _euler = new Euler(0, 0, 0, 'YXZ');

export class Juego {
  renderer: WebGLRenderer;
  scene = new Scene();
  camara = new PerspectiveCamera(70, 1, 0.05, 60);
  /** Grupo que se reubica alrededor del jugador en cada estación. */
  estacion = new Group();
  manos: HandTracker;
  inter: Interactables;
  audio = new AudioManager();
  fader: Fader;
  fantasma: GhostHand;
  escenas: SceneManager;
  /** Etapa jugable en curso (para el cronómetro de debug). */
  etapa: StageTimer | null = null;
  /** Tope compartido de las escenas del inicio (lo crea la intro). */
  topeInicio: StageTimer | null = null;
  /** Segundos desde que empezó la partida. */
  tiempoSesion = 0;
  metrics = new Metrics(CONFIG.metricsEndpoint);
  assets = new AssetLoader();
  estado: GameState = nuevaPartida();
  /** Altura de los ojos medida al calibrar (null = todavía no se calibró). */
  alturaOjos: number | null = null;
  /** Lo que hace el botón "Saltar" en la escena actual. */
  alSaltar: (() => void) | null = null;

  private reloj = new Timer();
  private luces: { luz: HemisphereLight | DirectionalLight; base: number }[] = [];
  private muneca: WristSkip;
  private cartelControles: TextPanel;
  private debugPanel: TextPanel | null = null;
  private debugAcum = { t: 0, cuadros: 0 };
  /** Máximo de draw calls y triángulos por ojo de cada escena (modo debug). */
  rendimiento = new Map<string, { drawCalls: number; triangulos: number }>();
  private cuadrosXR = 0;
  private arrancoXR = false;

  constructor(contenedor: HTMLElement, definiciones: (juego: Juego) => DefinicionEscena[]) {
    this.renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.shadowMap.enabled = false;
    this.renderer.xr.enabled = true;
    this.renderer.xr.setReferenceSpaceType('local-floor');
    this.renderer.xr.setFoveation(1);
    contenedor.appendChild(this.renderer.domElement);

    this.scene.background = new Color(CIELO);
    // Sin sombras en tiempo real: luz hemisférica + una direccional suave.
    const cielo = new HemisphereLight(0xffffff, 0x9a8f80, 2.2);
    const sol = new DirectionalLight(0xffffff, 1.2);
    sol.position.set(1, 3, 2);
    this.scene.add(cielo, sol);
    this.luces = [
      { luz: cielo, base: cielo.intensity },
      { luz: sol, base: sol.intensity },
    ];

    this.camara.position.set(0, 1.6, 0);
    this.camara.lookAt(0, 1.25, -1);
    this.scene.add(this.camara);
    this.scene.add(this.estacion);

    this.manos = new HandTracker(this.renderer, this.scene);
    this.inter = new Interactables(this.manos, this.audio);
    this.fader = new Fader(this.scene, this.camara);
    this.fantasma = new GhostHand(this.scene, this.camara);
    this.muneca = new WristSkip(this.scene, this.manos, () => this.saltar());

    this.cartelControles = new TextPanel(t('general.dejaControles'), { ancho: 0.9, tamano: 0.06, fondo: '#1d2433', color: '#ffd166', negrita: true });
    this.cartelControles.visible = false;
    this.cartelControles.renderOrder = 10001;
    this.cartelControles.material.depthTest = false;
    this.scene.add(this.cartelControles);

    if (CONFIG.debug) {
      this.debugPanel = new TextPanel('', { ancho: 0.5, tamano: 0.022, fondo: 'rgba(0,0,0,0.6)', alinear: 'left' });
      this.debugPanel.renderOrder = 10002;
      this.debugPanel.material.depthTest = false;
      this.scene.add(this.debugPanel);
      window.addEventListener('keydown', (e) => this.teclaDebug(e));
    }

    this.escenas = new SceneManager(definiciones(this), this.fader, {
      antesDeEntrar: () => {
        this.ajustarLuz(1);
        this.ajustarCielo(null);
        this.inter.limpiar();
        this.audio.pararTodo();
        this.alSaltar = null;
        this.recentrar();
      },
      alEntrar: (id) => {
        this.metrics.escena(id);
        if (CONFIG.debug && this.rendimiento.size) {
          console.table(Object.fromEntries(this.rendimiento));
        }
      },
      alReiniciar: () => {
        this.estado = nuevaPartida();
        this.tiempoSesion = 0;
        // Cada partida es una sesión de métricas (en modo evento, una por persona).
        if (this.renderer.xr.isPresenting && !this.metrics.sesion) this.metrics.iniciarSesion();
        this.manos.setPiel('#e9bb98');
      },
    });

    this.renderer.xr.addEventListener('sessionstart', () => {
      this.cuadrosXR = 0;
      this.arrancoXR = false;
      this.fader.tapar();
    });
    this.renderer.xr.addEventListener('sessionend', () => {
      this.metrics.terminarSesion();
      this.alturaOjos = null;
      this.ajustarTamano();
      void this.escenas.irA(0);
    });

    window.addEventListener('resize', () => this.ajustarTamano());
    this.ajustarTamano();
    this.renderer.setAnimationLoop((tiempo, frame) => this.cuadro(tiempo, frame));
  }

  /** Muestra la primera escena en la pantalla de la PC (vista previa, sin manos). */
  iniciarVistaPrevia(): void {
    void this.escenas.irA(0);
  }

  async entrarVR(): Promise<void> {
    this.audio.desbloquear();
    const xr = navigator.xr;
    if (!xr) throw new Error('WebXR no disponible');
    const session = await xr.requestSession('immersive-vr', { optionalFeatures: ['hand-tracking', 'local-floor'] });
    await this.renderer.xr.setSession(session);
  }

  // ── Calibración y estaciones ──

  /** Posición de la cabeza en el mundo. */
  cabeza(out = new Vector3()): Vector3 {
    return this.camara.getWorldPosition(out);
  }

  /** Mide la altura de los ojos para ubicar lo interactivo a la altura del pecho. */
  calibrar(): void {
    this.alturaOjos = this.cabeza(_pos).y;
  }

  get alturaPecho(): number {
    return (this.alturaOjos ?? this.cabeza(_pos).y) - CONFIG.pechoBajoOjos;
  }

  /** Altura del piso en las coordenadas de la estación. */
  get pisoY(): number {
    return -this.estacion.position.y;
  }

  /** Reubica la estación alrededor del jugador: debajo de la cabeza, mirando hacia adelante. */
  recentrar(): void {
    this.cabeza(_pos);
    this.camara.getWorldQuaternion(_quat);
    _euler.setFromQuaternion(_quat, 'YXZ');
    this.estacion.position.set(_pos.x, this.alturaPecho, _pos.z);
    this.estacion.rotation.set(0, _euler.y, 0);
    this.estacion.updateMatrixWorld(true);
  }

  /** true cuando queda poco del tiempo total: las etapas se completan solas para llegar al final. */
  get apurado(): boolean {
    return this.tiempoSesion >= CONFIG.tiempos.sesionMaxima - CONFIG.tiempos.final - 15;
  }

  /** Cambia el color del cielo (null = el de siempre). Se restaura al cambiar de escena. */
  ajustarCielo(color: string | null): void {
    (this.scene.background as Color).set(color ?? CIELO);
  }

  /** Atenúa (o restaura con 1) la iluminación general. Se restaura sola al cambiar de escena. */
  ajustarLuz(factor: number): void {
    for (const l of this.luces) l.luz.intensity = l.base * factor;
  }

  saltar(): void {
    this.alSaltar?.();
  }

  // ── Ciclo ──

  private cuadro(tiempo: number, frame: XRFrame | undefined): void {
    this.reloj.update(tiempo);
    const dt = Math.min(this.reloj.getDelta(), 0.05);

    // Al entrar a VR se espera a tener la pose de la cabeza para ubicar la primera escena.
    if (this.renderer.xr.isPresenting && !this.arrancoXR && frame) {
      this.cuadrosXR++;
      if (this.cuadrosXR > 3 && !this.escenas.enTransicion) {
        this.arrancoXR = true;
        this.alturaOjos = null;
        this.metrics.iniciarSesion();
        void this.escenas.reiniciar();
      }
    }

    this.tiempoSesion += dt;
    this.manos.update(dt);
    this.inter.update(dt);
    this.escenas.update(dt);
    this.muneca.update(dt);
    this.fantasma.update(dt);
    this.fader.update(dt);
    this.actualizarCartelControles();
    this.actualizarDebug(dt);
    this.renderer.render(this.scene, this.camara);
  }

  private actualizarCartelControles(): void {
    const mostrar = this.manos.controlesDetectados && !this.manos.izquierda.visible && !this.manos.derecha.visible;
    this.cartelControles.visible = mostrar;
    if (mostrar) this.delanteDeLaCabeza(this.cartelControles, 1.2, 0);
  }

  /** Ubica un objeto delante de la cabeza, mirando al jugador. */
  private delanteDeLaCabeza(obj: TextPanel, distancia: number, bajada: number): void {
    this.cabeza(_pos);
    this.camara.getWorldQuaternion(_quat);
    obj.position.set(0, bajada, -distancia).applyQuaternion(_quat).add(_pos);
    obj.quaternion.copy(_quat);
  }

  private actualizarDebug(dt: number): void {
    if (!this.debugPanel) return;
    this.debugAcum.t += dt;
    this.debugAcum.cuadros++;
    if (this.debugAcum.t >= 0.5) {
      const info = this.renderer.info.render;
      const fps = Math.round(this.debugAcum.cuadros / this.debugAcum.t);
      const escena = this.escenas.actual?.id ?? '-';
      const etapa = this.etapa ? ` · etapa ${formatoTiempo(this.etapa.tiempo)} / ${formatoTiempo(this.etapa.tope)}` : '';
      // En VR se dibuja cada ojo por separado: el presupuesto (100 draw calls) es por ojo.
      const ojos = this.renderer.xr.isPresenting ? 2 : 1;
      const llamadas = Math.round(info.calls / ojos);
      const tris = Math.round(info.triangles / ojos);
      const previo = this.rendimiento.get(escena) ?? { drawCalls: 0, triangulos: 0 };
      this.rendimiento.set(escena, { drawCalls: Math.max(previo.drawCalls, llamadas), triangulos: Math.max(previo.triangulos, tris) });
      this.debugPanel.setTexto(
        `FPS ${fps} · draw calls por ojo ${Math.round(info.calls / ojos)} · triángulos ${(info.triangles / ojos / 1000).toFixed(1)}k\n` +
          `escena ${escena} · sesión ${formatoTiempo(this.tiempoSesion)}${etapa}`,
      );
      this.debugAcum = { t: 0, cuadros: 0 };
    }
    this.delanteDeLaCabeza(this.debugPanel, 0.9, -0.32);
  }

  private teclaDebug(e: KeyboardEvent): void {
    if (/^[0-9]$/.test(e.key)) void this.escenas.irA(Number(e.key));
    else if (e.key === 's' || e.key === 'S') this.saltar();
  }

  private ajustarTamano(): void {
    if (this.renderer.xr.isPresenting) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.camara.aspect = w / h;
    this.camara.updateProjectionMatrix();
    // Vista previa en la PC: cámara fija a la altura de los ojos.
    this.camara.position.set(0, 1.6, 0);
    this.camara.lookAt(0, 1.3, -1);
  }
}
