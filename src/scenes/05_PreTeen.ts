/**
 * 05 Etapa preadolescente, 11 años (2 min). Reloj de pared de 20:30 a 22:00,
 * que llega a las 22:00 justo al tope de la etapa.
 *  1. Tarea: "¿Cuánto es 3/4 de 20?", tres tarjetas (15, 12, 5); si se equivoca, se reintenta.
 *  2. Cena: verdura y proteína al plato; papas fritas o golosina vuelven a la mesada con un chiste.
 *  3. Dormir: la tablet al cargador y apagar la luz.
 * Si termina antes de las 22:00, "¡A tiempo!"; si no, el hijo bosteza y el juego sigue igual.
 */
import { Group, Mesh, MeshBasicMaterial, Object3D, Vector3 } from 'three';
import { NOMBRES_BEBE, PALETAS } from '../content/config';
import { t, TEXTOS } from '../content/textos';
import { crearBoton } from '../core/Button';
import type { DropZone, Grabbable } from '../core/Interactable';
import { formatoHora } from '../core/StageTimer';
import { TextPanel } from '../core/TextPanel';
import { mostrarAlbum } from '../game/Album';
import { crearPersona, ROPA, type Persona } from '../game/characters';
import { cama, crearHabitacion, cuadro, mesa, PARED_FONDO, planta, relojPared, ventana } from '../game/escenarios';
import { fotosAdolescencia } from '../game/fotos';
import { pick } from '../game/GameState';
import { heredar } from '../game/inheritance';
import { crearAlimento, crearCargador, crearInterruptor, crearPlato, crearTablet, type Alimento } from '../game/objetos';
import { GEO, malla } from '../game/primitivas';
import { coloresHijo } from '../game/textoHerencia';
import { EscenaEtapa } from './EscenaBase';

/** Altura de las mesas (respecto del pecho). */
const MESA = -0.12;
const INICIO_RELOJ = 20 * 60 + 30;
const FIN_RELOJ = 22 * 60;

export class PreTeen extends EscenaEtapa {
  readonly id = 'preadolescente';
  private escritorio = new Group();
  private cocina = new Group();
  private dormitorio = new Group();
  private salaAlbum = new Group();
  private reloj!: ReturnType<typeof relojPared>;
  private hora!: TextPanel;
  private ultimaHora = '';

  // Tarea
  private hijoTarea!: Persona;
  private tarjetas: ReturnType<typeof crearBoton>[] = [];
  private tareaHecha = false;

  // Cena
  private hijoCena!: Persona;
  private alimentos = new Map<Alimento, Grabbable>();
  private enPlato = new Set<Alimento>();
  private zonaPlato!: DropZone;
  private centroPlato = new Object3D();

  // Dormir
  private tablet!: ReturnType<typeof crearTablet>;
  private agarreTablet!: Grabbable;
  private zonaCargador!: DropZone;
  private tabletCargando = false;
  private interruptor!: ReturnType<typeof crearInterruptor>;
  private luzApagada = false;
  private velador!: Mesh<typeof GEO.esfera, MeshBasicMaterial>;
  /** Dónde va el globo del hijo acostado: lejos de la cara del jugador y fácil de leer. */
  private readonly globoDormitorio = new Vector3(0.12, 0.26, -1.1);

  protected construir(): void {
    const { estado } = this.juego;
    if (!estado.hijo) {
      estado.hijo = heredar(estado.jugador, estado.pareja, PALETAS);
      estado.nombreHijo = pick(NOMBRES_BEBE);
    }
    const piso = this.juego.pisoY;
    crearHabitacion(this.raiz, piso, { piso: '#c9a27c', pared: '#f6e3c9', zocalo: '#d9bf9c' });
    ventana(this.raiz, 1.15, piso + 1.5, PARED_FONDO);
    planta(this.raiz, 1.95, piso, -1.6);
    this.raiz.add(this.escritorio, this.cocina, this.dormitorio, this.salaAlbum);
    this.cocina.visible = this.dormitorio.visible = this.salaAlbum.visible = false;

    // Reloj de pared a la izquierda, con la hora también en números.
    // A la izquierda del cartel de objetivo, para que no se tapen.
    this.reloj = relojPared(this.raiz, -1.3, 0.45, PARED_FONDO + 0.02);
    this.hora = new TextPanel('20:30', { ancho: 0.3, tamano: 0.07, fondo: 'rgba(29,36,51,0.85)', negrita: true });
    this.hora.position.set(-1.3, 0.12, PARED_FONDO + 0.03);
    this.raiz.add(this.hora);

    // El objetivo un poco más arriba, para no tapar la cabeza del hijo.
    this.objetivo.position.y = 0.62;

    this.armarEscritorio(piso);
    this.armarCocina(piso);
    this.armarDormitorio(piso);
    this.juego.audio.musica('preadolescente');
  }

  /** El hijo sentado del otro lado de una mesa, con el pecho justo arriba de la tapa. */
  private sentarHijo(padre: Group, piso: number, z: number): Persona {
    const hijo = crearPersona({ edad: 'once', peinado: 'corto', ...ROPA.once, ...coloresHijo(this.juego.estado.hijo!), pose: 'sentado' });
    const cadera = MESA - 0.24;
    // Cadera de la persona sentada: 0,48 m por la escala de 11 años.
    hijo.grupo.position.set(0, cadera - 0.48 * 0.8, z);
    padre.add(hijo.grupo);
    const asiento = cadera - piso;
    malla(padre, GEO.caja, '#7a5c45', { pos: [0, piso + asiento / 2 - 0.03, z + 0.05], esc: [0.36, asiento - 0.06, 0.34] });
    return hijo;
  }

  /** Posición para el globo de diálogo del hijo: a la derecha de su cabeza. */
  private globo(hijo: Persona): Vector3 {
    const p = this.raiz.worldToLocal(hijo.cabeza.getWorldPosition(new Vector3()));
    return p.add(new Vector3(0.36, 0.1, 0.1));
  }

  // ── 1. Tarea ──
  private armarEscritorio(piso: number): void {
    const g = this.escritorio;
    mesa(g, piso, MESA, 0, -0.62, 0.95, 0.55, '#b98a5e');
    malla(g, GEO.caja, '#ffffff', { pos: [0.05, MESA + 0.006, -0.72], esc: [0.3, 0.012, 0.2], rot: [0, 0.2, 0] });
    malla(g, GEO.caja, '#e04b4b', { pos: [-0.28, MESA + 0.025, -0.75], esc: [0.2, 0.05, 0.15] });
    this.hijoTarea = this.sentarHijo(g, piso, -1.0);

    const respuestas = TEXTOS.preadolescente.respuestas;
    respuestas.forEach((r, i) => {
      const b = crearBoton(this.juego.inter, r, {
        ancho: 0.12,
        alto: 0.09,
        color: '#ffffff',
        colorTexto: '#1d2433',
        tamanoTexto: 0.05,
        onPoke: () => this.responder(r),
      });
      b.grupo.position.set((i - 1) * 0.16, MESA + 0.05, -0.4);
      b.grupo.rotation.x = -0.7;
      g.add(b.grupo);
      this.tarjetas.push(b);
    });
  }

  private responder(r: string): void {
    if (this.tareaHecha) return;
    if (r === TEXTOS.preadolescente.respuestaCorrecta) {
      this.tareaHecha = true;
      this.decir(t('preadolescente.yaEntendi'), this.globo(this.hijoTarea), 2.5);
    } else {
      this.juego.audio.sfx('no');
      this.decir(t('preadolescente.noCreo'), this.globo(this.hijoTarea), 2);
      void this.esperar(2.2).then(() => {
        if (!this.tareaHecha && this.viva) this.decir(t('preadolescente.pregunta'), this.globo(this.hijoTarea), 60);
      });
    }
  }

  // ── 2. Cena ──
  private armarCocina(piso: number): void {
    const g = this.cocina;
    mesa(g, piso, MESA, 0, -0.62, 1.0, 0.6, '#d9d2c5');
    this.hijoCena = this.sentarHijo(g, piso, -1.05);
    const plato = this.juego.assets.vestir(crearPlato(), 'plato');
    plato.position.set(0, MESA + 0.012, -0.5);
    g.add(plato);
    this.centroPlato.position.set(0, MESA + 0.04, -0.5);
    g.add(this.centroPlato);

    const orden: Alimento[] = ['verdura', 'papas', 'proteina', 'golosina'];
    const xs = [-0.34, -0.18, 0.18, 0.34];
    orden.forEach((tipo, i) => {
      const a = this.juego.assets.vestir(crearAlimento(tipo), tipo);
      a.position.set(xs[i], MESA + 0.04, -0.34);
      g.add(a);
      this.alimentos.set(tipo, this.juego.inter.addGrabbable(a, { radio: 0.07 }));
      const etiqueta = new TextPanel(t(`preadolescente.alimentos.${tipo}`), { ancho: 0.15, tamano: 0.02, fondo: 'rgba(255,255,255,0.9)', color: '#1d2433', negrita: true, padding: 0.006 });
      etiqueta.position.set(xs[i], MESA + 0.004, -0.27);
      etiqueta.rotation.x = -Math.PI / 2 + 0.5;
      g.add(etiqueta);
    });

    this.zonaPlato = this.juego.inter.addZona(this.centroPlato, {
      radio: 0.15,
      marcador: plato,
      onSoltar: (g) => this.alPlato(g),
    });
  }

  private tipoDe(g: Grabbable): Alimento | null {
    for (const [tipo, a] of this.alimentos) if (a === g) return tipo;
    return null;
  }

  private alPlato(g: Grabbable): void {
    const tipo = this.tipoDe(g);
    if (!tipo) return;
    if (tipo === 'verdura' || tipo === 'proteina') {
      this.enPlato.add(tipo);
      // Cada cosa en su lado del plato.
      g.obj.position.x += tipo === 'verdura' ? -0.045 : 0.045;
      this.juego.audio.sfx('pop');
      if (this.enPlato.size === 2) this.decir(t('preadolescente.rico'), this.globo(this.hijoCena), 2.5);
      return;
    }
    // Papas fritas o golosina: chiste y vuelve a la mesada.
    this.juego.audio.sfx('no');
    this.decir(t(tipo === 'papas' ? 'preadolescente.chisteFritas' : 'preadolescente.chisteGolosina'), this.globo(this.hijoCena), 2.5);
    g.habilitado = true;
    this.juego.inter.volverACasa(g);
  }

  // ── 3. Dormir ──
  private armarDormitorio(piso: number): void {
    const g = this.dormitorio;
    const colchon = -0.3;
    // Cama de costado: la cabecera a la izquierda y el hijo cerca del borde, al alcance.
    const camaGrupo = new Group();
    camaGrupo.position.set(0, 0, -0.85);
    camaGrupo.rotation.y = Math.PI / 2;
    g.add(camaGrupo);
    cama(camaGrupo, piso, colchon, 0, 0, '#7fb3e0');
    cuadro(g, 0.2, piso + 1.6, PARED_FONDO, '#a7c7e7', 0.5, 0.35);

    // Hijo acostado boca arriba, cabeza a la izquierda.
    const hijo = crearPersona({ edad: 'once', peinado: 'corto', ...ROPA.once, ...coloresHijo(this.juego.estado.hijo!) });
    const acostado = new Group();
    acostado.position.set(0.7, colchon + 0.08, -0.62);
    acostado.rotation.y = Math.PI / 2;
    hijo.grupo.rotation.x = -Math.PI / 2;
    acostado.add(hijo.grupo);
    g.add(acostado);
    // Manta sobre las piernas.
    malla(g, GEO.caja, '#5b8fd1', { pos: [0.35, colchon + 0.1, -0.68], esc: [0.75, 0.08, 0.5] });

    // Tablet en las manos del hijo.
    this.tablet = crearTablet();
    this.juego.assets.vestir(this.tablet.grupo, 'tablet');
    this.tablet.grupo.position.set(-0.1, colchon + 0.26, -0.5);
    this.tablet.grupo.rotation.x = 0.9;
    g.add(this.tablet.grupo);
    this.agarreTablet = this.juego.inter.addGrabbable(this.tablet.grupo, { radio: 0.08 });

    // Mesa de luz con el cargador y el velador, a la derecha.
    mesa(g, piso, -0.1, 0.42, -0.4, 0.3, 0.3, '#a07650');
    const cargador = this.juego.assets.vestir(crearCargador(), 'cargador');
    cargador.position.set(0.42, -0.1 + 0.008, -0.4);
    g.add(cargador);
    const sobreCargador = new Object3D();
    sobreCargador.position.set(0.42, -0.1 + 0.025, -0.4);
    g.add(sobreCargador);
    this.zonaCargador = this.juego.inter.addZona(sobreCargador, {
      acepta: (x) => x === this.agarreTablet,
      marcador: cargador,
      onSoltar: () => this.tabletAlCargador(),
    });
    malla(g, GEO.cilindro, '#e6d3b3', { pos: [0.5, -0.1 + 0.1, -0.5], esc: [0.015, 0.2, 0.015] });
    this.velador = new Mesh(GEO.esfera, new MeshBasicMaterial({ color: '#ffe9a8' }));
    this.velador.scale.setScalar(0.06);
    this.velador.position.set(0.5, -0.1 + 0.22, -0.5);
    g.add(this.velador);

    // Interruptor de la luz en una columnita a la izquierda (al alcance de la mano).
    const columna = -0.45;
    malla(g, GEO.caja, '#f6e3c9', { pos: [-0.42, (piso + 0.05) / 2, columna - 0.06], esc: [0.16, 0.05 - piso, 0.1] });
    this.interruptor = crearInterruptor();
    this.interruptor.grupo.position.set(-0.42, 0.0, columna);
    g.add(this.interruptor.grupo);
    this.juego.inter.addPokeable(this.interruptor.grupo, {
      ancho: 0.08,
      alto: 0.1,
      tapa: this.interruptor.tecla,
      onPoke: () => this.apagarLuz(),
    });
  }

  private tabletAlCargador(): void {
    if (this.tabletCargando) return;
    this.tabletCargando = true;
    this.tablet.grupo.rotation.set(0, 0, 0);
    this.tablet.pantalla.material.color.set('#1d2433');
    this.juego.audio.sfx('pop');
  }

  private apagarLuz(): void {
    if (this.luzApagada) return;
    this.luzApagada = true;
    this.juego.audio.sfx('interruptor');
    this.juego.ajustarLuz(0.3);
    this.velador.material.color.set('#6b6250');
    this.interruptor.tecla.rotation.x = 0.25;
  }

  protected tick(): void {
    // El reloj llega a las 22:00 justo al tope de la etapa.
    const minutos = INICIO_RELOJ + (FIN_RELOJ - INICIO_RELOJ) * this.etapa.fraccion;
    this.reloj.poner(minutos);
    const hora = formatoHora(minutos);
    if (hora !== this.ultimaHora) {
      this.ultimaHora = hora;
      this.hora.setTexto(hora);
    }
  }

  protected async guion(): Promise<void> {
    this.curiosidad(t('preadolescente.curiosidad'));
    this.decir(t('preadolescente.meAyudas'), this.globo(this.hijoTarea), 1.8);
    await this.esperar(1.8);
    this.decir(t('preadolescente.pregunta'), this.globo(this.hijoTarea), 60);

    // 1. Tarea
    await this.correr({
      id: 'tarea',
      pasos: [
        {
          id: 'responder',
          objetivo: t('preadolescente.tarea'),
          pista: { tipo: 'tocar', objetivo: this.tarjetas[0].grupo },
          completo: () => this.tareaHecha,
          autocompletar: () => this.responder(TEXTOS.preadolescente.respuestaCorrecta),
        },
      ],
    });
    await this.esperar(1.5);

    // 2. Cena
    await this.cambiarEstacion(() => {
      this.escritorio.visible = false;
      this.cocina.visible = true;
    });
    const correcto = (tipo: Alimento) => ({
      completo: () => this.enPlato.has(tipo),
      autocompletar: () => {
        const g = this.alimentos.get(tipo)!;
        if (!this.enPlato.has(tipo) && g.habilitado && !g.volviendo) this.juego.inter.dejarEnZona(g, this.zonaPlato);
        else this.enPlato.add(tipo);
      },
    });
    await this.correr({
      id: 'cena',
      pasos: [
        {
          id: 'verdura',
          objetivo: t('preadolescente.cena'),
          pista: { tipo: 'agarrar', objetivo: this.alimentos.get('verdura')!.obj, destino: this.centroPlato },
          ...correcto('verdura'),
        },
        {
          id: 'proteina',
          objetivo: t('preadolescente.cena'),
          pista: { tipo: 'agarrar', objetivo: this.alimentos.get('proteina')!.obj, destino: this.centroPlato },
          ...correcto('proteina'),
        },
      ],
    });
    await this.esperar(1.5);

    // 3. Dormir
    await this.cambiarEstacion(() => {
      this.cocina.visible = false;
      this.dormitorio.visible = true;
    });
    this.decir(t('preadolescente.unMinutoMas'), this.globoDormitorio, 2.5);
    await this.correr({
      id: 'dormir',
      pasos: [
        {
          id: 'tablet',
          objetivo: t('preadolescente.dormirTablet'),
          pista: { tipo: 'agarrar', objetivo: this.tablet.grupo, destino: this.zonaCargador.objetivo },
          completo: () => this.tabletCargando,
          autocompletar: () => {
            if (!this.agarreTablet.volviendo) this.juego.inter.dejarEnZona(this.agarreTablet, this.zonaCargador);
            this.tabletAlCargador();
          },
        },
        {
          id: 'luz',
          objetivo: t('preadolescente.dormirLuz'),
          pista: { tipo: 'tocar', objetivo: this.interruptor.grupo },
          completo: () => this.luzApagada,
          autocompletar: () => this.apagarLuz(),
        },
      ],
    });

    // ¿A tiempo? El reloj llega a las 22:00 justo cuando se alcanza el tope.
    const aTiempo = !this.etapa.alcanzado;
    this.finEtapa();
    const cabeza = this.globoDormitorio;
    if (aTiempo) {
      this.mostrarObjetivo(t('preadolescente.aTiempo'));
      this.juego.audio.sfx('exito');
      this.decir(t('preadolescente.buenasNoches'), cabeza, 2.5);
    } else {
      this.mostrarObjetivo('');
      this.decir(t('preadolescente.cansado'), cabeza, 3, 0.9);
    }
    await this.tweens.wait(3);

    // Transición: fotos del álbum (10 s).
    await this.cambiarEstacion(() => {
      this.dormitorio.visible = false;
      this.salaAlbum.visible = true;
      this.reloj.grupo.visible = false;
      this.hora.visible = false;
      this.mostrarObjetivo('');
      this.juego.ajustarLuz(1);
    });
    await mostrarAlbum(this.salaAlbum, fotosAdolescencia(this.juego.estado), this.tweens, this.juego.audio, this.duracionAlbum).listo;
    this.terminar();
  }
}
