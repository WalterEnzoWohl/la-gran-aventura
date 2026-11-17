/**
 * Arranque: renderer, botón "Entrar a VR" y, solo en desarrollo, el emulador IWER
 * para probar las manos en la PC.
 */
import { CONFIG } from './content/config';
import { t } from './content/textos';
import { Juego } from './core/Juego';
import { definirEscenas } from './scenes';

async function cargarEmuladorSiHaceFalta(): Promise<unknown> {
  // Solo en desarrollo: en el build final este bloque no se incluye.
  if (!import.meta.env.DEV) return null;
  const nativo = navigator.xr ? await navigator.xr.isSessionSupported('immersive-vr').catch(() => false) : false;
  if (nativo) return null;
  const { XRDevice, metaQuest2 } = await import('iwer');
  const dispositivo = new XRDevice(metaQuest2);
  // Chrome y Edge exponen navigator.xr aunque no haya visor: se reemplaza por el emulado.
  dispositivo.installRuntime({ forceInstall: true });
  dispositivo.primaryInputMode = 'hand';
  const { DevUI } = await import('@iwer/devui');
  new DevUI(dispositivo);
  console.info('[La Gran Aventura] Emulador IWER cargado (solo desarrollo).');
  return dispositivo;
}

async function iniciar(): Promise<void> {
  document.title = t('general.titulo');
  const titulo = document.getElementById('titulo')!;
  const boton = document.getElementById('entrar') as HTMLButtonElement;
  const mensaje = document.getElementById('mensaje')!;
  titulo.textContent = t('general.titulo');
  boton.textContent = t('general.entrarVR');

  const emulador = await cargarEmuladorSiHaceFalta();

  const juego = new Juego(document.getElementById('app')!, definirEscenas);
  juego.iniciarVistaPrevia();
  // En modo debug, acceso desde la consola (y para las pruebas automáticas con el emulador).
  if (CONFIG.debug) Object.assign(window, { __lga: { juego, emulador } });

  const soportado = navigator.xr ? await navigator.xr.isSessionSupported('immersive-vr').catch(() => false) : false;
  if (!soportado) {
    boton.hidden = true;
    mensaje.textContent = t('general.sinWebXR');
    return;
  }
  boton.hidden = false;
  boton.addEventListener('click', async () => {
    boton.disabled = true;
    try {
      await juego.entrarVR();
    } catch (e) {
      mensaje.textContent = String(e);
    } finally {
      boton.disabled = false;
    }
  });
  juego.renderer.xr.addEventListener('sessionstart', () => document.body.classList.add('en-vr'));
  juego.renderer.xr.addEventListener('sessionend', () => document.body.classList.remove('en-vr'));
}

void iniciar();
