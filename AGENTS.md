# AGENTS.md

Proyecto de aprendizaje de **Spec Driven Development**: un Pac-Man en Vanilla JS (sin build, sin dependencias, sin tests).

## Ejecutar

No hay `package.json`, bundler ni dev server. Se abre `src/index.html` directamente en el navegador (`file://` funciona: son scripts clásicos, sin módulos ES).

## Workflow de specs (lo importante de este repo)

- Las skills viven en `.agents/skills/` (`spec`, `spec-impl`), fijadas por `skills-lock.json` (origen `klerith/fernando-skills`). No editar esos archivos a mano.
- `specs/` aún no existe. `/spec` crea `specs/NN-slug.md` en estado `Draft` y siembra `specs/.spec-config.yml` con `AutoCreateBranch: true`.
- `/spec-impl <NN-slug>` solo arranca si el spec está en estado *Aprobado/Approved*. Crea la rama `spec-NN-slug` y **nunca hace commit automáticamente**: se detiene en cada paso para revisar el diff.
- Leer `README.md` y el skill antes de crear features grandes; el flujo esperado es spec primero, código después.

## Arquitectura

- `src/index.html` carga 4 scripts clásicos en orden: `maze.js`, `game.js`, `render.js`, `main.js`. **El orden importa** y las dependencias entre archivos son globals expuestas en `window` (`MAZE`, `TUNNEL_ROW`, `PACMAN_START`, `GHOST_STARTS`, `createGame`, `update`, `draw`, `DIRS`). No hay bundler que lo resuelva: si se agrega un archivo, actualizar el `<script>` en `index.html` y exponer el global.
- `maze.js`: laberinto 28x31 declarado como 31 strings legibles y parseado a números. Tile: `0` transitable, `1` pared, `2` dot, `3` puerta del pen. `MAZE` es **prístino**; cada partida copia a `game.grid` (comer dots muta `game.grid`, nunca `MAZE`).
- `game.js`: reglas y movimiento. Coordenadas fraccionarias; las decisiones (giro, cambio de dirección) solo ocurren cuando el actor está alineado a una celda (`aligned()`).
- `render.js`: dibuja siempre desde `game.grid`, nunca desde `MAZE`.
- `main.js`: bucle `requestAnimationFrame`, teclado (solo flechas) y overlay de estados (`start` / `playing` / `won` / `lost`).

## Invariantes que se rompen fácil

- `TILE = 20` en `render.js` y `width=560 height=620` en el canvas están atados al tamaño del laberinto (28x20 x 31x20). Cambiar uno sin el otro rompe el render.
- La fila del túnel (`TUNNEL_ROW = 14`) es el único lugar donde se hace wrap horizontal; el pen (`3`) bloquea a Pacman pero no a los fantasmas.
- La cuadrícula del laberinto debe seguir siendo simétrica respecto al eje vertical central y de 28 caracteres por fila.

## Convenciones

- Código e identificadores en inglés; comentarios en español (ver `AGENTS.md` global).
- Estilo Prettier con espacios dentro de paréntesis y llaves: `if ( x ) { ... }`, `array[ i ]`. Mantenerlo al editar.
- Envolver las constantes mágicas del juego (`PACMAN_SPEED`, `GHOST_SPEED`, vidas, puntuación) en constantes con nombre.