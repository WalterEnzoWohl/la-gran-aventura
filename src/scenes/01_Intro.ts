/**
 * 01 Intro (unos 15 s): una tarjeta con los datos de natalidad y el botón
 * "Iniciar la aventura", que es el tutorial del toque. Al tocarlo se calibra
 * la altura del jugador.
 */
import { t } from '../content/textos';
import { crearBoton } from '../core/Button';
import type { Pista } from '../core/HintSystem';
import { TextPanel } from '../core/TextPanel';
import { crearHabitacion, planta, ventana, PARED_FONDO } from '../game/escenarios';
import { CONFIG } from '../content/config';
import { StageTimer } from '../core/StageTimer';
import { EscenaInicio } from './EscenaBase';

export class Intro extends EscenaInicio {
  readonly id = 'intro';
  private iniciado = false;
  private boton!: ReturnType<typeof crearBoton>;

  /** La intro arranca el tope de 1 minuto del inicio. */
  protected crearTope(): StageTimer {
    this.juego.topeInicio = new StageTimer(CONFIG.tiempos.inicio);
    return this.juego.topeInicio;
  }

  protected construir(): void {
    const piso = this.juego.pisoY;
    crearHabitacion(this.raiz, piso, { piso: '#e6d8c3', pared: '#f4ede2', zocalo: '#d8c7ad' });
    ventana(this.raiz, -1.2, piso + 1.5, PARED_FONDO);
    planta(this.juego.assets, this.raiz, 1.6, piso, -1.9);

    const tarjeta = new TextPanel(`${t('intro.dato')}\n\n${t('intro.invitacion')}`, {
      ancho: 1.3,
      tamano: 0.055,
      fondo: 'rgba(29,36,51,0.92)',
      color: '#ffffff',
      negrita: true,
      padding: 0.06,
    });
    tarjeta.position.set(0, 0.38, -1.5);
    this.raiz.add(tarjeta);

    const fuente = new TextPanel(t('general.fuente'), { ancho: 1.2, tamano: 0.026, fondo: null, color: '#4a4f5c' });
    fuente.position.set(0, 0.38 - tarjeta.alto / 2 - 0.05, -1.5);
    this.raiz.add(fuente);

    this.boton = crearBoton(this.juego.inter, t('intro.boton'), {
      ancho: 0.3,
      alto: 0.1,
      color: '#2f7de1',
      tamanoTexto: 0.032,
      onPoke: () => this.iniciar(),
    });
    this.boton.grupo.position.set(0, -0.02, -0.42);
    this.boton.grupo.rotation.x = -0.5;
    this.raiz.add(this.boton.grupo);

    this.juego.audio.musica('intro');
  }

  private iniciar(): void {
    if (this.iniciado) return;
    this.iniciado = true;
    // El toque del botón es el momento de calibrar: el jugador está cómodo y mirando adelante.
    this.juego.calibrar();
  }

  protected async guion(): Promise<void> {
    const pista: Pista = { tipo: 'tocar', objetivo: this.boton.grupo, desdeCero: true };
    await this.correr({
      id: 'intro',
      pasos: [
        {
          id: 'iniciar',
          objetivo: '',
          pista,
          completo: () => this.iniciado,
          autocompletar: () => this.iniciar(),
        },
      ],
    });
    this.terminar();
  }
}
