/**
 * 06 Etapa adolescente, 16 años (2 min).
 *  1. Afeitada: la espuma ya está puesta; agarrar la máquina y seguir 2 trazos con flechas
 *     (se avanza mientras la máquina esté a menos de 4 cm del trazo).
 *  2. Crema: agarrar el pomo (la crema aparece en la punta del índice) y tocar 2 granitos.
 *  3. Cine: agarrar las llaves del perchero; fundido; puerta del cine con luces.
 *     "¿Y si no le gusto?": elegir un consejo; el hijo responde, camina hacia la cita,
 *     se da vuelta y saluda.
 * El hijo está sentado de frente (sin espejo real, para ahorrar rendimiento).
 */
import { Color, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { CONFIG, NOMBRES_BEBE, PALETAS } from '../content/config';
import { t, TEXTOS } from '../content/textos';
import { crearBoton } from '../core/Button';
import { PathFollower } from '../core/Gestures';
import type { ManoEstado } from '../core/HandTracker';
import type { Grabbable } from '../core/Interactable';
import { TextPanel } from '../core/TextPanel';
import { ease } from '../core/Tweens';
import { crearPersona, ROPA, type Persona } from '../game/characters';
import { crearHabitacion, mesa, mueble, PARED_FONDO, planta } from '../game/escenarios';
import { pick } from '../game/GameState';
import { heredar } from '../game/inheritance';
import { crearLlaves, crearMaquina, crearPomo } from '../game/objetos';
import { GEO, malla } from '../game/primitivas';
import { coloresHijo } from '../game/textoHerencia';
import { EscenaEtapa } from './EscenaBase';

/** Centro de la cabeza del hijo en el baño: al alcance, a la altura del pecho. */
const CABEZA_BANO = new Vector3(0, 0.06, -0.5);
const _v = new Vector3();
const _m = new Matrix4();

interface Trazo {
  /** Puntos en coordenadas de la cabeza. */
  locales: Vector3[];
  seguidor: PathFollower;
  espuma: Mesh[];
  flechas: Mesh[];
}

/** Punto sobre la superficie de la cara (elipsoide de la cabeza), un poco hacia afuera. */
function sobreLaCara(x: number, y: number, afuera = 0.006): Vector3 {
  const k = 1 - (x / 0.12) ** 2 - (y / 0.13) ** 2;
  return new Vector3(x, y, 0.12 * Math.sqrt(Math.max(0.05, k)) + afuera);
}

export class Teen extends EscenaEtapa {
  readonly id = 'adolescente';
  private bano = new Group();
  private entrada = new Group();
  private cine = new Group();
  private tiempo = 0;

  // Baño
  private hijoBano!: Persona;
  private maquina!: ReturnType<typeof crearMaquina>;
  private agarreMaquina!: Grabbable;
  private trazos: Trazo[] = [];
  private trazoActual = -1;
  private espumaMenton: Mesh[] = [];
  private pararMaquina: (() => void) | null = null;
  private pomo!: Group;
  private manoCrema: ManoEstado | null = null;
  private cremaAuto = false;
  private gotaCrema!: Mesh;
  private granitos: Mesh[] = [];
  private granitosTratados = new Set<number>();

  // Entrada
  private llaves!: Group;
  private llavesAgarradas = false;
  private hijoEntrada!: Persona;

  // Cine
  private hijoCine!: Persona;
  private cita: Persona | null = null;
  private tarjetas: ReturnType<typeof crearBoton>[] = [];
  private consejo: number | null = null;
  private focos!: InstancedMesh;

  protected construir(): void {
    const { estado } = this.juego;
    if (!estado.hijo) {
      estado.hijo = heredar(estado.jugador, estado.pareja, PALETAS);
      estado.nombreHijo = pick(NOMBRES_BEBE);
    }
    this.raiz.add(this.bano, this.entrada, this.cine);
    this.entrada.visible = this.cine.visible = false;
    const piso = this.juego.pisoY;
    this.armarBano(piso);
    this.armarEntrada(piso);
    this.armarCine(piso);
    this.juego.audio.musica('adolescente');
  }

  private hijo(pose: 'parado' | 'sentado'): Persona {
    return crearPersona({ edad: 'dieciseis', peinado: 'corto', ...ROPA.dieciseis, ...coloresHijo(this.juego.estado.hijo!), pose });
  }

  // ── Baño ──
  private armarBano(piso: number): void {
    const g = this.bano;
    crearHabitacion(g, piso, { piso: '#d5dde3', pared: '#cfe8ef', zocalo: '#a9c6d1' });
    // Azulejos y espejo decorativo (sin reflejo).
    malla(g, GEO.caja, '#e7f3f6', { pos: [0, piso + 0.6, PARED_FONDO + 0.01], esc: [4.8, 1.2, 0.02] });
    if (!mueble(this.juego.assets, g, 'bathroomMirror', -0.9, 0.15, PARED_FONDO + 0.04, 0.5, 0.6, 0.06)) {
      malla(g, GEO.caja, '#9fb8c4', { pos: [-0.9, 0.45, PARED_FONDO + 0.02], esc: [0.7, 0.6, 0.02] });
    }
    planta(this.juego.assets, g, 1.9, piso, -1.7);

    // El hijo sentado, con la cara al alcance y la cabeza un poco levantada hacia el jugador.
    this.hijoBano = this.hijo('sentado');
    this.hijoBano.cabeza.rotation.x = -0.35;
    g.add(this.hijoBano.grupo);
    this.raiz.updateMatrixWorld(true);
    const cabezaLocal = this.raiz.worldToLocal(this.hijoBano.cabeza.getWorldPosition(new Vector3()));
    this.hijoBano.grupo.position.add(CABEZA_BANO.clone().sub(cabezaLocal));
    const cadera = this.hijoBano.grupo.position.y + 0.48 * 0.97;
    malla(g, GEO.cilindro, '#8a9ba8', { pos: [0, (piso + cadera) / 2 - 0.02, -0.65], esc: [0.17, cadera - piso - 0.04, 0.17] });

    // Mesada con la máquina y el pomo, a la derecha.
    mesa(this.juego.assets, g, piso, -0.12, 0.33, -0.36, 0.34, 0.3, '#f4f4f4', 'sideTable');
    this.maquina = crearMaquina();
    this.juego.assets.vestir(this.maquina.grupo, 'maquina');
    this.maquina.grupo.position.set(0.27, -0.12 + 0.07, -0.38);
    g.add(this.maquina.grupo);
    this.agarreMaquina = this.juego.inter.addGrabbable(this.maquina.grupo, {
      radio: 0.08,
      onAgarrar: () => {
        if (!this.pararMaquina) this.pararMaquina = this.juego.audio.iniciarBucle('maquina');
      },
      onSoltar: () => {
        this.pararMaquina?.();
        this.pararMaquina = null;
        return false;
      },
    });
    this.pomo = this.juego.assets.vestir(crearPomo(), 'pomo');
    this.pomo.position.set(0.4, -0.12 + 0.05, -0.3);
    g.add(this.pomo);

    // Espuma y flechas de los dos trazos (mejilla izquierda y derecha), de arriba hacia abajo.
    const cab = this.hijoBano.cabeza;
    for (const lado of [-1, 1]) {
      const locales = [0, 1, 2, 3, 4, 5].map((i) => sobreLaCara(lado * 0.07, 0.005 - i * 0.019));
      const espuma = locales.map((p) => malla(cab, GEO.esfera, '#ffffff', { pos: [p.x, p.y, p.z - 0.004], esc: [0.02, 0.016, 0.012] }));
      const flechas = locales.map((p) => {
        const f = malla(cab, GEO.cono, '#ffb703', { pos: [p.x * 1.05, p.y, p.z + 0.012], esc: [0.008, 0.014, 0.008], rot: [Math.PI, 0, 0] });
        f.visible = false;
        return f;
      });
      this.trazos.push({ locales, seguidor: new PathFollower([], 0.04), espuma, flechas });
    }
    for (const x of [-0.025, 0.025]) {
      const p = sobreLaCara(x, -0.1);
      this.espumaMenton.push(malla(cab, GEO.esfera, '#ffffff', { pos: [p.x, p.y, p.z - 0.004], esc: [0.022, 0.016, 0.012] }));
    }
    // Granitos en los cachetes: quedan a la vista después de la afeitada (el pelo no los tapa).
    for (const [x, y] of [[-0.06, -0.028], [0.058, -0.048]]) {
      const p = sobreLaCara(x, y, 0.002);
      this.granitos.push(malla(cab, GEO.esfera, '#e05a5a', { pos: [p.x, p.y, p.z], esc: 0.009 }));
    }

    // Gotita de crema que aparece en la punta del índice.
    this.gotaCrema = malla(this.raiz, GEO.esfera, '#fffaf0', { esc: 0.012 });
    this.gotaCrema.visible = false;
  }

  private puntosMundo(tr: Trazo): Vector3[] {
    return tr.locales.map((p) => this.hijoBano.cabeza.localToWorld(p.clone()));
  }

  private empezarTrazo(i: number): void {
    this.trazoActual = i;
    const tr = this.trazos[i];
    tr.seguidor.puntos = this.puntosMundo(tr);
    tr.flechas.forEach((f, k) => (f.visible = k >= tr.seguidor.siguiente));
  }

  private terminarTrazo(i: number): void {
    const tr = this.trazos[i];
    tr.seguidor.terminar();
    tr.espuma.forEach((e) => (e.visible = false));
    tr.flechas.forEach((f) => (f.visible = false));
  }

  private ponerCrema(mano: ManoEstado | null): void {
    if (this.manoCrema || this.cremaAuto) return;
    if (mano) this.manoCrema = mano;
    else this.cremaAuto = true;
    this.juego.audio.sfx('crema');
    this.pomo.visible = false;
  }

  private tratarGranito(i: number): void {
    if (this.granitosTratados.has(i)) return;
    this.granitosTratados.add(i);
    this.granitos[i].material = this.gotaCrema.material;
    this.granitos[i].scale.setScalar(0.013);
    this.juego.audio.sfx('crema');
  }

  // ── Entrada ──
  private armarEntrada(piso: number): void {
    const g = this.entrada;
    crearHabitacion(g, piso, { piso: '#b98a5e', pared: '#efe2cf', zocalo: '#cdb79a' });
    // Puerta de calle.
    malla(g, GEO.caja, '#7a4e2d', { pos: [0.6, piso + 1.05, PARED_FONDO + 0.03], esc: [0.95, 2.1, 0.05] });
    malla(g, GEO.esfera, '#d4af37', { pos: [0.25, piso + 1.0, PARED_FONDO + 0.07], esc: 0.03 });
    // Perchero al alcance, a la izquierda.
    // El gancho hacia el jugador está a 0,668 m en el modelo original.
    if (!mueble(this.juego.assets, g, 'coatRackStanding', -0.3, piso, -0.55, 0.27, (0.12 - piso) * 0.77 / 0.668, 0.27)) {
      malla(g, GEO.cilindro, '#5c3b22', { pos: [-0.3, (piso + 0.25) / 2, -0.55], esc: [0.02, 0.25 - piso, 0.02] });
      malla(g, GEO.cilindro, '#5c3b22', { pos: [-0.3, 0.13, -0.47], esc: [0.01, 0.12, 0.01], rot: [Math.PI / 2, 0, 0] });
    }
    this.llaves = this.juego.assets.vestir(crearLlaves(), 'llaves');
    this.llaves.position.set(-0.3, 0.07, -0.42);
    g.add(this.llaves);
    this.hijoEntrada = this.hijo('parado');
    this.hijoEntrada.grupo.position.set(0.25, piso, -1.4);
    this.hijoEntrada.grupo.rotation.y = -0.3;
    g.add(this.hijoEntrada.grupo);
  }

  // ── Cine ──
  private armarCine(piso: number): void {
    const g = this.cine;
    malla(g, GEO.caja, '#3a3f4a', { pos: [0, piso - 0.05, -2], esc: [12, 0.1, 10] });
    malla(g, GEO.caja, '#5a606b', { pos: [0, piso + 0.01, -3.2], esc: [8, 0.02, 2.2] });
    // Fachada del cine con la puerta y las marquesinas.
    const fz = -4.3;
    malla(g, GEO.caja, '#5e3a57', { pos: [0, piso + 2, fz], esc: [7, 4, 0.3] });
    malla(g, GEO.caja, '#141414', { pos: [0, piso + 1.1, fz + 0.16], esc: [1.3, 2.2, 0.04] });
    malla(g, GEO.caja, '#2b1d2b', { pos: [0, piso + 2.65, fz + 0.3], esc: [2.6, 0.6, 0.3] });
    const cartel = new TextPanel(t('adolescente.cine'), { ancho: 2.3, tamano: 0.38, fondo: null, color: '#ffd166', negrita: true, padding: 0.02 });
    cartel.position.set(0, piso + 2.65, fz + 0.46);
    g.add(cartel);
    for (const [x, c] of [[-2.2, '#e76f51'], [2.2, '#2a9d8f']] as const) {
      malla(g, GEO.caja, '#f1faee', { pos: [x, piso + 1.4, fz + 0.16], esc: [0.95, 1.35, 0.03] });
      malla(g, GEO.caja, c, { pos: [x, piso + 1.4, fz + 0.18], esc: [0.85, 1.25, 0.02] });
    }
    // Focos de la marquesina: un solo InstancedMesh que "corre".
    const n = 26;
    this.focos = new InstancedMesh(GEO.esfera, new MeshBasicMaterial({ color: '#ffffff' }), n);
    for (let i = 0; i < n; i++) {
      const k = i / n;
      const borde = k < 0.5 ? [-1.3 + k * 2 * 2.6, piso + 2.98] : [1.3 - (k - 0.5) * 2 * 2.6, piso + 2.32];
      _m.makeScale(0.045, 0.045, 0.045).setPosition(borde[0], borde[1], fz + 0.47);
      this.focos.setMatrixAt(i, _m);
      this.focos.setColorAt(i, new Color('#ffe8a3'));
    }
    g.add(this.focos);
    // Faroles.
    for (const x of [-2.6, 2.6]) {
      malla(g, GEO.cilindro, '#2b2b33', { pos: [x, piso + 1.2, -2.6], esc: [0.04, 2.4, 0.04] });
      const luz = new Mesh(GEO.esfera, new MeshBasicMaterial({ color: '#fff3b0' }));
      luz.position.set(x, piso + 2.45, -2.6);
      luz.scale.setScalar(0.12);
      g.add(luz);
    }

    // El hijo a un costado, para no tapar el cartel del objetivo.
    this.hijoCine = this.hijo('parado');
    this.hijoCine.grupo.position.set(-0.42, piso, -1.1);
    this.hijoCine.grupo.rotation.y = 0.35;
    g.add(this.hijoCine.grupo);
    if (CONFIG.citaVisible) {
      const colores = { pelo: pick(PALETAS.pelo).color, piel: pick(PALETAS.piel).color, ojos: pick(PALETAS.ojos).color };
      this.cita = crearPersona({ edad: 'dieciseis', peinado: 'largo', ropa: '#9d4edd', pantalon: '#3c3c58', ...colores });
      this.cita.grupo.position.set(0.55, piso, -3.55);
      this.cita.grupo.rotation.y = -0.3;
      g.add(this.cita.grupo);
    }

    TEXTOS.adolescente.consejos.forEach((c, i) => {
      const b = crearBoton(this.juego.inter, c.texto, {
        ancho: 0.48,
        alto: 0.075,
        color: '#4361ee',
        tamanoTexto: 0.021,
        onPoke: () => this.elegirConsejo(i),
      });
      b.grupo.position.set(0.06, 0.08 - i * 0.09, -0.42);
      b.grupo.rotation.x = -0.4;
      b.grupo.visible = false;
      g.add(b.grupo);
      this.tarjetas.push(b);
    });
  }

  private elegirConsejo(i: number): void {
    if (this.consejo !== null) return;
    this.consejo = i;
  }

  private globoHijo(h: Persona): Vector3 {
    return this.raiz.worldToLocal(h.cabeza.getWorldPosition(new Vector3())).add(new Vector3(0.38, 0.12, 0.1));
  }

  /** El hijo camina hasta la puerta del cine, se da vuelta y saluda. */
  private async irAlCine(): Promise<void> {
    const h = this.hijoCine.grupo;
    const piso = this.juego.pisoY;
    const desde = h.position.clone();
    const hasta = new Vector3(0.05, piso, -3.4);
    const giro0 = h.rotation.y;
    await this.tweens.run(0.5, (k) => (h.rotation.y = giro0 + (Math.PI - giro0) * k));
    await this.tweens.run(3, (k) => {
      h.position.lerpVectors(desde, hasta, k);
      h.position.y = piso + Math.abs(Math.sin(k * Math.PI * 7)) * 0.025;
    }, ease.linear);
    await this.tweens.run(0.5, (k) => (h.rotation.y = Math.PI * (1 - k)));
    // Saludo con el brazo.
    const brazo = this.hijoCine.brazoDer;
    const base = brazo.rotation.z;
    await this.tweens.run(2.2, (k) => {
      const arriba = Math.min(1, k * 5) * Math.min(1, (1 - k) * 5);
      brazo.rotation.z = base + arriba * (2.6 + Math.sin(k * Math.PI * 8) * 0.3);
    }, ease.linear);
    if (!this.cita) {
      // Sin la cita visible, entra solo al cine.
      await this.tweens.run(0.4, (k) => (h.rotation.y = Math.PI * k));
      await this.tweens.run(1, (k) => (h.position.z = hasta.z - k * 0.8), ease.linear);
    }
  }

  protected tick(dt: number): void {
    this.tiempo += dt;
    // Afeitada: la máquina va borrando la espuma a medida que sigue el trazo.
    const tr = this.trazos[this.trazoActual];
    if (tr && !tr.seguidor.completo && this.agarreMaquina.sostenidoPor) {
      tr.seguidor.puntos = this.puntosMundo(tr);
      if (tr.seguidor.update(this.maquina.cabezal.getWorldPosition(_v)) > 0) {
        this.juego.inter.actividad();
        tr.espuma.forEach((e, k) => (e.visible = k >= tr.seguidor.siguiente));
        tr.flechas.forEach((f, k) => (f.visible = k >= tr.seguidor.siguiente));
      }
    }
    // Flechas que laten para indicar el camino.
    if (tr) tr.flechas.forEach((f, k) => f.scale.setScalar(0.011 + Math.max(0, Math.sin(this.tiempo * 6 - k * 0.7)) * 0.004));

    // Crema en la punta del índice.
    const mano = this.manoCrema;
    this.gotaCrema.visible = !!mano?.visible && this.granitosTratados.size < 2;
    if (mano && this.gotaCrema.visible) this.raiz.worldToLocal(this.gotaCrema.position.copy(mano.indice));

    // Focos de la marquesina que se prenden en cadena.
    if (this.cine.visible) {
      const n = this.focos.count;
      for (let i = 0; i < n; i++) {
        const on = (Math.floor(this.tiempo * 8) + i) % 3 !== 0;
        this.focos.setColorAt(i, _color.set(on ? '#ffe8a3' : '#6b5a2e'));
      }
      if (this.focos.instanceColor) this.focos.instanceColor.needsUpdate = true;
    }
  }

  protected async guion(): Promise<void> {
    this.curiosidad(t('adolescente.curiosidad'));

    // 1. Afeitada (2 trazos) y 2. crema.
    const trazo = (i: number) => ({
      id: `trazo${i + 1}`,
      objetivo: t(i === 0 ? 'adolescente.afeitada' : 'adolescente.otroLado'),
      pista: { tipo: 'agarrar' as const, objetivo: this.maquina.grupo, destino: this.trazos[i].flechas[0] },
      iniciar: () => this.empezarTrazo(i),
      completo: () => this.trazos[i].seguidor.completo,
      autocompletar: () => this.terminarTrazo(i),
    });
    let granitosActivos = false;
    await this.correr({
      id: 'banio',
      pasos: [
        trazo(0),
        trazo(1),
        {
          id: 'pomo',
          objetivo: t('adolescente.crema'),
          pista: { tipo: 'agarrar', objetivo: this.pomo },
          iniciar: () => {
            // Termina la afeitada: la máquina vuelve y desaparece el resto de la espuma.
            for (const e of this.espumaMenton) e.visible = false;
            this.agarreMaquina.habilitado = false;
            this.juego.inter.volverACasa(this.agarreMaquina);
            this.pararMaquina?.();
            this.pararMaquina = null;
            this.juego.inter.addGrabbable(this.pomo, { modo: 'disparar', radio: 0.08, onAgarrar: (m) => this.ponerCrema(m) });
          },
          completo: () => !!this.manoCrema || this.cremaAuto,
          autocompletar: () => this.ponerCrema(null),
        },
        {
          id: 'granitos',
          objetivo: t('adolescente.granitos'),
          pista: { tipo: 'tocar', objetivo: this.granitos[0] },
          iniciar: () => {
            if (granitosActivos) return;
            granitosActivos = true;
            this.granitos.forEach((gr, i) => this.juego.inter.addTocable(gr, { radio: 0.045, onToque: () => this.tratarGranito(i) }));
          },
          completo: () => this.granitosTratados.size >= 2,
          autocompletar: () => this.granitos.forEach((_, i) => this.tratarGranito(i)),
        },
      ],
    });
    this.decir(t('adolescente.gracias'), this.globoHijo(this.hijoBano), 2.5);
    await this.esperar(2.5);

    // 3. Llaves, cine y consejo.
    await this.cambiarEstacion(() => {
      this.bano.visible = false;
      this.entrada.visible = true;
      this.gotaCrema.visible = false;
      this.manoCrema = null;
    });
    this.decir(t('adolescente.teLlevo'), this.globoHijo(this.hijoEntrada), 3);
    const agarreLlaves = this.juego.inter.addGrabbable(this.llaves, {
      onAgarrar: () => {
        this.llavesAgarradas = true;
        this.juego.audio.sfx('llaves');
      },
    });
    await this.correr({
      id: 'cine',
      pasos: [
        {
          id: 'llaves',
          objetivo: t('adolescente.llaves'),
          pista: { tipo: 'agarrar', objetivo: this.llaves },
          completo: () => this.llavesAgarradas,
          autocompletar: () => {
            this.llavesAgarradas = true;
            this.juego.audio.sfx('llaves');
          },
        },
      ],
    });
    await this.esperar(0.6);
    agarreLlaves.habilitado = false;

    await this.cambiarEstacion(() => {
      this.entrada.visible = false;
      this.cine.visible = true;
      this.juego.ajustarCielo('#141a33');
      this.juego.ajustarLuz(0.55);
      // El cartel del objetivo más arriba: el globo del hijo va a la altura de su cabeza.
      this.objetivo.position.y = 0.74;
    });
    this.decir(t('adolescente.noLeGusto'), this.globoHijo(this.hijoCine), 60, 1.1);
    await this.esperar(1.2);
    for (const b of this.tarjetas) b.grupo.visible = true;
    await this.correr({
      id: 'cine',
      pasos: [
        {
          id: 'consejo',
          objetivo: t('adolescente.elegiConsejo'),
          pista: { tipo: 'tocar', objetivo: this.tarjetas[0].grupo },
          completo: () => this.consejo !== null,
          autocompletar: () => this.elegirConsejo(0),
        },
      ],
    });
    for (const b of this.tarjetas) b.grupo.visible = false;
    this.mostrarObjetivo('');
    const respuesta = TEXTOS.adolescente.consejos[this.consejo ?? 0].respuesta;
    this.decir(respuesta, this.globoHijo(this.hijoCine), 3.5, 1.1);
    await this.esperar(3.5);
    this.finEtapa();
    await this.irAlCine();
    await this.tweens.wait(0.8);
    this.terminar();
  }
}

const _color = new Color();
