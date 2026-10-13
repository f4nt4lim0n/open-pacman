# SPEC 01 — Cuatro fantasmas con comportamientos propios

> **Estado:** Approved
> **Depende de:** —
> **Fecha:** 2026-10-09
> **Objetivo:** Pasar de 2 fantasmas (perseguidor y aleatorio) a 4 fantasmas con personalidad clásica propia, incluido uno que persigue a Pacman de forma agresiva.

---

## Alcance

**Dentro:**

- Definir 4 fantasmas en `GHOST_STARTS`, cada uno con un `kind` distinto y su propio color.
- Un comportamiento de decisión por `kind`:
  - `blinky`: persecución directa a la celda de Pacman (el agresivo).
  - `pinky`: emboscada, apunta 4 celdas por delante de Pacman.
  - `inky`: flanqueo usando la posición de Blinky y la de Pacman.
  - `clyde`: persigue de lejos y se aleja cuando está cerca.
- Salida escalonada del pen por tiempo, con retardos fijos por fantasma.
- Color fijo por `kind` (no por índice en el array).
- Desempate determinista al elegir dirección.
- Al perder una vida: los 4 vuelven al pen y se reinician los retardos.

**Fuera de alcance (para specs futuros):**

- Puntos de poder y modo asustado (fantasmas comestibles).
- Fases alternas `scatter`/`chase` por tiempo.
- Azar en las decisiones de movimiento.
- Fruta, niveles, bonus de puntuación o sonido.

---

## Modelo de datos

Se amplía `GHOST_STARTS` en `src/js/maze.js` a 4 entradas:

```js
const GHOST_STARTS = [
  { x: 13, y: 14, kind: 'blinky', color: '#ff0000', releaseAt: 0 },
  { x: 12, y: 14, kind: 'pinky',  color: '#ffb8ff', releaseAt: 90 },
  { x: 14, y: 14, kind: 'inky',   color: '#00ffff', releaseAt: 180 },
  { x: 15, y: 14, kind: 'clyde',  color: '#ffb852', releaseAt: 270 },
];
```

El objeto fantasma (`game.ghosts[i]`) gana los campos `color`, `releaseAt` y `released`:

```js
{
  x, y, dir, speed,
  kind,                    // 'blinky' | 'pinky' | 'inky' | 'clyde'
  color,                   // copiado de GHOST_STARTS
  releaseAt,               // frames que debe esperar dentro del pen
  released: false,         // true cuando ya salió del pen
}
```

`game` gana un contador `elapsed` (frames transcurridos desde el inicio o el último reset).

Convenciones:

- Coordenadas en celdas, origen arriba-izquierda.
- Un fantasma está dentro del pen mientras su fila sea `y >= 12`; sale cuando alcanza `y <= 11`.

---

## Plan de implementación

1. **`src/js/maze.js`**: reemplazar `GHOST_STARTS` por las 4 entradas de arriba (con `kind`, `color`, `releaseAt`). El juego sigue corriendo (los `kind` nuevos caen al comportamiento por defecto). Verificación manual: recargar y ver 4 fantasmas moverse.
2. **`src/js/game.js`**: en `createGame` inicializar `elapsed: 0` y copiar `color`, `releaseAt` y `released: false` a cada fantasma. En `update` incrementar `game.elapsed`. En `resetPositions` reiniciar `game.elapsed = 0` y `g.released = false`. Verificación manual: el juego arranca y no lanza errores.
3. **`src/js/render.js`**: en `drawGhost`, usar `g.color` y eliminar el array local `GHOST_COLORS`; en `draw` pasar solo el fantasma (sin índice). Verificación manual: 4 colores correctos.
4. **`src/js/game.js`**: en `moveGhost`, no mover al fantasma mientras `game.elapsed < g.releaseAt`; marcarlo `g.released = true` en cuanto `g.y <= 11`. En `isWall`/`canMove`, la puerta (`3`) bloquea a Pacman siempre y a un fantasma solo si `g.released` es `true`. Verificación manual: salen de uno en uno y no vuelven a entrar.
5. **`src/js/game.js`**: reescribir `decideGhost` con un objetivo por `kind` y desempate determinista en orden `up`, `left`, `down`, `right`. Verificación manual: cada fantasma se comporta distinto (ver criterios de aceptación).

Reglas de decisión (celdas enteras):

- **blinky**: objetivo = celda de Pacman. Elige la dirección que minimiza la distancia Manhattan al objetivo.
- **pinky**: objetivo = celda de Pacman + 4 celdas en la dirección actual de Pacman.
- **inky**: `pivote` = celda de Pacman + 2 celdas en la dirección de Pacman; `objetivo` = celda de Blinky + 2 × (pivote − celda de Blinky).
- **clyde**: si la distancia Manhattan a Pacman es mayor que 8, se comporta como blinky; si es 8 o menos, elige la dirección que **maximiza** la distancia a Pacman.
- En todos los casos, solo se consideran celdas transitables para fantasma y se prohíbe el giro de 180 salvo callejón sin salida.

---

## Criterios de aceptación

- [ ] `src/index.html` carga sin errores en la consola.
- [ ] Se dibujan 4 fantasmas con colores distintos: rojo, rosa, cian y naranja.
- [ ] Los 4 fantasmas salen del pen escalonados y no se solapan en la puerta.
- [ ] `blinky` reduce de forma continua su distancia Manhattan a Pacman.
- [ ] `pinky` apunta a 4 celdas por delante de la dirección de Pacman.
- [ ] `inky` cambia su objetivo en función de la posición de Blinky.
- [ ] `clyde` persigue a Pacman a más de 8 celdas y se aleja a 8 celdas o menos.
- [ ] Un fantasma ya salido no vuelve a entrar al pen.
- [ ] Al perder una vida, los 4 vuelven al pen y los retardos se reinician.
- [ ] Con la misma secuencia de teclas, el movimiento es reproducible (sin `Math.random` en la decisión).

---

## Decisiones tomadas y descartadas

- **Sí:** nombres clásicos `blinky`/`pinky`/`inky`/`clyde`. Son reconocibles y describen la identidad esperada.
- **No:** fases globales `scatter`/`chase`. Añaden temporizador y estado extra; cada personalidad ya se distingue sin ellas.
- **Sí:** lógica dentro de `game.js`. Evita nuevos archivos y globals en `index.html`.
- **Sí:** color fijo por `kind`. El color deja de depender del orden en el array.
- **Sí:** retardos fijos en frames (`0/90/180/270`). A 60 fps son ~1,5 s entre salidas y reducen el amontonamiento.
- **Sí:** desempate determinista en orden `up`, `left`, `down`, `right`. Da reproducibilidad; se descarta el desempate aleatorio.
- **Sí:** `clyde` se aleja eligiendo la dirección más lejana. Se descarta huir a la esquina inferior-izquierda del original para no introducir el concepto de esquina de dispersión.
- **Sí:** `inky` usa la fórmula clásica con la posición de Blinky.
- **No:** reproducir el bug clásico de Pinky (arriba = 4 arriba + 4 a la izquierda). No aporta al objetivo y complica la regla.
- **Sí:** la puerta bloquea al fantasma que ya salió. Evita que la persecución lo devuelva al pen.
- **Sí:** reset de posiciones y retardos al perder una vida. Mantiene consistencia con el arranque.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Amontonamiento de los 4 fantasmas en la única puerta | Retardos de 90 frames y decisión determinista los separan en la salida. |
| Comportamiento reproducible y por tanto predecible | Aceptado: la reproducibilidad es requisito; el azar queda fuera de alcance. |
| Cambiar `GHOST_STARTS` sin actualizar `resetPositions` (mapeo por índice) | El plan toca `createGame` y `resetPositions` en el mismo paso. |
| Un fantasma esperando dentro del pen intenta salir antes de tiempo | `moveGhost` no lo mueve hasta que `game.elapsed >= g.releaseAt`. |

---

## Lo que **no** entra en este spec

- Puntos de poder y modo asustado.
- Fases `scatter`/`chase` por tiempo.
- Azar en las decisiones.
- Fruta, niveles, bonus o sonido.

Cada uno de esos, si llega, va en su propio spec.
