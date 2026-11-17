# La Gran Aventura — Documento de diseño del juego VR

Nov 17, 2026 · @DatosUltron

## Resumen del concepto

La Gran Aventura es una experiencia VR de 12 a 15 minutos para Meta Quest 2. El jugador forma una familia y acompaña a su hijo desde que nace hasta su primera cita, usando solo sus manos, sin controles.

| Aspecto | Definición |
| --- | --- |
| Público | Jóvenes y adultos de 18 a 40 años en eventos, ferias y espacios comunitarios del GCBA |
| Duración | 12 a 15 minutos por persona |
| Equipo | Meta Quest 2 (los equipos de la Subsecretaría) |
| Interacción | Detección de manos únicamente: tocar, agarrar, soltar y frotar |
| Postura | Sentado o parado, en un espacio de 1,5 × 1,5 m, sin desplazamiento artificial |
| Objetivo | Que el jugador viva la crianza como un desafío posible, compartido y con momentos felices |
| Ejes institucionales | Eje 1 (familia, natalidad y crianza), Eje 6 (corresponsabilidad) y Eje 2 (hábitos saludables) |

La estructura tiene tres etapas jugables (bebé, preadolescente y adolescente). Antes van una intro con datos, la creación de los personajes y el embarazo. Al final hay una reflexión y una encuesta breve dentro del visor.

## Mensaje y tono

El juego tiene que invitar, no reprochar: criar tiene desafíos, se puede, se comparte y tiene momentos muy lindos. Un dato que suene a reproche ("solo X parejas se animan") puede generar rechazo, sobre todo en jóvenes.

Criterios de tono:

- **Cálido y lúdico.** Humor suave en las misiones (el pañal, el eructo, la primera afeitada). Nunca hay "game over".
- **Sin culpa.** Si el jugador se demora o se equivoca, el hijo reacciona con humor y el juego sigue.
- **Corresponsabilidad.** El jugador hace todas las tareas de cuidado, sea quien sea. Eso refuerza el mensaje del Eje 6: en Argentina las mujeres dedican más tiempo al cuidado que los varones, aun cuando trabajan ([ENUT 2021, INDEC](https://chequeado.com/el-explicador/los-nacimientos-cayeron-casi-50-en-10-anos-como-cambio-la-maternidad-en-argentina-y-que-desafios-plantea/)).
- **Datos reales y con fuente.** Cada cifra que aparece en pantalla está verificada (ver Textos).
- **Esperanza al final.** La reflexión cierra con que cada familia es distinta y con los apoyos que ofrece la Ciudad.

## Flujo completo

Son 11 escenas lineales, de unos 13 minutos en total. El jugador nunca camina: cuando termina una misión, la pantalla funde y lo ubica en la estación siguiente.

| # | Escena | Qué pasa | Interacción con las manos | Duración aprox. |
| --- | --- | --- | --- | --- |
| 0 | Tutorial de manos | Sala neutra. Una guía en texto enseña a tocar un botón y a agarrar un sonajero | Tocar (dedo índice) y agarrar (pinza) | 45 s |
| 1 | Datos de apertura | Tres tarjetas con datos de natalidad y una pregunta-invitación. Botón "Iniciar la aventura" | Tocar | 30 s |
| 2 | Creación de personajes | Dos maniquíes frente al jugador: él y su pareja. Nombre, pelo, piel y ojos (5 opciones cada uno). Las manos del jugador toman el color de piel elegido | Tocar muestras de color y teclado grande, o botón "nombre al azar" | 90 s |
| 3 | Embarazo | Living luminoso, la pareja embarazada, música alegre. El jugador apoya la mano en la panza y siente una patadita (animación y sonido) | Tocar | 25 s |
| 4 | Nacimiento | Fundido a blanco con llanto de bebé. Tarjeta de herencia: "Sacó el pelo de Lucía y los ojos de Martín" | Ninguna | 15 s |
| 5 | Bebé: biberón | Casa, bebé en la cuna, curiosidad en pantalla. El bebé llora. Buscar el biberón en la mesada, probar la temperatura en la muñeca y dárselo | Agarrar, acercar a la muñeca, sostener cerca de la boca 4 s | 75 s |
| 6 | Bebé: eructo | Levantar al bebé: se acomoda solo en el hombro. Palmear la espalda 3 veces | Agarrar y palmear con la otra mano | 40 s |
| 7 | Bebé: pañal | Cambiador: abrir las tiras, tirar el pañal sucio al tacho, pasar la toallita, poner el pañal nuevo y cerrar las tiras | Pinza, soltar sobre una zona, frotar | 90 s |
| 8 | Preadolescente (11 años) | Transición con fotos del álbum familiar. Reloj en la pared: 19:30. Tres misiones antes de las 22:00: tarea, cena y dormir | Tocar respuestas, agarrar ingredientes, apagar la tablet y la luz, tapar con la manta | 3 min |
| 9 | Adolescente (16 años) | Baño con espejo: espuma, afeitada guiada y crema para el acné. Después, llaves del auto, fundido y llegada al cine. Elegir un consejo; el hijo va a su primera cita y saluda desde la puerta | Agarrar, seguir trazos, tocar zonas, tocar una frase | 3 min |
| 10 | Reflexión y encuesta | Living vacío con el álbum completo. Texto final, programas de la Ciudad y dos preguntas de 1 a 5 | Tocar | 60 s |

**Regla de ayuda:** si el jugador no avanza en 20 segundos, aparece una mano fantasma que muestra el gesto. A los 60 segundos, la misión se completa sola para no trabar la fila del evento.

## Mecánicas con detección de manos

El juego usa solo cuatro gestos, porque el seguimiento de manos del Quest 2 pierde precisión cuando las manos se tapan entre sí, salen del campo de las cámaras o se mueven rápido.

| Gesto | Cómo se detecta | Se usa para |
| --- | --- | --- |
| Tocar | La punta del índice entra en el volumen de un botón | Botones, muestras de color, respuestas, interruptor de luz, panza |
| Agarrar (pinza) | Pulgar e índice a menos de 2 cm cerca de un objeto agarrable | Biberón, pañal, ingredientes, espuma, máquina de afeitar, llaves |
| Soltar | Se separan los dedos. Si el objeto está cerca de una zona de destino, se acomoda solo | Tacho, plato, cargador, cambiador |
| Frotar o palmear | La mano entra varias veces en una zona con cierta velocidad | Toallita, palmadas del eructo, crema, espuma |

**Reglas de diseño para Quest 2:**

- Todo lo interactivo está entre 30 y 60 cm adelante del jugador y a la altura del pecho. No hay nada a los costados ni atrás.
- Los objetivos miden al menos 5 cm y las zonas de destino son generosas y magnéticas.
- No hay gestos con las dos manos superpuestas. El bebé se "pega" a los brazos o al hombro en vez de sostenerse con física.
- Nada exige girar la muñeca con precisión.
- Cada objeto agarrable brilla cuando la mano se acerca, y se escucha un clic al agarrar y al soltar.
- Si se pierde la mano, el objeto vuelve a su lugar con suavidad, sin caerse al piso.
- La afeitada se resuelve con tres trazos guiados por flechas: se avanza mientras la máquina siga el trazo con tolerancia amplia.
- Para eventos se recomienda luz ambiente pareja: el seguimiento de manos falla con poca luz o contraluz.

## Sistema de herencia

El hijo hereda cada rasgo con una regla simple y lúdica, no genética real. La tarjeta del nacimiento lo cuenta con nombres ("Sacó los ojos de Lucía"), no con porcentajes.

| Rasgo | Regla | Por qué |
| --- | --- | --- |
| Pelo | 45% del jugador, 45% de la pareja, 10% "sorpresa de los abuelos" (cualquiera de las 5 opciones) | La sorpresa genera charla y rejugabilidad |
| Ojos | La misma regla que el pelo | Simple y parejo |
| Piel | Tono intermedio entre los dos elegidos. Si ambos eligieron el mismo, se mantiene | Más creíble y evita resultados que se lean como chiste |

Los rasgos se sortean una sola vez, al nacer, y se mantienen en las tres edades y en las fotos del álbum. Las 5 opciones de cada rasgo son paletas fijas (por ejemplo, pelo: negro, castaño oscuro, castaño claro, rubio y colorado). Así, el tono intermedio de piel se calcula como una mezcla entre dos colores.

## Textos

La intro abre con datos oficiales de nacimientos. El dato de "cuántas parejas deciden tener un hijo" no existe como cifra oficial directa, así que se reemplaza por la caída de nacimientos, que sí está medida.

**Tarjetas de apertura** (fuente: UNICEF Argentina con datos de la DEIS, Ministerio de Salud, [vía Chequeado](https://chequeado.com/el-explicador/los-nacimientos-cayeron-casi-50-en-10-anos-como-cambio-la-maternidad-en-argentina-y-que-desafios-plantea/)):

1. "En 2014 nacieron 777.012 bebés en Argentina. En 2024, 413.135: casi la mitad."
2. "En la Ciudad de Buenos Aires, los nacimientos cayeron 53% en diez años."
3. "Detrás de cada número hay una decisión: empezar una familia. ¿Querés vivirla por unos minutos?" → botón **Iniciar la aventura**

**Curiosidades por etapa** (a validar por un equipo pediátrico antes de publicar):

| Etapa | Texto propuesto |
| --- | --- |
| Bebé | "Tu bebé ya conoce tu voz: la escuchó durante meses desde la panza." |
| Bebé (alternativa) | "Al nacer, tu bebé ve mejor a 20 o 30 cm: justo la distancia hasta tu cara cuando lo alimentás." |
| Preadolescente | "Entre los 6 y los 12 años se recomienda dormir entre 9 y 12 horas. Por eso la misión termina a las 22." |
| Preadolescente (alternativa) | "Las comidas compartidas en familia ayudan a formar hábitos de alimentación saludables." |
| Adolescente | "El cerebro adolescente sigue desarrollándose hasta pasados los 20 años. Tu compañía sigue importando." |

**Frases del hijo** (cortas, con subtítulo): "¡Ya entendí!", "¿Me ayudás?", "¡Un minuto más!", "¿Y si no le gusto?".

**Consejos para elegir antes de la cita:** "Sé vos mismo", "Respetá siempre lo que el otro quiere", "Cualquier cosa, me llamás". Los tres son válidos y cada uno tiene una reacción distinta del hijo.

**Reflexión final:**

> Criar no es hacerlo perfecto. Es estar. Cada familia es una aventura distinta, y ninguna se vive sola. La tuya puede empezar cuando vos decidas.

Después aparece una tarjeta con los programas de acompañamiento a familias de la Ciudad (contenido a completar por la Subsecretaría).

## Arte, sonido y accesibilidad

El estilo es *low-poly* estilizado y colorido, con personajes de formas redondeadas y sin caras realistas. Es lo que mejor rinde en Quest 2 y evita el efecto inquietante de un bebé "casi real".

**Arte**

- Personajes con materiales teñibles: pelo, piel y ojos son colores, no texturas distintas. Así la personalización y la herencia salen casi gratis.
- Hacen falta tres versiones del hijo: bebé, 11 años y 16 años.
- Escenarios: living, cocina con cuna, cambiador, cuarto del hijo, baño con espejo y puerta del cine.
- Fuentes de modelos: paquetes con licencia CC0 (de uso libre, como Kenney o Quaternius) en formato glTF. El desarrollo arranca con figuras geométricas provisorias que después se reemplazan.
- Las manos virtuales son estilizadas y toman el tono de piel elegido.

**Sonido**

- Música distinta por etapa: alegre en el embarazo, tierna en la etapa bebé, dinámica en la de 11 años y emotiva en el final.
- Efectos de respuesta: clic al agarrar, campanita al completar una misión, risa del bebé.
- El hijo habla con frases cortas grabadas en castellano rioplatense, siempre con subtítulo. El bebé solo hace sonidos.

**Accesibilidad y confort**

- Se puede jugar sentado o parado. Al inicio se calibra la altura con un botón.
- No hay desplazamiento ni giros de cámara: solo fundidos entre estaciones. El viaje al cine es un fundido, no un viaje en auto.
- Los textos son grandes, de alto contraste y a 1,5 m de distancia.
- Hay un botón "Saltar" siempre visible en la muñeca izquierda.
- La sesión dura menos de 15 minutos.

## Plataforma técnica

La recomendación es desarrollar en WebXR con three.js y TypeScript, y correr el juego en el navegador del Quest 2. Ese navegador soporta seguimiento de manos en WebXR en Quest 2, 3, 3S y Pro ([dmnshd, 2026](https://dmnshd.gg/blog/webxr-hand-tracking)).

| Opción | A favor | En contra |
| --- | --- | --- |
| **WebXR + three.js (recomendada)** | Claude Code puede escribir todo como código, sin pasos manuales en un editor. Se prueba en la PC con un emulador. Para actualizar los visores alcanza con recargar la URL. No hace falta modo desarrollador ni instalar APKs | Necesita HTTPS y Wi-Fi, o un servidor local en el evento. Tiene menos rendimiento disponible: obliga a arte low-poly |
| Unity 6 + Meta XR Interaction SDK | Interacciones con manos más pulidas de fábrica y más rendimiento | La escena se arma en el editor visual, donde Claude Code trabaja mucho menos solo. Hay que instalar el juego en cada visor |

**Presupuesto orientativo de rendimiento en Quest 2:** 72 cuadros por segundo; menos de 100.000 triángulos y menos de 100 *draw calls* por escena; iluminación horneada sin sombras en tiempo real; texturas de 1024 px como máximo.

**Configuración de los visores:** activar el seguimiento de manos en los ajustes de movimiento del Quest y el cambio automático entre manos y controles. Fijar la URL del juego como favorito o página de inicio. Si el evento no tiene internet, servir el juego desde una notebook en la misma red, o dejarlo en caché como aplicación web instalable (PWA).

## Uso en eventos y medición

Cada visor atiende unas 4 personas por hora: 13 minutos de juego más 2 de colocación y limpieza. Con 4 visores, son unas 16 personas por hora.

**Operación del puesto**

- Una persona del equipo por cada 2 visores: ayuda a poner el visor y da una explicación de 20 segundos sobre las manos.
- Transmitir la imagen del visor a una pantalla, para que la fila vea el juego y se entusiasme.
- Usar fundas higiénicas descartables o lavables y desinfectar entre usos.
- Al terminar, la sesión vuelve sola al tutorial para la próxima persona.

**Qué se mide**

| Indicador | Cómo se registra |
| --- | --- |
| Tasa de finalización | Registro automático: sesiones iniciadas contra sesiones que llegan a la reflexión |
| Dificultad por misión | Registro automático: tiempo, ayudas usadas y misiones completadas solas |
| Valoración de la experiencia | Pregunta final dentro del visor: "¿Cuánto te gustó?" (1 a 5) |
| Cambio de percepción | Pregunta final: "¿El juego cambió tu idea de cómo es criar?" (1 a 5) |
| Conocimiento de programas | Pregunta en un QR al salir: ¿conocía los programas de la Ciudad? |

Los registros son anónimos: los nombres que escribe el jugador nunca salen del visor. Se guardan localmente y se envían a un servidor cuando hay conexión, o se exportan como CSV.

## Decisiones abiertas

El prototipo arranca con la opción marcada como predeterminada en cada punto. Todas se pueden cambiar después sin rehacer el juego.

- [ ] **Sexo del hijo.** Predeterminado: varón, como en el guion (afeitada y cita). Alternativa: que sea al azar, con misiones adolescentes propias para una hija.
- [ ] **Quién gesta.** Predeterminado: el jugador ve a su pareja embarazada. Alternativa: elegirlo en la creación de personajes.
- [ ] **Primera cita.** Predeterminado: con una chica, como en el guion. Alternativa: no mostrar a la otra persona y que el hijo entre al cine.
- [ ] **Nombre del bebé.** ¿Lo elige el jugador entre 6 sugerencias o tiene uno fijo?
- [ ] **Programas a mostrar al final.** Los define la Subsecretaría.
- [ ] **Validación de contenidos.** Pediatría (biberón, eructo, pañal y sueño) y comunicación institucional (datos y tono).
- [ ] **Alojamiento y conectividad.** ¿Dominio del GCBA o externo? ¿Hay Wi-Fi en los eventos?

## Plan de desarrollo

El desarrollo se hace con Claude Code en seis hitos. Cada uno termina con algo que se puede probar en el visor. El prompt completo para Claude Code está en el archivo `PROMPT_CLAUDE_CODE.md`, que acompaña este documento.

1. **Base técnica.** Proyecto WebXR, seguimiento de manos, sistema de gestos (tocar, agarrar, soltar y frotar), máquina de escenas y tutorial. Prueba: agarrar el sonajero y tocar un botón en el Quest 2.
2. **Intro, personajes y embarazo.** Tarjetas de datos, personalización, herencia y fundido al nacimiento. Prueba: la tarjeta de herencia coincide con lo elegido.
3. **Etapa bebé.** Biberón, eructo y pañal. Prueba: las tres misiones completas solo con las manos.
4. **Etapa preadolescente.** Reloj, tarea, cena y dormir. Prueba: el reloj y las tres misiones.
5. **Etapa adolescente y final.** Afeitada, crema, cine, reflexión y encuesta. Prueba: el recorrido completo de punta a punta.
6. **Pulido.** Arte final, sonido, rendimiento a 72 fps, registro de métricas, modo evento y prueba con 5 a 10 personas que nunca usaron VR.

## Fuentes

- [Chequeado: los nacimientos cayeron casi 50% en 10 años](https://chequeado.com/el-explicador/los-nacimientos-cayeron-casi-50-en-10-anos-como-cambio-la-maternidad-en-argentina-y-que-desafios-plantea/) (datos de UNICEF Argentina y la DEIS; ENUT 2021 del INDEC)
- [dmnshd: seguimiento de manos en WebXR, 2026](https://dmnshd.gg/blog/webxr-hand-tracking)
