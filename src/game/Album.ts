/**
 * Álbum familiar: fotos dibujadas en canvas con los rasgos reales del hijo,
 * para las transiciones entre etapas y el final.
 */
import { CanvasTexture, Group, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from 'three';
import type { AudioManager } from '../core/AudioManager';
import { ease, type Tweens } from '../core/Tweens';

export interface Cara {
  piel: string;
  pelo: string;
  ojos: string;
  /** Tamaño relativo de la cabeza (1 = adulto). */
  tam: number;
  peinado: 'corto' | 'largo' | 'bebe';
}

export interface Foto {
  caras: Cara[];
  titulo: string;
  fondo: string;
}

const ANCHO = 256;
const ALTO = 300;
const PLANO = new PlaneGeometry(1, 1);
PLANO.userData.compartida = true;

/** Dibuja una foto tipo Polaroid. */
export function dibujarFoto(f: Foto): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = ANCHO;
  c.height = ALTO;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fbfaf6';
  ctx.fillRect(0, 0, ANCHO, ALTO);
  ctx.fillStyle = f.fondo;
  ctx.fillRect(14, 14, ANCHO - 28, ANCHO - 28);

  const n = f.caras.length;
  f.caras.forEach((cara, i) => {
    const x = 14 + ((ANCHO - 28) * (i + 1)) / (n + 1);
    const r = (n > 1 ? 34 : 52) * cara.tam;
    const y = ANCHO - 28 - r * 1.25;
    // Hombros
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(x, ANCHO - 14, r * 1.2, r * 0.75, 0, Math.PI, 0);
    ctx.fill();
    // Pelo de atrás (largo)
    ctx.fillStyle = cara.pelo;
    if (cara.peinado === 'largo') {
      ctx.fillRect(x - r * 1.02, y - r * 0.2, r * 2.04, r * 1.6);
    }
    // Cara
    ctx.fillStyle = cara.piel;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    // Pelo de arriba
    ctx.fillStyle = cara.pelo;
    ctx.beginPath();
    if (cara.peinado === 'bebe') {
      ctx.arc(x, y - r * 0.55, r * 0.45, Math.PI, 0);
    } else {
      ctx.arc(x, y - r * 0.1, r * 1.04, Math.PI * 1.02, Math.PI * 1.98);
    }
    ctx.fill();
    // Ojos
    for (const dx of [-0.36, 0.36]) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x + dx * r, y + r * 0.05, r * 0.17, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = cara.ojos;
      ctx.beginPath();
      ctx.arc(x + dx * r, y + r * 0.08, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
    // Cachetes y sonrisa
    ctx.fillStyle = 'rgba(240,120,120,0.35)';
    for (const dx of [-0.6, 0.6]) {
      ctx.beginPath();
      ctx.arc(x + dx * r, y + r * 0.35, r * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#8a3b3b';
    ctx.lineWidth = Math.max(2, r * 0.07);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x, y + r * 0.3, r * 0.3, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  });

  ctx.fillStyle = '#2b2b33';
  ctx.font = '600 26px "Segoe UI", Roboto, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(f.titulo, ANCHO / 2, ANCHO + (ALTO - ANCHO) / 2 - 2);
  return c;
}

export function crearFoto(f: Foto, ancho = 0.3): Mesh {
  const tex = new CanvasTexture(dibujarFoto(f));
  tex.colorSpace = SRGBColorSpace;
  const m = new Mesh(PLANO, new MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
  m.scale.set(ancho, (ancho * ALTO) / ANCHO, 1);
  return m;
}

/**
 * Muestra fotos una por una, como si se pegaran en el álbum.
 * Devuelve el grupo (ya agregado al padre) y una promesa que termina tras `segundos`.
 */
export function mostrarAlbum(
  padre: Group,
  fotos: Foto[],
  tweens: Tweens,
  audio: AudioManager,
  segundos = 10,
): { grupo: Group; listo: Promise<void> } {
  const grupo = new Group();
  padre.add(grupo);
  const n = fotos.length;
  const paso = Math.min(2.2, (segundos - 2) / n);
  const ancho = 0.42;
  const listo = (async () => {
    for (let i = 0; i < n; i++) {
      const foto = crearFoto(fotos[i], ancho);
      const x = (i - (n - 1) / 2) * (ancho + 0.08);
      const rot = (i % 2 === 0 ? 1 : -1) * 0.06;
      foto.position.set(x, 0.32, -1.45);
      foto.rotation.z = rot;
      foto.scale.multiplyScalar(0.01);
      const final = foto.scale.clone().multiplyScalar(100);
      grupo.add(foto);
      audio.sfx('pop');
      await tweens.run(0.45, (t) => foto.scale.copy(final).multiplyScalar(Math.max(0.01, t)), ease.outBack);
      await tweens.wait(paso - 0.45);
    }
    await tweens.wait(Math.max(0, segundos - n * paso));
  })();
  return { grupo, listo };
}
