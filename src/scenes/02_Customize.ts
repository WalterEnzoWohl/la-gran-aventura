/**
 * 02 Personalización (unos 30 s): "Vos" y "Tu pareja" frente al jugador.
 * Nombres sorteados (con un dado para volver a sortear, sin teclado) y 5 muestras
 * de color por rasgo. Arranca con valores al azar: se puede tocar "¡Listo!" enseguida.
 *
 * Rendimiento: las 15 muestras de cada columna se dibujan con un InstancedMesh y
 * los textos fijos de la consola van en una sola textura (pocos draw calls).
 */
import {
  BoxGeometry, CanvasTexture, Color, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, MeshLambertMaterial,
  Object3D, PlaneGeometry, Quaternion, SRGBColorSpace, Vector3,
} from 'three';
import { PALETAS, type TraitKey } from '../content/config';
import { t } from '../content/textos';
import { crearBoton } from '../core/Button';
import type { Pokeable } from '../core/Interactable';
import { crearPersona, ROPA, tenir, type Persona } from '../game/characters';
import { crearHabitacion, planta, PARED_FONDO, cuadro } from '../game/escenarios';
import { sortearNombre, type Personaje } from '../game/GameState';
import { GEO, malla } from '../game/primitivas';
import { coloresPersonaje } from '../game/textoHerencia';
import { EscenaInicio } from './EscenaBase';

const MUESTRA = 0.05;
const SEPARACION = 0.008;
const RASGOS: TraitKey[] = ['pelo', 'piel', 'ojos'];
/** Consola: ancho, alto y centro vertical (coordenadas de la consola). */
const CONSOLA = { ancho: 0.68, alto: 0.5, centroY: -0.03 };
const X_COLUMNA = 0.165;

interface Muestra {
  poke: Pokeable;
  tapa: Object3D;
  x: number;
  y: number;
  color: Color;
}

const _m = new Matrix4();
const _p = new Vector3();
const _q = new Quaternion();
const _s = new Vector3(MUESTRA, MUESTRA, 0.02);
const _c = new Color();
const BLANCO = new Color('#ffffff');

export class Customize extends EscenaInicio {
  readonly id = 'personalizacion';
  private listo = false;
  private botonListo!: ReturnType<typeof crearBoton>;
  private fondoConsola!: { canvas: HTMLCanvasElement; textura: CanvasTexture };
  private columnas: { instancias: InstancedMesh; muestras: Muestra[] }[] = [];

  protected construir(): void {
    const piso = this.juego.pisoY;
    crearHabitacion(this.raiz, piso, { piso: '#d9c9b0', pared: '#e8eef5', zocalo: '#c9d3df' });
    cuadro(this.raiz, -1.3, piso + 1.6, PARED_FONDO, '#f2b880');
    planta(this.raiz, 1.9, piso, -1.8);

    const { jugador, pareja } = this.juego.estado;
    this.juego.manos.setPiel(coloresPersonaje(jugador).piel);

    const consola = new Group();
    consola.position.set(0, -0.03, -0.46);
    consola.rotation.x = -0.6;
    this.raiz.add(consola);
    this.crearFondoConsola(consola);

    this.armarLado(jugador, -0.55, -X_COLUMNA, ROPA.jugador, 'corto', consola, true);
    this.armarLado(pareja, 0.55, X_COLUMNA, ROPA.pareja, 'largo', consola, false);
    this.dibujarConsola();

    this.botonListo = crearBoton(this.juego.inter, t('personalizacion.listo'), {
      ancho: 0.22,
      alto: 0.075,
      color: '#3aa76d',
      onPoke: () => (this.listo = true),
    });
    this.botonListo.grupo.position.set(0, -0.225, 0);
    consola.add(this.botonListo.grupo);

    this.juego.audio.musica('personalizacion');
  }

  private crearFondoConsola(consola: Group): void {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = Math.round((1024 * CONSOLA.alto) / CONSOLA.ancho);
    const textura = new CanvasTexture(canvas);
    textura.colorSpace = SRGBColorSpace;
    const plano = new Mesh(new PlaneGeometry(CONSOLA.ancho, CONSOLA.alto), new MeshBasicMaterial({ map: textura, toneMapped: false }));
    plano.position.set(0, CONSOLA.centroY, -0.034);
    consola.add(plano);
    this.fondoConsola = { canvas, textura };
  }

  /** Dibuja el fondo de la consola con los nombres y las etiquetas de los rasgos. */
  private dibujarConsola(): void {
    const { canvas, textura } = this.fondoConsola;
    const ctx = canvas.getContext('2d')!;
    const k = canvas.width / CONSOLA.ancho;
    const px = (x: number) => (x + CONSOLA.ancho / 2) * k;
    const py = (y: number) => (CONSOLA.centroY + CONSOLA.alto / 2 - y) * k;
    ctx.fillStyle = '#2b3242';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textBaseline = 'middle';
    const fuente = '"Segoe UI", Roboto, "Noto Sans", Arial, sans-serif';
    const { jugador, pareja } = this.juego.estado;
    for (const [lado, titulo, p] of [[-1, t('personalizacion.vos'), jugador], [1, t('personalizacion.pareja'), pareja]] as const) {
      const xc = lado * X_COLUMNA;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = `700 ${0.026 * k}px ${fuente}`;
      ctx.fillText(`${titulo}: ${p.nombre}`, px(xc), py(0.195));
      ctx.textAlign = 'left';
      ctx.fillStyle = '#dfe6f2';
      ctx.font = `600 ${0.02 * k}px ${fuente}`;
      RASGOS.forEach((rasgo, fila) => ctx.fillText(t(`personalizacion.${rasgo}`), px(xc - 0.14), py(0.068 - fila * 0.09)));
    }
    textura.needsUpdate = true;
  }

  /** Personaje grande a la distancia y su columna de controles en la consola. */
  private armarLado(
    p: Personaje,
    xPersonaje: number,
    xColumna: number,
    ropa: { ropa: string; pantalon: string },
    peinado: 'corto' | 'largo',
    consola: Group,
    esJugador: boolean,
  ): void {
    const piso = this.juego.pisoY;
    const persona: Persona = crearPersona({ edad: 'adulto', peinado, ...ropa, ...coloresPersonaje(p) });
    persona.grupo.position.set(xPersonaje, piso, -1.5);
    persona.grupo.rotation.y = -xPersonaje * 0.35;
    this.raiz.add(persona.grupo);

    const actualizar = () => {
      const c = coloresPersonaje(p);
      tenir(persona.grupo, c);
      if (esJugador) this.juego.manos.setPiel(c.piel);
    };

    const columna = new Group();
    columna.position.x = xColumna;
    consola.add(columna);

    // Botón con dado para sortear otro nombre.
    const dado = crearBoton(this.juego.inter, t('personalizacion.sortear'), {
      ancho: 0.2,
      alto: 0.055,
      color: '#6a5acd',
      tamanoTexto: 0.024,
      onPoke: () => {
        const otro = esJugador ? this.juego.estado.pareja.nombre : this.juego.estado.jugador.nombre;
        p.nombre = sortearNombre([p.nombre, otro]);
        this.dibujarConsola();
        this.juego.audio.sfx('pop');
      },
    });
    dado.grupo.position.set(0.035, 0.135, 0);
    columna.add(dado.grupo);
    const cubo = new Mesh(GEO.caja, new MeshLambertMaterial({ map: texturaDado() }));
    cubo.scale.setScalar(0.034);
    cubo.position.set(-0.13, 0, 0.015);
    cubo.rotation.set(0.4, 0.5, 0);
    dado.grupo.add(cubo);

    // Muestras de color: tocables individuales, dibujadas con un solo InstancedMesh.
    const instancias = new InstancedMesh(new BoxGeometry(1, 1, 1), new MeshLambertMaterial({ color: '#ffffff' }), 15);
    instancias.frustumCulled = false;
    columna.add(instancias);
    const muestras: Muestra[] = [];
    RASGOS.forEach((rasgo, fila) => {
      const y = 0.025 - fila * 0.09;
      const marco = malla(columna, GEO.caja, '#ffd166', { esc: [MUESTRA + 0.014, MUESTRA + 0.014, 0.008] });
      const ubicarMarco = () => marco.position.set(xMuestra(p[rasgo]), y, -0.03);
      PALETAS[rasgo].forEach((op, i) => {
        const g = new Group();
        g.position.set(xMuestra(i), y, 0);
        const tapa = new Object3D();
        g.add(tapa);
        columna.add(g);
        const poke = this.juego.inter.addPokeable(g, {
          ancho: MUESTRA,
          alto: MUESTRA,
          tapa,
          onPoke: () => {
            p[rasgo] = i;
            ubicarMarco();
            actualizar();
          },
        });
        muestras.push({ poke, tapa, x: g.position.x, y, color: new Color(op.color) });
      });
      ubicarMarco();
    });
    this.columnas.push({ instancias, muestras });
  }

  /** Mueve y aclara las muestras según el hundimiento y la cercanía del dedo. */
  protected tick(): void {
    for (const { instancias, muestras } of this.columnas) {
      muestras.forEach((m, i) => {
        _p.set(m.x, m.y, m.tapa.position.z - 0.01);
        _m.compose(_p, _q, _s);
        instancias.setMatrixAt(i, _m);
        instancias.setColorAt(i, _c.copy(m.color).lerp(BLANCO, m.poke.cerca ? 0.3 : 0));
      });
      instancias.instanceMatrix.needsUpdate = true;
      if (instancias.instanceColor) instancias.instanceColor.needsUpdate = true;
    }
  }

  protected async guion(): Promise<void> {
    await this.correr({
      id: 'personalizacion',
      pasos: [
        {
          id: 'listo',
          objetivo: t('personalizacion.objetivo'),
          pista: { tipo: 'tocar', objetivo: this.botonListo.grupo },
          completo: () => this.listo,
          autocompletar: () => (this.listo = true),
        },
      ],
    });
    this.terminar();
  }
}

function xMuestra(i: number): number {
  return (i - 2) * (MUESTRA + SEPARACION);
}

/** Cara de dado (cinco puntos) para todas las caras del cubo. */
function texturaDado(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#1d2433';
  for (const [x, y] of [[16, 16], [48, 16], [32, 32], [16, 48], [48, 48]]) {
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}
