# SPEC 03 — Power pellets y modo asustado

> **Estado:** Approved
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-10-13
> **Objetivo:** Añadir 4 power pellets que activan un modo asustado temporal en el que Pac-Man puede comer fantasmas, con puntuación doblada y aviso de parpadeo.

---

## Alcance

**Dentro:**

- Un tile nuevo `4` en `src/js/maze.js` para el power pellet, con `parseTile` reconociendo el carácter `o`.
- 4 power pellets en las esquinas clásicas: celdas `(1,3)`, `(26,3)`, `(1,20)`, `(26,20)`.
- Comer un power pellet da 50 puntos, descuenta del contador de pellets y activa `game.frightTimer = FRIGHT_FRAMES` (420 frames, ~7 s).
- Comer otro power pellet durante el modo asustado reinicia el temporizador y el contador de fantasmas comidos de ese pellet.
- Durante el modo asustado los 4 fantasmas huyen de Pacman; los del pen salen igual y se vuelven comestibles al salir.
- Colisión en modo asustado: Pac-Man come al fantasma y suma `200/400/800/1600` según cuántos haya comido con el mismo pellet.
- Un fantasma comido vuelve a su celda de `GHOST_STARTS` con `released = false` y vuelve a salir.
- `render.js` dibuja el power pellet más grande que un dot y pinta a los fantasmas asustados de azul, parpadeando a blanco en los últimos 120 frames (~2 s).
- Perder una vida reinicia `frightTimer` y el contador de fantasmas comidos.
- El contador de pellets para ganar pasa a contar dots (`2`) y power pellets (`4`).

**Fuera de alcance (para specs futuros):**

- Fantasmas "ojos" que recorren el camino de vuelta al pen.
- Temporizadores de miedo independientes por fantasma.
- Fases alternas `scatter`/`chase` por tiempo.
- Fruta, niveles, bonus extra y sonido.
- Bobbing de los fantasmas dentro del pen.

---

## Modelo de datos

Cambios en `src/js/maze.js`:

```js
// parseTile reconoce ademas 'o' -> 4 (power pellet).
function parseTile( ch ) {
  if ( ch === '#' ) return 1;
  if ( ch === '.' ) return 2;
  if ( ch === '-' ) return 3;
  if ( ch === 'o' ) return 4;
  return 0;
}
```

Las filas 3 y 20 del `MAZE_STR` pasan a tener `o` en las columnas 1 y 26 (esquinas). El resto del laberinto no cambia.

Nuevas constantes en `src/js/game.js`:

```js
const DOT_SCORE = 10;
const POWER_PELLET_SCORE = 50;
const FRIGHT_FRAMES = 420;       // ~7 s a 60 fps
const FRIGHT_BLINK_FRAMES = 120; // ultimos ~2 s parpadeando
const GHOST_SCORES = [ 200, 400, 800, 1600 ];
```

El objeto `game` gana dos campos:

```js
{
  // ...
  frightTimer: 0,   // frames restantes de modo asustado (0 = inactivo)
  ghostsEaten: 0,   // fantasmas comidos con el power pellet actual
}
```

El campo `dotsRemaining` se renombra a `pelletsRemaining` y cuenta tiles `2` y `4`.

No se añaden campos al objeto fantasma: el estado asustado es global (`game.frightTimer > 0`).

Convenciones:

- Un fantasma es comestible cuando `game.frightTimer > 0` y ya salió del pen.
- Un fantasma comido reaparece con `released = false`; como `game.elapsed` ya superó su `releaseAt`, vuelve a salir de inmediato hacia `PEN_EXIT`.

---

## Plan de implementación

1. **`src/js/maze.js`**: añadir `'o' -> 4` en `parseTile` y colocar `o` en las columnas 1 y 26 de las filas 3 y 20. Verificación manual: recargar `src/index.html` sin errores en consola (el tile `4` aún no se dibuja).
2. **`src/js/render.js`**: en `drawDots`, dibujar el tile `4` como un pellet más grande (radio mayor que el dot de 2.5). Verificación manual: se ven 4 pellets grandes en las esquinas.
3. **`src/js/game.js`**: renombrar `dotsRemaining` a `pelletsRemaining` y contarlo sumando tiles `2` y `4`; en `movePacman`, comer tile `4` suma `POWER_PELLET_SCORE`, descuenta `pelletsRemaining`, activa `frightTimer = FRIGHT_FRAMES` y resetea `ghostsEaten = 0`; en `update`, decrementar `frightTimer` hasta 0; en `resetPositions`, resetear `frightTimer` y `ghostsEaten`. Verificación manual: comer un pellet da 50 puntos y desaparece; la partida sigue siendo ganable.
4. **`src/js/game.js`**: en `decideGhost`, cuando `game.frightTimer > 0` (y el fantasma ya salió), todas las personalidades huyen de Pacman maximizando la distancia, igual que la huida de `clyde`. Verificación manual: al comer un pellet los 4 fantasmas se alejan.
5. **`src/js/game.js`**: en `update`, al colisionar con un fantasma, si `frightTimer > 0` comerlo — sumar `GHOST_SCORES[ Math.min( ghostsEaten, 3 ) ]`, incrementar `ghostsEaten` y devolverlo a su celda de `GHOST_STARTS` con `released = false`; si no, aplicar la pérdida de vida actual. Verificación manual: comer fantasmas suma 200, 400, 800, 1600 y cada uno vuelve al pen.
6. **`src/js/render.js`**: en `draw`, calcular `frightened = game.frightTimer > 0` y pasarlo a `drawGhost`; pintar el cuerpo de azul y, cuando `frightTimer <= FRIGHT_BLINK_FRAMES`, alternar con blanco. Verificación manual: los fantasmas se ven azules y parpadean al final.

---

## Criterios de aceptación

- [ ] `src/index.html` carga sin errores en la consola.
- [ ] Se ven 4 power pellets (más grandes que un dot) en las celdas `(1,3)`, `(26,3)`, `(1,20)` y `(26,20)`.
- [ ] Comer un power pellet suma exactamente 50 puntos y lo elimina del `game.grid`.
- [ ] Comer un power pellet pone `game.frightTimer` a 420 y los fantasmas se ven azules.
- [ ] Comer otro power pellet mientras el modo está activo reinicia el temporizador a 420.
- [ ] Durante el modo asustado los 4 fantasmas eligen la dirección que aumenta su distancia a Pacman.
- [ ] Tocar un fantasma asustado suma 200, luego 400, luego 800 y luego 1600 con el mismo pellet.
- [ ] Un fantasma comido reaparece en su celda de `GHOST_STARTS` con `released = false` y vuelve a salir.
- [ ] Tocar un fantasma no asustado sigue restando una vida.
- [ ] Al perder una vida, `frightTimer` y `ghostsEaten` vuelven a 0.
- [ ] Cuando `frightTimer` es 0 el color del fantasma vuelve a su `color` propio.
- [ ] En los últimos 120 frames los fantasmas parpadean entre azul y blanco.
- [ ] `pelletsRemaining` cuenta dots y power pellets; se alcanza `won` tras comerse todos.
- [ ] No se introduce `Math.random`; la secuencia sigue siendo reproducible.

---

## Decisiones tomadas y descartadas

- **Sí:** tile `4` en el `MAZE` prístino. Mantiene el laberinto como fuente única de verdad.
- **Sí:** 4 pellets en las esquinas clásicas. Es la distribución reconocible y encaja en las columnas 1 y 26 de las filas 3 y 20.
- **Sí:** temporizador global (`game.frightTimer`). Un único estado compartido por los 4 fantasmas.
- **Sí:** 420 frames y reinicio al comer otro pellet. Premia la ruta óptima.
- **Sí:** los fantasmas asustados huyen todos (máxima distancia). Sin esto seguirían persiguiendo y el modo no se sentiría como ventaja.
- **Sí:** un fantasma comido vuelve al pen con `released = false`. Reutiliza la fase de salida del spec 02 y evita el modo "ojos".
- **Sí:** puntuación `200/400/800/1600` con contador por pellet. Recupera el clásico sin coste de estado extra.
- **Sí:** parpadeo en los últimos 120 frames. Avisa del final sin texto ni HUD.
- **Sí:** power pellet 50 pts y cuenta para ganar; `dotsRemaining` → `pelletsRemaining`. El nombre refleja que ya no son solo dots.
- **No:** animación de "ojos" volviendo al pen. Añade un modo de fantasma y más código.
- **No:** retardo adicional para el fantasma comido. Reutiliza `releaseAt`; como `game.elapsed` ya lo superó, sale de inmediato.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Un fantasma comido vuelve de inmediato y se cruza con Pacman | Al reaparecer dentro del pen, Pacman no puede entrar. |
| Los fantasmas en el pen no se vuelven comestibles por la rama `leaving` | `leaving` solo decide el movimiento; la comestibilidad depende de `frightTimer` al salir. |
| El renombrado `dotsRemaining` → `pelletsRemaining` deja referencias sueltas | El campo solo se usa en `game.js`; se actualiza en el mismo paso. |
| El modo asustado termina justo al tocar un fantasma | La colisión usa el `frightTimer` del frame actual, antes de decrementarlo. |
| Parpadeo ilegible si `FRIGHT_BLINK_FRAMES` es grande | 120 frames (~2 s) dan 6 alternancias a 30 fps. |

---

## Lo que **no** entra en este spec

- Fantasmas "ojos" que vuelven al pen.
- Temporizadores de miedo por fantasma.
- Fases `scatter`/`chase`.
- Fruta, niveles, bonus y sonido.
- Bobbing dentro del pen.

Cada uno de esos, si llega, va en su propio spec.
