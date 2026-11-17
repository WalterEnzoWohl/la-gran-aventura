# Prompt para Claude Code — "La Gran Aventura" (juego VR para Meta Quest 2)

> Copiá todo este archivo como primer mensaje a Claude Code, en una carpeta vacía.
> También podés guardarlo en la raíz del proyecto como `CLAUDE.md`, para que Claude Code lo tenga presente en cada sesión.

---

## 1. Qué vamos a construir

Una experiencia de realidad virtual de **8 minutos como máximo** para el **Meta Quest 2**, que corre en el **navegador del Quest (WebXR)** y se juega **solo con las manos (seguimiento de manos), sin controles**.

El jugador forma una familia y acompaña a su hijo en tres etapas: bebé, preadolescente (11 años) y adolescente (16 años). En cada etapa cumple misiones de cuidado. El juego es para la Subsecretaría de Familia y Natalidad del Gobierno de la Ciudad de Buenos Aires y se va a usar en eventos públicos.

Tono: cálido, lúdico y sin culpa. Nunca hay "game over". Todos los textos en pantalla van en **castellano rioplatense** (voseo: "agarrá", "tocá").

## 2. Stack y restricciones técnicas (obligatorias)

- **three.js** (última versión estable) + **TypeScript** + **Vite**.
- **WebXR** con `optionalFeatures: ['hand-tracking', 'local-floor']` y sesión `immersive-vr`.
- Manos: `XRHandModelFactory` de `three/examples/jsm/webxr`. Las uniones se leen desde `XRHand` (`index-finger-tip`, `thumb-tip`, `wrist`, etc.).
- **Sin controles.** Si se detectan controles en vez de manos, mostrar un cartel: "Dejá los controles y mostrá tus manos".
- Servidor de desarrollo con **HTTPS** (`@vitejs/plugin-basic-ssl`), accesible desde la red local (`host: true`), para abrirlo en el Quest con `https://<IP-de-la-PC>:5173`.
- Pruebas en escritorio con **IWER (Immersive Web Emulator)**, cargado solo en desarrollo.
- Tests unitarios con **Vitest** para la lógica pura: herencia, detección de gestos con datos simulados y máquina de escenas.
- **Presupuesto de rendimiento (Quest 2):** 72 fps; menos de 100.000 triángulos y menos de 100 draw calls por escena; sin sombras en tiempo real (usar luz ambiente y hemisférica, o iluminación horneada si hay modelos); texturas de 1024 px como máximo; `renderer.xr.setFoveation(1)`; geometrías y materiales reutilizados.
- **Sin locomoción artificial.** El jugador está quieto, sentado o parado. Entre misiones se pasa de una estación a otra con un fundido a negro o a blanco (300 ms como máximo) y se reubica la escena alrededor del jugador.
- **Arte provisorio:** construir todo con primitivas de three.js (cajas, esferas, cápsulas) y materiales de colores planos. Crear un `AssetLoader` que intente cargar `public/models/<nombre>.glb` y, si no existe, use la versión con primitivas. Así se puede reemplazar el arte más adelante sin tocar código.
- **Audio provisorio:** efectos sintetizados con WebAudio (clic, campanita, "pop"). Cargar música desde `public/audio/` si existe; si no, seguir sin música.

## 3. Arquitectura

```
src/
  main.ts                 // arranque, renderer, botón "Entrar a VR"
  core/
    SceneManager.ts       // máquina de estados de escenas, fundidos, reset
    Fader.ts
    HandTracker.ts        // lee joints por frame, expone posiciones y velocidades
    Gestures.ts           // poke, pinch (con histéresis), release, rub/pat
    Interactable.ts       // Pokeable, Grabbable, DropZone, RubZone
    HintSystem.ts         // mano fantasma a los 10 s, autocompletar a los 30 s
    StageTimer.ts         // tope de 2:15 por etapa: completa solas las misiones restantes
    TextPanel.ts          // paneles de texto (canvas → textura), grandes y legibles
    AudioManager.ts
    Metrics.ts            // registro anónimo de eventos
    AssetLoader.ts
  game/
    GameState.ts          // personajes, rasgos del hijo, nombre, progreso
    inheritance.ts        // lógica pura de herencia (con tests)
    characters/           // fábrica de personajes tintables (adulto, bebé, 11 años, 16 años)
  scenes/
    01_Intro.ts           // tarjeta de datos + botón (hace de tutorial del toque)
    02_Customize.ts
    03_PregnancyBirth.ts  // embarazo, fundido, tarjeta de herencia
    04_Baby.ts            // biberón, eructo, pañal
    05_PreTeen.ts         // tarea, cena, dormir, con reloj hasta las 22:00
    06_Teen.ts            // afeitada, crema, llaves, cine, consejo
    07_Ending.ts          // reflexión, programas, reinicio
  content/
    textos.es.json        // TODOS los textos visibles, editables sin tocar código
    config.ts             // paletas, decisiones abiertas, tiempos, endpoint de métricas
```

Cada escena implementa `enter()`, `update(dt)` y `exit()`. Cada misión es un objeto con `steps[]`, y cada paso tiene una condición de éxito, un texto de objetivo y una pista.

## 4. Sistema de interacción con manos (lo más importante)

Implementar y ajustar con cuidado, porque el seguimiento de manos del Quest 2 tiene ruido:

- **Tocar (poke):** la punta del índice entra en el volumen del botón. El botón se hunde visualmente unos 1 a 2 cm y se activa al llegar al fondo. Rebote: 400 ms. Los botones miden al menos 5 × 5 cm.
- **Agarrar (pinch):** la distancia entre `thumb-tip` e `index-finger-tip` es menor a 1,5 cm para empezar y mayor a 3 cm para soltar (histéresis). Un objeto se agarra si el punto medio de la pinza está dentro de su radio de agarre, de 6 a 8 cm (generoso).
- **Soltar en zona:** si el objeto se suelta a menos de 15 cm de una `DropZone` válida, se anima hasta ahí (snap). Si se suelta en otro lugar, vuelve flotando a su posición original. Nunca cae al piso.
- **Frotar o palmear:** contar entradas de la palma o la punta del índice a una `RubZone` con velocidad mayor a un umbral configurable. Por ejemplo, 3 palmadas o 2 segundos de frotado.
- **Mano perdida:** si una mano deja de seguirse más de 0,5 s mientras sostiene algo, el objeto vuelve a su lugar.
- **Respuesta visual y sonora:** brillo o contorno cuando la mano se acerca a un objeto interactivo; clic al agarrar y al soltar; campanita al completar un paso.
- Todo lo interactivo se ubica a entre 30 y 60 cm adelante del jugador y a la altura del pecho, calculada desde la altura del visor al calibrar.
- Las manos virtuales se tiñen con el tono de piel elegido en la personalización.
- **Botón "Saltar"** siempre visible en la muñeca izquierda (se toca con el índice derecho). Completa el paso actual.

## 5. Escenas y misiones (especificación funcional)

**Presupuesto de tiempo (obligatorio):** 8 minutos como máximo, repartidos así: inicio 1 min, etapa bebé 2 min, etapa preadolescente 2 min, etapa adolescente 2 min y final 1 min.

Reglas para cumplirlo:
- `HintSystem`: mano fantasma a los 10 s sin avance; la misión se completa sola a los 30 s.
- `StageTimer`: cada etapa tiene un tope de 2 min 15 s. Al llegar, las misiones restantes se completan solas (con animación rápida) y se pasa a la siguiente.
- Las curiosidades aparecen como un cartel flotante **mientras** el jugador juega, durante unos 6 s. No hay pausas de lectura.
- Fundidos de 300 ms como máximo.
- En modo debug, mostrar un cronómetro de sesión y de etapa.

### Inicio (1 min)

**01 Intro (unos 15 s).** Una sola tarjeta, con textos de `textos.es.json`:
> En 2014 nacieron 777.012 bebés en Argentina. En 2024, 413.135: casi la mitad. En la Ciudad, la caída fue del 53%.
> Detrás de cada número hay una decisión: empezar una familia. ¿Querés vivirla?

Al pie: "Fuente: UNICEF Argentina con datos de la DEIS – Ministerio de Salud".

Botón grande: **"Iniciar la aventura"**, con una mano fantasma que muestra cómo tocarlo con el índice. Este botón es el tutorial del toque. Al tocarlo, se calibra la altura del jugador.

**02 Personalización (unos 30 s).** Dos personajes frente al jugador: "Vos" y "Tu pareja".
- Los nombres se sortean automáticamente de una lista en `config.ts`. Cada personaje tiene un botón con un dado para volver a sortear. **No hay teclado.**
- Pelo, piel y ojos: 5 muestras de color tocables por rasgo, con paletas en `config.ts`. Arrancan con un valor al azar, así el jugador puede tocar "¡Listo!" de inmediato si quiere.
- El personaje se actualiza en vivo al elegir.

**03 Embarazo y nacimiento (unos 15 s).** La pareja embarazada, con música alegre. Texto: "Tocá la panza". Al tocarla: patadita, sonido y fundido a blanco con llanto de bebé. Se sortean los rasgos (ver sección 6). Tarjeta de 4 s: "¡Nació [nombre]! Sacó el pelo de [nombre] y los ojos de [nombre]."

### Etapa bebé (2 min)

**04 Bebé.** Casa con el bebé en la cuna, llorando. Curiosidad flotante: "Tu bebé ya conoce tu voz: la escuchó durante meses desde la panza."
1. **Biberón (unos 45 s):** "Agarrá el biberón juntando pulgar e índice". Mano fantasma desde el segundo 0, porque es la primera pinza del juego. Después: "Dáselo": sostenerlo a menos de 12 cm de la boca durante 3 s, con barra de progreso circular.
2. **Eructo (unos 25 s):** con una pinza sobre el bebé, se acomoda solo en el hombro del jugador (snap a una posición fija relativa a la cabeza; no usar física). Después, 3 palmadas en la `RubZone` de la espalda. Sonido de eructo gracioso y risa.
3. **Pañal (unos 35 s):** el bebé aparece en el cambiador con el pañal ya abierto. Llevar el pañal sucio al tacho y poner el nuevo sobre el bebé (`DropZone`). El pañal se cierra solo.
4. **Transición (10 s):** fotos del álbum familiar con el hijo creciendo, usando sus rasgos.

### Etapa preadolescente, 11 años (2 min)

**05 Preadolescente.** Reloj de pared que arranca a las 20:30 y llega a las 22:00 justo al tope de la etapa. Curiosidad flotante: "Entre los 6 y los 12 años se recomienda dormir entre 9 y 12 horas."
1. **Tarea (unos 25 s):** el hijo pregunta "¿Cuánto es 3/4 de 20?". Tres tarjetas para tocar (15, 12, 5). Si la respuesta es incorrecta, el hijo dice "Mmm, no creo..." y se reintenta.
2. **Cena (unos 40 s):** poner en el plato verdura y proteína, eligiendo entre 4 alimentos (verdura, proteína, papas fritas, golosina). Si se elige otro, el hijo hace un chiste y el alimento vuelve a la mesada.
3. **Dormir (unos 30 s):** agarrar la tablet y dejarla en el cargador, y tocar el interruptor de la luz.

Si se completa antes de las 22:00: "¡A tiempo!". Si no: el hijo bosteza, "Mañana voy a estar re cansado", y el juego sigue igual. Transición de 10 s con fotos del álbum.

### Etapa adolescente, 16 años (2 min)

**06 Adolescente.** Baño con el hijo de frente (sin espejo real, para ahorrar rendimiento). Curiosidad flotante: "El cerebro adolescente sigue desarrollándose hasta pasados los 20 años. Tu compañía sigue importando."
1. **Afeitada (unos 30 s):** la espuma ya está puesta. Agarrar la máquina y seguir 2 trazos guiados con flechas. Se avanza mientras la máquina esté a menos de 4 cm del trazo.
2. **Crema (unos 15 s):** agarrar el pomo (la crema aparece en la punta del índice) y tocar 2 granitos.
3. **Cine (unos 45 s):** agarrar las llaves del perchero. Fundido. Puerta del cine con luces. El hijo dice: "¿Y si no le gusto?". Elegir un consejo entre 3 tarjetas: "Sé vos mismo", "Respetá siempre lo que el otro quiere", "Cualquier cosa, me llamás". Cada una tiene una respuesta propia del hijo. El hijo camina hacia la cita, se da vuelta y saluda.

### Final (1 min)

**07 Final (unos 45 s).** Living vacío con el álbum completo en la pared. Textos, que aparecen de a uno:
> Criar no es hacerlo perfecto. Es estar.
> Cada familia es una aventura distinta, y ninguna se vive sola.
> La tuya puede empezar cuando vos decidas.

Después, una tarjeta con programas de la Ciudad (contenido provisorio en el JSON) y "¡Gracias por jugar!". **No hay encuesta en el visor.** A los 15 s, reinicio automático a la Intro si está activo el modo evento.

## 6. Herencia (`inheritance.ts`, con tests)

- **Pelo y ojos:** 45% del rasgo del jugador, 45% del de la pareja y 10% "sorpresa" (cualquiera de las 5 opciones). Devolver además el **origen** (`'jugador' | 'pareja' | 'sorpresa'`) para armar la tarjeta.
- **Piel:** mezcla al 50% (interpolación de color) entre los dos tonos elegidos.
- Aceptar una semilla aleatoria opcional para que los tests sean deterministas.

## 7. Configuración de decisiones abiertas (`config.ts`)

```ts
hijoSexo: 'varon' | 'aleatorio'      // predeterminado: 'varon'
quienGesta: 'pareja' | 'elegible'    // predeterminado: 'pareja'
citaVisible: true                    // predeterminado: true (se ve a la chica en la puerta del cine)
nombreBebe: 'sorteado' | 'elegible' // predeterminado: 'sorteado' ('elegible' = 3 sugerencias para tocar, suma unos 10 s)
modoEvento: boolean                  // también se activa con ?evento=1
debug: boolean                       // ?debug=1: teclas 0-9 saltan a una escena, FPS en pantalla
tiempos: { pista: 10, autocompletar: 30, topeEtapa: 135, inicio: 60, final: 60 }  // segundos
metricsEndpoint: ''                  // vacío = solo guardado local
```

## 8. Métricas (`Metrics.ts`)

Eventos anónimos, **sin nombres ni datos personales**: `session_start`, `scene_enter`, `mission_complete {tiempo, pistas, autocompletada}`, `stage_complete {tiempo, topeAlcanzado}`, `session_end {duracionTotal}`. Se guardan en `localStorage` y se envían con POST a `metricsEndpoint` si está configurado y hay conexión. Agregar una página `admin.html` que muestre los totales y exporte un CSV.

## 9. Forma de trabajo

Trabajá **por hitos**. Al final de cada uno, hacé un commit, decime cómo probarlo en el Quest 2 y **esperá mi confirmación** antes de seguir:

1. **Base:** proyecto, HTTPS en red local, entrada a VR, manos visibles, `Gestures` + `Interactable` + `SceneManager` + `Fader`. Incluí una escena de prueba de gestos con un botón, un objeto agarrable, una zona de destino y una zona de frotado.
2. **Escenas 01 a 03** (inicio), con personalización, herencia (con tests) y tarjeta de nacimiento. Deben durar 1 minuto o menos.
3. **Escena 04** (etapa bebé), con `HintSystem` y `StageTimer`. Debe durar 2 minutos o menos.
4. **Escena 05** (preadolescente). Debe durar 2 minutos o menos.
5. **Escenas 06 y 07,** recorrido completo en 8 minutos o menos y modo evento.
6. **Pulido:** mano fantasma final, métricas y `admin.html`, PWA con cache offline (service worker), revisión de rendimiento (draw calls y triángulos por escena en modo debug) y README para el equipo, con: configurar el Quest 2 (activar el seguimiento de manos), servir el juego en un evento sin internet y reemplazar modelos y audio.

Reglas:
- Todos los textos visibles salen de `textos.es.json`.
- Nada interactivo fuera del rango de 30 a 60 cm adelante del jugador.
- Ante la duda entre realismo y robustez del seguimiento de manos, elegí robustez: zonas más grandes, snaps y tolerancias amplias.
- No agregues dependencias pesadas sin consultarme.
- Comentá el código en español.

Empezá por el **hito 1**.
