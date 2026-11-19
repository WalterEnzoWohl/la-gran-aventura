/**
 * Lógica pura de los gestos (sin render), para testearla con datos simulados:
 *  - tocar (poke) con hundimiento y rebote,
 *  - pinza con histéresis (agarrar / soltar),
 *  - frotar y palmear.
 */
import { Vector3 } from 'three';

/** Pinza: empieza por debajo de `inicio` y se suelta por encima de `suelta`. */
export class PinchDetector {
  pinching = false;
  /** true solo en el cuadro en que empezó la pinza. */
  started = false;
  /** true solo en el cuadro en que se soltó. */
  ended = false;

  constructor(
    public inicio = 0.015,
    public suelta = 0.03,
  ) {}

  /** `distancia` entre pulgar e índice, o null si la mano no se ve. */
  update(distancia: number | null): void {
    const antes = this.pinching;
    if (distancia === null) this.pinching = false;
    else if (this.pinching) this.pinching = distancia <= this.suelta;
    else this.pinching = distancia < this.inicio;
    this.started = !antes && this.pinching;
    this.ended = antes && !this.pinching;
  }
}

/**
 * Toque con hundimiento: el botón se hunde con el dedo y se activa al llegar al fondo.
 * Se vuelve a armar cuando el dedo sale y pasó el rebote.
 */
export class PokeDetector {
  /** Cuánto está hundido el botón (0 a `recorrido`). */
  depth = 0;
  /**
   * Arranca desarmado: se arma al ver el dedo afuera. Así un botón que aparece
   * donde ya estaba el dedo no se activa solo.
   */
  private armed = false;
  private cooldown = 0;

  constructor(
    public recorrido = 0.015,
    public rebote = 0.4,
  ) {}

  /**
   * `penetracion`: cuánto pasó la punta del dedo la cara del botón (m),
   * o null si el dedo está fuera del área del botón.
   * Devuelve true en el cuadro en que el botón se activa.
   */
  update(penetracion: number | null, dt: number): boolean {
    this.cooldown = Math.max(0, this.cooldown - dt);
    const p = penetracion === null ? 0 : Math.max(0, penetracion);
    this.depth = Math.min(this.recorrido, p);
    if (p <= 0.002 && this.cooldown <= 0) this.armed = true;
    if (this.armed && p >= this.recorrido) {
      this.armed = false;
      this.cooldown = this.rebote;
      return true;
    }
    return false;
  }
}

/**
 * Frotar o palmear dentro de una zona esférica.
 *  - 'palmear': cuenta entradas a la zona con velocidad mayor al umbral.
 *  - 'frotar': acumula segundos de movimiento dentro de la zona por encima del umbral.
 * Se alimenta con varios puntos (palma y punta del índice de cada mano).
 */
export class RubCounter {
  entradas = 0;
  segundos = 0;
  private dentro = new Map<string, boolean>();
  private ultimo = new Map<string, Vector3>();
  private desdeUltima = 1;
  /** Segundos que el frotado sigue contando después del último movimiento rápido. */
  private gracia = new Map<string, number>();
  static readonly GRACIA_FROTADO = 0.15;

  constructor(
    public modo: 'palmear' | 'frotar',
    public radio: number,
    public velocidadMinima = 0.15,
  ) {}

  /**
   * Procesa un cuadro. `puntos`: palma y punta del índice de cada mano visible
   * (null si esa mano no se ve). `centro`: centro actual de la zona (puede moverse,
   * por ejemplo el bebé en el hombro). Devuelve true si hubo progreso.
   */
  update(puntos: { id: string; punto: Vector3 | null }[], centro: Vector3, dt: number): boolean {
    let entro = false;
    let frotando = false;
    for (const { id, punto } of puntos) {
      if (!punto) {
        this.dentro.set(id, false);
        this.ultimo.delete(id);
        this.gracia.delete(id);
        continue;
      }
      const prev = this.ultimo.get(id);
      const velocidad = prev && dt > 0 ? prev.distanceTo(punto) / dt : 0;
      const adentro = punto.distanceTo(centro) <= this.radio;
      const estaba = this.dentro.get(id) ?? false;
      if (adentro && !estaba && velocidad >= this.velocidadMinima) entro = true;
      // El seguimiento de manos repite poses entre actualizaciones: el frotado
      // sigue contando un instante después de cada movimiento rápido.
      let gracia = Math.max(0, (this.gracia.get(id) ?? 0) - dt);
      if (prev && velocidad >= this.velocidadMinima) gracia = RubCounter.GRACIA_FROTADO;
      this.gracia.set(id, gracia);
      if (adentro && gracia > 0) frotando = true;
      this.dentro.set(id, adentro);
      if (prev) prev.copy(punto);
      else this.ultimo.set(id, punto.clone());
    }
    this.desdeUltima += dt;
    if (this.modo === 'palmear') {
      // Palma e índice de la misma mano entran casi juntos: dos entradas
      // separadas por menos de 150 ms cuentan como una sola palmada.
      if (entro && this.desdeUltima >= 0.15) {
        this.entradas++;
        this.desdeUltima = 0;
        return true;
      }
      return false;
    }
    if (frotando) this.segundos += dt;
    return frotando;
  }

  reset(): void {
    this.entradas = 0;
    this.segundos = 0;
    this.dentro.clear();
    this.ultimo.clear();
    this.gracia.clear();
    this.desdeUltima = 1;
  }
}

/**
 * Trazo guiado (afeitada): se avanza mientras la herramienta esté a menos de
 * `tolerancia` del próximo punto del trazo. Nunca retrocede.
 */
export class PathFollower {
  /** Índice del próximo punto a alcanzar. */
  siguiente = 0;

  constructor(
    public puntos: Vector3[],
    public tolerancia = 0.04,
  ) {}

  get completo(): boolean {
    return this.siguiente >= this.puntos.length;
  }

  get progreso(): number {
    return this.puntos.length ? this.siguiente / this.puntos.length : 1;
  }

  /** Devuelve cuántos puntos avanzó en este cuadro (0 si ninguno). */
  update(herramienta: Vector3 | null): number {
    if (!herramienta || this.completo) return 0;
    const antes = this.siguiente;
    // Si la mano va rápido, puede saltear hasta dos puntos en un cuadro.
    for (let i = 0; i < 3 && this.siguiente + i < this.puntos.length; i++) {
      if (herramienta.distanceTo(this.puntos[this.siguiente + i]) <= this.tolerancia) {
        this.siguiente += i + 1;
        break;
      }
    }
    return this.siguiente - antes;
  }

  terminar(): void {
    this.siguiente = this.puntos.length;
  }
}
