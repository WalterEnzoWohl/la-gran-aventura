/**
 * Escena de prueba del hito 1: un botón, un objeto agarrable, una zona de destino
 * y dos zonas de frotado (frotar 2 s y palmear 3 veces).
 * Sirve para ajustar los umbrales de las manos con el visor puesto.
 */
import {
  CylinderGeometry, DoubleSide, Group, Mesh, MeshLambertMaterial, Object3D, PlaneGeometry, SphereGeometry, TorusGeometry,
} from 'three';
import { t } from '../content/textos';
import { crearBoton, type Boton } from '../core/Button';
import type { Grabbable, DropZone, RubZone } from '../core/Interactable';
import { TextPanel } from '../core/TextPanel';
import { EscenaBase } from './EscenaBase';

export class PruebaGestos extends EscenaBase {
  readonly id = 'prueba';

  private boton!: Boton;
  private toques = 0;
  private contador!: TextPanel;
  private sonajero!: Object3D;
  private agarrable!: Grabbable;
  private canasta!: Group;
  private zona!: DropZone;
  private enCanasta = false;
  private esferaFrotar!: Mesh;
  private frotar!: RubZone;
  private esferaPalmear!: Mesh;
  private palmear!: RubZone;
  private repetir!: Boton;

  protected async construir(): Promise<void> {
    const piso = new Mesh(new PlaneGeometry(6, 6), new MeshLambertMaterial({ color: '#d9cdb8' }));
    piso.rotation.x = -Math.PI / 2;
    piso.position.y = this.juego.pisoY;
    this.raiz.add(piso);

    // Mesa baja para apoyar las cosas, a la altura del pecho.
    const mesa = new Mesh(new CylinderGeometry(0.4, 0.4, 0.03, 32), new MeshLambertMaterial({ color: '#b98a5e' }));
    mesa.position.set(0, -0.09, -0.45);
    this.raiz.add(mesa);

    const titulo = new TextPanel(t('pruebaGestos.titulo'), { ancho: 0.8, tamano: 0.05, fondo: null, color: '#1d2433', negrita: true });
    titulo.position.set(0, 0.62, -1.5);
    this.raiz.add(titulo);

    this.contador = new TextPanel('', { ancho: 0.6, tamano: 0.04, fondo: 'rgba(255,255,255,0.85)', color: '#1d2433' });
    this.contador.position.set(0, 0.2, -1.45);
    this.raiz.add(this.contador);

    // 1) Botón
    this.boton = crearBoton(this.juego.inter, t('pruebaGestos.boton'), {
      ancho: 0.16,
      alto: 0.08,
      color: '#2f7de1',
      onPoke: () => {
        this.toques++;
        this.contador.setTexto(t('pruebaGestos.toques', { n: this.toques }));
      },
    });
    this.boton.grupo.position.set(0, 0.0, -0.4);
    this.boton.grupo.rotation.x = -0.5; // inclinado hacia los ojos
    this.raiz.add(this.boton.grupo);

    // 2) Sonajero + canasta
    this.sonajero = await this.juego.assets.cargar('sonajero', crearSonajero);
    this.sonajero.position.set(-0.15, -0.01, -0.42);
    this.raiz.add(this.sonajero);
    this.agarrable = this.juego.inter.addGrabbable(this.sonajero, {
      onAgarrar: () => this.juego.audio.sfx('sonajero'),
    });

    this.canasta = crearCanasta();
    this.canasta.position.set(0.17, -0.07, -0.42);
    this.raiz.add(this.canasta);
    const centro = new Object3D();
    centro.position.set(0, 0.06, 0);
    this.canasta.add(centro);
    this.zona = this.juego.inter.addZona(centro, {
      marcador: this.canasta,
      onSoltar: () => {
        this.enCanasta = true;
        this.juego.audio.sfx('pop');
      },
    });

    // 3) y 4) Esferas para frotar y palmear
    this.esferaFrotar = new Mesh(new SphereGeometry(0.06, 20, 14), new MeshLambertMaterial({ color: '#5ec8f2' }));
    this.esferaFrotar.position.set(0, 0.0, -0.42);
    this.raiz.add(this.esferaFrotar);
    this.frotar = this.juego.inter.addFrotable(this.esferaFrotar, {
      modo: 'frotar',
      radio: 0.11,
      meta: 2,
      marcador: this.esferaFrotar,
      onProgreso: (s) => this.contador.setTexto(t('pruebaGestos.frotado', { n: s.toFixed(1) })),
      onCompleta: () => this.juego.audio.sfx('pop'),
    });

    this.esferaPalmear = new Mesh(new SphereGeometry(0.06, 20, 14), new MeshLambertMaterial({ color: '#f29a4a' }));
    this.esferaPalmear.position.set(0, 0.0, -0.42);
    this.raiz.add(this.esferaPalmear);
    this.palmear = this.juego.inter.addFrotable(this.esferaPalmear, {
      modo: 'palmear',
      radio: 0.1,
      meta: 3,
      marcador: this.esferaPalmear,
      onProgreso: (n) => {
        this.juego.audio.sfx('pop');
        this.contador.setTexto(t('pruebaGestos.palmadas', { n }));
      },
      onCompleta: () => {},
    });

    this.repetir = crearBoton(this.juego.inter, t('pruebaGestos.repetir'), {
      ancho: 0.2,
      alto: 0.08,
      color: '#3aa76d',
      onPoke: () => void this.juego.escenas.irA(this.id),
    });
    this.repetir.grupo.position.set(0, 0, -0.4);
    this.repetir.grupo.rotation.x = -0.5;
    this.raiz.add(this.repetir.grupo);

    this.mostrarSolo([]);
  }

  /** Muestra solo los objetos del paso actual, para que no se mezclen. */
  private mostrarSolo(objs: Object3D[]): void {
    for (const o of [this.boton.grupo, this.sonajero, this.canasta, this.esferaFrotar, this.esferaPalmear, this.repetir.grupo]) {
      o.visible = objs.includes(o);
    }
    this.contador.visible = false;
  }

  protected async guion(): Promise<void> {
    await this.correr({
      id: 'gestos',
      pasos: [
        {
          id: 'tocar',
          objetivo: t('pruebaGestos.pasoTocar'),
          iniciar: () => this.mostrarSolo([this.boton.grupo]),
          completo: () => this.toques >= 1,
          autocompletar: () => (this.toques = Math.max(1, this.toques)),
        },
        {
          id: 'agarrar',
          objetivo: t('pruebaGestos.pasoAgarrar'),
          iniciar: () => this.mostrarSolo([this.sonajero, this.canasta]),
          completo: () => this.enCanasta,
          autocompletar: () => {
            this.juego.inter.dejarEnZona(this.agarrable, this.zona);
            this.enCanasta = true;
          },
        },
        {
          id: 'frotar',
          objetivo: t('pruebaGestos.pasoFrotar'),
          iniciar: () => {
            this.mostrarSolo([this.esferaFrotar]);
            this.contador.visible = true;
            this.contador.setTexto(t('pruebaGestos.frotado', { n: '0.0' }));
          },
          completo: () => this.frotar.completa,
          autocompletar: () => this.juego.inter.completarFrotable(this.frotar),
        },
        {
          id: 'palmear',
          objetivo: t('pruebaGestos.pasoPalmear'),
          iniciar: () => {
            this.mostrarSolo([this.esferaPalmear]);
            this.contador.visible = true;
            this.contador.setTexto(t('pruebaGestos.palmadas', { n: 0 }));
          },
          completo: () => this.palmear.completa,
          autocompletar: () => this.juego.inter.completarFrotable(this.palmear),
        },
      ],
    });
    this.juego.audio.sfx('exito');
    this.mostrarObjetivo(t('pruebaGestos.listo'));
    this.mostrarSolo([this.repetir.grupo]);
  }
}

function crearSonajero(): Object3D {
  const g = new Group();
  // El origen queda en el centro del sonajero: ahí se mide el radio de agarre.
  const mango = new Mesh(new CylinderGeometry(0.012, 0.012, 0.09, 12), new MeshLambertMaterial({ color: '#f2c14e' }));
  mango.position.y = -0.02;
  g.add(mango);
  const cabeza = new Mesh(new SphereGeometry(0.035, 16, 12), new MeshLambertMaterial({ color: '#e85d75' }));
  cabeza.position.y = 0.045;
  g.add(cabeza);
  const aro = new Mesh(new TorusGeometry(0.038, 0.006, 8, 24), new MeshLambertMaterial({ color: '#7bc96f' }));
  aro.position.y = 0.045;
  g.add(aro);
  return g;
}

function crearCanasta(): Group {
  const g = new Group();
  const cuerpo = new Mesh(new CylinderGeometry(0.09, 0.07, 0.08, 20, 1, true), new MeshLambertMaterial({ color: '#c08a4a', side: DoubleSide }));
  cuerpo.position.y = 0.04;
  g.add(cuerpo);
  const fondo = new Mesh(new CylinderGeometry(0.07, 0.07, 0.008, 20), new MeshLambertMaterial({ color: '#9c6b35' }));
  g.add(fondo);
  const borde = new Mesh(new TorusGeometry(0.09, 0.008, 8, 24), new MeshLambertMaterial({ color: '#9c6b35' }));
  borde.rotation.x = Math.PI / 2;
  borde.position.y = 0.08;
  g.add(borde);
  return g;
}
