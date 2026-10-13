# SPEC 02 — Salida de los fantasmas del pen

> **Estado:** Approved
> **Depende de:** SPEC 01
> **Fecha:** 2026-10-13
> **Objetivo:** Añadir una fase de salida para que los 4 fantasmas abandonen el pen rumbo a la puerta en vez de quedar atrapados rebotando en su interior.

---

## Alcance

**Dentro:**

- Una constante `PEN_EXIT` en `src/js/maze.js` con la celda objetivo sobre la puerta.
- Fase de salida en `moveGhost`/`decideGhost`: mientras `g.released === false` y ya venció `releaseAt`, el fantasma usa `PEN_EXIT` como objetivo en lugar de su personalidad.
- Al cruzar `y <= 11` se marca `g.released = true` y recupera su comportamiento clásico (spec 01).
- La fase de salida respeta el `releaseAt` escalonado (`0/90/180/270`) y el bloqueo de la puerta para fantasmas ya salidos.
- La lógica aplica tanto al arranque como tras `resetPositions`.

**Fuera de alcance (para specs futuros):**

- Bobbing (movimiento arriba/abajo) dentro del pen mientras esperan.
- Puntos de poder y modo asustado.
- Fases `scatter`/`chase` por tiempo.
- Reubicar `GHOST_STARTS` o cambiar el número de fantasmas.
- Fruta, niveles, bonus de puntuación o sonido.

---

## Modelo de datos

Una constante nueva en `src/js/maze.js`:

```js
// Celda objetivo durante la salida: justo encima de la puerta (cols 13-14, fila 12).
const PEN_EXIT = { x: 13, y: 11 };
```

Y su export: `window.PEN_EXIT = PEN_EXIT;`.

No se añaden campos al objeto fantasma: se reutilizan `released` y `releaseAt` del spec 01.

Convenciones:

- Coordenadas en celdas, origen arriba-izquierda.
- Un fantasma está en el pen mientras `released === false`; queda libre cuando `y <= 11`.

---

## Plan de implementación

1. **`src/js/maze.js`**: añadir `PEN_EXIT` y `window.PEN_EXIT`. Verificación manual: recargar `src/index.html` sin errores en consola.
2. **`src/js/game.js`**: en `decideGhost`, cuando `g.released === false` usar `PEN_EXIT` como objetivo y desactivar la huida de `clyde`; el resto de la lógica (desempate determinista, giro de 180 prohibido, celdas transitables) se mantiene. Verificación manual: pinky, inky y clyde salen del pen.
3. **`src/js/game.js`**: verificar que `moveGhost` sigue deteniendo al fantasma hasta `releaseAt` y marcando `released = true` al cruzar `y <= 11`. Verificación manual: salida escalonada y ningún fantasma vuelve a entrar.

Regla de decisión durante la salida:

```js
const leaving = !g.released;
const target = leaving ? PEN_EXIT : (flee ? pacman : ghostTarget( game, g ));
```

---

## Criterios de aceptación

- [ ] `src/index.html` carga sin errores en la consola.
- [ ] Los 4 fantasmas salen del pen y alcanzan `y <= 11`.
- [ ] `pinky` (arranque en `x=12`) ya no queda rebotando dentro del pen.
- [ ] `inky` (`x=14`) y `clyde` (`x=15`) salen del pen.
- [ ] `blinky` sigue siendo el primero en salir (`releaseAt: 0`).
- [ ] Mientras `game.elapsed < g.releaseAt`, el fantasma permanece quieto en su celda inicial.
- [ ] Un fantasma ya salido no vuelve a entrar al pen (la puerta lo bloquea).
- [ ] Al perder una vida, los 4 vuelven al pen y salen de nuevo con el mismo escalonado.
- [ ] Sale solo un fantasma a la vez por la puerta (sin solaparse).
- [ ] No se introduce `Math.random`; la secuencia sigue siendo reproducible.

---

## Decisiones tomadas y descartadas

- **Sí:** fase de salida explícita apuntando a `PEN_EXIT`. Reutiliza el pathing greedy existente y arregla los 3 fantasmas sin tocar la geometría.
- **No:** reposicionar `GHOST_STARTS` bajo la puerta. Cambiaría el nivel y arriesga solapamiento en la salida.
- **Sí:** `PEN_EXIT` en `maze.js`. Concentra el conocimiento del laberinto en un solo archivo.
- **No:** derivar la salida del `MAZE` en runtime. La geometría del pen es fija; una constante es más simple y legible.
- **No:** bobbing clásico dentro del pen. Añade estado y no es necesario para el arreglo.
- **Sí:** la puerta sigue bloqueando solo a fantasmas con `released === true`. Es la regla del spec 01 y evita reingresos.
- **Sí:** la fase de salida también corre tras perder una vida. Mantiene consistencia con el arranque (spec 01).

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Dos fantasmas convergen en la puerta al salir | `releaseAt` escalonado (`0/90/180/270`) los separa. |
| `PEN_EXIT` mal ubicado deja a un fantasma atascado | Criterios de aceptación verifican que los 4 alcanzan `y <= 11`. |
| `clyde` intenta huir estando aún en el pen | Durante la salida se desactiva la huida (`leaving` tiene prioridad). |
| Cambiar `decideGhost` rompe la personalidad ya salida | La rama `PEN_EXIT` solo aplica con `released === false`. |

---

## Lo que **no** entra en este spec

- Bobbing dentro del pen.
- Puntos de poder y modo asustado.
- Fases `scatter`/`chase`.
- Reubicar `GHOST_STARTS`.

Cada uno de esos, si llega, va en su propio spec.