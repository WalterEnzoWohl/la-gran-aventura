/**
 * Fábrica de personajes tintables con primitivas: adulto, bebé, 11 años y 16 años.
 * Pelo, piel y ojos son materiales con nombre ('pelo', 'piel', 'ojos'): teñir es
 * cambiar un color. Un modelo .glb que use esos mismos nombres de material se
 * puede teñir igual (ver `tenir`).
 */
import { Group, Mesh, MeshLambertMaterial, Object3D } from 'three';
import { GEO, malla, matPropio } from '../primitivas';

export type Edad = 'adulto' | 'once' | 'dieciseis';
export type Pose = 'parado' | 'sentado';

export interface Colores {
  pelo: string;
  piel: string;
  ojos: string;
}

export interface OpcionesPersona extends Colores {
  edad: Edad;
  peinado: 'corto' | 'largo';
  ropa: string;
  pantalon: string;
  pose?: Pose;
  embarazada?: boolean;
}

export interface Persona {
  grupo: Group;
  /** Cabeza (para ubicar burbujas de diálogo y la mirada). */
  cabeza: Object3D;
  boca: Mesh;
  panza: Mesh | null;
  brazoDer: Object3D;
  /** Altura total aproximada (m). */
  altura: number;
}

/** Tiñe todos los materiales llamados 'pelo', 'piel' u 'ojos' dentro de un objeto. */
export function tenir(obj: Object3D, c: Partial<Colores>): void {
  obj.traverse((o) => {
    const m = (o as Mesh).material as MeshLambertMaterial | undefined;
    if (!m || Array.isArray(m) || !m.color) return;
    const color = m.name === 'pelo' ? c.pelo : m.name === 'piel' ? c.piel : m.name === 'ojos' ? c.ojos : undefined;
    if (color) m.color.set(color);
  });
}

const ESCALA: Record<Edad, { cuerpo: number; cabeza: number }> = {
  adulto: { cuerpo: 1, cabeza: 1 },
  once: { cuerpo: 0.8, cabeza: 1.12 },
  dieciseis: { cuerpo: 0.97, cabeza: 1.02 },
};

/**
 * Persona de pie o sentada. Origen en el piso, entre los pies; mira hacia +z.
 * Sentada, la cadera queda a 0,48 m (silla estándar).
 */
export function crearPersona(o: OpcionesPersona): Persona {
  const grupo = new Group();
  const s = ESCALA[o.edad];
  const piel = matPropio(o.piel, 'piel');
  const pelo = matPropio(o.pelo, 'pelo');
  const ojos = matPropio(o.ojos, 'ojos');
  const sentado = o.pose === 'sentado';

  const cuerpo = new Group();
  cuerpo.scale.setScalar(s.cuerpo);
  grupo.add(cuerpo);

  // Piernas
  const cadera = sentado ? 0.48 : 0.8;
  for (const x of [-0.09, 0.09]) {
    if (sentado) {
      malla(cuerpo, GEO.cilindro, o.pantalon, { pos: [x, cadera, 0.2], esc: [0.07, 0.42, 0.07], rot: [Math.PI / 2, 0, 0] });
      malla(cuerpo, GEO.cilindro, o.pantalon, { pos: [x, cadera / 2, 0.4], esc: [0.065, cadera, 0.065] });
      malla(cuerpo, GEO.caja, '#2d2d35', { pos: [x, 0.03, 0.45], esc: [0.1, 0.06, 0.2] });
    } else {
      malla(cuerpo, GEO.cilindro, o.pantalon, { pos: [x, 0.4, 0], esc: [0.07, 0.8, 0.07] });
      malla(cuerpo, GEO.caja, '#2d2d35', { pos: [x, 0.03, 0.04], esc: [0.1, 0.06, 0.2] });
    }
  }

  // Parte de arriba, relativa a la cadera.
  const sup = new Group();
  sup.position.y = cadera;
  cuerpo.add(sup);
  // Pocas piezas por personaje: cada malla es un draw call en el Quest 2.
  malla(sup, GEO.cilindro, o.ropa, { pos: [0, 0.32, 0], esc: [0.18, 0.68, 0.12] });
  let panza: Mesh | null = null;
  if (o.embarazada) panza = malla(sup, GEO.esferaFina, o.ropa, { pos: [0, 0.2, 0.1], esc: [0.17, 0.17, 0.19], nombre: 'panza' });

  const brazos: Object3D[] = [];
  for (const lado of [-1, 1]) {
    const brazo = new Group();
    brazo.position.set(lado * 0.22, 0.58, 0);
    brazo.rotation.z = lado * 0.12;
    malla(brazo, GEO.cilindro, o.ropa, { pos: [0, -0.28, 0], esc: [0.048, 0.56, 0.048] });
    malla(brazo, GEO.esfera, piel, { pos: [0, -0.6, 0], esc: 0.05 });
    sup.add(brazo);
    brazos.push(brazo);
  }


  // Cabeza: redondeada y sin rasgos realistas.
  const cabeza = new Group();
  cabeza.position.set(0, 0.8, 0);
  cabeza.scale.setScalar(s.cabeza);
  sup.add(cabeza);
  malla(cabeza, GEO.esferaFina, piel, { esc: [0.12, 0.13, 0.12] });
  for (const x of [-0.042, 0.042]) {
    malla(cabeza, GEO.esfera, '#ffffff', { pos: [x, 0.02, 0.1], esc: 0.022 });
    malla(cabeza, GEO.esfera, ojos, { pos: [x, 0.02, 0.118], esc: 0.013 });
  }
  const boca = malla(cabeza, GEO.sonrisa, '#8a3b3b', { pos: [0, -0.05, 0.108], esc: 0.028, rot: [0.2, 0, Math.PI] });
  // Pelo
  malla(cabeza, GEO.casquete, pelo, { pos: [0, 0.012, -0.004], esc: [0.128, 0.138, 0.13], rot: [-0.35, 0, 0] });
  if (o.peinado === 'largo') {
    malla(cabeza, GEO.caja, pelo, { pos: [0, -0.08, -0.07], esc: [0.25, 0.3, 0.1] });
  }

  return {
    grupo,
    cabeza,
    boca,
    panza,
    brazoDer: brazos[1],
    altura: (cadera + 0.8 + 0.14) * s.cuerpo,
  };
}

export interface Bebe {
  grupo: Group;
  /** Punto de la boca (para el biberón). */
  boca: Object3D;
  /** Punto de la espalda (para las palmadas). */
  espalda: Object3D;
  /** Boca abierta (llorando) y sonrisa (contento). */
  bocaAbierta: Mesh;
  sonrisa: Mesh;
  panal: Mesh;
  cabeza: Object3D;
  llorando(si: boolean): void;
}

/**
 * Bebé con enterito. Origen en el centro del cuerpo; erguido mira hacia +z.
 * Para acostarlo boca arriba: rotation.x = -PI/2.
 */
export function crearBebe(c: Colores, enterito = '#f6e7a8'): Bebe {
  const grupo = new Group();
  const piel = matPropio(c.piel, 'piel');
  const pelo = matPropio(c.pelo, 'pelo');
  const ojos = matPropio(c.ojos, 'ojos');

  malla(grupo, GEO.esferaFina, enterito, { esc: [0.1, 0.13, 0.085] });
  const panal = malla(grupo, GEO.esfera, '#ffffff', { pos: [0, -0.09, 0], esc: [0.095, 0.07, 0.085], nombre: 'panal' });
  for (const x of [-0.05, 0.05]) {
    malla(grupo, GEO.cilindro, enterito, { pos: [x, -0.18, 0.01], esc: [0.036, 0.15, 0.036] });
    malla(grupo, GEO.cilindro, enterito, { pos: [x * 2.2, 0.03, 0.02], esc: [0.03, 0.12, 0.03], rot: [0, 0, x > 0 ? 0.6 : -0.6] });
    malla(grupo, GEO.esfera, piel, { pos: [x * 3.1, -0.02, 0.03], esc: 0.03 });
  }

  const cabeza = new Group();
  cabeza.position.y = 0.2;
  grupo.add(cabeza);
  malla(cabeza, GEO.esferaFina, piel, { esc: 0.09 });
  malla(cabeza, GEO.casquete, pelo, { pos: [0, 0.01, -0.005], esc: [0.093, 0.095, 0.094], rot: [-0.5, 0, 0] });
  for (const x of [-0.032, 0.032]) {
    malla(cabeza, GEO.esfera, ojos, { pos: [x, 0.012, 0.08], esc: 0.014 });
  }
  malla(cabeza, GEO.esfera, '#f3a6a6', { pos: [-0.05, -0.02, 0.065], esc: 0.014 });
  malla(cabeza, GEO.esfera, '#f3a6a6', { pos: [0.05, -0.02, 0.065], esc: 0.014 });
  const sonrisa = malla(cabeza, GEO.sonrisa, '#8a3b3b', { pos: [0, -0.03, 0.084], esc: 0.02, rot: [0.3, 0, Math.PI] });
  const bocaAbierta = malla(cabeza, GEO.esfera, '#6b2430', { pos: [0, -0.035, 0.08], esc: [0.022, 0.018, 0.01] });
  bocaAbierta.visible = false;

  const boca = new Object3D();
  boca.position.set(0, 0.17, 0.1);
  grupo.add(boca);
  const espalda = new Object3D();
  espalda.position.set(0, 0.02, -0.1);
  grupo.add(espalda);

  return {
    grupo,
    boca,
    espalda,
    bocaAbierta,
    sonrisa,
    panal,
    cabeza,
    llorando(si: boolean) {
      bocaAbierta.visible = si;
      sonrisa.visible = !si;
    },
  };
}

/** Colores de ropa fijos por personaje (no son personalizables). */
export const ROPA = {
  jugador: { ropa: '#3f7fbf', pantalon: '#36404f' },
  pareja: { ropa: '#d9667a', pantalon: '#4a3f5c' },
  once: { ropa: '#f0a43a', pantalon: '#3c5a8a' },
  dieciseis: { ropa: '#4a9c6d', pantalon: '#2f3442' },
};

