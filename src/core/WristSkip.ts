/**
 * Botón "Saltar" en la muñeca izquierda, siempre visible cuando se ve esa mano.
 * Se toca con el índice derecho y completa el paso actual.
 * Tiene su propio detector porque no se borra al cambiar de escena.
 */
import { BoxGeometry, Group, Mesh, MeshLambertMaterial, Scene, Vector3 } from 'three';
import { CONFIG } from '../content/config';
import { t } from '../content/textos';
import { PokeDetector } from './Gestures';
import type { HandTracker } from './HandTracker';
import { setBrillo } from './Interactable';
import { TextPanel } from './TextPanel';

const ANCHO = 0.07;
const ALTO = 0.05;
/** Posición del botón en el espacio de la muñeca: sobre el dorso, hacia el antebrazo. */
const OFFSET = new Vector3(0, 0.035, 0.07);

const _v = new Vector3();

export class WristSkip {
  grupo = new Group();
  private tapa = new Group();
  private detector = new PokeDetector(CONFIG.manos.recorridoBoton, 1.0);
  private cerca = false;

  constructor(
    scene: Scene,
    private manos: HandTracker,
    private onSaltar: () => void,
  ) {
    const cuerpo = new Mesh(new BoxGeometry(ANCHO, ALTO, 0.015), new MeshLambertMaterial({ color: '#e0663a' }));
    cuerpo.position.z = -0.0075;
    this.tapa.add(cuerpo);
    const texto = new TextPanel(t('general.saltar'), { ancho: ANCHO * 0.95, tamano: 0.018, fondo: null, negrita: true, padding: 0.002 });
    texto.position.z = 0.001;
    texto.userData.sinBrillo = true;
    this.tapa.add(texto);
    // El botón mira hacia +z; se gira para que mire hacia +y de la muñeca (el dorso).
    this.tapa.rotation.x = -Math.PI / 2;
    this.grupo.add(this.tapa);
    this.grupo.visible = false;
    scene.add(this.grupo);
  }

  update(dt: number): void {
    const izq = this.manos.izquierda;
    const der = this.manos.derecha;
    this.grupo.visible = izq.visible;
    if (!izq.visible) {
      this.detector.update(null, dt);
      return;
    }
    this.grupo.position.copy(izq.muneca).add(_v.copy(OFFSET).applyQuaternion(izq.munecaQuat));
    this.grupo.quaternion.copy(izq.munecaQuat);
    this.grupo.updateMatrixWorld(true);

    let pen: number | null = null;
    let cerca = false;
    if (der.visible) {
      const local = this.tapa.worldToLocal(_v.copy(der.indice));
      const dentro = Math.abs(local.x) <= ANCHO / 2 + 0.005 && Math.abs(local.y) <= ALTO / 2 + 0.005;
      if (dentro && local.z <= 0.003 && local.z >= -0.08) pen = -local.z;
      cerca = Math.abs(local.x) <= ANCHO / 2 + 0.03 && Math.abs(local.y) <= ALTO / 2 + 0.03 && local.z <= 0.06 && local.z >= -0.08;
    }
    if (cerca !== this.cerca) {
      this.cerca = cerca;
      setBrillo(this.tapa, cerca ? 0.4 : 0);
    }
    if (this.detector.update(pen, dt)) this.onSaltar();
  }
}
