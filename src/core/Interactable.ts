/**
 * Objetos interactivos y el gestor que los actualiza en cada cuadro.
 *  - Pokeable: botón que se hunde con el índice y se activa al llegar al fondo.
 *  - Grabbable: se agarra con la pinza; sigue a la mano; al soltar va a una zona o vuelve a su lugar.
 *  - DropZone: zona magnética de destino (15 cm).
 *  - RubZone: zona para frotar o palmear.
 *
 * Ante la duda entre realismo y robustez, robustez: radios amplios, snaps, nada cae al piso.
 */
import { Color, Material, Mesh, Object3D, Quaternion, Vector3 } from 'three';
import { CONFIG } from '../content/config';
import { PokeDetector, RubCounter } from './Gestures';
import type { HandTracker, ManoEstado } from './HandTracker';
import { Tweens, ease } from './Tweens';

export interface SonidosInteraccion {
  sfx(nombre: 'click' | 'agarrar' | 'soltar' | 'snap'): void;
}

// ─── Brillo ──────────────────────────────────────────────────────────────

/** Clona los materiales de un objeto para que su brillo no afecte a otros que los comparten. */
export function materialesPropios(obj: Object3D): void {
  obj.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh) return;
    const clonar = (x: Material) => {
      const c = x.clone();
      // El clon es propio: se libera con la escena aunque el original sea compartido.
      delete c.userData.compartido;
      delete c.userData.emisivoBase;
      return c;
    };
    m.material = Array.isArray(m.material) ? m.material.map(clonar) : clonar(m.material);
  });
}

const COLOR_BRILLO = new Color(0xfff1b8);

export function setBrillo(obj: Object3D, nivel: number): void {
  if (obj.userData.brillo === nivel) return;
  obj.userData.brillo = nivel;
  obj.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh || o.userData.sinBrillo) return;
    const mats = (Array.isArray(m.material) ? m.material : [m.material]) as (Material & { emissive?: Color })[];
    for (const mat of mats) {
      // Un material compartido brillaría en todos los objetos que lo usan.
      if (!mat.emissive || mat.userData.compartido) continue;
      if (!mat.userData.emisivoBase) mat.userData.emisivoBase = mat.emissive.clone();
      mat.emissive.copy(mat.userData.emisivoBase as Color).lerp(COLOR_BRILLO, nivel);
    }
  });
}

// ─── Tipos ───────────────────────────────────────────────────────────────

export interface PokeOpciones {
  /** Ancho y alto de la cara del botón (m). Mínimo 5 × 5 cm. */
  ancho: number;
  alto: number;
  /** Parte que se hunde (por defecto, el mismo objeto no se mueve). */
  tapa?: Object3D;
  onPoke: (mano: ManoEstado) => void;
  sonido?: boolean;
}

/**
 * Botón: su cara frontal está en z = 0 del objeto y mira hacia +z (hacia el jugador).
 */
export class Pokeable {
  habilitado = true;
  cerca = false;
  detector = new PokeDetector(CONFIG.manos.recorridoBoton, CONFIG.manos.rebote);
  private tapaZ: number;
  constructor(
    public obj: Object3D,
    public opts: PokeOpciones,
  ) {
    this.tapaZ = opts.tapa?.position.z ?? 0;
  }
  aplicarHundimiento(): void {
    if (this.opts.tapa) this.opts.tapa.position.z = this.tapaZ - this.detector.depth;
  }
}

export interface GrabOpciones {
  /** Radio de agarre alrededor del objeto (m). Por defecto 7 cm. */
  radio?: number;
  /**
   * 'sostener': el objeto sigue a la mano.
   * 'disparar': solo llama a onAgarrar (por ejemplo, el bebé que se acomoda solo en el hombro).
   */
  modo?: 'sostener' | 'disparar';
  onAgarrar?: (mano: ManoEstado) => void;
  /** Al soltar fuera de una zona. Devolver true si la escena se encarga. */
  onSoltar?: (mano: ManoEstado) => boolean;
  brillo?: boolean;
}

export class Grabbable {
  habilitado = true;
  sostenidoPor: ManoEstado | null = null;
  cerca = false;
  volviendo = false;
  casa = { padre: null as Object3D | null, pos: new Vector3(), quat: new Quaternion() };
  offset = new Vector3();
  constructor(
    public obj: Object3D,
    public opts: GrabOpciones,
  ) {
    this.fijarCasa();
  }
  /** Toma la posición actual como su lugar de origen. */
  fijarCasa(): void {
    this.casa.padre = this.obj.parent;
    this.casa.pos.copy(this.obj.position);
    this.casa.quat.copy(this.obj.quaternion);
  }
}

export interface ZonaOpciones {
  /** Radio (m). Por defecto 15 cm. */
  radio?: number;
  acepta?: (g: Grabbable) => boolean;
  /** Se llama cuando el objeto terminó de acomodarse en la zona. */
  onSoltar: (g: Grabbable) => void;
  /** Acomodar el objeto en el centro de la zona (por defecto sí). */
  snap?: boolean;
  /** Objeto que brilla cuando algo aceptable se acerca. */
  marcador?: Object3D;
}

export class DropZone {
  habilitada = true;
  cerca = false;
  /** El centro de la zona es la posición en el mundo de `objetivo`. */
  constructor(
    public objetivo: Object3D,
    public opts: ZonaOpciones,
  ) {}
}

export interface RubOpciones {
  modo: 'palmear' | 'frotar';
  /** Radio de la zona (m). */
  radio: number;
  /** Palmadas (modo palmear) o segundos (modo frotar) para completar. */
  meta: number;
  onProgreso?: (valor: number) => void;
  onCompleta: () => void;
  marcador?: Object3D;
}

export class RubZone {
  habilitada = true;
  completa = false;
  contador: RubCounter;
  constructor(
    /** El centro de la zona es la posición en el mundo de `objetivo` (puede moverse). */
    public objetivo: Object3D,
    public opts: RubOpciones,
  ) {
    this.contador = new RubCounter(opts.modo, opts.radio, CONFIG.manos.velocidadFrotado);
  }
  get valor(): number {
    return this.opts.modo === 'palmear' ? this.contador.entradas : this.contador.segundos;
  }
}

export interface TocableOpciones {
  /** Radio de la zona (m). */
  radio: number;
  onToque: (mano: ManoEstado) => void;
  marcador?: Object3D;
}

/**
 * Zona que se activa con solo apoyar la punta del índice o la palma (sin velocidad
 * mínima): para gestos suaves como tocar la panza.
 */
export class Tocable {
  habilitado = true;
  /**
   * Arranca "adentro": solo se activa después de ver la mano afuera. Así no se
   * dispara sola si la mano ya estaba ahí al empezar la escena.
   */
  dentro = true;
  constructor(
    public objetivo: Object3D,
    public opts: TocableOpciones,
  ) {}
}

// ─── Gestor ──────────────────────────────────────────────────────────────

const _v = new Vector3();
const _w = new Vector3();

export class Interactables {
  pokeables: Pokeable[] = [];
  grabbables: Grabbable[] = [];
  zonas: DropZone[] = [];
  frotables: RubZone[] = [];
  tocables: Tocable[] = [];
  private tweens = new Tweens();
  private oyentes: (() => void)[] = [];

  constructor(
    private manos: HandTracker,
    private sonido: SonidosInteraccion,
  ) {}

  /** Se avisa cada vez que el jugador hace algo (sirve para la ayuda por inactividad). */
  onActividad(cb: () => void): () => void {
    this.oyentes.push(cb);
    return () => (this.oyentes = this.oyentes.filter((x) => x !== cb));
  }

  actividad(): void {
    for (const cb of this.oyentes) cb();
  }

  addPokeable(obj: Object3D, opts: PokeOpciones): Pokeable {
    const p = new Pokeable(obj, opts);
    this.pokeables.push(p);
    return p;
  }

  addGrabbable(obj: Object3D, opts: GrabOpciones = {}): Grabbable {
    if (opts.brillo !== false) materialesPropios(obj);
    const g = new Grabbable(obj, opts);
    this.grabbables.push(g);
    return g;
  }

  addZona(objetivo: Object3D, opts: ZonaOpciones): DropZone {
    if (opts.marcador) materialesPropios(opts.marcador);
    const z = new DropZone(objetivo, opts);
    this.zonas.push(z);
    return z;
  }

  addFrotable(objetivo: Object3D, opts: RubOpciones): RubZone {
    if (opts.marcador) materialesPropios(opts.marcador);
    const r = new RubZone(objetivo, opts);
    this.frotables.push(r);
    return r;
  }

  addTocable(objetivo: Object3D, opts: TocableOpciones): Tocable {
    if (opts.marcador) materialesPropios(opts.marcador);
    const t = new Tocable(objetivo, opts);
    this.tocables.push(t);
    return t;
  }

  /** Borra todo (al cambiar de escena). */
  limpiar(): void {
    this.pokeables = [];
    this.grabbables = [];
    this.zonas = [];
    this.frotables = [];
    this.tocables = [];
    this.tweens.dispose();
    this.tweens = new Tweens();
  }

  sosteniendo(mano: ManoEstado): Grabbable | null {
    return this.grabbables.find((g) => g.sostenidoPor === mano) ?? null;
  }

  update(dt: number): void {
    this.tweens.update(dt);
    this.actualizarAgarres(dt);
    this.actualizarPokes(dt);
    this.actualizarZonas();
    this.actualizarFrotables(dt);
    this.actualizarTocables();
  }

  private actualizarTocables(): void {
    for (const t of this.tocables) {
      if (!t.habilitado || !visibleEnCadena(t.objetivo)) continue;
      const centro = t.objetivo.getWorldPosition(_w);
      let mano: ManoEstado | null = null;
      let cerca = false;
      for (const m of this.manos.manos) {
        if (!m.visible) continue;
        const d = Math.min(m.indice.distanceTo(centro), m.palma.distanceTo(centro));
        if (d <= t.opts.radio) mano = m;
        if (d <= t.opts.radio + 0.08) cerca = true;
      }
      if (t.opts.marcador) setBrillo(t.opts.marcador, cerca ? 0.3 : 0);
      if (mano && !t.dentro) {
        t.dentro = true;
        this.actividad();
        t.opts.onToque(mano);
      } else if (!mano) t.dentro = false;
    }
  }

  // ── Tocar ──
  private actualizarPokes(dt: number): void {
    for (const p of this.pokeables) {
      const activo = p.habilitado && visibleEnCadena(p.obj);
      let mejor: { pen: number; mano: ManoEstado } | null = null;
      let cerca = false;
      if (activo) {
        p.obj.updateWorldMatrix(true, false);
        for (const m of this.manos.manos) {
          if (!m.visible || this.sosteniendo(m)) continue;
          _v.copy(m.indice);
          p.obj.worldToLocal(_v);
          const dentroXY = Math.abs(_v.x) <= p.opts.ancho / 2 && Math.abs(_v.y) <= p.opts.alto / 2;
          // El dedo cuenta desde la cara del botón hasta 12 cm hacia adentro: así, al
          // retirarlo, no vuelve a activarse. Desde atrás del botón no cuenta.
          if (dentroXY && _v.z <= 0.003 && _v.z >= -0.12) {
            const pen = -_v.z;
            if (!mejor || pen > mejor.pen) mejor = { pen, mano: m };
          }
          if (Math.abs(_v.x) <= p.opts.ancho / 2 + 0.03 && Math.abs(_v.y) <= p.opts.alto / 2 + 0.03 && _v.z <= 0.08 && _v.z >= -0.05) cerca = true;
        }
      }
      const activado = p.detector.update(mejor ? mejor.pen : null, dt);
      p.aplicarHundimiento();
      if (cerca !== p.cerca) {
        p.cerca = cerca;
        setBrillo(p.obj, cerca ? 0.3 : 0);
      }
      if (activado && mejor) {
        if (p.opts.sonido !== false) this.sonido.sfx('click');
        this.actividad();
        p.opts.onPoke(mejor.mano);
      }
    }
  }

  // ── Agarrar y soltar ──
  private actualizarAgarres(dt: number): void {
    for (const g of this.grabbables) g.cerca = false;

    for (const m of this.manos.manos) {
      const sostenido = this.sosteniendo(m);
      if (sostenido) {
        if (!m.visible) {
          // Mano perdida: lo agarrado vuelve a su lugar.
          if (m.perdidaHace > CONFIG.manos.manoPerdida) this.volverACasa(sostenido);
          continue;
        }
        if (!m.pinch.pinching) {
          this.soltar(sostenido, m);
          continue;
        }
        _v.copy(m.pinza).add(sostenido.offset);
        sostenido.obj.getWorldPosition(_w);
        _w.lerp(_v, 1 - Math.exp(-dt * 30));
        setPosicionMundo(sostenido.obj, _w);
        continue;
      }
      if (!m.visible) continue;

      let mejor: Grabbable | null = null;
      let mejorD = Infinity;
      for (const g of this.grabbables) {
        if (!g.habilitado || g.sostenidoPor || g.volviendo || !visibleEnCadena(g.obj)) continue;
        const d = g.obj.getWorldPosition(_w).distanceTo(m.pinza);
        if (d < mejorD) {
          mejorD = d;
          mejor = g;
        }
      }
      if (!mejor) continue;
      const radio = mejor.opts.radio ?? CONFIG.manos.radioAgarre;
      if (mejorD <= radio + 0.05) mejor.cerca = true;
      if (m.pinch.started && mejorD <= radio) this.agarrar(mejor, m);
    }

    for (const g of this.grabbables) {
      if (g.opts.brillo === false) continue;
      setBrillo(g.obj, g.sostenidoPor ? 0.15 : g.cerca && g.habilitado ? 0.45 : 0);
    }
  }

  private agarrar(g: Grabbable, m: ManoEstado): void {
    this.sonido.sfx('agarrar');
    this.actividad();
    if (g.opts.modo === 'disparar') {
      g.opts.onAgarrar?.(m);
      return;
    }
    g.sostenidoPor = m;
    g.obj.getWorldPosition(_w);
    // El objeto se acerca a la pinza, pero sin saltar de golpe.
    g.offset.copy(_w).sub(m.pinza).multiplyScalar(0.5);
    g.opts.onAgarrar?.(m);
  }

  private soltar(g: Grabbable, m: ManoEstado): void {
    g.sostenidoPor = null;
    this.sonido.sfx('soltar');
    this.actividad();
    const zona = this.zonaPara(g);
    if (zona) {
      this.dejarEnZona(g, zona);
      return;
    }
    if (g.opts.onSoltar?.(m)) return;
    this.volverACasa(g);
  }

  /** Deja un objeto en una zona por código (Saltar, autocompletar). */
  dejarEnZona(g: Grabbable, zona: DropZone): void {
    g.sostenidoPor = null;
    g.habilitado = false;
    if (zona.opts.snap === false) {
      zona.opts.onSoltar(g);
      return;
    }
    const desde = g.obj.getWorldPosition(new Vector3());
    const hasta = zona.objetivo.getWorldPosition(new Vector3());
    g.volviendo = true;
    void this.tweens
      .run(0.25, (t) => setPosicionMundo(g.obj, _v.copy(desde).lerp(hasta, t)), ease.out)
      .then(() => {
        g.volviendo = false;
        this.sonido.sfx('snap');
        zona.opts.onSoltar(g);
      });
  }

  /** Vuelve flotando a su lugar original. Nunca cae al piso. */
  volverACasa(g: Grabbable): void {
    g.sostenidoPor = null;
    const padre = g.casa.padre;
    if (!padre) return;
    const desde = g.obj.getWorldPosition(new Vector3());
    const hasta = padre.localToWorld(g.casa.pos.clone());
    const q0 = g.obj.quaternion.clone();
    g.volviendo = true;
    void this.tweens
      .run(0.5, (t) => {
        setPosicionMundo(g.obj, _v.copy(desde).lerp(hasta, t));
        g.obj.quaternion.slerpQuaternions(q0, g.casa.quat, t);
      })
      .then(() => {
        g.volviendo = false;
        g.obj.position.copy(g.casa.pos);
      });
  }

  private zonaPara(g: Grabbable): DropZone | null {
    const p = g.obj.getWorldPosition(new Vector3());
    let mejor: DropZone | null = null;
    let mejorD = Infinity;
    for (const z of this.zonas) {
      if (!z.habilitada || !visibleEnCadena(z.objetivo)) continue;
      if (z.opts.acepta && !z.opts.acepta(g)) continue;
      const d = z.objetivo.getWorldPosition(_w).distanceTo(p);
      if (d <= (z.opts.radio ?? CONFIG.manos.radioZona) && d < mejorD) {
        mejor = z;
        mejorD = d;
      }
    }
    return mejor;
  }

  private actualizarZonas(): void {
    const cercanas = new Set<DropZone>();
    for (const g of this.grabbables) {
      if (!g.sostenidoPor) continue;
      const z = this.zonaPara(g);
      if (z) cercanas.add(z);
    }
    for (const z of this.zonas) {
      z.cerca = cercanas.has(z);
      if (z.opts.marcador) setBrillo(z.opts.marcador, z.cerca ? 0.6 : 0);
    }
  }

  // ── Frotar y palmear ──
  private actualizarFrotables(dt: number): void {
    for (const r of this.frotables) {
      if (!r.habilitada || r.completa || !visibleEnCadena(r.objetivo)) continue;
      const puntos = this.manos.manos.flatMap((m) => [
        { id: m.lado + '-indice', punto: m.visible ? m.indice : null },
        { id: m.lado + '-palma', punto: m.visible ? m.palma : null },
      ]);
      const centro = r.objetivo.getWorldPosition(_w);
      const cerca = puntos.some((p) => p.punto && p.punto.distanceTo(centro) <= r.opts.radio + 0.05);
      if (r.opts.marcador) setBrillo(r.opts.marcador, cerca ? 0.35 : 0);
      if (r.contador.update(puntos, centro, dt)) {
        this.actividad();
        r.opts.onProgreso?.(r.valor);
        if (r.valor >= r.opts.meta) this.completarFrotable(r);
      }
    }
  }

  /** Completa una zona de frotado (también por código: Saltar, autocompletar). */
  completarFrotable(r: RubZone): void {
    if (r.completa) return;
    r.completa = true;
    if (r.opts.marcador) setBrillo(r.opts.marcador, 0);
    r.opts.onCompleta();
  }
}

export function visibleEnCadena(o: Object3D | null): boolean {
  while (o) {
    if (!o.visible) return false;
    o = o.parent;
  }
  return true;
}

export function setPosicionMundo(obj: Object3D, mundo: Vector3): void {
  if (obj.parent) {
    obj.parent.updateWorldMatrix(true, false);
    obj.position.copy(obj.parent.worldToLocal(mundo.clone()));
  } else obj.position.copy(mundo);
}
