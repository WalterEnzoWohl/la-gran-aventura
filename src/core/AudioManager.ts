/**
 * Audio provisorio.
 *  - Efectos sintetizados con WebAudio (clic, campanita, "pop"…): no hay archivos que bajar.
 *  - Música: se carga desde public/audio/<nombre>.mp3 si existe; si no, se sigue sin música.
 * Las grabaciones definitivas se agregan en el hito de pulido sin tocar código.
 */

export type Sfx =
  | 'click' | 'agarrar' | 'soltar' | 'snap' | 'campanita' | 'exito' | 'pop' | 'patadita'
  | 'risa' | 'eructo' | 'toallita' | 'sonajero' | 'interruptor' | 'corazon' | 'llaves'
  | 'no' | 'crema' | 'tacho';

export type Bucle = 'llanto' | 'maquina' | 'succion';

export class AudioManager {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private ruido!: AudioBuffer;
  private bucles = new Map<Bucle, () => void>();
  private musicaActual: { nombre: string; el: HTMLAudioElement } | null = null;
  silencio = false;

  /** Debe llamarse dentro de un gesto del usuario (botón "Entrar a VR"). */
  desbloquear(): void {
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 0.8;
      this.sfxBus.connect(this.master);
      this.ruido = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
      const d = this.ruido.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    void this.ctx.resume();
  }

  private get t(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  private tono(f: number, dur: number, o: { tipo?: OscillatorType; vol?: number; en?: number; hasta?: number; ataque?: number; filtro?: number } = {}): void {
    if (!this.ctx) return;
    const t0 = this.t + (o.en ?? 0);
    const osc = this.ctx.createOscillator();
    osc.type = o.tipo ?? 'sine';
    osc.frequency.setValueAtTime(f, t0);
    if (o.hasta) osc.frequency.exponentialRampToValueAtTime(o.hasta, t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.vol ?? 0.3, t0 + (o.ataque ?? 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let nodo: AudioNode = osc;
    if (o.filtro) {
      const fl = this.ctx.createBiquadFilter();
      fl.type = 'lowpass';
      fl.frequency.value = o.filtro;
      osc.connect(fl);
      nodo = fl;
    }
    nodo.connect(g).connect(this.sfxBus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  private soplo(dur: number, o: { vol?: number; en?: number; f?: number; q?: number; tipo?: BiquadFilterType; hasta?: number } = {}): void {
    if (!this.ctx) return;
    const t0 = this.t + (o.en ?? 0);
    const src = this.ctx.createBufferSource();
    src.buffer = this.ruido;
    const fl = this.ctx.createBiquadFilter();
    fl.type = o.tipo ?? 'bandpass';
    fl.frequency.setValueAtTime(o.f ?? 1500, t0);
    if (o.hasta) fl.frequency.exponentialRampToValueAtTime(o.hasta, t0 + dur);
    fl.Q.value = o.q ?? 1;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.vol ?? 0.3, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(fl).connect(g).connect(this.sfxBus);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + dur + 0.05);
  }

  sfx(nombre: Sfx): void {
    if (!this.ctx || this.silencio) return;
    switch (nombre) {
      case 'click':
        this.tono(1250, 0.06, { tipo: 'triangle', vol: 0.25 });
        break;
      case 'agarrar':
        this.tono(900, 0.05, { tipo: 'square', vol: 0.12, filtro: 2500 });
        this.tono(1400, 0.05, { vol: 0.15, en: 0.03 });
        break;
      case 'soltar':
        this.tono(700, 0.06, { tipo: 'square', vol: 0.1, filtro: 2000 });
        break;
      case 'snap':
        this.tono(660, 0.08, { tipo: 'triangle', vol: 0.25 });
        this.tono(990, 0.12, { tipo: 'triangle', vol: 0.2, en: 0.06 });
        break;
      case 'campanita':
        [1047, 1319, 1568].forEach((f, i) => this.tono(f, 0.9, { vol: 0.22, en: i * 0.09 }));
        break;
      case 'exito':
        [784, 988, 1175, 1568].forEach((f, i) => this.tono(f, 0.7, { tipo: 'triangle', vol: 0.18, en: i * 0.08 }));
        break;
      case 'pop':
        this.tono(500, 0.08, { vol: 0.3, hasta: 1200 });
        break;
      case 'patadita':
        this.tono(95, 0.25, { vol: 0.6, hasta: 40 });
        this.soplo(0.08, { f: 300, vol: 0.15 });
        break;
      case 'risa':
        [820, 760, 880, 720, 840].forEach((f, i) => this.tono(f, 0.11, { tipo: 'triangle', vol: 0.22, en: i * 0.14, hasta: f * 0.8, filtro: 2500 }));
        break;
      case 'eructo':
        this.tono(110, 0.55, { tipo: 'sawtooth', vol: 0.35, hasta: 55, filtro: 500 });
        this.soplo(0.4, { f: 250, vol: 0.12, q: 2 });
        break;
      case 'toallita':
        this.soplo(0.18, { f: 3500, vol: 0.12, q: 0.7, hasta: 2000 });
        break;
      case 'sonajero':
        for (let i = 0; i < 4; i++) this.soplo(0.05, { f: 5000, q: 3, vol: 0.25, en: i * 0.06 });
        break;
      case 'interruptor':
        this.soplo(0.03, { f: 2500, q: 5, vol: 0.4 });
        this.tono(180, 0.04, { tipo: 'square', vol: 0.08, filtro: 800 });
        break;
      case 'corazon':
        this.tono(70, 0.12, { vol: 0.4, hasta: 50 });
        this.tono(70, 0.12, { vol: 0.3, hasta: 50, en: 0.2 });
        break;
      case 'llaves':
        for (let i = 0; i < 5; i++) this.tono(3000 + Math.random() * 2000, 0.05, { tipo: 'triangle', vol: 0.08, en: i * 0.05 });
        break;
      case 'no':
        this.tono(440, 0.15, { vol: 0.2, hasta: 330 });
        break;
      case 'crema':
        this.soplo(0.15, { f: 900, q: 2, vol: 0.15 });
        this.tono(300, 0.1, { vol: 0.1, hasta: 500 });
        break;
      case 'tacho':
        this.soplo(0.25, { f: 600, q: 1, vol: 0.3, hasta: 200 });
        this.tono(150, 0.2, { tipo: 'square', vol: 0.1, filtro: 600 });
        break;
    }
  }

  /** Sonidos en bucle (llanto, máquina de afeitar, bebé tomando). Devuelve cómo frenarlo. */
  iniciarBucle(nombre: Bucle): () => void {
    this.pararBucle(nombre);
    if (!this.ctx) return () => {};
    let vivo = true;
    const tic = () => {
      if (!vivo || !this.ctx || this.silencio) return;
      if (nombre === 'llanto') {
        const base = 430 + Math.random() * 60;
        this.tono(base, 0.9, { tipo: 'sawtooth', vol: 0.12, hasta: base * 1.25, filtro: 1600, ataque: 0.08 });
        this.tono(base * 1.25, 0.5, { tipo: 'sawtooth', vol: 0.1, en: 0.8, hasta: base * 0.85, filtro: 1400, ataque: 0.05 });
      } else if (nombre === 'maquina') {
        this.tono(118, 0.27, { tipo: 'sawtooth', vol: 0.06, filtro: 700, ataque: 0.02 });
      } else {
        this.soplo(0.12, { f: 700, q: 4, vol: 0.12 });
      }
    };
    const periodo = nombre === 'llanto' ? 1600 : nombre === 'maquina' ? 250 : 650;
    tic();
    const id = window.setInterval(tic, periodo);
    const parar = () => {
      vivo = false;
      window.clearInterval(id);
      this.bucles.delete(nombre);
    };
    this.bucles.set(nombre, parar);
    return parar;
  }

  pararBucle(nombre: Bucle): void {
    this.bucles.get(nombre)?.();
  }

  pararTodo(): void {
    for (const parar of [...this.bucles.values()]) parar();
  }

  /** "Voz" provisoria del hijo: sílabas cortas que acompañan el subtítulo. */
  balbuceo(texto: string, tono = 1): void {
    if (!this.ctx || this.silencio) return;
    const silabas = Math.min(8, Math.max(2, Math.round(texto.length / 6)));
    for (let i = 0; i < silabas; i++) {
      const f = (260 + Math.random() * 120) * tono;
      this.tono(f, 0.09, { tipo: 'triangle', vol: 0.14, en: i * 0.11, hasta: f * (0.85 + Math.random() * 0.3), filtro: 1800 });
    }
  }

  /**
   * Música de fondo desde public/audio/<nombre>.mp3. Si el archivo no existe,
   * no suena nada y el juego sigue igual. null = silencio.
   */
  musica(nombre: string | null): void {
    if (this.musicaActual?.nombre === nombre) return;
    const vieja = this.musicaActual;
    this.musicaActual = null;
    if (vieja) fundirYParar(vieja.el);
    if (!nombre) return;
    const el = new Audio(`${import.meta.env.BASE_URL}audio/${nombre}.mp3`);
    el.loop = true;
    el.volume = 0;
    el.play()
      .then(() => fundirVolumen(el, 0.35))
      .catch(() => {
        // No existe el archivo o el navegador no dejó reproducir: seguimos sin música.
      });
    this.musicaActual = { nombre, el };
  }
}

function fundirVolumen(el: HTMLAudioElement, destino: number, ms = 800): void {
  // Con setInterval y no requestAnimationFrame: durante la sesión VR la ventana no recibe cuadros.
  const desde = el.volume;
  const t0 = performance.now();
  const id = window.setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    el.volume = desde + (destino - desde) * k;
    if (k >= 1) window.clearInterval(id);
  }, 50);
}

function fundirYParar(el: HTMLAudioElement): void {
  fundirVolumen(el, 0, 500);
  window.setTimeout(() => el.pause(), 550);
}
