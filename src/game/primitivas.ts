/**
 * Primitivas compartidas: geometrías unitarias y materiales de colores planos
 * reutilizados entre objetos y escenas (presupuesto de rendimiento del Quest 2).
 * Se escalan por malla. No se liberan al salir de una escena.
 */
import {
  BoxGeometry, BufferGeometry, ConeGeometry, CylinderGeometry, Material, Mesh, MeshLambertMaterial, Object3D,
  SphereGeometry, TorusGeometry,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

function compartida<T extends BufferGeometry>(g: T): T {
  g.userData.compartida = true;
  return g;
}

export const GEO = {
  caja: compartida(new BoxGeometry(1, 1, 1)),
  redondeada: compartida(new RoundedBoxGeometry(1, 1, 1, 1, 0.14)),
  esfera: compartida(new SphereGeometry(1, 16, 12)),
  esferaFina: compartida(new SphereGeometry(1, 24, 16)),
  /** Media esfera (casquete de pelo). */
  casquete: compartida(new SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55)),
  cilindro: compartida(new CylinderGeometry(1, 1, 1, 16)),
  cono: compartida(new ConeGeometry(1, 1, 16)),
  /** Media dona: sonrisa. */
  sonrisa: compartida(new TorusGeometry(1, 0.18, 6, 16, Math.PI)),
  aro: compartida(new TorusGeometry(1, 0.08, 8, 32)),
};

const cache = new Map<string, MeshLambertMaterial>();

/** Material de color plano compartido. */
export function mat(color: string): MeshLambertMaterial {
  let m = cache.get(color);
  if (!m) {
    m = new MeshLambertMaterial({ color, flatShading: true });
    m.userData.compartido = true;
    cache.set(color, m);
  }
  return m;
}

/** Material propio (para teñir o hacer brillar sin afectar a otros). */
export function matPropio(color: string, nombre = ''): MeshLambertMaterial {
  const m = new MeshLambertMaterial({ color, flatShading: true });
  m.name = nombre;
  return m;
}

export interface OpcionesMalla {
  pos?: [number, number, number];
  esc?: [number, number, number] | number;
  rot?: [number, number, number];
  nombre?: string;
}

/** Crea una malla con una geometría compartida, la ubica y la agrega al padre. */
export function malla(padre: Object3D, geo: BufferGeometry, material: Material | string, o: OpcionesMalla = {}): Mesh {
  const m = new Mesh(geo, typeof material === 'string' ? mat(material) : material);
  if (o.pos) m.position.set(...o.pos);
  if (o.esc !== undefined) {
    if (typeof o.esc === 'number') m.scale.setScalar(o.esc);
    else m.scale.set(...o.esc);
  }
  if (o.rot) m.rotation.set(...o.rot);
  if (o.nombre) m.name = o.nombre;
  padre.add(m);
  return m;
}
