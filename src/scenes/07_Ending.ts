/**
 * 07 Final (unos 45 s): living vacío con el álbum completo en la pared.
 * Las frases aparecen de a una; después, los programas de la Ciudad y "¡Gracias por jugar!".
 * No hay encuesta en el visor. En modo evento, a los 15 s vuelve sola a la Intro.
 */
import { CONFIG } from '../content/config';
import { t, TEXTOS } from '../content/textos';
import { crearBoton } from '../core/Button';
import { TextPanel } from '../core/TextPanel';
import { ease } from '../core/Tweens';
import { crearFoto } from '../game/Album';
import { crearHabitacion, PARED_FONDO, planta, sofa, ventana } from '../game/escenarios';
import { fotosFinal } from '../game/fotos';
import { EscenaBase } from './EscenaBase';

export class Ending extends EscenaBase {
  readonly id = 'final';
  private texto!: TextPanel;
  private apurar = false;
  private reiniciando = false;
  private botonDeNuevo!: ReturnType<typeof crearBoton>;

  protected construir(): void {
    const piso = this.juego.pisoY;
    crearHabitacion(this.raiz, piso, { piso: '#d8b98f', pared: '#fbe9d0', zocalo: '#e2c9a5' });
    ventana(this.raiz, 2.43, piso + 1.5, -1.2, 0.9, 0.9).rotation.y = -Math.PI / 2;
    sofa(this.juego.assets, this.raiz, piso, piso + 0.45, -1.2, -1.95);
    planta(this.juego.assets, this.raiz, 1.9, piso, -1.9);

    // El álbum completo, pegado en la pared del fondo.
    const fotos = fotosFinal(this.juego.estado);
    fotos.forEach((f, i) => {
      const foto = crearFoto(f, 0.42);
      foto.position.set((i - (fotos.length - 1) / 2) * 0.6, 0.66, PARED_FONDO + 0.02);
      foto.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.05;
      this.raiz.add(foto);
    });

    this.texto = new TextPanel('', { ancho: 1.25, tamano: 0.06, fondo: 'rgba(29,36,51,0.9)', color: '#ffffff', negrita: true, padding: 0.06 });
    this.texto.position.set(0, 0.18, -1.4);
    this.texto.visible = false;
    this.raiz.add(this.texto);

    this.botonDeNuevo = crearBoton(this.juego.inter, t('final.jugarDeNuevo'), {
      ancho: 0.26,
      alto: 0.08,
      color: '#3aa76d',
      onPoke: () => this.reiniciar(),
    });
    this.botonDeNuevo.grupo.position.set(0, -0.06, -0.42);
    this.botonDeNuevo.grupo.rotation.x = -0.5;
    this.botonDeNuevo.grupo.visible = false;
    this.raiz.add(this.botonDeNuevo.grupo);

    this.juego.audio.musica('final');
  }

  async enter(): Promise<void> {
    await super.enter();
    // "Saltar" acelera las frases.
    this.juego.alSaltar = () => (this.apurar = true);
  }

  private async pausa(segundos: number): Promise<void> {
    const t0 = this.apurar ? 0.4 : segundos;
    await this.esperar(t0);
  }

  private reiniciar(): void {
    if (this.reiniciando) return;
    this.reiniciando = true;
    void this.juego.escenas.reiniciar();
  }

  protected async guion(): Promise<void> {
    await this.pausa(1.2);
    const frases = TEXTOS.final.frases;
    this.texto.visible = true;
    for (let i = 0; i < frases.length; i++) {
      this.texto.setTexto(frases.slice(0, i + 1).join('\n\n'));
      if (i === 0) {
        const s = this.texto.scale.clone();
        void this.tweens.run(0.4, (k) => this.texto.scale.set(s.x, s.y * Math.max(0.01, k), 1), ease.out);
      }
      await this.pausa(i === frases.length - 1 ? 5 : 4);
    }

    // Programas de la Ciudad y agradecimiento.
    const programas = TEXTOS.final.programas.map((p) => `• ${p}`).join('\n');
    this.texto.estilo.alinear = 'left';
    this.texto.setTexto(`${t('final.programasTitulo')}\n${programas}\n\n${t('final.gracias')}\n${t('final.creditosModelos')}`);
    this.juego.audio.sfx('exito');
    this.juego.metrics.terminarSesion();
    this.botonDeNuevo.grupo.visible = true;

    if (CONFIG.modoEvento) {
      await this.esperar(CONFIG.tiempos.reinicioEvento);
      this.reiniciar();
    }
  }
}
