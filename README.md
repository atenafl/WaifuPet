# WaifuPet

Mascota de escritorio para Windows: una waifu con orejas y cola de gato que
pasea por tu pantalla, habla, baila, duerme y te hace compañía. Hecha con
Electron + Canvas (sin frameworks).

## Descargar y ejecutar

1. Usa el portátil **`dist/WaifuPet-1.0.0.exe`** generado con `npm run dist`.
   El ejecutable se conserva localmente y está excluido de Git por su tamaño.
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
  Eren, Armin y Reiner juntos en una sola opción de Attack on Titan,
  y Naruto y Sasuke juntos con siete parejas de formas.
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
  y Reiner en Acorazado. Clic derecho → **Modelo** contiene solamente **Attack
  on Titan · Los tres**, sin entradas separadas. Las preferencias antiguas de
  Eren, Armin o Reiner se convierten en el grupo. En **Titanes y movimiento** puedes caminar, correr,
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
- **Naruto y Sasuke**: modelo de combate propio con carreras sobre el suelo,
  saltos, preparación de golpes, puñetazos, patadas y esquivas. El Rasengan y
  el Chidori se cargan en las manos antes de lanzarse hacia el rival; también
  alternan Rasenshuriken, bolas de fuego y choques simultáneos de chakra.
  El daño se produce por contacto, con retroceso y una pausa breve de impacto.
  Clic derecho → **Combate ninja** permite pelear, rondar las pantallas,
  seleccionar una pareja de formas o progresar automáticamente después de
  mostrar el repertorio de ataques, hasta la pareja final. Cambiar de forma espera la carga
  de ambos dibujos; pausar congela el combate y cambiar de modelo cierra sus ventanas.
  Las siete parejas son:

  | Naruto | Sasuke |
  |---|---|
  | Niño | Niño |
  | Chakra rojo | Marca maldita I |
  | Una cola | Marca maldita II |
  | Shippuden | Shippuden |
  | Modo sabio | Mangekyō Sharingan |
  | Modo Kurama | Mangekyō eterno |
  | Seis Caminos | Rinnegan |

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

`npm test` ejecuta cuarenta y dos pruebas: vuelo en distintas distribuciones de monitores,
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
la migración de preferencias individuales al grupo y el cierre de sus ventanas al cambiar de modelo.
También comprueba las siete parejas de Naruto y Sasuke, las cargas de ambos,
Rasenshuriken, bolas de fuego, choques de chakra, pausa y cierre de sus ventanas.
`node node_modules/electron/cli.js tests/render-ninjas.cjs` verifica transparencia,
16 siluetas por atlas y contactos reales de todos los ataques permitidos en cada pareja, y
genera las seis galerías `ninja-*-preview.png`. Las pruebas unitarias cubren progresión automática,
monitores habilitados, cancelación de ataques y carga concurrente de formas.

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

## Naruto y Sasuke y menú de modelos

Los siete atlas nuevos contienen 112 dibujos completos generados con ImageGen.
Se guardan en `assets/ninja-<forma>-anime.png`; el prompt exacto y la procedencia
de cada imagen están en `assets/ninja-prompts.json`. Las ventanas se ajustan a
los límites de las figuras para mantener dentro las alas, capas, colas y jutsus.
La selección de formas es una progresión de combate que incluye cambios de edad;
los dibujos generados son adaptaciones y los detalles pequeños de los ojos se
aprecian mejor con el tamaño grande. La galería muestra las poses ajustadas a sus tarjetas.

Commit propuesto: `[ADD] WaifuPet: Add Naruto and Sasuke battles`

Archivos de esta mejora:

- `README.md`, `main.js`, `pet.js`, `combat-controller.js`, `combat.js`, `combat.html`, `index.html`, `anime-art.js`, `package.json`
- `ninjas.js`, `ninja-engine.js`, `ninja-art.js`, `ninjas-preview.png`
- `assets/ninja-child-anime.png`, `assets/ninja-red-mark-anime.png`, `assets/ninja-tail-curse-anime.png`, `assets/ninja-shippuden-anime.png`, `assets/ninja-sage-mangekyo-anime.png`, `assets/ninja-kurama-eternal-anime.png`, `assets/ninja-sixpaths-rinnegan-anime.png`, `assets/ninja-prompts.json`
- `tests/ninja-engine.test.js`, `tests/render-ninjas.cjs`, `tests/main-menu.test.js`, `tests/combat-controller.test.js`, `tests/renderer-smoke.cjs`

El portátil actualizado está en `dist/WaifuPet-1.0.0.exe` y está excluido de Git.


## Animaciones ampliadas y técnicas ninja

Treinta atlas adicionales aportan 480 dibujos completos: cuatro hojas de dieciséis
fotogramas para cada una de las siete parejas (movimiento, cuerpo a cuerpo,
chakra y lanzamientos), otra para Kyubi/Susanoo y otra para invocación,
Rasenshuriken, Amaterasu y Amenotejikara. Las secuencias tienen cuatro poses
ordenadas: preparación, movimiento, contacto o lanzamiento y recuperación.
El motor cambia figuras completas; las energías, los proyectiles y las chispas
se animan por separado, sin ensamblar extremidades sobre una figura fija.

Ambos personajes alternan puñetazos, patadas bajas y ráfagas de tres shuriken.
Naruto incorpora Rasengan, Rasenshuriken desde Shippuden y forma Kyubi desde
Kurama. Sasuke incorpora Chidori, Katon, Amaterasu y Susanoo desde Mangekyō,
y Amenotejikara con Rinnegan. El intercambio cambia sus posiciones reales
y da paso al contraataque. Amaterasu genera llamas negras donde está el rival.
Las invocaciones sustituyen al personaje por el cuerpo completo de la criatura
o del Susanoo durante su ataque y regresan después a la forma seleccionada.

El clic derecho ofrece «Ataques de Naruto» y «Ataques de Sasuke» con las técnicas
disponibles en la forma actual. La progresión automática deja suficientes rondas
para mostrar el repertorio antes de pasar a la siguiente pareja. Rondas, formas,
modo de paseo y cambios de monitor limpian las invocaciones y proyectiles.

Los puntos de lanzamiento y contacto se calculan del fotograma correspondiente;
las patadas buscan las piernas y los proyectiles usan el trayecto entre pasos
para evitar atravesar al rival sin detectar impacto. La extracción adapta el
umbral de alfa si el brillo une siluetas, y exige dieciséis figuras separadas.
Las fuentes generadas y sus canales alfa se conservan en los PNG originales.
Los prompts exactos y su procedencia están en `assets/ninja-motion-prompts.json`.

Validación: 44 pruebas unitarias, siete simulaciones con todos los ataques
permitidos y sus contactos físicos, comprobación de transparencias, galerías
y prueba de ventanas reales de Electron con los modelos anteriores, pausa,
limpieza, fuego negro, intercambio e invocaciones. Las técnicas oculares
usan dibujos propios, separados de la secuencia de Katon.

Galerías: `ninja-motion-preview.png`, `ninja-melee-preview.png`,
`ninja-chakra-preview.png`, `ninja-ranged-preview.png`,
`ninja-avatars-preview.png` y `ninja-techniques-preview.png`.
La galería `ninjas-preview.png` conserva la primera revisión de las siete parejas.

Commit propuesto: `[IMP] WaifuPet: Expand ninja animations and attacks`

Archivos exactos pendientes para el cambio completo desde el último commit:

- `README.md`
- `anime-art.js`
- `combat-controller.js`
- `combat.html`
- `combat.js`
- `index.html`
- `main.js`
- `package.json`
- `pet.js`
- `tests/combat-controller.test.js`
- `tests/main-menu.test.js`
- `tests/renderer-smoke.cjs`
- `assets/ninja-avatars-anime.png`
- `assets/ninja-child-anime.png`
- `assets/ninja-child-chakra-anime.png`
- `assets/ninja-child-melee-anime.png`
- `assets/ninja-child-motion-anime.png`
- `assets/ninja-child-ranged-anime.png`
- `assets/ninja-kurama-eternal-anime.png`
- `assets/ninja-kurama-eternal-chakra-anime.png`
- `assets/ninja-kurama-eternal-melee-anime.png`
- `assets/ninja-kurama-eternal-motion-anime.png`
- `assets/ninja-kurama-eternal-ranged-anime.png`
- `assets/ninja-motion-prompts.json`
- `assets/ninja-prompts.json`
- `assets/ninja-red-mark-anime.png`
- `assets/ninja-red-mark-chakra-anime.png`
- `assets/ninja-red-mark-melee-anime.png`
- `assets/ninja-red-mark-motion-anime.png`
- `assets/ninja-red-mark-ranged-anime.png`
- `assets/ninja-sage-mangekyo-anime.png`
- `assets/ninja-sage-mangekyo-chakra-anime.png`
- `assets/ninja-sage-mangekyo-melee-anime.png`
- `assets/ninja-sage-mangekyo-motion-anime.png`
- `assets/ninja-sage-mangekyo-ranged-anime.png`
- `assets/ninja-shippuden-anime.png`
- `assets/ninja-shippuden-chakra-anime.png`
- `assets/ninja-shippuden-melee-anime.png`
- `assets/ninja-shippuden-motion-anime.png`
- `assets/ninja-shippuden-ranged-anime.png`
- `assets/ninja-sixpaths-rinnegan-anime.png`
- `assets/ninja-sixpaths-rinnegan-chakra-anime.png`
- `assets/ninja-sixpaths-rinnegan-melee-anime.png`
- `assets/ninja-sixpaths-rinnegan-motion-anime.png`
- `assets/ninja-sixpaths-rinnegan-ranged-anime.png`
- `assets/ninja-tail-curse-anime.png`
- `assets/ninja-tail-curse-chakra-anime.png`
- `assets/ninja-tail-curse-melee-anime.png`
- `assets/ninja-tail-curse-motion-anime.png`
- `assets/ninja-tail-curse-ranged-anime.png`
- `assets/ninja-techniques-anime.png`
- `ninja-art.js`
- `ninja-avatars-preview.png`
- `ninja-chakra-preview.png`
- `ninja-engine.js`
- `ninja-melee-preview.png`
- `ninja-motion-preview.png`
- `ninja-ranged-preview.png`
- `ninja-techniques-preview.png`
- `ninjas-preview.png`
- `ninjas.js`
- `tests/ninja-engine.test.js`
- `tests/render-ninjas.cjs`

El ejecutable `dist/WaifuPet-1.0.0.exe` es un artefacto local excluido de Git.

## Naruto corregido, Solo Leveling y JoJo

Kurama humano utiliza el abrigo amarillo con marcas negras y dos faldones;
Seis Caminos utiliza la chaqueta naranja corta, ropa negra y orbes de la verdad
animados. Ninguno lleva colas de zorro en el cuerpo humano. La invocación muestra
un Kurama de chakra completo con hocico y nueve colas. Seis Caminos tiene su
propia hoja de técnicas. La revisión actual de Naruto se ve en
`naruto-corrected-preview.png`; los atlas ampliados reúnen 496 fotogramas.

«Solo Leveling — Sung Jinwoo» es un modelo de paseo con cinco etapas elegibles
por clic derecho: nivel 1, 25, 50, 75 y 100, Monarca de las Sombras. La progresión
automática cambia cada 45 segundos y termina en 100. Estos niveles son una
progresión de la mascota. Igris se desbloquea en 50, Beru en 75 y Bellion en 100;
se pueden elegir individualmente o retirar sus invocaciones. Las sombras emergen
del suelo, siguen a Jinwoo por los monitores y se disuelven al retirarse. No hay
combate en este modelo. El menú permite caminar, correr, quedarse quieto o invocar.

«JoJo — protagonistas y stands» contiene los ocho protagonistas en una sola
entrada: Jonathan, Joseph, Jotaro, Josuke, Giorno, Jolyne, Johnny y Josuke de
JoJolion. Se pueden elegir manualmente o rotar cada 45 segundos. Joseph permite
alternar entre joven con Hamon y adulto con Hermit Purple, sin añadir un noveno
protagonista a la rotación. Jonathan también usa Hamon. Los otros seis invocan
Star Platinum, Crazy Diamond, Gold Experience, Stone Free, Tusk ACT4 y Soft & Wet,
respectivamente. Johnny se desplaza en silla de ruedas. Los stands acompañan
a su usuario, aparecen y muestran animaciones; este modelo no añade rivales.

Los nuevos modelos aportan 496 dibujos completos en 31 hojas transparentes.
Jinwoo tiene 32 fotogramas por nivel, incluidos ciclos de ocho pasos para caminar
y correr. Cada sombra tiene 32 fotogramas, incluidos ciclos propios de ocho
pasos al caminar y ocho al correr. Cada protagonista JoJo y stand tiene 16
fotogramas con movimiento, poses e invocación o exhibición. Se sustituyen dibujos completos;
los portales, Hamon y Hermit Purple se animan aparte. Los prompts originales y
las correcciones están en `assets/companions-prompts.json` y
`assets/companions-corrections-prompts.json` y `assets/companion-gait-prompts.json`.

Referencias de personajes: [Naruto oficial](https://naruto-official.com/en),
[Solo Leveling: KARMA](https://sololeveling-karma.netmarble.com/en/info) y
[JoJo All-Star Battle R](https://jojoasbr.bn-ent.net/character/).

Galerías actuales: `solo-levels-preview.png`, `solo-shadows-preview.png`,
`jojo-preview.png`, `jojo-stands-preview.png` y `naruto-corrected-preview.png`.
La validación incluye 53 pruebas unitarias, todos los ataques de las siete
parejas Naruto/Sasuke y ventanas reales de Electron para los niveles, sombras,
protagonistas, stands, pausa y limpieza entre modelos.

El clic derecho detecta los píxeles visibles de Jinwoo, las sombras y los
protagonistas JoJo para abrir sus controles. El paseo cruza de forma continua
los monitores contiguos cuyo suelo está alineado; ante un hueco o un monitor
a otra altura, da la vuelta. Ya no cambia de pantalla por temporizador.
Los stands flotan cerca de su dueño, se elevan durante la invocación y no usan
los ciclos de andar o correr. Las sombras mantienen pasos sincronizados con
la distancia recorrida y aceleran al alcanzar a Jinwoo. Los nuevos ciclos se
ven en `solo-shadow-motion-preview.png`.

Commit propuesto: `[IMP] WaifuPet: Fix companion controls and movement`

Archivos exactos para esta ampliación sobre la rama actual:

- `anime-art.js`
- `assets/companion-gait-prompts.json`
- `assets/companions-corrections-prompts.json`
- `assets/companions-prompts.json`
- `assets/jojo-crazy-diamond-anime.png`
- `assets/jojo-gappy-anime.png`
- `assets/jojo-giorno-anime.png`
- `assets/jojo-gold-experience-anime.png`
- `assets/jojo-johnny-anime.png`
- `assets/jojo-jolyne-anime.png`
- `assets/jojo-jonathan-anime.png`
- `assets/jojo-joseph-anime.png`
- `assets/jojo-joseph-old-anime.png`
- `assets/jojo-josuke-anime.png`
- `assets/jojo-jotaro-anime.png`
- `assets/jojo-soft-wet-anime.png`
- `assets/jojo-star-platinum-anime.png`
- `assets/jojo-stone-free-anime.png`
- `assets/jojo-tusk-anime.png`
- `assets/ninja-avatars-anime.png`
- `assets/ninja-kurama-eternal-chakra-anime.png`
- `assets/ninja-kurama-eternal-melee-anime.png`
- `assets/ninja-kurama-eternal-motion-anime.png`
- `assets/ninja-kurama-eternal-ranged-anime.png`
- `assets/ninja-sixpaths-rinnegan-chakra-anime.png`
- `assets/ninja-sixpaths-rinnegan-melee-anime.png`
- `assets/ninja-sixpaths-rinnegan-motion-anime.png`
- `assets/ninja-sixpaths-rinnegan-ranged-anime.png`
- `assets/ninja-sixpaths-techniques-anime.png`
- `assets/ninja-techniques-anime.png`
- `assets/solo-bellion-anime.png`
- `assets/solo-bellion-motion-anime.png`
- `assets/solo-beru-anime.png`
- `assets/solo-beru-motion-anime.png`
- `assets/solo-e-rank-gesture-anime.png`
- `assets/solo-e-rank-motion-anime.png`
- `assets/solo-hunter-gesture-anime.png`
- `assets/solo-hunter-motion-anime.png`
- `assets/solo-igris-anime.png`
- `assets/solo-igris-motion-anime.png`
- `assets/solo-monarch-gesture-anime.png`
- `assets/solo-monarch-motion-anime.png`
- `assets/solo-necromancer-gesture-anime.png`
- `assets/solo-necromancer-motion-anime.png`
- `assets/solo-s-rank-gesture-anime.png`
- `assets/solo-s-rank-motion-anime.png`
- `combat-controller.js`
- `combat.html`
- `combat.js`
- `companion-art.js`
- `companion-engine.js`
- `companions.js`
- `index.html`
- `jojo-preview.png`
- `jojo-stands-preview.png`
- `main.js`
- `naruto-corrected-preview.png`
- `ninja-art.js`
- `ninja-avatars-preview.png`
- `ninja-chakra-preview.png`
- `ninja-melee-preview.png`
- `ninja-motion-preview.png`
- `ninja-ranged-preview.png`
- `ninja-techniques-preview.png`
- `ninjas.js`
- `package.json`
- `pet.js`
- `README.md`
- `solo-levels-preview.png`
- `solo-shadow-motion-preview.png`
- `solo-shadows-preview.png`
- `tests/combat-controller.test.js`
- `tests/companion-engine.test.js`
- `tests/main-menu.test.js`
- `tests/render-companions.cjs`
- `tests/render-ninjas.cjs`
- `tests/renderer-smoke.cjs`
