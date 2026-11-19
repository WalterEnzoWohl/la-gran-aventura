/**
 * Objetos de las misiones con primitivas. El origen de cada objeto está en su
 * centro (ahí se mide el radio de agarre). Se pueden reemplazar por modelos .glb
 * con AssetLoader usando el mismo nombre.
 */
import { Group, Mesh, MeshBasicMaterial, Object3D, RingGeometry } from 'three';
import { GEO, malla } from './primitivas';

export interface Biberon {
  grupo: Group;
  /** Punta de la tetina (lo que se acerca a la boca). */
  tetina: Object3D;
}

export function crearBiberon(): Biberon {
  const grupo = new Group();
  grupo.name = 'biberon';
  malla(grupo, GEO.cilindro, '#eef6fb', { pos: [0, -0.01, 0], esc: [0.032, 0.11, 0.032] });
  malla(grupo, GEO.cilindro, '#fff4d6', { pos: [0, -0.03, 0], esc: [0.029, 0.07, 0.029] });
  malla(grupo, GEO.cilindro, '#f2a541', { pos: [0, 0.052, 0], esc: [0.035, 0.018, 0.035] });
  malla(grupo, GEO.cono, '#e8c39e', { pos: [0, 0.08, 0], esc: [0.02, 0.04, 0.02] });
  const tetina = new Object3D();
  tetina.position.y = 0.1;
  grupo.add(tetina);
  return { grupo, tetina };
}

/** Pañal sucio abierto, con olorcito (esferas verdes que flotan). */
export function crearPanalSucio(): { grupo: Group; olor: Mesh[] } {
  const grupo = new Group();
  grupo.name = 'panalSucio';
  malla(grupo, GEO.caja, '#f4f1e6', { esc: [0.16, 0.015, 0.13] });
  malla(grupo, GEO.esfera, '#a8833f', { pos: [0, 0.008, 0], esc: [0.04, 0.008, 0.035] });
  for (const x of [-1, 1]) malla(grupo, GEO.caja, '#7fb3e0', { pos: [x * 0.085, 0.004, -0.04], esc: [0.03, 0.01, 0.03] });
  const olor = [0, 1, 2].map((i) => malla(grupo, GEO.esfera, '#9bcf6a', { pos: [(i - 1) * 0.03, 0.05, 0], esc: 0.012 }));
  return { grupo, olor };
}

export function crearPanalNuevo(): Group {
  const grupo = new Group();
  grupo.name = 'panalNuevo';
  malla(grupo, GEO.caja, '#ffffff', { esc: [0.12, 0.035, 0.1] });
  malla(grupo, GEO.caja, '#7fb3e0', { pos: [0, 0.019, 0], esc: [0.05, 0.004, 0.06] });
  return grupo;
}

export function crearTablet(): { grupo: Group; pantalla: Mesh } {
  const grupo = new Group();
  grupo.name = 'tablet';
  malla(grupo, GEO.caja, '#2b2f3a', { esc: [0.16, 0.012, 0.11] });
  const pantalla = new Mesh(GEO.caja, new MeshBasicMaterial({ color: '#7fd3ff' }));
  pantalla.scale.set(0.14, 0.002, 0.09);
  pantalla.position.y = 0.007;
  grupo.add(pantalla);
  return { grupo, pantalla };
}

export function crearCargador(): Group {
  const g = new Group();
  malla(g, GEO.caja, '#ececec', { esc: [0.2, 0.015, 0.14] });
  malla(g, GEO.caja, '#4caf50', { pos: [0.08, 0.009, 0.05], esc: [0.012, 0.004, 0.012] });
  return g;
}

/** Interruptor de pared: la tecla mira hacia +z. */
export function crearInterruptor(): { grupo: Group; tecla: Mesh } {
  const grupo = new Group();
  malla(grupo, GEO.caja, '#f7f7f7', { pos: [0, 0, -0.012], esc: [0.09, 0.12, 0.012] });
  const tecla = malla(grupo, GEO.caja, '#ffffff', { pos: [0, 0, -0.004], esc: [0.06, 0.08, 0.012] });
  return { grupo, tecla };
}

export type Alimento = 'verdura' | 'proteina' | 'papas' | 'golosina';

export function crearAlimento(tipo: Alimento): Group {
  const g = new Group();
  g.name = tipo;
  switch (tipo) {
    case 'verdura':
      malla(g, GEO.cilindro, '#7aa65a', { pos: [0, -0.015, 0], esc: [0.012, 0.04, 0.012] });
      malla(g, GEO.esfera, '#3f8f3a', { pos: [0, 0.02, 0], esc: [0.04, 0.032, 0.04] });
      malla(g, GEO.esfera, '#4fa046', { pos: [0.02, 0.025, 0.01], esc: 0.022 });
      break;
    case 'proteina':
      malla(g, GEO.esfera, '#c98a4b', { esc: [0.05, 0.025, 0.035] });
      malla(g, GEO.cilindro, '#f2e6d0', { pos: [0.055, 0, 0], esc: [0.008, 0.04, 0.008], rot: [0, 0, Math.PI / 2] });
      break;
    case 'papas':
      malla(g, GEO.caja, '#d94b4b', { pos: [0, -0.01, 0], esc: [0.06, 0.05, 0.03] });
      for (let i = 0; i < 5; i++) malla(g, GEO.caja, '#f2c94c', { pos: [-0.02 + i * 0.01, 0.03, 0], esc: [0.007, 0.05, 0.007], rot: [0, 0, (i - 2) * 0.12] });
      break;
    case 'golosina':
      malla(g, GEO.esfera, '#e85d9b', { esc: [0.03, 0.022, 0.022] });
      for (const x of [-1, 1]) malla(g, GEO.cono, '#f7a8cc', { pos: [x * 0.04, 0, 0], esc: [0.018, 0.025, 0.018], rot: [0, 0, (x * Math.PI) / 2] });
      break;
  }
  return g;
}

export function crearPlato(): Group {
  const g = new Group();
  malla(g, GEO.cilindro, '#ffffff', { esc: [0.13, 0.012, 0.13] });
  malla(g, GEO.cilindro, '#e3eef7', { pos: [0, 0.007, 0], esc: [0.09, 0.002, 0.09] });
  return g;
}

/**
 * Barra de progreso circular (por ejemplo, alrededor de la boca del bebé).
 * Mira siempre al jugador.
 */
export class ProgresoCircular {
  grupo = new Group();
  private arco: Mesh<RingGeometry, MeshBasicMaterial>;
  private ultimo = -1;

  constructor(
    private radio = 0.06,
    color = '#3aa76d',
  ) {
    const fondo = new Mesh(new RingGeometry(radio * 0.78, radio, 32), new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthTest: false }));
    fondo.renderOrder = 20;
    this.arco = new Mesh(new RingGeometry(radio * 0.78, radio, 32, 1, 0, 0.001), new MeshBasicMaterial({ color, depthTest: false }));
    this.arco.renderOrder = 21;
    this.grupo.add(fondo, this.arco);
    this.grupo.visible = false;
  }

  /** v de 0 a 1. */
  poner(v: number): void {
    const k = Math.max(0, Math.min(1, v));
    if (Math.abs(k - this.ultimo) < 0.01) return;
    this.ultimo = k;
    this.arco.geometry.dispose();
    // Empieza arriba y avanza en sentido horario.
    this.arco.geometry = new RingGeometry(this.radio * 0.78, this.radio, 32, 1, Math.PI / 2 - k * Math.PI * 2, Math.max(0.001, k * Math.PI * 2));
  }
}
