# WaifuPet · Tigresa IA

Mascota de escritorio para Windows (y Linux) con orejas y cola de gato que
pasea por tu pantalla, habla y ahora **te ayuda de verdad con el PC**. Hecha
con Electron + Canvas, sin frameworks.

La rama `feature/ia-companion` añade una capa de IA al motor original:
conversación, memoria, acciones reales, control de ratón/teclado con visión y
movimiento por la pantalla. La estética sigue siendo cálida y de mascota: nada
de cyberpunk.

## Qué sabe hacer

### Vivir en el escritorio
- Siempre visible, sin robar el foco, con física propia y multipantalla real.
- Te sigue con los ojos aunque el ratón esté fuera de su ventanita.
- Se duerme sola cuando llevas un rato sin tocar el PC y se despierta al volver.
- Se aparta cuando hay un juego o vídeo a pantalla completa.
- Caminata, baile, sueño, lectura, café, móvil, guitarra, comba, katana...
  decenas de animaciones con partículas y sonidos.

### Hablar contigo
- Doble clic sobre ella (o `Ctrl+Alt+Espacio`) abre el chat.
- Respuestas cortas en la burbuja y conversación completa en la ventana.
- Proveedores: **Google Gemini** (recomendado y gratis), **OpenAI-compatible**
  (OpenAI, OpenRouter, LM Studio...) y **Ollama** local.
- Voz: lee sus respuestas en alto (Web Speech) y botón de micrófono para dictar
  (si tu sistema lo soporta).

### Hacer cosas reales
Todo pasa por una confirmación en el chat. Puede:
- Moverse a la izquierda, derecha, centro, junto al cursor o a otra pantalla.
- Caminar hasta el destino o teletransportarse entre chispas.
- Hacer cualquiera de sus animaciones.
- Abrir apps permitidas (calculadora, navegador, editor, Spotify, ajustes...).
- Abrir páginas web.
- Poner temporizadores y recordatorios persistentes.
- Guardar y leer notas.
- Buscar archivos por nombre en Escritorio, Documentos y Descargas.
- Subir/bajar volumen, silenciar, bloquear la sesión o mostrar el escritorio.

### Usar el PC (opcional)
Actívalo en **Ajustes → Permisos**. Entonces puede:
- Hacer una captura de la pantalla y mirarla.
- Mover el ratón, hacer clic, doble clic, arrastrar y hacer scroll.
- Escribir texto (con tildes) y pulsar teclas o atajos.
- Encadenar pasos: mirar → actuar → volver a mirar para comprobar.

Límites de seguridad: nunca escribe contraseñas ni datos de tarjeta, no borra
archivos, no compra, no envía mensajes y no cambia ajustes del sistema. Ignora
las instrucciones que aparezcan dentro de una web o una captura. Cada acción
sensible pide permiso y puedes pararla con el botón ■, `Esc` en el chat o
`Ctrl+Alt+X`.

## Instalar y ejecutar

```bash
npm install
npm start
```

Para empaquetar:

```bash
npm run dist        # Windows portable -> dist/WaifuPet-1.1.0.exe
npm run dist:linux  # Linux AppImage
```

Notas de compilación en Windows: `electron-builder` crea symlinks y Windows lo
bloquea sin privilegios. Compila como administrador o con Docker (ver más
abajo).

## Configurar la IA

1. Abre el chat (doble clic en la mascota) y pulsa ⚙.
2. Elige proveedor:
   - **Gemini**: crea una clave gratis en
     <https://aistudio.google.com/apikey> y pégala. Modelo por defecto:
     `gemini-2.5-flash`.
   - **OpenAI-compatible**: pon la URL base (`https://api.openai.com/v1`,
     `https://openrouter.ai/api/v1`, `http://localhost:1234/v1` para LM Studio)
     y la clave si hace falta. Los servidores locales no necesitan clave.
   - **Ollama**: instala <https://ollama.com>, ejecuta
     `ollama pull llama3.2` y deja la URL `http://localhost:11434/v1`.
3. Pulsa **Probar conexión** y guarda.

La clave se guarda cifrada con el almacén del sistema (DPAPI en Windows). Todo
lo demás (notas, recordatorios, configuración) vive en `%APPDATA%\waifu-pet`.

## Controles

| Acción | Resultado |
|---|---|
| Clic izquierdo | La acaricia (se pone feliz y suelta corazones) |
| Doble clic | Abre el chat |
| Arrastrar | Moverla por la pantalla (también entre monitores) |
| Clic derecho | Menú de acciones, modelo, tamaño, pantallas, IA y sonido |
| `Ctrl+Alt+Espacio` | Abrir el chat |
| `Ctrl+Alt+T` | Abrir el chat y dictar |
| `Ctrl+Alt+P` | Teletransportarse |
| `Ctrl+Alt+H` | Mostrar / ocultar |
| `Ctrl+Alt+X` | Parar la tarea actual |
| `Esc` (en el chat) | Parar |

Si un atajo está ocupado por otra app, se prueba automáticamente el alternativo
(`K`, `Y`, `O`, `J`).

## Ejemplos para pedirle

- «Ven a la derecha de la pantalla».
- «Siéntate y léeme un rato».
- «Abre la calculadora y calcula 12 × 7» (con control del PC activado).
- «Pon un temporizador de 25 minutos para estirarme».
- «Recuérdame a las 3 que llame al dentista».
- «Guarda una nota: comprar café».
- «Busca el archivo presupuesto en mis documentos».
- «Sube un poco el volumen».
- «¿Qué ves en mi pantalla?».

## Estructura

- `main.js` — proceso principal: ventana, pantallas, menú, bandeja, atajos,
  reposo, pantalla completa e IPC.
- `pet.js` — motor de la mascota: física, estados, animaciones, dibujo,
  movimiento pedido por la IA y seguimiento global del cursor.
- `ai/config.js` — configuración y claves cifradas.
- `ai/providers.js` — Gemini y OpenAI-compatible (incluye Ollama).
- `ai/tools.js` — herramientas que puede llamar la IA.
- `ai/system-actions.js` — apps, webs, capturas, ratón/teclado, volumen, notas.
- `ai/agent.js` — conversación, bucle de herramientas, permisos y avisos.
- `ai/memory.js` — notas y recordatorios persistentes.
- `ai/chat-window.js` — ventana de chat.
- `chat.html` / `chat.css` / `chat.js` — interfaz del chat y ajustes.
- `preload.js` / `preload-chat.js` — puentes IPC.
- `input.ps1` / `wins.ps1` — ratón, teclado, volumen y ventana en primer plano.

## Compilar en Linux con Docker

```bash
docker run --rm -v "${PWD}:/src" node:22-slim bash -c \
  "apt-get update -qq && apt-get install -y -qq ca-certificates && \
   update-ca-certificates && mkdir /build && \
   tar -C /src --exclude=node_modules --exclude=dist --exclude=.git -cf - . | tar -C /build -xf - && \
   cd /build && npm install && npx electron-builder --linux AppImage && \
   cp dist/*.AppImage /src/dist/"
```

## Notas

- El control real de ratón/teclado y la captura usan APIs de Windows
  (`user32`, `desktopCapturer`). En Linux la mascota y el chat funcionan, pero
  el control del PC es limitado.
- El micrófono depende de `webkitSpeechRecognition`; en algunos Electron no
  está disponible y el botón mostrará un aviso. Puedes escribir siempre.
- Proyecto personal. Respeta las licencias de los modelos y proveedores que
  uses.
