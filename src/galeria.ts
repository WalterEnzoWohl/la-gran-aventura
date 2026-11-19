import {
  CanvasTexture, DirectionalLight, Group, HemisphereLight, Mesh, MeshBasicMaterial,
  PerspectiveCamera, PlaneGeometry, Scene, SRGBColorSpace, Vector3, WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { t } from './content/textos';
import { crearBebe, crearPersona, estiloAdulto, ROPA, tenir, type Colores, type Peinado } from './game/characters';
import { materialPersonaje, perfil } from './game/characters/formas';
import { malla } from './game/primitivas';
import { liberar } from './scenes/EscenaBase';
import './galeria.css';

const id = <T extends HTMLElement>(nombre: string) => document.getElementById(nombre)! as T;
const etapa = ['adulto', 'adulta', 'bebe', 'once', 'dieciseis'] as const;
type Etapa = typeof etapa[number];
type PeinadoGaleria = Exclude<Peinado, 'bebe'>;
type Modelo = ReturnType<typeof crearPersona> | ReturnType<typeof crearBebe>;
const colores: Colores = { piel: '#cf9872', pelo: '#4d2d23', ojos: '#497750' };
const escenario = id('escenario');

for (const [elemento, clave] of [
  ['titulo', 'titulo'], ['volver', 'volver'], ['personaje-leyenda', 'personaje'],
  ['rasgos-leyenda', 'rasgos'], ['peinado-titulo', 'peinado'], ['ayuda', 'ayuda'],
  ['completo', 'completo'], ['rostro', 'rostro'],
]) id(elemento).textContent = t('galeria.' + clave);
document.title = `${t('galeria.titulo')} · ${t('general.titulo')}`;

function iniciar(): void {
  const scene = new Scene();
  const camara = new PerspectiveCamera(35, 1, 0.02, 30);
  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  escenario.append(renderer.domElement);

  const luz = new DirectionalLight('#fff3df', 1.45);
  luz.position.set(-2, 3, 3);
  const contraluz = new DirectionalLight('#e4f1ff', 0.65);
  contraluz.position.set(1, 2, -3);
  scene.add(new HemisphereLight('#fff9ed', '#84776b', 1.85), luz, contraluz);
  const soporte = new Group();
  scene.add(soporte);
  malla(scene, perfil([[-0.111, 0.01, 0.01], [-0.1, 0.48, 0.48], [-0.08, 0.51, 0.51], [-0.019, 0.51, 0.51], [0, 0.479, 0.479], [0, 0.001, 0.001]]), materialPersonaje('#efe0c7'));

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const sombra = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  sombra.addColorStop(0, 'rgba(61,45,34,0.28)');
  sombra.addColorStop(1, 'rgba(61,45,34,0)');
  ctx.fillStyle = sombra;
  ctx.fillRect(0, 0, 128, 128);
  const sombraTextura = new CanvasTexture(canvas);
  sombraTextura.colorSpace = SRGBColorSpace;
  const piso = new Mesh(new PlaneGeometry(0.7, 0.42), new MeshBasicMaterial({ map: sombraTextura, transparent: true, depthWrite: false }));
  piso.position.y = 0.002;
  piso.rotation.x = -Math.PI / 2;
  scene.add(piso);

  const orbit = new OrbitControls(camara, renderer.domElement);
  orbit.enablePan = false;
  orbit.enableDamping = true;
  orbit.minPolarAngle = 0.4;
  orbit.maxPolarAngle = Math.PI * 0.58;
  orbit.minDistance = 0.38;
  orbit.maxDistance = 7;

  const selector = id<HTMLSelectElement>('peinado');
  const botones = new Map<Etapa, HTMLButtonElement>();
  const completo = id<HTMLButtonElement>('completo');
  const rostro = id<HTMLButtonElement>('rostro');
  const centro = new Vector3();
  let actual: Etapa = 'adulto';
  let modelo: Modelo;

  function encuadre(cara: boolean): void {
    const alto = 'altura' in modelo ? modelo.altura : 0.56;
    const y = cara ? modelo.cabeza.getWorldPosition(centro).y : alto * 0.5 - 0.03;
    const distancia = cara ? (actual === 'bebe' ? 0.53 : 0.68) : (alto * 1.04 + 0.28) / (2 * Math.tan(Math.PI * 35 / 360));
    orbit.target.set(0, y, 0);
    camara.position.set(distancia * 0.22, y + distancia * 0.06, distancia);
    orbit.update();
    completo.setAttribute('aria-pressed', String(!cara));
    rostro.setAttribute('aria-pressed', String(cara));
  }

  function armar(actualizarPeinado = true): void {
    const adulto = actual === 'adulto' || actual === 'adulta';
    const estilo = estiloAdulto(actual === 'adulta' ? 'mujer' : 'hombre');
    const peinados: PeinadoGaleria[] = actual === 'adulta' ? ['largo', 'melena', 'rulos'] : ['corto', 'raya', 'rulos'];
    if (actualizarPeinado) {
      selector.replaceChildren(...peinados.map((p) => new Option(t('galeria.peinados.' + p), p)));
      id('fila-peinado').hidden = actual === 'bebe';
    }
    if (modelo) {
      soporte.remove(modelo.grupo);
      liberar(modelo.grupo);
    }
    if (actual === 'bebe') {
      modelo = crearBebe(colores);
      modelo.grupo.position.y = 0.24;
    } else {
      modelo = crearPersona({
        ...colores,
        ...(adulto ? estilo : ROPA[actual === 'once' ? 'once' : 'dieciseis']),
        edad: adulto ? 'adulto' : actual === 'once' ? 'once' : 'dieciseis',
        peinado: selector.value as PeinadoGaleria,
      });
    }
    soporte.add(modelo.grupo);
    for (const [nombre, boton] of botones) boton.setAttribute('aria-pressed', String(nombre === actual));
    if (actualizarPeinado) encuadre(false);
  }

  for (const edad of etapa) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.textContent = t('galeria.' + edad);
    boton.addEventListener('click', () => {
      actual = edad;
      armar();
    });
    botones.set(edad, boton);
    id('personajes').append(boton);
  }
  for (const rasgo of ['piel', 'pelo', 'ojos'] as const) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'color';
    input.value = colores[rasgo];
    input.addEventListener('input', () => {
      colores[rasgo] = input.value;
      tenir(modelo.grupo, { [rasgo]: colores[rasgo] });
    });
    label.append(t('personalizacion.' + rasgo), input);
    id('rasgos').append(label);
  }
  selector.addEventListener('change', () => armar(false));
  completo.addEventListener('click', () => encuadre(false));
  rostro.addEventListener('click', () => encuadre(true));
  armar();

  new ResizeObserver(() => {
    const { clientWidth: ancho, clientHeight: alto } = escenario;
    if (!ancho || !alto) return;
    camara.aspect = ancho / alto;
    camara.updateProjectionMatrix();
    renderer.setSize(ancho, alto, false);
  }).observe(escenario);
  let anterior = 0;
  renderer.setAnimationLoop((tiempo) => {
    modelo.animar(Math.min(0.05, (tiempo - anterior) / 1000));
    anterior = tiempo;
    orbit.update();
    renderer.render(scene, camara);
  });
}

try {
  iniciar();
} catch (error) {
  const aviso = document.createElement('p');
  aviso.textContent = t('galeria.sinWebGL');
  escenario.append(aviso);
  console.error(error);
}
