import {
  BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, Mesh, MeshLambertMaterial, SphereGeometry, TubeGeometry, Vector3,
  type ColorRepresentation, type Group, type Material,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type Punto = [number, number, number];

export function materialPersonaje(color: ColorRepresentation, nombre = ''): MeshLambertMaterial {
  const material = new MeshLambertMaterial({ color });
  material.name = nombre;
  return material;
}

function esfera(ancho: number, alto: number): SphereGeometry {
  const g = new SphereGeometry(1, ancho, alto);
  g.userData.compartida = true;
  return g;
}

export const VOLUMEN = esfera(14, 9);
export const DETALLE = esfera(8, 6);
export const PUNTO = esfera(6, 4);

/** Une anillos elípticos desde la base hasta la parte superior de la silueta. */
export function perfil(anillos: readonly (readonly [y: number, rx: number, rz: number, z?: number])[]): BufferGeometry {
  const lados = 14;
  const puntos: number[] = [];
  const caras: number[] = [];
  anillos.forEach(([y, rx, rz, z = 0], i) => {
    for (let j = 0; j < lados; j++) {
      const a = (j * Math.PI * 2) / lados;
      puntos.push(rx * Math.sin(a), y, z + rz * Math.cos(a));
      if (i === anillos.length - 1) continue;
      const k = i * lados + j;
      const vecino = i * lados + (j + 1) % lados;
      caras.push(k, vecino, k + lados, vecino, vecino + lados, k + lados);
    }
  });
  for (const [i, superior] of [[0, false], [anillos.length - 1, true]] as const) {
    const [y, , , z = 0] = anillos[i];
    const centro = puntos.length / 3;
    puntos.push(0, y, z);
    for (let j = 0; j < lados; j++) {
      const k = i * lados + j;
      const v = i * lados + (j + 1) % lados;
      if (superior) caras.push(centro, k, v);
      else caras.push(centro, v, k);
    }
  }
  return superficie(puntos, caras);
}

export function superficie(puntos: number[], caras: number[]): BufferGeometry {
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(puntos, 3));
  geo.setIndex(caras);
  geo.computeVertexNormals();
  return geo;
}

/** Filete redondo para costuras, boca y cejas. */
export function linea(puntos: readonly Punto[], radio: number, tramos = 8): TubeGeometry {
  return new TubeGeometry(new CatmullRomCurve3(puntos.map((p) => new Vector3(...p))), tramos, radio, 5, false);
}

/** Une las piezas fijas y puede grabar los colores de los detalles en sus vértices. */
export function fusionar(padre: Group, opciones: { excluir?: readonly Mesh[]; colores?: boolean } = {}): void {
  const porMaterial = new Map<Material, Mesh[]>();
  const detalles: Mesh[] = [];
  for (const o of padre.children) {
    if (!(o instanceof Mesh) || Array.isArray(o.material) || opciones.excluir?.includes(o)) continue;
    if (opciones.colores && o.material instanceof MeshLambertMaterial && !o.material.name && !o.material.map) {
      detalles.push(o);
      continue;
    }
    const lista = porMaterial.get(o.material);
    if (lista) lista.push(o);
    else porMaterial.set(o.material, [o]);
  }
  const materialDetalles = detalles.length > 1 ? materialPersonaje('#ffffff') : null;
  if (materialDetalles) {
    materialDetalles.vertexColors = true;
    porMaterial.set(materialDetalles, detalles);
  }
  for (const [material, mallas] of porMaterial) {
    if (mallas.length < 2) continue;
    const colores = material === materialDetalles;
    const piezas = mallas.map((m) => {
      m.updateMatrix();
      const g = m.geometry.clone().applyMatrix4(m.matrix);
      // Estos materiales son de color plano: la malla solo usa posiciones y normales.
      g.deleteAttribute('uv');
      if (colores || (material.vertexColors && !g.hasAttribute('color'))) {
        const rgb = colores ? (m.material as MeshLambertMaterial).color.toArray() : [1, 1, 1];
        const buffer = new Float32Array(g.attributes.position.count * 3);
        for (let j = 0; j < buffer.length; j += 3) buffer.set(rgb, j);
        g.setAttribute('color', new Float32BufferAttribute(buffer, 3));
      }
      if (!g.index) g.setIndex(Array.from({ length: g.attributes.position.count }, (_, i) => i));
      if (!m.geometry.userData.compartida) m.geometry.dispose();
      return g;
    });
    const unida = mergeGeometries(piezas)!;
    piezas.forEach((g) => g.dispose());
    padre.remove(...mallas);
    padre.add(new Mesh(unida, material));
  }
}
