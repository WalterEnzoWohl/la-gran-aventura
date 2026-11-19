/**
 * Tope de tiempo por etapa (2 min 15 s): al llegar, la escena completa solas las
 * misiones que faltan y pasa a la siguiente.
 */
export class StageTimer {
  tiempo = 0;
  alcanzado = false;
  pausado = false;

  constructor(public tope: number) {}

  /** Devuelve true solo en el cuadro en que se alcanza el tope. */
  update(dt: number): boolean {
    if (this.pausado || this.alcanzado) return false;
    this.tiempo += dt;
    if (this.tiempo >= this.tope) {
      this.alcanzado = true;
      return true;
    }
    return false;
  }

  /** Da el tope por alcanzado ahora (por ejemplo, si se acaba el tiempo total de la sesión). */
  forzar(): boolean {
    if (this.alcanzado) return false;
    this.alcanzado = true;
    return true;
  }

  /** Fracción del tope consumida (0 a 1). */
  get fraccion(): number {
    return Math.min(1, this.tiempo / this.tope);
  }

  get restante(): number {
    return Math.max(0, this.tope - this.tiempo);
  }
}

/** mm:ss */
export function formatoTiempo(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** HH:MM a partir de minutos desde la medianoche. */
export function formatoHora(minutos: number): string {
  const m = Math.floor(minutos) % (24 * 60);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
