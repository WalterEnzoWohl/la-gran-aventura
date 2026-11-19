/**
 * Registro del service worker (solo en el build final): guarda el juego en caché
 * para que funcione sin internet después de abrirlo una vez con conexión.
 */
export function registrarServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((e) => {
      console.warn('[offline] No se pudo registrar el service worker:', e);
    });
  });
}
