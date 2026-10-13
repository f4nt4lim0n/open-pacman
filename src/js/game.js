// game.js
// Estado y reglas. Depende de globals de maze.js: MAZE, TUNNEL_ROW,
// PACMAN_START, GHOST_STARTS, PEN_EXIT.

const DIRS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};
const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };
const DIR_ORDER = [ 'up', 'left', 'down', 'right' ];

const PACMAN_SPEED = 0.125; // 1/8 celda/frame -> alinea cada 8 frames
const GHOST_SPEED = 0.1;    // 1/10 celda/frame

const DOT_SCORE = 10;
const POWER_PELLET_SCORE = 50;
const FRIGHT_FRAMES = 420;       // ~7 s a 60 fps
const FRIGHT_BLINK_FRAMES = 120; // ultimos ~2 s parpadeando
const GHOST_SCORES = [ 200, 400, 800, 1600 ];

const AMBUSH_LEAD = 4;   // pinky: celdas por delante de Pacman
const FLANK_LEAD = 2;    // inky: pivote por delante de Pacman
const CLYDE_RADIUS = 8;  // clyde: umbral de cercania a Pacman

// Crea una partida nueva. Copia MAZE (pristino) a game.grid para poder comer
// dots sin destruir el original, y reiniciar.
function createGame() {
  const grid = MAZE.map( ( row ) => row.slice() );
  // La celda de inicio de Pacman arranca sin dot.
  grid[ PACMAN_START.y ][ PACMAN_START.x ] = 0;

  let pellets = 0;
  for ( const row of grid ) for ( const v of row ) if ( v === 2 || v === 4 ) pellets++;

  return {
    state: 'start',
    score: 0,
    lives: 3,
    pelletsRemaining: pellets,
    elapsed: 0,
    frightTimer: 0, // frames restantes de modo asustado (0 = inactivo)
    ghostsEaten: 0, // fantasmas comidos con el power pellet actual
    grid,
    pacman: {
      x: PACMAN_START.x,
      y: PACMAN_START.y,
      dir: 'left',
      nextDir: null,
      speed: PACMAN_SPEED,
    },
    ghosts: GHOST_STARTS.map( ( g ) => ( {
      x: g.x,
      y: g.y,
      dir: 'up',
      speed: GHOST_SPEED,
      kind: g.kind,
      color: g.color,
      releaseAt: g.releaseAt,
      released: false,
    } ) ),
  };
}

function aligned( v ) {
  return Math.abs( v - Math.round( v ) ) < 1e-3;
}

// Una celda es muro para el actor dado?
//   pacman: bloqueado por pared (1) y puerta (3)
//   ghost:  bloqueado por pared (1) y por la puerta (3) si ya salio del pen
function isWall( grid, x, y, actor, released ) {
  if ( y < 0 || y >= grid.length ) return true;
  if ( x < 0 || x >= grid[ 0 ].length ) return true;
  const v = grid[ y ][ x ];
  if ( v === 1 ) return true;
  if ( v === 3 ) {
    if ( actor === 'pacman' ) return true;
    if ( actor === 'ghost' && released ) return true;
  }
  return false;
}

// Puede el actor avanzar desde (x,y) en la direccion dir?
function canMove( grid, x, y, dir, actor, released ) {
  const d = DIRS[ dir ];
  if ( !d ) return false;
  const tx = x + d.x;
  const ty = y + d.y;
  // Tunel: salir por un borde en la fila del tunel siempre es valido.
  if ( ty === TUNNEL_ROW && ( tx < 0 || tx >= grid[ 0 ].length ) ) return true;
  return !isWall( grid, tx, ty, actor, released );
}

function wrapTunnel( a, width ) {
  if ( Math.round( a.y ) === TUNNEL_ROW ) {
    if ( a.x < 0 ) a.x += width;
    else if ( a.x >= width ) a.x -= width;
  }
}

// Come el tile bajo el actor (debe estar alineado a celda). El power pellet
// ademas activa el modo asustado para los 4 fantasmas.
function eatPellet( game, pos ) {
  const tile = game.grid[ pos.y ][ pos.x ];
  if ( tile === 2 ) {
    game.grid[ pos.y ][ pos.x ] = 0;
    game.pelletsRemaining--;
    game.score += DOT_SCORE;
    return;
  }
  if ( tile === 4 ) {
    game.grid[ pos.y ][ pos.x ] = 0;
    game.pelletsRemaining--;
    game.score += POWER_PELLET_SCORE;
    game.frightTimer = FRIGHT_FRAMES;
    game.ghostsEaten = 0;
  }
}

function movePacman( game ) {
  const p = game.pacman;
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( p.x ) && aligned( p.y ) ) {
    p.x = Math.round( p.x );
    p.y = Math.round( p.y );

    // Aplicar giro pendiente si es posible.
    if ( p.nextDir && canMove( grid, p.x, p.y, p.nextDir, 'pacman' ) ) {
      p.dir = p.nextDir;
      p.nextDir = null;
    }
    // Comer dot o power pellet.
    eatPellet( game, p );
    // Si no puede seguir, se detiene en la celda.
    if ( !canMove( grid, p.x, p.y, p.dir, 'pacman' ) ) return;
  }

  const d = DIRS[ p.dir ];
  p.x += d.x * p.speed;
  p.y += d.y * p.speed;
  wrapTunnel( p, width );
}

function manhattan( a, b ) {
  return Math.abs( a.x - b.x ) + Math.abs( a.y - b.y );
}

function cell( actor ) {
  return { x: Math.round( actor.x ), y: Math.round( actor.y ) };
}

// Celda objetivo de un fantasma segun su personalidad clásica.
function ghostTarget( game, g ) {
  const pacman = cell( game.pacman );
  if ( g.kind === 'pinky' ) {
    return ahead( pacman, game.pacman.dir, AMBUSH_LEAD );
  }
  if ( g.kind === 'inky' ) {
    const blinky = game.ghosts.find( ( o ) => o.kind === 'blinky' );
    const anchor = blinky ? cell( blinky ) : pacman;
    const pivot = ahead( pacman, game.pacman.dir, FLANK_LEAD );
    // Refleja el pivote respecto a Blinky.
    return { x: anchor.x + 2 * ( pivot.x - anchor.x ), y: anchor.y + 2 * ( pivot.y - anchor.y ) };
  }
  return pacman; // blinky (y clyde cuando persigue)
}

function ahead( from, dir, distance ) {
  const d = DIRS[ dir ] || { x: 0, y: 0 };
  return { x: from.x + d.x * distance, y: from.y + d.y * distance };
}

function decideGhost( game, g ) {
  const grid = game.grid;
  const pacman = cell( game.pacman );

  // Opciones en orden determinista; se prohibe el giro de 180 salvo callejon.
  const options = DIR_ORDER.filter(
    ( dir ) => dir !== OPPOSITE[ g.dir ] && canMove( grid, g.x, g.y, dir, 'ghost', g.released )
  );
  const choices = options.length ? options : [ OPPOSITE[ g.dir ] ];

  // Mientras sigue dentro del pen su unico objetivo es salir por la puerta,
  // asi que la huida de clyde queda desactivada. Con el modo asustado activo
  // todas las personalidades huyen de Pacman.
  const leaving = !g.released;
  const scared = game.frightTimer > 0;
  const shy = g.kind === 'clyde' && manhattan( g, pacman ) <= CLYDE_RADIUS;
  const flee = !leaving && ( scared || shy );
  const target = leaving ? PEN_EXIT : ( flee ? pacman : ghostTarget( game, g ) );

  let best = choices[ 0 ];
  let bestDist = flee ? -Infinity : Infinity;
  for ( const dir of choices ) {
    const d = DIRS[ dir ];
    const dist = manhattan( { x: g.x + d.x, y: g.y + d.y }, target );
    if ( flee ? dist > bestDist : dist < bestDist ) {
      bestDist = dist;
      best = dir;
    }
  }
  g.dir = best;
}

function moveGhost( game, g ) {
  const grid = game.grid;
  const width = grid[ 0 ].length;

  // Mientras no le toque salir, permanece quieto dentro del pen.
  if ( game.elapsed < g.releaseAt ) return;

  if ( aligned( g.x ) && aligned( g.y ) ) {
    g.x = Math.round( g.x );
    g.y = Math.round( g.y );
    decideGhost( game, g );
    if ( !canMove( grid, g.x, g.y, g.dir, 'ghost', g.released ) ) return;
  }

  const d = DIRS[ g.dir ];
  g.x += d.x * g.speed;
  g.y += d.y * g.speed;
  wrapTunnel( g, width );

  // Al alcanzar la fila 11 abandona el pen: ya no puede volver a entrar.
  if ( g.y <= 11 ) g.released = true;
}

function resetPositions( game ) {
  const p = game.pacman;
  p.x = PACMAN_START.x;
  p.y = PACMAN_START.y;
  p.dir = 'left';
  p.nextDir = null;
  game.elapsed = 0;
  game.frightTimer = 0;
  game.ghostsEaten = 0;
  game.ghosts.forEach( ( g, i ) => {
    g.x = GHOST_STARTS[ i ].x;
    g.y = GHOST_STARTS[ i ].y;
    g.dir = 'up';
    g.released = false;
  } );
}

function collides( a, b ) {
  return Math.abs( a.x - b.x ) < 0.5 && Math.abs( a.y - b.y ) < 0.5;
}

// Un fantasma es comestible con el modo asustado activo y ya fuera del pen.
function isEdible( game, g ) {
  return game.frightTimer > 0 && g.released;
}

// Pacman se come al fantasma y este reaparece en el pen, listo para salir.
function eatGhost( game, g, index ) {
  game.score += GHOST_SCORES[ Math.min( game.ghostsEaten, GHOST_SCORES.length - 1 ) ];
  game.ghostsEaten++;
  g.x = GHOST_STARTS[ index ].x;
  g.y = GHOST_STARTS[ index ].y;
  g.dir = 'up';
  g.released = false;
}

function update( game ) {
  game.elapsed++;
  if ( game.frightTimer > 0 ) game.frightTimer--;
  movePacman( game );
  game.ghosts.forEach( ( g ) => moveGhost( game, g ) );

  for ( let i = 0; i < game.ghosts.length; i++ ) {
    const g = game.ghosts[ i ];
    if ( !collides( game.pacman, g ) ) continue;

    // En modo asustado Pacman se lo come; el bucle sigue por si toca a otro.
    if ( isEdible( game, g ) ) {
      eatGhost( game, g, i );
      continue;
    }

    game.lives--;
    if ( game.lives <= 0 ) {
      game.state = 'lost';
      return;
    }
    resetPositions( game );
    break;
  }

  if ( game.pelletsRemaining <= 0 ) game.state = 'won';
}

window.createGame = createGame;
window.update = update;
window.DIRS = DIRS;
