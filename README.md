# WaifuPet

Mascota de escritorio para Windows: una waifu con orejas y cola de gato que
pasea por tu pantalla, habla, baila, duerme y te hace compañía. Hecha con
Electron + Canvas (sin frameworks).

## Descargar y ejecutar

1. Descarga **`WaifuPet-1.0.0.exe`** de este repositorio (botón *Code →
   Download ZIP* o el archivo directamente).
2. Doble clic. No necesita instalación ni Node.js.
3. La primera vez Windows mostrará **"Windows protegió tu PC"** (el .exe no
   está firmado): pulsa **Más información → Ejecutar de todos modos**.

## Controles

| Acción | Resultado |
|---|---|
| Clic izquierdo | La acaricia (se pone feliz y suelta corazones) |
| Doble clic | Salta |
| Arrastrar | Moverla por la pantalla (también entre monitores) |
| Clic derecho | Menú de acciones, modelo, tamaño, pantallas y sonido |

## Características

- **Multipantalla real**: tamaño visual constante (en cm) en todos los
  monitores vía corrección EDID, transición gradual al cruzar de pantalla,
  sin saltos ni vibración; el suelo se adapta a cada monitor.
- **Modelos**: waifu (canvas vectorial), webillo (pixel art), Saitama
  (animación anime por fotogramas completos), Goku y Vegeta juntos,
  y Eren, Armin y Reiner de Attack on Titan, por separado o los tres juntos.
  Saitama además da
  puñetazos (normal, consecutivos y serio, con onda de choque) y va a la
  compra con su bolsa. El puñetazo pedido desde el menú sacude todo el
  monitor: captura la pantalla y la tiembla en una capa a pantalla completa
  (sin tocar tus ventanas, los clics la atraviesan) con carga, fotograma de
  impacto manga, ondas, escombros y grietas.
- **Goku y Vegeta** tienen ventanas independientes y un motor propio: vuelan,
  se acercan, preparan el ataque, alternan golpes y patadas, retroceden y lanzan energía entre las
  pantallas habilitadas, también con monitores encima o debajo. Las poses se
  reproducen por secuencias completas: el golpe conecta antes del retroceso y el rayo
  viaja desde la mano antes del impacto. Cada ataque termina con recuperación y una
  pausa breve al contacto. El vuelo tiene aceleración, inercia y estelas. Clic derecho sobre
  cualquiera → **Combate y vuelo** → **Pelear**, **Dejar de pelear y rondar
  pantallas**, o **Transformaciones**. No realizan las rutinas de las otras mascotas.
- **Ocho parejas de transformaciones**, en este orden: SS1 ambos; SS2 ambos;
  SS3 Goku / Majin Vegeta; SS4 ambos; God ambos; Blue ambos; Ultra Instinto sin
  perfeccionar / Blue Plus; Ultra Instinto perfeccionado / Ultra Ego. Cada personaje
  tiene dibujos propios de guardia, vuelo, preparación, puñetazo, patada, esquiva,
  carga y disparo. Las esquivas desplazan el cuerpo y evitan el impacto; Goku esquiva
  más en Ultra Instinto. La inclinación y escala animan el movimiento de los cuerpos completos.
  **Escalar hasta Ultra Instinto y Ultra Ego** sube una pareja tras cada dos rondas
  completas, con una breve carga al transformarse; se mantiene en el nivel final.
  Seleccionar una forma manualmente desactiva la subida automática. El modo de paseo
  conserva la forma, pero detiene los ataques y la progresión.
- **Ataques de energía propios**: Goku dispara un Kamehameha azul con núcleo blanco,
  ondas y anillos de presión; Vegeta alterna Cañón Galick violeta con espirales y
  Final Flash dorado, más ancho y con una carga de 2,05 segundos. La esfera de carga
  sigue las manos recogidas y el haz sale desde las palmas extendidas. Los rayos
  tienen propagación, retroceso, explosiones y disipación; solo causan impacto al
  alcanzar al rival. Vegito usa Final Kamehameha, Gogeta Kamehameha y Buu su onda rosa.
  Broly alterna cinco proyectiles verdes con trayectorias curvas e impactos
  escalonados y un cañón de energía gigante con una explosión mayor. El sonido
  acompaña la carga y el disparo; las ráfagas se cancelan al cambiar de modo o rival.
- **Vegito y Gogeta**, ambos en SS1 y Blue: clic derecho → **Combate y vuelo → Fusión**.
  Goku y Vegeta se reúnen en el mismo monitor; Vegito usa atracción Potara y Gogeta
  realiza la danza con contacto de los dedos, seguido de un destello y aparición
  del guerrero fusionado. **Rival de la fusión** permite elegir Majin Buu (Super Buu)
  o Broly a máximo poder. Intercambian golpes, patadas, esquivas y rayos; los dos
  lados alternan los ataques de energía. El rival sale despedido tras los impactos
  necesarios y reaparece después de la recuperación para otra ronda.
  **Separar a Goku y Vegeta** o seleccionar una transformación normal cancela la
  fusión; el modo de paseo mantiene al fusionado y su rival sin ataques.
  Goku, Vegeta, Vegito, Gogeta y Buu tienen la misma escala (100 %); Broly usa 120 % y
  supera en tamaño a todos. Cada personaje del atlas se normaliza por separado
  para que sus poses mantengan esas proporciones. La ventana, los puntos de contacto,
  el origen de los rayos y los límites de pantalla respetan el tamaño individual.
- **Monstruos para Saitama**: el primero aparece tras unos 22 segundos y los
  siguientes cada 45–90 segundos de actividad. Se acercan, Saitama conecta un
  único golpe y salen despedidos con gravedad y giro. También puedes usar
  **Hacer cosas → Invocar un monstruo**. Pausar congela los combates; arrastrar
  a Saitama cancela el encuentro; cambiar de modelo retira los personajes del
  combate anterior. El modelo y el tamaño elegidos se recuerdan al abrir la app.
- **Attack on Titan**: Eren se convierte en Titán de Ataque, Armin en Colosal
  y Reiner en Acorazado. Clic derecho → **Modelo** permite elegir uno o **Attack
  on Titan · Los tres**. En **Titanes y movimiento** puedes caminar, correr,
  quedarte quieto o alternar los movimientos automáticamente, transformar a cada
  personaje o a todos, volver a humano y activar las transformaciones automáticas.
  Empiezan como humanos y las primeras transformaciones se escalonan a los 8,
  14 y 20 segundos. El cambio tiene preparación, destello, relámpagos, crecimiento
  y vapor; cada forma usa dibujos completos distintos para caminar, correr,
  reposo y transformación. El Colosal es el mayor de los tres, emite vapor y
  los titanes levantan polvo al pisar. Caminan sobre el suelo de cada monitor:
  pasan a monitores contiguos y reaparecen con un fundido en pantallas verticales
  o separadas. Pausa, tamaños y pantallas deshabilitadas también se respetan.
  El Titán de Ataque lleva una cobertura en la cintura. El Colosal usa un nuevo
  atlas con proporciones altas y delgadas, brazos largos, cabeza pequeña y un
  traje completo rojo mate con líneas de fibras y tendones impresas. Sustituye
  el dibujo anterior de hombros y piernas voluminosos. Es una adaptación cubierta;
  la versión sin traje fue bloqueada por ImageGen. Las pruebas verifican la carga
  y el funcionamiento de los fotogramas, no la fidelidad exacta al anime.
- **Animaciones**: paseo, baile, sueño, café, lectura, teléfono, cigarrillo,
  desayuno, canto, videojuego, estirarse, saludar, bostezar, tiritar,
  estornudar, animarse con confeti, saltos de conejo, girar, aplaudir,
  taparse los ojos... con frases, burbujas de diálogo y partículas
  (corazones, notas musicales, mariposas, chispas, polvo, Zzz).
- **Tres tamaños** (pequeño/normal/grande) y **sonido** con síntesis WebAudio.

## Desarrollo

```bash
npm install
npm start        # ejecuta en modo desarrollo
npm run dist     # genera dist/WaifuPet-1.0.0.exe (portable)
npm test         # comprueba vuelo multipantalla, controles y encuentros
```

Notas de compilación: `electron-builder` necesita extraer symlinks en la
primera ejecución; en Windows sin privilegios puede fallar. Solución rápida:
compilar desde una terminal **como administrador**.

## Estructura

- `main.js` — proceso principal de Electron (ventana, monitor, menú, IPC)
- `pet.js` — todo el motor de la mascota (física, estados, animaciones, dibujo)
- `preload.js` — puente IPC
- `overlay.html` / `overlay.js` / `overlay-preload.js` — capa a pantalla
  completa de los efectos del puñetazo
- `assets/webillo.png` — sprite de webillo e icono de la app
- `hero-art.js` — acceso al dibujo y respaldo vectorial si falta algún recurso
- `anime-art.js` — carga y separación de personajes completos de los atlas, alineación y dibujo
- `animation-frames.js` — secuencias de vuelo, golpe, patada, carga, salto y monstruos
- `animation-geometry.js` — puntos de contacto de puños, patadas y rayos
- `transformations.js` — orden, nombres y colores de las ocho parejas
- `fusions.js` — Vegito, Gogeta, métodos de fusión y rivales
- `energy-attacks.js` / `energy-art.js` — ataques por personaje, ráfagas, cargas y efectos Canvas
- `titans.js` / `titan-engine.js` — personajes, secuencias de animación, transformación y movimiento sobre el suelo
- `battle-engine.js` — simulación independiente de vuelo y combate
- `combat-controller.js` — ventanas de luchadores, ataques y encuentros
- `combat.html` / `combat.js` / `combat-preload.js` — dibujo y controles del combate
- `assets/saitama.png` — antiguo sprite, conservado como recurso original

## Validación del cambio de combate

`npm test` ejecuta treinta y seis pruebas: vuelo en distintas distribuciones de monitores,
modo tranquilo sin ataques, pantallas deshabilitadas, pausa y limpieza de ventanas,
derrota del monstruo de un golpe, cancelación al arrastrar, controles del menú,
secuencias de animación, Super Saiyan, orden de los ataques, alcance físico,
recorrido del rayo, sincronización del fotograma de impacto, esquivas sin daño,
progresión completa de transformaciones, carga segura de atlas al cambiar de modelo,
rituales Potara y danza, enemigos, derrota, siguiente ronda, separación,
alternancia Galick/Final Flash, cinco contactos de Broly sin duplicados y cancelación de ráfagas.
También valida las seis formas de Attack on Titan, transformación individual,
caminar/correr, suelo, monitores verticales, controles, pausa y limpieza de sus ventanas.

La prueba de integración en Electron se ejecuta con
`node node_modules/electron/cli.js tests/renderer-smoke.cjs`. Usa ventanas ocultas
y verifica los renderizadores reales de Saitama, Goku y Vegeta, el golpe único,
las ocho parejas, las cuatro fusiones, ambos enemigos, la separación, el modo tranquilo
y la limpieza al cambiar de modelo. Para generar la galería de
poses: `node node_modules/electron/cli.js tests/render-gallery.cjs`.
Para revisar los ocho pasos del combate en `choreography-preview.png`:
`node node_modules/electron/cli.js tests/render-choreography.cjs`.
La galería `transformations-preview.png` y la simulación con los puntos de contacto
extraídos de los dibujos se generan con
`node node_modules/electron/cli.js tests/render-transformations.cjs`.
Para validar los ocho enfrentamientos de las fusiones con el alcance de los dibujos
reales y generar `fusions-preview.png`:
`node node_modules/electron/cli.js tests/render-fusions.cjs`.
La galería `energy-preview.png` muestra carga, disparo e impacto de los cinco ataques principales:
`node node_modules/electron/cli.js tests/render-energy.cjs`. La integración comprueba
también que los tres ataques de Goku y Vegeta pinten píxeles en la ventana real del rayo.
La galería `titans-preview.png` verifica los seis atlas transparentes y 24 poses:
`node node_modules/electron/cli.js tests/render-titans.cjs`. La integración de Electron
comprueba las tres ventanas, sus transformaciones, el regreso individual a humano,
el modelo de un solo personaje y el cierre de todas las ventanas al cambiar de modelo.

La simulación comprueba monitores horizontales, verticales y separados; el ajuste
visual en una configuración física con distintas escalas DPI debe comprobarse
en el escritorio donde se use la aplicación.

Los gráficos finales se generaron con la herramienta integrada ImageGen. Hay
diecisiete atlas y 272 fotogramas de personajes completos: los cinco atlas originales,
ocho atlas con 128 poses para las dieciséis transformaciones y cuatro atlas con 64
poses para las fusiones, sus rituales y enemigos. Las imágenes se
separan por siluetas para evitar cortar puños o capas que atraviesan los límites
de una cuadrícula. El PNG es el recurso de animación, no un cuerpo fijo al que
se superponen brazos. Los prompts están en `assets/anime-prompts.json` y
`assets/transformation-prompts.json` y `assets/fusion-prompts.json`. Los atlas se cargan cuando se selecciona cada
pareja y sus puntos de contacto se calculan a partir de los fotogramas reales.
Attack on Titan añade seis atlas con 96 dibujos completos en
`assets/aot-<eren|armin|reiner>-<human|titan>-anime.png`.
Los prompts y el estado de los recursos están guardados en `assets/titan-prompts.json`;
las imágenes disponibles se generaron con la herramienta integrada ImageGen y se
guardaron en el proyecto. El Colosal contiene el prompt del nuevo dibujo cubierto
y conserva el intento anterior bloqueado como historial, separado del prompt usado.

Commit propuesto: `[ADD] WaifuPet: Add anime battles and fusions`

Archivos del cambio:

- `README.md`, `index.html`, `main.js`, `package.json`, `pet.js`, `preload.js`
- `hero-art.js`, `battle-engine.js`, `combat-controller.js`, `combat-preload.js`, `combat.html`, `combat.js`
- `anime-art.js`, `animation-frames.js`, `animation-geometry.js`, `transformations.js`, `fusions.js`
- `assets/goku-anime.png`, `assets/vegeta-anime.png`, `assets/saitama-anime.png`, `assets/super-saiyan-anime.png`, `assets/monsters-anime.png`, `assets/anime-prompts.json`
- `assets/ss1-anime.png`, `assets/ss2-anime.png`, `assets/ss3-majin-anime.png`, `assets/ss4-anime.png`, `assets/god-anime.png`, `assets/blue-anime.png`, `assets/omen-evolved-anime.png`, `assets/ui-ego-anime.png`, `assets/transformation-prompts.json`
- `assets/fusion-ss1-anime.png`, `assets/fusion-blue-anime.png`, `assets/fusion-enemies-anime.png`, `assets/fusion-ritual-anime.png`, `assets/fusion-prompts.json`
- `tests/battle-engine.test.js`, `tests/combat-controller.test.js`, `tests/main-menu.test.js`
- `tests/renderer-preload.cjs`, `tests/renderer-smoke.cjs`, `tests/render-gallery.cjs`
- `tests/animation-frames.test.js`, `tests/atlas-quality.cjs`, `tests/choreography.test.js`, `tests/render-choreography.cjs`
- `tests/transformations.test.js`, `tests/render-transformations.cjs`
- `tests/fusions.test.js`, `tests/render-fusions.cjs`
- `art-preview.png`, `choreography-preview.png`, `transformations-preview.png`, `fusions-preview.png`, `dist/WaifuPet-1.0.0.exe`

## Modelos de Attack on Titan

Revisión del Colosal: `[IMP] WaifuPet: Refine Colossal Titan artwork`.
Archivos de esta revisión: `assets/aot-armin-titan-anime.png`,
`assets/titan-prompts.json`, `titans-preview.png`, `README.md` y
`dist/WaifuPet-1.0.0.exe`. Atlas y transformaciones comprobados en Electron.

Commit propuesto: `[ADD] WaifuPet: Add Attack on Titan models`

Archivos de esta mejora:

- `README.md`, `main.js`, `anime-art.js`, `combat-controller.js`, `combat.html`, `combat.js`, `index.html`, `package.json`, `pet.js`, `tests/renderer-smoke.cjs`
- `titans.js`, `titan-engine.js`, `tests/titan-engine.test.js`, `tests/render-titans.cjs`, `tests/main-menu.test.js`, `tests/combat-controller.test.js`, `titans-preview.png`
- `assets/aot-eren-human-anime.png`, `assets/aot-eren-titan-anime.png`, `assets/aot-armin-human-anime.png`, `assets/aot-armin-titan-anime.png`, `assets/aot-reiner-human-anime.png`, `assets/aot-reiner-titan-anime.png`, `assets/titan-prompts.json`
- `dist/WaifuPet-1.0.0.exe`
