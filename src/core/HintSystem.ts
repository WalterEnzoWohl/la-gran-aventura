/**
 * Ayuda por inactividad:
 *  - mano fantasma a los 10 s sin avance (o desde el segundo 0 si el paso lo pide),
 *  - el paso se completa solo a los 30 s de empezado.
 * `HintTimer` es la lógica pura (testeable); `HintSystem` la conecta con la mano
 * fantasma y el corredor de misiones.
 */
import type { Object3D } from 'three';
import { CONFIG } from '../content/config';
import type { GhostHand } from './GhostHand';
import type { MissionRunner, Paso } from './Mission';

export interface Pista {
  tipo: 'tocar' | 'agarrar' | 'frotar' | 'palmear';
  objetivo: Object3D;
  /** Para 'agarrar': adónde llevarlo. */
  destino?: Object3D;
  /** Mostrar la mano desde el segundo 0 (primera vez que aparece un gesto). */
  desdeCero?: boolean;
}

export type EventoPista = 'mostrar' | 'ocultar' | 'autocompletar' | null;

export class HintTimer {
  /** Segundos desde la última actividad del jugador. */
  inactivo = 0;
  /** Segundos desde que empezó el paso. */
  enPaso = 0;
  visible = false;
  /** Cuántas veces se mostró la mano en este paso. */
  pistas = 0;
  private autocompletado = false;

  constructor(
    public pistaA = CONFIG.tiempos.pista,
    public autoA = CONFIG.tiempos.autocompletar,
  ) {}

  /** Paso nuevo: reinicia todo. */
  reiniciar(desdeCero = false): EventoPista {
    this.inactivo = 0;
    this.enPaso = 0;
    this.pistas = 0;
    this.autocompletado = false;
    const estaba = this.visible;
    this.visible = false;
    if (desdeCero) return this.mostrar();
    return estaba ? 'ocultar' : null;
  }

  /** El jugador hizo algo: se oculta la mano y vuelve a contar la inactividad. */
  actividad(): EventoPista {
    this.inactivo = 0;
    if (this.visible) {
      this.visible = false;
      return 'ocultar';
    }
    return null;
  }

  update(dt: number): EventoPista {
    if (this.autocompletado) return null;
    this.inactivo += dt;
    this.enPaso += dt;
    if (this.enPaso >= this.autoA) {
      this.autocompletado = true;
      return 'autocompletar';
    }
    if (!this.visible && this.inactivo >= this.pistaA) return this.mostrar();
    return null;
  }

  private mostrar(): EventoPista {
    this.visible = true;
    this.pistas++;
    return 'mostrar';
  }
}

export class HintSystem {
  timer = new HintTimer();
  private paso: Paso | null = null;
  activo = true;

  constructor(
    private mano: GhostHand,
    private runner: MissionRunner,
  ) {}

  /** Cantidad de pistas mostradas en el paso actual (para las métricas). */
  get pistas(): number {
    return this.timer.pistas;
  }

  actividad(): void {
    if (this.timer.actividad() === 'ocultar') this.mano.ocultar();
  }

  update(dt: number): void {
    const paso = this.runner.paso;
    if (paso !== this.paso) {
      this.paso = paso;
      const pista = paso?.pista as Pista | undefined;
      const ev = this.timer.reiniciar(!!pista?.desdeCero);
      this.mano.ocultar();
      if (ev === 'mostrar' && pista) this.mano.mostrar(pista);
    }
    if (!paso || !this.activo) return;
    const ev = this.timer.update(dt);
    const pista = paso.pista as Pista | undefined;
    if (ev === 'mostrar' && pista) this.mano.mostrar(pista);
    else if (ev === 'autocompletar') {
      this.mano.ocultar();
      this.runner.completarPaso();
    }
  }

  detener(): void {
    this.activo = false;
    this.mano.ocultar();
  }
}
