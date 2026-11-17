/**
 * Carga de modelos con reemplazo transparente:
 * intenta `public/models/<nombre>.glb`; si no existe, usa la versión con primitivas.
 * Así el arte final se agrega más adelante sin tocar código.
 */
import { Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class AssetLoader {
  private loader = new GLTFLoader();
  /** null = se probó y no hay archivo. */
  private cache = new Map<string, Promise<Object3D | null>>();

  constructor(private base = import.meta.env.BASE_URL + 'models/') {}

  /**
   * Devuelve el modelo `nombre` o, si no hay .glb, lo que construya `primitivas()`.
   * Cada llamada devuelve una copia independiente.
   */
  async cargar(nombre: string, primitivas: () => Object3D): Promise<Object3D> {
    let p = this.cache.get(nombre);
    if (!p) {
      p = this.intentar(nombre);
      this.cache.set(nombre, p);
    }
    const modelo = await p;
    if (!modelo) return primitivas();
    const copia = modelo.clone(true);
    copia.name = nombre;
    return copia;
  }

  private async intentar(nombre: string): Promise<Object3D | null> {
    const url = this.base + nombre + '.glb';
    try {
      // Vite responde index.html (200) para archivos que no existen: se verifica el tipo.
      const head = await fetch(url, { method: 'HEAD' });
      const tipo = head.headers.get('content-type') ?? '';
      if (!head.ok || tipo.includes('text/html')) return null;
      const gltf = await this.loader.loadAsync(url);
      return gltf.scene;
    } catch {
      return null;
    }
  }
}
