/** Fábrica de personajes procedurales, con articulaciones y rasgos tintables. */
import { Color, Group, Mesh, Object3D } from 'three';
import { GEO, malla } from '../primitivas';
import { armarCara, type Peinado } from './cara';
import { DETALLE, fusionar, linea, materialPersonaje, perfil, PUNTO, VOLUMEN } from './formas';

export { puntoCara, type Peinado } from './cara';

export type Edad = 'adulto' | 'once' | 'dieciseis';
export type Pose = 'parado' | 'sentado';
type Genero = 'hombre' | 'mujer';

export interface Colores {
  pelo: string;
  piel: string;
  ojos: string;
}

export interface OpcionesPersona extends Colores {
  edad: Edad;
  peinado: Exclude<Peinado, 'bebe'>;
  ropa: string;
  pantalon: string;
  genero?: Genero;
  pose?: Pose;
  embarazada?: boolean;
}

export interface Persona {
  grupo: Group;
  cabeza: Group;
  panza: Mesh | null;
  brazoDer: Object3D;
  altura: number;
  animar(dt: number): void;
}

/** Mantiene la personalización de piel, pelo e iris, incluso en las mallas unidas. */
export function tenir(obj: Object3D, c: Partial<Colores>): void {
  obj.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    const m = o.material;
    const color = c[m.name as keyof Colores];
    if (color && m.color) m.color.set(color);
  });
}

const ESCALA: Record<Edad, { cuerpo: number; cabeza: number }> = {
  adulto: { cuerpo: 1, cabeza: 0.96 },
  once: { cuerpo: 0.8, cabeza: 1.10 },
  dieciseis: { cuerpo: 0.97, cabeza: 1.02 },
};

function detalleRopa(ropa: string, factor: number) {
  return materialPersonaje(new Color(ropa).multiplyScalar(factor).getStyle());
}

function armarPiernas(cuerpo: Group, cadera: number, sentado: boolean, falda: boolean, o: OpcionesPersona) {
  const pantalon = materialPersonaje(o.pantalon);
  const piernas = falda ? materialPersonaje(o.piel, 'piel') : pantalon;
  const zapatos = materialPersonaje(o.edad === 'adulto' ? '#3b302d' : '#364351');
  const suela = materialPersonaje(o.edad === 'adulto' ? '#292429' : '#e3ddd3');
  const zRodilla = sentado ? 0.35 : 0.003;
  const largo = sentado ? cadera : falda ? cadera - 0.31 : cadera;
  for (const x of [-0.082, 0.082]) {
    if (sentado) {
      malla(cuerpo, VOLUMEN, pantalon, { pos: [x, cadera - 0.025, 0.145], esc: [0.081, 0.08, 0.225] });
    }
    malla(cuerpo, perfil([
      [0.04, 0.025, 0.035], [0.064, 0.046, 0.055], [0.18, 0.051, 0.061],
      [largo * 0.62, 0.058, 0.061], [largo * 0.85, 0.068, 0.069], [largo, 0.07, 0.071],
      [largo + 0.028, 0.015, 0.02],
    ]), piernas, { pos: [x, 0, zRodilla] });
    malla(cuerpo, VOLUMEN, zapatos, { pos: [x, 0.052, zRodilla + 0.048], esc: [0.063, 0.05, 0.108] });
    malla(cuerpo, GEO.redondeada, suela, { pos: [x, 0.014, zRodilla + 0.05], esc: [0.12, 0.024, 0.199] });
  }
  const caderaGeo = falda
    ? perfil([
        [-0.377, 0.11, 0.087], [-0.37, 0.156, 0.101], [-0.32, 0.161, 0.104],
        [-0.13, 0.174, 0.111], [0.018, 0.172, 0.117], [0.11, 0.127, 0.09],
      ])
    : perfil([
        [-0.108, 0.136, 0.064], [-0.07, 0.151, 0.089], [0, 0.167, 0.104],
        [0.095, 0.157, 0.097], [0.118, 0.135, 0.086],
      ]);
  malla(cuerpo, caderaGeo, pantalon, { pos: [0, cadera + (sentado ? -0.045 : 0), 0] });
  fusionar(cuerpo, { colores: true });
}

/**
 * Origen entre los pies, mirada hacia +z. La cadera sentada conserva su ancla de
 * 0,48 m y el pivote del brazo derecho se usa en el saludo del cine.
 */
export function crearPersona(o: OpcionesPersona): Persona {
  const grupo = new Group();
  const cuerpo = new Group();
  const escala = ESCALA[o.edad];
  cuerpo.scale.setScalar(escala.cuerpo);
  grupo.add(cuerpo);

  const sentado = o.pose === 'sentado';
  const cadera = sentado ? 0.48 : 0.8;
  const adulto = o.edad === 'adulto';
  const mujer = o.genero === 'mujer';
  const falda = adulto && mujer && !sentado;
  armarPiernas(cuerpo, cadera, sentado, falda, o);

  const torso = new Group();
  torso.position.y = cadera;
  cuerpo.add(torso);
  const piel = materialPersonaje(o.piel, 'piel');
  const ropa = materialPersonaje(o.ropa);
  const ribete = detalleRopa(o.ropa, 0.63);
  const luzRopa = detalleRopa(o.ropa, 1.18);
  const hombros = mujer ? 0.168 : 0.197;
  const cintura = mujer ? 0.126 : 0.152;

  malla(torso, perfil([
    [0.028, cintura * 0.92, 0.082], [0.082, cintura, 0.098], [0.20, cintura, 0.106],
    [0.37, hombros * 0.91, 0.118], [0.51, hombros, 0.111], [0.569, hombros * 0.93, 0.091],
    [0.604, hombros * 0.76, 0.076], [0.656, 0.058, 0.058], [0.673, 0.035, 0.036],
  ]), ropa);
  malla(torso, VOLUMEN, piel, { pos: [0, 0.661, 0.005], esc: [0.052, 0.075, 0.052] });

  if (adulto && !mujer) {
    const cinturon = materialPersonaje('#43332e');
    malla(torso, perfil([[0.045, 0.158, 0.101], [0.048, 0.161, 0.103], [0.083, 0.16, 0.103], [0.085, 0.151, 0.095]]), cinturon);
    malla(torso, GEO.redondeada, materialPersonaje('#bdab86'), { pos: [0, 0.066, 0.104], esc: [0.052, 0.038, 0.014] });
    malla(torso, linea([[0, 0.105, 0.102], [0, 0.30, 0.121], [0, 0.50, 0.116], [0, 0.613, 0.081]], 0.0045), ribete);
    for (const [y, z] of [[0.15, 0.109], [0.24, 0.115], [0.33, 0.12], [0.42, 0.12], [0.51, 0.114]]) {
      malla(torso, PUNTO, luzRopa, { pos: [0, y, z + 0.006], esc: [0.007, 0.007, 0.005] });
    }
    for (const lado of [-1, 1]) {
      malla(torso, GEO.redondeada, luzRopa, { pos: [lado * 0.046, 0.609, 0.076], esc: [0.054, 0.093, 0.02], rot: [-0.52, lado * 0.2, lado * -0.43] });
    }
  } else {
    malla(torso, linea([[-0.058, 0.649, 0.043], [-0.038, 0.625, 0.065], [0, 0.611, 0.08], [0.038, 0.625, 0.065], [0.058, 0.649, 0.043]], 0.008), ribete);
    if (o.edad === 'once') {
      malla(torso, VOLUMEN, ribete, { pos: [0, 0.584, -0.075], esc: [0.136, 0.071, 0.063] });
      malla(torso, GEO.redondeada, luzRopa, { pos: [0, 0.205, 0.107], esc: [0.151, 0.10, 0.03] });
      for (const lado of [-1, 1]) {
        malla(torso, linea([[lado * 0.033, 0.612, 0.078], [lado * 0.04, 0.549, 0.105], [lado * 0.044, 0.467, 0.118]], 0.004), ribete);
      }
    } else if (mujer && !o.embarazada) {
      malla(torso, perfil([[0.115, 0.124, 0.094], [0.12, 0.127, 0.103], [0.158, 0.127, 0.106], [0.163, 0.124, 0.102]]), ribete);
    } else if (!adulto) {
      malla(torso, GEO.redondeada, luzRopa, { pos: [-0.082, 0.441, 0.104], esc: [0.069, 0.059, 0.015], rot: [0, -0.33, 0] });
    }
  }
  const panza = o.embarazada
    ? malla(torso, VOLUMEN, ropa, { pos: [0, 0.20, 0.1], esc: [0.167, 0.185, 0.187], nombre: 'panza' })
    : null;
  fusionar(torso, { excluir: panza ? [panza] : [], colores: true });

  const brazos = [-1, 1].map((lado) => {
    const brazo = new Group();
    brazo.position.set(lado * (hombros - 0.021), 0.548, sentado ? 0.018 : 0);
    brazo.rotation.set(sentado ? -0.52 : -0.05, 0, lado * (sentado ? 0.17 : 0.145));
    torso.add(brazo);
    const manga = adulto ? (mujer ? 0.31 : 0.49) : o.edad === 'once' ? 0.43 : 0.22;
    malla(brazo, perfil([
      [-manga, 0.035, 0.037], [-manga + 0.020, 0.047, 0.05],
      [-manga * 0.63, 0.05, 0.054], [-0.08, 0.061, 0.063],
      [-0.014, 0.056, 0.067], [0.041, 0.038, 0.05], [0.059, 0.008, 0.012],
    ]), ropa);
    malla(brazo, VOLUMEN, ribete, { pos: [0, -manga + 0.015, 0], esc: [0.05, 0.027, 0.052] });
    const brazoLibre = 0.53 - manga;
    malla(brazo, VOLUMEN, piel, { pos: [0, -(manga + 0.53) / 2, 0.007], esc: [0.037, brazoLibre / 2 + 0.02, 0.036] });
    malla(brazo, DETALLE, piel, { pos: [0, -0.554, 0.011], esc: [0.036, 0.055, 0.028], rot: [0, lado * 0.2, lado * -0.08] });
    malla(brazo, DETALLE, piel, { pos: [-lado * 0.027, -0.539, 0.032], esc: [0.013, 0.028, 0.014], rot: [0, 0, lado * -0.37] });
    fusionar(brazo, { colores: true });
    return brazo;
  });

  const cabeza = new Group();
  cabeza.position.set(0, 0.8, 0);
  cabeza.scale.setScalar(escala.cabeza);
  torso.add(cabeza);
  const cara = armarCara(cabeza, o, o.peinado, adulto && !mujer);
  return { grupo, cabeza, panza, brazoDer: brazos[1], altura: (cadera + 0.8 + 0.16 * escala.cabeza) * escala.cuerpo, animar: cara.animar };
}

export interface Bebe {
  grupo: Group;
  /** Anclas de boca y espalda para el biberón y las palmadas. */
  boca: Object3D;
  espalda: Object3D;
  panal: Mesh;
  cabeza: Group;
  llorando(si: boolean): void;
  animar(dt: number): void;
}

/** Origen en el centro del enterito. Erguido mira hacia +z. */
export function crearBebe(c: Colores, enterito = '#f5d58e'): Bebe {
  const grupo = new Group();
  const tela = materialPersonaje(enterito);
  const ribete = detalleRopa(enterito, 0.72);
  const piel = materialPersonaje(c.piel, 'piel');
  malla(grupo, VOLUMEN, tela, { esc: [0.105, 0.135, 0.084] });
  malla(grupo, linea([[0, -0.115, 0.043], [0, -0.047, 0.081], [0, 0.045, 0.081], [0, 0.112, 0.048]], 0.0045), ribete);
  const panal = malla(grupo, VOLUMEN, materialPersonaje('#fff4e2'), { pos: [0, -0.09, 0], esc: [0.096, 0.055, 0.088], nombre: 'panal' });

  for (const lado of [-1, 1]) {
    malla(grupo, VOLUMEN, tela, { pos: [lado * 0.053, -0.148, 0.032], esc: [0.044, 0.079, 0.041], rot: [-0.52, 0, lado * 0.17] });
    malla(grupo, DETALLE, tela, { pos: [lado * 0.068, -0.204, 0.063], esc: [0.039, 0.036, 0.048] });
    malla(grupo, VOLUMEN, tela, { pos: [lado * 0.108, 0.034, 0.016], esc: [0.04, 0.076, 0.034], rot: [-0.21, 0, lado * 0.46] });
    malla(grupo, DETALLE, piel, { pos: [lado * 0.141, -0.02, 0.043], esc: [0.026, 0.032, 0.023] });
    malla(grupo, DETALLE, piel, { pos: [lado * 0.122, -0.013, 0.059], esc: [0.012, 0.015, 0.01] });
  }
  fusionar(grupo, { excluir: [panal], colores: true });

  const cabeza = new Group();
  cabeza.position.y = 0.199;
  cabeza.scale.setScalar(0.76);
  grupo.add(cabeza);
  const cara = armarCara(cabeza, c, 'bebe');
  const boca = new Object3D();
  boca.position.set(0, -0.057, 0.119);
  cabeza.add(boca);
  const espalda = new Object3D();
  espalda.position.set(0, 0.02, -0.1);
  grupo.add(espalda);
  return { grupo, cabeza, boca, espalda, panal, animar: cara.animar, llorando: cara.llorando };
}

export function estiloAdulto(genero: Genero): Pick<OpcionesPersona, 'genero' | 'ropa' | 'pantalon' | 'peinado'> {
  return genero === 'mujer'
    ? { genero, ropa: '#a43f60', pantalon: '#493044', peinado: 'largo' }
    : { genero, ropa: '#235b96', pantalon: '#3e4754', peinado: 'corto' };
}

export const ROPA = {
  once: { ropa: '#db811e', pantalon: '#3c5a8a' },
  dieciseis: { ropa: '#32805e', pantalon: '#33394a' },
};
