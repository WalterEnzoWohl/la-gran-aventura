/**
 * Lee las uniones de las manos (XRHand) en cada cuadro y expone posiciones,
 * velocidades y la pinza. Dibuja las manos con XRHandModelFactory, teñidas con
 * el tono de piel elegido.
 *
 * Se usa el perfil 'spheres' (geometría generada en el visor): el perfil 'mesh'
 * descarga modelos de un CDN y no funcionaría en un evento sin internet.
 */
import { Color, Group, InstancedMesh, Mesh, MeshStandardMaterial, Object3D, Quaternion, Scene, Vector3, WebGLRenderer } from 'three';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';
import { CONFIG } from '../content/config';
import { cierreDeMano, PinchDetector, TomaDetector } from './Gestures';

export type Lado = 'left' | 'right';

export interface ManoEstado {
  lado: Lado;
  visible: boolean;
  /** Segundos desde que se perdió el seguimiento. */
  perdidaHace: number;
  indice: Vector3;
  pulgar: Vector3;
  /** Punto medio entre pulgar e índice. */
  pinza: Vector3;
  palma: Vector3;
  muneca: Vector3;
  munecaQuat: Quaternion;
  velIndice: Vector3;
  velPalma: Vector3;
  pinch: PinchDetector;
  /** Mano cerrada (agarrar con toda la mano). */
  puno: PinchDetector;
  /** Agarre combinado: pinza o mano cerrada. */
  toma: TomaDetector;
  /** Punto del agarre: la pinza o, si se agarró con la mano, la palma. */
  puntoToma: Vector3;
  /** Cierre de la mano (ver cierreDeMano). */
  cierre: number;
  /** Cierre del índice solo (mismo cálculo). */
  cierreIndice: number;
}

function nuevaMano(lado: Lado): ManoEstado {
  return {
    lado,
    visible: false,
    perdidaHace: 99,
    indice: new Vector3(),
    pulgar: new Vector3(),
    pinza: new Vector3(),
    palma: new Vector3(),
    muneca: new Vector3(),
    munecaQuat: new Quaternion(),
    velIndice: new Vector3(),
    velPalma: new Vector3(),
    pinch: new PinchDetector(CONFIG.manos.pinzaInicio, CONFIG.manos.pinzaSuelta),
    puno: new PinchDetector(CONFIG.manos.manoCierraInicio, CONFIG.manos.manoCierraSuelta),
    toma: new TomaDetector(),
    puntoToma: new Vector3(),
    cierre: 99,
    cierreIndice: 99,
  };
}

type JointMap = Record<string, Object3D | undefined>;

const _prevIndice = new Vector3();
const _prevPalma = new Vector3();

export class HandTracker {
  izquierda = nuevaMano('left');
  derecha = nuevaMano('right');
  manos: ManoEstado[] = [this.izquierda, this.derecha];
  /** true si el visor reporta controles en lugar de manos. */
  controlesDetectados = false;

  private grupos: Group[] = [];
  private lados = new Map<Group, Lado>();
  private modelos: Object3D[] = [];
  private piel = new Color('#e9bb98');

  constructor(
    private renderer: WebGLRenderer,
    scene: Scene,
  ) {
    const factory = new XRHandModelFactory();
    for (let i = 0; i < 2; i++) {
      const grupo = renderer.xr.getHand(i);
      const modelo = factory.createHandModel(grupo, 'spheres');
      grupo.add(modelo);
      scene.add(grupo);
      this.grupos.push(grupo);
      this.modelos.push(modelo);
      grupo.addEventListener('connected', (e) => {
        const src = (e as unknown as { data: XRInputSource }).data;
        if (src.hand && (src.handedness === 'left' || src.handedness === 'right')) this.lados.set(grupo, src.handedness);
      });
      grupo.addEventListener('disconnected', () => this.lados.delete(grupo));
    }
  }

  /** Tiñe las manos virtuales con el tono de piel elegido. */
  setPiel(color: string): void {
    this.piel.set(color);
  }

  update(dt: number): void {
    const session = this.renderer.xr.getSession();
    this.controlesDetectados = !!session && [...session.inputSources].some((s) => !s.hand && s.gamepad && s.handedness !== 'none');

    const vistas = new Set<Lado>();
    for (const grupo of this.grupos) {
      const lado = this.lados.get(grupo);
      if (!lado) continue;
      const joints = (grupo as unknown as { joints: JointMap }).joints;
      const tip = joints['index-finger-tip'];
      const thumb = joints['thumb-tip'];
      const wrist = joints['wrist'];
      const middle = joints['middle-finger-phalanx-proximal'];
      if (!tip?.visible || !thumb?.visible || !wrist?.visible || !middle) continue;
      const puntas = ['middle-finger-tip', 'ring-finger-tip', 'pinky-finger-tip']
        .map((n) => joints[n])
        .filter((j): j is Object3D => !!j?.visible)
        .map((j) => j.position);

      const m = lado === 'left' ? this.izquierda : this.derecha;
      const reaparece = !m.visible;
      _prevIndice.copy(m.indice);
      _prevPalma.copy(m.palma);
      // El grupo de la mano está en el origen del espacio de referencia:
      // la posición local de cada unión es su posición en el mundo.
      m.indice.copy(tip.position);
      m.pulgar.copy(thumb.position);
      m.muneca.copy(wrist.position);
      m.munecaQuat.copy(wrist.quaternion);
      m.palma.copy(wrist.position).lerp(middle.position, 0.55);
      m.pinza.copy(m.indice).add(m.pulgar).multiplyScalar(0.5);
      if (reaparece || dt <= 0) {
        m.velIndice.set(0, 0, 0);
        m.velPalma.set(0, 0, 0);
      } else {
        // Velocidad suavizada para filtrar el ruido del seguimiento.
        m.velIndice.lerp(_prevIndice.subVectors(m.indice, _prevIndice).divideScalar(dt), 0.5);
        m.velPalma.lerp(_prevPalma.subVectors(m.palma, _prevPalma).divideScalar(dt), 0.5);
      }
      m.pinch.update(m.indice.distanceTo(m.pulgar));
      const largoPalma = wrist.position.distanceTo(middle.position);
      m.cierre = cierreDeMano(puntas, m.palma, largoPalma);
      m.cierreIndice = cierreDeMano([m.indice], m.palma, largoPalma);
      // Con el índice estirado no es un puño: es señalar o tocar un botón.
      m.puno.update(m.cierreIndice > CONFIG.manos.indiceEstirado ? 99 : m.cierre);
      m.toma.update(m.pinch, m.puno);
      m.puntoToma.copy(m.toma.modo === 'mano' ? m.palma : m.pinza);
      vistas.add(lado);
    }

    for (const m of this.manos) {
      if (vistas.has(m.lado)) {
        m.visible = true;
        m.perdidaHace = 0;
      } else {
        if (m.visible) {
          m.pinch.update(null);
          m.puno.update(null);
          m.toma.update(m.pinch, m.puno);
        } else {
          m.pinch.started = m.pinch.ended = false;
          m.puno.started = m.puno.ended = false;
          m.toma.started = m.toma.ended = false;
        }
        m.visible = false;
        m.perdidaHace += dt;
      }
    }

    this.tenir();
  }

  private tenir(): void {
    for (const modelo of this.modelos) {
      modelo.traverse((o) => {
        const mesh = o as InstancedMesh | Mesh;
        if (!mesh.isMesh) return;
        const mat = mesh.material as MeshStandardMaterial;
        if (mat.color && !mat.color.equals(this.piel)) {
          mat.color.copy(this.piel);
          mat.roughness = 0.8;
        }
      });
    }
  }
}
