/**
 * 03 Embarazo y nacimiento (unos 15 s): la pareja embarazada; "Tocá la panza".
 * Al tocarla: patadita, sonido y fundido a blanco con llanto. Se sortean los rasgos
 * y se muestra la tarjeta de nacimiento durante 4 s.
 */
import { Group, Mesh, Object3D, Vector3 } from 'three';
import { CONFIG, NOMBRES_BEBE, PALETAS } from '../content/config';
import { t } from '../content/textos';
import { crearBoton } from '../core/Button';
import { TextPanel } from '../core/TextPanel';
import { ease } from '../core/Tweens';
import { crearBebe, crearPersona, estiloAdulto, type Bebe, type Persona } from '../game/characters';
import { crearHabitacion, cuadro, planta, sofa, ventana, PARED_FONDO } from '../game/escenarios';
import { pick } from '../game/GameState';
import { heredar } from '../game/inheritance';
import { GEO, malla, matPropio } from '../game/primitivas';
import { coloresHijo, coloresPersonaje, textoNacimiento } from '../game/textoHerencia';
import { EscenaInicio } from './EscenaBase';

export class PregnancyBirth extends EscenaInicio {
  readonly id = 'embarazo';
  private living = new Group();
  private sala = new Group();
  private pareja!: Persona;
  private bebeNacido: Bebe | null = null;
  /** La panza que se toca: la de la pareja o, si la jugadora es mujer, la propia. */
  private panza!: Mesh;
  /** Panza propia de la jugadora: sigue a su cuerpo, debajo de la cabeza. */
  private panzaPropia: Group | null = null;
  private centroPanza = new Object3D();
  private tocada = false;
  private nombreElegido = false;

  protected construir(): void {
    const piso = this.juego.pisoY;
    this.raiz.add(this.living, this.sala);

    // Living luminoso.
    crearHabitacion(this.living, piso, { piso: '#d8b98f', pared: '#fbe9d0', zocalo: '#e2c9a5' });
    ventana(this.living, -1.1, piso + 1.5, PARED_FONDO, 1.3, 1.0);
    sofa(this.juego.assets, this.living, piso, piso + 0.45, 0.4, -1.95);
    planta(this.juego.assets, this.living, -1.9, piso, -1.6);
    cuadro(this.living, 1.4, piso + 1.65, PARED_FONDO, '#f4a6a6');

    // Gesta la mujer de la pareja (la pareja es siempre un hombre y una mujer).
    const { jugador, pareja } = this.juego.estado;
    const jugadoraEmbarazada = jugador.genero === 'mujer';
    this.pareja = crearPersona({
      edad: 'adulto',
      ...estiloAdulto(pareja.genero),
      ...coloresPersonaje(pareja),
      embarazada: !jugadoraEmbarazada,
    });
    this.living.add(this.pareja.grupo);
    if (jugadoraEmbarazada) {
      // La pareja acompaña un poco más atrás; la panza es la de la jugadora (la ve al mirar hacia abajo).
      this.pareja.grupo.position.set(0.15, piso, -0.95);
      this.panzaPropia = new Group();
      // Torso de la jugadora (para que al mirar hacia abajo vea su cuerpo, no una pelota suelta).
      const ropa = estiloAdulto('mujer');
      malla(this.panzaPropia, GEO.esferaFina, matPropio(ropa.ropa), { pos: [0, 0.2, 0.13], esc: [0.16, 0.24, 0.11] });
      malla(this.panzaPropia, GEO.esferaFina, matPropio(ropa.pantalon), { pos: [0, -0.2, 0.13], esc: [0.15, 0.21, 0.1] });
      this.panza = malla(this.panzaPropia, GEO.esferaFina, matPropio(ropa.ropa), { esc: [0.17, 0.17, 0.19] });
      this.living.add(this.panzaPropia);
      this.ubicarPanzaPropia();
    } else {
      // La pareja de pie frente al jugador: la panza queda al alcance de la mano.
      this.pareja.grupo.position.set(0, piso, -0.62);
      this.panza = this.pareja.panza!;
    }
    this.panza.add(this.centroPanza);

    // Sala blanca del nacimiento (oculta hasta el fundido).
    crearHabitacion(this.sala, piso, { piso: '#f4f4f4', pared: '#ffffff' });
    this.sala.visible = false;

    // El objetivo va al costado: adelante lo taparía la cabeza de la pareja.
    this.objetivo.position.set(0.7, 0.3, -1.25);
    this.objetivo.rotation.y = -0.5;
    this.objetivo.estilo.ancho = 0.7;

    this.juego.audio.musica('embarazo');
  }

  /** Panza propia: debajo de la cabeza de la jugadora, un poco adelante del cuerpo. */
  private ubicarPanzaPropia(): void {
    if (!this.panzaPropia) return;
    this.living.worldToLocal(this.juego.cabeza(this.panzaPropia.position)).add(new Vector3(0, -0.58, -0.17));
  }

  protected tick(dt: number): void {
    this.ubicarPanzaPropia();
    if (this.living.visible) this.pareja.animar(dt);
    this.bebeNacido?.animar(dt);
  }

  /** Patadita: la panza se mueve, suena y aparecen corazones. */
  private async patadita(): Promise<void> {
    const panza = this.panza;
    this.juego.audio.sfx('patadita');
    this.juego.audio.sfx('corazon');
    const base = panza.scale.clone();
    void this.tweens.run(0.5, (k) => {
      const golpe = Math.sin(k * Math.PI) * 0.08;
      panza.scale.set(base.x * (1 + golpe), base.y, base.z * (1 + golpe * 1.5));
    }, ease.linear);
    for (let i = 0; i < 5; i++) {
      const c = malla(this.living, GEO.esfera, '#ff6f91', { esc: 0.018 });
      // Los corazones salen de la panza, un poco hacia el jugador.
      this.living.worldToLocal(panza.getWorldPosition(c.position));
      c.position.add(new Vector3((Math.random() - 0.5) * 0.15, 0.05, 0.12));
      const y0 = c.position.y;
      void this.tweens.run(1.4, (k) => {
        c.position.y = y0 + k * 0.35;
        c.scale.setScalar(0.018 * (1 - k * 0.6));
      }, ease.out).then(() => c.removeFromParent());
      await this.esperar(0.12);
    }
  }

  protected async guion(): Promise<void> {
    this.juego.inter.addTocable(this.centroPanza, {
      radio: 0.2,
      marcador: this.panza,
      onToque: () => {
        if (this.tocada) return;
        this.tocada = true;
        void this.patadita();
      },
    });

    await this.correr({
      id: 'embarazo',
      pasos: [
        {
          id: 'panza',
          objetivo: t('nacimiento.tocaPanza'),
          pista: { tipo: 'tocar', objetivo: this.centroPanza },
          completo: () => this.tocada,
          autocompletar: () => {
            this.tocada = true;
            void this.patadita();
          },
        },
      ],
    });
    await this.esperar(1.2);

    // Nacimiento: fundido a blanco con llanto y sorteo de rasgos.
    const { estado } = this.juego;
    estado.hijo = heredar(estado.jugador, estado.pareja, PALETAS);
    estado.nombreHijo = pick(NOMBRES_BEBE);
    await this.cambiarEstacion(() => {
      this.living.visible = false;
      this.sala.visible = true;
      this.mostrarObjetivo('');
      this.objetivo.position.set(0, 0.45, -1.5);
      this.objetivo.rotation.y = 0;
      this.objetivo.estilo.ancho = 1.2;
    }, 'blanco');
    const pararLlanto = this.juego.audio.iniciarBucle('llanto');
    await this.esperarSiempre(1.6);
    pararLlanto();

    if (CONFIG.nombreBebe === 'elegible') await this.elegirNombre();

    // Fin del inicio: el tope deja de correr y la tarjeta se ve sus 4 s completos.
    this.finEtapa('inicio');
    this.mostrarTarjeta();
    this.juego.audio.sfx('exito');
    await this.esperarSiempre(4);
    this.terminar('blanco');
  }

  /** Variante 'elegible': 3 sugerencias para tocar (suma unos 10 s). */
  private async elegirNombre(): Promise<void> {
    const opciones = [...NOMBRES_BEBE].sort(() => Math.random() - 0.5).slice(0, 3);
    const botones = opciones.map((nombre, i) => {
      const b = crearBoton(this.juego.inter, nombre, {
        ancho: 0.17,
        alto: 0.08,
        color: '#2f7de1',
        onPoke: () => {
          this.juego.estado.nombreHijo = nombre;
          this.nombreElegido = true;
        },
      });
      b.grupo.position.set((i - 1) * 0.2, -0.02, -0.42);
      b.grupo.rotation.x = -0.5;
      this.sala.add(b.grupo);
      return b;
    });
    await this.correr({
      id: 'nombre',
      pasos: [
        {
          id: 'elegir',
          objetivo: t('nacimiento.elegiNombre'),
          pista: { tipo: 'tocar', objetivo: botones[1].grupo },
          completo: () => this.nombreElegido,
          autocompletar: () => (this.nombreElegido = true),
        },
      ],
    });
    for (const b of botones) b.grupo.visible = false;
    this.mostrarObjetivo('');
  }

  private mostrarTarjeta(): void {
    const { estado } = this.juego;
    const tarjeta = new TextPanel(textoNacimiento(estado.nombreHijo, estado.hijo!, estado.jugador, estado.pareja), {
      ancho: 1.2,
      tamano: 0.06,
      fondo: 'rgba(255,240,245,0.97)',
      color: '#3a2a35',
      negrita: true,
      padding: 0.06,
    });
    tarjeta.position.set(0, 0.4, -1.5);
    this.sala.add(tarjeta);

    // El bebé, envuelto en una mantita, al alcance de la vista.
    const manta = new Group();
    manta.position.set(0, -0.12, -0.55);
    this.sala.add(manta);
    malla(manta, GEO.esferaFina, '#bfe0f5', { esc: [0.2, 0.08, 0.16] });
    const bebe = crearBebe(coloresHijo(estado.hijo!));
    this.bebeNacido = bebe;
    bebe.grupo.rotation.set(-Math.PI / 2 + 0.5, 0, 0);
    bebe.grupo.position.set(0, 0.05, 0);
    manta.add(bebe.grupo);
    const s = manta.scale.clone();
    void this.tweens.run(0.5, (k) => manta.scale.copy(s).multiplyScalar(Math.max(0.01, k)), ease.outBack);
  }
}
