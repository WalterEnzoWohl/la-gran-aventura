/**
 * Paneles de texto: se dibujan en un canvas y se usan como textura.
 * Pensados para leerse a 1,5 m: letra grande y alto contraste.
 */
import { CanvasTexture, LinearMipmapLinearFilter, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from 'three';

export interface EstiloTexto {
  /** Ancho del panel (m). */
  ancho: number;
  /** Alto de la letra (m). A 1,5 m, 0,05–0,07 se lee cómodo en el Quest 2. */
  tamano: number;
  color?: string;
  /** Color de fondo, o null para fondo transparente. */
  fondo?: string | null;
  padding?: number;
  alinear?: 'left' | 'center';
  negrita?: boolean;
  /** Radio de las esquinas (m). */
  radio?: number;
  interlineado?: number;
  /** Alto mínimo del panel (m). */
  altoMin?: number;
}

const PX_POR_M = 700;
const MAX_PX = 2048;
const FUENTE = '"Segoe UI", Roboto, "Noto Sans", Arial, sans-serif';
const PLANO = new PlaneGeometry(1, 1);

export class TextPanel extends Mesh<PlaneGeometry, MeshBasicMaterial> {
  private canvas = document.createElement('canvas');
  private textura: CanvasTexture;
  texto = '';
  alto = 0;

  constructor(
    texto: string,
    public estilo: EstiloTexto,
  ) {
    const textura = new CanvasTexture(document.createElement('canvas'));
    super(PLANO, new MeshBasicMaterial({ transparent: true, toneMapped: false, depthWrite: false }));
    this.textura = textura;
    this.renderOrder = 10;
    this.setTexto(texto);
  }

  setTexto(texto: string): void {
    this.texto = texto;
    const e = this.estilo;
    const escala = Math.min(PX_POR_M, MAX_PX / e.ancho);
    const pad = (e.padding ?? e.tamano * 0.6) * escala;
    const fontPx = e.tamano * escala;
    const linea = fontPx * (e.interlineado ?? 1.25);
    const fuente = `${e.negrita ? '700' : '500'} ${fontPx}px ${FUENTE}`;

    const ctx = this.canvas.getContext('2d')!;
    ctx.font = fuente;
    const anchoPx = Math.round(e.ancho * escala);
    const lineas = partirLineas(ctx, texto, anchoPx - pad * 2);
    const altoPx = Math.min(MAX_PX, Math.max(Math.round(lineas.length * linea + pad * 2), Math.round((e.altoMin ?? 0) * escala)));

    this.canvas.width = anchoPx;
    this.canvas.height = altoPx;
    ctx.font = fuente;
    ctx.clearRect(0, 0, anchoPx, altoPx);
    if (e.fondo) {
      ctx.fillStyle = e.fondo;
      redondeado(ctx, 0, 0, anchoPx, altoPx, (e.radio ?? 0.03) * escala);
      ctx.fill();
    }
    ctx.fillStyle = e.color ?? '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.textAlign = e.alinear ?? 'center';
    const x = (e.alinear ?? 'center') === 'center' ? anchoPx / 2 : pad;
    const y0 = (altoPx - lineas.length * linea) / 2 + linea / 2;
    lineas.forEach((l, i) => ctx.fillText(l, x, y0 + i * linea));

    // El canvas cambia de tamaño: se recrea la textura.
    this.textura.dispose();
    this.textura = new CanvasTexture(this.canvas);
    this.textura.colorSpace = SRGBColorSpace;
    this.textura.minFilter = LinearMipmapLinearFilter;
    this.textura.anisotropy = 4;
    this.material.map = this.textura;
    this.material.needsUpdate = true;

    this.alto = altoPx / escala;
    this.scale.set(e.ancho, this.alto, 1);
  }

  dispose(): void {
    this.textura.dispose();
    this.material.dispose();
  }
}

function partirLineas(ctx: CanvasRenderingContext2D, texto: string, max: number): string[] {
  const out: string[] = [];
  for (const parrafo of texto.split('\n')) {
    const palabras = parrafo.split(' ');
    let linea = '';
    for (const p of palabras) {
      const prueba = linea ? linea + ' ' + p : p;
      if (ctx.measureText(prueba).width > max && linea) {
        out.push(linea);
        linea = p;
      } else linea = prueba;
    }
    out.push(linea);
  }
  return out;
}

function redondeado(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
