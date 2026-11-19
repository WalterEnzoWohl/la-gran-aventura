import { Float32BufferAttribute, Group, MeshPhongMaterial, SphereGeometry, Vector3 } from 'three';
import { malla } from '../primitivas';
import { DETALLE, fusionar, linea, materialPersonaje, PUNTO, superficie, VOLUMEN, type Punto } from './formas';
import type { Colores } from './index';

export type Peinado = 'corto' | 'largo' | 'rulos' | 'raya' | 'melena' | 'bebe';

const A = 0.12;
const B = 0.13;
const C = 0.12;

function anchoCara(altura: number): number {
  return A * (1 + 0.035 * Math.max(0, altura) - 0.17 * Math.max(0, -altura) ** 1.3);
}

/** Ancla una pieza a la piel, en las coordenadas locales de la cabeza. */
export function puntoCara(x: number, y: number, relieve = 0.004): Vector3 {
  const h = y / B;
  const z = C * Math.sqrt(Math.max(0, 1 - h * h - (x / anchoCara(h)) ** 2));
  return new Vector3(x, y, z + relieve);
}

function volumenCara(): SphereGeometry {
  const geo = new SphereGeometry(1, 24, 14);
  const pos = geo.attributes.position;
  const color: number[] = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    pos.setXYZ(i, x * anchoCara(y), y * B, z * C);
    const mejilla = Math.max(0, z) * Math.exp(-((Math.abs(x) - 0.58) ** 2 / 0.075 + (y + 0.23) ** 2 / 0.064));
    color.push(1 + mejilla * 0.075, 1 - mejilla * 0.15, 1 - mejilla * 0.13);
  }
  geo.setAttribute('color', new Float32BufferAttribute(color, 3));
  geo.computeVertexNormals();
  geo.userData.compartida = true;
  return geo;
}

const CARA = volumenCara();

/** Implantación más corta sobre la frente y más larga hacia la nuca. */
function casquete(peinado: Peinado) {
  const lados = 24;
  const filas = 9;
  const largo = peinado === 'largo' || peinado === 'melena';
  const puntos: number[] = [];
  const caras: number[] = [];
  for (let i = 0; i <= filas; i++) {
    for (let j = 0; j < lados; j++) {
      const a = j * Math.PI * 2 / lados;
      const frente = Math.cos(a);
      const lado = Math.sin(a);
      const nuca = largo ? 2.9 : 2.4;
      const lineaFrente = largo ? 1.25 + 0.28 * lado : 1.12 - 0.16 * lado;
      const limite = frente > 0 ? 1.89 + frente * (lineaFrente - 1.89) : 1.89 - frente * (nuca - 1.89);
      const t = 0.001 + (i / filas) * limite;
      const onda = peinado === 'rulos' ? 1 + 0.035 * Math.sin(a * 8) * Math.sin(t) : 1;
      const copete = peinado === 'corto' || peinado === 'raya'
        ? (peinado === 'corto' ? 0.027 : 0.011) * Math.exp(-((t - 0.7) ** 2) / 0.23) * Math.max(0, frente - lado * 0.34) ** 2
        : 0;
      puntos.push(
        0.126 * lado * Math.sin(t) * onda + copete * 0.18,
        0.006 + 0.14 * Math.cos(t) * onda + copete,
        0.126 * frente * Math.sin(t) * onda + copete * 0.45,
      );
      if (i === filas) continue;
      const k = i * lados + j;
      const v = i * lados + (j + 1) % lados;
      caras.push(k, k + lados, v, v, k + lados, v + lados);
    }
  }
  return superficie(puntos, caras);
}

function barba() {
  const puntos: number[] = [];
  const caras: number[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = (i - 10) / 10;
    const x = t * 0.106;
    const linea = -0.077 + 0.089 * Math.abs(t) ** 2.6;
    const base = -0.127 + 0.102 * Math.abs(t) ** 1.65;
    for (let j = 0; j <= 3; j++) {
      const y = base + (linea - base) * j / 3;
      const r = anchoCara(y / B) * Math.sqrt(1 - (y / B) ** 2);
      puntos.push(...puntoCara(Math.sign(x) * Math.min(Math.abs(x), r * 0.998), y, 0.005 + 0.003 * Math.sin(j / 3 * Math.PI)).toArray());
      const k = i * 4 + j;
      if (i < 20 && j < 3) caras.push(k, k + 4, k + 1, k + 1, k + 4, k + 5);
    }
  }
  return superficie(puntos, caras);
}

export function armarCara(cabeza: Group, c: Colores, peinado: Peinado, conBarba = false) {
  const piel = materialPersonaje(c.piel, 'piel');
  piel.vertexColors = true;
  const pelo = new MeshPhongMaterial({ color: c.pelo, shininess: 22, specular: '#2e2721' });
  pelo.name = 'pelo';
  const iris = materialPersonaje(c.ojos, 'ojos');
  const bebe = peinado === 'bebe';
  malla(cabeza, CARA, piel);
  for (const lado of [-1, 1]) {
    malla(cabeza, DETALLE, piel, { pos: [lado * 0.115, -0.013, 0.007], esc: [0.022, 0.035, 0.022], rot: [0, 0, lado * -0.19] });
  }
  malla(cabeza, DETALLE, piel, { pos: [0, -0.012, 0.116], esc: [0.013, 0.023, 0.013] });
  malla(cabeza, DETALLE, piel, { pos: [0, -0.024, 0.123], esc: [0.016, 0.013, 0.016] });

  if (bebe) {
    malla(cabeza, VOLUMEN, pelo, { pos: [-0.012, 0.119, 0.044], esc: [0.043, 0.019, 0.037], rot: [0.25, -0.24, -0.31] });
    malla(cabeza, DETALLE, pelo, { pos: [0.022, 0.122, 0.043], esc: [0.027, 0.015, 0.027], rot: [0, 0, 0.48] });
  } else {
    malla(cabeza, casquete(peinado), pelo);
    if (peinado === 'largo' || peinado === 'melena') {
      // Flequillo diagonal y volumen detrás de la nuca.
      malla(cabeza, VOLUMEN, pelo, { pos: [-0.033, 0.092, 0.068], esc: [0.087, 0.045, 0.051], rot: [0.18, -0.32, 0.35] });
      if (peinado === 'largo') {
        malla(cabeza, VOLUMEN, pelo, { pos: [0.052, -0.135, -0.091], esc: [0.068, 0.115, 0.058], rot: [0.29, 0, 0.18] });
      } else {
        for (const lado of [-1, 1]) {
          malla(cabeza, VOLUMEN, pelo, { pos: [lado * 0.078, -0.115, -0.058], esc: [0.054, 0.092, 0.061], rot: [0.15, 0, lado * 0.16] });
        }
      }
    } else if (peinado === 'rulos') {
      for (let j = 0; j < 7; j++) {
        const a = j * Math.PI * 2 / 7;
        malla(cabeza, DETALLE, pelo, {
          pos: [0.082 * Math.sin(a), 0.102 + 0.018 * Math.sin(a * 2), 0.078 * Math.cos(a)],
          esc: [0.045, 0.041, 0.05],
        });
      }
    } else if (peinado === 'corto') {
      // Dos ondas en el frente, hundidas en el volumen base del pelo.
      malla(cabeza, VOLUMEN, pelo, { pos: [-0.034, 0.112, 0.071], esc: [0.067, 0.038, 0.048], rot: [0.22, -0.1, 0.52] });
      malla(cabeza, DETALLE, pelo, { pos: [-0.065, 0.108, 0.065], esc: [0.042, 0.03, 0.043], rot: [0.29, 0.12, 0.6] });
    }
  }
  if (conBarba) malla(cabeza, barba(), pelo);

  const ojos = new Group();
  ojos.position.y = 0.014;
  cabeza.add(ojos);
  const blanco = materialPersonaje('#f9f1e7');
  const pupila = materialPersonaje('#291e21');
  const brillo = materialPersonaje('#ffffff');
  for (const lado of [-1, 1]) {
    const x = lado * 0.045;
    const p = puntoCara(x, ojos.position.y, -0.004);
    const tam = bebe ? 1.11 : 1;
    const yOrientacion = lado * 0.3;
    malla(ojos, DETALLE, blanco, { pos: [x, 0, p.z], esc: [0.018 * tam, 0.017 * tam, 0.008], rot: [0, yOrientacion, 0] });
    malla(ojos, DETALLE, iris, { pos: [x - lado * 0.001, 0, p.z + 0.007], esc: [0.012 * tam, 0.014 * tam, 0.0038] });
    malla(ojos, DETALLE, pupila, { pos: [x - lado * 0.001, 0.001, p.z + 0.010], esc: [0.008 * tam, 0.011 * tam, 0.002] });
    malla(ojos, PUNTO, brillo, { pos: [x - 0.003, 0.006, p.z + 0.0118], esc: [0.0034, 0.0034, 0.0017] });
    const ceja = [[0.025, 0.045], [0.042, 0.052], [0.057, 0.051], [0.065, 0.045]].map(([xx, yy]) => puntoCara(lado * xx, yy, 0.006).toArray() as Punto);
    malla(cabeza, linea(ceja, bebe ? 0.003 : 0.0045, 6), pelo);
  }

  const sonreir = (ancho: number, y: number, curva: number) =>
    [-1, -0.5, 0, 0.5, 1].map((t) => puntoCara(t * ancho, y + curva * t * t, 0.0048).toArray() as Punto);
  const sonrisa = new Group();
  cabeza.add(sonrisa);
  malla(sonrisa, linea(sonreir(0.028, -0.061, 0.014), 0.0055), '#b85e55');
  malla(sonrisa, linea(sonreir(0.028, -0.059, 0.014), 0.0034), '#662e33');
  const bocaAbierta = bebe
    ? malla(cabeza, DETALLE, '#662e33', { pos: puntoCara(0, -0.059, 0.003).toArray() as Punto, esc: [0.023, 0.02, 0.01] })
    : null;
  if (bocaAbierta) bocaAbierta.visible = false;

  fusionar(ojos, { colores: true });
  fusionar(sonrisa, { colores: true });
  fusionar(cabeza);

  let tiempo = 1 + Math.random() * 2;
  let llora = false;
  return {
    llorando(si: boolean) {
      llora = si;
      if (bocaAbierta) bocaAbierta.visible = si;
      sonrisa.visible = !si;
    },
    animar(dt: number) {
      tiempo = (tiempo + dt) % 4.6;
      const parpadeo = tiempo < 0.16 ? Math.sin(Math.PI * tiempo / 0.16) : 0;
      ojos.scale.y = (llora ? 0.48 : 1) * (1 - 0.92 * parpadeo);
    },
  };
}
