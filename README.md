# La Gran Aventura

Experiencia de realidad virtual de 8 minutos como máximo para **Meta Quest 2**, de la Subsecretaría de Familia y Natalidad (GCBA). Corre en el navegador del visor (WebXR) y se juega **solo con las manos**: el jugador forma una familia y acompaña a su hijo de bebé, a los 11 y a los 16 años.

**Para jugar:** abrir **https://lgavr.vercel.app** en el navegador del Quest y tocar "Entrar a VR".

La especificación vigente está en [Claude.md](Claude.md).

---

## 1. Configurar cada Quest 2 (una sola vez)

1. **Seguimiento de manos:** *Configuración → Movimiento → Seguimiento de manos* → activado.
2. En la misma pantalla, activar **"Cambio automático entre manos y controles"**. Si alguien agarra los controles, el juego muestra "Dejá los controles y mostrá tus manos".
3. **Límite (Guardian):** modo **estacionario** (alcanza con 1,5 × 1,5 m). Se puede jugar sentado o parado.
4. Abrir el **navegador** del Quest, entrar a `https://lgavr.vercel.app/?evento=1` y guardarlo como **favorito** (o instalarlo como aplicación desde el menú del navegador).
5. Abrirlo una vez con internet: queda guardado para funcionar **sin conexión** (ver la sección 3).

**Luz del lugar:** el seguimiento de manos falla con poca luz o a contraluz. Buscar una luz pareja y evitar ventanas detrás del jugador.

## 2. En el evento

- Usar la dirección con **`?evento=1`**: al terminar, el juego vuelve solo a la intro a los 15 s, listo para la próxima persona. Cada partida es una sesión de métricas distinta.
- Al empezar, la persona toca **"Iniciar la aventura"**: ese toque calibra la altura (mirando al frente, cómoda).
- **Explicación de 20 segundos:** "Tocá con la punta del índice y agarrá juntando pulgar e índice. Si no sabés qué hacer, aparece una mano que te muestra".
- **Si alguien se traba:** a los 10 s aparece la mano fantasma; a los 30 s el paso se completa solo. Cada etapa se corta a los 2:15 y toda la experiencia a los 8 minutos.
- Botón **"Saltar"** en la muñeca izquierda (se toca con el índice derecho): completa el paso actual.
- Para que la fila vea el juego, transmitir el visor a una pantalla (*Compartir → Transmitir* desde el menú del Quest).
- Usar fundas higiénicas y desinfectar el visor entre personas.

| Tramo | Duración |
| --- | --- |
| Inicio (datos, personalización, nacimiento) | ~1 min |
| Etapa bebé | ~2 min (tope 2:15) |
| Etapa preadolescente | ~2 min (tope 2:15) |
| Etapa adolescente | ~2 min (tope 2:15) |
| Final | ~30 s |

## 3. Sin internet

**Opción A: caché del visor (recomendada).** Con internet, abrir `https://lgavr.vercel.app/?evento=1` una vez en cada visor y esperar a que cargue. El juego queda guardado y funciona después sin conexión. Cada vez que se publica una versión nueva, el visor la descarga sola la próxima vez que tenga internet.

**Opción B: una notebook en la misma red Wi-Fi** (por ejemplo, un router o hotspot sin internet):

```bash
npm install        # una sola vez, con internet
npm run build
npm run preview    # sirve el juego por HTTPS en el puerto 4173
```

En el Quest, abrir `https://<IP-de-la-notebook>:4173/?evento=1` (la IP aparece en la consola) y aceptar la advertencia del certificado.

## 4. Métricas

Se registran eventos **anónimos** (sin nombres ni datos personales): inicio y fin de sesión, escenas, cada paso (tiempo, pistas usadas y si se completó solo) y cada etapa (tiempo y si llegó al tope). Se guardan en cada visor.

- Abrir **`https://lgavr.vercel.app/admin.html`** en el navegador del visor: muestra sesiones, tasa de finalización, duración, dificultad por paso y por etapa, y permite **descargar un CSV** o borrar los datos.
- Para centralizarlas, completar `metricsEndpoint` en `src/content/config.ts` con una URL que reciba los eventos por `POST` (JSON). Se envían solos al terminar cada sesión, si hay conexión, o con "Enviar pendientes" en `admin.html`.
- La pregunta sobre los programas de la Ciudad va en un QR a la salida (no hay encuesta en el visor).

## 5. Reemplazar arte, música y textos (sin tocar código)

Después de cada cambio: `npm run build` y publicar (o `git push`, que publica solo en Vercel).

### Modelos 3D

1. Copiar el modelo a `public/models/<nombre>.glb`.
2. Agregar el nombre a `public/models/modelos.json`, por ejemplo `["biberon", "llaves"]`.

Nombres disponibles: `sonajero`, `biberon`, `panalSucio`, `panalNuevo`, `tablet`, `cargador`, `plato`, `verdura`, `proteina`, `papas`, `golosina`, `maquina`, `pomo`, `llaves`.

Convención: en **metros**, +Y hacia arriba, frente hacia +Z y **origen en el centro del objeto** (ahí se mide el radio de agarre). Se recomiendan modelos low-poly CC0 (Kenney, Quaternius) en glTF binario, con texturas de 1024 px como máximo. Si un modelo falta o no carga, se usa la versión con primitivas.

El juego incluye 13 modelos CC0 de Kenney. Los alimentos y el plato vienen de *Food Kit*: `broccoli` → `verdura`, `meat-cooked` → `proteina`, `fries` → `papas`, `lollypop` → `golosina` y `plate` → `plato`. Se ajustaron a metros y comparten `public/models/Textures/colormap.png`. El *Furniture Kit* aporta las plantas, sofás, mesas, escritorio, cama, espejo y perchero. `src/game/escenarios.ts` ajusta los muebles a la altura que se calibra en el visor.

Los kits completos están en `assets_originales/`. El build incluye solo lo que está en `public/` y guarda los GLB y su textura en la caché sin conexión. La cuna, el cambiador y los objetos específicos se completan con primitivas. Los personajes se generan en `src/game/characters/`, con materiales llamados `pelo`, `piel` y `ojos`.

### Música

1. Copiar la pista a `public/audio/<nombre>.mp3`.
2. Agregar el nombre a `public/audio/musica.json`.

Pistas que usa el juego: `intro`, `personalizacion`, `embarazo`, `bebe`, `preadolescente`, `adolescente`, `final`. Sin archivos, el juego sigue sin música. Los efectos (clic, campanita, risa, llanto) son sintetizados; las frases del hijo se muestran como globo de diálogo.

### Textos

**Todos** los textos visibles están en `src/content/textos.es.json`: datos de la intro, objetivos, frases del hijo, consejos, reflexión final y **programas de la Ciudad** (`final.programas`, hoy con contenido provisorio).

### Configuración

En `src/content/config.ts`:

| Opción | Qué hace |
| --- | --- |
| `PALETAS`, `NOMBRES_ADULTOS`, `NOMBRES_BEBE` | Colores de pelo, piel y ojos, y nombres que se sortean |
| `nombreBebe` | `'sorteado'` (predeterminado) o `'elegible'` (3 sugerencias para tocar) |
| `citaVisible` | `true`: se ve a la chica en la puerta del cine; `false`: el hijo entra solo |
| `tiempos` | Pista (10 s), autocompletar (30 s), tope de etapa (135 s), inicio (60 s), sesión máxima (480 s), reinicio en evento (15 s) |
| `manos` | Umbrales de la pinza, radios de agarre y de zonas, recorrido de los botones, velocidad de frotado |
| `metricsEndpoint` | URL para enviar las métricas |

`hijoSexo: 'aleatorio'` y `quienGesta: 'elegible'` todavía no tienen contenido propio (misiones para una hija, elegir quién gesta): por ahora se usa siempre la opción predeterminada.

## 6. Desarrollo

```bash
npm install
npm run dev        # HTTPS en la red local (puerto 5173)
npm test           # tests de la lógica pura (Vitest)
npm run build      # typecheck + build de producción en dist/
```

- **En la PC:** `https://localhost:5173/?debug=1`. Si el navegador no tiene visor, se carga el emulador **IWER** con manos emuladas (solo en desarrollo).
- **Galería 3D:** `https://localhost:5173/personajes.html`. Permite rotar los modelos del juego, acercarse a la cara y probar peinados y colores.
- **En el Quest sin publicar:** misma red Wi-Fi, `https://<IP-de-la-PC>:5173/?debug=1`.
- **`?debug=1`:** FPS, draw calls y triángulos **por ojo**, cronómetros de sesión y de etapa. Teclas **0–6** para saltar de escena (0 intro, 1 personalización, 2 embarazo, 3 bebé, 4 preadolescente, 5 adolescente, 6 final), **S** para "Saltar". En la consola del navegador, una tabla con el máximo por escena.
- **`?prueba=1`:** agrega al principio la escena de prueba de gestos (botón, agarrar, frotar y palmear), útil para ajustar los umbrales de las manos.

### Estructura

```
src/
  main.ts, admin.ts, pwa.ts
  core/      manos (HandTracker), gestos (Gestures), interacción (Interactable), escenas
             (SceneManager), fundidos, mano fantasma, HintSystem, StageTimer, textos 3D,
             audio, métricas, carga de modelos
  game/      estado, herencia, personajes, escenarios, objetos, álbum
  scenes/    00_PruebaGestos, 01_Intro … 07_Ending
  content/   config.ts y textos.es.json
public/      manifest, íconos, models/, audio/
sw-plantilla.js   service worker (lo completa el build)
```

### Rendimiento

Presupuesto en el Quest 2: 72 fps, menos de 100 draw calls y 100.000 triángulos por escena, sin sombras en tiempo real. Máximos medidos por ojo con `?debug=1` antes de incorporar los modelos de Kenney:

| Escena | Draw calls por ojo | Triángulos por ojo |
| --- | --- | --- |
| Intro | 37 | 12.200 |
| Personalización | 79 | 19.600 |
| Embarazo y nacimiento | 40 | 14.800 |
| Bebé | 86 | 19.200 |
| Preadolescente | 83 | 18.100 |
| Adolescente | 80 | 26.800 |
| Final | 32 | 10.300 |

(Máximos de un recorrido completo en el emulador, mano fantasma incluida; conviene confirmarlos en el visor con `?debug=1`.)

**Peor caso de duración** (nadie toca nada): el final empieza a los 6:55 y la sesión termina a los 7:19; en modo evento, el reinicio llega a los ~7:35.
