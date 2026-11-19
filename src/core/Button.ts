/**
 * Botón 3D: una tapa de color que se hunde con el índice, con su texto encima.
 * La cara frontal queda en z = 0 del grupo, mirando hacia +z.
 */
import { BoxGeometry, Group, Mesh, MeshLambertMaterial } from 'three';
import type { Interactables, Pokeable } from './Interactable';
import type { ManoEstado } from './HandTracker';
import { TextPanel } from './TextPanel';

export interface BotonOpciones {
  /** Ancho y alto (m). Mínimo 5 × 5 cm. */
  ancho?: number;
  alto?: number;
  color?: string;
  colorTexto?: string;
  tamanoTexto?: number;
  onPoke: (mano: ManoEstado) => void;
}

const CAJA = new BoxGeometry(1, 1, 1);
CAJA.userData.compartida = true;
const MAT_BASE = new MeshLambertMaterial({ color: 0x2b2f3a });
MAT_BASE.userData.compartido = true;

export interface Boton {
  grupo: Group;
  poke: Pokeable;
  texto: TextPanel | null;
}

export function crearBoton(inter: Interactables, etiqueta: string, o: BotonOpciones): Boton {
  const ancho = Math.max(0.05, o.ancho ?? 0.22);
  const alto = Math.max(0.05, o.alto ?? 0.08);
  const grupo = new Group();
  grupo.name = 'boton:' + etiqueta;

  const base = new Mesh(CAJA, MAT_BASE);
  base.scale.set(ancho + 0.012, alto + 0.012, 0.012);
  base.position.z = -0.026;
  grupo.add(base);

  const tapa = new Group();
  const cuerpo = new Mesh(CAJA, new MeshLambertMaterial({ color: o.color ?? '#2f7de1' }));
  cuerpo.scale.set(ancho, alto, 0.02);
  cuerpo.position.z = -0.01;
  tapa.add(cuerpo);

  let texto: TextPanel | null = null;
  if (etiqueta) {
    texto = new TextPanel(etiqueta, {
      ancho: ancho * 0.94,
      tamano: o.tamanoTexto ?? Math.min(0.035, alto * 0.42),
      color: o.colorTexto ?? '#ffffff',
      fondo: null,
      negrita: true,
      padding: 0.004,
    });
    texto.position.z = 0.001;
    texto.userData.sinBrillo = true;
    tapa.add(texto);
  }
  grupo.add(tapa);

  const poke = inter.addPokeable(grupo, { ancho, alto, tapa, onPoke: o.onPoke });
  return { grupo, poke, texto };
}
