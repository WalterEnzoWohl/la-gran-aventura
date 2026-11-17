/**
 * Misiones: cada misión es una lista de pasos; cada paso tiene una condición de éxito,
 * un texto de objetivo y una pista. El corredor avanza paso a paso y permite
 * completar el paso actual desde afuera (botón "Saltar", HintSystem, StageTimer).
 */

export interface Paso {
  id: string;
  /** Texto de objetivo que se muestra al jugador. */
  objetivo: string;
  /** Prepara el paso (mostrar objetos, habilitar zonas…). */
  iniciar?(): void;
  /** Condición de éxito, consultada en cada cuadro. */
  completo(): boolean;
  /** Lleva el mundo al estado final del paso (sin que el jugador haga nada). */
  autocompletar(): void;
  /** Datos para la mano fantasma (los usa el HintSystem). */
  pista?: unknown;
}

export interface Mision {
  id: string;
  pasos: Paso[];
}

export interface ResultadoPaso {
  mision: string;
  paso: string;
  /** Segundos que llevó el paso. */
  tiempo: number;
  autocompletado: boolean;
}

export interface OyentesMision {
  alEmpezarPaso?: (paso: Paso, mision: Mision) => void;
  alTerminarPaso?: (r: ResultadoPaso, paso: Paso) => void;
}

export class MissionRunner {
  mision: Mision | null = null;
  indice = 0;
  /** Segundos desde que empezó el paso actual. */
  tiempoPaso = 0;
  private resolver: (() => void) | null = null;

  constructor(private oyentes: OyentesMision = {}) {}

  get paso(): Paso | null {
    return this.mision?.pasos[this.indice] ?? null;
  }

  get activa(): boolean {
    return this.paso !== null;
  }

  /** Corre una misión. La promesa se resuelve cuando se completa el último paso. */
  correr(m: Mision): Promise<void> {
    this.mision = m;
    this.indice = 0;
    return new Promise((resolve) => {
      this.resolver = resolve;
      this.empezarPaso();
    });
  }

  update(dt: number): void {
    const p = this.paso;
    if (!p) return;
    this.tiempoPaso += dt;
    if (p.completo()) this.terminarPaso(false);
  }

  /** Completa el paso actual (Saltar, autocompletar). */
  completarPaso(): void {
    const p = this.paso;
    if (!p) return;
    p.autocompletar();
    this.terminarPaso(true);
  }

  /** Completa todos los pasos que faltan (tope de la etapa). */
  completarTodo(): void {
    while (this.paso) this.completarPaso();
  }

  private empezarPaso(): void {
    const p = this.paso;
    if (!p || !this.mision) {
      this.finalizar();
      return;
    }
    this.tiempoPaso = 0;
    p.iniciar?.();
    this.oyentes.alEmpezarPaso?.(p, this.mision);
  }

  private terminarPaso(autocompletado: boolean): void {
    const p = this.paso;
    const m = this.mision;
    if (!p || !m) return;
    this.oyentes.alTerminarPaso?.({ mision: m.id, paso: p.id, tiempo: this.tiempoPaso, autocompletado }, p);
    this.indice++;
    this.empezarPaso();
  }

  private finalizar(): void {
    this.mision = null;
    const r = this.resolver;
    this.resolver = null;
    r?.();
  }
}
