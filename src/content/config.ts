/**
 * Configuración general: paletas, nombres, decisiones abiertas, tiempos y métricas.
 * Cada decisión abierta arranca con la opción predeterminada del documento.
 */

const params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');

export interface PaletteOption {
  /** Clave del nombre visible en textos.es.json (rasgos.<rasgo>.<clave>). */
  id: string;
  color: string;
}

export type TraitKey = 'pelo' | 'piel' | 'ojos';

export const PALETAS: Record<TraitKey, PaletteOption[]> = {
  pelo: [
    { id: 'negro', color: '#1f1b1a' },
    { id: 'castanoOscuro', color: '#4a2a17' },
    { id: 'castanoClaro', color: '#93603a' },
    { id: 'rubio', color: '#e2c26c' },
    { id: 'colorado', color: '#b8471f' },
  ],
  piel: [
    { id: 'muyClara', color: '#f7dcc8' },
    { id: 'clara', color: '#e9bb98' },
    { id: 'triguena', color: '#c99067' },
    { id: 'morena', color: '#91603e' },
    { id: 'oscura', color: '#5b3a27' },
  ],
  ojos: [
    { id: 'marronOscuro', color: '#3d2314' },
    { id: 'miel', color: '#a0692a' },
    { id: 'verde', color: '#4f8a3a' },
    { id: 'azul', color: '#3f74c5' },
    { id: 'gris', color: '#7d8a96' },
  ],
};

export type Genero = 'hombre' | 'mujer';

/** Nombres que se sortean para el jugador y la pareja, según el género. */
export const NOMBRES_ADULTOS: Record<Genero, string[]> = {
  mujer: ['Lucía', 'Sofía', 'Valentina', 'Camila', 'Julieta', 'Agustina', 'Micaela', 'Florencia', 'Martina', 'Carolina'],
  hombre: ['Martín', 'Mateo', 'Juan', 'Tomás', 'Lautaro', 'Facundo', 'Nicolás', 'Santiago', 'Federico', 'Diego'],
};

/** Nombres que se sortean (o se ofrecen) para el bebé. */
export const NOMBRES_BEBE = ['Benjamín', 'Thiago', 'Bautista', 'Joaquín', 'Felipe', 'Lorenzo'];

export interface Tiempos {
  /** Segundos sin avance hasta que aparece la mano fantasma. */
  pista: number;
  /** Segundos hasta que un paso se completa solo. */
  autocompletar: number;
  /** Tope de cada etapa jugable (bebé, preadolescente, adolescente). */
  topeEtapa: number;
  inicio: number;
  final: number;
  /** Duración de cada fundido (los dos sumados no superan 300 ms). */
  fundido: number;
  /** Duración máxima de toda la experiencia. Cerca del límite, la etapa en curso se completa sola. */
  sesionMaxima: number;
  /** Segundos que se muestra el cierre antes de reiniciar en modo evento. */
  reinicioEvento: number;
}

export const CONFIG = {
  // ── Decisiones abiertas ────────────────────────────────────────────────
  hijoSexo: 'varon' as 'varon' | 'aleatorio',
  /**
   * La pareja es siempre un hombre y una mujer (el jugador elige su género y la pareja
   * es del otro). Gesta la mujer: si el jugador elige "Mujer", ve su propia panza.
   */
  quienGesta: 'mujer' as const,
  /** true: se ve a la chica en la puerta del cine. */
  citaVisible: true,
  /** 'elegible' = 3 sugerencias para tocar (suma unos 10 s). */
  nombreBebe: 'sorteado' as 'sorteado' | 'elegible',

  // ── Modos ──────────────────────────────────────────────────────────────
  /** Reinicio automático al final. También con ?evento=1. */
  modoEvento: params.get('evento') === '1',
  /** ?debug=1: teclas 0-9 saltan a una escena, FPS y cronómetros en pantalla. */
  debug: params.get('debug') === '1',

  tiempos: { pista: 10, autocompletar: 30, topeEtapa: 135, inicio: 60, final: 60, fundido: 0.15, sesionMaxima: 480, reinicioEvento: 15 } as Tiempos,

  /** URL que recibe los eventos por POST. Vacío = solo guardado local. */
  metricsEndpoint: '',

  // ── Interacción con manos (ajustables en las pruebas con el visor) ─────
  manos: {
    /** Pinza: empieza por debajo de esta distancia entre pulgar e índice (m). */
    pinzaInicio: 0.015,
    /** Pinza: se suelta por encima de esta distancia (m). */
    pinzaSuelta: 0.03,
    /** Mano cerrada: empieza por debajo de este cierre (1,3 = abierta, 0,3 = puño). */
    manoCierraInicio: 0.82,
    /** Mano cerrada: se suelta por encima de este cierre. */
    manoCierraSuelta: 0.97,
    /** Si el índice está más estirado que esto, no es mano cerrada (es señalar o tocar). */
    indiceEstirado: 1.05,
    /** Radio de agarre alrededor del objeto (m). */
    radioAgarre: 0.07,
    /** Radio de las zonas de destino (m). */
    radioZona: 0.15,
    /** Recorrido del botón hasta activarse (m). */
    recorridoBoton: 0.015,
    /** Rebote entre toques del mismo botón (s). */
    rebote: 0.4,
    /** Velocidad mínima para contar una palmada o un frotado (m/s). */
    velocidadFrotado: 0.15,
    /** Tiempo sin seguimiento tras el cual lo agarrado vuelve a su lugar (s). */
    manoPerdida: 0.5,
  },

  /** Altura del pecho respecto de los ojos, para ubicar lo interactivo (m). */
  pechoBajoOjos: 0.4,
};
