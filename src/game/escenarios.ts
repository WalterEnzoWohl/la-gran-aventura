/**
 * Escenarios y muebles de Kenney con primitivas de respaldo.
 * Convención: coordenadas de la estación (origen a la altura del pecho, debajo de
 * la cabeza; adelante es -z). Los muebles reciben `piso` (y del piso) y la altura
 * de su superficie: las patas se estiran hasta el piso, así lo interactivo queda
 * a la altura del pecho tanto sentado como parado.
 */
import { Box3, CanvasTexture, Group, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, SRGBColorSpace, Vector3 } from 'three';
import type { AssetLoader } from '../core/AssetLoader';
import { GEO, malla } from './primitivas';

/** z para colgar detalles, 2 cm delante de la pared del fondo. */
export const PARED_FONDO = -2.33;

export interface ColoresHabitacion {
  piso: string;
  pared: string;
  zocalo?: string;
}

/** Centra un mueble en X/Z y ajusta su base a Y, sin mover los objetos interactivos. */
export function mueble(
  assets: AssetLoader, padre: Object3D, nombre: string,
  x: number, y: number, z: number, ancho: number, alto: number, fondo: number,
): Object3D | null {
  if (alto <= 0 || !assets.tiene(nombre)) return null;
  const modelo = assets.modelo(nombre, () => new Group());
  const caja = new Box3().setFromObject(modelo, true);
  const tam = caja.getSize(new Vector3());
  if (tam.x <= 0 || tam.y <= 0 || tam.z <= 0) return null;
  const centro = caja.getCenter(new Vector3());
  modelo.scale.set(ancho / tam.x, alto / tam.y, fondo / tam.z);
  modelo.position.set(x - centro.x * modelo.scale.x, y - caja.min.y * modelo.scale.y, z - centro.z * modelo.scale.z);
  padre.add(modelo);
  return modelo;
}

/** Piso y cuatro paredes alrededor del jugador. */
export function crearHabitacion(padre: Object3D, piso: number, c: ColoresHabitacion, ancho = 5, fondo = 4.4): Group {
  const g = new Group();
  padre.add(g);
  const alto = 2.7;
  malla(g, GEO.caja, c.piso, { pos: [0, piso - 0.05, -0.2], esc: [ancho, 0.1, fondo] });
  const y = piso + alto / 2;
  malla(g, GEO.caja, c.pared, { pos: [0, y, -fondo / 2 - 0.2], esc: [ancho, alto, 0.1] });
  malla(g, GEO.caja, c.pared, { pos: [0, y, fondo / 2 - 0.2], esc: [ancho, alto, 0.1] });
  // Los laterales terminan contra las otras paredes, sin solaparse en las esquinas.
  malla(g, GEO.caja, c.pared, { pos: [-ancho / 2, y, -0.2], esc: [0.1, alto, fondo - 0.1] });
  malla(g, GEO.caja, c.pared, { pos: [ancho / 2, y, -0.2], esc: [0.1, alto, fondo - 0.1] });
  if (c.zocalo) malla(g, GEO.caja, c.zocalo, { pos: [0, piso + 0.045, -fondo / 2 - 0.14], esc: [ancho - 0.102, 0.1, 0.03] });
  return g;
}

export function ventana(padre: Object3D, x: number, y: number, z: number, ancho = 1.1, alto = 0.9): Group {
  const g = new Group();
  g.position.set(x, y, z);
  padre.add(g);
  malla(g, GEO.caja, '#ffffff', { esc: [ancho + 0.1, alto + 0.1, 0.04] });
  malla(g, GEO.caja, '#bfe3f7', { pos: [0, 0, 0.022], esc: [ancho, alto, 0.01] });
  const barra = 0.03;
  const tramo = (ancho - barra) / 2 - 0.002;
  const frente = 0.031;
  malla(g, GEO.caja, '#ffffff', { pos: [0, 0, frente], esc: [barra, alto - 0.004, 0.014] });
  // Cada tramo termina en el montante vertical. Así se ve una cruz sin caras duplicadas.
  for (const lado of [-1, 1]) {
    malla(g, GEO.caja, '#ffffff', { pos: [lado * (tramo + barra) / 2, 0, frente], esc: [tramo, barra, 0.014] });
  }
  return g;
}

export function planta(assets: AssetLoader, padre: Object3D, x: number, piso: number, z: number): void {
  if (mueble(assets, padre, 'pottedPlant', x, piso, z, 0.38, 0.8, 0.41)) return;
  malla(padre, GEO.cilindro, '#c46a43', { pos: [x, piso + 0.15, z], esc: [0.14, 0.3, 0.14] });
  malla(padre, GEO.esfera, '#4f9a55', { pos: [x, piso + 0.5, z], esc: [0.25, 0.3, 0.25] });
  malla(padre, GEO.esfera, '#5fb066', { pos: [x + 0.08, piso + 0.68, z], esc: 0.15 });
}

/** Mesa rectangular con su tapa a la altura `alto` (en coordenadas de la estación). */
export function mesa(
  assets: AssetLoader, padre: Object3D, piso: number, alto: number, x: number, z: number,
  ancho: number, fondo: number, color = '#c8996b', modelo = 'table',
): Group {
  const g = new Group();
  padre.add(g);
  if (mueble(assets, g, modelo, x, piso, z, ancho, alto - piso, fondo)) return g;
  malla(g, GEO.caja, color, { pos: [x, alto - 0.02, z], esc: [ancho, 0.04, fondo] });
  const h = alto - 0.04 - piso;
  if (h > 0.02) {
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
      malla(g, GEO.caja, '#8b6142', { pos: [x + dx * (ancho / 2 - 0.027), piso + h / 2, z + dz * (fondo / 2 - 0.027)], esc: [0.05, h, 0.05] });
    }
  }
  return g;
}

/** Cuna: colchón con su superficie en `alto`. Devuelve el grupo. */
export function cuna(padre: Object3D, piso: number, alto: number, x: number, z: number): Group {
  const g = new Group();
  padre.add(g);
  const ancho = 0.7;
  const fondo = 0.42;
  malla(g, GEO.redondeada, '#ffffff', { pos: [x, alto - 0.04, z], esc: [ancho, 0.08, fondo] });
  malla(g, GEO.caja, '#e9dcc6', { pos: [x, alto - 0.1, z], esc: [ancho + 0.04, 0.04, fondo + 0.04] });
  // Barrotes atrás y a los lados (adelante queda libre para alcanzar al bebé).
  malla(g, GEO.caja, '#f2e6d0', { pos: [x, alto + 0.12, z - fondo / 2 - 0.01], esc: [ancho + 0.04, 0.03, 0.03] });
  for (let i = 0; i <= 8; i++) {
    malla(g, GEO.cilindro, '#f2e6d0', { pos: [x - ancho / 2 + (i * ancho) / 8, alto + 0.04, z - fondo / 2 - 0.01], esc: [0.01, 0.16, 0.01] });
  }
  for (const dx of [-1, 1]) {
    malla(g, GEO.caja, '#f2e6d0', { pos: [x + dx * (ancho / 2 + 0.01), alto + 0.04, z], esc: [0.03, 0.2, fondo + 0.04] });
  }
  const h = alto - 0.12 - piso;
  if (h > 0.02) {
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
      malla(g, GEO.caja, '#d8c7a8', { pos: [x + dx * (ancho / 2), piso + h / 2, z + dz * (fondo / 2)], esc: [0.04, h, 0.04] });
    }
  }
  return g;
}

export function sofa(assets: AssetLoader, padre: Object3D, piso: number, asiento: number, x: number, z: number, color = '#7a8fb8'): Group {
  const g = new Group();
  padre.add(g);
  const base = asiento - piso;
  // El asiento del GLB está a 0,23 m y el respaldo a 0,4 m.
  if (mueble(assets, g, 'loungeDesignSofa', x, piso, z, 1.6, base * 0.4 / 0.23, 0.7)) return g;
  malla(g, GEO.caja, color, { pos: [x, piso + base / 2, z], esc: [1.6, base, 0.7] });
  malla(g, GEO.caja, color, { pos: [x, asiento + 0.3, z - 0.3], esc: [1.59, 0.6, 0.15] });
  for (const dx of [-1, 1]) malla(g, GEO.caja, color, { pos: [x + dx * 0.78, asiento + 0.12, z], esc: [0.16, 0.3, 0.68] });
  malla(g, GEO.caja, '#f2d388', { pos: [x - 0.45, asiento + 0.15, z - 0.18], esc: [0.3, 0.3, 0.1], rot: [0.2, 0, 0.1] });
  return g;
}

export function tacho(padre: Object3D, piso: number, boca: number, x: number, z: number): Group {
  const g = new Group();
  padre.add(g);
  const h = boca - piso;
  const radio = 0.105;
  malla(g, GEO.cilindro, '#6c9a8b', { pos: [x, piso + h / 2, z], esc: [radio, h, radio] });
  malla(g, GEO.cilindro, '#2f3b38', { pos: [x, boca + 0.002, z], esc: [radio * 0.89, 0.005, radio * 0.89] });
  malla(g, GEO.aro, '#4f7b6d', { pos: [x, boca, z], esc: radio, rot: [Math.PI / 2, 0, 0] });
  return g;
}

/** Cama a lo largo de z (cabecera hacia -z). La manta va de `mantaDesde` a `mantaHasta` (z local). */
export function cama(
  assets: AssetLoader, padre: Object3D, piso: number, colchon: number, x: number, z: number, colorManta = '#7fb3e0',
  mantaDesde = -0.4, mantaHasta = 0.9,
): void {
  const g = new Group();
  padre.add(g);
  const h = colchon - piso;
  // Ajustar al colchón (0,225 m en el GLB) y conservar la manta que tapa solo las piernas.
  const modelo = mueble(assets, g, 'bedSingle', x, piso, z, 1.0, h * 0.375 / 0.225, 1.9);
  if (modelo) {
    const cubierta = modelo.getObjectByName('cover');
    cubierta?.removeFromParent();
  } else {
    malla(g, GEO.caja, '#a07650', { pos: [x, piso + h / 2 - 0.05, z], esc: [1.0, h - 0.1, 1.9] });
    malla(g, GEO.caja, '#fafafa', { pos: [x, colchon - 0.06, z], esc: [0.95, 0.12, 1.85] });
    malla(g, GEO.caja, '#a07650', { pos: [x, colchon + 0.2, z - 0.97], esc: [0.99, 0.9, 0.06] });
    malla(g, GEO.caja, '#ffffff', { pos: [x, colchon + 0.04, z - 0.75], esc: [0.6, 0.1, 0.3] });
  }
  // Edredón grueso: tapa las piernas de quien está acostado.
  malla(g, GEO.redondeada, colorManta, { pos: [x, colchon + 0.125, z + (mantaDesde + mantaHasta) / 2], esc: [0.97, 0.25, mantaHasta - mantaDesde] });
}

/** Reloj de pared con números; `poner(minutos)` mueve las agujas. */
export function relojPared(padre: Object3D, x: number, y: number, z: number, radio = 0.22): { grupo: Group; poner(minutos: number): void } {
  const g = new Group();
  g.position.set(x, y, z);
  padre.add(g);
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(128, 128, 124, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#2b2b33';
  ctx.stroke();
  ctx.fillStyle = '#2b2b33';
  ctx.font = '700 34px "Segoe UI", Roboto, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let h = 1; h <= 12; h++) {
    const a = (h / 12) * Math.PI * 2;
    ctx.fillText(String(h), 128 + Math.sin(a) * 95, 128 - Math.cos(a) * 95);
  }
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  const cara = new Mesh(new PlaneGeometry(radio * 2, radio * 2), new MeshBasicMaterial({ map: tex, transparent: true }));
  g.add(cara);
  const horaria = new Group();
  const minutera = new Group();
  g.add(horaria, minutera);
  malla(horaria, GEO.caja, '#2b2b33', { pos: [0, radio * 0.25, 0.01], esc: [0.016, radio * 0.5, 0.01] });
  malla(minutera, GEO.caja, '#d94b4b', { pos: [0, radio * 0.37, 0.015], esc: [0.01, radio * 0.75, 0.01] });
  malla(g, GEO.cilindro, '#2b2b33', { pos: [0, 0, 0.02], esc: [0.015, 0.01, 0.015], rot: [Math.PI / 2, 0, 0] });
  return {
    grupo: g,
    poner(minutos: number) {
      minutera.rotation.z = -((minutos % 60) / 60) * Math.PI * 2;
      horaria.rotation.z = -(((minutos / 60) % 12) / 12) * Math.PI * 2;
    },
  };
}

/** Cuadro decorativo en la pared. */
export function cuadro(padre: Object3D, x: number, y: number, z: number, color: string, ancho = 0.5, alto = 0.4): void {
  malla(padre, GEO.caja, '#8b6142', { pos: [x, y, z], esc: [ancho + 0.06, alto + 0.06, 0.03] });
  malla(padre, GEO.caja, color, { pos: [x, y, z + 0.016], esc: [ancho, alto, 0.01] });
}
