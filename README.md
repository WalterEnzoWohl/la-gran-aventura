# La Gran Aventura

Experiencia WebXR para Meta Quest 2, solo con las manos. La especificación vigente está en [Claude.md](Claude.md).

> Estado: **hito 2 (inicio)**. Escenas 01 a 03; la prueba de gestos del hito 1 sigue disponible con `?prueba=1`. El README completo para el equipo llega en el hito 6.

## Jugar

**https://lgavr.vercel.app**: abrir esa dirección en el navegador del Meta Quest 2 y tocar "Entrar a VR".
Se publica sola en Vercel con cada `git push` a `main`. Agregando `?debug=1` se ven FPS, draw calls y triángulos.

## Desarrollo

```bash
npm install
npm run dev        # HTTPS en la red local, puerto 5173
npm test           # tests de la lógica pura (Vitest)
npm run build      # typecheck + build de producción en dist/
```

- **En la PC:** abrir `https://localhost:5173/?debug=1`. Como el navegador no tiene visor, se carga el emulador IWER (solo en desarrollo) con manos emuladas; "Entrar a VR" abre la sesión emulada.
- **En el Quest 2, sin publicar:** con la PC y el visor en la misma red Wi-Fi, abrir en el navegador del Quest `https://<IP-de-la-PC>:5173/?debug=1`, aceptar la advertencia del certificado y tocar "Entrar a VR".

`?debug=1` muestra FPS, draw calls y triángulos; las teclas 0–9 saltan de escena y la S equivale a "Saltar".

## Estructura

- `src/core/`: manos, gestos, interacción, escenas, fundidos, textos, audio, métricas y carga de modelos.
- `src/game/`: estado de la partida y herencia.
- `src/content/`: `config.ts` (paletas, decisiones abiertas, tiempos, umbrales de las manos) y `textos.es.json` (todos los textos visibles).
- `src/scenes/`: escenas. `00_PruebaGestos.ts` es la prueba del hito 1.
- `public/models/<nombre>.glb` y `public/audio/<nombre>.mp3`: si existen, reemplazan a las primitivas y al silencio.
