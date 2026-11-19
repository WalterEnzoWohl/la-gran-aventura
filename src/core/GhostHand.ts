/**
 * Mano fantasma: una mano translúcida que muestra el gesto que hay que hacer
 * (tocar, agarrar y llevar, frotar o palmear) sobre el objeto del paso actual.
 */
import { Camera, CylinderGeometry, Group, Mesh, MeshBasicMaterial, Object3D, Quaternion, Scene, SphereGeometry, Vector3 } from 'three';
import type { Pista } from './HintSystem';
import { ease } from './Tweens';

const MAT = new MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.55, depthWrite: false });
const CIL = new CylinderGeometry(1, 1, 1, 10);
const ESF = new SphereGeometry(1, 12, 8);
const ARRIBA = new Vector3(0, 1, 0);
const _a = new Vector3();
const _b = new Vector3();
const _q = new Quaternion();

/** Cilindro entre dos puntos con puntas redondeadas. */
function hueso(padre: Object3D, a: [number, number, number], b: [number, number, number], r: number): void {
  const va = new Vector3(...a);
  const vb = new Vector3(...b);
  const m = new Mesh(CIL, MAT);
  m.position.copy(va).add(vb).multiplyScalar(0.5);
  m.scale.set(r, va.distanceTo(vb), r);
  m.quaternion.setFromUnitVectors(ARRIBA, vb.clone().sub(va).normalize());
  padre.add(m);
  for (const p of [va, vb]) {
    const e = new Mesh(ESF, MAT);
    e.position.copy(p);
    e.scale.setScalar(r);
    padre.add(e);
  }
}

/** Palma con los dedos indicados. Los dedos apuntan hacia +z; la palma mira hacia -y. */
function palma(g: Group): void {
  const p = new Mesh(ESF, MAT);
  p.scale.set(0.045, 0.014, 0.05);
  p.position.set(0.02, 0, -0.12);
  g.add(p);
}

function crearPoses(): { apuntar: Group; pinza: Group; abierta: Group } {
  // Origen de 'apuntar' y 'pinza': la punta del índice (o el punto de la pinza).
  const apuntar = new Group();
  palma(apuntar);
  hueso(apuntar, [0, 0, -0.085], [0, 0, 0], 0.009);
  for (const [x, i] of [[0.022, 0], [0.042, 1], [0.06, 2]] as const) {
    hueso(apuntar, [x, 0, -0.085], [x, -0.025, -0.06 - i * 0.004], 0.009);
  }
  hueso(apuntar, [-0.03, -0.005, -0.13], [-0.028, -0.02, -0.075], 0.01);

  const pinza = new Group();
  palma(pinza);
  hueso(pinza, [0, 0, -0.085], [0.002, -0.015, -0.02], 0.009);
  hueso(pinza, [0.002, -0.015, -0.02], [0, -0.012, 0], 0.008);
  hueso(pinza, [-0.035, -0.01, -0.12], [-0.015, -0.015, -0.04], 0.01);
  hueso(pinza, [-0.015, -0.015, -0.04], [0, -0.012, 0], 0.009);
  for (const [x, i] of [[0.022, 0], [0.042, 1], [0.06, 2]] as const) {
    hueso(pinza, [x, 0, -0.085], [x, -0.03, -0.065 - i * 0.004], 0.009);
  }

  // Origen de 'abierta': el centro de la palma.
  const abierta = new Group();
  const pa = new Group();
  pa.position.set(-0.02, 0, 0.12);
  palma(pa);
  for (const [x, l] of [[0, 0.085], [0.022, 0.09], [0.042, 0.082], [0.06, 0.065]] as const) {
    hueso(pa, [x, 0, -0.085], [x, 0, -0.085 + l], 0.009);
  }
  hueso(pa, [-0.03, -0.005, -0.13], [-0.055, -0.005, -0.07], 0.01);
  abierta.add(pa);
  return { apuntar, pinza, abierta };
}

export class GhostHand {
  grupo = new Group();
  private poses = crearPoses();
  private pista: Pista | null = null;
  private t = 0;
  private opacidad = 0;

  constructor(
    scene: Scene,
    private camara: Camera,
  ) {
    this.grupo.add(this.poses.apuntar, this.poses.pinza, this.poses.abierta);
    this.grupo.visible = false;
    this.grupo.renderOrder = 50;
    scene.add(this.grupo);
  }

  mostrar(p: Pista): void {
    this.pista = p;
    this.t = 0;
    this.grupo.visible = true;
  }

  ocultar(): void {
    this.pista = null;
  }

  private pose(nombre: 'apuntar' | 'pinza' | 'abierta'): void {
    this.poses.apuntar.visible = nombre === 'apuntar';
    this.poses.pinza.visible = nombre === 'pinza';
    this.poses.abierta.visible = nombre === 'abierta';
  }

  update(dt: number): void {
    const objetivo = this.opacidad + ((this.pista ? 0.55 : 0) - this.opacidad) * Math.min(1, dt * 6);
    this.opacidad = objetivo;
    MAT.opacity = objetivo;
    if (!this.pista) {
      if (this.opacidad < 0.02) this.grupo.visible = false;
      return;
    }
    this.t += dt;
    const p = this.pista;
    const cabeza = this.camara.getWorldPosition(_a);
    const destino = p.objetivo.getWorldPosition(_b);
    // Dirección desde el objeto hacia el jugador (por ahí viene la mano).
    const haciaJugador = cabeza.clone().sub(destino).normalize();
    const g = this.grupo;

    if (p.tipo === 'tocar') {
      this.pose('apuntar');
      const k = (this.t % 1.6) / 1.6;
      const ida = k < 0.5 ? ease.inOut(k * 2) : 1 - ease.inOut((k - 0.5) * 2);
      g.position.copy(destino).addScaledVector(haciaJugador, 0.16 * (1 - ida) - 0.01);
      g.lookAt(destino.clone().addScaledVector(haciaJugador, -0.3));
    } else if (p.tipo === 'agarrar') {
      const k = (this.t % 3.2) / 3.2;
      const hasta = p.destino ? p.destino.getWorldPosition(new Vector3()) : destino.clone().add(new Vector3(0, 0.12, 0));
      const arranque = destino.clone().addScaledVector(haciaJugador, 0.14).add(new Vector3(0, 0.05, 0));
      if (k < 0.3) {
        this.pose('apuntar');
        g.position.lerpVectors(arranque, destino, ease.inOut(k / 0.3));
      } else if (k < 0.4) {
        this.pose('pinza');
        g.position.copy(destino);
      } else if (k < 0.8) {
        this.pose('pinza');
        g.position.lerpVectors(destino, hasta, ease.inOut((k - 0.4) / 0.4));
      } else {
        this.pose('apuntar');
        g.position.copy(hasta);
      }
      // Dedos hacia adelante y un poco hacia abajo.
      g.lookAt(g.position.clone().addScaledVector(haciaJugador, -1).add(new Vector3(0, -0.5, 0)));
    } else if (p.tipo === 'frotar') {
      this.pose('abierta');
      const lateral = new Vector3().crossVectors(ARRIBA, haciaJugador).normalize();
      g.position.copy(destino).add(new Vector3(0, 0.03, 0)).addScaledVector(lateral, Math.sin(this.t * 7) * 0.05);
      g.lookAt(g.position.clone().addScaledVector(haciaJugador, -1));
    } else {
      this.pose('abierta');
      const golpe = Math.abs(Math.sin(this.t * 4));
      g.position.copy(destino).addScaledVector(haciaJugador, 0.02 + 0.1 * golpe);
      // La palma mira hacia el objeto.
      _q.setFromUnitVectors(new Vector3(0, -1, 0), haciaJugador.clone().negate());
      g.quaternion.copy(_q);
    }
  }
}
