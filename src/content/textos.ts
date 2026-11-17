/** Acceso a los textos visibles (todos salen de textos.es.json). */
import textos from './textos.es.json';

export type Textos = typeof textos;
export const TEXTOS: Textos = textos;

/**
 * Devuelve un texto por ruta ("intro.boton") y reemplaza {variables}.
 * Si la ruta no existe, devuelve la ruta entre corchetes para que se note.
 */
export function t(path: string, vars: Record<string, string | number> = {}): string {
  let node: unknown = textos;
  for (const part of path.split('.')) {
    if (node && typeof node === 'object' && part in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return `[${path}]`;
    }
  }
  if (typeof node !== 'string') return `[${path}]`;
  return fill(node, vars);
}

export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}
