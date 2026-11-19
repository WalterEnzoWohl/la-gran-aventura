/**
 * Botón "Reiniciar" siempre a mano, arriba a la derecha (al alcance, a la altura de la cara).
 * Se toca dos veces para confirmar, así nadie reinicia sin querer.
 * Tiene su propio detector porque no se borra al cambiar de escena.
 */
import { BoxGeometry, Group, Mesh, MeshLambertMaterial, Object3D, Vector3 } from 'three';
import { CONFIG } from '../content/config';
import { t } from '../content/textos';
import { PokeDetector } from './Gestures';
import type { HandTracker } from './HandTracker';
import { setBrillo } from './Interactable';
import { TextPanel } from './TextPanel';

const ANCHO = 0.14;
const ALTO = 0.06;
/** Posición en la estación (origen a la altura del pecho, adelante es -z). */
const POSICION = new Vector3(0.36, 0.24, -0.4);
const _v = new Vector3();

export class RestartButton {
  grupo = new Group();
  private tapa = new Group();
  private cuerpo: Mesh<BoxGeometry, MeshLambertMaterial>;
  private texto: TextPanel;
  private detector = new PokeDetector(CONFIG.manos.recorridoBoton, 0.6);
  private confirmarHasta = 0;
  private reloj = 0;
  private cerca = false;
  visible = true;

  constructor(
    estacion: Object3D,
    private manos: HandTracker,
    private onReiniciar: () => void,
  ) {
    this.cuerpo = new Mesh(new BoxGeometry(ANCHO, ALTO, 0.016), new MeshLambertMaterial({ color: '#59606e' }));
    this.cuerpo.position.z = -0.008;
    this.tapa.add(this.cuerpo);
    this.texto = new TextPanel(t('general.reiniciar'), { ancho: ANCHO * 0.95, tamano: 0.019, fondo: null, negrita: true, padding: 0.003 });
    this.texto.position.z = 0.001;
    this.texto.userData.sinBrillo = true;
    this.tapa.add(this.texto);
    this.grupo.add(this.tapa);
    this.grupo.position.copy(POSICION);
    // Mirando hacia el jugador, apenas inclinado.
    this.grupo.rotation.set(-0.15, Math.atan2(-POSICION.x, -POSICION.z), 0, 'YXZ');
    estacion.add(this.grupo);
  }

  update(dt: number): void {
    this.reloj += dt;
    this.grupo.visible = this.visible;
    if (this.confirmarHasta && this.reloj > this.confirmarHasta) this.ponerEstado(false);
    if (!this.visible) {
      this.detector.update(null, dt);
      return;
    }
    this.grupo.updateMatrixWorld(true);
    let pen: number | null = null;
    let cerca = false;
    for (const m of this.manos.manos) {
      if (!m.visible) continue;
      const local = this.tapa.worldToLocal(_v.copy(m.indice));
      const dentro = Math.abs(local.x) <= ANCHO / 2 + 0.005 && Math.abs(local.y) <= ALTO / 2 + 0.005;
      if (dentro && local.z <= 0.003 && local.z >= -0.1) pen = Math.max(pen ?? 0, -local.z);
      if (Math.abs(local.x) <= ANCHO / 2 + 0.03 && Math.abs(local.y) <= ALTO / 2 + 0.03 && local.z <= 0.07 && local.z >= -0.1) cerca = true;
    }
    if (cerca !== this.cerca) {
      this.cerca = cerca;
      setBrillo(this.tapa, cerca ? 0.35 : 0);
    }
    this.tapa.position.z = -this.detector.depth;
    if (this.detector.update(pen, dt)) {
      if (this.confirmarHasta) {
        this.ponerEstado(false);
        this.onReiniciar();
      } else {
        this.ponerEstado(true);
      }
    }
  }

  private ponerEstado(confirmando: boolean): void {
    this.confirmarHasta = confirmando ? this.reloj + 3 : 0;
    this.cuerpo.material.color.set(confirmando ? '#d9534f' : '#59606e');
    this.texto.setTexto(t(confirmando ? 'general.reiniciarConfirmar' : 'general.reiniciar'));
  }
}
