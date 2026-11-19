/**
 * Carga de modelos con reemplazo transparente.
 *
 * `public/models/modelos.json` lista los modelos disponibles (por ejemplo ["biberon"]).
 * Al arrancar se precargan `public/models/<nombre>.glb`; cada objeto del juego pide
 * su modelo por nombre y, si no está en la lista, se usa la versión con primitivas.
 * Los muebles de Kenney se ajustan a su estación en escenarios.ts.
 *
 * Convención de los .glb: en metros, +y hacia arriba, el frente hacia +z y el origen
 * en el centro del objeto (ahí se mide el radio de agarre).
 */
import { Mesh, Object3D, type Material, type Texture } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** Nombres de los objetos que se pueden reemplazar por un .glb. */
export const MODELOS_REEMPLAZABLES = [
  'sonajero', 'biberon', 'panalSucio', 'panalNuevo', 'tablet', 'cargador', 'plato',
  'verdura', 'proteina', 'papas', 'golosina', 'maquina', 'pomo', 'llaves',
] as const;

/** Identifica los recursos que el cargador reutiliza entre escenas. */
function marcarCompartidos(modelo: Object3D): void {
  modelo.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.userData.compartida = true;
    const materiales = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as (Material & { map?: Texture | null })[];
    for (const mat of materiales) {
      mat.userData.compartido = true;
      if (mat.map) mat.map.userData.compartida = true;
    }
  });
}

export class AssetLoader {
  private loader = new GLTFLoader();
  private modelos = new Map<string, Object3D>();
  private listo: Promise<void> | null = null;

  constructor(private base = import.meta.env.BASE_URL + 'models/') {}

  /** Lee la lista y precarga los modelos. Si algo falla, se sigue con primitivas. */
  precargar(): Promise<void> {
    if (!this.listo) this.listo = this.cargarTodo();
    return this.listo;
  }

  private async cargarTodo(): Promise<void> {
    let nombres: string[] = [];
    try {
      const res = await fetch(this.base + 'modelos.json', { cache: 'no-cache' });
      if (res.ok) nombres = await res.json();
    } catch {
      return;
    }
    if (!Array.isArray(nombres)) return;
    await Promise.all(
      nombres.map(async (nombre) => {
        try {
          const gltf = await this.loader.loadAsync(this.base + nombre + '.glb');
          marcarCompartidos(gltf.scene);
          this.modelos.set(nombre, gltf.scene);
        } catch (e) {
          console.warn(`[modelos] No se pudo cargar ${nombre}.glb; se usan primitivas.`, e);
        }
      }),
    );
  }

  tiene(nombre: string): boolean {
    return this.modelos.has(nombre);
  }

  /** Copia del modelo `nombre`, o lo que construya `primitivas()` si no hay .glb. */
  modelo(nombre: string, primitivas: () => Object3D): Object3D {
    const m = this.modelos.get(nombre);
    if (!m) return primitivas();
    const copia = m.clone(true);
    copia.name = nombre;
    return copia;
  }

  /**
   * "Viste" un objeto armado con primitivas con su .glb, si existe: saca las mallas
   * directas del grupo y agrega el modelo. Los puntos de referencia (tetina, cabezal…)
   * siguen funcionando porque no son mallas.
   */
  vestir<T extends Object3D>(grupo: T, nombre: string): T {
    const m = this.modelos.get(nombre);
    if (!m) return grupo;
    for (const hijo of [...grupo.children]) if ((hijo as Mesh).isMesh) grupo.remove(hijo);
    grupo.add(m.clone(true));
    return grupo;
  }
}
