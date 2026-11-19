/**
 * 04 Etapa bebé (2 min): biberón, eructo y pañal, y transición con fotos del álbum.
 *  1. Biberón: agarrarlo (mano fantasma desde el segundo 0: es la primera pinza)
 *     y sostenerlo a menos de 12 cm de la boca durante 3 s (barra circular).
 *  2. Eructo: una pinza sobre el bebé y se acomoda solo en el hombro; 3 palmadas.
 *  3. Pañal: el sucio al tacho y el nuevo sobre el bebé; se cierra solo.
 */
import { Group, Object3D, Quaternion, Vector3 } from 'three';
import { NOMBRES_BEBE, PALETAS } from '../content/config';
import { t } from '../content/textos';
import type { DropZone, Grabbable, RubZone } from '../core/Interactable';
import { ease } from '../core/Tweens';
import { mostrarAlbum } from '../game/Album';
import { crearBebe, type Bebe } from '../game/characters';
import { crearHabitacion, cuadro, cuna, mesa, PARED_FONDO, planta, tacho, ventana } from '../game/escenarios';
import { fotosInfancia } from '../game/fotos';
import { pick } from '../game/GameState';
import { heredar } from '../game/inheritance';
import { crearBiberon, crearPanalNuevo, crearPanalSucio, ProgresoCircular, type Biberon } from '../game/objetos';
import { GEO, malla } from '../game/primitivas';
import { coloresHijo } from '../game/textoHerencia';
import { EscenaEtapa } from './EscenaBase';

/** Altura del colchón de la cuna y del cambiador (respecto del pecho). */
const SUPERFICIE = -0.14;
/** Posición del bebé en el hombro, relativa a la cabeza del jugador. */
const HOMBRO = new Vector3(-0.16, -0.32, -0.22);
const ARRIBA = new Vector3(0, 1, 0);
const _a = new Vector3();
const _b = new Vector3();
const _q = new Quaternion();

export class Baby extends EscenaEtapa {
  readonly id = 'bebe';
  private cuarto = new Group();
  private cambiador = new Group();
  private salaAlbum = new Group();
  private bebe!: Bebe;
  /** Grupo que ubica al bebé (acostado en la cuna, en el hombro o en el cambiador). */
  private soporte = new Group();
  private hombro = new Object3D();
  private tiempo = 0;
  private pararLlanto: (() => void) | null = null;
  private pararSuccion: (() => void) | null = null;

  // Biberón
  private biberon!: Biberon;
  private agarreBiberon!: Grabbable;
  private zonaBoca!: DropZone;
  private puntoBiberon = new Object3D();
  private progreso = new ProgresoCircular(0.055);
  private biberonAgarrado = false;
  private enBoca = false;
  private comiendo = 0;
  private alimentado = false;

  // Eructo
  private levantado = false;
  private enHombro = false;
  private palmadas: RubZone | null = null;

  // Pañal
  private panalSucio!: ReturnType<typeof crearPanalSucio>;
  private agarreSucio!: Grabbable;
  private zonaTacho!: DropZone;
  private panalNuevo!: Group;
  private agarreNuevo!: Grabbable;
  private zonaCadera!: DropZone;
  private sucioTirado = false;
  private panalPuesto = false;

  protected construir(): void {
    const { estado } = this.juego;
    // Si se llegó por el modo debug sin pasar por el nacimiento, se sortea un hijo.
    if (!estado.hijo) {
      estado.hijo = heredar(estado.jugador, estado.pareja, PALETAS);
      estado.nombreHijo = pick(NOMBRES_BEBE);
    }
    const piso = this.juego.pisoY;
    crearHabitacion(this.raiz, piso, { piso: '#d9c4a3', pared: '#dceefa', zocalo: '#bcd6ea' });
    ventana(this.raiz, 1.1, piso + 1.5, PARED_FONDO);
    cuadro(this.raiz, -1.2, piso + 1.6, PARED_FONDO, '#ffe08a', 0.4, 0.4);
    planta(this.raiz, -1.9, piso, -1.7);
    this.raiz.add(this.cuarto, this.cambiador, this.salaAlbum, this.hombro, this.progreso.grupo);
    this.cambiador.visible = false;
    this.salaAlbum.visible = false;

    // Cuna con el bebé acostado (cabeza a la izquierda) y la mesada con el biberón.
    cuna(this.cuarto, piso, SUPERFICIE, 0, -0.52);
    mesa(this.cuarto, piso, -0.1, 0.42, -0.38, 0.3, 0.3, '#f4f4f4');
    this.bebe = crearBebe(coloresHijo(estado.hijo));
    this.soporte.add(this.bebe.grupo);
    this.acostar(this.cuarto, new Vector3(0, SUPERFICIE + 0.085, -0.52));
    // Punto donde queda el biberón al dárselo: arriba de la boca.
    this.puntoBiberon.position.set(0, 0.2, 0.2);
    this.bebe.grupo.add(this.puntoBiberon);

    this.biberon = crearBiberon();
    this.biberon.grupo.position.set(0.42, -0.1 + 0.07, -0.38);
    this.cuarto.add(this.biberon.grupo);
    this.agarreBiberon = this.juego.inter.addGrabbable(this.biberon.grupo, {
      onAgarrar: () => (this.biberonAgarrado = true),
    });
    this.zonaBoca = this.juego.inter.addZona(this.puntoBiberon, {
      radio: 0.12,
      acepta: (g) => g === this.agarreBiberon,
      onSoltar: () => (this.enBoca = true),
    });

    this.armarCambiador(piso);
    this.juego.audio.musica('bebe');
  }

  private armarCambiador(piso: number): void {
    const c = this.cambiador;
    mesa(c, piso, SUPERFICIE, 0, -0.5, 0.78, 0.46, '#f2e6d0');
    malla(c, GEO.caja, '#a9d3f0', { pos: [0, SUPERFICIE + 0.015, -0.5], esc: [0.62, 0.03, 0.4] });
    tacho(c, piso, -0.18, 0.42, -0.4);

    this.panalSucio = crearPanalSucio();
    this.panalSucio.grupo.position.set(0.1, SUPERFICIE + 0.04, -0.41);
    c.add(this.panalSucio.grupo);
    this.agarreSucio = this.juego.inter.addGrabbable(this.panalSucio.grupo, { radio: 0.08 });
    const bocaTacho = new Object3D();
    bocaTacho.position.set(0.42, -0.12, -0.4);
    c.add(bocaTacho);
    this.zonaTacho = this.juego.inter.addZona(bocaTacho, {
      acepta: (g) => g === this.agarreSucio,
      onSoltar: () => {
        this.juego.audio.sfx('tacho');
        const g = this.panalSucio.grupo;
        void this.tweens.run(0.3, (k) => g.scale.setScalar(Math.max(0.01, 1 - k)), ease.in).then(() => (g.visible = false));
        this.sucioTirado = true;
      },
    });

    this.panalNuevo = crearPanalNuevo();
    this.panalNuevo.position.set(-0.3, SUPERFICIE + 0.05, -0.36);
    c.add(this.panalNuevo);
    this.agarreNuevo = this.juego.inter.addGrabbable(this.panalNuevo, { radio: 0.08 });
    const cadera = new Object3D();
    cadera.position.set(0.09, SUPERFICIE + 0.13, -0.5);
    c.add(cadera);
    this.zonaCadera = this.juego.inter.addZona(cadera, {
      acepta: (g) => g === this.agarreNuevo,
      onSoltar: () => this.ponerPanal(),
    });
  }

  /** Acuesta al bebé boca arriba con la cabeza hacia la izquierda. */
  private acostar(padre: Group, pos: Vector3): void {
    padre.add(this.soporte);
    this.soporte.position.copy(pos);
    this.soporte.rotation.set(0, Math.PI / 2, 0);
    this.bebe.grupo.rotation.set(-Math.PI / 2, 0, 0);
  }

  // ── Biberón ──

  private terminarComida(): void {
    if (this.alimentado) return;
    this.alimentado = true;
    this.comiendo = 3;
    this.progreso.poner(1);
    this.pararSuccion?.();
    this.juego.audio.sfx('risa');
    this.bebe.llorando(false);
    void this.esperar(0.6).then(() => {
      this.progreso.grupo.visible = false;
      this.agarreBiberon.habilitado = false;
      this.juego.inter.volverACasa(this.agarreBiberon);
    });
  }

  private empezarAComer(): void {
    if (this.pararSuccion || this.alimentado) return;
    this.pararLlanto?.();
    this.pararLlanto = null;
    this.bebe.llorando(false);
    this.pararSuccion = this.juego.audio.iniciarBucle('succion');
    this.progreso.grupo.visible = true;
  }

  // ── Eructo ──

  private levantar(): void {
    if (this.levantado) return;
    this.levantado = true;
    this.raiz.attach(this.soporte);
    const desde = this.soporte.position.clone();
    const qDesde = this.soporte.quaternion.clone();
    const rotBebe = this.bebe.grupo.rotation.x;
    void this.tweens
      .run(0.6, (k) => {
        this.soporte.position.lerpVectors(desde, this.hombro.position, k);
        this.soporte.quaternion.slerpQuaternions(qDesde, new Quaternion(), k);
        this.bebe.grupo.rotation.x = rotBebe * (1 - k);
      })
      .then(() => (this.enHombro = true));
  }

  private crearPalmadas(): void {
    if (this.palmadas) return;
    this.palmadas = this.juego.inter.addFrotable(this.bebe.espalda, {
      modo: 'palmear',
      radio: 0.11,
      meta: 3,
      onProgreso: () => this.juego.audio.sfx('pop'),
      onCompleta: () => {
        this.juego.audio.sfx('eructo');
        void this.esperar(0.7).then(() => this.juego.audio.sfx('risa'));
        this.decir(t('bebe.eructoBien'), this.soporte.position.clone().add(new Vector3(0.2, 0.3, 0)), 2.5, 1.5);
      },
    });
  }

  // ── Pañal ──

  private ponerPanal(): void {
    if (this.panalPuesto) return;
    this.panalPuesto = true;
    this.panalNuevo.visible = false;
    const p = this.bebe.panal;
    p.visible = true;
    const base = p.scale.clone();
    void this.tweens.run(0.4, (k) => p.scale.copy(base).multiplyScalar(1.3 - 0.3 * k), ease.out);
    this.juego.audio.sfx('risa');
  }

  protected tick(dt: number): void {
    this.tiempo += dt;
    // Llanto: la cabeza se mueve un poco.
    this.bebe.cabeza.rotation.z = this.pararLlanto ? Math.sin(this.tiempo * 12) * 0.08 : 0;

    // El hombro sigue a la cabeza del jugador (sin girar con la mirada).
    this.raiz.worldToLocal(this.juego.cabeza(this.hombro.position)).add(HOMBRO);
    if (this.enHombro) this.soporte.position.lerp(this.hombro.position, 1 - Math.exp(-dt * 12));

    this.actualizarBiberon(dt);

    // Olorcito del pañal sucio.
    this.panalSucio.olor.forEach((o, i) => {
      o.position.y = 0.04 + ((this.tiempo * 0.05 + i * 0.03) % 0.09);
      o.position.x = (i - 1) * 0.03 + Math.sin(this.tiempo * 3 + i) * 0.01;
    });
  }

  private actualizarBiberon(dt: number): void {
    const b = this.biberon.grupo;
    const boca = this.bebe.boca.getWorldPosition(_a);
    const tetina = this.biberon.tetina.getWorldPosition(_b);
    const distancia = tetina.distanceTo(boca);
    const sostenido = !!this.agarreBiberon.sostenidoPor;

    // Cerca de la boca, el biberón se inclina solo para que la tetina apunte a la boca.
    if (!this.alimentado && (sostenido || this.enBoca) && distancia < 0.22) {
      const dir = boca.clone().sub(b.getWorldPosition(new Vector3())).normalize();
      const qPadre = b.parent!.getWorldQuaternion(new Quaternion()).invert();
      _q.setFromUnitVectors(ARRIBA, dir.applyQuaternion(qPadre));
      b.quaternion.slerp(_q, 1 - Math.exp(-dt * 10));
    } else if (sostenido) {
      b.quaternion.slerp(new Quaternion(), 1 - Math.exp(-dt * 8));
    }

    if (this.alimentado) return;
    if (distancia < 0.12 || this.enBoca) {
      this.empezarAComer();
      this.comiendo += dt;
      this.progreso.poner(this.comiendo / 3);
      if (this.comiendo >= 3) this.terminarComida();
    }
    if (this.progreso.grupo.visible) {
      this.raiz.worldToLocal(this.progreso.grupo.position.copy(boca));
      this.progreso.grupo.lookAt(this.juego.cabeza());
    }
  }

  protected async guion(): Promise<void> {
    this.bebe.llorando(true);
    this.pararLlanto = this.juego.audio.iniciarBucle('llanto');
    this.curiosidad(t('bebe.curiosidad'));

    // 1. Biberón
    await this.correr({
      id: 'biberon',
      pasos: [
        {
          id: 'agarrar',
          objetivo: t('bebe.agarraBiberon'),
          pista: { tipo: 'agarrar', objetivo: this.biberon.grupo, destino: this.puntoBiberon, desdeCero: true },
          completo: () => this.biberonAgarrado,
          autocompletar: () => {
            this.biberonAgarrado = true;
            this.juego.inter.dejarEnZona(this.agarreBiberon, this.zonaBoca);
          },
        },
        {
          id: 'daselo',
          objetivo: t('bebe.daselo'),
          pista: { tipo: 'agarrar', objetivo: this.biberon.grupo, destino: this.puntoBiberon },
          completo: () => this.alimentado,
          autocompletar: () => {
            if (!this.enBoca && !this.agarreBiberon.volviendo) this.juego.inter.dejarEnZona(this.agarreBiberon, this.zonaBoca);
            this.empezarAComer();
            this.terminarComida();
          },
        },
      ],
    });
    await this.esperar(1);

    // 2. Eructo
    let agarreBebe: Grabbable | null = null;
    await this.correr({
      id: 'eructo',
      pasos: [
        {
          id: 'levantar',
          objetivo: t('bebe.levantalo'),
          pista: { tipo: 'agarrar', objetivo: this.bebe.grupo },
          iniciar: () => {
            agarreBebe = this.juego.inter.addGrabbable(this.soporte, { modo: 'disparar', radio: 0.15, onAgarrar: () => this.levantar() });
          },
          completo: () => this.enHombro,
          autocompletar: () => {
            this.levantar();
            this.enHombro = true;
          },
        },
        {
          id: 'palmear',
          objetivo: t('bebe.palmeale'),
          pista: { tipo: 'palmear', objetivo: this.bebe.espalda },
          iniciar: () => {
            if (agarreBebe) agarreBebe.habilitado = false;
            this.crearPalmadas();
          },
          completo: () => !!this.palmadas?.completa,
          autocompletar: () => {
            this.crearPalmadas();
            this.juego.inter.completarFrotable(this.palmadas!);
          },
        },
      ],
    });
    await this.esperar(2);

    // 3. Pañal (en el cambiador)
    await this.cambiarEstacion(() => {
      this.cuarto.visible = false;
      this.cambiador.visible = true;
      this.enHombro = false;
      this.acostar(this.cambiador, new Vector3(0, SUPERFICIE + 0.03 + 0.085, -0.5));
      this.bebe.panal.visible = false;
    });
    await this.correr({
      id: 'panal',
      pasos: [
        {
          id: 'sucio',
          objetivo: t('bebe.panalSucio'),
          pista: { tipo: 'agarrar', objetivo: this.panalSucio.grupo, destino: this.zonaTacho.objetivo },
          completo: () => this.sucioTirado,
          autocompletar: () => {
            if (!this.agarreSucio.volviendo) this.juego.inter.dejarEnZona(this.agarreSucio, this.zonaTacho);
            this.sucioTirado = true;
          },
        },
        {
          id: 'nuevo',
          objetivo: t('bebe.panalNuevo'),
          pista: { tipo: 'agarrar', objetivo: this.panalNuevo, destino: this.zonaCadera.objetivo },
          completo: () => this.panalPuesto,
          autocompletar: () => {
            if (!this.agarreNuevo.volviendo) this.juego.inter.dejarEnZona(this.agarreNuevo, this.zonaCadera);
            this.ponerPanal();
          },
        },
      ],
    });
    this.mostrarObjetivo(t('bebe.panalListo'));
    await this.esperar(1.5);
    this.finEtapa();

    // 4. Transición: fotos del álbum con el hijo creciendo (10 s).
    await this.cambiarEstacion(() => {
      this.cambiador.visible = false;
      this.salaAlbum.visible = true;
      this.mostrarObjetivo('');
    });
    await mostrarAlbum(this.salaAlbum, fotosInfancia(this.juego.estado), this.tweens, this.juego.audio, 10).listo;
    this.terminar();
  }
}
