/**
 * Máquina de estados de escenas: orden lineal, fundidos entre escenas y reinicio.
 * No depende del render, así se puede testear con un fader falso.
 */
import type { FaderLike } from './Fader';

export interface Escena {
  readonly id: string;
  enter(): void | Promise<void>;
  update(dt: number): void;
  exit(): void;
}

export interface DefinicionEscena {
  id: string;
  crear: () => Escena;
}

export interface GanchosEscenas {
  /** Con la pantalla tapada, antes de crear la escena nueva (limpiar interacciones, recentrar…). */
  antesDeEntrar?: (id: string) => void;
  /** Cuando la escena nueva ya entró (métricas). */
  alEntrar?: (id: string) => void;
  /** Al reiniciar desde el principio (partida nueva). */
  alReiniciar?: () => void;
}

export class SceneManager {
  actual: Escena | null = null;
  indice = -1;
  enTransicion = false;

  constructor(
    private escenas: DefinicionEscena[],
    private fader: FaderLike,
    private ganchos: GanchosEscenas = {},
  ) {}

  get ids(): string[] {
    return this.escenas.map((e) => e.id);
  }

  /** Va a una escena por id o por índice. Devuelve false si ya hay una transición en curso. */
  async irA(destino: string | number, color: 'negro' | 'blanco' = 'negro'): Promise<boolean> {
    const i = typeof destino === 'number' ? destino : this.escenas.findIndex((e) => e.id === destino);
    if (i < 0 || i >= this.escenas.length || this.enTransicion) return false;
    this.enTransicion = true;
    try {
      if (this.actual) await this.fader.salir(color);
      this.actual?.exit();
      this.actual = null;
      const def = this.escenas[i];
      this.ganchos.antesDeEntrar?.(def.id);
      const escena = def.crear();
      this.indice = i;
      await escena.enter();
      this.actual = escena;
      this.ganchos.alEntrar?.(def.id);
      await this.fader.entrar();
    } finally {
      this.enTransicion = false;
    }
    return true;
  }

  /** Pasa a la escena siguiente. Si era la última, vuelve a empezar. */
  siguiente(color: 'negro' | 'blanco' = 'negro'): Promise<boolean> {
    if (this.indice + 1 >= this.escenas.length) return this.reiniciar();
    return this.irA(this.indice + 1, color);
  }

  /**
   * Para que una escena avise que terminó. Si la escena ya no es la actual
   * (por ejemplo, se saltó con el modo debug), se ignora.
   */
  terminar(escena: Escena, color: 'negro' | 'blanco' = 'negro'): Promise<boolean> {
    if (escena !== this.actual) return Promise.resolve(false);
    return this.siguiente(color);
  }

  /** Partida nueva desde la primera escena. */
  reiniciar(): Promise<boolean> {
    if (this.enTransicion) return Promise.resolve(false);
    this.ganchos.alReiniciar?.();
    return this.irA(0);
  }

  update(dt: number): void {
    this.actual?.update(dt);
  }
}
